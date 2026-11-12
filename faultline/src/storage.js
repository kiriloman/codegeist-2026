// KVS access layer. Every consumer flows through this file, so any @forge/kvs
// API-shape drift is a one-line fix here. The namespace import works whether the
// package exposes the documented named `kvs` export or a default export.
import * as KvsModule from '@forge/kvs';

const kvs = KvsModule.kvs || KvsModule.default;

const key = (ws, repo, prId) => `analysis:${ws}/${repo}/${prId}`;

export async function saveAnalysis(ws, repo, prId, data) {
  await kvs.set(key(ws, repo, prId), { ...data, updatedAt: Date.now() });
  // Activity index for the admin page — deduped so re-analyzed PRs stay in place.
  const ref = `${ws}/${repo}/${prId}`;
  const index = (await kvs.get('activity-index')) || [];
  const deduped = [ref, ...index.filter((r) => r !== ref)];
  await kvs.set('activity-index', deduped.slice(0, 50));
}

export async function getAnalysis(ws, repo, prId) {
  return kvs.get(key(ws, repo, prId));
}

export async function recentAnalyses() {
  const index = (await kvs.get('activity-index')) || [];
  const out = [];
  for (const ref of index.slice(0, 20)) {
    const [ws, repo, prId] = ref.split('/');
    const a = await kvs.get(`analysis:${ref}`);
    if (a) out.push({ ws, repo, prId: Number(prId), ...a });
  }
  return out;
}
