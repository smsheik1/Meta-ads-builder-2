import path from "node:path";
import { fileURLToPath } from "node:url";
import { ExportInputError, renderDownload } from "./export.mjs";
import { startStaticServer } from "./static-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be a valid TCP port");

const server = await startStaticServer(root, port, async ({ request, response, pathname }) => {
  if (pathname !== "/api/format-lab/character-dance-lab/export") return false;
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST", "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Use POST." }));
    return true;
  }
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 16_384) throw new ExportInputError("Request body is too large.");
      chunks.push(chunk);
    }
    const result = await renderDownload(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": result.bytes.length,
      "Content-Type": result.contentType,
    });
    response.end(result.bytes);
  } catch (error) {
    const status = error instanceof ExportInputError || error instanceof SyntaxError ? 400 : 500;
    response.writeHead(status, { "Cache-Control": "no-store", "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
  return true;
});
const address = server.address();
console.log(`Character Dance Lab: http://127.0.0.1:${address.port}/runtime/renderer/index.html?mode=lab`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
