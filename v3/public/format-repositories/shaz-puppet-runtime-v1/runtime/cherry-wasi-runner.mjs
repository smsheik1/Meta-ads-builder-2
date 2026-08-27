#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { WASI } from "node:wasi";

function fail(message) {
  throw new Error(`Cherry WASI runner: ${message}`);
}

async function run() {
  const [mode, modulePath, workDirectory, inputName] = process.argv.slice(2);
  if (!path.isAbsolute(modulePath ?? "")) fail("module path must be absolute");

  const args = ["cherrylipsync"];
  const preopens = {};
  if (mode === "version") {
    args.push("--version");
  } else if (mode === "generate") {
    if (!path.isAbsolute(workDirectory ?? "")) fail("work directory must be absolute");
    if (path.basename(inputName ?? "") !== inputName || !/^input\.[a-z0-9]{1,8}$/.test(inputName)) {
      fail("input filename is invalid");
    }
    const input = path.join(workDirectory, inputName);
    const output = path.join(workDirectory, "output.tsv");
    await fs.access(input);
    preopens["/work"] = workDirectory;
    args.push(
      "--input", `/work/${inputName}`,
      "--output", "/work/output.tsv",
      "--fps", "24",
      "--filter",
    );
    await fs.rm(output, { force: true });
  } else {
    fail("mode must be version or generate");
  }

  const wasi = new WASI({
    version: "preview1",
    args,
    env: {},
    preopens,
  });
  const module = await WebAssembly.compile(await fs.readFile(modulePath));
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  wasi.start(instance);
}

await run();
