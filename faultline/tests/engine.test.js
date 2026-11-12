// Faultline — risk engine unit tests.
// Run locally with zero installs:  node --test tests/engine.test.js tests/guide.test.js tests/cql.test.js tests/webtrigger-utils.test.js
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
