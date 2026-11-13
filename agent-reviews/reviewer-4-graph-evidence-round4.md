# ROUND 4 — Reviewer 4 — Graph/Evidence Specialist (fresh agent, clean context)

**FINAL RATING: 6.5 / 10** (R1: 5 → R2: 5 → R3: 6 → R4: **6.5**)

*"The honesty engineering is the real deal; the graph integration is scaffolding... 'evidence over heuristics' is a load-bearing wall built one app short of the ground."*

## Confirmed gains

- "Fetch-failure vs. absence is enforced all the way to pixels" — end-to-end through orchestration, rendering, digest, agent tools.
- Weight hierarchy "enforced in code, not just prose" — tests derive from real constants.
- `parseTwgDependents` semantics praised: "the single most important correctness decision in a graph-integration risk system."
- "The deterministic guide claim is verifiably true: there is no LLM call anywhere in the output pipeline."

## Findings

1. **MAJOR (same bug as Head Judge): agent warnings mislabel** — the filter-before-map ternary always falls to blast-radius branch; "the exact fetch-failure/absence conflation this app's identity is built against."
2. **MAJOR: TWG scope-classification risk** — if `read:graph:*` scopes are site-classified, the workspace app can't carry them (same wall that killed Confluence). "Must be tested by actually adding the scope and deploying, before the video."
3. **MAJOR: hierarchy framing** — 1-2 postmortems (+14/+24) sit BELOW the payment heuristic (+30); only 3+ postmortems or 5+ deps outrank it. README wording overclaims relative to weak evidence hits.
4. **MAJOR: no tests for orchestration/agent-actions logic** — where the confirmed bug lives.
5. MINOR: MAX_EVIDENCE_SIGNALS duplicate of magic numbers (drift-tautological); evidencePathsCovered hardcoded 15; stale manifest comment re 403; KVS key dot-ambiguity edge case.

## Their path to 8

"Fix the agent-actions mislabel, land the traversal registration (with the scope-mixing question answered empirically), and capture one live graph-derived score — that alone moves this to 8."

## Missing demo evidence list

- The Cypher traversal text itself in-repo (judges should see the actual graph query)
- One captured artifact of a live TWG call succeeding
- Screenshot/PR of the guide WITH the honest unavailability warnings (worth showing in the video — demonstrates the honesty design)
- Devpost "How we built it" must state the Confluence layer is disabled in the shipped app or "the honesty story inverts"
