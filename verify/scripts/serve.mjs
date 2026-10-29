// Tiny static file server for the built harness (no dependencies).
// Serves `verify/dist` on an ephemeral port so Playwright can load the app
// over http:// (ES modules are blocked on file:// URLs).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

/** @param {string} dirPath directory to serve, relative to this script */
export async function startStaticServer(dirPath = "../dist/") {
  const root = fileURLToPath(new URL(dirPath, import.meta.url));
  const server = createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      if (pathname === "/") pathname = "/index.html";
      const file = normalize(join(root, pathname));
      if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
