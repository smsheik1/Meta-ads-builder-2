import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const mimeTypes = {
  ".dae": "model/vnd.collada+xml",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

export async function startStaticServer(root, port = 0) {
  const resolvedRoot = path.resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      if (pathname === "/favicon.ico") {
        response.writeHead(204);
        return response.end();
      }
      const file = path.resolve(resolvedRoot, pathname.replace(/^\/+/, ""));
      if (!file.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("Path leaves the Format Repo");
      if (!(await stat(file)).isFile()) throw new Error("Not a file");
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
      });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
