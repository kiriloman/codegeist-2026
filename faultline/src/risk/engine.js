// Faultline v1.3 — deterministic blast-radius scoring engine.
//
// SIGNAL HIERARCHY: evidence outranks heuristics.
//   Tier 1 — EVIDENCE:  postmortem references (Confluence), related Jira work items (blast-radius search)
//   Tier 2 — HEURISTIC: path-segment criticality, change size, commit churn, test-delta
// The top weight of BOTH evidence signals (34 postmortem, 32 graph) exceeds the strongest
// single heuristic (30) — the property the guide legend states and tests pin.
//
// Matching is SEGMENT-BASED (path split on / . _ -) rather than substring regex:
// "author" can never match the auth rule, "discharge" can never match charge.
// Pure functions, no I/O, no LLM — the review guide cannot hallucinate.

const CRITICALITY = [
  { kw: ['payment', 'payments', 'billing', 'checkout', 'charge', 'charges', 'refund', 'refunds', 'invoice', 'invoices'], w: 30, why: 'payment-critical path' },
  { kw: ['auth', 'authentication', 'authorization', 'login', 'signin', 'session', 'sessions', 'token', 'tokens', 'password', 'oauth', 'jwt', 'secret', 'secrets', 'credential', 'credentials'], w: 28, why: 'authentication / security surface' },
  { kw: ['migration', 'migrations', 'schema', 'sql', 'db'], w: 26, why: 'database migration' },
  { kw: ['webhook', 'webhooks', 'callback', 'callbacks', 'ipn', 'listener'], w: 22, why: 'inbound integration boundary' },
  { kw: ['middleware', 'router', 'bootstrap', 'main'], w: 18, why: 'application spine' },
  { kw: ['config', 'configs', 'configuration', 'settings', 'env', 'environment'], w: 12, why: 'environment / configuration change' },
];

const LOW_RISK = [
  { kw: ['md', 'txt', 'rst', 'adoc'], w: -18, why: 'documentation' },
  { kw: ['spec', 'specs', 'test', 'tests'], w: -14, why: 'test code' },
  { kw: ['css', 'scss', 'less', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'], w: -10, why: 'styling / static assets' },
  { kw: ['json', 'yml', 'yaml', 'toml'], w: -6, why: 'data / config file' },
];

// Evidence weight ceilings — exported so tests derive invariants from the real values.
const MAX_EVIDENCE_SIGNALS = { postmortem: 34, graph: 32 };

const TEST_HINT = /\.spec\.|\.test\.|__tests__|\/tests?\//i;
const SOURCE_HINT = /\.(js|jsx|ts|tsx|py|go|java|rb|php|cs|rs|swift|kt)$/i;

const TIERS = [
  { min: 70, label: 'CRITICAL', icon: '🔴' },
  { min: 45, label: 'ELEVATED', icon: '🟠' },
  { min: 25, label: 'STANDARD', icon: '🟡' },
  { min: 0, label: 'LOW', icon: '🟢' },
];

/** Split a path into lowercase match segments: "src/Payments/retry.js" → [src, payments, retry, js]. */
function segments(path) {
  return String(path).toLowerCase().split(/[\/._\-]+/).filter(Boolean);
}

/**
 * Score one changed file.
 * @param {object} file    { path, linesAdded, linesRemoved, prHasTestChanges }
 * @param {object} history { touchCount, incidentCount, incidentRefs: [{title,url}],
 *                           dependents: string[], dependentsProvenance: 'graph'|'inferred'|'unavailable',
 *                           dependentsSourceUrl }
 */
function scoreFile(file, history = {}) {
  const reasons = [];
  const evidence = [];
  let score = 10; // neutral baseline

  // ---- Tier 1a: postmortem evidence (the strongest signal we can cite) ----
  const inc = history.incidentCount || 0;
  if (inc >= 3) score += 34;
  else if (inc === 2) score += 24;
  else if (inc === 1) score += 14;
  if (inc > 0) {
    reasons.push(`📄 EVIDENCE: referenced in ${inc} postmortem${inc > 1 ? 's' : ''}`);
    let cited = 0;
    for (const ref of history.incidentRefs || []) {
      if (ref?.title) { evidence.push({ kind: 'postmortem', text: ref.title, url: ref.url || null }); cited++; }
    }
    // The count itself is evidence even when titles/links couldn't be resolved.
    if (cited === 0) {
      evidence.push({ kind: 'postmortem', text: `${inc} postmortem reference${inc > 1 ? 's' : ''} (titles unavailable)`, url: null });
    }
  }

  // ---- Tier 1b: related Jira work items (blast-radius search) ----
  // Max graph weight (32) exceeds the strongest single heuristic (30), so BOTH evidence
  // signals outrank any single heuristic — the invariant the guide legend states.
  const deps = history.dependents?.length || 0;
  if (deps > 0) {
    const inferred = history.dependentsProvenance === 'inferred'; // 'jira' = real per-file evidence, full weight; 'inferred' = legacy PR-level, half weight
    let w = deps >= 5 ? 32 : deps >= 3 ? 20 : 10;
    if (inferred) w = Math.round(w / 2);
    score += w;
    reasons.push(`🌐 EVIDENCE: ${deps} related Jira work item${deps > 1 ? 's' : ''}${inferred ? ' (inferred)' : ''} mention this area`);
    evidence.push({
      kind: 'blast-radius',
      text: `${deps} related Jira work items (${history.dependentsProvenance || 'unknown provenance'})`,
      url: history.dependentsSourceUrl || null,
    });
  }

  // ---- Tier 2: heuristic signals (segment matching — no substring false positives) ----
  const segs = segments(file.path);
  for (const c of CRITICALITY) {
    if (segs.some((s) => c.kw.includes(s))) { score += c.w; reasons.push(c.why); break; }
  }
  for (const l of LOW_RISK) {
    if (segs.some((s) => l.kw.includes(s))) { score += l.w; reasons.push(l.why); break; }
  }

  const added = file.linesAdded || 0;
  const removed = file.linesRemoved || 0;
  const churned = added + removed;
  if (churned > 400) { score += 18; reasons.push(`very large change (+${added}/-${removed})`); }
  else if (churned > 150) { score += 12; reasons.push(`large change (+${added}/-${removed})`); }
  else if (churned > 60) { score += 6; reasons.push(`moderate change (+${added}/-${removed})`); }

  const touches = history.touchCount || 0;
  if (touches >= 10) { score += 10; reasons.push(`changed ${touches}× in recent history — instability signal`); }
  else if (touches >= 5) { score += 5; reasons.push(`changed ${touches}× in recent history`); }

  const isSource = SOURCE_HINT.test(file.path) && !TEST_HINT.test(file.path);
  if (isSource && !file.prHasTestChanges && score >= 40) {
    score += 8;
    reasons.push('no test changes included in this PR');
  }

  if (removed > 3 * (added + 1) && churned > 20) {
    score += 4;
    reasons.push('deletion-heavy change');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = TIERS.find((t) => score >= t.min);
  if (reasons.length === 0) reasons.push('routine change, no elevated signals');

  return {
    path: file.path,
    score,
    tier: tier.label,
    icon: tier.icon,
    reasons,
    evidence,
    linesAdded: added,
    linesRemoved: removed,
  };
}

/** Rank all files of a PR, highest risk first. `history` maps path → per-file signals. */
function rankFiles(files, history = {}) {
  const scored = files
    .filter((f) => f.path)
    .map((f) => scoreFile(f, history[f.path] || {}))
    .sort((a, b) => b.score - a.score);
  return scored.map((f, i) => ({ ...f, rank: i + 1 }));
}

/** Aggregate PR-level summary used in the guide header and chat digest. */
function summarize(ranked) {
  const critical = ranked.filter((f) => f.tier === 'CRITICAL' || f.tier === 'ELEVATED');
  const evidenceBacked = ranked.filter((f) => (f.evidence || []).length > 0);
  const tests = ranked.some((f) => TEST_HINT.test(f.path));
  return {
    files: ranked.length,
    attention: critical.length,
    evidenceBacked: evidenceBacked.length,
    top: ranked[0] || null,
    hasTestChanges: tests,
    verdict:
      ranked.length === 0 ? 'no changes detected'
      : critical.length === 0 ? 'no file crosses the elevated-risk threshold — standard review attention is fine'
      : `${critical.length} file${critical.length > 1 ? 's' : ''} deserve your attention first`,
  };
}

module.exports = {
  rankFiles,
  summarize,
  segments,
  CRITICALITY,
  LOW_RISK,
  MAX_EVIDENCE_SIGNALS,
  TEST_HINT,
  SOURCE_HINT,
};
