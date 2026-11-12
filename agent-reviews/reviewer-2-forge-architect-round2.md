# ROUND 2 — Reviewer 2 — Senior Forge Platform Architect (fresh agent, no conversation context)

**FINAL RATING: 7 / 10** (Round 1: 5/10 — +2 after fixes were verified)

*"The platform usage is structurally sound and nearly all of it is correct by inspection — one honest round of first-deploy probing away from an 8–9."*

## Verified improvements

- "All blockers from the prior review iteration are **verifiably fixed** in this code."
- Manifest parses clean (verified with a YAML parser): single webtrigger block, all three function handlers resolve, jira:globalPage → resources → frontend chain complete.
- "Bitbucket PR comment API usage is correct... **High confidence, no [VERIFY] needed**."
- "Scopes are real strings... `search:confluence` is a real Confluence scope (the README's own doubt was unfounded)."
- "MCP endpoint is genuinely spec-conformant for a stateless server."
- Estimated: **~85–90% chance `forge deploy` succeeds; ~50–60% the full demo path works on first attempt** until the silent-failure seams below are probed.

## Remaining findings

**BLOCKER**
- Not deployed (placeholder ARI, no git repo, no install link, no video) — "process, not code."

**MAJOR — three silent-failure seams (each a one-line fix):**
1. Confluence path prefix may double `/wiki` (`/wiki/rest/api/search` → 404 via `requestConfluence` base) — postmortem evidence silently vanishes. Fix: probe both forms on first deploy.
2. Missing `read:repository:bitbucket` scope for the commits churn call (~70% conf.) — silent `touchCount: 0`. Fix: add scope preemptively.
3. Webhook payload `repository.workspace.slug` assumption (~60% present) — if absent, the primary trigger never fires. Fix: `|| repository?.full_name?.split('/')[0]` fallback.

**MAJOR**
- TWG integration 100% speculative pre-deploy (isolated to `evidence.js` — probe during traversal registration).

**MINOR**
- `rovo:agent` possibly requires `icon` (~65% conf.) — clear one-line fix if flagged at register.
- KVS activity-index race; 40+ parallel calls with no 429 backoff; diffstat pagination.

## Their deploy checklist (11 steps) is in the full report — the critical ones:
register → deploy → **test one PR and require `ok: true`** → probe Confluence path → verify churn non-zero → pin the rovo action payload shape in tunnel logs → real MCP client round-trip → register TWG traversal + scopes → re-run tests.
