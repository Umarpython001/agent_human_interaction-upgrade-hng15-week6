// Mock scenario data — the single realistic example used throughout the demo.
// This file is the mock-data boundary: swap it for a real API layer later.
// The agent's replies are predetermined; no AI is called at runtime.
import type { PlanVersion, ThreadMessage } from "../types";

export const issue = {
  number: 129,
  title:
    "Invitation pages hang on an infinite spinner when the invite link is missing required parameters",
  votes: 11,
  type: "Fix",
  priority: "Medium",
  status: "In progress",
  reported: "Oct 17",
  comments: 2,
};

export const agent = {
  name: "Umar-Solver",
  level: "contributor",
  initials: "US",
  emoji: "\u{1F916}",
};

export const human = { name: "Umar Olowonyo", initials: "UO" };

export const brief = {
  intention:
    "Make the invite page fail fast when required URL parameters are missing, instead of leaving visitors on an infinite spinner.",
  evidence: [
    "Reproduced on /invite with no query params: the spinner never resolves (recording attached to #129).",
    "Network tab shows GET /api/v1/invites/undefined left pending \u2014 the fetch fires before any validation.",
    "2 of this week's 5 support reports share this signature; #129 has 2 confirmations in its comments.",
  ],
  risks: [
    "Changing the mount-time load order could affect the invite_view analytics event.",
    "The shared ErrorState component has no mobile layout yet.",
  ],
  uncertainties: [
    "The ticket doesn't say what the page should show when parameters are missing \u2014 and three similar behaviours already exist in the app. This needs your call before any code is written.",
  ],
  estimate: "\u2248 30 min",
  /** Honest confidence signal (anti-rubber-stamp, per research findings). */
  confidence: 65,
  confidenceReason:
    "The code path is clear and reproduced; confidence is capped because the desired fallback behaviour is a product decision, not a technical one.",
};

export const question = {
  body: "When an invite link is missing its required parameters, which behaviour should the page show?",
  context:
    "The ticket describes the hang but not the desired fallback. Three existing patterns could fit \u2014 your answer decides step 2 of the plan.",
  suggestedAnswers: [
    {
      id: "redirect",
      label: "Redirect to /invite with an error banner",
      blurb: "Matches the pattern used across settings pages.",
    },
    {
      id: "inline",
      label: "Show the inline error state here",
      blurb: "No redirect \u2014 fail in place with a retry link.",
    },
    {
      id: "expired",
      label: "Treat it as an expired invite",
      blurb: "Reuse the existing ExpiredInviteScreen.",
    },
  ],
};

export const planV1: PlanVersion = {
  version: 1,
  time: "09:12",
  summary: "Initial plan submitted with the request.",
  steps: [
    {
      id: "p1",
      text: "Guard the InvitePage load \u2014 validate token and workspace parameters before any request is fired.",
    },
    {
      id: "p2",
      text: "Render the shared ErrorState with a \u201CRequest a new invite\u201D link when parameters are missing.",
    },
    {
      id: "p3",
      text: "Add unit tests for missing, empty and malformed parameters.",
    },
    {
      id: "p4",
      text: "Open a pull request linking issue #129 for independent review.",
    },
  ],
};

export const seedMessages: ThreadMessage[] = [
  {
    id: "m1",
    author: "agent",
    time: "09:12",
    body: "Hi Umar \u2014 I\u2019ve prepared a plan for #129. One thing is genuinely ambiguous, so I\u2019d rather ask than guess: which fallback behaviour do you want when invite parameters are missing?",
  },
];

interface Recipe {
  ack: string;
  summary: string;
  steps: PlanVersion["steps"];
}

const recipes: Record<string, Recipe> = {
  redirect: {
    ack: "Thanks \u2014 redirect with the settings-style banner it is. I\u2019ve replaced step 2, and added an analytics guard so invite_view still fires exactly once.",
    summary:
      "Step 2 replaced (redirect + banner) \u00B7 analytics guard added \u00B7 tests extended.",
    steps: [
      {
        id: "p1",
        text: "Guard the InvitePage load \u2014 validate token and workspace parameters before any request is fired.",
      },
      {
        id: "p2",
        text: "Redirect to /invite?error=missing-params and render the inline error banner used across settings pages.",
        changed: true,
      },
      {
        id: "p3",
        text: "Fire the invite_view analytics event once on mount, before the redirect.",
        changed: true,
      },
      {
        id: "p4",
        text: "Extend unit tests: missing, empty and malformed parameters, plus assertions on the redirect target.",
        changed: true,
      },
      {
        id: "p5",
        text: "Open a pull request linking issue #129 for independent review.",
      },
    ],
  },
  inline: {
    ack: "Got it \u2014 fail in place. Step 2 now renders ErrorState directly, and I\u2019ve added a regression test asserting no network call fires, so the spinner can\u2019t outrun the guard again.",
    summary:
      "Step 2 kept in place (no redirect) \u00B7 regression test added for the no-request guarantee.",
    steps: [
      {
        id: "p1",
        text: "Guard the InvitePage load \u2014 validate token and workspace parameters before any request is fired.",
      },
      {
        id: "p2",
        text: "Render the shared ErrorState in place with a \u201CRequest a new invite\u201D link \u2014 no redirect.",
        changed: true,
      },
      {
        id: "p3",
        text: "Add a regression test asserting no network request fires when parameters are missing.",
        changed: true,
      },
      {
        id: "p4",
        text: "Open a pull request linking issue #129 for independent review.",
      },
    ],
  },
  expired: {
    ack: "Understood \u2014 missing parameters count as an expired link. The plan now reuses ExpiredInviteScreen and tags the analytics event as invite_link_invalid.",
    summary:
      "Step 2 replaced (ExpiredInviteScreen) \u00B7 analytics event renamed for the invalid-link funnel.",
    steps: [
      {
        id: "p1",
        text: "Guard the InvitePage load \u2014 validate token and workspace parameters before any request is fired.",
      },
      {
        id: "p2",
        text: "Route missing-parameter visits to the existing ExpiredInviteScreen (\u201CThis invite has expired\u201D).",
        changed: true,
      },
      {
        id: "p3",
        text: "Emit invite_link_invalid instead of invite_view so the invalid-link funnel stays accurate.",
        changed: true,
      },
      {
        id: "p4",
        text: "Add unit tests for missing, empty and malformed parameters, including the expired-screen assertion.",
        changed: true,
      },
      {
        id: "p5",
        text: "Open a pull request linking issue #129 for independent review.",
      },
    ],
  },
};

function freeRecipe(text: string): Recipe {
  return {
    ack: `Thanks \u2014 noted: \u201C${text}\u201D. I\u2019ve updated step 2 to implement exactly that behaviour, and kept the guard, tests and PR steps in place.`,
    summary: "Step 2 replaced to match your instruction.",
    steps: [
      {
        id: "p1",
        text: "Guard the InvitePage load \u2014 validate token and workspace parameters before any request is fired.",
      },
      {
        id: "p2",
        text: `Implement the behaviour you specified: \u201C${text}\u201D`,
        changed: true,
      },
      {
        id: "p3",
        text: "Add unit tests covering the chosen behaviour for missing, empty and malformed parameters.",
        changed: true,
      },
      {
        id: "p4",
        text: "Open a pull request linking issue #129 for independent review.",
      },
    ],
  };
}

/** Build the agent's acknowledgment + next plan version for a given human answer. */
export function buildAnswerRevision(
  answerId: string | null,
  text: string,
  version: number,
  time: string
): { ack: string; plan: PlanVersion } {
  const recipe = (answerId && recipes[answerId]) || freeRecipe(text);
  return {
    ack: recipe.ack,
    plan: { version, time, summary: recipe.summary, steps: recipe.steps },
  };
}

/** Build the agent's acknowledgment + next plan version after human-requested changes. */
export function buildFeedbackRevision(
  feedback: string,
  current: PlanVersion,
  time: string
): { ack: string; plan: PlanVersion } {
  const version = current.version + 1;
  const steps = current.steps.map((s) => ({ ...s, changed: false }));
  steps.splice(1, 0, {
    id: `f${version}`,
    text: `Adjust the approach per your feedback: \u201C${feedback}\u201D`,
    changed: true,
  });
  return {
    ack: `Understood \u2014 I\u2019ve folded your feedback into the plan as its own step. Here\u2019s version ${version}.`,
    plan: {
      version,
      time,
      summary: `Adds a step addressing your feedback on version ${current.version}.`,
      steps,
    },
  };
}
