import React, { useEffect, useState } from "react";
import { useInput } from "ink";
import { SplashScreen } from "./components/SplashScreen.js";
import { ConnectPopup } from "./components/ConnectPopup.js";
import { MainScreen } from "./components/MainScreen.js";
import { useStore } from "./store/index.js";
import { loadConfig, isConnected } from "./utils/config.js";

interface AppProps {
  initialScreen?: "splash" | "connect" | "main";
}

export function App({ initialScreen }: AppProps): JSX.Element {
  const [showSplash, setShowSplash] = useState(!initialScreen);

  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const setConfig = useStore((s) => s.setConfig);
  const addLog = useStore((s) => s.addLog);

  useEffect(() => {
    const config = loadConfig();
    setConfig(config);

    if (initialScreen) {
      setScreen(initialScreen);
      return;
    }

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
          message: "API key loaded → entering main screen",
        });
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useInput((input, key) => {
    if (screen === "connect") return;

    if (key.escape || input === "q" || input === "b") {
      if (screen !== "main") {
        setScreen("main");
      }
    }
  });

  if (showSplash) {
    return <SplashScreen />;
  }

  if (screen === "connect") {
    return <ConnectPopup />;
  }

  return <MainScreen />;
}
