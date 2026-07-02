import React, { useMemo, useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useStore, type Message } from "../store/index.js";

function parseCustomMarkdown(text: string): Array<{ type: "text" | "bold" | "code"; content: string }> {
  const tokens: Array<{ type: "text" | "bold" | "code"; content: string }> = [];
  let index = 0;

  while (index < text.length) {
    const boldMatch = text.slice(index).match(/^\*\*(.*?)\*\*/);
    if (boldMatch) {
      tokens.push({ type: "bold", content: boldMatch[1] });
      index += boldMatch[0].length;
      continue;
    }

    const codeMatch = text.slice(index).match(/^`(.*?)`/);
    if (codeMatch) {
      tokens.push({ type: "code", content: codeMatch[1] });
      index += codeMatch[0].length;
      continue;
    }

    const nextSpecial = text.slice(index).search(/\*\*|`/);
    if (nextSpecial === -1) {
      tokens.push({ type: "text", content: text.slice(index) });
      break;
    } else {
      tokens.push({ type: "text", content: text.slice(index, index + nextSpecial) });
      index += nextSpecial;
    }
  }

  return tokens;
}

function computeWrappedLines(text: string, maxLineWidth: number): string[] {
  const resultingLines: string[] = [];
  const processingParagraphs = text.split("\n");

  for (const paragraph of processingParagraphs) {
    if (paragraph.length === 0) {
      resultingLines.push("");
      continue;
    }
    let lineAccumulator = "";
    const individualWords = paragraph.split(" ");

    for (const word of individualWords) {
      const spacingToken = lineAccumulator ? " " : "";
      if ((lineAccumulator + spacingToken + word).length > maxLineWidth) {
        resultingLines.push(lineAccumulator);
        lineAccumulator = word;
      } else {
        lineAccumulator += spacingToken + word;
      }
    }
    if (lineAccumulator) resultingLines.push(lineAccumulator);
  }
  return resultingLines;
}

function BlockCodeContainer({ code, language, width }: { code: string; language: string; width: number }) {
  const lineBuffer = code.split("\n");
  return (
    <Box flexDirection="column" marginY={1} width={width} borderStyle="single" borderColor="#262626">
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="#A3A3A3"> source_module.{language || "src"}</Text>
      </Box>
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        {lineBuffer.map((line, idx) => (
          <Box key={idx} gap={2}>
            <Text color="#404040">{(idx + 1).toString().padStart(3, " ")}</Text>
            <Text color="#E6E4E0">{line || " "}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MessageContent({ content, width }: { content: string; width: number }) {
  const usableWidth = Math.max(20, width - 6);

  const blocks = useMemo(() => {
    const trackingLines = (content || "").split("\n");
    const result: Array<{ type: "text" | "code"; payload: string }> = [];
    let processingBuffer: string[] = [];
    let insideCodeContext = false;
    let fallbackLang = "ts";

    for (const line of trackingLines) {
      if (line.trim().startsWith("```")) {
        if (insideCodeContext) {
          result.push({ type: "code", payload: processingBuffer.join("\n") });
          processingBuffer = [];
          insideCodeContext = false;
        } else {
          if (processingBuffer.length > 0) {
            result.push({ type: "text", payload: processingBuffer.join("\n") });
            processingBuffer = [];
          }
          fallbackLang = line.replace("```", "").trim() || "ts";
          insideCodeContext = true;
        }
      } else {
        processingBuffer.push(line);
      }
    }

    if (processingBuffer.length > 0) {
      result.push({
        type: insideCodeContext ? "code" : "text",
        payload: processingBuffer.join("\n"),
      });
    }

    return result.map((chunk, index) => {
      if (chunk.type === "code") {
        return <BlockCodeContainer key={index} code={chunk.payload} language={fallbackLang} width={usableWidth - 2} />;
      }

      const formattedLines = computeWrappedLines(chunk.payload, usableWidth - 4);
      return (
        <Box key={index} flexDirection="column">
          {formattedLines.map((line, lineIdx) => (
            <Box key={lineIdx} paddingLeft={1}>
              {parseCustomMarkdown(line).map((tok, tokenIdx) => {
                if (tok.type === "bold") return <Text key={tokenIdx} bold color="#E6E4E0">{tok.content}</Text>;
                if (tok.type === "code") return <Text key={tokenIdx} backgroundColor="#262626" color="#E6E4E0"> {tok.content} </Text>;
                return <Text key={tokenIdx} color="#A3A3A3">{tok.content}</Text>;
              })}
            </Box>
          ))}
        </Box>
      );
    });
  }, [content, usableWidth]);

  return <Box flexDirection="column">{blocks}</Box>;
}

function MessageBubble({ msg, width }: { msg: Message; width: number }): JSX.Element {
  const isUser = msg.role === "user";
  const updateMessage = useStore((s) => s.updateMessage);

  let roleColor = "white";
  let roleBg: string | undefined;
  let prefix = "";

  if (isUser) {
    roleColor = "cyanBright";
    prefix = "You";
  } else if (msg.role === "head") {
    roleColor = "magentaBright";
    roleBg = "magenta";
    prefix = "\u{1F9E0} Head";
  } else if (msg.role === "board") {
    roleColor = "yellowBright";
    roleBg = "yellow";
    prefix = "\u{1F4CB} Board";
  } else if (msg.role === "manager") {
    roleColor = "greenBright";
    prefix = "\u{2699} Mgr";
  } else if (msg.role === "subagent") {
    roleColor = "blueBright";
    prefix = "\u{25C7} Sub";
  } else if (msg.role === "system") {
    roleColor = "gray";
    prefix = "System";
  }

  const time = new Date(msg.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Box flexDirection="column" marginBottom={2} width={width}>
      <Box flexDirection="row" marginBottom={0}>
        <Text bold color={roleBg ? "black" : roleColor} backgroundColor={roleBg}>
          {` ${prefix} `}
        </Text>
        <Text color="gray" dimColor>
          {`  ${time}`}
        </Text>
        {msg.status === "streaming" && (
          <Text color="yellow"> \u2590\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2590</Text>
        )}
        {msg.status === "error" && (
          <Text color="red"> \u2716 Error</Text>
        )}
        {msg.altrMode && (
          <Text color="gray" dimColor>
            {`  ALTR-${msg.altrMode}`}
          </Text>
        )}
      </Box>

      {msg.model && (
        <Box marginBottom={0}>
          <Text color="gray" dimColor>
            {msg.model}
          </Text>
        </Box>
      )}

      {!isUser && msg.thinking && msg.thinkingVisible && (
        <Box paddingLeft={2} marginY={1} flexShrink={0}>
          <Text color="gray" dimColor wrap="wrap">
            {msg.thinking.length > 600
              ? msg.thinking.slice(0, 600) + "\n\u2026 (truncated)"
              : msg.thinking}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" paddingLeft={2} flexShrink={0}>
        <MessageContent content={msg.content} width={width} />
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {"\u2500".repeat(Math.min(width - 4, 60))}
        </Text>
      </Box>
    </Box>
  );
}

export function ChatArea({ width, height }: { width: number; height: number }): JSX.Element {
  const messages = useStore((s) => s.messages);
  const isExecuting = useStore((s) => s.isExecuting);
  const updateMessage = useStore((s) => s.updateMessage);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (scrollOffset === 0) return;
    if (messages.length > 0 && isExecuting) return;
    setScrollOffset(0);
  }, [messages.length, isExecuting]);

  const viewportMsgs = Math.max(1, Math.floor(height / 4));
  const maxOffset = Math.max(0, messages.length - viewportMsgs);
  const safeOffset = Math.min(scrollOffset, maxOffset);
  const startIdx = Math.max(0, messages.length - viewportMsgs - safeOffset);
  const visibleMsgs = messages.slice(startIdx, startIdx + viewportMsgs);
  const isAtBottom = safeOffset === 0;

  useInput((input, key) => {
    if (key.upArrow) {
      setScrollOffset((o) => Math.min(maxOffset, o + 1));
      return;
    }
    if (key.downArrow) {
      setScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
    if (key.pageUp) {
      setScrollOffset((o) => Math.min(maxOffset, o + viewportMsgs));
      return;
    }
    if (key.pageDown) {
      setScrollOffset((o) => Math.max(0, o - viewportMsgs));
      return;
    }
    if (key.return) {
      const lastThinking = [...visibleMsgs].reverse().find((m) => m.thinking);
      if (lastThinking) {
        updateMessage(lastThinking.id, { thinkingVisible: !lastThinking.thinkingVisible });
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1} paddingY={1}>
      {!isAtBottom && messages.length > viewportMsgs && (
        <Box flexDirection="row">
          <Text color="yellow" dimColor>{`\u2191 ${safeOffset} more \u2014 scroll down`}</Text>
        </Box>
      )}

      {messages.length === 0 ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height={height}>
          <Text color="gray" dimColor>Welcome to Arch XC \u2014 The Swarm Engine</Text>
          <Text color="gray" dimColor>Describe your engineering goal to activate the swarm</Text>
          <Box marginTop={1}>
            <Text color="gray" dimColor>Commands: /connect /altr1 /altr2 /altr3 /clear /help</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1}>
          {visibleMsgs.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} width={width - 2} />
          ))}
          {isExecuting && (
            <Box marginTop={1}>
              <Text color="yellow">
                <Text color="yellowBright">{'\u26A1'}</Text> Swarm executing...
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
