import type { InstallRunPayload, InstallRunResponse, InstallStatus } from './types';

const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/install`;

/**
 * Thrown for any non-2xx response from the install API so callers can branch
 * on the HTTP status (e.g. 403 means "already installed").
 */
export class InstallApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'InstallApiError';
    this.status = status;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function fetchInstallStatus(): Promise<InstallStatus> {
  let res: Response;
  try {
    res = await fetch(`${API}/status`, { cache: 'no-store' });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new InstallApiError(extractMessage(body, `Status check failed (${res.status})`), res.status);
  }

  return body as InstallStatus;
}

export async function runInstall(payload: InstallRunPayload): Promise<InstallRunResponse> {
  let res: Response;
  try {
    res = await fetch(`${API}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new InstallApiError(extractMessage(body, `Installation failed (${res.status})`), res.status);
  }

  return body as InstallRunResponse;
}
