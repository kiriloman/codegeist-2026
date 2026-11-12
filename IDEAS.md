# Codegeist 2026 — Idea Shortlist (5 ideas × 5 judge personas)

Selection criteria: every idea is (1) buildable as a real full-stack Forge app by one developer in ~5 weeks, (2) hits at least two bonus categories (Rovo Agents / MCP / Teamwork Graph) from a single build, (3) surfaces through Rovo chat — i.e., it works as a chat-native solution where the user @mentions the agent and gets answers with evidence, which is what Codegeist's "build with context" brief rewards.

## The judging panel (same 5 personas for every idea)

1. **P1 — Forge Platform Architect (Atlassian)**: scores correct use of `rovo:agent`, `rovo:skill`/`rovo:action`, Forge storage/APIs, permissions (EUDMOD/ scoped), and production-quality architecture.
2. **P2 — DevTools Product Manager**: scores whether it removes *real, frequent* workflow friction and whether a dev team would actually install it from Marketplace.
3. **P3 — Enterprise IT Buyer**: scores security posture, data boundaries (no PII leaves the tenant), admin controls, and whether it's deployable in a 5,000-seat org.
4. **P4 — AI Agent Engineering Lead**: scores agent design — context handling, tool-use discipline, guardrails against hallucination (cited evidence, read-only vs write separation), MCP correctness.
5. **P5 — End-User Champion (team lead persona)**: scores day-one usability of the chat experience and whether a non-expert gets value in the first 10 minutes.

Each persona's verdict is PASS plus the one hard question they'd ask in judging — treat those as your prep sheet.

---

## Idea 1 — Incident Commander
**Assignable Rovo agent that runs the first 10 minutes of every production incident.**

When a Compass alert or incident ticket fires, the agent is auto-assigned to the incident. It immediately: builds the timeline (recent deploys from Bitbucket, linked alerts, who was on call), identifies the most likely change (correlates deploy times with metric anomalies in linked issue data), posts a first-response summary in the incident channel, and answers "what changed?" in Rovo chat with cited commits/PRs. Post-resolution it drafts the Confluence post-mortem with the evidence chain already assembled.
- **Stack fit:** Forge app + `rovo:agent` (assignable) + Compass + Bitbucket integration + TWG (connects alerts→deploys→incidents into the graph) + MCP server exposing "what changed / timeline" tools to any client.
- **Bonus categories hit:** Best Agents ✓ · Best MCP ✓ · TWG ✓ (all three from one build)
- **Chat-native:** responders @mention it mid-incident; it replies with evidence-linked answers, not prose.

### Persona review
- **P1 (Architect)** — PASS. Textbook assignable-agent pattern (event-triggered assignment is exactly what `rovo:agent` + webhooks are for); read-only integrations + a single write action (post-mortem draft) keep permission scopes minimal. *Hard question: "How do you deduplicate when three alerts fire from one root cause?"* → Answer: cluster by Compass service + time window before creating the timeline.
- **P2 (DevTools PM)** — PASS. Incident triage is high-frequency, high-pain, and currently manual glue work; installs on the pain of the on-call rotation. *Hard question: "What if the team doesn't use Compass?"* → Fallback: incident-type Jira issues + deploy webhooks still give 80% of the value.
- **P3 (Enterprise IT)** — PASS. All data stays in-tenant on Forge; agent never exfiltrates logs; read-heavy, write-minimal. *Hard question: "Can it accidentally post confidential summaries to the wrong channel?"* → Write actions restricted to the incident's own issue/channel scope.
- **P4 (Agent Lead)** — PASS. Agent never speculates: every claim must cite a commit ID, PR, or alert; "no evidence found" is an allowed answer — that discipline is what wins agent tracks. *Hard question: "How do you stop it confidently blaming the wrong deploy?"* → It presents a ranked correlation with timestamps, labeled as correlation, and links the diff for human confirmation.
- **P5 (Team Lead)** — PASS. The 3 AM on-call gets a first-response summary before they've opened their laptop lid. *Hard question: "Is the post-mortem draft actually usable or generic?"* → It's built entirely from the assembled evidence chain, so it reads like a human wrote it from the timeline.

---

## Idea 2 — Sprint Retro Pilot
**Assignable agent that runs async retrospectives and closes the loop with created tickets.**

At sprint close the agent is assigned to the sprint. It pulls scope changes, cycle times, blocked-in-progress items, review latency from Bitbucket, and hotfix counts; posts a 5-question async retro in Rovo chat (people answer in their own timezone); then synthesizes a Confluence retro doc with the data next to the sentiment, and converts agreed action items into real Jira tickets assigned to volunteers.
- **Stack fit:** Forge app + `rovo:agent` + chat-native Q&A + Confluence/Jira APIs + TWG (sprint data becomes graph-linked) + MCP tools ("get retro insights for team X").
- **Bonus categories hit:** Best Agents ✓ · TWG ✓ · MCP ✓
- **Chat-native:** the whole retro happens in chat; the agent moderates and follows up.

### Persona review
- **P1 (Architect)** — PASS. Clean scheduled-trigger agent with `rovo:action` buttons (e.g., "create ticket from this action item"); no exotic permissions. *Hard question: "How does it handle multi-team shared boards?"* → Scope per project/sprint ID from the assignment context, never cross-board.
- **P2 (DevTools PM)** — PASS. Retros are universal, universally rushed, and the "action items vanish" failure is a known industry joke — this closes that loop mechanically. *Hard question: "Why not just a Confluence template?"* → The agent brings the sprint's actual data into the doc automatically and chases non-responders; a template does neither.
- **P3 (Enterprise IT)** — PASS. Retro sentiment is sensitive; data stays in-tenant, and anonymized aggregation happens at synthesis time. *Hard question: "Can a manager de-anonymize answers?"* → Aggregation threshold (min N answers) enforced in app logic, documented in the listing.
- **P4 (Agent Lead)** — PASS. Two distinct agent modes (data analysis vs. moderation) with different prompts/tools; synthesis must cite specific tickets/commits. *Hard question: "How do you keep the agent from leading the witness in questions?"* → Fixed question bank + it only reflects back what participants wrote.
- **P5 (Team Lead)** — PASS. First value in 10 minutes: the data section of the retro doc is ready before anyone answers a question. *Hard question: "Will people actually answer in chat?"* → The agent sends one gentle nudge, then proceeds — no guilt-trip automation.

---

## Idea 3 — Onboarding Cartographer
**Agent that turns a new hire's first two weeks from a scavenger hunt into a guided path.**

When added to a team, the agent builds a personal context map from the Teamwork Graph: who owns what (services in Compass, repos in Bitbucket, docs in Confluence), what the new hire's team touches, and which docs are actually load-bearing (linked from active issues). It generates a Confluence onboarding space with a day-by-day path, sets up "context coffees" with the right people, and answers "who do I ask about X?" in Rovo chat with a cited reason ("Maria touched 14 PRs on payments-service last quarter").
- **Stack fit:** Forge app + `rovo:agent` + heavy TWG usage (this is the strongest TWG showcase of the five) + MCP ("query team topology").
- **Bonus categories hit:** TWG ✓ (best-in-class fit) · Best Agents ✓ · MCP ✓
- **Chat-native:** the new hire's default chat companion for "who/what/where" questions.

### Persona review
- **P1 (Architect)** — PASS. Mostly read-only graph queries + document generation; the Forge Storage API holds the personalization state. *Hard question: "Graph coverage varies by org — what if TWG data is thin?"* → Graceful degradation to Confluence/Bitbucket-derived fallback map, flagged in the UI.
- **P2 (DevTools PM)** — PASS. Onboarding friction costs every team real weeks; buyer is the engineering manager, user is the new hire — both feel the value. *Hard question: "Does it work for contractor-heavy teams?"* → Personal paths are per-user, so short-tenure staff get compressed paths automatically.
- **P3 (Enterprise IT)** — PASS. Reads org structure, writes only to a new hire's own onboarding space; HR-system data (salary etc.) is never in scope. *Hard question: "What about people data privacy?"* → Only work-artifact activity (public commits, docs), never any performance/HR signals.
- **P4 (Agent Lead)** — PASS. Every people-recommendation must cite work artifacts — that's a hallucination-proofing mechanism, not a nicety. *Hard question: "How do you avoid recommending the person who just left?"* → Activity-window filter with recency weighting; stale nodes get a "verify with manager" flag.
- **P5 (Team Lead)** — PASS. Removes the "assign someone to babysit the new hire" tax and makes the path self-serve. *Hard question: "Is the generated space actually good, or link soup?"* → Path items are ordered by dependency (read X before Y) using graph edges, and capped per day.

---

## Idea 4 — Dependency Druid
**Agent that catches cross-team dependencies before sprint planning commits to them.**

Before/at planning, the agent scans the sprint's epics and stories for implicit dependencies: blocked-by chains, shared Compass services owned by other teams, and API surfaces referenced in specs but owned elsewhere. It warns in Rovo chat ("3 stories depend on payments-service, owned by Team B, whose Q1 roadmap doesn't include this work"), proposes sequencing or splitting, and can draft the cross-team coordination ticket.
- **Stack fit:** Forge app + `rovo:agent` + Compass + Jira APIs + TWG (the dependency edges ARE graph edges) + MCP ("check dependency risk for epic X").
- **Bonus categories hit:** Best Agents ✓ · TWG ✓ · MCP ✓
- **Chat-native:** planners @mention it during planning with "risk check this sprint?".

### Persona review
- **P1 (Architect)** — PASS. Graph traversal + scheduled pre-planning scan; the write action (draft coordination ticket) is user-confirmed via `rovo:action`. *Hard question: "How do you detect 'implicit' dependencies that aren't linked anywhere?"* → Heuristic layer: service-name/API references parsed from specs and commit history, presented as *suspected* links with confidence, never as fact.
- **P2 (DevTools PM)** — PASS. Cross-team dependency surprises are the #1 cause of sprint blowouts; this attacks it at the exact moment it's cheapest to fix (planning). *Hard question: "What if teams don't maintain Compass service ownership?"* → Falls back to repo-activity-derived ownership inference, labeled as inferred.
- **P3 (Enterprise IT)** — PASS. Read-only analysis + opt-in writes; cross-team visibility respects existing permission scopes (a team can't see what they couldn't see before). *Hard question: "Does this leak another team's private roadmap?"* → Only surfaces dependency conflicts visible under the asker's existing permissions.
- **P4 (Agent Lead)** — PASS. Prediction with confidence labels + citations to the exact blocking links; explicitly avoids presenting inference as certainty. *Hard question: "False positives will make planners ignore it — what's your precision story?"* → Tunable sensitivity + a "mark as false positive" action that feeds back into the heuristic weights.
- **P5 (Team Lead)** — PASS. One chat message before planning saves a month of silent cross-team waiting. *Hard question: "Is this just a fancy Jira query?"* → No: the multi-team roadmap-conflict correlation across TWG edges is not expressible as a JQL query, and that's the demo money-shot.

---

## Idea 5 — Review Buddy
**Assignable agent attached to every pull request that defends the reviewer's attention.**

Assigned per-PR (opt-in per repo): the agent builds the review context — what the PR changes, linked Jira issue intent, risk ranking of files by blast radius (via TWG service edges and historical incident links), test coverage delta — and posts a prioritized review guide in the PR and in chat ("start with payments-webhook.ts: high blast radius, no tests added; the linked issue says this is a hotfix"). Reviewers @mention it: "why is this change safe?" and it answers with cited evidence from the issue, diff, and prior incidents.
- **Stack fit:** Forge app + Bitbucket integration + `rovo:agent` (per-PR assignable) + TWG (blast-radius via service dependency edges) + MCP ("get review context for PR X").
- **Bonus categories hit:** Best Agents ✓ · TWG ✓ · MCP ✓
- **Chat-native:** reviewers converse with it mid-review; it answers with file-level citations.

### Persona review
- **P1 (Architect)** — PASS. Webhook-triggered per-PR agent is a natural Forge pattern; compute cost controlled by opt-in per repo. *Hard question: "How do you avoid slowing down CI or the PR UI?"* → Async analysis posted when ready; the PR gets a single consolidated comment, not spam.
- **P2 (DevTools PM)** — PASS. Review quality/time is the most-measured dev pain after incidents; "where do I start reviewing" is a genuinely unanswered question in every big PR. *Hard question: "GitHub dominates PR review — why does this matter on Bitbucket?"* → Codegeist IS the Bitbucket ecosystem's stage; being the best Bitbucket review tool is the point, not a bug.
- **P3 (Enterprise IT)** — PASS. Read-only on code; no code leaves the tenant; comments are scoped to the PR. *Hard question: "Could the risk ranking mislead a reviewer into under-reviewing 'safe' files?"* → Guide labels are advisory with methodology shown; the agent never says "skip this file."
- **P4 (Agent Lead)** — PASS. Blast-radius ranking from graph data (deterministic) + LLM only for summarization — the risky inference is structurally separated from the generative layer. *Hard question: "How current is your blast-radius data?"* → Recomputed from TWG on PR open; staleness window surfaced in the guide.
- **P5 (Team Lead)** — PASS. New joiners review risky PRs with a safety net; seniors save 20 minutes per review. *Hard question: "Will devs trust a machine's review order?"* → Every ranking line links its reason (incident history, test delta); transparency is the trust strategy.

---

## Comparative recommendation

| Idea | Build effort | Win odds | Marketplace life after the hackathon |
|---|---|---|---|
| 1 Incident Commander | Medium-high | High (dramatic demo) | Strong |
| 2 Sprint Retro Pilot | Medium | High (broad relatability) | Strong |
| 3 Onboarding Cartographer | Medium | Medium-high (best TWG showcase) | Medium |
| 4 Dependency Druid | High (heuristics) | Medium (false-positive risk) | Strong |
| 5 Review Buddy | Medium | High (daily-use tool) | Strongest |

**Pick 1 or 5.** Incident Commander has the most dramatic 3-minute demo (live incident, live evidence chain); Review Buddy has the clearest everyday value and the strongest Marketplace story — and publishing to Marketplace unlocks the fourth bonus category. Both fit the same 5-week plan in `CHECKLIST.md`; decide by Nov 15 to keep the Dec 15 early-submission target.
