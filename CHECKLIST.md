# Codegeist 2026 (Atlassian) — Submission Checklist

## Event facts
- **Organizer:** Atlassian (US) — run on Devpost
- **Deadline:** December 22, 2026, 12:00 PM PT (21:00 CET) — [VERIFY exact hour on codegeist2026.devpost.com]
- **Format:** 100% online, free, worldwide. Adults (age of majority); individuals or teams. Standard country exclusions apply (Iran, Russia, Cuba, etc.) — EU countries are fine.
- **Prize pool:** $120,000 cash — three main-track first prizes of $15,000 each, plus bonus tracks.
- **Active window:** Oct 27 – Dec 22, 2026.

## What to build
A context-aware app on the **Atlassian Forge** platform (serverless, cloud-hosted). Emphasis areas this year:
- **Assignable Rovo agents** (`rovo:agent`, `rovo:agentConnector`, `rovo:skill` / `rovo:action` modules)
- **MCP servers exposed from a Forge app** (Model Context Protocol)
- **Teamwork Graph (TWG) integration** — connecting external data into the graph
- Solves workflow friction across Jira, Confluence, Bitbucket, Compass

## ⚠️ Tooling note
Forge apps are developed and deployed via the **Forge CLI** (`npm install -g @forge/cli`) — a terminal tool, not an IDE; the app runtime itself is Atlassian's cloud. If a strict "no installs at all" rule applies, this event conflicts with it — decide before investing time.

## Deliverables (all required)
- [ ] Working app **deployed on Atlassian Forge** (not just source code)
- [ ] **Installation link for judges** (Forge → "Start sharing your app" → paste link into submission)
- [ ] **Source repository** (public, readable)
- [ ] **Demo video under 5 minutes**, public on YouTube — must show real functionality, not mocks
- [ ] Submission to one main category (Software Teams / Business Teams / Specialized Industries)
- [ ] Submission to bonus categories you qualify for:
  - [ ] Best Agents (Rovo / Assignable Agents) — $1,500 × 6 winners
  - [ ] Best App with Atlassian MCP — $1,500 × 6 winners
  - [ ] Best Teamwork Graph integration
  - [ ] Marketplace-published app (unlocks a fourth bonus category)

## Strategy
- [ ] **Submit early: 300 participation prizes are first-come-first-served** — a complete valid submission in early December beats a perfect one on Dec 22.
- [ ] One build can enter the main category + multiple bonus categories — target **Rovo agent + MCP** in a single app for two bonus shots.
- [ ] If time allows, publish to the Atlassian Marketplace before submitting (unlocks bonus category #4).

## Working backwards from Dec 22
| Date | Milestone |
|---|---|
| Dec 1 | App core functionality working on Forge dev environment |
| Dec 8 | Rovo agent and/or MCP server integrated |
| Dec 12 | Deployed + judge installation link working |
| Dec 14 | Demo video recorded and uploaded |
| Dec 15 | **Submit** (buffer week for fixes) |

## Registration
- [ ] Register at https://codegeist2026.devpost.com/ (Devpost account → "Join hackathon")
- [ ] Read the Official Rules — confirm EU eligibility and team rules
- [ ] Atlassian developer account + free Forge dev environment
