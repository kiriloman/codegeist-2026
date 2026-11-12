# ROUND 3 — Reviewer 4 — Teamwork Graph & Evidence Specialist (fresh agent, scrubbed repo)

**FINAL RATING: 6 / 10** (up from 5)

*"An honest, well-tested scoring skeleton wearing an evidence costume that hasn't been proven to fit... real but thin, and not yet demonstrated."*

## Key new findings (their sharpest yet)

**BLOCKER — evidence-fetch failure is indistinguishable from absence of evidence.**
A failed Confluence search (wrong scope, 429, malformed CQL) returns null → `incidentCount: 0` → the file scores as if no postmortems exist, with zero user-visible marker. "For the graph there is a provenance model, but for postmortems — the *strongest* tier — there is no 'unavailable' state at all... the single most likely deploy-time failure produces a silently heuristic-only guide, which is precisely the app the README says it is not." Fix: thread `postmortemsStatus` through to the guide.

**MAJOR — the README's "blast radius reports unavailable" claim is false as implemented.** The `unavailable` reason field is never rendered anywhere (engine skips deps=0, guide shows only non-empty evidence, admin shows reasons only, MCP tool filters to existing entries). "The provenance triad is honest in the data model and a fig leaf in every user-facing surface."

**MAJOR — the "documented edge case" test doesn't pin its claimed property.** The heuristic file scores 66, the evidence file 80 — the heuristic file *loses by 14*; the tie is never demonstrated, and the final assertion compares hardcoded literals (34 > 30), not engine behavior. "It *looks* like it pins the honesty of the legend while pinning nothing of the kind."

**MAJOR — legend weight claim is false for the graph tier.** Max graph weight 24 < payment heuristic 30: a graph-evidence file (34) scores below a heuristic-only payment file (40) — yet graph reasons get the "🌐 EVIDENCE" label. "Either raise max graph weight above 30 or scope the legend claim to postmortems explicitly."

**MAJOR — CQL recall:** "the demo evidence is manufactured to fit the fetcher, not the reverse."

**MINOR:** postmortem count is page size (limit=5) not total; `SITE_URL` unset yields broken relative links; README names the MCP tools wrong (`get_review_context` vs `faultline_get_review_context`).

## Missing (their list)
Evidence-fetcher tests (the differentiator is 0% covered); a real stacked-heuristic-beats-evidence case; graph-vs-heuristic invariant; exact tier-boundary tests (69/70, 44/45, 24/25 — current tests land mid-tier); orchestration tests; sample Cypher traversal + registration script in-repo; one recorded `graph`-provenance run; a negative-mode screenshot.
