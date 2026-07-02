export interface ModelEntry {
  id: string;
  name: string;
  org: string;
  categories: string[];
  description: string;
  contextWindow: number;
  strengths: string[];
  rank: number;
  tier: "head" | "board" | "manager";
}

// Model IDs use the vendor-prefixed format expected by the NVIDIA NIM API.
// If you see 404 errors, list the exact IDs your API key can access with:
//   curl -s https://integrate.api.nvidia.com/v1/models \
//     -H "Authorization: Bearer $NVIDIA_API_KEY" | grep '"id"' | head -20
// Then copy the working IDs into this file and rebuild.
export const MODEL_POOL: ModelEntry[] = [
  // === HEAD TIER: Best reasoning ===
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    name: "Nemotron 3 Ultra 550B",
    org: "NVIDIA",
    categories: ["reasoning"],
    description: "550B hybrid Mamba-Transformer MoE with 1M context window",
    contextWindow: 1_000_000,
    strengths: ["reasoning", "planning", "strategy", "long-context"],
    rank: 1,
    tier: "head",
  },
  {
    id: "mistralai/mistral-large-3-675b-instruct-2512",
    name: "Mistral Large 3 675B",
    org: "Mistral AI",
    categories: ["reasoning"],
    description: "Flagship 675B parameter MoE for multi-turn general logic",
    contextWindow: 256_000,
    strengths: ["reasoning", "analysis", "logic", "planning"],
    rank: 2,
    tier: "head",
  },
  {
    id: "deepseek-ai/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    org: "DeepSeek",
    categories: ["coding"],
    description: "Scale-optimized MoE with 1M context for dense repository coding",
    contextWindow: 1_000_000,
    strengths: ["coding", "architecture", "system-design", "long-context"],
    rank: 3,
    tier: "head",
  },
  {
    id: "qwen/qwen3.5-397b-a17b",
    name: "Qwen 3.5 397B",
    org: "Alibaba",
    categories: ["vision", "coding"],
    description: "400B class sparse MoE VLM with advanced visual reasoning",
    contextWindow: 256_000,
    strengths: ["vision", "coding", "agent", "multimodal"],
    rank: 4,
    tier: "head",
  },
  {
    id: "google/gemma-4-31b-it",
    name: "Gemma 4 31B",
    org: "Google",
    categories: ["coding"],
    description: "Google's 31B dense frontier reasoning engine for code",
    contextWindow: 128_000,
    strengths: ["coding", "reasoning", "agent"],
    rank: 5,
    tier: "head",
  },

  // === BOARD TIER: Domain specialists ===
  {
    id: "deepseek-ai/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    org: "DeepSeek",
    categories: ["coding"],
    description: "284B sparse MoE for ultra-fast coding and agent loops",
    contextWindow: 256_000,
    strengths: ["coding", "fast", "agent"],
    rank: 1,
    tier: "board",
  },
  {
    id: "meta/llama-3.3-nemotron-super-49b-v1.5",
    name: "Llama Nemotron Super 49B",
    org: "Meta",
    categories: ["coding"],
    description: "49B engine with high tool-calling precision",
    contextWindow: 256_000,
    strengths: ["coding", "tool-use", "precision"],
    rank: 2,
    tier: "board",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 3 Super 120B",
    org: "NVIDIA",
    categories: ["reasoning"],
    description: "Efficient hybrid Mamba-Transformer with 1M context",
    contextWindow: 1_000_000,
    strengths: ["reasoning", "analysis", "long-context"],
    rank: 3,
    tier: "board",
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    name: "Qwen 3.5 122B",
    org: "Alibaba",
    categories: ["coding"],
    description: "122B sparse MoE for complex tool-calling workflows",
    contextWindow: 128_000,
    strengths: ["coding", "tool-use", "workflows"],
    rank: 4,
    tier: "board",
  },
  {
    id: "mistralai/mistral-medium-3.5-128b",
    name: "Mistral Medium 3.5 128B",
    org: "Mistral AI",
    categories: ["coding"],
    description: "Dense 128B text generation, coding, and agentic executor",
    contextWindow: 256_000,
    strengths: ["coding", "execution", "agent"],
    rank: 5,
    tier: "board",
  },
  {
    id: "meta/llama-4-maverick-17b-128e-instruct",
    name: "Llama 4 Maverick 128E",
    org: "Meta",
    categories: ["reasoning"],
    description: "128-expert sparse MoE text-language engine",
    contextWindow: 256_000,
    strengths: ["reasoning", "multilingual", "agent"],
    rank: 6,
    tier: "board",
  },
  {
    // NOTE: API returns "minimaxai/minimax-m2.7" — verified live 2026-07-02
    id: "minimaxai/minimax-m2.7",
    name: "MiniMax M2.7",
    org: "MiniMax",
    categories: ["coding"],
    description: "230B text foundation for office logic and coding",
    contextWindow: 256_000,
    strengths: ["coding", "logic", "productivity"],
    rank: 7,
    tier: "board",
  },
  {
    // NOTE: API returns "stepfun-ai/step-3.5-flash" — verified live 2026-07-02
    id: "stepfun-ai/step-3.5-flash",
    name: "Step 3.5 Flash",
    org: "Stepfun",
    categories: ["coding"],
    description: "200B sparse MoE for autonomous agent operations",
    contextWindow: 128_000,
    strengths: ["coding", "agent", "autonomous"],
    rank: 8,
    tier: "board",
  },

  // === MANAGER TIER: Execution specialists ===
  {
    id: "google/gemma-3n-e4b-it",
    name: "Gemma 3N E4B",
    org: "Google",
    categories: ["vision"],
    description: "Multimodal edge computing: text, audio, visual",
    contextWindow: 128_000,
    strengths: ["vision", "multimodal", "edge"],
    rank: 9,
    tier: "manager",
  },
  {
    id: "mistralai/mistral-small-4-119b-2603",
    name: "Mistral Small 4 119B",
    org: "Mistral AI",
    categories: ["vision", "coding"],
    description: "Hybrid MoE unifying logic and coding over 256k context",
    contextWindow: 256_000,
    strengths: ["coding", "logic", "vision"],
    rank: 10,
    tier: "manager",
  },
  {
    id: "moonshotai/kimi-k2.6",
    name: "Kimi K2.6",
    org: "Moonshot AI",
    categories: ["vision"],
    description: "1T multimodal MoE for long-horizon coding",
    contextWindow: 2_000_000,
    strengths: ["coding", "long-context", "agent", "multimodal"],
    rank: 11,
    tier: "manager",
  },
  {
    // NOTE: API returns "bytedance/seed-oss-36b-instruct" — verified live 2026-07-02
    id: "bytedance/seed-oss-36b-instruct",
    name: "Seed OSS 36B",
    org: "ByteDance",
    categories: ["reasoning"],
    description: "36B reasoner with computational thinking budgets",
    contextWindow: 128_000,
    strengths: ["reasoning", "math", "budget-control"],
    rank: 12,
    tier: "manager",
  },
  // DEAD: thudm/glm-5.1 — not found in NIM API as of 2026-07-02
  // {
  //   id: "thudm/glm-5.1",
  //   name: "GLM 5.1",
  //   org: "Zhipu AI",
  //   categories: ["coding"],
  //   description: "Flagship LLM for agentic workflows and planning",
  //   contextWindow: 128_000,
  //   strengths: ["coding", "agent", "planning"],
  //   rank: 13,
  //   tier: "manager",
  // },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    org: "Open Source",
    categories: ["reasoning"],
    description: "120B MoE for mathematical reasoning",
    contextWindow: 128_000,
    strengths: ["reasoning", "math", "coding"],
    rank: 14,
    tier: "manager",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    org: "Meta",
    categories: ["reasoning"],
    description: "General-purpose instruction following",
    contextWindow: 128_000,
    strengths: ["general", "instruction", "chat"],
    rank: 15,
    tier: "manager",
  },
  {
    // NOTE: API returns "sarvamai/sarvam-m" — verified live 2026-07-02
    id: "sarvamai/sarvam-m",
    name: "Sarvam M",
    org: "Sarvam AI",
    categories: ["coding"],
    description: "Indian language specialist for math and code",
    contextWindow: 128_000,
    strengths: ["coding", "math", "multilingual"],
    rank: 16,
    tier: "manager",
  },
  {
    id: "microsoft/phi-4-multimodal-instruct",
    name: "Phi 4 Multimodal",
    org: "Microsoft",
    categories: ["reasoning"],
    description: "Multi-sensory reasoning: text, audio, images",
    contextWindow: 128_000,
    strengths: ["multimodal", "reasoning", "audio"],
    rank: 17,
    tier: "manager",
  },
  {
    // NOTE: API returns "stepfun-ai/step-3.7-flash" — verified live 2026-07-02
    id: "stepfun-ai/step-3.7-flash",
    name: "Step 3.7 Flash",
    org: "Stepfun",
    categories: ["vision"],
    description: "Sparse MoE multimodal for agentic and coding tasks",
    contextWindow: 256_000,
    strengths: ["coding", "agent", "vision", "multimodal"],
    rank: 18,
    tier: "manager",
  },
  {
    // NOTE: API returns "nvidia/nvidia-nemotron-nano-9b-v2" — verified live 2026-07-02
    id: "nvidia/nvidia-nemotron-nano-9b-v2",
    name: "Nemotron Nano 9B v2",
    org: "NVIDIA",
    categories: ["reasoning"],
    description: "Hybrid Transformer-Mamba 9B for local reasoning",
    contextWindow: 128_000,
    strengths: ["reasoning", "fast", "local"],
    rank: 19,
    tier: "manager",
  },
  {
    id: "meta/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    org: "Meta",
    categories: ["reasoning"],
    description: "Reliable general-purpose model",
    contextWindow: 128_000,
    strengths: ["general", "reliable", "balanced"],
    rank: 20,
    tier: "manager",
  },
];

export function getHeadModels(): ModelEntry[] {
  return MODEL_POOL.filter((m) => m.tier === "head").sort((a, b) => a.rank - b.rank);
}

export function getBoardModels(): ModelEntry[] {
  return MODEL_POOL.filter((m) => m.tier === "board").sort((a, b) => a.rank - b.rank);
}

export function getManagerModels(): ModelEntry[] {
  return MODEL_POOL.filter((m) => m.tier === "manager").sort((a, b) => a.rank - b.rank);
}

export function pickModelForTask(task: string, tier: "head" | "board" | "manager"): ModelEntry {
  const pool = MODEL_POOL.filter((m) => m.tier === tier);

  // Simple keyword matching
  const taskLower = task.toLowerCase();
  const scores = pool.map((m) => {
    let score = 100 - m.rank * 2;
    for (const strength of m.strengths) {
      if (taskLower.includes(strength)) score += 15;
    }
    for (const cat of m.categories) {
      if (taskLower.includes(cat)) score += 10;
    }
    // Boost for coding tasks
    if (taskLower.includes("code") || taskLower.includes("program")) {
      if (m.strengths.includes("coding")) score += 20;
    }
    if (taskLower.includes("reason") || taskLower.includes("think")) {
      if (m.strengths.includes("reasoning")) score += 20;
    }
    return { model: m, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.model ?? pool[0];
}

export function getModelById(id: string): ModelEntry | undefined {
  return MODEL_POOL.find((m) => m.id === id);
}
