import React from "react";
import { Box, Text, useStdout } from "ink";
import { useStore } from "../store/index.js";

export function StatusBar(): JSX.Element {
  const { stdout } = useStdout();
  const isExecuting = useStore((s) => s.isExecuting);
  const currentAltrMode = useStore((s) => s.currentAltrMode);
  const inputValue = useStore((s) => s.inputValue);
  const sidebarFocused = useStore((s) => s.sidebarFocused);
  const screen = useStore((s) => s.screen);
  const width = stdout.columns || 80;

  let statusMessage = "Ready";
  if (isExecuting) {
    statusMessage = `Executing ALTR-${currentAltrMode}...`;
  } else if (inputValue.startsWith("/")) {
    statusMessage = "Command mode";
  } else if (sidebarFocused) {
    statusMessage = "Sidebar focused (arrows to navigate, Enter to select)";
  } else if (screen === "connect") {
    statusMessage = "Connect mode — Tab to switch fields, Enter to submit";
  }

  const leftText = "Arch XC v0.1.0";
  const rightText = "\u005E\u0043 Quit | Tab Focus | /cmd Command";
  const centerMinPad = 2;
  const centerWidth = Math.max(
    0,
    width - leftText.length - rightText.length - centerMinPad * 2
  );

  return (
    <Box
      flexDirection="row"
      width={width}
      height={1}
      borderStyle="single"
      borderTop
      borderLeft={false}
      borderRight={false}
      borderBottom={false}
      borderColor="gray"
    >
      <Box>
        <Text color="gray" dimColor>
          {leftText}
        </Text>
      </Box>

      <Box width={centerWidth} justifyContent="center">
        <Text
          color={isExecuting ? "yellowBright" : "cyan"}
          dimColor={!isExecuting}
          bold={isExecuting}
          wrap="truncate"
        >
          {statusMessage}
        </Text>
      </Box>

      <Box>
        <Text color="gray" dimColor>
          {rightText}
        </Text>
      </Box>
    </Box>
  );
}
