// Faultline — webtrigger entry for Bitbucket PR webhooks.
// Handles all body shapes, fail-closed auth, never 500s (Bitbucket disables
// failing webhooks), skips non-OPEN pull requests, and returns a proper
// { body, headers, statusCode } shape.

import { analyzePullRequest } from './analyze-pr';
import { parseBody, isAuthorized, jsonResponse } from './webtrigger-utils';

export async function runPrWebhook(req) {
  if (!isAuthorized(req)) {
    return jsonResponse({ ok: false, reason: 'unauthorized' }, 401);
  }

  const body = parseBody(req);
  const pr = body?.pullrequest;
  const repository = body?.repository;
  if (!pr || !repository) {
    return jsonResponse({ ok: false, reason: 'not a pull request webhook payload' });
  }

  // Only OPEN pull requests get analyzed — declined/merged PRs never get guides.
  if (pr.state && pr.state !== 'OPEN') {
    return jsonResponse({ ok: false, reason: `PR state is ${pr.state} — only OPEN pull requests are analyzed` });
  }

  const workspace = repository?.workspace?.slug || (repository?.full_name || '').split('/')[0];
  const repo = repository?.slug;
  const prId = pr?.id;
  if (!workspace || !repo || !prId) {
    return jsonResponse({ ok: false, reason: 'missing workspace/repo/pr id' });
  }

  try {
    const result = await analyzePullRequest({
      workspace,
      repo,
      prId,
      title: pr.title || `PR #${prId}`,
      author: pr.author?.display_name,
    });
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
