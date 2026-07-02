import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { executeTool } from "../tools.js";

const TMP_ROOT = path.resolve(import.meta.dirname, "../../../.test-tmp");

let tmpDir: string;

function tmpPath(...parts: string[]): string {
  return path.join(tmpDir, ...parts);
}

function globPattern(...parts: string[]): string {
  return path.posix.join(...parts.map((p) => p.replace(/\\/g, "/")));
}

before(() => {
  if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true });
  tmpDir = fs.mkdtempSync(path.join(TMP_ROOT, "tools-test-"));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("executeTool", () => {
  describe("cwd", () => {
    it("returns current working directory", async () => {
      const result = await executeTool("cwd", {});
      assert.equal(result, process.cwd());
    });
  });

  describe("list", () => {
    it("lists files and directories", async () => {
      fs.writeFileSync(tmpPath("a.txt"), "hello", "utf-8");
      fs.writeFileSync(tmpPath("b.txt"), "world", "utf-8");
      const result = await executeTool("list", { path: tmpDir });
      assert.ok(result.includes("[FILE] a.txt"));
      assert.ok(result.includes("[FILE] b.txt"));
    });

    it("returns error for missing directory", async () => {
      const result = await executeTool("list", { path: tmpPath("nonexistent") });
      assert.ok(result.startsWith("Error"));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("list", { path: "../../etc" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("read", () => {
    it("reads file contents", async () => {
      fs.writeFileSync(tmpPath("hello.txt"), "Hello World", "utf-8");
      const result = await executeTool("read", { path: tmpPath("hello.txt") });
      assert.equal(result, "Hello World");
    });

    it("returns error for missing file", async () => {
      const result = await executeTool("read", { path: tmpPath("nope.txt") });
      assert.ok(result.startsWith("Error"));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("read", { path: "../../etc/passwd" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("read_lines", () => {
    it("reads a range of lines", async () => {
      fs.writeFileSync(tmpPath("lines.txt"), "a\nb\nc\nd\ne", "utf-8");
      const result = await executeTool("read_lines", { path: tmpPath("lines.txt"), start: 2, end: 4 });
      assert.equal(result, "b\nc\nd");
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("read_lines", { path: "../../etc/hosts", start: 1, end: 5 });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("write", () => {
    it("creates a new file", async () => {
      const result = await executeTool("write", { path: tmpPath("new.txt"), content: "test" });
      assert.ok(result.includes("Written to"));
      assert.equal(fs.readFileSync(tmpPath("new.txt"), "utf-8"), "test");
    });

    it("overwrites existing file", async () => {
      fs.writeFileSync(tmpPath("overwrite.txt"), "old", "utf-8");
      await executeTool("write", { path: tmpPath("overwrite.txt"), content: "new" });
      assert.equal(fs.readFileSync(tmpPath("overwrite.txt"), "utf-8"), "new");
    });

    it("creates nested directories", async () => {
      const result = await executeTool("write", { path: tmpPath("a/b/c/deep.txt"), content: "deep" });
      assert.ok(result.includes("Written to"));
      assert.ok(fs.existsSync(tmpPath("a/b/c/deep.txt")));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("write", { path: "../../escape.txt", content: "bad" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("append", () => {
    it("appends to existing file", async () => {
      fs.writeFileSync(tmpPath("append.txt"), "hello", "utf-8");
      const result = await executeTool("append", { path: tmpPath("append.txt"), content: " world" });
      assert.ok(result.includes("Appended to"));
      assert.equal(fs.readFileSync(tmpPath("append.txt"), "utf-8"), "hello world");
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("append", { path: "../../escape.txt", content: "bad" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("edit", () => {
    it("replaces text in file", async () => {
      fs.writeFileSync(tmpPath("edit.txt"), "foo bar foo", "utf-8");
      const result = await executeTool("edit", { path: tmpPath("edit.txt"), old_string: "foo", new_string: "baz" });
      assert.ok(result.includes("2 replacement(s)"));
      assert.equal(fs.readFileSync(tmpPath("edit.txt"), "utf-8"), "baz bar baz");
    });

    it("returns error when old_string not found", async () => {
      fs.writeFileSync(tmpPath("nomatch.txt"), "hello", "utf-8");
      const result = await executeTool("edit", { path: tmpPath("nomatch.txt"), old_string: "xyz", new_string: "abc" });
      assert.ok(result.includes("Error"));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("edit", { path: "../../escape.txt", old_string: "a", new_string: "b" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("delete", () => {
    it("deletes a file", async () => {
      fs.writeFileSync(tmpPath("todelete.txt"), "bye", "utf-8");
      const result = await executeTool("delete", { path: tmpPath("todelete.txt") });
      assert.ok(result.includes("Deleted"));
      assert.ok(!fs.existsSync(tmpPath("todelete.txt")));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("delete", { path: "../../etc/motd" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("rmrf", () => {
    it("removes directory recursively", async () => {
      fs.mkdirSync(tmpPath("deep"), { recursive: true });
      fs.writeFileSync(tmpPath("deep/a.txt"), "x", "utf-8");
      fs.writeFileSync(tmpPath("deep/b.txt"), "y", "utf-8");
      const result = await executeTool("rmrf", { path: tmpPath("deep") });
      assert.ok(result.includes("Removed"));
      assert.ok(!fs.existsSync(tmpPath("deep")));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("rmrf", { path: "../../etc" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("mkdir", () => {
    it("creates a directory", async () => {
      const result = await executeTool("mkdir", { path: tmpPath("newdir") });
      assert.ok(result.includes("Created directory"));
      assert.ok(fs.existsSync(tmpPath("newdir")));
    });

    it("creates nested directories", async () => {
      await executeTool("mkdir", { path: tmpPath("a/b/c/d") });
      assert.ok(fs.existsSync(tmpPath("a/b/c/d")));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("mkdir", { path: "../../escape" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("mv", () => {
    it("renames a file", async () => {
      fs.writeFileSync(tmpPath("source.txt"), "data", "utf-8");
      const result = await executeTool("mv", { from: tmpPath("source.txt"), to: tmpPath("dest.txt") });
      assert.ok(result.includes("Moved"));
      assert.ok(!fs.existsSync(tmpPath("source.txt")));
      assert.ok(fs.existsSync(tmpPath("dest.txt")));
    });

    it("returns error if destination exists", async () => {
      fs.writeFileSync(tmpPath("src.txt"), "a", "utf-8");
      fs.writeFileSync(tmpPath("dst.txt"), "b", "utf-8");
      const result = await executeTool("mv", { from: tmpPath("src.txt"), to: tmpPath("dst.txt") });
      assert.ok(result.includes("Error: destination exists"));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("mv", { from: "../../bad", to: tmpPath("ok") });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("grep", () => {
    it("finds matching lines", async () => {
      fs.writeFileSync(tmpPath("grep.txt"), "apple\nbanana\napple pie\ncherry", "utf-8");
      const result = await executeTool("grep", { path: tmpPath("grep.txt"), pattern: "apple" });
      assert.ok(result.includes("apple"));
      assert.ok(result.includes("apple pie"));
    });

    it("returns 'No matches' when pattern not found", async () => {
      fs.writeFileSync(tmpPath("grep.txt"), "hello", "utf-8");
      const result = await executeTool("grep", { path: tmpPath("grep.txt"), pattern: "xyz" });
      assert.equal(result, "No matches");
    });

    it("handles invalid regex gracefully", async () => {
      fs.writeFileSync(tmpPath("grep.txt"), "test", "utf-8");
      const result = await executeTool("grep", { path: tmpPath("grep.txt"), pattern: "[invalid" });
      assert.ok(result.startsWith("Error: invalid regex pattern"));
    });

    it("blocks path traversal", async () => {
      const result = await executeTool("grep", { path: "../../etc/hosts", pattern: "test" });
      assert.ok(result.startsWith("Error"));
    });
  });

  describe("glob", () => {
    it("finds matching files", async () => {
      fs.writeFileSync(tmpPath("foo.ts"), "a", "utf-8");
      fs.writeFileSync(tmpPath("foo.js"), "b", "utf-8");
      fs.writeFileSync(tmpPath("bar.ts"), "c", "utf-8");
      const result = await executeTool("glob", { pattern: `${globPattern(tmpDir)}/**/*.ts` });
      assert.ok(result.includes("[FILE]"));
      assert.ok(result.includes("foo.ts"));
      assert.ok(result.includes("bar.ts"));
    });

    it("returns 'No files match' when nothing found", async () => {
      const result = await executeTool("glob", { pattern: `${globPattern(tmpDir)}/**/*.xyz` });
      assert.equal(result, "No files match that pattern");
    });
  });

  describe("run", () => {
    it("executes a simple command", async () => {
      const result = await executeTool("run", { command: "echo hello" });
      assert.ok(result.includes("hello"));
    });

    it("returns exit code on failure", async () => {
      const result = await executeTool("run", { command: "cmd /c exit 42" });
      assert.ok(result.includes("exit code 42"));
    });

    it("blocks dangerous commands", async () => {
      const result = await executeTool("run", { command: "rm -rf /" });
      assert.ok(result.startsWith("Error: command blocked"));
    });

    it("blocks format command", async () => {
      const result = await executeTool("run", { command: "format C: /fs:NTFS" });
      assert.ok(result.startsWith("Error: command blocked"));
    });

    it("blocks shutdown command", async () => {
      const result = await executeTool("run", { command: "shutdown /s /t 0" });
      assert.ok(result.startsWith("Error: command blocked"));
    });
  });

  describe("unknown tool", () => {
    it("returns error string", async () => {
      const result = await executeTool("nonexistent", {});
      assert.ok(result.includes("Unknown tool"));
    });
  });
});
