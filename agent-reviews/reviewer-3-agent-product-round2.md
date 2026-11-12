# ROUND 2 — Reviewer 3 — AI Agent Product Lead (fresh agent, no conversation context)

**FINAL RATING: 7 / 10** (Round 1: 6/10 — +1 after fixes were verified)

*"The agent design — citation-disciplined instructions, deterministic non-hallucinating output, LLM-friendly tool errors, and a real MCP server — is top-decile for a hackathon."*

## Verified improvements

- "This is a genuinely well-designed agent product, **not agent theater**."
- "The chat agent's system prompt is one of the best-crafted I've seen at a hackathon."
- "Tool errors are written for the LLM consumer... This is how you keep an agent from flailing."
- "Invocation-shape defense... the team correctly identified the wrong-shape guess as the top silent-failure risk."
- MCP upgraded from "gaps" to "real... A standard client would interoperate modulo minor deviations."

## Remaining findings

**BLOCKER**
- Zero deliverables (same as all reviewers).

**MAJOR (new findings this round)**
1. **Action-parameter contract never declared where the model sees it**: `rovo:action` descriptions don't state that `get-review-context` needs `{ws, repo, prId}`, and `listOpenPrs` returns `repo: "workspace/slug"` combined — the agent must infer to split it before its next call. "Expected first-demo failure." Fix: state arguments in each description; return `workspace` and `repo` separately.
2. **Table rendering assumption**: Bitbucket Cloud PR comments historically render a limited markdown subset that may exclude tables; a list-based fallback must exist before recording the video.
3. **Silent caps contradict trust claims**: diffstat `pagelen=100` without pagination, churn capped at 25, postmortems at 15 — "large PRs get a complete-looking ranking with undisclosed missing evidence."
4. **Deterministic-but-wrong reasons from substring regexes**: `author` matches the `auth` criticality rule (+28, "authentication / security surface" label) — "since the pitch is deterministic, cannot be wrong, false positives are more damaging here than LLM mistakes. Add word-boundary matching."

**MINOR**
- Auth defaults open when token unset; plain `===` token compare.
- MCP: blindly echoes unsupported protocolVersion (spec: respond with a supported one); missing `method` should be `-32600`, not `-32601`.
- Digest drops evidence URLs (only `e.text`), making "I answer with links" fragile.
- `getFileRisk` missing-prId error is confusing vs `getReviewContext`'s clear one.
- `inferred` provenance dead code; CQL path matching likely near-zero in practice.
