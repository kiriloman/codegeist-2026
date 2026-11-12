# Reviewer 3 — AI Agent Product Lead (independent agent, no conversation context)

**FINAL RATING: 6 / 10** — "Strong, honest design; unproven and unshipped product."

## Verdict (condensed)

The architectural instinct — LLM never touches the output path, deterministic scoring with a cited evidence hierarchy, LLM confined to citation-only chat — is exactly how you build a trustworthy agent, and the system prompt is genuinely excellent. But as submitted it is a well-engineered *concept*, not a shipped agent: every platform seam carries an honest [VERIFY] marker meaning it has never been executed.

## Key findings

**BLOCKER**
- `src/storage.js` line 6: `import Kvs from '@forge/kvs'` then `Kvs.default || Kvs` — the package exports a **named** `kvs`, so `kvs` is `undefined` and every storage call throws, killing webhook, agent tools, MCP, and admin page simultaneously.
- Zero authentication on both webtriggers: `faultline_list_recent_analyses` returns site-wide repo names, PR titles, and risk data to anyone holding the URL; the webhook accepts unsigned posts.

**MAJOR**
- Markdown table may not render in Bitbucket PR comments (`content.raw`, [VERIFY]) — if stripped, the reviewer's first 60 seconds are raw pipe characters. No table-free fallback.
- Demo script step 4 promises "Click a reason → evidence (diff/commits)" — reasons are plain text; only postmortem evidence is linked. Unimplemented demo step.
- `get-file-risk` requires exact path match — chat dies on the first typo; no valid-path list in the error.
- `list-open-prs` only surveys already-analyzed repos — cold start = empty list.
- MCP client-interop gaps: no `notifications/initialized` handling (returns a protocol error for a notification — violates JSON-RPC), ignores client's protocolVersion, tool failures returned as `-32000` protocol errors instead of tool results with `isError: true`.

**MINOR**
- README "7 tests" vs actual 10; `node --test tests/` directory form fails on Node 25; postmortem count capped at `limit=5` while reason text implies precision; duplicate `recentAnalyses` resolver in frontend; missing React keys.

## Strengths (their words)

- "Best-in-class instructions (`src/agent/instructions.md`)" — facts confined to tool output, "quote it, don't paraphrase," legitimizes "I don't know," hard-codes "You never tell a reviewer to skip a file."
- "Hallucination structurally prevented in the guide path — verified by code."
- "MCP handler is real, not fake" — correct JSON-RPC 2.0 envelopes, typed schemas.
- Citation integrity under failure (fallback evidence entries rather than dropped claims).
