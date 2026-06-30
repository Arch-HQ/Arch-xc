import React, { useState, useCallback } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useStore } from "../store/index.js";
import { saveConfig, loadConfig } from "../utils/config.js";

/**
 * ConnectPopup — Centered modal for /connect command.
 * Allows the user to configure API credentials for NVIDIA NIM or a custom provider.
 */

// Focusable fields in the popup
const FOCUS_ORDER = ["provider", "nvidiaKey", "customUrl", "customKey", "buttons"] as const;
type FocusField = (typeof FOCUS_ORDER)[number];

export function ConnectPopup(): JSX.Element {
  const { stdout } = useStdout();
  const setScreen = useStore((s) => s.setScreen);
  const setConfig = useStore((s) => s.setConfig);

  const terminalWidth = stdout.columns || 80;
  const terminalHeight = stdout.rows || 24;

  // Local state
  const [provider, setProvider] = useState<"nvidia" | "custom">("nvidia");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [focusedField, setFocusedField] = useState<FocusField>("provider");
  const [focusedButton, setFocusedButton] = useState<"connect" | "cancel">("connect");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modalWidth = 56;
  const modalHeight = provider === "nvidia" ? 14 : 16;
  const leftPad = Math.max(0, Math.floor((terminalWidth - modalWidth) / 2));
  const topPad = Math.max(0, Math.floor((terminalHeight - modalHeight) / 2));

  const advanceFocus = useCallback(() => {
    const currentIdx = FOCUS_ORDER.indexOf(focusedField);
    let nextIdx = currentIdx + 1;
    if (nextIdx >= FOCUS_ORDER.length) nextIdx = 0;

    const nextField = FOCUS_ORDER[nextIdx];

    // Skip hidden fields based on provider
    if (provider === "nvidia") {
      if (nextField === "customUrl" || nextField === "customKey") {
        setFocusedField("buttons");
        return;
      }
    }
    if (provider === "custom") {
      if (nextField === "nvidiaKey") {
        setFocusedField("customUrl");
        return;
      }
    }
    setFocusedField(nextField);
  }, [focusedField, provider]);

  const handleConnect = useCallback(() => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (provider === "nvidia") {
      if (!nvidiaKey.trim()) {
        setErrorMsg("API Key is required for NVIDIA NIM.");
        return;
      }
      const config = {
        apiKey: nvidiaKey.trim(),
        provider: "nvidia" as const,
        baseUrl: "https://integrate.api.nvidia.com/v1",
      };
      saveConfig(config);
      setConfig({ ...loadConfig(), ...config });
      setSuccessMsg("Connected to NVIDIA NIM!");
      setTimeout(() => setScreen("main"), 600);
    } else {
      if (!customUrl.trim() || !customKey.trim()) {
        setErrorMsg("Base URL and API Key are required for Custom provider.");
        return;
      }
      const config = {
        apiKey: customKey.trim(),
        provider: "custom" as const,
        baseUrl: customUrl.trim(),
      };
      saveConfig(config);
      setConfig({ ...loadConfig(), ...config });
      setSuccessMsg("Connected to custom provider!");
      setTimeout(() => setScreen("main"), 600);
    }
  }, [provider, nvidiaKey, customUrl, customKey, setConfig, setScreen]);

  const handleCancel = useCallback(() => {
    setScreen("main");
  }, [setScreen]);

  useInput(
    (input, key) => {
      if (key.escape) {
        handleCancel();
        return;
      }

      if (key.return) {
        if (focusedField === "buttons") {
          if (focusedButton === "connect") {
            handleConnect();
          } else {
            handleCancel();
          }
        }
        return;
      }

      if (key.tab) {
        if (focusedField === "buttons") {
          setFocusedButton((b) => (b === "connect" ? "cancel" : "connect"));
        } else {
          advanceFocus();
        }
        return;
      }

      if (key.upArrow || key.leftArrow) {
        if (focusedField === "buttons") {
          setFocusedButton((b) => (b === "connect" ? "cancel" : "connect"));
        }
        return;
      }

      if (key.downArrow || key.rightArrow) {
        if (focusedField === "buttons") {
          setFocusedButton((b) => (b === "connect" ? "cancel" : "connect"));
        }
        return;
      }

      // Space toggles provider when provider row has focus
      if (input === " " && focusedField === "provider") {
        setProvider((p) => (p === "nvidia" ? "custom" : "nvidia"));
        return;
      }
    },
    { isActive: true }
  );

  const providerLabel = (label: string, value: "nvidia" | "custom") => (
    <Text
      color={focusedField === "provider" ? "cyanBright" : "white"}
      backgroundColor={
        focusedField === "provider" && provider === value ? "cyan" : undefined
      }
      bold={provider === value}
    >
      {provider === value ? "● " : "○ "}
      {label}
    </Text>
  );

  return (
    <Box
      flexDirection="column"
      width={terminalWidth}
      height={terminalHeight}
    >
      {/* Top padding */}
      {Array.from({ length: topPad }).map((_, i) => (
        <Box key={i} height={1} />
      ))}

      <Box flexDirection="row">
        {/* Left padding */}
        <Box width={leftPad} />

        {/* Modal */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="green"
          width={modalWidth}
          paddingX={2}
          paddingY={1}
        >
          {/* Title */}
          <Box marginBottom={1}>
            <Text bold color="greenBright">
              {"=> "}Connect to NVIDIA NIM
            </Text>
          </Box>

          {/* Provider selector */}
          <Box flexDirection="row" marginBottom={1}>
            <Box marginRight={3}>
              {providerLabel("NVIDIA NIM", "nvidia")}
            </Box>
            <Box>
              {providerLabel("Custom", "custom")}
            </Box>
          </Box>

          {/* Divider */}
          <Box marginBottom={1}>
            <Text color="gray">{"─".repeat(modalWidth - 6)}</Text>
          </Box>

          {/* NVIDIA NIM fields */}
          {provider === "nvidia" && (
            <Box flexDirection="column" marginBottom={1}>
              <Text
                color={
                  focusedField === "nvidiaKey" ? "cyanBright" : "white"
                }
              >
                NVIDIA NIM API Key:
              </Text>
              <Box
                borderStyle={
                  focusedField === "nvidiaKey" ? "single" : "classic"
                }
                borderColor={
                  focusedField === "nvidiaKey" ? "cyan" : "gray"
                }
                paddingX={1}
              >
                <TextInput
                  value={nvidiaKey}
                  onChange={setNvidiaKey}
                  placeholder="nvapi-..."
                  mask={focusedField !== "nvidiaKey" ? "*" : undefined}
                  focus={focusedField === "nvidiaKey"}
                />
              </Box>
            </Box>
          )}

          {/* Custom provider fields */}
          {provider === "custom" && (
            <>
              <Box flexDirection="column" marginBottom={1}>
                <Text
                  color={
                    focusedField === "customUrl" ? "cyanBright" : "white"
                  }
                >
                  Base URL:
                </Text>
                <Box
                  borderStyle={
                    focusedField === "customUrl" ? "single" : "classic"
                  }
                  borderColor={
                    focusedField === "customUrl" ? "cyan" : "gray"
                  }
                  paddingX={1}
                >
                  <TextInput
                    value={customUrl}
                    onChange={setCustomUrl}
                    placeholder="https://api.example.com/v1"
                    focus={focusedField === "customUrl"}
                  />
                </Box>
              </Box>

              <Box flexDirection="column" marginBottom={1}>
                <Text
                  color={
                    focusedField === "customKey" ? "cyanBright" : "white"
                  }
                >
                  API Key:
                </Text>
                <Box
                  borderStyle={
                    focusedField === "customKey" ? "single" : "classic"
                  }
                  borderColor={
                    focusedField === "customKey" ? "cyan" : "gray"
                  }
                  paddingX={1}
                >
                  <TextInput
                    value={customKey}
                    onChange={setCustomKey}
                    placeholder="sk-..."
                    mask={focusedField !== "customKey" ? "*" : undefined}
                    focus={focusedField === "customKey"}
                  />
                </Box>
              </Box>
            </>
          )}

          {/* Error / Success messages */}
          {errorMsg && (
            <Box marginBottom={1}>
              <Text color="red">✖ {errorMsg}</Text>
            </Box>
          )}
          {successMsg && (
            <Box marginBottom={1}>
              <Text color="greenBright">✔ {successMsg}</Text>
            </Box>
          )}

          {/* Buttons */}
          <Box flexDirection="row" marginTop={1}>
            <Box marginRight={3}>
              <Text
                backgroundColor={
                  focusedField === "buttons" && focusedButton === "connect"
                    ? "green"
                    : undefined
                }
                color={
                  focusedField === "buttons" && focusedButton === "connect"
                    ? "black"
                    : "green"
                }
                bold
              >
                {focusedButton === "connect" && focusedField === "buttons"
                  ? "> [Connect]"
                  : "  [Connect]"}
              </Text>
            </Box>
            <Box>
              <Text
                backgroundColor={
                  focusedField === "buttons" && focusedButton === "cancel"
                    ? "red"
                    : undefined
                }
                color={
                  focusedField === "buttons" && focusedButton === "cancel"
                    ? "black"
                    : "red"
                }
                bold
              >
                {focusedButton === "cancel" && focusedField === "buttons"
                  ? "> [Cancel]"
                  : "  [Cancel]"}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
