#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const converterRoot = path.dirname(fileURLToPath(import.meta.url));
const standardCargo = path.join(homedir(), ".cargo", "bin", "cargo");

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

const cargo = process.env.CARGO || (await exists(standardCargo) ? standardCargo : "cargo");
const child = spawn(cargo, [
  "test",
  "--manifest-path",
  path.join(converterRoot, "source", "Cargo.toml"),
  "-p",
  "tvg",
  "--example",
  "export_spec",
], { stdio: "inherit" });

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("close", (code) => {
  process.exitCode = code ?? 1;
});
