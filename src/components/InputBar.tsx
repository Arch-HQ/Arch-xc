import React, { useCallback, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useStore } from "../store/index.js";
import { executeSwarm } from "../core/swarm.js";
import type { ChatMessage } from "../api/nim.js";
import { getBoardModels, getManagerModels } from "../core/models.js";

const COMMANDS = [
  { cmd: "/help", desc: "Show command help" },
  { cmd: "/clear", desc: "Clear messages" },
  { cmd: "/connect", desc: "Connect API key" },
  { cmd: "/altr1", desc: "ALTR mode 1" },
  { cmd: "/altr2", desc: "ALTR mode 2" },
  { cmd: "/altr3", desc: "ALTR mode 3" },
  { cmd: "/models", desc: "List models" },
  { cmd: "/agents", desc: "View agents" },
  { cmd: "/logs", desc: "View logs" },
  { cmd: "/settings", desc: "Open settings" },
];

export function InputBar({ width }: { width: number }): JSX.Element {
  const inputValue = useStore((s) => s.inputValue);
  const setInputValue = useStore((s) => s.setInputValue);
  const isExecuting = useStore((s) => s.isExecuting);
  const addMessage = useStore((s) => s.addMessage);
  const clearMessages = useStore((s) => s.clearMessages);
  const setScreen = useStore((s) => s.setScreen);
  const setAltrMode = useStore((s) => s.setAltrMode);
  const addLog = useStore((s) => s.addLog);

  const [suggestionIdx, setSuggestionIdx] = useState(0);

  const matchingCmds = inputValue.startsWith("/")
    ? COMMANDS.filter((c) => c.cmd.startsWith(inputValue.toLowerCase()))
    : [];

  const showSuggestions = matchingCmds.length > 0;

  const executeCommand = useCallback(
    (cmdName: string) => {
      setInputValue("");

      switch (cmdName) {
        case "connect":
          setScreen("connect");
          return;

        case "altr1":
          setAltrMode(1);
          addLog({ level: "info", source: "CMD", message: "Switched to ALTR-1" });
          addMessage({ role: "system", content: "**ALTR Pipeline Adjustment**: Parameter set to Layer 1 [Architectural Head & Core Orchestrator Focus]", status: "done" });
          return;

        case "altr2":
          setAltrMode(2);
          addLog({ level: "info", source: "CMD", message: "Switched to ALTR-2" });
          addMessage({ role: "system", content: "**ALTR Pipeline Adjustment**: Parameter set to Layer 2 [Enabling Functional Structural Managers]", status: "done" });
          return;

        case "altr3":
          setAltrMode(3);
          addLog({ level: "info", source: "CMD", message: "Switched to ALTR-3" });
          addMessage({ role: "system", content: "**ALTR Pipeline Adjustment**: Parameter set to Layer 3 [Recursive Swarm Inversion Active]", status: "done" });
          return;

        case "clear":
          clearMessages();
          addLog({ level: "info", source: "CMD", message: "Interface storage dropped" });
          return;

        case "help":
          addMessage({
            role: "system",
            content: `**Commands**
  /connect   — Connect API key
  /altr1     — ALTR mode 1 [Fast]
  /altr2     — ALTR mode 2 [Standard]
  /altr3     — ALTR mode 3 [Deep]
  /clear     — Clear messages
  /models    — List models
  /agents    — View agents
  /logs      — View logs
  /settings  — Open settings`,
            status: "done",
          });
          return;

        case "models": {
          const boards = getBoardModels();
          const mgrs = getManagerModels();
          addMessage({
            role: "system",
            content: `**Active Models**

**HEAD**:
  • Nemotron 4 Ultra Core
  • Qwen 3.5 Extended Compute

**BOARD**:
${boards.map((m) => `  • ${m.name}`).join("\n")}

**MANAGERS**:
${mgrs.slice(0, 5).map((m) => `  • ${m.name}`).join("\n")}`,
            status: "done",
          });
          return;
        }

        case "agents":
          setScreen("agents");
          return;

        case "logs":
          setScreen("logs");
          return;

        case "settings":
          setScreen("settings");
          return;
      }
    },
    [addLog, addMessage, clearMessages, setAltrMode, setInputValue, setScreen]
  );

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isExecuting) return;

      if (showSuggestions) {
        const selected = matchingCmds[suggestionIdx];
        if (selected) {
          executeCommand(selected.cmd.slice(1).toLowerCase());
          return;
        }
      }

      if (trimmed.startsWith("/")) {
        const cmdName = trimmed.slice(1).toLowerCase();
        const matched = COMMANDS.find((c) => c.cmd === trimmed.toLowerCase());
        if (matched) {
          executeCommand(cmdName);
        } else {
          addMessage({ role: "system", content: `Command unrecognized: \`${trimmed}\`. Type \`/help\` for available commands.`, status: "error" });
          setInputValue("");
        }
        return;
      }

      // Build history from existing messages BEFORE adding the new one
      const existingMessages = useStore.getState().messages;
      const chatHistory: ChatMessage[] = [];
      for (const msg of existingMessages) {
        if (msg.role === "user" && msg.content.trim()) {
          chatHistory.push({ role: "user", content: msg.content });
        } else if (msg.role === "head" && msg.content && msg.status === "done") {
          chatHistory.push({ role: "assistant", content: msg.content });
        }
      }
      const recentHistory = chatHistory.slice(-20);

      addMessage({ role: "user", content: trimmed, status: "done" });
      setInputValue("");

      const targetAltr = useStore.getState().currentAltrMode;
      addLog({ level: "debug", source: "History", message: `Injecting ${recentHistory.length} turns into HEAD context` });
      executeSwarm(trimmed, targetAltr, recentHistory).catch((err) => {
        addMessage({ role: "system", content: `Error: ${err instanceof Error ? err.message : "Runtime error"}`, status: "error" });
      });
    },
    [isExecuting, showSuggestions, matchingCmds, suggestionIdx, addLog, addMessage, clearMessages, setAltrMode, setInputValue, setScreen, executeCommand]
  );

  useInput(
    (input, key) => {
      if (!showSuggestions) return;

      if (key.upArrow) {
        setSuggestionIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSuggestionIdx((i) => Math.min(matchingCmds.length - 1, i + 1));
        return;
      }
    },
    { isActive: showSuggestions }
  );

  return (
    <Box flexDirection="column" width={width} marginTop={1}>
      {showSuggestions && (
        <Box flexDirection="column" marginBottom={1}>
          {matchingCmds.map((cmd, idx) => (
            <Box key={cmd.cmd} flexDirection="row" height={1}>
              <Text
                color={idx === suggestionIdx ? "black" : "gray"}
                backgroundColor={idx === suggestionIdx ? "cyan" : undefined}
                bold={idx === suggestionIdx}
              >
                {" "}{cmd.cmd.padEnd(12)} {cmd.desc}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      <Box
        flexDirection="row"
        width={width}
        borderStyle="single"
        borderColor={isExecuting ? "#525252" : "cyan"}
        paddingX={1}
        paddingY={0}
        alignItems="center"
      >
        <Text bold color={isExecuting ? "#525252" : "cyan"}>❯</Text>
        <Box flexGrow={1} paddingLeft={1}>
          <TextInput
            value={inputValue}
            onChange={(v) => {
              setInputValue(v);
              setSuggestionIdx(0);
            }}
            onSubmit={handleSubmit}
            placeholder={isExecuting ? "Executing..." : "Type your request"}
            focus={!isExecuting}
          />
        </Box>
      </Box>

      <Box flexDirection="row" marginTop={1}>
        <Text color="gray" dimColor>/commands /connect</Text>
      </Box>
    </Box>
  );
}
