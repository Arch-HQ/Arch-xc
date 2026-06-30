import React, { useEffect, useRef } from "react";
import { Box, Text, useStdout } from "ink";
import { useStore, type Message } from "../store/index.js";

function formatContent(content: string): string[] {
  // Add blank lines around structured markers for better readability
  const formatted = content
    .replace(/^(ALTR:|THOUGHT:|PLAN:|Status:)/gm, "\n$1")
    .replace(/^(-\s+)/gm, "\n$1")
    .replace(/^(\d+\.\s*\[)/gm, "\n$1")
    .replace(/^\|/gm, "\n|")
    .replace(/^(---+)$/gm, "\n$1\n");
  return formatted.split("\n");
}

function MessageBubble({ msg, width }: { msg: Message; width: number }): JSX.Element {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  const isHead = msg.role === "head";
  const isBoard = msg.role === "board";
  const isManager = msg.role === "manager";
  const isSubagent = msg.role === "subagent";

  const contentWidth = width - 8;

  // Color coding by role
  let roleColor = "white";
  let roleBg: string | undefined = undefined;
  let prefix = "";

  if (isUser) {
    roleColor = "cyanBright";
    prefix = "You";
  } else if (isHead) {
    roleColor = "magentaBright";
    roleBg = "magenta";
    prefix = "🧠 Head";
  } else if (isBoard) {
    roleColor = "yellowBright";
    roleBg = "yellow";
    prefix = "📋 Board";
  } else if (isManager) {
    roleColor = "greenBright";
    prefix = "⚙ Mgr";
  } else if (isSubagent) {
    roleColor = "blueBright";
    prefix = "◇ Sub";
  } else if (isSystem) {
    roleColor = "gray";
    prefix = "System";
  }

  // Format then wrap content to contentWidth
  const rawLines = formatContent(msg.content || "");
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    lines.push(...wrapText(rawLine, contentWidth));
  }

  const divider = "─".repeat(Math.min(width - 4, 60));
  const time = new Date(msg.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Box flexDirection="column" marginBottom={2} width={width}>
      {/* Header */}
      <Box flexDirection="row" marginBottom={0}>
        <Text
          bold
          color={roleBg ? "black" : roleColor}
          backgroundColor={roleBg}
        >
          {` ${prefix} `}
        </Text>
        <Text color="gray" dimColor>
          {`  ${time}`}
        </Text>
        {msg.status === "streaming" && (
          <Text color="yellow"> ▐░░░░░░░░░▌</Text>
        )}
        {msg.status === "error" && (
          <Text color="red"> ✖ Error</Text>
        )}
        {msg.altrMode && (
          <Text color="gray" dimColor>
            {`  ALTR-${msg.altrMode}`}
          </Text>
        )}
      </Box>

      {/* Model tag on its own line */}
      {msg.model && (
        <Box marginBottom={0}>
          <Text color="gray" dimColor>
            {msg.model}
          </Text>
        </Box>
      )}

      {/* Content */}
      <Box flexDirection="column" paddingLeft={2}>
        {lines.map((line, i) => (
          <Text key={i} color={isSystem ? "gray" : "white"} wrap="end">
            {line || " "}
          </Text>
        ))}
      </Box>

      {/* Divider between agent messages */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {divider}
        </Text>
      </Box>
    </Box>
  );
}

function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [""];
  const lines: string[] = [];
  const rawLines = text.split("\n");

  for (const rawLine of rawLines) {
    if (rawLine.length <= maxWidth) {
      lines.push(rawLine);
      continue;
    }

    let current = "";
    const words = rawLine.split(" ");
    for (const word of words) {
      if ((current + " " + word).length > maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = current ? current + " " + word : word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

export function ChatArea({ width, height }: { width: number; height: number }): JSX.Element {
  const messages = useStore((s) => s.messages);
  const isExecuting = useStore((s) => s.isExecuting);

  // Auto-scroll: show last messages that fit
  const visibleMessages = messages.slice(-Math.max(1, Math.floor(height / 4)));

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      paddingX={1}
      paddingY={1}
    >
      {messages.length === 0 ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height={height}>
          <Text color="gray" dimColor>
            Welcome to Arch XC — The Swarm Engine
          </Text>
          <Text color="gray" dimColor>
            Describe your engineering goal to activate the swarm
          </Text>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Commands: /connect /altr1 /altr2 /altr3 /clear /help
            </Text>
          </Box>
        </Box>
      ) : (
        <>
          {visibleMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} width={width - 2} />
          ))}
          {isExecuting && (
            <Box marginTop={1}>
              <Text color="yellow">
                <Text color="yellowBright">⚡</Text> Swarm executing...
              </Text>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
