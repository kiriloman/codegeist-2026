# ROUND 2 — Reviewer 4 — Teamwork Graph & Evidence Specialist (fresh agent, no conversation context)

**FINAL RATING: 5 / 10** (Round 1: 5/10 — verified the Round-1 fixes, then went deeper into evidence substance)

*"The hierarchy is real code with honest wording and a tested pure core, but the evidence layer is a literal path-grep over Confluence plus a repo-level, unregistered, un-linkable graph offset — real but thin, and nothing is demonstrated on a live site."*

## What they verified

- 12/12 tests pass; the honesty wording is "precisely scoped and test-pinned"; the postmortem citation chain exists end-to-end in code (CQL → refs → engine → linked guide → digest); determinism genuine; degradation discipline real.

## Remaining findings (their execution probes)

**BLOCKER — blast radius cannot differentiate files within a PR**
- The repo-level `blast.dependents` list is attached to every code file: the TWG signal is a **constant additive offset (+8/+16/+24) with zero contribution to relative ranking** — "it only separates code from CSS." Per-path/component mapping (file → owning service → that service's dependents) is what would make graph evidence earn its "EVIDENCE:" prefix.

**BLOCKER — graph evidence can never be linked**
- `sourceUrl: null` always, no code path populates `dependentsSourceUrl` → "every evidence claim is linked" (README) is a false invariant for the entire TWG tier. Fix: link or drop the wording.

**MAJOR — hierarchy only holds at 3+ postmortems (executed)**
- `incidentCount: 1` → 24 → 🟢 LOW; `incidentCount: 2` → 34 → 🟡 STANDARD — "an evidence-cited file displays 🟢 with an 📄 EVIDENCE reason — icon contradicts the evidence line."
- Strongest **graph** signal (+24) < strongest single heuristic (+30): "the 'top evidence signal outweighs any single heuristic' is true only of postmortems — **not of the TWG signal the bonus track is judged on** — and no test documents this asymmetry."

**MAJOR — postmortem matching is a literal path-grep**
- Real postmortems say "the retry logic double-charged," not "src/payments/retry.js"; CQL tokenization can also inflate matches. "Heuristic-grade precision wearing an EVIDENCE: label — the clickable citation is the mitigation."

**MAJOR — absence-of-evidence vs evidence-of-absence**
- A 429 on the CQL search silently becomes `count: 0` → the guide confidently asserts no incident history. TWG has an `unavailable` state; the top-tier postmortem signal has no failure provenance at all.

**MAJOR — silent caps** (15/25/100, undisclosed in output) and **the invariant test pins stale constants** (hardcoded 30/34 instead of importing `CRITICALITY` — raise the payment weight and the test still passes while the legend becomes false).

**MAJOR — evidence.js (the differentiator) is 0% tested.**

**MINOR**
- `src/payments/logo.png` gets "payment-critical path" from directory-name matching; the `score >= 40` test-delta gate is non-additive and undocumented; fuzzy chat fallback can return the wrong file for short needles.

## Their improvement list
- Postmortem evidence should boost tier floor (1 postmortem ≥ STANDARD, 2 ≥ ELEVATED) or reword
- Per-file graph mapping via component ownership
- Derive the invariant test from exported weights
- Extract a pure CQL builder + tests with mocked API for the failure path
- Partial-coverage disclosure for capped PRs
