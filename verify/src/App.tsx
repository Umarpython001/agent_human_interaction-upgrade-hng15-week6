// Verification harness (UI agent) — renders ActionBriefCard in isolation against
// states derived from src/data/scenario.ts (the single mock-data file; nothing new
// is added there — this file only composes props the real App would pass).
import "../../src/styles/tokens.css";
import ActionBriefCard from "../../src/components/action-brief/ActionBriefCard";
import type { ActionBriefCardProps } from "../../src/components/action-brief/ActionBriefCard";
import { agent, brief, issue, planV1, buildAnswerRevision } from "../../src/data/scenario";

const planV2 = buildAnswerRevision("redirect", "", 2, "09:41").plan;

const base = {
  agentName: agent.name,
  agentLevel: agent.level,
  agentEmoji: agent.emoji,
  issue,
  intention: brief.intention,
  evidence: brief.evidence,
  risks: brief.risks,
  uncertainties: brief.uncertainties,
  estimate: brief.estimate,
  confidence: brief.confidence,
  confidenceReason: brief.confidenceReason,
};

const longIntention =
  "Make the invite page fail fast when required URL parameters are missing, instead of leaving visitors on an infinite spinner that never resolves and gives the visitor no way out. " +
  "The fix validates token and workspace parameters before any network request is fired, then renders a recovery path. " +
  "This deliberately long paragraph exists to exercise the clamped-body behaviour: on every viewport the intention should clamp to six lines with a keyboard-accessible Show more toggle, and when the text does not overflow the toggle must not render at all. " +
  "It keeps going with realistic filler about the invite flow, the analytics event ordering, the shared ErrorState component and the unit-test matrix so the clamp measurement runs against genuine multi-paragraph-length content rather than a synthetic one-liner.";

interface Scenario {
  id: string;
  caption: string;
  props: ActionBriefCardProps;
}

const scenarios: Scenario[] = [
  {
    id: "pending",
    caption: "v1 · Waiting on you (clarification open)",
    props: { ...base, status: "in_clarification", working: false, plans: [planV1] },
  },
  {
    id: "revising",
    caption: "Agent revising (transient phase inside clarification)",
    props: { ...base, status: "in_clarification", working: true, plans: [planV1] },
  },
  {
    id: "revised",
    caption: "v2 revised · Your decision needed (what-changed + superseded history)",
    props: { ...base, status: "revised_awaiting_review", working: false, plans: [planV1, planV2] },
  },
  {
    id: "approved",
    caption: "Approved (terminal — SLA chip hidden)",
    props: { ...base, status: "approved", working: false, plans: [planV1, planV2] },
  },
  {
    id: "evidence-kinds",
    caption: "Evidence with trust levels (fact / reported / assumption)",
    props: {
      ...base,
      status: "awaiting_review",
      working: false,
      plans: [planV1],
      evidence: [
        {
          text: "Reproduced on /invite with no query params: the spinner never resolves (recording attached to #129).",
          kind: "fact",
          sourceLabel: "reproduction recording · issue #129",
        },
        {
          text: "Network tab shows GET /api/v1/invites/undefined left pending — the fetch fires before any validation.",
          kind: "fact",
          sourceLabel: "devtools network log",
        },
        {
          text: "2 of this week's 5 support reports share this signature; #129 has 2 confirmations in its comments.",
          kind: "reported",
          sourceLabel: "support inbox · #129 comments (not agent-verified)",
        },
        {
          text: "The shared ErrorState may already accept an action-link prop; if it does not, step 2 grows a small prop.",
          kind: "assumption",
        },
      ],
    },
  },
  {
    id: "edge",
    caption: "Edge: long clamping text, empty sections hidden, harsh issue data",
    props: {
      status: "changes_requested",
      working: true,
      agentName: agent.name,
      agentLevel: agent.level,
      agentEmoji: agent.emoji,
      issue: {
        number: 431,
        title:
          "A very long issue title that keeps going and going to check wrapping behaviour on narrow screens where space is limited and every character counts toward the layout",
        votes: 107,
        type: "Improvement",
        priority: "Critical",
        status: "Blocked",
        reported: "Sep 2",
        comments: 34,
      },
      intention: longIntention,
      evidence: [],
      risks: [],
      uncertainties: [],
      estimate: "≈ 3 d",
      plans: [planV1],
    },
  },
];

export default function App() {
  return (
    <main className="harness">
      <h1 className="harness__title">ActionBriefCard — verification harness</h1>
      <p className="harness__sub">
        States derived from <code>src/data/scenario.ts</code>. Each frame is roughly one app
        column wide.
      </p>
      {scenarios.map((scenario) => (
        <section className="harness__case" data-case={scenario.id} key={scenario.id}>
          <h2 className="harness__caption">{scenario.caption}</h2>
          <div className="harness__frame">
            <ActionBriefCard {...scenario.props} />
          </div>
        </section>
      ))}
    </main>
  );
}
