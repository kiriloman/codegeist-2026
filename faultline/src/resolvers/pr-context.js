// Faultline — Bitbucket webhook payload parsing (pure, CJS — unit-testable).
//
// CRITICAL context: real Bitbucket webhook payloads carry the repository
// WITHOUT a `slug` field — only `name` and `full_name`. The REST API, by
// contrast, returns `slug`. Both shapes are accepted here. The original
// parser required `slug` and silently dropped every real webhook delivery
// (manual triggers with synthetic payloads worked; natural ones never did).

/** Returns null when the payload is not an analysable OPEN pull request. */
function extractPrContext(body) {
  const pr = body?.pullrequest;
  const repository = body?.repository;
  if (!pr || !repository || typeof pr.id !== 'number') return null;

  // Only OPEN pull requests get analyzed — declined/merged PRs never get guides.
  if (pr.state && pr.state !== 'OPEN') {
    return { skipped: `PR state is ${pr.state} — only OPEN pull requests are analyzed` };
  }

  const workspace =
    repository?.workspace?.slug ||
    (repository?.full_name || '').split('/')[0] ||
    undefined;
  // Webhook payloads: `name` ("faultline-demo"). REST payloads: `slug`.
  const repo =
    repository?.slug ||
    repository?.name ||
    (repository?.full_name || '').split('/')[1] ||
    undefined;
  if (!workspace || !repo) return null;

  return {
    workspace,
    repo,
    prId: pr.id,
    title: pr.title || `PR #${pr.id}`,
    author: pr.author?.display_name,
  };
}

module.exports = { extractPrContext };
