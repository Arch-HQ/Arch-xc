import axios, { type AxiosResponse } from "axios";
import { getApiKey, loadConfig } from "../utils/config.js";
import { useStore } from "../store/index.js";

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function getBaseUrl(): string {
  const config = loadConfig();
  return config.baseUrl || "https://integrate.api.nvidia.com/v1";
}

function getHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  opts: Partial<ChatCompletionRequest> & { signal?: AbortSignal } = {}
): Promise<ChatCompletionResponse> {
  const startTime = Date.now();
  const addLog = useStore.getState().addLog;

  addLog({
    level: "debug",
    source: "NIM",
    message: `→ ${model} | ${(messages[messages.length - 1].content ?? "").slice(0, 80)}...`,
  });

  try {
    const resp: AxiosResponse<ChatCompletionResponse> = await axios.post(
      `${getBaseUrl()}/chat/completions`,
      {
        model,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.max_tokens ?? 4096,
        top_p: opts.top_p ?? 0.9,
        stream: false,
        tools: opts.tools,
        tool_choice: opts.tool_choice,
      } as ChatCompletionRequest,
      { headers: getHeaders(), timeout: 120000, signal: opts.signal }
    );

    const elapsed = Date.now() - startTime;
    addLog({
      level: "info",
      source: "NIM",
      message: `← ${model} | ${elapsed}ms | ${resp.data.usage?.total_tokens ?? "?"} tokens`,
    });

    return resp.data;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: unknown }; message: string; code?: string };
    if (axiosErr.code === "ERR_CANCELED" || axiosErr.message.includes("aborted")) {
      addLog({ level: "warn", source: "NIM", message: `✗ ${model} | request aborted (timeout)` });
      throw new Error(`Request timed out: ${model}`);
    }
    const status = axiosErr.response?.status;
    const detail = JSON.stringify(axiosErr.response?.data ?? axiosErr.message);
    addLog({
      level: "error",
      source: "NIM",
      message: `✗ ${model} | HTTP ${status} | ${detail.slice(0, 200)}`,
    });
    throw new Error(`NIM error (${status}): ${detail}`);
  }
}

export async function* streamCompletion(
  model: string,
  messages: ChatMessage[],
  opts: Partial<ChatCompletionRequest> = {}
): AsyncGenerator<string, ChatCompletionResponse | null, unknown> {
  const addLog = useStore.getState().addLog;
  addLog({
    level: "debug",
    source: "NIM",
    message: `→ stream ${model} | ${(messages[messages.length - 1].content ?? "").slice(0, 60)}...`,
  });

  try {
    const resp = await axios.post(
      `${getBaseUrl()}/chat/completions`,
      {
        model,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.max_tokens ?? 4096,
        top_p: opts.top_p ?? 0.9,
        stream: true,
        ...opts,
      },
      {
        headers: getHeaders(),
        timeout: 120000,
        responseType: "stream",
      }
    );

    let buffer = "";
    const stream = resp.data as import("stream").Readable;

    for await (const chunk of stream) {
      const text = chunk.toString() as string;
      const lines = text.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
            if (json.choices?.[0]?.finish_reason) {
              return json;
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }
    }
    return null;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number }; message: string };
    addLog({
      level: "error",
      source: "NIM",
      message: `✗ stream ${model} | ${axiosErr.response?.status ?? "?"} | ${axiosErr.message}`,
    });
    throw err;
  }
}

export async function listAvailableModels(): Promise<string[]> {
  try {
    const resp = await axios.get(`${getBaseUrl()}/models`, {
      headers: getHeaders(),
      timeout: 30000,
    });
    const models = (resp.data as { data?: Array<{ id?: string }> }).data ?? [];
    return models.map((m) => m.id ?? "").filter(Boolean);
  } catch {
    // Fallback: return curated roster
    return [];
  }
}
