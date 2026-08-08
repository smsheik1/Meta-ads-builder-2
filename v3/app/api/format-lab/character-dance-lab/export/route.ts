import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const repositoryRoot = path.join(process.cwd(), "public/format-repositories/mixamo-character-motion-v1");
const formats = new Set(["gif", "mp4"]);

function execute(program: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(program, args, { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve()
      : reject(new Error(`${path.basename(program)} exited ${code}\n${output.slice(-12_000)}`)));
  });
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: { characterId?: unknown; motionId?: unknown; format?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Send a JSON download request.", 400);
  }
  if (typeof body.characterId !== "string" || typeof body.motionId !== "string" || typeof body.format !== "string" || !formats.has(body.format)) {
    return errorResponse("Choose a valid character, motion, and download format.", 400);
  }

  const temporary = await mkdtemp(path.join(tmpdir(), "wiggly-dance-export-"));
  const output = path.join(temporary, `download.${body.format}`);
  try {
    await execute(process.execPath, [
      path.join(repositoryRoot, "runtime/export.mjs"),
      `--character=${body.characterId}`,
      `--motion=${body.motionId}`,
      `--format=${body.format}`,
      `--output=${output}`,
    ]);
    const bytes = await readFile(output);
    const filename = `${body.characterId}-${body.motionId}.${body.format}`;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(bytes.length),
        "Content-Type": body.format === "gif" ? "image/gif" : "video/mp4",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const invalidSelection = /selected character or motion is unavailable/i.test(message);
    return errorResponse(invalidSelection ? "The selected character or motion is unavailable." : "The animation could not be exported.", invalidSelection ? 400 : 500);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
