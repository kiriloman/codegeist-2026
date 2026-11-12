# ROUND 3 — Reviewer 1 — Head Judge (fresh agent, scrubbed repo, no iteration traces)

**FINAL RATING: 5 / 10**

*"One of the rare entries in the 'AI code review' pile whose differentiation claim survives a code read... but the app as submitted is a well-engineered skeleton wearing a champion's jersey."*

## Verdict

The LLM genuinely does not touch the ranking path, and the Confluence-postmortem-as-evidence idea is "the most original thing here." But both evidence layers are "unverified scaffolding that no one has ever seen run," the engine underneath is "~50 lines of regex keyword-matching," and none of the four required deliverables exist. "If everything deploys first-try and the demo is seeded well, this is a bonus-track contender; if the TWG query shape is wrong or the CQL matching misfires, the demo collapses into a grep-with-a-bot."

## Findings

**BLOCKER**
- Nothing deployed; every Atlassian surface behind [VERIFY] ("written to survive first deployment... but 'survives' is not 'works'").
- TWG is "vaporware-in-code": the `inferred` provenance test "is a test of dead code"; if the traversal registration fails, the TWG bonus is forfeited.

**MAJOR**
- CQL `text ~` tokenizes paths → any postmortem mentioning "payments" or "retry" counts as evidence; escape only handles `"`. Needs tighter matching (quoted phrase or stripped slashes) verified against real Confluence.
- **"The deterministic engine is shallow enough that judges will see through it"** — six regexes; strip the evidence layers and "the product is a keyword-weighted diff sorter... essentially grep | sort. Expect at least one judge to ask 'why is this better than a CODEOWNERS file plus CI size warnings?'"
- Auth default inverted (open when token unset) — "the safe default is inverted."
- Demo entirely dependent on seeded best-case data; `pagelen=100` and `slice(0,25)` silently mis-rank large PRs.

**MINOR**
- Activity-index race; zero tests on payload parsing/MCP dispatch/fuzzy matcher (exactly where unverified shapes will bite); declined/merged PRs get analyzed and commented (`pr.state` never checked); `touchCount` saturates at 30 commits ("the 'changed 11×' narrative is fuzzy math").

## Confirmed strengths

- Differentiation "architecturally real, not marketing" (zero LLM calls in engine).
- Idea "maps exactly to the Codegeist TWG bonus track" — "a real reframing: where should the human look."
- 12/12 tests (executed); claim-discipline "rare."
- MCP "spec-literate, not cargo-culted"; idempotency and failure tolerance "thought through"; transparency admin page "a designed feature."

## Their trajectory

"~6 weeks of focused work (deploy, verify every [VERIFY], tighten the CQL matching, register the TWG traversal, record the seeded demo) → plausibly a 7–8 bonus-track contender."
