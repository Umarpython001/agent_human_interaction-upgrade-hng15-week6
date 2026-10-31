import type { RequestStatus } from "../../types";

/**
 * Clarification Loop progress stepper — public data contract.
 *
 * Deliberately tiny: App derives the three facts the stepper needs from the
 * store (status, the transient `working` flag, and the latest plan version)
 * and hands them over. The component stays presentational.
 */

/** Lifecycle of a single step in the 3-step loop. */
export type LoopStepState = "done" | "current" | "upcoming";

export interface LoopProgressProps {
  /** Canonical request status (same vocabulary as statusMeta.ts). */
  status: RequestStatus;
  /** True while the simulated agent is revising the plan right now. */
  working: boolean;
  /** Version number of the latest plan the human can see. */
  currentVersion: number;
  /** Agent display name, used in the "right now" subtitle line. */
  agentName?: string;
}
