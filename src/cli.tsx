#!/usr/bin/env node
import { Command } from "commander";
import { render } from "ink";
import React from "react";
import { App } from "./App.js";
import { loadConfig, showConfig } from "./utils/config.js";

const program = new Command();

program.name("arch-xc").description("Arch XC — Autonomous Engineering AI Engine").version("0.1.0");

const launch = () => {
  loadConfig();
  render(<App />);
};

program
  .command("launch")
  .alias("start")
  .description("Launch the Arch XC TUI")
  .action(launch);

program
  .command("connect")
  .description("Quick connect your NVIDIA NIM API key")
  .action(() => {
    loadConfig();
    render(<App initialScreen="connect" />);
  });

program
  .command("config")
  .description("Show current configuration")
  .action(() => {
    showConfig();
    process.exit(0);
  });

// `arch-xc` with no args launches the TUI
if (process.argv.length <= 2) {
  launch();
} else {
  program.parse();
}
