// Faultline — webtrigger entry for Bitbucket PR webhooks.
// Handles all body shapes (webhook payloads carry repository.name, REST
// payloads carry repository.slug — see pr-context.js), fail-closed auth
// (Authorization header OR ?token= query param — Bitbucket webhooks cannot
// send custom headers), never 500s (Bitbucket disables failing webhooks),
// skips non-OPEN pull requests, and returns a proper
// { body, headers, statusCode } shape.

import { analyzePullRequest } from './analyze-pr';
import { parseBody, isAuthorized, jsonResponse } from './webtrigger-utils';
import { extractPrContext } from './pr-context';

export async function runPrWebhook(req) {
  if (!isAuthorized(req)) {
    return jsonResponse({ ok: false, reason: 'unauthorized' }, 401);
  }

  const ctx = extractPrContext(parseBody(req));
  if (!ctx) {
    return jsonResponse({ ok: false, reason: 'not an analysable pull request webhook payload' });
  }
  if (ctx.skipped) {
    return jsonResponse({ ok: false, reason: ctx.skipped });
  }

  try {
    const result = await analyzePullRequest(ctx);
    return jsonResponse({
      ok: true,
      guidePosted: result.posted,
      topRisk: result.ranked[0]
        ? { path: result.ranked[0].path, score: result.ranked[0].score, tier: result.ranked[0].tier }
        : null,
    });
  } catch (err) {
    // Never 500 the webhook — Bitbucket would disable it after repeated failures.
    console.error('analysis failed', err);
    return jsonResponse({ ok: false, reason: String(err?.message || err) });
  }
}
