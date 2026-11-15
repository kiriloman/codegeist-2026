// Tests for extractPrContext — the Bitbucket webhook payload parser.
//
// CRITICAL regression coverage: real Bitbucket webhook payloads carry the
// repository WITHOUT a `slug` field (only `name`/`full_name`), unlike REST
// API payloads which include `slug`. The original parser required `slug`
// and silently dropped every real webhook delivery — manual triggers with
// synthetic payloads worked, natural ones never did.

const test = require('node:test');
const assert = require('node:assert');
const { extractPrContext } = require('../src/resolvers/pr-context');

// Captured from a live pullrequest:updated delivery (2026-11-15, faultline-demo).
const realWebhookPayload = {
  repository: {
    type: 'repository',
    full_name: 'faultline/faultline-demo',
    name: 'faultline-demo',
    workspace: { slug: 'faultline', type: 'workspace', name: 'Faultline' },
    is_private: true,
    uuid: '{some-uuid}',
    parent: null,
  },
  actor: { type: 'user', display_name: 'Kyrylo Yefimenko' },
  pullrequest: {
    type: 'pullrequest',
    id: 5,
    title: 'Add Redis-backed rate limiter',
    state: 'OPEN',
    draft: false,
    author: { type: 'user', display_name: 'Kyrylo Yefimenko' },
    source: { branch: { name: 'demo-pr-middleware' } },
    destination: { branch: { name: 'master' } },
  },
};

// REST-API-style payload (repository carries slug) — used by manual triggers.
const restStylePayload = {
  repository: { workspace: { slug: 'faultline' }, slug: 'faultline-demo', full_name: 'faultline/faultline-demo' },
  pullrequest: { id: 2, state: 'OPEN', title: 'Middleware PR', author: { display_name: 'Kyrylo Yefimenko' } },
};

test('extractPrContext: real Bitbucket webhook payload (no repository.slug, only name)', () => {
  const ctx = extractPrContext(realWebhookPayload);
  assert.ok(ctx, 'must extract context from the REAL payload shape');
  assert.equal(ctx.workspace, 'faultline');
  assert.equal(ctx.repo, 'faultline-demo');
  assert.equal(ctx.prId, 5);
  assert.equal(ctx.title, 'Add Redis-backed rate limiter');
  assert.equal(ctx.author, 'Kyrylo Yefimenko');
  assert.equal(ctx.skipped, undefined);
});

test('extractPrContext: REST-style payload with repository.slug still works', () => {
  const ctx = extractPrContext(restStylePayload);
  assert.ok(ctx);
  assert.equal(ctx.workspace, 'faultline');
  assert.equal(ctx.repo, 'faultline-demo');
  assert.equal(ctx.prId, 2);
});

test('extractPrContext: full_name-only payload falls back to split', () => {
  const ctx = extractPrContext({
    repository: { full_name: 'faultline/faultline-demo' },
    pullrequest: { id: 7, state: 'OPEN', title: 'X' },
  });
  assert.ok(ctx);
  assert.equal(ctx.workspace, 'faultline');
  assert.equal(ctx.repo, 'faultline-demo');
});

test('extractPrContext: non-OPEN PR is skipped, not analysed', () => {
  const declined = JSON.parse(JSON.stringify(realWebhookPayload));
  declined.pullrequest.state = 'DECLINED';
  const ctx = extractPrContext(declined);
  assert.ok(ctx.skipped, 'declined PR must be skipped');
  assert.match(ctx.skipped, /DECLINED/);
});

test('extractPrContext: missing pullrequest/repository → null', () => {
  assert.equal(extractPrContext({ repository: {} }), null);
  assert.equal(extractPrContext({ pullrequest: {} }), null);
  assert.equal(extractPrContext(null), null);
});

test('extractPrContext: PR without numeric id → null (not analysable)', () => {
  const noId = JSON.parse(JSON.stringify(realWebhookPayload));
  delete noId.pullrequest.id;
  assert.equal(extractPrContext(noId), null);
});
