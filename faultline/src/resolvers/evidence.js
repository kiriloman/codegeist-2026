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
import { parseTwgDependents } from '../risk/cql';

// Persisted Cypher query key registered for the blast-radius traversal — set via:
//   forge variables set TWG_BLAST_RADIUS_QUERY_KEY "<queryKey from TWG registration>"
const TWG_ENDPOINT = '/gateway/api/graphql/twg';
const TWG_QUERY_KEY = process.env.TWG_BLAST_RADIUS_QUERY_KEY || '';

// ---------------------------------------------------------------------------
// 1. Postmortem evidence (Confluence) — via the companion site app
// ---------------------------------------------------------------------------

// The companion site app (faultline-site) carries the site-classified
// search:confluence scope that this workspace app cannot mix with its
// Bitbucket scopes. It exposes an authenticated POST endpoint returning the
// same status envelope. Egress to it is allowlisted in the manifest
// (permissions.external.fetch.backend). When unconfigured or unreachable,
// the layer reports 'unavailable' with the reason — honestly, never as
// "no incident history".
const SITE_APP_URL = process.env.FAULTLINE_SITE_APP_URL || '';
const SITE_APP_TOKEN = process.env.FAULTLINE_ENDPOINT_TOKEN || '';

export async function fetchPostmortemCounts(paths, cap = 15) {
  const list = (paths || []).slice(0, cap);
  if (list.length === 0) return { status: 'ok', reason: null, byPath: {} };
  if (!SITE_APP_URL) {
    return {
      status: 'unavailable',
      reason: 'companion site app URL not configured (FAULTLINE_SITE_APP_URL)',
      byPath: {},
    };
  }
  try {
    const res = await fetch(SITE_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SITE_APP_TOKEN}`,
      },
      body: JSON.stringify({ paths: list }),
    });
    if (!res.ok) {
      return { status: 'unavailable', reason: `companion site app responded ${res.status}`, byPath: {} };
    }
    const json = await res.json();
    if (json?.status === 'ok' || json?.status === 'unavailable') {
      return { status: json.status, reason: json.reason || null, byPath: json.byPath || {} };
    }
    return { status: 'unavailable', reason: 'companion site app returned an unrecognized envelope', byPath: {} };
  } catch (e) {
    return { status: 'unavailable', reason: `companion site app unreachable: ${String(e?.message || e)}`, byPath: {} };
  }
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
