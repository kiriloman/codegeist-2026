// Faultline — evidence fetchers.
// These are the signals that make Faultline NOT a generic LLM reviewer:
//   1. Postmortem references  — Confluence CQL search (stable public API)
//   2. Blast radius           — Teamwork Graph (per-site GraphQL, Preview Oct 2026)
//
// RULES: evidence fetchers never break the analysis, and failures are NEVER
// silent — both fetchers return a status ('ok' | 'unavailable' + reason) that
// the guide renders, because "lookup failed" must never masquerade as
// "no incident history exists".

import api, { route } from '@forge/api';
import { buildPostmortemCql, mapConfluenceResults, parseTwgDependents } from '../risk/cql';

// Confluence site base, e.g. "https://your-site.atlassian.net" — set via:
//   forge variables set SITE_URL "https://your-site.atlassian.net"
const SITE_URL = process.env.SITE_URL || '';

// Persisted Cypher query key registered for the blast-radius traversal — set via:
//   forge variables set TWG_BLAST_RADIUS_QUERY_KEY "<queryKey from TWG registration>"
const TWG_ENDPOINT = '/gateway/api/graphql/twg';
const TWG_QUERY_KEY = process.env.TWG_BLAST_RADIUS_QUERY_KEY || '';

// ---------------------------------------------------------------------------
// 1. Postmortem evidence
// ---------------------------------------------------------------------------

/**
 * Count postmortem pages referencing each changed path (capped). Runs in
 * PARALLEL — sequential round-trips risk webhook timeouts. Returns a status
 * envelope: if every lookup failed (wrong scope, 429s, CQL rejection) the
 * status is 'unavailable' with the reason, so the guide can say so.
 */
export async function fetchPostmortemCounts(paths, cap = 15) {
  const list = paths.slice(0, cap);
  if (list.length === 0) return { status: 'ok', reason: null, byPath: {} };

  const entries = await Promise.all(
    list.map(async (path) => {
      try {
        const cql = buildPostmortemCql(path);
        const res = await api
          .asApp()
          .requestConfluence(route`/wiki/rest/api/search?cql=${cql}&limit=5`);
        if (!res.ok) {
          console.warn(`postmortem lookup ${path} failed: ${res.status}`);
          return [path, null, `search responded ${res.status}`];
        }
        const json = await res.json();
        return [path, mapConfluenceResults(json, SITE_URL), null];
      } catch (e) {
        console.warn(`postmortem lookup ${path} threw: ${e?.message || e}`);
        return [path, null, String(e?.message || e)];
      }
    })
  );

  const byPath = {};
  let ok = 0;
  let failures = 0;
  let lastReason = null;
  for (const [p, v, err] of entries) {
    if (v) { byPath[p] = v; ok++; } else { failures++; lastReason = err; }
  }
  // Every lookup failed → the evidence layer is down, not empty.
  if (ok === 0 && failures > 0) {
    return { status: 'unavailable', reason: lastReason || 'all lookups failed', byPath: {} };
  }
  return { status: 'ok', reason: failures > 0 ? `${failures} of ${list.length} lookups failed` : null, byPath };
}

// ---------------------------------------------------------------------------
// 2. Blast radius (Teamwork Graph)
// ---------------------------------------------------------------------------

const unavailable = (reason) => ({ status: 'unavailable', reason, dependents: [], sourceUrl: null });

/**
 * Services that depend on the code in this repository, via the Teamwork Graph.
 * Uses a persisted Cypher traversal registered at setup time (customQuery root
 * field). The graph result shape is parsed defensively (see parseTwgDependents);
 * an unrecognizable shape reports 'unavailable', never zero-dependents.
 * NOTE: the `inferred` provenance tier in the engine is reserved for a
 * Compass-derived fallback (repo activity heuristics) if the graph traversal
 * is unavailable; the engine and tests already support it.
 */
export async function fetchDependentServices({ workspace, repo }) {
  if (!TWG_QUERY_KEY) return unavailable('TWG query key not configured');

  try {
    const res = await api.asApp().requestGraph(route`${TWG_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query BlastRadius($queryKey: String!, $params: JSON!) {
          customQuery(queryKey: $queryKey, params: $params) {
            results
          }
        }`,
        variables: {
          queryKey: TWG_QUERY_KEY,
          params: { repoUrl: `https://bitbucket.org/${workspace}/${repo}` },
        },
      }),
    });
    if (!res.ok) return unavailable(`TWG responded ${res.status}`);

    const json = await res.json();
    const dependents = parseTwgDependents(json);
    if (dependents === null) {
      return unavailable('TWG result shape not recognized — check the registered traversal');
    }
    return { status: 'ok', reason: null, dependents, sourceUrl: null };
  } catch (e) {
    console.warn(`TWG blast-radius lookup failed: ${e?.message || e}`);
    return unavailable(String(e?.message || e));
  }
}
