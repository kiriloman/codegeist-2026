// Faultline — shared webtrigger utilities: body parsing, auth, response shape.
// The official WebTriggerRequest/WebTriggerResponse contract (from @forge/api):
//   request:  { method, body: string (raw), path, headers: Record<string, string[]>, queryParameters }
//   response: { statusCode, body?: string, headers?: Record<string, string[]> }
// NOTE the header VALUES are arrays on both sides — a string value fails the
// runtime's response validation and surfaces as HTTP 424 Failed Dependency.
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

/** Header values may arrive as string[] (contract) or string — normalize. */
function headerValue(v) {
  if (Array.isArray(v)) return v.join(', ');
  return String(v || '');
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

/** Query parameters may arrive as Record<string,string> or string[] — normalize. */
function queryValue(v) {
  if (Array.isArray(v)) return v.join(',');
  return String(v || '');
}

/**
 * Bearer-token gate — FAIL-CLOSED by default.
 *   Token set (forge variables set FAULTLINE_ENDPOINT_TOKEN "<secret>"):
 *     every request must carry `Authorization: Bearer <secret>` OR the same
 *     secret as the `token` query parameter. The query form exists because
 *     Bitbucket webhooks cannot send custom Authorization headers — the
 *     webhook URL is registered with `?token=<secret>` appended.
 *   No token configured:
 *     requests are REJECTED unless the explicit dev bypass is set:
 *     forge variables set FAULTLINE_ALLOW_UNAUTHENTICATED 1
 */
function isAuthorized(req) {
  const required = process.env.FAULTLINE_ENDPOINT_TOKEN;
  if (required) {
    const headers = req?.headers || {};
    const auth = headerValue(headers['Authorization'] ?? headers.authorization);
    if (safeEqual(auth, `Bearer ${required}`)) return true;
    const qp = req?.queryParameters || {};
    const token = queryValue(qp.token ?? qp.token);
    return safeEqual(token, required);
  }
  return process.env.FAULTLINE_ALLOW_UNAUTHENTICATED === '1';
}

function jsonResponse(payload, statusCode = 200) {
  return {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': ['application/json'] }, // string[] per the contract
    statusCode,
  };
}

module.exports = { parseBody, isAuthorized, jsonResponse, safeEqual, headerValue, queryValue };
