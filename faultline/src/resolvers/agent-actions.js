// Faultline — tools the Rovo agent can call (and judges can test directly).
// Every response carries its evidence; the agent's instructions forbid quoting anything else.
//
// The agent is NOT read-only: `analyze-pr` runs a fresh analysis on demand —
// "Faultline, analyze PR #51" works without waiting for the webhook.
//
// INVOCATION-SHAPE DEFENSE: rovo:action functions and UI-Kit resolvers are
// invoked with different payload shapes. This dispatcher accepts several
// shapes and can also INFER the intended action from its arguments — so a
// shape mismatch degrades gracefully instead of erroring into the void.

import api, { route } from '@forge/api';
import { getAnalysis, recentAnalyses } from '../storage';
import { analyzePrById } from './analyze-pr';

const ACTION_KEYS = ['list-open-prs', 'get-review-context', 'get-file-risk', 'analyze-pr'];

function extractAction(arg) {
  const a = arg || {};
  const candidate =
    a.actionKey || a.key || a.event?.actionKey || a._meta?.actionKey ||
    a.payload?.action || a.payload?.actionKey || a.invoke?.actionKey;
  return ACTION_KEYS.includes(candidate) ? candidate : null;
}

function inferAction(payload) {
  if (payload?.path && payload?.prId) return 'get-file-risk';
  if (payload?.prId) return 'get-review-context';
  return 'list-open-prs';
}

// --- Action implementations ---------------------------------------------------

async function listOpenPrs() {
  const analyses = await recentAnalyses();
  const repos = [...new Set(analyses.map((a) => `${a.ws}/${a.repo}`))];
  const out = [];
  for (const ref of repos.slice(0, 5)) {
    const [ws, repo] = ref.split('/');
    try {
      const res = await api
        .asApp()
        .requestBitbucket(route`/2.0/repositories/${ws}/${repo}/pullrequests?state=OPEN&pagelen=20`);
      if (!res.ok) continue;
      for (const pr of (await res.json()).values || []) {
        const stored = await getAnalysis(ws, repo, pr.id);
        // Fields are returned SPLIT (workspace + repo) so the model never has
        // to guess how to decompose them for its next tool call.
        out.push({
          workspace: ws,
          repo,
          prId: pr.id,
          title: pr.title,
          analyzed: Boolean(stored),
          topRisk: stored?.ranked?.[0]
            ? { path: stored.ranked[0].path, score: stored.ranked[0].score }
            : null,
        });
      }
    } catch (e) {
      console.warn(`list PRs failed for ${ref}: ${e?.message || e}`);
    }
  }
  if (out.length === 0) {
    return {
      prs: [],
      note: 'No analyzed repos yet. Open (or update) a PR on a repo with the Faultline webhook wired — or call analyze-pr with its workspace, repo and prId.',
    };
  }
  return { prs: out };
}

async function getReviewContext(payload) {
  const { ws, repo, prId } = payload || {};
  if (!ws || !repo || !prId) {
    return { error: 'need ws (workspace), repo (slug) and prId — e.g. from list-open-prs.' };
  }
  const a = await getAnalysis(ws, repo, prId);
  if (!a) {
    return {
      analyzed: false,
      message:
        'No stored analysis for this PR yet. You can run one now with the analyze-pr action (ws, repo, prId), or the PR webhook will create it when it fires.',
    };
  }
  return { analyzed: true, title: a.title, digest: a.digest, ranked: a.ranked };
}

async function getFileRisk(payload) {
  const { ws, repo, prId, path } = payload || {};
  if (!ws || !repo || !prId) {
    return { error: 'need ws (workspace), repo (slug) and prId — e.g. from list-open-prs.' };
  }
  const a = await getAnalysis(ws, repo, prId);
  if (!a) {
    return {
      error: `No stored analysis for ${ws}/${repo} PR #${prId} — run analyze-pr first (ws, repo, prId).`,
    };
  }
  let file = (a.ranked || []).find((x) => x.path === path);
  if (!file && path) {
    // Fuzzy fallback: tolerate typos and partial paths ("retry" vs
    // "src/payments/retry.js") instead of dying on the first mismatch.
    const needle = String(path).toLowerCase();
    file =
      (a.ranked || []).find((x) => x.path.toLowerCase().endsWith(needle)) ||
      (a.ranked || []).find((x) => x.path.toLowerCase().includes(needle));
  }
  if (!file) {
    return {
      error: `${path} is not in PR #${prId}. Valid paths in this PR:`,
      availablePaths: (a.ranked || []).map((x) => x.path),
    };
  }
  return { file, prTitle: a.title };
}

async function analyzePr(payload) {
  const { ws, repo, prId } = payload || {};
  if (!ws || !repo || !prId) {
    return { error: 'need ws (workspace), repo (slug) and prId — e.g. from list-open-prs.' };
  }
  const result = await analyzePrById(ws, repo, prId);
  // Keyed pairs — never map over status VALUES (both would collapse to
  // 'unavailable' and misreport WHICH evidence layer is down).
  const warnings = [
    result.meta.postmortemsStatus === 'unavailable' ? 'postmortem evidence unavailable' : null,
    result.meta.blastStatus === 'unavailable' ? 'blast-radius evidence unavailable' : null,
  ].filter(Boolean);
  return {
    analyzed: true,
    guidePosted: result.posted,
    topRisk: result.ranked[0]
      ? { path: result.ranked[0].path, score: result.ranked[0].score, tier: result.ranked[0].tier }
      : null,
    ranked: result.ranked,
    warnings,
  };
}

// --- Dispatcher (works for every plausible invocation shape) ------------------

export async function runAgentAction(arg) {
  const payload = arg?.payload ?? arg ?? {};
  const action = extractAction(arg) || inferAction(payload);
  switch (action) {
    case 'list-open-prs':
      return listOpenPrs();
    case 'get-review-context':
      return getReviewContext(payload);
    case 'get-file-risk':
      return getFileRisk(payload);
    case 'analyze-pr':
      return analyzePr(payload);
    default:
      return { error: `Unknown action. Valid actions: ${ACTION_KEYS.join(', ')}.` };
  }
}
