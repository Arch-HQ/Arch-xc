import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store/index.js";
import { saveConfig, loadConfig } from "../utils/config.js";

export function SettingsView({ width, height }: { width: number; height: number }): JSX.Element {
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const setScreen = useStore((s) => s.setScreen);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showSaved, setShowSaved] = useState(false);

  const settings = [
    {
      label: "Provider",
      value: config?.provider ?? "nvidia",
      options: ["nvidia", "custom"],
    },
    {
      label: "ALTR Default Mode",
      value: String(config?.altrMode ?? 1),
      options: ["1", "2", "3"],
    },
    {
      label: "Theme",
      value: config?.theme ?? "dark",
      options: ["dark", "light"],
    },
    {
      label: "API Key",
      value: config?.apiKey
        ? "***" + config.apiKey.slice(-4)
        : "Not set — run /connect",
      options: [],
    },
    {
      label: "Base URL",
      value: config?.baseUrl ?? "https://integrate.api.nvidia.com/v1",
      options: [],
    },
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIdx((i) => Math.min(settings.length - 1, i + 1));
    } else if (key.return) {
      if (selectedIdx === 0) {
        // Toggle provider
        const newProvider = config?.provider === "nvidia" ? "custom" : "nvidia";
        const newConfig = {
          ...config,
          provider: newProvider as "nvidia" | "custom",
          baseUrl:
            newProvider === "nvidia"
              ? "https://integrate.api.nvidia.com/v1"
              : config?.baseUrl ?? "",
        };
        saveConfig(newConfig);
        setConfig({ ...loadConfig(), ...newConfig });
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 1500);
      } else if (selectedIdx === 1) {
        // Cycle ALTR mode
        const modes: Array<1 | 2 | 3> = [1, 2, 3];
        const current = config?.altrMode ?? 1;
        const next = modes[(modes.indexOf(current) + 1) % modes.length];
        const newConfig = { ...config, altrMode: next };
        saveConfig(newConfig);
        setConfig({ ...loadConfig(), ...newConfig });
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 1500);
      }
    } else if (key.escape) {
      setScreen("main");
    }
  });

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1}>
      <Box marginBottom={1} flexDirection="row">
        <Text bold color="cyanBright">
          Settings
        </Text>
        {showSaved && (
          <Text color="green"> ✓ Saved</Text>
        )}
      </Box>

      <Box flexDirection="column">
        {settings.map((setting, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <Box
              key={setting.label}
              flexDirection="row"
              height={1}
            >
              <Text
                color={isSelected ? "cyanBright" : "white"}
                bold={isSelected}
              >
                {isSelected ? "> " : "  "}
                {setting.label.padEnd(20)}
              </Text>
              <Text
                color={isSelected ? "white" : "gray"}
                bold={isSelected}
              >
                {setting.value}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          ↑↓ Navigate | Enter toggle | Esc back to chat
        </Text>
      </Box>
    </Box>
  );
}
