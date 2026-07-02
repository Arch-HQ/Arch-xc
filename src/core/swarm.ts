import { chatCompletion, type ChatMessage } from "../api/nim.js";
import {
  getHeadModels,
  getBoardModels,
  pickModelForTask,
} from "./models.js";
import { TOOLS, executeTool } from "./tools.js";
import { useStore } from "../store/index.js";
import fs from "node:fs";

const HEAD_SYSTEM = `You are Arch, a coding AI assistant. You are aware of the user's environment (directory, platform) and can answer questions about it.
You do NOT run commands or execute code yourself.
You analyze requests and either respond conversationally or create structured plans.

For simple questions (greetings, chat, asking about yourself, quick info):
  Respond directly and conversationally.
  DO NOT include ALTR:, THOUGHT:, or PLAN: sections for simple tasks.

For complex tasks (building projects, multi-step changes, architecture):
  Create a structured plan with ALTR:, THOUGHT:, and PLAN: sections.

  ALTR controls the depth of delegation:
    ALTR: 1 — Single round of board specialists. Use for moderate complexity (e.g. scaffold a project, write a single feature).
    ALTR: 2 — Board + managers can spawn sub-agents. Use for complex multi-step tasks (e.g. full auth system, API + frontend).
    ALTR: 3 — Deep multi-layer recursion. Use for very large or architectural tasks spanning many files.

  THOUGHT: A brief analysis of the request.

  PLAN: section with numbered tasks:
    1. [Domain] task description

Available domains: Engineering, Analysis, Creative, Strategy, Validation

IMPORTANT RULE: You do NOT output JSON like {"tool": "..."}. You only respond in plain English or with structured PLAN sections when needed.`;

const BOARD_SYSTEM = `You are a domain specialist with filesystem access.
Complete your assigned task. You may use tools if they are available, but respond with text either way.
Be concise and actionable.`;

const MAX_TOOL_ROUNDS = 15;
const MAX_TASKS = 3;
const HEAD_TIMEOUT = 60000;
const BOARD_TIMEOUT = 120000;
const MANAGER_TIMEOUT = 120000;

interface PlanResult {
  altrMode: 1 | 2 | 3;
  thought: string;
  tasks: Array<{
    domain: string;
    description: string;
  }>;
}

function parsePlan(content: string): PlanResult {
  const lines = content.split("\n");
  let altrMode: 1 | 2 | 3 = 1;
  let thought = "";
  const tasks: PlanResult["tasks"] = [];

  let inPlan = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("ALTR:")) {
      const mode = parseInt(trimmed.replace("ALTR:", "").trim());
      if (mode === 1 || mode === 2 || mode === 3) altrMode = mode;
    } else if (trimmed.startsWith("THOUGHT:")) {
      thought = trimmed.replace("THOUGHT:", "").trim();
    } else if (trimmed.startsWith("PLAN:")) {
      inPlan = true;
    } else if (inPlan && /^\d+\.\s*\[/.test(trimmed)) {
      const match = trimmed.match(/^\d+\.\s*\[([^\]]+)\]\s*(.+)$/);
      if (match && tasks.length < MAX_TASKS) {
        tasks.push({ domain: match[1].trim(), description: match[2].trim() });
      }
    } else if (inPlan && /^\d+\.\s/.test(trimmed) && tasks.length === 0) {
      const text = trimmed.replace(/^\d+\.\s*/, "");
      tasks.push({ domain: "Engineering", description: text });
      break;
    }
  }

  if (tasks.length === 0) {
    tasks.push({ domain: "Engineering", description: content });
  }

  return { altrMode, thought, tasks };
}

function isConversational(text: string): boolean {
  if (text.includes("PLAN:") || text.includes("ALTR:")) return false;
  return true;
}

function sanitizeHeadResponse(text: string): string {
  // Strip JSON tool call patterns like {"tool": "cwd", "args": {}}
  let cleaned = text.replace(/\{"tool":\s*"[^"]*"\s*(?:,.*?)?\}\s*/gs, "");
  // Strip any remaining bare JSON objects that look like tool calls
  cleaned = cleaned.replace(/\{\s*"tool"\s*:\s*"[^"]*"\s*\}\s*/g, "");
  return cleaned.trim();
}

function buildConversationContext(history?: ChatMessage[]): string {
  if (!history || history.length === 0) return "";
  const lines: string[] = ["Previous conversation:"];
  for (const msg of history) {
    const label = msg.role === "user" ? "User" : "Arch";
    const preview = (msg.content ?? "").slice(0, 200).replace(/\n/g, " ");
    lines.push(`  ${label}: ${preview}`);
  }
  return lines.join("\n");
}

function buildEnvironmentContext(): string {
  try {
    const entries = fs.readdirSync(process.cwd(), { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name + "/");
    const files = entries.filter((e) => !e.isDirectory()).map((e) => e.name);
    const listing = [...dirs, ...files].join(", ");
    return `User environment: cwd=${process.cwd()}, platform=${process.platform}\nDirectory contents: ${listing}`;
  } catch {
    return `User environment: cwd=${process.cwd()}, platform=${process.platform}`;
  }
}

async function callWithTools(
  model: string,
  messages: ChatMessage[],
  opts: { temperature?: number; max_tokens?: number; signal?: AbortSignal }
): Promise<string> {
  let currentMessages = [...messages];
  const addLog = useStore.getState().addLog;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const resp = await chatCompletion(model, currentMessages, {
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 2048,
      signal: opts.signal,
      tools: TOOLS as unknown[],
    });

    const choice = resp.choices[0].message;

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return choice.content ?? "";
    }

    if (round === MAX_TOOL_ROUNDS) {
      const finalResp = await chatCompletion(model, currentMessages, {
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.max_tokens ?? 2048,
        signal: opts.signal,
      });
      return finalResp.choices[0].message.content ?? "";
    }

    currentMessages.push({
      role: "assistant",
      content: choice.content,
      tool_calls: choice.tool_calls,
    });

    for (const toolCall of choice.tool_calls) {
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        addLog({ level: "warn", source: "Swarm", message: `Bad tool args from ${toolCall.function.name}: ${toolCall.function.arguments}` });
        args = {};
      }
      const result = await executeTool(toolCall.function.name, args);
      currentMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return "";
}

export async function executeSwarm(userInput: string, forcedAltr?: 1 | 2 | 3, history?: ChatMessage[]): Promise<void> {
  const store = useStore.getState();
  const addMessage = store.addMessage;
  const updateMessage = store.updateMessage;
  const addAgent = store.addAgent;
  const updateAgent = store.updateAgent;
  const setExecuting = store.setExecuting;
  const addLog = store.addLog;

  setExecuting(true);

  const archMsgId = addMessage({
    role: "head",
    agentName: "Arch",
    content: "",
    status: "streaming",
    thinking: "",
    thinkingVisible: false,
  });

  try {
    // ===== PHASE 0: HEAD =====
    const headModels = getHeadModels();
    const rescueModelId = "meta/llama-3.3-70b-instruct";
    const fallbackModels = [...headModels.map((m) => m.id), rescueModelId];

    let headContent: string | null = null;
    let headAgentId: string | null = null;
    let usedModel: string | null = null;

    for (const modelId of fallbackModels) {
      addLog({
        level: "info",
        source: "Swarm",
        message: `Arch activating: ${modelId}`,
      });

      if (!headAgentId) {
        headAgentId = addAgent({
          name: "Head Alpha",
          role: "head",
          layer: 1,
          model: modelId,
          status: "working",
          currentTask: "Analyzing request",
        });
      } else {
        updateAgent(headAgentId, { model: modelId });
      }

      updateMessage(archMsgId, { content: "Thinking..." });

      const headMessages: ChatMessage[] = [
        { role: "system", content: HEAD_SYSTEM },
        { role: "system", content: buildEnvironmentContext() },
        ...(history && history.length > 0
          ? [{ role: "system" as const, content: buildConversationContext(history) }]
          : []),
        { role: "user", content: userInput },
      ];

      addLog({
        level: "debug",
        source: "Swarm",
        message: `HEAD messages: ${headMessages.length} total (system + history_system + user)`,
      });

      try {
        const headController = new AbortController();
        const headTimer = setTimeout(() => headController.abort(), HEAD_TIMEOUT);

        const resp = await chatCompletion(modelId, headMessages, {
          temperature: 0.4,
          max_tokens: 1024,
          signal: headController.signal,
        });

        clearTimeout(headTimer);
        headContent = sanitizeHeadResponse(resp.choices[0].message.content ?? "");
        if (!headContent) {
          addLog({ level: "warn", source: "Swarm", message: `${modelId} returned empty content, continuing fallback chain` });
          continue;
        }
        usedModel = modelId;
        addLog({
          level: "debug",
          source: "Swarm",
          message: `${modelId} responded (${(headContent ?? "").length} chars), stopping fallback chain`,
        });
        break;
      } catch (headErr) {
        const errMsg = headErr instanceof Error ? headErr.message : String(headErr);
        addLog({ level: "warn", source: "Swarm", message: `Model ${modelId} failed: ${errMsg}` });
      }
    }

    if (!headContent) {
      addLog({ level: "error", source: "Swarm", message: "All head models failed" });
      headContent = "I'm sorry, I couldn't process that right now. Could you rephrase?";
      updateMessage(archMsgId, { content: headContent, status: "done" });
      if (headAgentId) updateAgent(headAgentId, { status: "done" });
      setExecuting(false);
      return;
    }

    if (headAgentId) updateAgent(headAgentId, { status: "done" });

    // Conversational response — check if tools are needed
    if (isConversational(headContent)) {
      const toolKeywords = ["list", "read", "write", "create", "delete", "mkdir", "remove", "edit", "rename", "move", "grep", "search", "find", "run", "execute", "show me", "what files", "what directory", "current dir"];
      const needsTool = toolKeywords.some((k) => userInput.toLowerCase().includes(k));

      if (needsTool && headAgentId) {
        addLog({ level: "info", source: "Swarm", message: "Conversational but may need tools — retrying with tools..." });
        updateAgent(headAgentId, { status: "working", currentTask: "Executing with tools" });
        const toolMessages: ChatMessage[] = [
          { role: "system", content: HEAD_SYSTEM },
          { role: "system", content: buildEnvironmentContext() },
          { role: "user", content: userInput },
        ];
        try {
          const toolResult = await callWithTools(usedModel ?? fallbackModels[0], toolMessages, {
            temperature: 0.4,
            max_tokens: 2048,
          });
          if (toolResult) {
            headContent = toolResult;
          }
        } catch {
          addLog({ level: "warn", source: "Swarm", message: "HEAD tool retry failed, using original response" });
        }
      }

      updateMessage(archMsgId, {
        content: headContent,
        status: "done",
        thinking: "",
        thinkingVisible: false,
      });
      setExecuting(false);
      return;
    }

    // ===== FULL SWARM MODE =====
    let plan = parsePlan(headContent);
    if (forcedAltr) plan.altrMode = forcedAltr;

    if (plan.tasks.length === 0 || plan.tasks.every((t) => !t.description.trim())) {
      updateMessage(archMsgId, {
        content: headContent || "I couldn't parse that request. Could you rephrase?",
        status: "done",
      });
      setExecuting(false);
      return;
    }

    updateMessage(archMsgId, {
      content: `Analyzing: ${plan.thought || "Processing your request..."}`,
      thinking: headContent,
      thinkingVisible: false,
    });

    addLog({
      level: "info",
      source: "Swarm",
      message: `Plan: ALTR ${plan.altrMode} | ${plan.tasks.length} tasks`,
    });

    // ===== PHASE 1: BOARD (sequential) =====
    const boardModels = getBoardModels();
    const domains = ["Engineering", "Analysis", "Creative", "Strategy", "Validation"];
    const accumulatedOutputs: string[] = [];
    const conversationContext = buildConversationContext(history);

    async function executeBoard(modelId: string, msgs: ChatMessage[]): Promise<string | null> {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), BOARD_TIMEOUT);
        const content = await callWithTools(modelId, msgs, {
          temperature: 0.4,
          max_tokens: 2048,
          signal: controller.signal,
        });
        clearTimeout(timer);
        return content;
      } catch (err) {
        addLog({ level: "error", source: "Swarm", message: `Board execution error: ${err instanceof Error ? err.message : String(err)}` });
      return null;
    }
  }

  async function executeManager(modelId: string, msgs: ChatMessage[]): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), MANAGER_TIMEOUT);
      const content = await callWithTools(modelId, msgs, {
        temperature: 0.4,
        max_tokens: 2048,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return content;
    } catch (err) {
      addLog({ level: "error", source: "Swarm", message: `Manager execution error: ${err instanceof Error ? err.message : String(err)}` });
      return null;
    }
  }

  for (const [idx, task] of plan.tasks.entries()) {
      const domain = domains.find((d) =>
        task.domain.toLowerCase().includes(d.toLowerCase())
      ) ?? "Engineering";

      const boardModel =
        boardModels.find(
          (m) => m.strengths.includes(domain.toLowerCase()) || m.categories.includes(domain.toLowerCase())
        ) ?? boardModels[idx % boardModels.length];

      const boardAgentId = addAgent({
        name: `${domain} Lead`,
        role: "board",
        layer: 2,
        model: boardModel.id,
        status: "working",
        currentTask: task.description,
      });

      addLog({
        level: "info",
        source: "Swarm",
        message: `BOARD [${domain}] → ${boardModel.name}`,
      });

      updateMessage(archMsgId, { content: `${domain}: executing...` });

      const boardMessages: ChatMessage[] = [
        { role: "system", content: `${BOARD_SYSTEM}\n\nYour domain: ${domain}\nTask: ${task.description}${conversationContext ? `\n\n${conversationContext}` : ""}` },
        { role: "user", content: `Original request: ${userInput}\n\nYour specific task: ${task.description}\n\nComplete this task. Respond with your result.` },
      ];

      let boardContent: string | null = null;

      // Try with tools first
      boardContent = await executeBoard(boardModel.id, boardMessages);
      if (boardContent === null) {
        addLog({ level: "warn", source: "Swarm", message: `Board [${domain}] tools failed on ${boardModel.id}, retrying with rescue model...` });
        const plainMsgs: ChatMessage[] = [
          { role: "system", content: `${BOARD_SYSTEM}\n\nYour domain: ${domain}\nTask: ${task.description}${conversationContext ? `\n\n${conversationContext}` : ""}` },
          { role: "user", content: `Original request: ${userInput}\n\nYour specific task: ${task.description}\n\nComplete this task. Respond with your result in plain text only.` },
        ];
        boardContent = await executeBoard(rescueModelId, plainMsgs);
        if (boardContent === null) {
          addLog({ level: "error", source: "Swarm", message: `Board [${domain}] rescue model also failed` });
          updateAgent(boardAgentId, { status: "error" });
          accumulatedOutputs.push(`**${domain}**: Unable to complete`);
          continue;
        }
      }

      const cleanContent = sanitizeHeadResponse(boardContent);
      updateAgent(boardAgentId, { status: "done" });
      accumulatedOutputs.push(`**${domain}**:\n${cleanContent}`);
    }

    // ===== PHASE 2: MANAGERS (ALTR 2+, sequential) =====
    if (plan.altrMode >= 2) {
      for (const result of plan.tasks.map((task, i): { content: string; task: typeof task; status: string } => ({ content: accumulatedOutputs[i] ?? "", task, status: accumulatedOutputs[i] ? "done" : "error" }))) {
        if (result.status === "error") continue;

        const subTaskLines = result.content
          .split("\n")
          .filter(
            (line) =>
              line.toLowerCase().includes("subtask") ||
              line.toLowerCase().includes("sub-task") ||
              line.toLowerCase().includes("delegate")
          )
          .slice(0, 1);

        if (subTaskLines.length === 0) continue;

        for (const subTask of subTaskLines) {
          const managerModel = pickModelForTask(subTask, "manager");

          const mgrMessages: ChatMessage[] = [
            { role: "system", content: `You are a Manager agent. ${BOARD_SYSTEM}${conversationContext ? `\n\n${conversationContext}` : ""}` },
            { role: "user", content: `Original request: ${userInput}\nBoard context: ${result.content.slice(0, 600)}\n\nSub-task: ${subTask}\n\nComplete this sub-task. Respond with your result in plain text only.` },
          ];

          let mgrContent: string | null = await executeManager(managerModel.id, mgrMessages);
          if (mgrContent === null) {
            addLog({ level: "warn", source: "Swarm", message: `Manager tools failed, retrying with rescue model...` });
            const plainMsgs: ChatMessage[] = [
              { role: "system", content: `You are a Manager agent. ${BOARD_SYSTEM}${conversationContext ? `\n\n${conversationContext}` : ""}` },
              { role: "user", content: `Original request: ${userInput}\nBoard context: ${result.content.slice(0, 600)}\n\nSub-task: ${subTask}\n\nComplete this sub-task. Respond with your result in plain text only.` },
            ];
            mgrContent = await executeManager(rescueModelId, plainMsgs);
          }

          if (mgrContent) {
            accumulatedOutputs.push(`**Sub-task**:\n${sanitizeHeadResponse(mgrContent)}`);
          }
        }
      }
    }

    // ===== FINAL =====
    const finalOutput = accumulatedOutputs.join("\n\n---\n\n");
    updateMessage(archMsgId, {
      content: finalOutput || headContent,
      status: "done",
      thinking: headContent,
      thinkingVisible: false,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    addLog({ level: "error", source: "Swarm", message: `Execution failed: ${errorMsg}` });
    updateMessage(archMsgId, {
      content: `Error: ${errorMsg}`,
      status: "error",
    });
  } finally {
    setExecuting(false);
    store.cleanupAgents();
  }
}
