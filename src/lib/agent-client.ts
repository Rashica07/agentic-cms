/**
 * Thin client for the backend agent endpoints (`/api/v1/agent/*`).
 *
 * Kept separate from the `@rashica07/novus-pulse` SDK for now so the agentic-cms
 * rebuild can evolve the agent surface independently; these can later fold
 * into the SDK once the shape settles. Auth mirrors the SDK: a Bearer access
 * token; tenant scoping is derived from the JWT server-side (TenantGuard).
 */

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '') +
  '/api/v1';

export type AgentMode = 'copilot' | 'agent' | 'autonomous';
export type ActionStatus = 'pending' | 'applied' | 'rejected' | 'failed';

export interface AgentAction {
  id: string;
  runId: string;
  tenantId: string;
  toolName: string;
  summary: string;
  input: Record<string, unknown>;
  status: ActionStatus;
  result: unknown;
  error: string | null;
  decidedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  tenantId: string;
  userId: string | null;
  userEmail: string | null;
  mode: AgentMode;
  message: string;
  status: 'running' | 'completed' | 'failed';
  summary: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface RunResult {
  run: AgentRun;
  actions: AgentAction[];
}

async function request<T>(
  token: string | undefined,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = (data?.message && String(data.message)) || '';
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail || `Agent request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const agentApi = {
  run: (token: string | undefined, message: string, mode?: AgentMode) =>
    request<RunResult>(token, 'POST', '/agent/run', { message, mode }),
  listRuns: (token: string | undefined) => request<AgentRun[]>(token, 'GET', '/agent/runs'),
  getRun: (token: string | undefined, id: string) =>
    request<RunResult>(token, 'GET', `/agent/runs/${id}`),
  approveAction: (token: string | undefined, id: string) =>
    request<AgentAction>(token, 'POST', `/agent/actions/${id}/approve`),
  rejectAction: (token: string | undefined, id: string) =>
    request<AgentAction>(token, 'POST', `/agent/actions/${id}/reject`),
};
