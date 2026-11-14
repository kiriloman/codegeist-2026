// Faultline Companion — blast-radius endpoint via Jira REST API.
// TWG requires user context (not available in webtriggers), so we query Jira
// directly via `api.asApp().requestJira()` — a fully supported first-class
// Forge API that works from unattended contexts.
//
// The "blast radius" = Jira work items that reference the same service/area
// as the PR being analyzed. For the demo, these are the checkout-service
// incidents we seeded.
//
// Contract (shared with the main app):
//   POST { searchText: string } + Authorization: Bearer <FAULTLINE_ENDPOINT_TOKEN>
//   → 200 { status: 'ok'|'unavailable', reason, dependents: string[] }

import api, { route } from '@forge/api';
import { parseBody, isAuthorized, jsonResponse } from './webtrigger-utils';

export async function runTwgBlastRadius(req) {
  if (!isAuthorized(req)) {
    return jsonResponse({ ok: false, reason: 'unauthorized' }, 401);
  }

  const body = parseBody(req);
  const searchText = body?.searchText || body?.userAri || '';
  if (!searchText || typeof searchText !== 'string') {
    return jsonResponse({ status: 'unavailable', reason: 'missing searchText parameter', dependents: [] });
  }

  try {
    // Search Jira for issues whose summary or description mentions the service area.
    // Uses the POST /rest/api/3/search/jql endpoint (the old GET /rest/api/3/search
    // is deprecated and returns 410).
    const res = await api
      .asApp()
      .requestJira(route`/rest/api/3/search/jql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jql: `summary ~ "${searchText}" OR description ~ "${searchText}" ORDER BY created DESC`,
          maxResults: 10,
          fields: ['summary', 'status'],
        }),
      });

    if (!res.ok) {
      return jsonResponse({ status: 'unavailable', reason: `Jira responded ${res.status}`, dependents: [] });
    }

    const json = await res.json();
    const issues = json?.issues || [];

    // Map Jira issues to dependent "service" names (issue key + summary).
    const dependents = issues.map((issue) => {
      const key = issue?.key || '';
      const summary = issue?.fields?.summary || '';
      const status = issue?.fields?.status?.name || '';
      return `${key}: ${summary} (${status})`;
    });

    if (dependents.length === 0) {
      return jsonResponse({ status: 'ok', reason: null, dependents: [] });
    }

    return jsonResponse({ status: 'ok', reason: null, dependents });
  } catch (e) {
    console.warn(`Jira blast-radius failed: ${e?.message || e}`);
    return jsonResponse({ status: 'unavailable', reason: String(e?.message || e), dependents: [] });
  }
}
