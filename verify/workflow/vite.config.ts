import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Isolated harness for the WORKFLOW components (clarification + decision).
// Renders the integration example only — not the application shell.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const rootModules = path.join(repoRoot, "node_modules");

export default defineConfig({
  base: "./",
  plugins: [react()],
  // `verify/node_modules` (UI agent's harness install) would otherwise supply
  // a SECOND react copy for files under src/ — pin to the repo root's deps.
  resolve: {
    alias: {
      react: path.join(rootModules, "react"),
      "react-dom": path.join(rootModules, "react-dom"),
      scheduler: path.join(rootModules, "scheduler"),
    },
  },
  server: { port: 5199 },
  build: { outDir: "dist", emptyOutDir: true },
});
