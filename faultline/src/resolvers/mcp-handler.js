// Faultline — MCP server endpoint (JSON-RPC 2.0 over a Forge webtrigger).
// Implements the MCP tool protocol: initialize, tools/list, tools/call, ping.
// Any MCP client (Claude, Cursor, Rovo Studio) can point at this endpoint —
// that's the "Best App with Atlassian MCP" bonus track.
// Conformance notes: notifications return no body (202); initialize responds
// with a SUPPORTED protocolVersion (echoing the client's only when supported);
// tool failures are returned as tool results with isError: true (per the MCP
// spec), not protocol errors; a missing method is -32600 (Invalid Request).
// [VERIFY] Atlassian is shipping a native Forge MCP server module — when its
// manifest schema is confirmed, this handler can move to it unchanged in logic.

import { getAnalysis, recentAnalyses } from '../storage';
import { analyzePrById } from './analyze-pr';
import { parseBody, isAuthorized, jsonResponse } from './webtrigger-utils';

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const DEFAULT_PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  {
    name: 'faultline_get_review_context',
    description:
      'Get the stored deterministic risk ranking and evidence digest for a Bitbucket pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        ws: { type: 'string', description: 'Bitbucket workspace' },
        repo: { type: 'string', description: 'Repository slug' },
        prId: { type: 'number', description: 'Pull request id' },
      },
      required: ['ws', 'repo', 'prId'],
    },
  },
  {
    name: 'faultline_get_blast_radius',
    description:
      'Get blast-radius evidence (dependent services, provenance) recorded for a pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        ws: { type: 'string' },
        repo: { type: 'string' },
        prId: { type: 'number' },
        path: { type: 'string', description: 'Optional: filter to a single file path' },
      },
      required: ['ws', 'repo', 'prId'],
    },
  },
  {
    name: 'faultline_list_recent_analyses',
    description: 'List the most recent pull-request analyses Faultline has produced.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'faultline_analyze_pr',
    description:
      'Run a fresh risk analysis for a Bitbucket pull request now (fetches the PR, ranks its files, posts/updates the guide comment).',
    inputSchema: {
      type: 'object',
      properties: {
        ws: { type: 'string', description: 'Bitbucket workspace' },
        repo: { type: 'string', description: 'Repository slug' },
        prId: { type: 'number', description: 'Pull request id' },
      },
      required: ['ws', 'repo', 'prId'],
    },
  },
];

const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function callTool(name, args) {
  switch (name) {
    case 'faultline_get_review_context': {
      const a = await getAnalysis(args.ws, args.repo, args.prId);
      if (!a) {
        throw new Error(
          `No stored analysis for ${args.ws}/${args.repo} PR #${args.prId}. ` +
            'Analyses are created when the PR webhook fires — open or update the PR first.'
        );
      }
      return { title: a.title, digest: a.digest, ranked: a.ranked };
    }
    case 'faultline_get_blast_radius': {
      const a = await getAnalysis(args.ws, args.repo, args.prId);
      if (!a) throw new Error(`No stored analysis for PR #${args.prId}`);
      const blast = (a.ranked || [])
        .filter((f) => (f.evidence || []).some((e) => e.kind === 'blast-radius'))
        .filter((f) => !args?.path || f.path === args.path)
        .map((f) => ({
          path: f.path,
          evidence: f.evidence.filter((e) => e.kind === 'blast-radius'),
        }));
      return { blast };
    }
    case 'faultline_list_recent_analyses': {
      const list = await recentAnalyses();
      return {
        analyses: list.map((x) => ({
          workspace: x.ws,
          repo: x.repo,
          prId: x.prId,
          title: x.title,
          topRisk: x.ranked?.[0] ? { path: x.ranked[0].path, score: x.ranked[0].score } : null,
        })),
      };
    }
    case 'faultline_analyze_pr': {
      const result = await analyzePrById(args.ws, args.repo, args.prId);
      return {
        analyzed: true,
        guidePosted: result.posted,
        topRisk: result.ranked?.[0] || null,
        ranked: result.ranked,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function runMcpEndpoint(req) {
  if (!isAuthorized(req)) {
    return jsonResponse(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'unauthorized' } },
      401
    );
  }

  const body = parseBody(req);
  const { id, method, params } = body || {};

  // A JSON-RPC request without a method is Invalid Request (-32600),
  // not Method Not Found.
  if (method === undefined || method === null) {
    return jsonResponse(rpcError(id, -32600, 'Invalid Request: missing method'));
  }

  // MCP notifications (e.g. "notifications/initialized", sent by Claude/Cursor
  // right after initialize) carry no id and expect NO response body.
  if (typeof method === 'string' && method.startsWith('notifications/')) {
    return { body: '', headers: {}, statusCode: 202 };
  }

  try {
    switch (method) {
      case 'initialize':
        return jsonResponse(
          rpcResult(id, {
            // Respond with a version we actually support: echo the client's
            // requested version only when it is one of them (spec-compliant
            // negotiation for a stateless server).
            protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(params?.protocolVersion)
              ? params.protocolVersion
              : DEFAULT_PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'faultline', version: '1.3.0' },
          })
        );
      case 'tools/list':
        return jsonResponse(rpcResult(id, { tools: TOOLS }));
      case 'tools/call': {
        try {
          const result = await callTool(params?.name, params?.arguments || {});
          return jsonResponse(
            rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
          );
        } catch (toolError) {
          // Per the MCP spec, tool execution failures are TOOL RESULTS with
          // isError: true — not JSON-RPC protocol errors.
          return jsonResponse(
            rpcResult(id, {
              content: [{ type: 'text', text: String(toolError?.message || toolError) }],
              isError: true,
            })
          );
        }
      }
      case 'ping':
        return jsonResponse(rpcResult(id, {}));
      default:
        return jsonResponse(rpcError(id, -32601, `Method not found: ${method}`));
    }
  } catch (e) {
    return jsonResponse(rpcError(id, -32000, String(e?.message || e)));
  }
}
