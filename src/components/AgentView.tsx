import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store/index.js";

export function AgentView({ width, height }: { width: number; height: number }): JSX.Element {
  const agents = useStore((s) => s.agents);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const viewportSize = Math.max(1, height - 3);
  const safeIdx = Math.min(selectedIdx, Math.max(0, agents.length - 1));
  const scrollOffset = Math.min(safeIdx, Math.max(0, agents.length - viewportSize));
  const visible = agents.slice(scrollOffset, scrollOffset + viewportSize);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIdx((i) => Math.min(agents.length - 1, i + 1));
    }
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "working": return "▶";
      case "done": return "✓";
      case "error": return "✖";
      default: return "○";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "working": return "yellowBright";
      case "done": return "greenBright";
      case "error": return "redBright";
      default: return "gray";
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "head": return "magentaBright";
      case "board": return "yellowBright";
      case "manager": return "greenBright";
      case "subagent": return "blueBright";
      default: return "white";
    }
  };

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyanBright">
          Active Agents
        </Text>
        <Text color="gray"> — {agents.length} spawned</Text>
      </Box>

      {agents.length === 0 ? (
        <Text color="gray" dimColor>
          No active agents. Execute a task to spawn the swarm.
        </Text>
      ) : (
        <Box flexDirection="column">
          {visible.map((agent) => (
            <Box key={agent.id} flexDirection="column" marginBottom={1}>
              <Box flexDirection="row">
                <Text color={statusColor(agent.status)}>
                  {statusIcon(agent.status)}{" "}
                </Text>
                <Text bold color={roleColor(agent.role)}>
                  {agent.name}
                </Text>
                <Text color="gray"> — </Text>
                <Text color="white" dimColor>
                  {agent.model}
                </Text>
              </Box>
              {agent.currentTask && (
                <Box paddingLeft={2}>
                  <Text color="gray" dimColor wrap="truncate">
                    {agent.currentTask.slice(0, width - 10)}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ Navigate | Esc/q to go back
        </Text>
      </Box>
    </Box>
  );
}
