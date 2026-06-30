import React from "react";
import { Box, Text } from "ink";
import { useStore } from "../store/index.js";

export function LogView({ width, height }: { width: number; height: number }): JSX.Element {
  const logs = useStore((s) => s.logs);
  const visibleLogs = logs.slice(-Math.max(1, height - 2));

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyanBright">
          System Logs
        </Text>
        <Text color="gray"> — {logs.length} entries</Text>
      </Box>

      <Box flexDirection="column">
        {visibleLogs.map((log) => {
          const timeStr = new Date(log.timestamp).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          let levelColor = "white";
          switch (log.level) {
            case "info":
              levelColor = "green";
              break;
            case "warn":
              levelColor = "yellow";
              break;
            case "error":
              levelColor = "red";
              break;
            case "debug":
              levelColor = "gray";
              break;
          }

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
    </Box>
  );
}
