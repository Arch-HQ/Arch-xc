import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".arch-xc");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface Config {
  apiKey: string;
  provider: "nvidia" | "custom";
  baseUrl: string;
  altrMode: 1 | 2 | 3;
  modelFilter: string[];
  theme: "dark" | "light";
  firstRun: boolean;
}

const defaultConfig: Config = {
  apiKey: "",
  provider: "nvidia",
  baseUrl: "https://integrate.api.nvidia.com/v1",
  altrMode: 1,
  modelFilter: [],
  theme: "dark",
  firstRun: true,
};

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): Config {
  ensureConfigDir();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed };
    } catch {
      return { ...defaultConfig };
    }
  }
  return { ...defaultConfig };
}

export function saveConfig(config: Partial<Config>): void {
  ensureConfigDir();
  const current = loadConfig();
  const updated = { ...current, ...config, firstRun: false };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
}

export function getApiKey(): string {
  const envKey = process.env.ARCH_XC_API_KEY || process.env.NVIDIA_API_KEY;
  if (envKey) return envKey;
  return loadConfig().apiKey;
}

export function isConnected(): boolean {
  return getApiKey().length > 0;
}

export function showConfig(): void {
  const config = loadConfig();
  const safeConfig = {
    ...config,
    apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : "not set",
  };
  console.log(JSON.stringify(safeConfig, null, 2));
}
