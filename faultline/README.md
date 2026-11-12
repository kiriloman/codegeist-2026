# Faultline 🔍

**Codegeist 2026 entry.** An assignable Rovo agent that defends the reviewer's attention on every pull request.

## What it does (the 30-second version)

1. A PR is opened (or updated) on an opted-in Bitbucket repo → Faultline is triggered automatically.
2. It computes a **deterministic risk ranking** of every changed file using a **signal hierarchy where the top evidence signal outweighs any single heuristic** (and every evidence claim is linked, while heuristics are merely labeled):
   - **① Evidence (cited):** postmortem references found in your Confluence incident docs; dependent services from the Teamwork Graph
   - **② Heuristics (labeled):** path criticality (payment/auth/migration…), change size, commit churn, test-delta
3. It posts **one consolidated review guide** on the PR: a ranked table, a suggested review path, and an **Evidence section with links to the actual postmortems** — every claim traceable to data.
4. Reviewers **@mention Faultline in Rovo chat**: "why is retry.js risky?" → it answers **with citations** (postmortem links, scores, evidence), never vibes.
5. MCP tools expose `get_review_context` / `get_blast_radius` to any MCP client (Claude, Cursor, Rovo Studio).

**Why this is NOT a generic LLM reviewer (the differentiation):** the LLM never reads or reviews code. The guide is 100% deterministic — it cannot hallucinate — and its top signals are things no external AI reviewer can access: your postmortem history and your Teamwork Graph dependencies. Generic reviewers (CodeRabbit, Copilot review) comment on code content; Faultline ranks where a *human's* attention matters, backed by your org's own incident evidence. This is precisely the winning TWG pattern the Codegeist track describes ("mapping hidden dependencies across teams, Compass microservices, and past incidents to predict release risks").

**Design principle (the "outstanding" part):** the guide is 100% deterministic — no LLM in the output path, so it cannot hallucinate. The LLM only powers the chat Q&A, and its system prompt forbids stating anything not present in the stored analysis. Rankings are advisory: the agent explicitly never tells a reviewer to skip a file.

## Repo layout

```
manifest.yml              Forge app manifest (rovo:agent, rovo:action, webtrigger, admin page)
src/
  risk/engine.js          Deterministic blast-radius scoring (THE CORE — pure, unit-testable)
  risk/guide.js           Renders the PR comment guide + chat digest
  resolvers/
    pr-webhook.js         Webtrigger entry: Bitbucket PR webhook → analysis → comment
    analyze-pr.js         Orchestration: Bitbucket API → engine → comment → storage
    agent-actions.js      Rovo agent tools: list PRs, get context, get file risk
    index.js              Function handler wiring
  agent/instructions.md   Rovo agent system prompt (citation discipline)
  frontend/index.jsx      Admin page: activity + every analysis, transparent
  storage.js              KVS wrapper (isolates storage API for easy fixes)
```

## Setup

```bash
npm install -g @forge/cli      # the one required install (terminal tool, not an IDE)
npm install
forge register                 # creates the app id → paste it into manifest.yml
forge deploy
forge install --site <yoursite>.atlassian.net
```

Then wire the webhook:
1. `forge webtrigger pr-webhook` → prints the URL
2. Wire the webhook — create it **via the Bitbucket webhooks API** (`POST /2.0/repositories/{ws}/{repo}/hooks`) with the `Authorization: Bearer <token>` header if you set one. The repo-settings UI cannot send custom headers, so API-created webhooks are the reliable path. Triggers: **Pull request: Created**, **Pull request: Commits updated**

Then enable the evidence layer (both optional — the app works on heuristics alone if unset):
```bash
forge variables set SITE_URL "https://<your-site>.atlassian.net"   # for postmortem links
forge variables set TWG_BLAST_RADIUS_QUERY_KEY "<queryKey>"         # blast-radius traversal (see below)
forge variables set FAULTLINE_ENDPOINT_TOKEN "<long-random-secret>"  # Bearer auth for both webtriggers (REQUIRED in production)
forge variables set FAULTLINE_GUIDE_FORMAT "list"                 # OPTIONAL: table-free guide rendering
```
**Endpoint auth (fail-closed):** when `FAULTLINE_ENDPOINT_TOKEN` is set, both webtriggers require `Authorization: Bearer <token>`. When it is NOT set, endpoints **reject all requests** unless the explicit dev bypass is configured (`forge variables set FAULTLINE_ALLOW_UNAUTHENTICATED 1`) — use that only for `forge tunnel` testing. MCP clients send the header in their endpoint configuration.

**Rovo agent actions:** the dispatcher in `src/resolvers/agent-actions.js` accepts several invocation shapes and infers the action from its arguments, so a shape mismatch degrades gracefully — [VERIFY] the exact rovo:action payload shape on first deploy and tighten if desired. The agent is not read-only: the `analyze-pr` action runs a fresh analysis on demand.

**MCP endpoint (bonus track):** `forge webtrigger mcp-endpoint` prints the URL — point any MCP client (Claude, Cursor, Rovo Studio) at it. It speaks JSON-RPC 2.0 MCP: `initialize`, `tools/list`, `tools/call` with four `faultline_*` tools, including `faultline_analyze_pr` for on-demand analysis.

**Demo seeding checklist (do this before recording):**
- [ ] Create 2–3 Confluence pages with label `postmortem` (e.g., "Checkout outage 2026-03-14") whose body references the demo file paths (`src/payments/retry.js`, …)
- [ ] Demo repo needs real commit history on the files you'll touch (churn signal)
- [ ] Open a PR touching a payment/auth file with NO test changes (drives test-delta + evidence tiers)
- [ ] Register the TWG traversal and set the query key so blast radius shows `graph` provenance, not `unavailable`

**Teamwork Graph setup:** register a persisted Cypher traversal that maps a Bitbucket repo URL → dependent services/components, take the `queryKey` it returns, and set it as above. The graph call goes to the per-site endpoint `/gateway/api/graphql/twg` (Preview, Oct 2026). If not configured, the guide states that blast-radius evidence is unavailable (rendered explicitly — never silently dropped) and postmortem evidence still works.

**Practical notes:** installing an app with Teamwork Graph scopes needs an **org admin**, and Rovo requires a **paid plan** — test on a Standard/Premium trial site you administer.

### Run the tests (zero installs)
```bash
node --test tests/engine.test.js tests/guide.test.js tests/cql.test.js
```
29 tests cover the critical properties: the evidence hierarchy (both evidence maxima outweigh every single heuristic — derived from the real weight constants, not literals; +24 for 2 postmortems; graph provenance counts double vs inferred), segment matching with zero substring false positives ("author" never matches auth, "discharge" never matches charge), tier boundaries, score capping, fallback citations, the honestly-documented stacked-heuristics edge case, CQL construction and escaping, TWG shape parsing (unrecognizable → unavailable, never zero), table/list guide formats, evidence-unavailability rendering, cap disclosure, fail-closed auth, and safe body parsing.

## ⚠️ Verify against current docs during setup (schema drift)

- [ ] `rovo:agent` / `rovo:action` field names — developer.atlassian.com Forge manifest reference (module names confirmed from Codegeist 2026 materials; exact fields may differ)
- [ ] `webtrigger` handler signature (payload shape)
- [ ] Bitbucket comment API body for markdown rendering (`content.raw`)
- [ ] KVS import style (see `src/storage.js` — one place to fix)
- [ ] MCP server module name for exposing tools externally (bonus track) — add once confirmed
- [ ] Confluence search scope name for postmortem CQL (`read:confluence-contents`?)
- [ ] TWG `customQuery` signature + result shape (`src/resolvers/evidence.js`) and the granular `read:graph:*` scope(s) for the registered traversal
- [ ] Register the blast-radius Cypher traversal; paste the queryKey into forge variables

## Demo script (for the video)

1. (5s) Bitbucket repo with history — real, not mocked.
2. (10s) Open PR "Fix double-charge on retry" touching 5 files.
3. (10s) Guide comment appears: ranked table, `retry.js` 🔴 78/100 with 3 cited reasons.
4. (15s) Open the postmortem evidence links — the cited Confluence incident pages open in a click.
5. (30s) Rovo chat: "why is retry.js risky?" → cited answer. "Should I skip the CSS?" → "No — rankings are a starting point, not a verdict."
6. (10s) MCP: same data queried from Claude/Cursor.
