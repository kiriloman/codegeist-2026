# Faultline — Manual Deployment Steps & Submission Kit

Everything from here requires your Atlassian account, your Bitbucket workspace, or
your GitHub account — none of it can be executed from this machine. Steps are in
dependency order; each phase gates the next.

---

## PHASE 0 — Version the repo (5 min, no Atlassian needed)

```bash
cd /Users/kyryloyefimenko/workspace/hackathons/codegeist-2026/faultline
git init
git add README.md LICENSE .gitignore manifest.yml package.json src tests
git commit -m "Faultline v1.3: evidence-first PR risk ranking (Forge, Rovo, MCP, TWG)"
# Create a GitHub repo (private is fine for now; public before submitting) and push:
git remote add origin git@github.com:<you>/faultline.git
git push -u origin main
```

## PHASE 1 — Deploy or die (target: this week)

1. **Create a trial site** you administer: developer.atlassian.com → free Standard/Premium trial (Rovo requires a paid plan).
2. **Install the CLI and register the app:**
   ```bash
   npm install -g @forge/cli
   npm install
   forge register        # browser login → prints the app id
   ```
3. **Paste the printed ARI** over the placeholder in `manifest.yml` (`app.id`).
4. **Deploy:** `forge deploy` — expect validation feedback on the flagged schema points and fix them in this order:
   - `rovo:agent` fields (`icon` form, `title`/`name`, `actions` list shape)
   - `(removed)` value (marked  in the manifest)
   - scope strings (`read:pullrequest:bitbucket`, `write:pullrequest:bitbucket`, `read:repository:bitbucket`, `search:confluence`)
   - `rovo:action` display field (`name` vs `title`)
5. **Install on your site:** `forge install --site faultline1.atlassian.net` (org admin needed).
6. **Smoke test the auth fail-closed default:** with no variables set, the webtriggers reject everything — set the dev bypass for tunnel testing:
   ```bash
   forge variables set FAULTLINE_ALLOW_UNAUTHENTICATED 1
   forge tunnel
   ```
7. **Wire the Bitbucket webhook** on a repo with real commit history — via the API, not the settings UI:
   ```bash
   curl -X POST https://api.bitbucket.org/2.0/repositories/<ws>/<repo>/hooks \
     -u <bitbucket-user>:<app-password> \
     -H "Content-Type: application/json" \
     -d '{"url": "<pr-webhook URL from `forge webtrigger pr-webhook-trigger`>",
          "active": true,
          "events": ["pullrequest:created", "pullrequest:updated"]}'
   ```
8. **Open a real PR** touching a payment/auth file with no test changes. The guide comment must land on the PR. **This is the make-or-break milestone — everything else is secondary until it works.**
9. If the markdown table renders as raw pipes, switch to the list format and redeploy:
   ```bash
   forge variables set FAULTLINE_GUIDE_FORMAT "list"
   ```

## PHASE 2 — Prove the postmortem evidence (next 3–5 days)

1. Set the site base for evidence links:
   ```bash
   forge variables set SITE_URL "https://faultline1.atlassian.net"
   ```
2. **Seed the demo Confluence pages** (paste this content, label each page `postmortem`):
   - Title: `Postmortem: Checkout outage 2026-03-14` — body must contain the literal path `src/payments/retry.js` plus a sentence like "The retry logic in `src/payments/retry.js` double-charged 214 customers."
   - Title: `Postmortem: Double charge on card retries` — body also references `src/payments/retry.js`.
3. Re-open/update the demo PR → the guide must show "📄 referenced in 2 postmortems" with a **clickable link** to the seeded page. If the CQL match fails, test the query in Confluence's search: `(label = "postmortem" OR title ~ "postmortem") AND text ~ "src/payments/retry.js"` and adjust.

## PHASE 3 — Turn on the Jira blast-radius (bonus track)

1. Register a persisted Cypher traversal mapping a Bitbucket repo URL → dependent services (follow the Jira blast-radius "persisted Cypher queries" guide in the Atlassian docs; the app sends `{ repoUrl }` and expects a list of service names — see `(removed)` in `src/risk/cql.js`).
2. ```bash
   # (blast radius uses Jira REST via companion app — no registration needed)
   ```
3. Uncomment/add the matching `read:graph:*` scope in `manifest.yml`, redeploy, reinstall (org admin).
4. Re-run the demo PR → blast-radius evidence should appear as "related Jira work items".

## PHASE 4 — Prove the two interactive surfaces

1. **Rovo chat:** in Jira/Confluence, @Faultline: "why is retry.js risky?", "should I skip the CSS?", "analyze PR #N". Confirm answers carry citations. Tighten the dispatcher's shape handling if needed (log the payload in tunnel).
2. **MCP:** the native `rovo:mcp` manifest module serves the four `faultline_*`-equivalent tools automatically once the app is installed on a site — no custom endpoint to wire. In Rovo-compatible clients, the tools appear alongside the agent; verify one `analyze-pr` round-trip.

## PHASE 5 — Record + submit (by Dec 13–15, first-come prizes)

1. Record ≤5 min following the README demo script (money shot first 20s: 🔴 78/100 + "referenced in 2 postmortems" link click).
2. Devpost submission — draft below. Scrub remaining  markers from the public README before submitting.
3. Submit early; keep Dec 16–22 for judge-feedback fixes only.

---

## Devpost draft (paste and adapt)

**Title:** Faultline — know where the fault lines are before you merge

**One-liner:** Faultline ranks where a reviewer's attention matters on every pull request, using evidence only your org has — your own postmortems and your Jira blast-radius. No LLM writes the review, so it can't hallucinate.

**Which category would you like to submit to?** Productivity Tools (main) — bonus tracks: Best Rovo Agents, Best App with Atlassian MCP, Best Jira blast-radius integration.

**What it does:** When a PR opens, Faultline analyzes every changed file and posts ONE deterministic review guide: a ranked table (risk score, tier, labeled reasons), linked evidence (the actual Confluence postmortems that referenced the file, dependent services from the Jira blast-radius), a suggested review path, and a trust legend. Reviewers @mention the Faultline Rovo agent in chat and get answers with citations — never vibes. The same data is exposed as an MCP server for Claude/Cursor. The guide edits itself (idempotently) when the PR updates. Evidence lookups that fail say so explicitly — a fetch failure never masquerades as "no incident history."

**How we built it:** A two-app Forge architecture: the main app (Bitbucket workspace) handles the webhook → diffstat → deterministic ranking → idempotent PR-comment loop; a companion site app (Jira site) carries the Confluence CQL postmortem search that Forge's workspace/site scope separation forbids mixing into one app, exposed to the main app as an authenticated endpoint. The native `rovo:mcp` module shares the agent's four action tools. Jira REST API search powers the blast-radius tier. The scoring engine is pure, deterministic, and unit-tested — 29 tests pin the evidence hierarchy, the honest edge cases, and the fail-closed auth.

**Challenges / what we're proud of:** Every "AI review" tool has the LLM read the diff. Faultline's LLM never reads code — it only answers questions about deterministic, cited data. The hardest engineering is making honesty structural: unavailable evidence is rendered as unavailable, stacked heuristics are disclosed as beating evidence when they do, and the agent refuses to tell a reviewer to skip a file.

**Built with:** Forge, Rovo agents, MCP, Jira blast-radius, Bitbucket REST API, Confluence CQL, KVS, React (Custom UI), Node.js.
