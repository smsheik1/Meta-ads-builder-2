import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const formatArgument = process.argv.find((value) => value.startsWith("--format="));
const slug = formatArgument?.slice("--format=".length);
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  throw new Error("Use --format=<lowercase-format-slug>.");
}

const formatRelative = path.join("public", "format-repositories", `${slug}-v1`);
const formatRoot = path.join(v3Root, formatRelative);
const format = JSON.parse(await readFile(path.join(formatRoot, "format.json"), "utf8"));
if (format.id !== slug || format.version !== "1.0.0") {
  throw new Error(`Format identity mismatch for ${slug}.`);
}

const kitName = `wiggly-${slug}-format-kit`;
const stagingParent = path.join(v3Root, "tmp", `${slug}-format-kit`);
const stagingRoot = path.join(stagingParent, kitName);
const stagingV3 = path.join(stagingRoot, "v3");
const outputDirectory = path.join(formatRoot, "downloads");
const outputPath = path.join(outputDirectory, `${kitName}.zip`);

async function copyFromV3(relativePath, targetPath = relativePath) {
  await cp(path.join(v3Root, relativePath), path.join(stagingV3, targetPath), {
    recursive: true,
  });
}

await rm(stagingParent, { force: true, recursive: true });
await mkdir(path.join(stagingV3, formatRelative), { recursive: true });
await mkdir(outputDirectory, { recursive: true });

await copyFromV3("scripts/skai-image-format.ts");
await copyFromV3("tests/skai-image-format-runner.test.ts");

for (const entry of await readdir(formatRoot, { withFileTypes: true })) {
  if (entry.name === "downloads" || entry.name === "agent-runs") continue;
  await copyFromV3(path.join(formatRelative, entry.name));
}
await copyFromV3(path.join(formatRelative, "kit-smoke.mjs"), "kit-smoke.mjs");
await copyFromV3(path.join(formatRelative, "SKILL.md"), "SKILL.md");
await writeFile(
  path.join(stagingV3, "package.json"),
  await readFile(path.join(formatRoot, "kit.package.json")),
);
await writeFile(
  path.join(stagingRoot, "README.md"),
  [
    `# Wiggly ${format.title} Format Kit`,
    "",
    "Open `v3/SKILL.md` if you are an agent.",
    `Open \`v3/${formatRelative}/README.md\` for the human quick start.`,
    "Run all commands from the `v3` directory.",
    "",
  ].join("\n"),
);

const fixedDate = new Date("2026-01-01T00:00:00.000Z");
async function normalizeTimes(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await normalizeTimes(entryPath);
    await utimes(entryPath, fixedDate, fixedDate);
  }
}
await normalizeTimes(stagingRoot);
await utimes(stagingRoot, fixedDate, fixedDate);

await rm(outputPath, { force: true });
const zip = spawnSync("zip", ["-X", "-q", "-r", outputPath, kitName], {
  cwd: stagingParent,
  encoding: "utf8",
});
if (zip.status !== 0) throw new Error(`zip failed: ${zip.stderr}`);
const size = (await stat(outputPath)).size;
console.log(`Built ${path.relative(v3Root, outputPath)} (${Math.round(size / 1_024)} KB).`);
