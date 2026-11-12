// Faultline v1.3 — renders the PR comment (the visible output) and the chat digest.
// Pure functions. Markdown output; Bitbucket renders it as a PR comment.
//
// Output contract honesty rules enforced here:
//   - evidence-layer failures are RENDERED (never silently dropped to "no history")
//   - caps and truncations are DISCLOSED in the output
//   - `format: 'list'` provides a table-free rendering in case the comment
//     surface does not render markdown tables (set via FAULTLINE_GUIDE_FORMAT)

const { summarize } = require('./engine');

const prLink = (pr) =>
  `https://bitbucket.org/${pr.workspace}/${pr.repo}/pull-requests/${pr.prId}`;

function evidenceLine(ev) {
  if (!ev) return null;
  const linked = ev.url ? `[${ev.text}](${ev.url})` : ev.text;
  const icon = ev.kind === 'postmortem' ? '📄' : '🌐';
  return `${icon} ${linked}`;
}

function renderGuide(pr, ranked, meta = {}) {
  const s = summarize(ranked);
  const L = [];
  const start =
    s.top && s.top.tier !== 'LOW' ? `Start with **${s.top.icon} \`${s.top.path}\`** (${s.top.score}/100).` : '';

  L.push(`## 🔍 Faultline — Review Guide`);
  L.push(`**PR #${pr.prId}: _${pr.title}_**${pr.author ? ` · by ${pr.author}` : ''}`);
  L.push('');
  L.push(
    `**${s.files} file${s.files === 1 ? '' : 's'} changed — ${s.verdict}.**` +
      (s.evidenceBacked > 0
        ? ` ${s.evidenceBacked} of ${s.files} ranked with cited evidence (postmortems / service dependencies).`
        : '') +
      (start ? ` ${start}` : '')
  );
  L.push('');

  // Evidence-layer availability — a failed lookup must never read as "no history".
  if (meta.postmortemsStatus === 'unavailable') {
    L.push(`> ⚠️ **Postmortem evidence unavailable** (${meta.postmortemsReason || 'lookup failed'}) — this ranking uses heuristics only. That is a data-fetch failure, NOT an absence of incident history.`);
    L.push('');
  }
  if (meta.blastStatus === 'unavailable') {
    L.push(`> ⚠️ **Blast-radius evidence unavailable** (${meta.blastReason || 'lookup failed'}) — dependency signals were not included in this ranking.`);
    L.push('');
  }

  // Ranked output — table by default, list fallback for surfaces without table support.
  if ((meta.format || 'table') === 'list') {
    ranked.forEach((f) => {
      L.push(`${f.icon} **${f.rank}.** \`${f.path}\` — **${f.score}/100** (${f.tier}) — ${f.reasons.join(' · ')}`);
    });
  } else {
    L.push('| Priority | File | Risk | Why this ranking |');
    L.push('|---|---|---|---|');
    ranked.forEach((f) => {
      L.push(`| ${f.icon} ${f.rank} | \`${f.path}\` | ${f.score}/100 | ${f.reasons.join(' · ')} |`);
    });
  }
  L.push('');

  // Cap / truncation disclosure — never present a partial ranking as complete.
  const totalForCap = typeof meta.filesTotal === 'number' ? meta.filesTotal : ranked.length;
  if (totalForCap > ranked.length) {
    L.push(`> ℹ️ ${totalForCap - ranked.length} additional changed file${totalForCap - ranked.length === 1 ? '' : 's'} not ranked (large-PR cap).`);
    L.push('');
  }
  if (meta.evidencePathsCovered != null && meta.evidencePathsCovered < totalForCap) {
    L.push(`> ℹ️ Postmortem evidence checked for the first ${meta.evidencePathsCovered} files (lookup cap).`);
    L.push('');
  }

  // Evidence section — the citations behind every evidence-tagged reason.
  const withEvidence = ranked.filter((f) => (f.evidence || []).length > 0);
  if (withEvidence.length > 0) {
    L.push('**📎 Evidence behind the rankings**');
    for (const f of withEvidence) {
      L.push(`- \`${f.path}\``);
      for (const ev of f.evidence) {
        const line = evidenceLine(ev);
        if (line) L.push(`  - ${line}`);
      }
    }
    L.push('');
  }

  const path = ranked
    .filter((f) => f.tier === 'CRITICAL' || f.tier === 'ELEVATED')
    .slice(0, 3);
  if (path.length > 0) {
    L.push('**Suggested review path**');
    path.forEach((f, i) => {
      L.push(`${i + 1}. \`${f.path}\` — ${f.reasons.join(', ')}`);
    });
    L.push('');
    if (!s.hasTestChanges) {
      L.push('> ⚠️ **No test changes in this PR.** If any of the above files carry behavior changes, consider asking for coverage first.');
      L.push('');
    }
  }

  L.push('---');
  L.push('*Signals, in order of trust: **① postmortem references** (Confluence evidence, linked above) · **② service dependencies** (Teamwork Graph) · **③ heuristics** (path patterns, change size, commit churn, test-delta). The top evidence signal outweighs any single heuristic; stacked heuristics can still rank a file high — which is why every reason above is labeled and its evidence linked. Rankings are deterministic — no AI guessing. **A ranking is a starting point, not a verdict — never skip a file because of it.***');
  L.push('');
  L.push(`💬 **Ask me anything about this PR in Rovo chat** — I answer with links and data, not vibes.`);
  return L.join('\n');
}

/** Compact text digest stored for the chat agent — the ONLY text the agent may quote. */
function renderChatDigest(pr, ranked, meta = {}) {
  const lines = ranked.map((f) => {
    const ev = (f.evidence || [])
      .map((e) => (e.url ? `${e.text} (${e.url})` : e.text))
      .join('; ');
    return `${f.icon} #${f.rank} ${f.path} — risk ${f.score}/100 (${f.tier}) — ${f.reasons.join('; ')}${ev ? ` — evidence: ${ev}` : ''}`;
  });
  const warnings = [];
  if (meta.postmortemsStatus === 'unavailable') warnings.push('postmortem evidence unavailable (data-fetch failure, not absence of history)');
  if (meta.blastStatus === 'unavailable') warnings.push('blast-radius evidence unavailable');
  return [
    `PR #${pr.prId} "${pr.title}" by ${pr.author || 'unknown'} — link: ${prLink(pr)}`,
    `${ranked.length} files changed.`,
    ...lines,
    ...(warnings.length > 0 ? [`Warnings: ${warnings.join('; ')}.`] : []),
  ].join('\n');
}

module.exports = { renderGuide, renderChatDigest };
