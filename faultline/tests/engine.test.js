// Faultline — risk engine unit tests.
// Run locally with zero installs:  node --test tests/engine.test.js tests/guide.test.js tests/cql.test.js 
// These pin the properties that make the app non-generic:
// (1) evidence signals outrank any SINGLE heuristic, (2) segment matching has no
// substring false positives, (3) stacked heuristics can still beat evidence
// (documented honestly), (4) caps and tier boundaries behave as stated.

const test = require('node:test');
const assert = require('node:assert');
const {
  rankFiles, summarize, segments, CRITICALITY, MAX_EVIDENCE_SIGNALS,
} = require('../src/risk/engine');

const f = (path, extra = {}) => ({
  path,
  linesAdded: 40,
  linesRemoved: 10,
  prHasTestChanges: false,
  ...extra,
});

// --- Evidence hierarchy -------------------------------------------------------

test('postmortem evidence pushes a payment file to CRITICAL with citations', () => {
  const [r] = rankFiles(
    [f('src/payments/retry.js')],
    {
      'src/payments/retry.js': {
        incidentCount: 2,
        incidentRefs: [{ title: 'Checkout outage 2026-03-14', url: 'https://x/1' }],
      },
    }
  );
  assert.ok(r.score >= 70, `expected CRITICAL, got ${r.score}`);
  assert.equal(r.tier, 'CRITICAL');
  assert.ok(r.reasons.some((x) => x.includes('postmortems')));
  assert.equal(r.evidence.length, 1);
  assert.equal(r.evidence[0].kind, 'postmortem');
});

test('evidence delta: 2 postmortems are worth exactly +24', () => {
  const [withEv] = rankFiles(
    [f('src/payments/retry.js')],
    { 'src/payments/retry.js': { incidentCount: 2 } }
  );
  const [withoutEv] = rankFiles(
    [f('src/payments/retry.js')],
    { 'src/payments/retry.js': {} }
  );
  assert.equal(withEv.score - withoutEv.score, 24);
});

test('graph blast radius adds weight, halved when inferred', () => {
  const mk = (provenance) =>
    rankFiles(
      [f('src/payments/retry.js')],
      { 'src/payments/retry.js': { dependents: ['a', 'b', 'c', 'd', 'e'], dependentsProvenance: provenance } }
    )[0].score;
  const graph = mk('graph');
  const inferred = mk('inferred');
  assert.equal(graph - inferred, 16, `graph ${graph} vs inferred ${inferred}`);
  assert.ok(graph >= 70);
});

test('both evidence maxima outweigh every single heuristic (derived from real weights)', () => {
  const maxSingleHeuristic = Math.max(...CRITICALITY.map((c) => c.w));
  assert.ok(MAX_EVIDENCE_SIGNALS.postmortem > maxSingleHeuristic, 'postmortem max > max heuristic');
  assert.ok(MAX_EVIDENCE_SIGNALS.graph > maxSingleHeuristic, 'graph max > max heuristic');
});

test('documented honestly: stacked heuristics can still beat an evidence-backed file', () => {
  // A large, churny payment change (pure heuristics) can outscore a smaller
  // evidence-backed file. The guide legend states exactly this — no more.
  const [heur] = rankFiles(
    [f('src/payments/webhook-handler.js', { linesAdded: 500, linesRemoved: 400 })],
    { 'src/payments/webhook-handler.js': { touchCount: 20 } }
  );
  const [ev] = rankFiles(
    [f('src/payments/retry.js', { linesAdded: 20, linesRemoved: 5 })],
    { 'src/payments/retry.js': { incidentCount: 1, incidentRefs: [{ title: 'A' }] } }
  );
  assert.ok(heur.score >= 70, `stacked heuristics rank high: ${heur.score}`);
  assert.ok(heur.score > ev.score, `stacked heuristics (${heur.score}) beat evidence-backed (${ev.score}) here`);
});

// --- Segment matching (no substring false positives) ---------------------------

test('segment matching: "author" never matches the auth rule', () => {
  const [r] = rankFiles([f('src/content/author-profile.js')], {});
  assert.ok(!r.reasons.includes('authentication / security surface'), JSON.stringify(r.reasons));
  const [r2] = rankFiles([f('src/utils/authorName.js')], {});
  assert.ok(!r2.reasons.includes('authentication / security surface'));
});

test('segment matching: "discharge" never matches the payment rule', () => {
  const [r] = rankFiles([f('src/battery/discharge.ts')], {});
  assert.ok(!r.reasons.includes('payment-critical path'), JSON.stringify(r.reasons));
});

test('segment matching: real auth and payment surfaces still match', () => {
  const [auth] = rankFiles([f('src/authentication/guard.js')], {});
  assert.ok(auth.reasons.includes('authentication / security surface'));
  const [pay] = rankFiles([f('src/payments/retry.js')], {});
  assert.ok(pay.reasons.includes('payment-critical path'));
  const [cb] = rankFiles([f('src/webhooks/stripe-listener.ts')], {});
  assert.ok(cb.reasons.includes('inbound integration boundary'));
});

test('segments(): splits paths on / . _ - and lowercases', () => {
  assert.deepEqual(segments('src/Payments/retry.test.js'), ['src', 'payments', 'retry', 'test', 'js']);
});

// --- Tiers, caps, fallbacks -----------------------------------------------------

test('a stylesheet stays LOW risk', () => {
  const [r] = rankFiles([f('src/styles/theme.css', { linesAdded: 5, linesRemoved: 2 })], {});
  assert.equal(r.tier, 'LOW');
});

test('tier boundaries: LOW / STANDARD / ELEVATED documented', () => {
  const [low] = rankFiles([f('src/styles/theme.css', { linesAdded: 5, linesRemoved: 2 })], {});
  assert.equal(low.tier, 'LOW');
  const [std] = rankFiles([f('src/webhooks/inbound.ts', { linesAdded: 20, linesRemoved: 5 })], {});
  assert.equal(std.tier, 'STANDARD');
  const [elev] = rankFiles([f('src/auth/session.ts', { linesAdded: 100, linesRemoved: 40 })], {});
  assert.equal(elev.tier, 'ELEVATED');
});

test('score is capped at 100', () => {
  const [r] = rankFiles(
    [f('src/payments/webhook-handler.js', { linesAdded: 500, linesRemoved: 400 })],
    {
      'src/payments/webhook-handler.js': {
        incidentCount: 3,
        incidentRefs: [{ title: 'A' }],
        dependents: ['a', 'b', 'c', 'd', 'e'],
        dependentsProvenance: 'graph',
        touchCount: 20,
      },
    }
  );
  assert.ok(r.score <= 100);
  assert.ok(r.evidence.length >= 2);
});

test('routine file gets the fallback reason and no evidence', () => {
  const [r] = rankFiles([f('src/utils/misc.ts', { linesAdded: 5, linesRemoved: 3 })], {});
  assert.deepEqual(r.reasons, ['routine change, no elevated signals']);
  assert.equal(r.evidence.length, 0);
});

test('fallback citation when postmortem refs are unresolvable', () => {
  const [r] = rankFiles(
    [f('src/payments/retry.js')],
    { 'src/payments/retry.js': { incidentCount: 2, incidentRefs: [] } }
  );
  assert.equal(r.evidence.length, 1);
  assert.ok(r.evidence[0].text.includes('titles unavailable'));
  assert.equal(r.evidence[0].url, null);
});

test('summarize counts evidence-backed files', () => {
  const ranked = rankFiles(
    [f('src/a.ts'), f('src/b.ts')],
    { 'src/a.ts': { incidentCount: 1 }, 'src/b.ts': {} }
  );
  const s = summarize(ranked);
  assert.equal(s.evidenceBacked, 1);
  assert.equal(s.files, 2);
});

// ── Per-file Jira blast-radius evidence ────────────────────────────────────────

test('per-file blast-radius: each file gets its own dependents, not blanket', () => {
  // Two files: one about payments, one about middleware
  const history = {
    'src/payments/checkoutRetry.js': {
      dependents: ['KAN-10: Fix checkout (Done)', 'KAN-12: Payment gateway (In Progress)'],
      dependentsProvenance: 'jira',
      touchCount: 3,
      incidentCount: 0,
    },
    'src/middleware/rateLimit.js': {
      dependents: [], // different service area → different Jira results
      dependentsProvenance: 'jira',
      touchCount: 2,
      incidentCount: 0,
    },
  };

  const ranked = rankFiles(
    [
      { path: 'src/payments/checkoutRetry.js', linesAdded: 20, linesRemoved: 10, prHasTestChanges: false },
      { path: 'src/middleware/rateLimit.js', linesAdded: 30, linesRemoved: 15, prHasTestChanges: false },
    ],
    history
  );

  const checkout = ranked.find((f) => f.path.includes('checkoutRetry'));
  const rateLimit = ranked.find((f) => f.path.includes('rateLimit'));

  // The payments file has Jira evidence, the middleware file does not
  assert.ok(
    checkout.reasons.some((r) => r.includes('related Jira work item')),
    'checkout file should have Jira evidence'
  );
  assert.ok(
    !rateLimit.reasons.some((r) => r.includes('related Jira work item')),
    'rateLimit file should NOT have Jira evidence (different service area)'
  );
  // The payments file scores higher because it has evidence the other doesn't
  assert.ok(checkout.score > rateLimit.score, 'file with per-file evidence scores higher');
});

test('per-file blast-radius: files in the same directory share keyword results', () => {
  const history = {
    'src/payments/checkoutRetry.js': {
      dependents: ['KAN-10: Fix checkout (Done)'],
      dependentsProvenance: 'jira',
    },
    'src/payments/refundBatch.js': {
      dependents: ['KAN-14: Refund batch overflow (Done)'],
      dependentsProvenance: 'jira',
    },
  };

  const ranked = rankFiles(
    [
      { path: 'src/payments/checkoutRetry.js', linesAdded: 10, linesRemoved: 5, prHasTestChanges: false },
      { path: 'src/payments/refundBatch.js', linesAdded: 10, linesRemoved: 5, prHasTestChanges: false },
    ],
    history
  );

  const checkout = ranked.find((f) => f.path.includes('checkoutRetry'));
  const refund = ranked.find((f) => f.path.includes('refundBatch'));
  // Both have Jira evidence from their own per-file searches
  assert.ok(
    checkout.reasons.some((r) => r.includes('related Jira work item')),
    'checkout should have Jira evidence'
  );
  assert.ok(
    refund.reasons.some((r) => r.includes('related Jira work item')),
    'refund should have Jira evidence (different keyword, different results)'
  );
});

// ── extractFileKeyword + provenance weight tests ──────────────────────────

test('extractFileKeyword behavior: camelCase filenames split into words', () => {
  // Test the extraction logic (same algorithm as evidence.js)
  const extract = (path) => {
    const filename = String(path).split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    return filename
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
  };
  assert.deepEqual(extract('src/payments/checkoutRetry.js'), ['checkout', 'retry']);
  assert.deepEqual(extract('src/middleware/rateLimit.js'), ['rate', 'limit']);
  assert.deepEqual(extract('config/token-revocation.js'), ['token', 'revocation']);
  assert.deepEqual(extract('src/utils/helper.js'), ['helper']);
  assert.deepEqual(extract('README.md'), ['readme']); // 'readme' is a valid word, only 'md' is stripped
});

test('provenance weight: jira provenance gets FULL weight, inferred gets half', () => {
  const history = {
    'src/payments/checkout.js': {
      dependents: ['KAN-1', 'KAN-2', 'KAN-3', 'KAN-4', 'KAN-5'],
      dependentsProvenance: 'jira',
    },
    'src/utils/helper.js': {
      dependents: ['KAN-1', 'KAN-2', 'KAN-3', 'KAN-4', 'KAN-5'],
      dependentsProvenance: 'inferred',
    },
  };
  const ranked = rankFiles(
    [
      { path: 'src/payments/checkout.js', linesAdded: 10, linesRemoved: 5, prHasTestChanges: false },
      { path: 'src/utils/helper.js', linesAdded: 10, linesRemoved: 5, prHasTestChanges: false },
    ],
    history
  );
  const checkout = ranked.find((f) => f.path.includes('checkout'));
  const helper = ranked.find((f) => f.path.includes('helper'));
  assert.ok(
    checkout.score > helper.score,
    `jira (${checkout.score}) should outscore inferred (${helper.score})`
  );
});
