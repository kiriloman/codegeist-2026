// Faultline — pure CQL / response-shaping helpers for the evidence layer.
// Everything here is I/O-free so the evidence layer's logic is unit-testable
// without a Confluence or Teamwork Graph connection. Pure functions, CJS.

const POSTMORTEM_FILTER =
  '(label = "postmortem" OR label = "incident-review" OR title ~ "postmortem")';

/** Escape a string for safe interpolation into a CQL quoted phrase. */
function escapeCqlPhrase(s) {
  return String(s).replace(/(["\\])/g, '\\$1');
}

/**
 * Build the CQL query that finds postmortem pages referencing a file path.
 * CQL `text ~` tokenizes on "/" and "." — deploy-verified findings:
 *   - full token sequences with extensions fail ("retry js" → 0; "js" is not
 *     indexed as a separate token from code blocks)
 *   - the path with separators→spaces AND the file extension stripped matches
 *     ("src payments retry" → 2 hits; the raw form is OR'd as a bonus).
 */
function buildPostmortemCql(path) {
  const escaped = escapeCqlPhrase(path);
  // Split camelCase too: Confluence indexes "checkoutRetry" as one token that
  // then fails to match — deploy-verified. Lowercase everything for the
  // spaced form so the index's own tokenization aligns with the query.
  const spaced = escapeCqlPhrase(
    String(path)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[\u002f._]+/g, ' ')
      .toLowerCase()
  );
  return `${POSTMORTEM_FILTER} AND (text ~ "${escaped}" OR text ~ "${spaced}")`;
}

/**
 * Map a Confluence search response to { count, refs }.
 * Null-safe: any shape mismatch degrades to { count: 0, refs: [] }.
 */
function mapConfluenceResults(json, siteUrl) {
  const results = Array.isArray(json?.results) ? json.results : [];
  const count = typeof json?.size === 'number' ? json.size : results.length;
  const refs = results.slice(0, 3).map((r) => ({
    title: r?.title || null,
    // Only build an absolute link when the site base is known — a relative
    // link renders broken in the guide, so we prefer null over a bad URL.
    url: siteUrl && r?.content?._links?.webui ? `${siteUrl}/wiki${r.content._links.webui}` : null,
  })).filter((r) => r.title);
  return { count, refs };
}

/**
 * Parse a Teamwork Graph customQuery response into a list of dependent
 * service names. Defensive by design: accepts a string array, or an array
 * of objects carrying name/title fields. Returns null when the shape is
 * unrecognizable (caller treats null as unavailable, not as zero dependents).
 */
function parseTwgDependents(json) {
  const raw = json?.data?.customQuery?.results;
  if (!Array.isArray(raw)) return null;
  const names = raw
    .map((r) => (typeof r === 'string' ? r : r?.name || r?.title || null))
    .filter(Boolean);
  return names.length > 0 ? names : null;
}

module.exports = { buildPostmortemCql, escapeCqlPhrase, mapConfluenceResults, parseTwgDependents, POSTMORTEM_FILTER };
