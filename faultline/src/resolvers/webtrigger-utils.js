// Faultline — shared webtrigger utilities: body parsing, auth, response shape.
// Forge webtrigger request shapes vary (parsed body vs payload vs raw JSON string)
// and responses need { body, headers, statusCode } — these helpers absorb all of it.
// Pure functions, CJS — unit-testable without a Forge runtime.

function parseBody(req) {
  const raw = req?.body ?? req?.payload ?? req;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

/** Length-safe equality (avoids trivially timing-leaking comparisons). */
function safeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Bearer-token gate — FAIL-CLOSED by default.
 *
 *   Token set (forge variables set FAULTLINE_ENDPOINT_TOKEN "<secret>"):
 *     every request must carry `Authorization: Bearer <secret>`.
 *   No token configured:
 *     requests are REJECTED unless the explicit dev bypass is set:
 *     forge variables set FAULTLINE_ALLOW_UNAUTHENTICATED 1
 *
 * Bitbucket webhooks can carry custom headers only when created via the
 * webhooks API (POST /2.0/repositories/{ws}/{repo}/hooks) — NOT the repo
 * settings UI. MCP clients send the header in their endpoint configuration.
 * [VERIFY] the header casing Forge exposes (`Authorization` vs `authorization`)
 * on first deploy — both are checked here.
 */
function isAuthorized(req) {
  const required = process.env.FAULTLINE_ENDPOINT_TOKEN;
  if (required) {
    const headers = req?.headers || {};
    const auth = headers['Authorization'] || headers.authorization || '';
    return safeEqual(auth, `Bearer ${required}`);
  }
  return process.env.FAULTLINE_ALLOW_UNAUTHENTICATED === '1';
}

function jsonResponse(payload, statusCode = 200) {
  return {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    statusCode,
  };
}

module.exports = { parseBody, isAuthorized, jsonResponse, safeEqual };
