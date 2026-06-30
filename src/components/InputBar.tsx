import React, { useState, useCallback } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useStore } from "../store/index.js";
import { saveConfig } from "../utils/config.js";
import { executeSwarm } from "../core/swarm.js";
import { getBoardModels, getManagerModels } from "../core/models.js";

export function InputBar({ width }: { width: number }): JSX.Element {
  const { stdout } = useStdout();
  const inputValue = useStore((s) => s.inputValue);
  const setInputValue = useStore((s) => s.setInputValue);
  const isExecuting = useStore((s) => s.isExecuting);
  const addMessage = useStore((s) => s.addMessage);
  const clearMessages = useStore((s) => s.clearMessages);
  const setScreen = useStore((s) => s.setScreen);
  const setAltrMode = useStore((s) => s.setAltrMode);
  const addLog = useStore((s) => s.addLog);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isExecuting) return;

      // Save to history
      setHistory((prev) => [trimmed, ...prev].slice(0, 50));
      setHistoryIndex(-1);

      // Parse commands
      if (trimmed.startsWith("/")) {
        const [cmd, ...args] = trimmed.slice(1).split(" ");
        const rest = args.join(" ");

        switch (cmd.toLowerCase()) {
          case "connect":
            setScreen("connect");
            setInputValue("");
            return;

          case "altr1":
            setAltrMode(1);
            addLog({ level: "info", source: "CMD", message: "Switched to ALTR-1" });
            addMessage({
              role: "system",
              content: "🔹 ALTR Mode set to 1 — Head + Board only",
              status: "done",
            });
            setInputValue("");
            return;

          case "altr2":
            setAltrMode(2);
            addLog({ level: "info", source: "CMD", message: "Switched to ALTR-2" });
            addMessage({
              role: "system",
              content: "🔹 ALTR Mode set to 2 — Head + Board + Managers",
              status: "done",
            });
            setInputValue("");
            return;

          case "altr3":
            setAltrMode(3);
            addLog({ level: "info", source: "CMD", message: "Switched to ALTR-3" });
            addMessage({
              role: "system",
              content: "🔹 ALTR Mode set to 3 — Full recursive swarm",
              status: "done",
            });
            setInputValue("");
            return;

          case "clear":
            clearMessages();
            addLog({ level: "info", source: "CMD", message: "Chat cleared" });
            setInputValue("");
            return;

          case "help":
            addMessage({
              role: "system",
              content: `Available commands:
/connect    — Connect/reconnect API key
/altr1      — Head + Board mode (fast)
/altr2      — + Managers (balanced)
/altr3      — Full recursive swarm (deep)
/clear      — Clear chat
/models     — Show available models
/help       — Show this help

Type naturally to execute tasks via the swarm.`,
              status: "done",
            });
            setInputValue("");
            return;

          case "models": {
            const boards = getBoardModels();
            const mgrs = getManagerModels();
            addMessage({
              role: "system",
              content: `Available Models:

🧠 HEAD (Top-tier reasoning):
  • Nemotron 3 Ultra 550B
  • Mistral Large 3 675B
  • DeepSeek V4 Pro
  • Qwen 3.5 397B
  • Gemma 4 31B

📋 BOARD (Domain specialists):
${boards.map((m) => `  • ${m.name} (${m.org})`).join("\n")}

⚙ MANAGERS (Execution):
${mgrs.slice(0, 10).map((m) => `  • ${m.name} (${m.org})`).join("\n")}
  ... and ${mgrs.length - 10} more`,
              status: "done",
            });
            setInputValue("");
            return;
          }

          default:
            addMessage({
              role: "system",
              content: `Unknown command: /${cmd}. Type /help for available commands.`,
              status: "error",
            });
            setInputValue("");
            return;
        }
      }

      // Regular message — send to swarm
      addMessage({
        role: "user",
        content: trimmed,
        status: "done",
      });

      setInputValue("");

      // Execute swarm async
      const altrMode = useStore.getState().currentAltrMode;
      executeSwarm(trimmed, altrMode).catch((err) => {
        addMessage({
          role: "system",
          content: `❌ Error: ${err instanceof Error ? err.message : "Unknown"}`,
          status: "error",
        });
      });
    },
    [isExecuting]
  );

  useInput(
    (input, key) => {
      if (key.upArrow && history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex] ?? "");
        return;
      }
      if (key.downArrow && historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(newIndex >= 0 ? (history[newIndex] ?? "") : "");
        return;
      }
      if (key.return) {
        handleSubmit(inputValue);
        return;
      }
    },
    { isActive: true }
  );

  return (
    <Box
      flexDirection="row"
      width={width}
      height={2}
      paddingX={1}
    >
      <Box marginRight={1}>
        <Text bold color="cyanBright">
          ❯
        </Text>
      </Box>
      <Box width={width - 6}>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          placeholder={
            isExecuting
              ? "Swarm executing..."
              : "Describe your goal or type /help..."
          }
          focus={true}
        />
      </Box>
    </Box>
  );
}
