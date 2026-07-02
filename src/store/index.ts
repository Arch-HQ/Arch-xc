import { create } from "zustand";
import type { Config } from "../utils/config.js";

export interface Message {
  id: string;
  role: "user" | "head" | "board" | "manager" | "subagent" | "system";
  agentName?: string;
  content: string;
  timestamp: number;
  layer?: number;
  altrMode?: number;
  model?: string;
  status?: "streaming" | "done" | "error";
  thinking?: string;
  thinkingVisible?: boolean;
}

export interface AgentState {
  id: string;
  name: string;
  role: "head" | "board" | "manager" | "subagent";
  layer: number;
  model: string;
  status: "idle" | "working" | "done" | "error";
  currentTask?: string;
  parentId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
}

interface AppState {
  // Navigation
  screen: "splash" | "connect" | "main" | "agents" | "logs" | "models" | "settings";
  setScreen: (s: AppState["screen"]) => void;

  // Config
  config: Config | null;
  setConfig: (c: Config) => void;

  // Messages
  messages: Message[];
  addMessage: (m: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (id: string, partial: Partial<Message>) => void;
  clearMessages: () => void;
  resetSession: () => void;

  // Agents
  agents: AgentState[];
  addAgent: (a: Omit<AgentState, "id">) => string;
  updateAgent: (id: string, partial: Partial<AgentState>) => void;
  removeAgent: (id: string) => void;
  clearAgents: () => void;
  cleanupAgents: () => void;

  // Logs
  logs: LogEntry[];
  addLog: (l: Omit<LogEntry, "id" | "timestamp">) => void;

  // ALTR
  currentAltrMode: 1 | 2 | 3;
  setAltrMode: (m: 1 | 2 | 3) => void;
  isExecuting: boolean;
  setExecuting: (v: boolean) => void;

  // Input
  inputValue: string;
  setInputValue: (v: string) => void;

  // Sidebar
  sidebarFocused: boolean;
  setSidebarFocused: (v: boolean) => void;
  sidebarItem: number;
  setSidebarItem: (v: number) => void;

  // Settings
  settingsTab: number;
  setSettingsTab: (v: number) => void;
}

let msgIdCounter = 0;
let agentIdCounter = 0;
let logIdCounter = 0;

const MAX_MESSAGES = 100;

export const useStore = create<AppState>((set, get) => ({
  screen: "splash",
  setScreen: (s) => set({ screen: s }),

  config: null,
  setConfig: (c) => set({ config: c }),

  messages: [],
  addMessage: (m) => {
    const id = `msg-${++msgIdCounter}`;
    set((state) => {
      let messages = [...state.messages, { ...m, id, timestamp: Date.now() }];
      if (messages.length > MAX_MESSAGES) {
        const firstStreaming = messages.findIndex((msg) => msg.status === "streaming");
        const trimEnd = messages.length - MAX_MESSAGES;
        if (firstStreaming >= 0 && firstStreaming < trimEnd) {
          messages = messages.slice(firstStreaming + 1);
        } else {
          messages = messages.slice(trimEnd);
        }
      }
      return { messages };
    });
    return id;
  },
  updateMessage: (id, partial) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...partial } : m
      ),
    })),
  clearMessages: () => set({ messages: [] }),
  resetSession: () => set({ messages: [], agents: [], isExecuting: false }),

  agents: [],
  addAgent: (a) => {
    const id = `agent-${++agentIdCounter}`;
    set((state) => ({
      agents: [...state.agents, { ...a, id }],
    }));
    return id;
  },
  updateAgent: (id, partial) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, ...partial } : a
      ),
    })),
  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
    })),
  clearAgents: () => set({ agents: [] }),
  cleanupAgents: () =>
    set((state) => ({
      agents: state.agents.filter((a) => a.status !== "done" || a.layer <= 1),
    })),

  logs: [],
  addLog: (l) => {
    const id = `log-${++logIdCounter}`;
    set((state) => ({
      logs: [...state.logs.slice(-200), { ...l, id, timestamp: Date.now() }],
    }));
    return id;
  },

  currentAltrMode: 1,
  setAltrMode: (m) => set({ currentAltrMode: m }),
  isExecuting: false,
  setExecuting: (v) => set({ isExecuting: v }),

  inputValue: "",
  setInputValue: (v) => set({ inputValue: v }),

  sidebarFocused: false,
  setSidebarFocused: (v) => set({ sidebarFocused: v }),
  sidebarItem: 0,
  setSidebarItem: (v) => set({ sidebarItem: v }),

  settingsTab: 0,
  setSettingsTab: (v) => set({ settingsTab: v }),
}));
