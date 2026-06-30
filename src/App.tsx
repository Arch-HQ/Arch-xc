import React, { useEffect, useState } from "react";
import { Box, useInput, useStdout } from "ink";
import { SplashScreen } from "./components/SplashScreen.js";
import { ConnectPopup } from "./components/ConnectPopup.js";
import { MainScreen } from "./components/MainScreen.js";
import { useStore } from "./store/index.js";
import { loadConfig, isConnected } from "./utils/config.js";

interface AppProps {
  initialScreen?: "splash" | "connect" | "main";
}

export function App({ initialScreen }: AppProps): JSX.Element {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const setConfig = useStore((s) => s.setConfig);
  const setInputValue = useStore((s) => s.setInputValue);
  const isExecuting = useStore((s) => s.isExecuting);
  const addLog = useStore((s) => s.addLog);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const config = loadConfig();
    setConfig(config);

    if (initialScreen) {
      setScreen(initialScreen);
      setShowSplash(false);
      return;
    }

    // Show splash for 2.5s then decide
    const timer = setTimeout(() => {
      setShowSplash(false);
      if (!isConnected()) {
        setScreen("connect");
        addLog({
          level: "info",
          source: "App",
          message: "No API key found → showing connect screen",
        });
      } else {
        setScreen("main");
        addLog({
          level: "info",
          source: "App",
          message: `API key loaded → entering main screen`,
        });
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Global keyboard shortcuts
  useInput((input, key) => {
    if (key.escape) {
      if (screen === "connect") {
        setScreen("main");
      }
    }

    // Ctrl+C handled by ink automatically
  });

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {screen === "connect" && <ConnectPopup />}
      {screen === "main" && <MainScreen />}
    </Box>
  );
}
