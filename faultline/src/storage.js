// KVS access layer. Every consumer flows through this file, so any @forge/kvs
// API-shape drift is a one-line fix here. The namespace import works whether the
// package exposes the documented named `kvs` export or a default export.
//
// KEY FORMAT (deploy-validated): keys must match ^[a-zA-Z0-9:._\s-#]+$ — NO
// forward slashes. Separator is '.', which is unambiguous because Bitbucket
// repo slugs are [a-z0-9_-]+ and workspace slugs contain no dots.
import * as KvsModule from '@forge/kvs';

const kvs = KvsModule.kvs || KvsModule.default;

const key = (ws, repo, prId) => `analysis:${ws}.${repo}.${prId}`;
const ref = (ws, repo, prId) => `${ws}.${repo}.${prId}`;

export async function saveAnalysis(ws, repo, prId, data) {
  await kvs.set(key(ws, repo, prId), { ...data, updatedAt: Date.now() });
  // Activity index for the admin page — deduped so re-analyzed PRs stay in place.
  const r = ref(ws, repo, prId);
  const index = (await kvs.get('activity-index')) || [];
  const deduped = [r, ...index.filter((x) => x !== r)];
  await kvs.set('activity-index', deduped.slice(0, 50));
}

export async function getAnalysis(ws, repo, prId) {
  return kvs.get(key(ws, repo, prId));
}

export async function recentAnalyses() {
  const index = (await kvs.get('activity-index')) || [];
  const out = [];
  for (const r of index.slice(0, 20)) {
    const [ws, repo, prId] = r.split('.');
    const a = await kvs.get(`analysis:${r}`);
    if (a) out.push({ ws, repo, prId: Number(prId), ...a });
  }
  return out;
}
