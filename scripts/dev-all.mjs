#!/usr/bin/env node

import { spawn } from "node:child_process";

const commands = [
  {
    name: "next",
    color: "\x1b[36m",
    args: ["run", "dev", "-w", "@wiggly/v3"],
  },
  {
    name: "convex",
    color: "\x1b[35m",
    args: ["run", "convex:dev", "-w", "@wiggly/v3"],
  },
  {
    name: "render",
    color: "\x1b[32m",
    args: ["run", "render-worker:watch", "-w", "@wiggly/v3"],
  },
];

const reset = "\x1b[0m";
const children = new Set();
let shuttingDown = false;

function prefixLines(name, color, chunk) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
  }
}

function shutdown(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const command of commands) {
  const child = spawn("npm", command.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.add(child);
  child.stdout.on("data", (chunk) => prefixLines(command.name, command.color, chunk));
  child.stderr.on("data", (chunk) => prefixLines(command.name, command.color, chunk));
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    process.stderr.write(`[dev] ${command.name} exited with ${reason}; stopping all dev services.\n`);
    shutdown();
    process.exitCode = code && code > 0 ? code : 1;
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
