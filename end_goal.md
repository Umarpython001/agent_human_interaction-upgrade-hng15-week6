# END GOAL: ZIKI HUMAN–AGENT INTERACTION DEMO

## 1. Objective

Build a small, polished, frontend-only demo that demonstrates a meaningful improvement to how humans and AI agents interact on Ziki.

Website: https://ziki.dev/
Documentation: https://ziki.dev/docs

We are building from scratch using a starter frontend project and screenshots of Ziki's existing interface.

**We are not rebuilding Ziki. We are not building a production feature. We are demonstrating one improved interaction through a working UI prototype.**

The final result should be easy to understand, visually polished, interactive, and straightforward to demonstrate.

## 2. The Feature: Clarification Loop

The demo should show how an AI agent can communicate uncertainty rather than making assumptions and proceeding blindly.

The interaction follows this scenario:

1. An agent receives a software issue and prepares a proposed fix.
2. The agent identifies an ambiguity that could affect the implementation.
3. The agent asks the human a specific clarification question.
4. The human provides an answer through the interface.
5. The agent acknowledges the answer and presents an updated plan.
6. The human reviews the revised plan and approves it, requests changes, or declines it.

The interface should make it clear what the agent originally intended to do, what the human clarified, and how that answer changed the plan.

This interaction is the centrepiece of the demo.

## 3. What to Build

Create one focused interface that demonstrates the entire interaction.

The interface should include:

- An agent identity and a realistic issue summary.
- A concise explanation of the agent's proposed action.
- A clearly visible clarification question.
- An interactive way for the human to respond.
- A visible agent response acknowledging the clarification.
- An updated plan showing what changed.
- Approve, Request Changes, and Decline controls.
- Clear status feedback after the human makes a decision.

Use one realistic example throughout the experience. Do not build a large collection of unrelated screens or scenarios.

The layout can use a single page, a side panel, or a small number of coordinated views. Choose whichever approach best demonstrates the interaction.

## 4. Make the Prototype Functional

Every important interaction must work in the browser.

For example:

- Clicking a suggested response or submitting a typed answer should advance the clarification flow.
- The answer should appear in the conversation.
- The revised plan should reflect the selected answer.
- Approve should update the visible decision status.
- Request Changes should let the human provide feedback.
- Decline should produce a clear declined state.
- The interface should prevent contradictory or repeated decisions where appropriate.

Use local React state and realistic mock data.

The agent's response can be predetermined for the demo. There is no need to build a real AI integration.

Do not pretend that messages are transmitted to a real agent or that decisions are stored on Ziki's production backend.

## 5. Design Requirements

Inspect the supplied screenshots and public Ziki website before implementation.

Preserve the recognisable aspects of Ziki's existing interface, including its colours, typography, spacing, buttons, cards, and general visual language.

The prototype should feel like a natural extension of Ziki.

Aim for a clean, professional, modern interface with clear information hierarchy. The human should immediately understand what the agent is asking and what happens next.

Make the important state transitions visible without cluttering the interface.

Ensure the design works on desktop and mobile, with accessible controls and visible focus states.

Use the Impeccable skill if it is available in the development environment.

## 6. Keep the Scope Small

This is a frontend demonstration, not a production system.

Do not build:

- A backend or database.
- Authentication or authorisation infrastructure.
- Real agent execution.
- Production API integrations.
- A complete issue-tracking application.
- A complex multi-agent orchestration system.
- Persistent conversation history.
- Unnecessary dashboards, settings, or unrelated pages.

Do not install unnecessary dependencies or overengineer the architecture.

Use the existing starter project and whatever frontend stack it already provides, unless there is a compelling reason to change it.

## 7. Agent Responsibilities

All agents must read this document before beginning work.

**Research agent:** Briefly investigate relevant human–agent interaction patterns and recommend the most effective way to demonstrate the Clarification Loop. Keep the research proportional to this small prototype.

**Lead agent:** Own the application shell, visual direction, shared data model, coordination, integration, and final delivery.

**UI agent:** Build the main agent proposal interface, clarification question, conversation presentation, and revised plan.

**Workflow agent:** Implement the interactive human response, clarification flow, and decision controls using local state.

**QA agent:** Prepare a short checklist and independently verify the complete interaction after integration.

The agents must coordinate their component interfaces and avoid editing the same files unnecessarily. Do not build competing implementations.

## 8. Definition of Done

The demo is complete when:

- A visitor can understand the proposed interaction without a lengthy explanation.
- The agent presents a realistic clarification question.
- The human can respond and see the proposed plan update.
- The human can approve, request changes, or decline.
- Every key interaction works locally.
- The visual design is consistent with the supplied Ziki references.
- The layout works on desktop and mobile.
- The application builds and the implemented flow has been tested.
- Mock functionality is clearly distinguished from real integrations.
- A working local application or shareable preview is available.

## 9. Final Deliverable

Deliver the working frontend demo, not just a design proposal.

Provide a short summary of the feature, the implemented interaction flow, the main files created, the checks performed, and instructions for running or previewing the application.

Do not claim production integration or deployment unless it actually happened.

## Final Principle

**Show how an agent can identify uncertainty, ask a human for clarification, incorporate the answer, and obtain an informed decision before proceeding.**

One realistic scenario, one coherent interaction, and a polished working prototype are enough. Prioritise clarity and demonstration quality over feature count.