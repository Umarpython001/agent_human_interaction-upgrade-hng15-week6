// Canonical status labels/colours. Components must use this — no new pill styles.
import type { Phase, RequestStatus } from "../types";

export interface StatusMeta {
  label: string;
  tone: "amber" | "blue" | "green" | "red";
}

/**
 * `working` = the agent is currently revising (transient phase inside
 * in_clarification / changes_requested). Label and tone follow who holds the ball.
 */
export function statusMeta(status: RequestStatus, working: boolean): StatusMeta {
  switch (status) {
    case "awaiting_review":
      return { label: "Waiting on you", tone: "amber" };
    case "in_clarification":
      return working
        ? { label: "Agent revising plan", tone: "blue" }
        : { label: "Waiting on you", tone: "amber" };
    case "revised_awaiting_review":
      return { label: "Your decision needed", tone: "blue" };
    case "changes_requested":
      return working
        ? { label: "Agent applying your changes", tone: "blue" }
        : { label: "Changes requested", tone: "amber" };
    case "approved":
      return { label: "Approved", tone: "green" };
    case "declined":
      return { label: "Declined", tone: "red" };
  }
}

/** True while the simulated agent is preparing the next plan version. */
export function isWorking(status: RequestStatus, phase: Phase): boolean {
  return phase === "agent" && (status === "in_clarification" || status === "changes_requested");
}
