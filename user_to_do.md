# Working With Your Agent — The New Way

*Plain English, just for you. No jargon.*

## What changed

Your agent used to have two bad options when it got stuck: **guess** (and possibly guess
wrong), or **dump a wall of text** on you and hope you'd sort it out.

Now there's a third option — the one we built. When your agent isn't sure about
something, it **stops, shows you its thinking, and asks you one clear question**. You
answer in a click or a sentence. Then it updates its plan in front of you and asks for
your decision. That's the whole idea: **no guessing, no mystery.**

## What you actually do

### 1. Open the request
When your agent needs you, it shows up as **"Waiting on you"** — like a colleague tapping
your shoulder. You open it and see one clean screen: the agent's plan on the left, the
conversation and buttons on the right.

### 2. Glance at the brief (about 30 seconds)
The agent lays its cards on the table:
- **"Here's what I want to do"** — one plain sentence.
- **"Here's what I found"** — the evidence (it actually reproduced the bug).
- **"Here's my plan"** — numbered steps, plus a time estimate.
- **"Here's what could go wrong"** — the risks.
- **"Here's what I'm not sure about"** — this is why it's asking you.
- **"Here's how sure I am"** — a confidence number with the reason. (So a slick-looking
  plan never fools you — the agent has to be honest about its uncertainty.)

### 3. Answer its question
It asks exactly one thing, for example: *"When an invite link is missing its parameters,
what should the page show?"*

You either:
- **tap one of the suggested answers** (each one tells you what it means), or
- **type your own answer** and hit Post.

You don't have to figure out what the agent needs — it told you.

### 4. Watch the plan fix itself
The agent replies ("Got it — redirect with the banner it is…") and puts a **new version
of the plan** in front of you:
- the steps it **changed are highlighted**,
- there's a one-line **"what changed"** summary,
- and the **old plan is kept** so you can compare — nothing silently rewrote itself.

### 5. Decide — three buttons, your call
- **Approve plan** ✅ — "Go ahead." (This gives the agent permission to start work. It is
  *not* the same as "job done" — you'll only see "done" when the fix is actually delivered
  and independently checked.)
- **Request changes** 🔄 — tell it what to adjust. You type why (this is required — it
  stops both of you from being lazy). The agent updates the plan and you get **v3** to
  look at.
- **Decline** ❌ — "No thanks." You give a short reason (required), the agent stops, and
  the issue stays open.

After you decide, the screen shows the result clearly, and you can't accidentally decide
twice — buttons for a version you already settled lock.

## A real example, start to finish

> Your agent notices the invite page hangs forever when a link is missing its parameters.
> Instead of guessing what the page *should* do, it files a brief and asks: **redirect to
> an error banner, show an inline error, or treat it as an expired invite?** You tap
> *"Redirect to /invite with an error banner."* The agent says thanks, publishes plan v2
> with the redirect step highlighted, and you approve v2 with one click. Total time from
> your side: under a minute.

## Handy to know

- You always see **which version** you're deciding on (v1, v2, v3…).
- **Requesting changes is safe** — the loop just continues until you're happy.
- Everything is **keyboard-friendly** and works on your phone.
- This is a **demo**: it all runs in your browser, nothing is really sent to Ziki or a
  real agent. The *behaviour* mirrors how Ziki's real agents work (ask instead of guess,
  versions instead of silent overwrites).

---
*More technical detail lives in `README.md`. This file was just for you.*
