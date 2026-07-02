import React, { useState, useEffect } from "react";
import { Box, useStdout, useInput } from "ink";
import { Header } from "./Header.js";
import { Sidebar } from "./Sidebar.js";
import { ChatArea } from "./ChatArea.js";
import { InputBar } from "./InputBar.js";
import { StatusBar } from "./StatusBar.js";
import { LogView } from "./LogView.js";
import { AgentView } from "./AgentView.js";
import { ModelView } from "./ModelView.js";
import { SettingsView } from "./SettingsView.js";
import { useStore } from "../store/index.js";

type View = "chat" | "agents" | "logs" | "models" | "settings";

export function MainScreen(): JSX.Element {
  const { stdout } = useStdout();
  const sidebarFocused = useStore((s) => s.sidebarFocused);
  const setSidebarFocused = useStore((s) => s.setSidebarFocused);
  const sidebarItem = useStore((s) => s.sidebarItem);
  const setSidebarItem = useStore((s) => s.setSidebarItem);
  const setScreen = useStore((s) => s.setScreen);
  const messages = useStore((s) => s.messages);

  const [activeView, setActiveView] = useState<View>("chat");

  const width = stdout.columns || 80;
  const height = stdout.rows || 24;

  const sidebarWidth = 25;
  const mainWidth = width - sidebarWidth;
  const headerHeight = 1;
  const inputHeight = 2;
  const statusHeight = 1;
  const contentHeight = height - headerHeight - inputHeight - statusHeight;

  useInput(
    (input, key) => {
      if (key.tab && !key.shift) {
        setSidebarFocused(!sidebarFocused);
        return;
      }
      if (key.return && sidebarFocused) {
        const views: View[] = ["chat", "agents", "logs", "models", "settings"];
        const selected = views[sidebarItem];
        if (selected) {
          setActiveView(selected);
        }
        return;
      }
    },
    { isActive: true }
  );

  useEffect(() => {
    const views: View[] = ["chat", "agents", "logs", "models", "settings"];
    const selected = views[sidebarItem];
    if (selected) {
      setActiveView(selected);
    }
  }, [sidebarItem]);

  const renderContent = () => {
    switch (activeView) {
      case "agents":
        return <AgentView width={mainWidth} height={contentHeight} />;
      case "logs":
        return <LogView width={mainWidth} height={contentHeight} />;
      case "models":
        return <ModelView width={mainWidth} height={contentHeight} />;
      case "settings":
        return <SettingsView width={mainWidth} height={contentHeight} />;
      default:
        return <ChatArea width={mainWidth} height={contentHeight} />;
    }
  };

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box height={headerHeight} flexDirection="row">
        <Box width={sidebarWidth} />
        <Box width={mainWidth}>
          <Header />
        </Box>
      </Box>

      <Box flexDirection="row" height={contentHeight}>
        <Box width={sidebarWidth} height={contentHeight}>
          <Sidebar />
        </Box>
        <Box width={mainWidth} height={contentHeight}>
          {renderContent()}
        </Box>
      </Box>

      <Box height={inputHeight} flexDirection="row">
        <Box width={sidebarWidth} />
        <Box width={mainWidth}>
          <InputBar width={mainWidth} />
        </Box>
      </Box>

      <Box height={statusHeight} flexDirection="row">
        <Box width={sidebarWidth} />
        <Box width={mainWidth}>
          <StatusBar />
        </Box>
      </Box>
    </Box>
  );
}
