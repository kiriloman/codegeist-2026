# Codegeist 2026 — Round 2: Adversarial Persona Review

Round 1 (see IDEAS.md) used an approval-oriented panel; all 5 ideas passed. This round uses a **different, adversarial panel** designed to kill weak ideas before we spend 5 weeks on one. Scores are 1–10 per persona. A pass requires ≥ 35/50 with no persona below 5.

## The adversarial panel

- **A1 — The Burned-Out Judge**: has screened 500 AI hackathon demos; allergic to hype; scores originality and whether the "AI" is doing real work or theater.
- **A2 — The Skeptical Senior Dev** (target user): reviews 20 PRs a week; will uninstall anything that wastes his time; scores day-one utility.
- **A3 — The Solo Builder Realist**: one developer, ~5 weekends, must demo by Dec 15; scores buildability and demo-data credibility.
- **A4 — The Post-Hackathon Analyst**: scores whether the app survives contact with the real Marketplace — originality gap, buyer, competition.
- **A5 — The Demo Director**: scores the 3-minute video — is it obvious what's happening within 30 seconds, with no staging tricks.

## Scores

| Idea | A1 Judge | A2 Senior Dev | A3 Builder | A4 Analyst | A5 Demo | Total | Verdict |
|---|---|---|---|---|---|---|---|
| **5. Review Buddy** | 8 | 9 | 8 | 8 | 9 | **42** | ✅ **WINNER — build this** |
| 2. Sprint Retro Pilot | 6 | 8 | 8 | 5 | 8 | 35 | ✅ Pass (fallback) |
| 3. Onboarding Cartographer | 7 | 7 | 6 | 6 | 8 | 34 | ❌ Marginal fail |
| 1. Incident Commander | 7 | 8 | 5 | 6 | 6 | 32 | ❌ Fail |
| 4. Dependency Druid | 6 | 7 | 4 | 6 | 5 | 28 | ❌ Fail |

## Per-idea verdicts (the objections that mattered)

### Review Buddy — 42/50 — WINNER
- **A1 (8):** The AI is *not* doing code review — it builds the human's context and ranks attention. That's the differentiated angle; "AI reviews your code" is a graveyard. Deterministic core + LLM only for chat means the guide can't hallucinate.
- **A2 (9):** "Where do I start in this PR?" is a real daily question with no current answer on Bitbucket. Opt-in per repo, one comment per PR, zero workflow change. Objection: *"Why not just a diff stat?"* → blast-radius ranking from history/blast signals is not visible in a diff stat; that's the product.
- **A3 (8):** Whole pipeline is API reads + deterministic scoring + one comment write. A PR with a diff is trivially demoable with real data — no incident theater required.
- **A4 (8):** Bitbucket has a genuine gap — the good AI review tooling consolidated on GitHub. Marketplace listing is natural; the app monetizes as-is after the event.
- **A5 (9):** 30-second setup shot → PR opens → one guide comment appears with a ranked table → reviewer @mentions the agent in chat, gets a cited answer. Self-explanatory, no narration gymnastics needed.
- **Residual risk:** blast-radius data depends on repo history quality; mitigated by labeled confidence and "verify" flags. Accepted.

### Sprint Retro Pilot — 35/50 — Pass, keep as fallback
Solid and buildable, but A4's objection stuck: retro-AI tools already exist and the differentiation is execution, not concept. If Review Buddy is blocked for any reason, this is the backup.

### Onboarding Cartographer — 34/50 — Marginal fail
A5 loved the demo narrative, but A3 flagged the TWG-coverage dependency: on a fresh demo site the graph is thin and the wow collapses. High variance across tenants = risky bet.

### Incident Commander — 32/50 — Fail
A3's kill shot: the demo *requires* a simulated incident with fake alert plumbing — judges smell staging. A1: incident-AI is also a crowded category. The drama isn't worth the credibility risk for a solo builder.

### Dependency Druid — 28/50 — Fail
A3 (4/10): the implicit-dependency heuristics are a research project, not a 5-week build. A5: demoing heuristics honestly means showing false positives or hiding them — both bad. Revisit as a v2 feature inside Review Buddy (blast radius *is* dependency data), not as a standalone hackathon entry.

## Decision

**Build Review Buddy.** It is the only idea that scored ≥ 8 on the two personas that match the stated goals — A2 (day-one user value: 9) and A5 (obviousness/demo quality: 9) — while also being the most buildable (A3: 8). Implementation target: complete app by **Dec 12**, demo video Dec 14, submit Dec 15 (early, for the first-come participation prizes).

---

## Addendum (v1.1): the "generic LLM reviewer" objection — closed

**Challenge raised:** "Seems like a generic LLM reviewer." Fair against v1: path-pattern criticality is keyword heuristics, and a sharp judge could call it a fancy diff stat. Honest v1 grade: B+.

**v1.1 upgrade (implemented and unit-tested):**

1. **Postmortem evidence** — risk now carries cited links into the org's own Confluence incident docs. "This file appeared in 3 postmortems" is the strongest citation a review guide can make, and it is structurally unavailable to every generic reviewer (they don't have your Confluence).
2. **Teamwork Graph blast radius** — dependent services from the per-site TWG GraphQL API (verified real: Preview since Oct 2026, curated queries + persisted Cypher traversals). This is literally the winning-pattern description in the Codegeist TWG track ("hidden dependencies across teams, Compass microservices, and past incidents to predict release risks").
3. **Signal hierarchy enforced and tested** — evidence outranks heuristics by design: 2 postmortems = +24 (more than any heuristic except max criticality); graph-proven dependencies count double vs inferred; provenance is labeled in the output. 7/7 unit tests pass, including the evidence-dominance property itself.

The LLM never reads or reviews code in any version — it was never a code critic. What changed in v1.1: the deterministic core now runs on the org's own evidence, which no external AI reviewer can access. **Revised grade: A-grade differentiation**, pending only the deploy-time schema verifications listed in the README.
