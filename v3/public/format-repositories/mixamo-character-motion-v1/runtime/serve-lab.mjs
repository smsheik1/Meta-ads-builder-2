import path from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "./static-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be a valid TCP port");

const server = await startStaticServer(root, port);
const address = server.address();
console.log(`Character Dance Lab: http://127.0.0.1:${address.port}/runtime/renderer/index.html?mode=lab`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
