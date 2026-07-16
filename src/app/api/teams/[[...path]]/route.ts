import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Authenticated proxy for the backend content API.
 * The dashboard pages call /api/content/* (same-origin, next-auth session);
 * this forwards to {API_URL}/api/v1/content/* with the session's bearer token
 * so the backend's JwtAuthGuard + TenantGuard scope everything to the tenant.
 */
async function proxy(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const path = (await ctx.params).path || [];
  const search = new URL(req.url).search;
  
  const pathString = path.length > 0 ? `/${path.map(encodeURIComponent).join('/')}` : '';
  const target = `${API_URL}/api/v1/teams${pathString}${search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text();
    if (body) init.body = body;
  }

  const res = await fetch(target, init);
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/json',
    },
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
