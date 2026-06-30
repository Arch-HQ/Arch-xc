import React from "react";
import { Box, Text, useStdout } from "ink";
import { useStore } from "../store/index.js";
import { isConnected } from "../utils/config.js";

/**
 * Header — Top header bar.
 * Left: "ARCH XC" brand in bold magenta + version tag.
 * Center: Connection status (green/red dot + label).
 * Right: Current ALTR mode indicator (ALTR-1 / ALTR-2 / ALTR-3).
 */

export function Header(): JSX.Element {
  const { stdout } = useStdout();
  const currentAltrMode = useStore((s) => s.currentAltrMode);
  const connected = isConnected();
  const width = stdout.columns || 80;

  // Each section is a third of the width for clean alignment
  const sectionWidth = Math.floor(width / 3);

  return (
    <Box flexDirection="row" width={width} height={1}>
      {/* Left — Brand */}
      <Box width={sectionWidth}>
        <Text bold color="magentaBright">
          ARCH XC{" "}
        </Text>
        <Text color="gray" dimColor>
          v0.1.0
        </Text>
      </Box>

      {/* Center — Connection status */}
      <Box width={sectionWidth} justifyContent="center">
        <Text color={connected ? "greenBright" : "redBright"}>
          ●{" "}
        </Text>
        <Text color={connected ? "green" : "red"}>
          {connected ? "NIM Connected" : "Disconnected"}
        </Text>
      </Box>

      {/* Right — ALTR mode */}
      <Box width={sectionWidth} justifyContent="flex-end">
        <Text color="yellowBright" bold>
          ALTR-{currentAltrMode}
        </Text>
      </Box>
    </Box>
  );
}
