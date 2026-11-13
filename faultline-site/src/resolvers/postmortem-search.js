// Faultline Companion (site app) — the Confluence postmortem search.
// This is the code the main (Bitbucket) app cannot carry: `search:confluence`
// is a site-classified scope and Forge forbids mixing it with workspace-classified
// Bitbucket scopes in one app. This app exposes it as an authenticated endpoint.
//
// Contract (shared with the main app):
//   POST { paths: string[] } + Authorization: Bearer <FAULTLINE_ENDPOINT_TOKEN>
//   → 200 { status: 'ok'|'unavailable', reason, byPath: { [path]: { count, refs } } }
// Fetch-failure is NEVER reported as absence of evidence.

import api, { route } from '@forge/api';
import { buildPostmortemCql, mapConfluenceResults } from '../risk/cql';
import { parseBody, isAuthorized, jsonResponse } from './webtrigger-utils';

const SITE_URL = process.env.SITE_URL || ''; // absolute links need the site base

export async function runPostmortemSearch(req) {
  if (!isAuthorized(req)) {
    return jsonResponse({ ok: false, reason: 'unauthorized' }, 401);
  }

  const body = parseBody(req);
  const paths = Array.isArray(body?.paths) ? body.paths.filter((p) => typeof p === 'string') : null;
  if (!paths || paths.length === 0) {
    return jsonResponse({ status: 'ok', reason: null, byPath: {} });
  }

  const list = paths.slice(0, 15); // same lookup cap as the main app discloses
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
  if (ok === 0 && failures > 0) {
    return jsonResponse({ status: 'unavailable', reason: lastReason || 'all lookups failed', byPath: {} });
  }
  return jsonResponse({ status: 'ok', reason: failures > 0 ? `${failures} of ${list.length} lookups failed` : null, byPath });
}
