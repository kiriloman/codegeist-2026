# Reviewer 2 — Senior Forge Platform Architect (independent agent, no conversation context)

**FINAL RATING: 5 / 10** — "As submitted it fails `forge deploy` on three mechanical manifest errors plus a likely KVS runtime breaker — but every failure is a one-line fix, the deterministic core is excellent and fully tested."

## Verdict (condensed)

As submitted, this app **will not deploy**, and after the manifest is fixed there is one high-probability runtime breaker. This reviewer verified empirically (parsed the YAML with a standard parser): the duplicate top-level `webtrigger:` key silently discards `pr-webhook` (last-key-wins), killing the app's primary entry point. Second, the `function` handlers (`index.runPrWebhook` etc.) resolve to `src/index.js`, **which does not exist** (the barrel is at `src/resolvers/index.js`) — deploy fails handler resolution. Third, `response.responseType` on webtrigger is almost certainly not in the manifest schema (strict validation rejects unknown module properties). The `storage.js` KVS import dance cannot recover the package's **named** `kvs` export → every write path throws, swallowed by the webhook's catch-all → the app would **silently never post a guide**.

## Key findings

**BLOCKER (verified by parse)**
- Duplicate `webtrigger:` key drops `pr-webhook`. Fix: merge into one list.

**BLOCKER**
- Handlers point to nonexistent `src/index.js`. Fix: `resolvers/index.runPrWebhook` etc.

**BLOCKER (~85% conf.)**
- `response.responseType` not a webtrigger schema field; strict validation rejects it. Fix: delete the `response:` blocks.

**MAJOR**
- `storage.js:3-5` — default import of `@forge/kvs` can't reach the named `kvs` export → silent total failure of all writes. Fix: `import { kvs } from '@forge/kvs'`.
- Missing `read:pullrequest:bitbucket` scope for diffstat/commits/PR-list reads → permanent 403s.
- `read:confluence-contents` probably not a valid scope string; CQL search wants `search:confluence` (~65% conf.).
- Webtrigger handlers don't handle a raw JSON **string** body (add `typeof === 'string' → JSON.parse`).
- `rovo:action` stanzas lack `name`/`description`, likely required (~70% conf.).

**MINOR**
- TWG scopes only in comments; MCP notifications should return no body; sequential Confluence lookups; keyless React fragments; racy activity index; `pagelen=100` without pagination; CJS/ESM mixing (should bundle, non-idiomatic).

## Deploy-time checklist (their 12 steps, condensed)

1. Merge `webtrigger:` stanzas 2. Fix handler paths → `resolvers/index.*` 3. Delete `response.responseType` 4. Real app ARI 5. Fix KVS import 6. Add `read:pullrequest:bitbucket`; swap Confluence scope → `search:confluence` 7. Add `name`/`description` to `rovo:action` 8. String-body parsing + real webhook/MCP smoke tests 9. Verify `{content:{raw}}` markdown 10. Register TWG traversal + scopes (org admin; Rovo needs paid/trial site) 11. E2E: PR → guide comment **and** admin-page appearance 12. Full MCP round-trip from a real client before recording.

## [VERIFY] strategy assessment (their words)

"The strategy worked — every flagged item is isolated to a single decision point. None is structural. The only *unflagged* problems are the duplicate YAML key and handler paths, both of which the first `forge deploy` would have surfaced immediately."

## Strengths (their words)

- "Pure, tested core — the 'cannot hallucinate' claim is true of the code, and 10 passing tests prove the claimed differentiation property."
- "Idempotent comment upsert — the right anti-spam pattern."
- "Real rate-limit discipline: 25-file churn cap, 15-path CQL cap, 3-ref citation cap, grouped under one Promise.all."
- "Correct UI Kit 1 shape — a genuinely transparent judge panel."
