#!/usr/bin/env node
import { Command } from "commander";
import { render } from "ink";
import React from "react";
import { App } from "./App.js";
import { loadConfig, showConfig } from "./utils/config.js";

const program = new Command();

program.name("arch-xc").description("Arch XC — Autonomous Engineering AI Engine").version("0.1.0");

program
  .command("start")
  .description("Launch the Arch XC TUI")
  .action(() => {
    loadConfig();
    render(<App />);
  });

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

program.parse();
