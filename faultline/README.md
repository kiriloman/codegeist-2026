# Faultline 🔍

**Codegeist 2026 entry.** An assignable Rovo agent that defends the reviewer's attention on every pull request.

> **Deployment status (verified):** deployed to Forge development AND production environments, installed on the `bitbucket.org/faultline` workspace, and **working end-to-end on real pull requests** — a Bitbucket PR open on `faultline/faultline-demo` receives the full Review Guide comment (ranked table, risk scores, labeled reasons), re-pushes edit the comment in place (idempotency via stored comment id), and evidence lookups that are unavailable render explicit warnings rather than fake "no history." Evidence layer status: postmortem (Confluence) search requires a companion site app due to Forge's workspace/site scope separation — in progress; Jira blast-radius blast radius requires registering the Cypher traversal (see DEPLOY-STEPS.md). Rovo agent + native `rovo:mcp` are deployed; site-install verification pending. Demo video: pending.

## What it does (the 30-second version)

1. A PR is opened (or updated) on an opted-in Bitbucket repo → Faultline is triggered automatically.
2. It computes a **deterministic risk ranking** of every changed file using a **signal hierarchy where the top evidence signal outweighs any single heuristic** (and every evidence claim is linked, while heuristics are merely labeled):
   - **① Evidence (cited):** postmortem references found in your Confluence incident docs; related Jira work items (blast-radius search)
   - **② Heuristics (labeled):** path criticality (payment/auth/migration…), change size, commit churn, test-delta
3. It posts **one consolidated review guide** on the PR: a ranked table, a suggested review path, and an **Evidence section with links to the actual postmortems** — every claim traceable to data.
4. Reviewers **@mention Faultline in Rovo chat**: "why is retry.js risky?" → it answers **with citations** (postmortem links, scores, evidence), never vibes.
5. The same four tools are exposed via Atlassian's native `rovo:mcp` server module — the "Best App with Atlassian MCP" bonus track.

**Why this is NOT a generic LLM reviewer (the differentiation):** the LLM never reads or reviews code. The guide is 100% deterministic — it cannot hallucinate — and its top signals are things no external AI reviewer can access: your postmortem history and your Jira blast-radius dependencies. Generic reviewers (CodeRabbit, Copilot review) comment on code content; Faultline ranks where a *human's* attention matters, backed by your org's own incident evidence. This is precisely the winning TWG pattern the Codegeist track describes ("mapping hidden dependencies across teams, Compass microservices, and past incidents to predict release risks").

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
  frontend/ (Custom UI)  Admin page: index.html + webpack-bundled React; shows every analysis, transparent
  (entry: frontend.jsx → builds to frontend.js; run `npm run build` before deploy)
  storage.js              KVS wrapper (isolates storage API for easy fixes)
```

## Setup

```bash
npm install -g @forge/cli      # the one required install (terminal tool, not an IDE)
npm install
forge register                 # creates the app id → paste it into manifest.yml
forge deploy
forge install --site faultline1.atlassian.net
```

Then wire the webhook:
1. `forge webtrigger pr-webhook-trigger` → prints the URL
2. Wire the webhook — create it **via the Bitbucket webhooks API** (`POST /2.0/repositories/{ws}/{repo}/hooks`) with the `Authorization: Bearer <token>` header if you set one. The repo-settings UI cannot send custom headers, so API-created webhooks are the reliable path. Triggers: **Pull request: Created**, **Pull request: Commits updated**

Then enable the evidence layer (both optional — the app works on heuristics alone if unset):
```bash
forge variables set SITE_URL "https://faultline1.atlassian.net"   # for postmortem links
forge variables set TWG_BLAST_RADIUS_QUERY_KEY "<queryKey>"         # blast-radius traversal (see below)
forge variables set FAULTLINE_ENDPOINT_TOKEN "<long-random-secret>"  # Bearer auth for both webtriggers (REQUIRED in production)
forge variables set FAULTLINE_GUIDE_FORMAT "list"                 # OPTIONAL: table-free guide rendering
```
**Endpoint auth (fail-closed):** when `FAULTLINE_ENDPOINT_TOKEN` is set, the webhook requires `Authorization: Bearer <token>`. When it is NOT set, endpoints **reject all requests** unless the explicit dev bypass is configured (webhook only) (`forge variables set FAULTLINE_ALLOW_UNAUTHENTICATED 1`) — use that only for `forge tunnel` testing. MCP clients send the header in their endpoint configuration.

**Rovo agent actions:** the dispatcher in `src/resolvers/agent-actions.js` accepts several invocation shapes and infers the action from its arguments, so a shape mismatch degrades gracefully. The agent is not read-only: the `analyze-pr` action runs a fresh analysis on demand.

**MCP (bonus track):** served natively by the `rovo:mcp` manifest module — the four `action` tools are exposed automatically; no custom endpoint to wire.

**Demo seeding checklist (do this before recording):**
- [ ] Create 2–3 Confluence pages with label `postmortem` (e.g., "Checkout outage 2026-03-14") whose body references the demo file paths (`src/payments/retry.js`, …)
- [ ] Demo repo needs real commit history on the files you'll touch (churn signal)
- [ ] Open a PR touching a payment/auth file with NO test changes (drives test-delta + evidence tiers)
- [ ] Register the TWG traversal and set the query key so blast radius shows `graph` provenance, not `unavailable`

**Blast-radius:** served by the companion site app's Jira REST search for related work items. No additional setup needed.

**Practical notes:** installing an app with Jira blast-radius scopes needs an **org admin**, and Rovo requires a **paid plan** — test on a Standard/Premium trial site you administer.

### Run the tests (zero installs)
```bash
node --test tests/engine.test.js tests/guide.test.js tests/cql.test.js
```
29 tests cover the critical properties: the evidence hierarchy (both evidence maxima outweigh every single heuristic — derived from the real weight constants, not literals; +24 for 2 postmortems; graph provenance counts double vs inferred), segment matching with zero substring false positives ("author" never matches auth, "discharge" never matches charge), tier boundaries, score capping, fallback citations, the honestly-documented stacked-heuristics edge case, CQL construction and escaping, TWG shape parsing (unrecognizable → unavailable, never zero), table/list guide formats, evidence-unavailability rendering, cap disclosure, fail-closed auth, and safe body parsing.

## ✅ Deployment-verified platform facts (deploy-learned, not doc-guessed)

- [x] `rovo:agent` uses `prompt` (inline string), no `title`; actions reference `action` module keys
- [x] `action` modules require `function`/`description`/`actionType`/`key`
- [x] `webtrigger` response headers must be `string[]` — string values cause HTTP 424
- [x] Bitbucket Cloud renders `content.raw` markdown (ranked tables confirmed live)
- [x] KVS keys must match `^[a-zA-Z0-9:._\s-#]+$` — no slashes (separator: `.`)
- [x] KVS requires `storage:app` scope + `app.storage.classifications`
- [x] Native `rovo:mcp` module wired and schema-valid
- [x] Confluence search scope: `search:confluence` (site-classified — companion app carries it)
- [x] Bitbucket scopes are workspace-classified — cannot mix with site scopes in one app
- [ ] TWG `customQuery` signature + result shape (verify at traversal registration) and the granular `read:graph:*` scope(s)
- [ ] Register the blast-radius Cypher traversal; paste the queryKey into forge variables

## Demo script (for the video)

1. (5s) Bitbucket repo with history — real, not mocked.
2. (10s) Open PR "Fix double-charge on retry" touching 5 files.
3. (10s) Guide comment appears: ranked table, `retry.js` 🔴 78/100 with 3 cited reasons.
4. (15s) Open the postmortem evidence links — the cited Confluence incident pages open in a click.
5. (30s) Rovo chat: "why is retry.js risky?" → cited answer. "Should I skip the CSS?" → "No — rankings are a starting point, not a verdict."
6. (10s) MCP: the same tools served through the native rovo:mcp module.
