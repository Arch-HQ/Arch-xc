import { chatCompletion, type ChatMessage } from "../api/nim.js";
import {
  getHeadModels,
  getBoardModels,
  pickModelForTask,
  type ModelEntry,
} from "./models.js";
import { useStore, type Message } from "../store/index.js";

const HEAD_SYSTEM = `You are the HEAD of Arch XC — the top strategic planning layer.
Your job:
1. Analyze the user's request and determine execution depth (ALTR 1/2/3)
2. Create a clear, structured plan broken into sub-tasks
3. Assign each sub-task to the appropriate Board domain specialist

Board domains:
- Engineering: Code, architecture, system design, DevOps
- Analysis: Research, debugging, optimization, review
- Creative: UI/UX, naming, documentation, user-facing content
- Strategy: Planning, trade-offs, decision-making, prioritization
- Validation: Testing, security audit, code review, verification

Output ONLY a structured plan. Use this format:
---
ALTR: <1|2|3>
THOUGHT: <brief reasoning>
PLAN:
1. [DOMAIN] <task description>
2. [DOMAIN] <task description>
---`;

const BOARD_SYSTEM = `You are a BOARD member of Arch XC — a domain specialist.
Execute your assigned task with expertise. You can:
1. Produce code directly
2. Request Manager assistance for sub-tasks
3. Validate and critique outputs from other agents

Be concise, expert-level, and actionable. Output your best work.`;

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
      if (match) {
        tasks.push({ domain: match[1].trim(), description: match[2].trim() });
      }
    }
  }

  if (tasks.length === 0) {
    // Fallback: treat entire content as single engineering task
    tasks.push({ domain: "Engineering", description: content });
  }

  return { altrMode, thought, tasks };
}

export async function executeSwarm(userInput: string, forcedAltr?: 1 | 2 | 3): Promise<void> {
  const store = useStore.getState();
  const addMessage = store.addMessage;
  const updateMessage = store.updateMessage;
  const addAgent = store.addAgent;
  const updateAgent = store.updateAgent;
  const setExecuting = store.setExecuting;
  const addLog = store.addLog;

  setExecuting(true);

  try {
    // ===== PHASE 0: HEAD =====
    const headModels = getHeadModels();
    const headModel = headModels[0]; // Best head model

    addLog({
      level: "info",
      source: "Swarm",
      message: `HEAD activating: ${headModel.name} → analyzing task`,
    });

    const headAgentId = addAgent({
      name: "Head Alpha",
      role: "head",
      layer: 1,
      model: headModel.id,
      status: "working",
      currentTask: "Planning & routing",
    });

    const headMsgId = addMessage({
      role: "head",
      agentName: "Head Alpha",
      content: "",
      layer: 1,
      model: headModel.name,
      status: "streaming",
    });

    const headMessages: ChatMessage[] = [
      { role: "system", content: HEAD_SYSTEM },
      { role: "user", content: `Task: ${userInput}\n\nCreate a structured execution plan.` },
    ];

    const headResp = await chatCompletion(headModel.id, headMessages, {
      temperature: 0.4,
      max_tokens: 2048,
    });

    const headContent = headResp.choices[0].message.content;
    updateMessage(headMsgId, { content: headContent, status: "done" });
    updateAgent(headAgentId, { status: "done" });

    // Parse plan
    let plan = parsePlan(headContent);
    if (forcedAltr) {
      plan.altrMode = forcedAltr;
    }

    addLog({
      level: "info",
      source: "Swarm",
      message: `Plan parsed: ALTR ${plan.altrMode} | ${plan.tasks.length} tasks`,
    });

    // ===== PHASE 1: BOARD =====
    if (plan.altrMode >= 1) {
      const boardModels = getBoardModels();
      const domains = ["Engineering", "Analysis", "Creative", "Strategy", "Validation"];

      const boardPromises = plan.tasks.map(async (task, idx) => {
        const domain = domains.find((d) =>
          task.domain.toLowerCase().includes(d.toLowerCase())
        ) ?? "Engineering";

        const boardModel =
          boardModels.find(
            (m) => m.strengths.includes(domain.toLowerCase()) || m.categories.includes(domain.toLowerCase())
          ) ?? boardModels[idx % boardModels.length];

        const boardAgentName = `${domain} Lead`;
        const boardAgentId = addAgent({
          name: boardAgentName,
          role: "board",
          layer: 2,
          model: boardModel.id,
          status: "working",
          currentTask: task.description,
        });

        const boardMsgId = addMessage({
          role: "board",
          agentName: boardAgentName,
          content: "",
          layer: 2,
          model: boardModel.name,
          altrMode: plan.altrMode,
          status: "streaming",
        });

        addLog({
          level: "info",
          source: "Swarm",
          message: `BOARD [${domain}] → ${boardModel.name} | ${task.description.slice(0, 50)}...`,
        });

        const boardMessages: ChatMessage[] = [
          { role: "system", content: `${BOARD_SYSTEM}\n\nYour domain: ${domain}\nYour task: ${task.description}` },
          {
            role: "user",
            content: `Original request: ${userInput}\n\nYour specific task: ${task.description}\n\nExecute this task. If you need sub-tasks delegated, list them clearly.`,
          },
        ];

        try {
          const resp = await chatCompletion(boardModel.id, boardMessages, {
            temperature: 0.5,
            max_tokens: 4096,
          });
          const content = resp.choices[0].message.content;

          updateMessage(boardMsgId, { content, status: "done" });
          updateAgent(boardAgentId, { status: "done" });

          return { task, content, domain, boardModel, status: "done" as const };
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          updateMessage(boardMsgId, {
            content: `Error: ${errorMsg}`,
            status: "error",
          });
          updateAgent(boardAgentId, { status: "error" });
          return { task, content: `Error: ${errorMsg}`, domain, boardModel, status: "error" as const };
        }
      });

      const boardResults = await Promise.all(boardPromises);

      // ===== PHASE 2: MANAGERS + SUB-AGENTS (ALTR 2 & 3) =====
      if (plan.altrMode >= 2) {
        for (const result of boardResults) {
          if (result.status === "error") continue;

          // Identify sub-tasks from board output
          const subTaskLines = result.content
            .split("\n")
            .filter(
              (line) =>
                line.toLowerCase().includes("subtask") ||
                line.toLowerCase().includes("sub-task") ||
                line.toLowerCase().includes("delegate") ||
                line.toLowerCase().includes("implement") ||
                /^\d+\.\s*\`/.test(line)
            )
            .slice(0, 4); // Max 4 sub-tasks per board member

          if (subTaskLines.length === 0) continue;

          const managerPromises = subTaskLines.map(async (subTask, idx) => {
            const managerModel = pickModelForTask(subTask, "manager");
            const managerName = `${result.domain} Mgr ${idx + 1}`;

            const managerAgentId = addAgent({
              name: managerName,
              role: "manager",
              layer: 3,
              model: managerModel.id,
              status: "working",
              currentTask: subTask,
            });

            const managerMsgId = addMessage({
              role: "manager",
              agentName: managerName,
              content: "",
              layer: 3,
              model: managerModel.name,
              altrMode: plan.altrMode,
              status: "streaming",
            });

            addLog({
              level: "info",
              source: "Swarm",
              message: `MANAGER [${managerName}] → ${managerModel.name}`,
            });

            const mgrMessages: ChatMessage[] = [
              {
                role: "system",
                content: `${BOARD_SYSTEM}\n\nYou are a Manager agent. Your parent Board member (${result.domain}) assigned you this sub-task. Execute it precisely and return results.`,
              },
              {
                role: "user",
                content: `Original request: ${userInput}\nBoard context: ${result.content.slice(0, 800)}\n\nYour sub-task: ${subTask}\n\nExecute this sub-task with full implementation details.`,
              },
            ];

            try {
              const mgrResp = await chatCompletion(managerModel.id, mgrMessages, {
                temperature: 0.5,
                max_tokens: 4096,
              });
              const mgrContent = mgrResp.choices[0].message.content;

              updateMessage(managerMsgId, { content: mgrContent, status: "done" });
              updateAgent(managerAgentId, { status: "done" });

              // ALTR 3: Recursive sub-agents
              if (plan.altrMode === 3) {
                const refineLines = mgrContent
                  .split("\n")
                  .filter(
                    (line) =>
                      line.toLowerCase().includes("refine") ||
                      line.toLowerCase().includes("validate") ||
                      line.toLowerCase().includes("test") ||
                      line.toLowerCase().includes("optimize")
                  )
                  .slice(0, 2);

                for (const refine of refineLines) {
                  const subModel = pickModelForTask(refine, "manager");
                  const subName = `${result.domain} Sub ${idx + 1}`;

                  const subAgentId = addAgent({
                    name: subName,
                    role: "subagent",
                    layer: 4,
                    model: subModel.id,
                    status: "working",
                    currentTask: refine,
                  });

                  const subMsgId = addMessage({
                    role: "subagent",
                    agentName: subName,
                    content: "",
                    layer: 4,
                    model: subModel.name,
                    altrMode: 3,
                    status: "streaming",
                  });

                  const subMessages: ChatMessage[] = [
                    {
                      role: "system",
                      content: "You are a Sub-agent specializing in refinement, validation, and optimization. Produce concise, expert-level output.",
                    },
                    {
                      role: "user",
                      content: `Context: ${mgrContent.slice(0, 600)}\n\nRefinement task: ${refine}`,
                    },
                  ];

                  try {
                    const subResp = await chatCompletion(subModel.id, subMessages, {
                      temperature: 0.4,
                      max_tokens: 2048,
                    });
                    updateMessage(subMsgId, {
                      content: subResp.choices[0].message.content,
                      status: "done",
                    });
                    updateAgent(subAgentId, { status: "done" });
                  } catch {
                    updateAgent(subAgentId, { status: "error" });
                  }
                }
              }

              return { content: mgrContent };
            } catch (err: unknown) {
              const errorMsg = err instanceof Error ? err.message : "Unknown error";
              updateMessage(managerMsgId, {
                content: `Error: ${errorMsg}`,
                status: "error",
              });
              updateAgent(managerAgentId, { status: "error" });
              return { content: `Error: ${errorMsg}` };
            }
          });

          await Promise.all(managerPromises);
        }
      }

      // Final summary
      const finalMsgId = addMessage({
        role: "head",
        agentName: "Head Alpha",
        content: `✓ Swarm execution complete (ALTR ${plan.altrMode})\n${plan.tasks.length} tasks executed across ${boardResults.length} Board specialists.`,
        layer: 1,
        model: headModel.name,
        status: "done",
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    addLog({ level: "error", source: "Swarm", message: `Execution failed: ${errorMsg}` });
    addMessage({
      role: "system",
      content: `❌ Swarm execution error: ${errorMsg}`,
      status: "error",
    });
  } finally {
    setExecuting(false);
  }
}
