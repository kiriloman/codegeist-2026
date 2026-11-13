// Faultline — analysis orchestrator wiring. Manifest `function.handler` entries point here.
export { runPrWebhook } from './pr-webhook';
export { runAgentAction } from './agent-actions';
import { recentAnalyses } from '../storage';

/** Custom UI bridge: the admin page calls invoke('recent-analyses'). */
export async function runRecentAnalyses() {
  return { analyses: await recentAnalyses() };
}
