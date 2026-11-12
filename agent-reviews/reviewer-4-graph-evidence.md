# Reviewer 4 — Teamwork Graph & Evidence Systems Specialist (independent agent, no conversation context)

**FINAL RATING: 5 / 10** — "Real, carefully-plumbed evidence architecture — but the dominance hierarchy is nominal, the postmortem matcher has near-zero recall on real prose, and the Teamwork Graph half is unregistered, unscoped, unlinked, and never executed."

## Verdict (condensed)

"evidence outranks heuristics" is real as an architecture, only partially real as a scoring system, and not yet demonstrated as a product. The evidence plumbing is genuinely built end-to-end (citations flow from fetchers → engine → guide → chat digest → Rovo tools → MCP tools, with never-break degradation). But the headline claim fails on three verified counts — and this reviewer **executed the engine** to prove the first one.

## Key findings

**BLOCKER**
- `manifest.yml` duplicate `webtrigger` keys (lines 34 and 49) — last-key-wins drops `pr-webhook`, the app's core entry point. (Third reviewer to independently confirm this.)

**MAJOR — the headline claim is numerically false in edge cases (verified by execution):**
- A heuristic-only `src/payments/webhook-handler.js` with a 900-line diff scores **66** — *tying* the max 2-postmortem + graph configuration at 66; with churn added it hits **76 CRITICAL, beating the evidence-backed file**.
- A single postmortem (+14) is worth less than half the payment-path regex (+30).
- Therefore the guide text "Evidence outranks heuristics in the score" is **false as an invariant** — needs either weight rebalancing or honest wording.

**MAJOR**
- Postmortem recall: CQL `text ~ "${path}"` tokenizes to `src payments retry js` requiring that sequence in prose — near-zero recall on real postmortem text. The README's seeding checklist implicitly concedes this.
- TWG not demo-ready: no Cypher traversal in repo, no `read:graph:*` scopes (comment only), `sourceUrl` hard-coded `null` (graph evidence never clickable), result shape unverified.
- `inferred` provenance tier is **dead code** — no producer exists; only `graph`/`unavailable` are producible.
- ~41 network calls per webhook; the 15 Confluence searches run **sequentially** (inside `fetchPostmortemCounts`'s loop — contradicting the "PARALLEL" comment in the orchestrator) → Bitbucket ~10s webhook timeout risk → auto-disable.

**MINOR**
- CQL injection via unescaped file path; `json.size` capped at `limit=5` overstates precision; repo-level blast radius uniform; README says "7 tests" (10 exist); silent 15-path evidence cap.

## Missing tests / demo evidence (their list)

- Tier-boundary tests (25/45/70 and the `score>=40` test-delta gate)
- **Any test for `evidence.js` — the differentiator layer is 0% covered**
- An anti-swamping regression test (heuristic-only vs evidence-backed)
- The `inferred` producer — or its removal
- The Cypher traversal text + registration script + scope + seeded Confluence pages + one captured TWG `provenance: 'graph'` response
- The required deploy/install/video deliverables

## Strengths (their words)

- "`src/risk/engine.js` is genuinely pure — 'cannot hallucinate' is mechanically true."
- "One evidence model consumed by four surfaces: guide, digest, Rovo tools, MCP tools — real systems discipline."
- "The with-vs-without postmortems delta test is exactly the right property-test shape."
- "Honest internals: the test comment admits +24 is more than any single heuristic *except max criticality*."

## Verdict on the differentiation claim

"The differentiation claim survives mechanically — the LLM is verifiably absent from the ranking path — but in default configuration this is a path-regex + churn ranker."
