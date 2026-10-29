// Minimal static file server for the QA harness.
// Serves the production build (dist/) from a Linux-side port so the harness is
// independent of whatever dev server the lead happens to have running host-side.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/**
 * Start a static server rooted at `dir`.
 * @param {string} dir directory to serve (e.g. ../dist)
 * @returns {Promise<{origin:string, close:()=>Promise<void>}>}
 */
export async function serveDir(dir) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (path === "/") path = "/index.html";
      // prevent path traversal; collapse to a file under dir
      const file = normalize(join(dir, path));
      if (!file.startsWith(normalize(dir))) {
        res.writeHead(403).end("forbidden");
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      // SPA fallback: unknown paths get index.html
      try {
        const body = await readFile(join(dir, "index.html"));
        res.writeHead(200, { "content-type": MIME[".html"] });
        res.end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
