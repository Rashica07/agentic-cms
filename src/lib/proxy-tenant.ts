/**
 * Server-side helper for the /api/* proxy routes.
 *
 * A super_admin's JWT carries no tenant, so the backend TenantGuard reads the
 * active tenant from an `x-tenant-id` header. The client mirrors its selected
 * tenant into the `np_active_tenant` cookie (see src/store/useStore.ts), which
 * rides along on same-origin proxy requests. This reads that cookie so the
 * proxy can forward it. Returns `{}` when absent — regular users don't need it
 * (the backend scopes them by their own JWT and ignores the header).
 */
const TENANT_COOKIE = 'np_active_tenant';

export function tenantHeaderFromRequest(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return {};
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === TENANT_COOKIE) {
      const value = rest.join('=').trim();
      return value ? { 'x-tenant-id': value } : {};
    }
  }
  return {};
}
