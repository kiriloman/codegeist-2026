// Faultline Companion — TWG blast-radius endpoint.
// Executes the registered persisted Cypher traversal via the Teamwork Graph
// GraphQL API. This runs in the SITE app (installed on Jira/Confluence) because
// the main (Bitbucket workspace) app cannot reach the site's TWG endpoint —
// same workspace/site scope wall as the Confluence search.
//
// Contract (shared with the main app):
//   POST { userAri: string } + Authorization: Bearer <FAULTLINE_ENDPOINT_TOKEN>
//   → 200 { status: 'ok'|'unavailable', reason, dependents: string[] }

import api, { route } from '@forge/api';
import { parseTwgDependents } from '../risk/cql';
import { parseBody, isAuthorized, jsonResponse } from './webtrigger-utils';

const TWG_ENDPOINT = '/gateway/api/graphql/twg';
const TWG_QUERY_KEY = process.env.TWG_BLAST_RADIUS_QUERY_KEY || '';

export async function runTwgBlastRadius(req) {
  if (!isAuthorized(req)) {
    return jsonResponse({ ok: false, reason: 'unauthorized' }, 401);
  }

  if (!TWG_QUERY_KEY) {
    return jsonResponse({ status: 'unavailable', reason: 'TWG query key not configured', dependents: [] });
  }

  const body = parseBody(req);
  const userAri = body?.userAri;
  if (!userAri || typeof userAri !== 'string') {
    return jsonResponse({ status: 'unavailable', reason: 'missing userAri parameter', dependents: [] });
  }

  try {
    // requestTeamworkGraph is ONLY on api.asUser(), not api.asApp() — TWG
    // queries require user context (the user's graph traversal permissions).
    // For this webtrigger (unattended), we use the site admin's account ID.
    const SITE_ADMIN_ID = process.env.FAULTLINE_TWG_USER_ID || '60167ab98fb6ea014a9e529e';
    const res = await api.asUser(SITE_ADMIN_ID).requestTeamworkGraph(
      `query BlastRadius($queryKey: String!, $params: JSON!) {
        customQuery(queryKey: $queryKey, params: $params) {
          results
        }
      }`,
      {
        queryKey: TWG_QUERY_KEY,
        params: { userAri },
      }
    );

    if (!res.ok) {
      return jsonResponse({ status: 'unavailable', reason: `TWG responded ${res.status}`, dependents: [] });
    }

    const json = await res.json();
    console.log('TWG raw response:', JSON.stringify(json).slice(0, 500));
    const dependents = parseTwgDependents(json);
    if (dependents === null) {
      return jsonResponse({ status: 'unavailable', reason: 'TWG result shape not recognized', dependents: [] });
    }
    return jsonResponse({ status: 'ok', reason: null, dependents });
  } catch (e) {
    console.warn(`TWG blast-radius failed: ${e?.message || e}`);
    return jsonResponse({ status: 'unavailable', reason: String(e?.message || e), dependents: [] });
  }
}
