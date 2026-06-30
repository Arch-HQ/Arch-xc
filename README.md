# Arch XC — The Swarm Engine

> Autonomous Engineering AI Engine powered by a dynamic, tiered hierarchy of 50+ specialized AI agents.

## Install

```bash
npm install -g arch-xc
```

Or from source:
```bash
git clone <repo>
cd arch-xc-tui
npm install
npm run build
npm link
```

## First Run

```bash
arch-xc start
```

On first launch, you'll be prompted to connect your **NVIDIA NIM API key**.

### Get Your API Key

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Sign in and generate an API key
3. In the TUI, type `/connect` and paste your key

Your key is stored locally in `~/.arch-xc/config.json` — never uploaded anywhere.

## Commands

| Command | Description |
|---------|-------------|
| `arch-xc start` | Launch the TUI |
| `arch-xc connect` | Quick-connect API key |
| `arch-xc config` | Show current config |

### In-App Commands

| Command | Description |
|---------|-------------|
| `/connect` | Connect/reconnect API key |
| `/altr1` | Head + Board only (fast, 4-8s) |
| `/altr2` | + Managers (balanced, 12-20s) |
| `/altr3` | Full recursive swarm (deep) |
| `/clear` | Clear chat |
| `/models` | Show model pool |
| `/help` | Show all commands |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Toggle sidebar focus |
| `↑/↓` | Navigate sidebar / history |
| `Enter` | Submit / Select |
| `Esc` | Cancel / Back |
| `Ctrl+C` | Quit |

## Architecture

Arch XC orchestrates a four-tier swarm:

```
LAYER 1 — HEAD (2 models)
  └─ Strategic planning & ALTR mode selection

LAYER 2 — BOARD (5 specialists)
  └─ Domain experts: Engineering, Analysis, Creative, Strategy, Validation

LAYER 3 — MANAGERS (45+ models)
  └─ Task execution & delegation

LAYER 4 — SUB-AGENTS (dynamic)
  └─ Recursive refinement, validation, optimization
```

Every agent communicates via a full-mesh in-memory bus — no agent works in isolation.

## ALTR Modes

| Mode | Agents | Use Case | Time |
|------|--------|----------|------|
| ALTR-1 | Head + Board | Quick tasks, simple code | 4-8s |
| ALTR-2 | + Managers | Multi-file features | 12-20s |
| ALTR-3 | + Sub-agents (recursive) | Complex systems | Scales with complexity |

## Model Pool

Routes across 50+ models from NVIDIA NIM including:
- **Nemotron 3 Ultra 550B** — 1M context reasoning
- **Mistral Large 3 675B** — Multi-turn logic
- **DeepSeek V4 Pro** — Dense repository coding
- **Qwen 3.5 397B** — Visual reasoning
- **Kimi K2.6** — 2M context coding
- **Gemma 4 31B** — Frontier code reasoning

All models available via a single NVIDIA NIM API key.

## License

MIT
