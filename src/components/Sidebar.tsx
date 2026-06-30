import React from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store/index.js";

/**
 * Sidebar — Left navigation sidebar.
 * Width: 25 characters.
 * Items: Chat, Agents, Logs, Models, Settings with icons and badges.
 * Focus-aware highlighting with cyan/bright background.
 */

interface SidebarItemDef {
  label: string;
  icon: string;
  view: string;
}

const SIDEBAR_ITEMS: SidebarItemDef[] = [
  { label: "Chat", icon: "\u{1F4AC}", view: "chat" },
  { label: "Agents", icon: "\u{1F916}", view: "agents" },
  { label: "Logs", icon: "\u{1F4CB}", view: "logs" },
  { label: "Models", icon: "\u{1F9E0}", view: "models" },
  { label: "Settings", icon: "\u{2699}", view: "settings" },
];

export function Sidebar(): JSX.Element {
  const sidebarFocused = useStore((s) => s.sidebarFocused);
  const sidebarItem = useStore((s) => s.sidebarItem);
  const setSidebarItem = useStore((s) => s.setSidebarItem);
  const agents = useStore((s) => s.agents);
  const logs = useStore((s) => s.logs);
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const setSettingsTab = useStore((s) => s.setSettingsTab);

  const activeAgentCount = agents.filter(
    (a) => a.status === "working"
  ).length;
  const logCount = logs.length;

  useInput(
    (input, key) => {
      if (!sidebarFocused) return;

      if (key.upArrow) {
        setSidebarItem(Math.max(0, sidebarItem - 1));
        return;
      }

      if (key.downArrow) {
        setSidebarItem(Math.min(SIDEBAR_ITEMS.length - 1, sidebarItem + 1));
        return;
      }

      if (key.return) {
        const selected = SIDEBAR_ITEMS[sidebarItem];
        if (!selected) return;

        switch (selected.view) {
          case "chat":
            setScreen("main");
            break;
          case "settings":
            setSettingsTab(0);
            setScreen("settings");
            break;
          default:
            // "agents", "logs", "models" views — for now stay on main
            // (these can be wired to sub-views inside MainScreen later)
            setScreen("main");
            break;
        }
        return;
      }
    },
    { isActive: sidebarFocused }
  );

  return (
    <Box
      flexDirection="column"
      width={25}
      height="100%"
      borderStyle={sidebarFocused ? "single" : undefined}
      borderColor={sidebarFocused ? "cyanBright" : undefined}
      paddingTop={1}
    >
      {SIDEBAR_ITEMS.map((item, index) => {
        const isSelected = index === sidebarItem;
        const bgColor = isSelected && sidebarFocused ? "cyan" : undefined;
        const fgColor = isSelected
          ? sidebarFocused
            ? "black"
            : "cyanBright"
          : "white";

        // Compute badge text
        let badgeText = "";
        if (item.label === "Agents" && activeAgentCount > 0) {
          badgeText = String(activeAgentCount);
        } else if (item.label === "Logs" && logCount > 0) {
          badgeText = logCount > 99 ? "99+" : String(logCount);
        }

        return (
          <Box key={item.view} height={1} flexDirection="row">
            <Text
              backgroundColor={bgColor}
              color={fgColor}
              bold={isSelected}
              wrap="truncate"
            >
              {" "}
              {item.icon} {item.label.padEnd(10, " ")}
            </Text>
            {badgeText && (
              <Text
                backgroundColor={bgColor}
                color="yellowBright"
                bold
              >
                {badgeText.padStart(3, " ")}
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
