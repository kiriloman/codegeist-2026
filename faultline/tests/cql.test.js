// Faultline — evidence-layer unit tests (pure CQL helpers + auth utilities).
// Run locally with zero installs:  node --test tests/cql.test.js tests/webtrigger-utils.test.js

const test = require('node:test');
const assert = require('node:assert');
const {
  buildPostmortemCql, escapeCqlPhrase, mapConfluenceResults, parseTwgDependents,
} = require('../src/risk/cql');
const { parseBody, isAuthorized, safeEqual } = require('../src/resolvers/webtrigger-utils');

// --- CQL construction ----------------------------------------------------------

test('buildPostmortemCql wraps the path as a quoted phrase with label filters', () => {
  const cql = buildPostmortemCql('src/payments/retry.js');
  assert.ok(cql.includes('label = "postmortem"'));
  assert.ok(cql.includes('text ~ "src/payments/retry.js"'));
});

test('escapeCqlPhrase neutralizes quotes and backslashes', () => {
  assert.equal(escapeCqlPhrase('we"ird\\path'), 'we\\"ird\\\\path');
  const cql = buildPostmortemCql('we"ird');
  // The embedded quote must be escaped, so the phrase stays one phrase.
  assert.ok(cql.includes('text ~ "we\\"ird"'));
});

test('mapConfluenceResults maps titles and builds absolute links only with a site base', () => {
  const json = {
    size: 7,
    results: [
      { title: 'Checkout outage', content: { _links: { webui: '/spaces/TEAM/pages/1/Checkout' } } },
      { title: 'Double charge', content: { _links: { webui: '/spaces/TEAM/pages/2/Double' } } },
    ],
  };
  const withSite = mapConfluenceResults(json, 'https://x.atlassian.net');
  assert.equal(withSite.count, 7);
  assert.equal(withSite.refs[0].url, 'https://x.atlassian.net/wiki/spaces/TEAM/pages/1/Checkout');

  const noSite = mapConfluenceResults(json, '');
  assert.equal(noSite.refs[0].url, null, 'no SITE_URL → null, never a broken relative link');

  const garbage = mapConfluenceResults(null, 'https://x');
  assert.deepEqual(garbage, { count: 0, refs: [] });
});

test('parseTwgDependents: string arrays, object arrays, and garbage', () => {
  assert.deepEqual(parseTwgDependents({ data: { customQuery: { results: ['svc-a', 'svc-b'] } } }), ['svc-a', 'svc-b']);
  assert.deepEqual(
    parseTwgDependents({ data: { customQuery: { results: [{ name: 'svc-a' }, { title: 'svc-b' }] } } }),
    ['svc-a', 'svc-b']
  );
  assert.equal(parseTwgDependents({ data: { customQuery: { results: 'nope' } } }), null, 'unrecognizable → null (caller reports unavailable)');
  assert.equal(parseTwgDependents({}), null);
  assert.equal(parseTwgDependents({ data: { customQuery: { results: [] } } }), null, 'empty → null, not zero-dependents');
});

// --- Webtrigger auth (fail-closed) ----------------------------------------------

test('parseBody handles objects, strings, and invalid JSON', () => {
  const obj = { a: 1 };
  assert.equal(parseBody({ body: obj }), obj);
  assert.equal(parseBody({ payload: obj }), obj);
  assert.equal(parseBody(obj), obj);
  assert.deepEqual(parseBody({ body: JSON.stringify(obj) }), obj);
  assert.equal(parseBody({ body: 'not json{' }), null);
});

test('isAuthorized: token set → exact bearer required (fail-closed)', () => {
  process.env.FAULTLINE_ENDPOINT_TOKEN = 'sekrit';
  delete process.env.FAULTLINE_ALLOW_UNAUTHENTICATED;
  assert.equal(isAuthorized({ headers: { Authorization: 'Bearer sekrit' } }), true);
  assert.equal(isAuthorized({ headers: { authorization: 'Bearer sekrit' } }), true, 'lowercase header accepted');
  assert.equal(isAuthorized({ headers: { Authorization: 'Bearer wrong' } }), false);
  assert.equal(isAuthorized({ headers: {} }), false);
  assert.equal(isAuthorized({}), false);
  delete process.env.FAULTLINE_ENDPOINT_TOKEN;
});

test('isAuthorized: no token configured → closed unless explicit dev bypass', () => {
  delete process.env.FAULTLINE_ENDPOINT_TOKEN;
  delete process.env.FAULTLINE_ALLOW_UNAUTHENTICATED;
  assert.equal(isAuthorized({ headers: {} }), false, 'default is REJECT');
  process.env.FAULTLINE_ALLOW_UNAUTHENTICATED = '1';
  assert.equal(isAuthorized({ headers: {} }), true, 'explicit bypass allows');
  delete process.env.FAULTLINE_ALLOW_UNAUTHENTICATED;
});

test('safeEqual: equal strings pass, anything else fails', () => {
  assert.equal(safeEqual('Bearer x', 'Bearer x'), true);
  assert.equal(safeEqual('Bearer x', 'Bearer y'), false);
  assert.equal(safeEqual('short', 'much longer string'), false);
  assert.equal(safeEqual(undefined, ''), true, 'both empty-ish');
});
