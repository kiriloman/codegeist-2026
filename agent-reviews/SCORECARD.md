# Faultline — Independent Agent Review Scorecard (3 rounds, 15 reviews)

Five independent reviewer agents per round. Round 1: original code. Round 2: after fixes (repo contaminated with iteration traces). Round 3: **clean-context** — repo scrubbed of all review artifacts and iteration comments; prompts rules-only, file-writing prohibited. All reviewers executed the test suite; several parsed the manifest and ran the engine directly.

## Scores

| Reviewer | Round 1 | Round 2 | Round 3 (clean) |
|---|---|---|---|
| R1 — Head Judge | 7 | 5 | **5** |
| R2 — Forge Architect | 5 | 7 | **7** |
| R3 — Agent Product Lead | 6 | 7 | **7** |
| R4 — Graph/Evidence Specialist | 5 | 5 | **6** |
| R5 — Codegeist Veteran | 4 | 6 | **5** |
| **Average** | **5.4** | **6.0** | **6.0** |

## The three-round conclusion (what 15 independent reviews agree on)

1. **The architecture is repeatedly rated finalist-grade.** R5: "a 9/10 architecture wearing a 3/10 delivery record." R1: "one of the rare entries whose differentiation claim survives a code read." R3: "best-in-class agent-product thinking." The pure deterministic engine, citation discipline, anti-skip stance, MCP conformance, and test-pinned honest claims were praised in every round by every persona.
2. **The score is pinned at 5–7 by exactly two factors, both outside the repo:** (a) the app has never been deployed — 0/4 required deliverables; (b) the two evidence layers (Confluence CQL, TWG) are unverified scaffolding. Every single reviewer, in every round, listed these as the top blockers.
3. **A fourth code-only iteration cannot move the score.** Round 2 (with fixes) and round 3 (clean context, same code) both averaged exactly 6.0 — the panel has converged; the ceiling for an undeployed entry is structural.

## Consolidated remaining fix list (from round 3, the sharpest round)

**Code-fixable (worth doing, worth ~+1 in a future review):**
1. `analyze-pr` rovo:action — the agent is read-only; "Faultline, analyze PR #51" fails cold (R3's best finding; one switch-case)
2. Render the unavailable state — postmortem failures silently masquerade as "no incident history"; the `unavailable` reason is never shown anywhere (R4 blocker)
3. Graph tier weight (24) < payment heuristic (30) — the legend claim "top evidence signal outweighs any single heuristic" is false for TWG; raise the weight or scope the claim (R4)
4. Fix the "documented edge case" test — it asserts ≥60/≥60, not the claimed tie (R4)
5. Regex word boundaries (`author` ≠ auth, `discharge` ≠ charge) (R3/R4)
6. Markdown table fallback renderer for Bitbucket PR comments (R3/R5)
7. Manifest: `icon` on rovo:agent, `permissions.fraudProtection` (R2, ~70–75% conf.)
8. Webhook workspace fallback, auth fail-closed default, Bitbucket custom-headers-via-API-only README correction (R2)
9. Split `workspace`/`repo` in listOpenPrs + action-arg contracts in descriptions (R3)
10. PR state check (skip declined/merged), fan-out batching with 429 logging, diffstat pagination disclosure (R1/R2/R5)
11. Evidence-fetcher tests with mocked @forge/api (R4: "the differentiator is 0% covered")

**Deployment-only (worth +2–3, requires the developer's Atlassian site):**
12. forge register → deploy → install link; resolve every [VERIFY] against live APIs
13. Register the TWG traversal + scopes; verify `graph` provenance end-to-end
14. Seed postmortems; verify CQL against real pages (tokenization risk)
15. Real Rovo chat + real MCP client round-trips; record video; git repo + push; Devpost submission by Dec 13–15
