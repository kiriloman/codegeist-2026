// Faultline — guide renderer tests.
// Run locally with zero installs:  node --test tests/guide.test.js

const test = require('node:test');
const assert = require('node:assert');
const { renderGuide, renderChatDigest } = require('../src/risk/guide');

const ranked = [
  {
    path: 'src/payments/retry.js',
    score: 88,
    tier: 'CRITICAL',
    icon: '🔴',
    rank: 1,
    reasons: ['📄 EVIDENCE: referenced in 2 postmortems', 'payment-critical path'],
    evidence: [{ kind: 'postmortem', text: 'Checkout outage', url: 'https://x/1' }],
    linesAdded: 40,
    linesRemoved: 8,
  },
  {
    path: 'src/styles/theme.css',
    score: 12,
    tier: 'LOW',
    icon: '🟢',
    rank: 2,
    reasons: ['styling / static assets'],
    evidence: [],
    linesAdded: 5,
    linesRemoved: 2,
  },
];
const pr = { workspace: 'acme', repo: 'pay', prId: 42, title: 'Fix double charge', author: 'Ada' };

test('guide renders ranked table, linked evidence, and the trust legend', () => {
  const g = renderGuide(pr, ranked);
  assert.ok(g.includes('| Priority | File | Risk | Why this ranking |'), 'table header');
  assert.ok(g.includes('`src/payments/retry.js`'), 'top file present');
  assert.ok(g.includes('[Checkout outage](https://x/1)'), 'postmortem is a live link');
  assert.ok(g.includes('Evidence behind the rankings'), 'evidence section');
  assert.ok(g.includes('outweighs any single heuristic'), 'trust legend (honest wording)');
  assert.ok(g.includes('never skip a file'), 'safety stance');
});

test('guide header summarizes evidence-backed count and start-here file', () => {
  const g = renderGuide(pr, ranked);
  assert.ok(g.includes('1 of 2 ranked with cited evidence'), 'evidence-backed count');
  assert.ok(g.includes('Start with **🔴 `src/payments/retry.js`** (88/100).'), 'start-here line');
});

test('guide list format renders table-free output for surfaces without table support', () => {
  const g = renderGuide(pr, ranked, { format: 'list' });
  assert.ok(!g.includes('| Priority |'), 'no table');
  assert.ok(g.includes('🔴 **1.** `src/payments/retry.js` — **88/100** (CRITICAL)'), 'list line');
  assert.ok(g.includes('payment-critical path'), 'reasons still present');
});

test('guide renders evidence-layer unavailability instead of faking "no history"', () => {
  const g = renderGuide(pr, ranked, { postmortemsStatus: 'unavailable', postmortemsReason: 'search responded 403' });
  assert.ok(g.includes('**Postmortem evidence unavailable**'), 'postmortem warning');
  assert.ok(g.includes('search responded 403'), 'reason shown');
  assert.ok(g.includes('NOT an absence of incident history'), 'failure ≠ absence');

  const g2 = renderGuide(pr, ranked, { blastStatus: 'unavailable', blastReason: 'TWG query key not configured' });
  assert.ok(g2.includes('Blast-radius evidence layer not configured'), 'permanent state rendered as footnote');
  assert.ok(g2.includes('TWG query key not configured'), 'reason shown');
  // permanent states must NOT use the loud warning form
  assert.ok(!g2.includes('**Blast-radius evidence unavailable**'), 'permanent ≠ error');
});

test('guide discloses truncation and lookup caps', () => {
  const g = renderGuide(pr, ranked, { filesTotal: 57, evidencePathsCovered: 15 });
  assert.ok(g.includes('55 additional changed files not ranked'), 'truncation disclosed');
  assert.ok(g.includes('Postmortem evidence checked for the first 15 files'), 'lookup cap disclosed');
});

test('digest carries PR link, scores, evidence URLs, and warnings for the chat agent', () => {
  const d = renderChatDigest(pr, ranked);
  assert.ok(d.includes('PR #42 "Fix double charge"'));
  assert.ok(d.includes('https://bitbucket.org/acme/pay/pull-requests/42'));
  assert.ok(d.includes('evidence: Checkout outage (https://x/1)'), 'evidence URLs kept for the agent');
  assert.ok(d.includes('risk 88/100 (CRITICAL)'));

  const d2 = renderChatDigest(pr, ranked, { postmortemsStatus: 'unavailable', blastStatus: 'unavailable' });
  assert.ok(d2.includes('Warnings:'), 'unavailable states surface in the digest');
});
