import React from "react";
import { Box, Text, useStdout } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";

export function SplashScreen(): JSX.Element {
  const { stdout } = useStdout();
  const width = stdout.columns || 80;
  const height = stdout.rows || 24;

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width={width}
      height={height}
    >
      <Gradient name="retro">
        <BigText text="ARCH XC" font="simple" />
      </Gradient>

      <Box marginTop={1}>
        <Text color="gray">The Swarm Engine for Autonomous Engineering</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color="green">Initializing Swarm...</Text>
        <Text color="gray">Loading model pool (50+ models)</Text>
        <Text color="gray">Mounting message bus</Text>
        <Text color="gray">Calibrating ALTR router</Text>
      </Box>

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          Press Ctrl+C to exit at any time
        </Text>
      </Box>
    </Box>
  );
}
