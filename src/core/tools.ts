import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const WORKSPACE_ROOT = path.resolve(process.cwd());

function resolveSafePath(userPath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, userPath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path traversal blocked: ${userPath}`);
  }
  return resolved;
}

const BLOCKED_COMMANDS = [
  /^rm\b/i, /^rd\b/i, /^del\b/i, /^format\b/i, /^shutdown\b/i,
  /^reg\s+delete\b/i, /^taskkill\b/i, /^powershell.*remove-item/i,
  /^cmd\s*\/c\s*(rm|rd|del|format|shutdown)/i,
];

function isBlockedCommand(command: string): boolean {
  const trimmed = command.trim();
  return BLOCKED_COMMANDS.some((re) => re.test(trimmed));
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "cwd",
      description: "Get the current working directory path",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list",
      description: "List files and directories at a given path",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read",
      description: "Read the entire contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_lines",
      description: "Read a specific range of lines from a file (1-indexed, inclusive)",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
          start: { type: "number", description: "Start line (1-indexed)" },
          end: { type: "number", description: "End line (1-indexed, inclusive)" },
        },
        required: ["path", "start", "end"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write",
      description: "Write content to a file (creates or overwrites)",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to write to" },
          content: { type: "string", description: "Content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append",
      description: "Append content to the end of an existing file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
          content: { type: "string", description: "Content to append" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit",
      description: "Replace all occurrences of a string in a file with new text. Use for surgical code changes.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
          old_string: { type: "string", description: "Text to find (must exist in file)" },
          new_string: { type: "string", description: "Replacement text" },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete",
      description: "Delete a file or empty directory",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to delete" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rmrf",
      description: "Recursively delete a directory and all its contents",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to remove recursively" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mkdir",
      description: "Create a directory (including parent directories if needed)",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to create" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mv",
      description: "Move or rename a file or directory",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Source path" },
          to: { type: "string", description: "Destination path" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep",
      description: "Search for a regex pattern inside a file and return matching lines",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to search in" },
          pattern: { type: "string", description: "Regular expression to search for" },
        },
        required: ["path", "pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "glob",
      description: "Find files matching a glob pattern (e.g. src/**/*.ts)",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob pattern to match" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run",
      description: "Run a shell command and get stdout, stderr, and exit code",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
          cwd: { type: "string", description: "Working directory (optional, defaults to cwd)" },
        },
        required: ["command"],
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
    case "cwd":
      return process.cwd();

    case "list": {
      const dir = resolveSafePath(args.path as string);
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries
        .map((e) => (e.isDirectory() ? `[DIR] ${e.name}/` : `[FILE] ${e.name}`))
        .join("\n");
    }

    case "read": {
      const filePath = resolveSafePath(args.path as string);
      return fs.readFileSync(filePath, "utf-8");
    }

    case "read_lines": {
      const filePath = resolveSafePath(args.path as string);
      const start = (args.start as number) ?? 1;
      const end = (args.end as number) ?? start;
      const lines = fs.readFileSync(filePath, "utf-8").split("\n");
      return lines.slice(Math.max(0, start - 1), end).join("\n");
    }

    case "write": {
      const filePath = resolveSafePath(args.path as string);
      const content = args.content as string;
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");
      return `Written to ${filePath}`;
    }

    case "append": {
      const filePath = resolveSafePath(args.path as string);
      const content = args.content as string;
      fs.appendFileSync(filePath, content, "utf-8");
      return `Appended to ${filePath}`;
    }

    case "edit": {
      const filePath = resolveSafePath(args.path as string);
      const oldString = args.old_string as string;
      const newString = args.new_string as string;
      const content = fs.readFileSync(filePath, "utf-8");
      if (!content.includes(oldString)) {
        return `Error: old_string not found in ${filePath}`;
      }
      const updated = content.replaceAll(oldString, newString);
      fs.writeFileSync(filePath, updated, "utf-8");
      const count = content.split(oldString).length - 1;
      return `Edited ${filePath}: ${count} replacement(s) made`;
    }

    case "delete": {
      const filePath = resolveSafePath(args.path as string);
      fs.unlinkSync(filePath);
      return `Deleted ${filePath}`;
    }

    case "rmrf": {
      const dirPath = resolveSafePath(args.path as string);
      fs.rmSync(dirPath, { recursive: true, force: true });
      return `Removed ${dirPath}`;
    }

    case "mkdir": {
      const dirPath = resolveSafePath(args.path as string);
      fs.mkdirSync(dirPath, { recursive: true });
      return `Created directory ${dirPath}`;
    }

    case "mv": {
      const from = resolveSafePath(args.from as string);
      const to = resolveSafePath(args.to as string);
      if (fs.existsSync(to)) {
        return `Error: destination exists: ${to}`;
      }
      const toDir = path.dirname(to);
      if (!fs.existsSync(toDir)) fs.mkdirSync(toDir, { recursive: true });
      fs.renameSync(from, to);
      return `Moved ${from} → ${to}`;
    }

    case "grep": {
      const filePath = resolveSafePath(args.path as string);
      const pattern = args.pattern as string;
      let re: RegExp;
      try {
        re = new RegExp(pattern);
      } catch {
        return `Error: invalid regex pattern "${pattern}"`;
      }
      const lines = fs.readFileSync(filePath, "utf-8").split("\n");
      const matches = lines
        .map((line, i) => ({ line, num: i + 1, match: line.match(re) }))
        .filter((m) => m.match)
        .map((m) => `  ${m.num}: ${m.line.trim()}`);
      if (matches.length === 0) return "No matches";
      return `Matches in ${filePath}:\n${matches.join("\n")}`;
    }

    case "glob": {
      const pattern = args.pattern as string;
      const normalized = pattern.replace(/\\/g, "/");
      const fg = await import("fast-glob");
      const files = await fg.default.glob(normalized, { dot: true });
      if (files.length === 0) return "No files match that pattern";
      return files.map((f) => (fs.statSync(f).isDirectory() ? `[DIR] ${f}/` : `[FILE] ${f}`)).join("\n");
    }

    case "run": {
      const command = args.command as string;
      if (isBlockedCommand(command)) {
        return `Error: command blocked for safety: ${command.slice(0, 80)}`;
      }
      const cwd = (args.cwd as string) || process.cwd();
      try {
        const stdout = execSync(command, { cwd, timeout: 30000, encoding: "utf-8" });
        return stdout;
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; status?: number; message: string };
        return `exit code ${e.status ?? "?"}\nstdout:\n${e.stdout ?? ""}\nstderr:\n${e.stderr ?? e.message}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
  } catch (err) {
    return `Error executing ${name}: ${err instanceof Error ? err.message : String(err)}`;
  }
}
