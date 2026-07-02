import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store/index.js";

const LEVELS = ["all", "info", "warn", "error", "debug"] as const;
type LevelFilter = (typeof LEVELS)[number];

const LEVEL_COLORS: Record<string, string> = {
  info: "green",
  warn: "yellow",
  error: "red",
  debug: "gray",
};

function nextLevel(current: LevelFilter): LevelFilter {
  const idx = LEVELS.indexOf(current);
  return LEVELS[(idx + 1) % LEVELS.length];
}

export function LogView({ width, height }: { width: number; height: number }): JSX.Element {
  const logs = useStore((s) => s.logs);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filterLevel, setFilterLevel] = useState<LevelFilter>("all");
  const [filterSource, setFilterSource] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterInput, setFilterInput] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterLevel !== "all" && log.level !== filterLevel) return false;
      if (filterSource && !log.source.toLowerCase().includes(filterSource.toLowerCase())) return false;
      return true;
    });
  }, [logs, filterLevel, filterSource]);

  const viewportSize = Math.max(1, height - 3);
  const safeIdx = Math.min(selectedIdx, Math.max(0, filteredLogs.length - 1));
  const scrollOffset = Math.min(safeIdx, Math.max(0, filteredLogs.length - viewportSize));
  const visible = filteredLogs.slice(scrollOffset, scrollOffset + viewportSize);

  const handleKey = useCallback((input: string, key: { upArrow?: boolean; downArrow?: boolean; escape?: boolean; return?: boolean }) => {
    if (isFiltering) {
      if (key.escape) {
        setIsFiltering(false);
        setFilterInput("");
        return;
      }
      if (key.return) {
        setFilterSource(filterInput);
        setIsFiltering(false);
        setFilterInput("");
        setSelectedIdx(0);
        return;
      }
      if (key.upArrow || key.downArrow) return;
      if (input === "c" && !filterInput) {
        setIsFiltering(false);
        setFilterInput("");
        return;
      }
      setFilterInput((prev) => prev + input);
      return;
    }

    if (key.upArrow) {
      setSelectedIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIdx((i) => Math.min(filteredLogs.length - 1, i + 1));
      return;
    }
    if (input === "l") {
      setFilterLevel((prev) => nextLevel(prev));
      setSelectedIdx(0);
      return;
    }
    if (input === "/") {
      setIsFiltering(true);
      setFilterInput("");
      return;
    }
    if (input === "c") {
      setFilterLevel("all");
      setFilterSource("");
      setSelectedIdx(0);
      return;
    }
  }, [isFiltering, filteredLogs.length, filterInput]);

  useInput(handleKey);

  const filterParts: string[] = [];
  if (filterLevel !== "all") filterParts.push(`level: ${filterLevel}`);
  if (filterSource) filterParts.push(`source: ${filterSource}`);
  const filterLabel = filterParts.length > 0 ? ` [filter: ${filterParts.join(", ")}]` : "";

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyanBright">
          System Logs
        </Text>
        <Text color="gray"> — {filteredLogs.length} entries{filterLabel}</Text>
      </Box>

      {isFiltering && (
        <Box marginBottom={1}>
          <Text color="yellow">Filter source: </Text>
          <Text color="white" underline>{filterInput || "<type and press Enter>"}</Text>
        </Box>
      )}

      <Box flexDirection="column">
        {visible.map((log) => {
          const timeStr = new Date(log.timestamp).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const levelColor = LEVEL_COLORS[log.level] || "white";

          return (
            <Box key={log.id} flexDirection="row" height={1}>
              <Text color="gray" dimColor>
                {timeStr}
              </Text>
              <Text color={levelColor} bold>
                {` [${log.level.toUpperCase().padEnd(5)}]`}
              </Text>
              <Text color="cyan"> {log.source.padEnd(8)}</Text>
              <Text color="white" wrap="truncate">
                {" "}{log.message.slice(0, width - 40)}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {isFiltering
            ? "Type source name · Enter to apply · Esc to cancel"
            : "↑↓ Navigate · l Filter level · / Filter source · c Clear filters · Esc/q to go back"}
        </Text>
      </Box>
    </Box>
  );
}
