import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WorkflowIntegrationExample } from "../../../src/components/decision/WorkflowIntegrationExample";

/**
 * Verification harness page (WORKFLOW agent).
 * Renders ONLY the workflow components' integration example inside minimal
 * page chrome. This is not the application shell — LEAD owns src/main.tsx.
 */
const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

createRoot(root).render(
  <StrictMode>
    <main
      style={{
        fontFamily: "Manrope, Inter, system-ui, sans-serif",
        background: "#f4f5fa",
        minHeight: "100vh",
        padding: "24px 16px",
      }}
    >
      <p
        style={{
          maxWidth: "720px",
          margin: "0 auto 16px",
          fontSize: "0.75rem",
          color: "#5f6577",
        }}
      >
        Verification harness · WORKFLOW components (clarification + decision).
        Not the app shell.
      </p>
      <WorkflowIntegrationExample />
    </main>
  </StrictMode>
);
