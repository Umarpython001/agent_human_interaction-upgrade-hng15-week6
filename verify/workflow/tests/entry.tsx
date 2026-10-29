import { createRoot, type Root } from "react-dom/client";
import { WorkflowIntegrationExample } from "../../../src/components/decision/WorkflowIntegrationExample";
import {
  createInitialWorkflowState,
  workflowExampleReducer,
} from "../../../src/components/decision/workflowExampleReducer";

/**
 * Test entry: exposes mount/unmount for the jsdom runner in
 * scripts/run-tests.mjs. Everything is bundled by esbuild and evaluated
 * inside a jsdom window.
 */
const FIXED_CLOCK = () => "09:45";

let root: Root | null = null;

function mount(container: HTMLElement, revisionDelayMs = 20) {
  root = createRoot(container);
  root.render(
    <WorkflowIntegrationExample
      revisionDelayMs={revisionDelayMs}
      clock={FIXED_CLOCK}
    />
  );
}

function unmount() {
  root?.unmount();
  root = null;
}

declare global {
  interface Window {
    __harness: {
      mount: typeof mount;
      unmount: typeof unmount;
      reducer: typeof workflowExampleReducer;
      createInitial: typeof createInitialWorkflowState;
    };
  }
}

window.__harness = {
  mount,
  unmount,
  reducer: workflowExampleReducer,
  createInitial: createInitialWorkflowState,
};
