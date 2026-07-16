import type { SiteSchema } from './types';
import { kiqaDevSchema } from './kiqa-dev';

export type { SiteSchema, SiteBlockTypeDef } from './types';
export { createSiteBlock, siteBlockName } from './types';

/**
 * Tenants whose frontend is a real, hand-built site get their own fixed
 * section schema here instead of the generic block system. Tenants not
 * listed fall back to the generic editor (src/lib/blocks.ts) — the
 * "project not linked to any website" path.
 */
const SITE_SCHEMAS_BY_TENANT_SLUG: Record<string, SiteSchema> = {
  [kiqaDevSchema.tenantSlug]: kiqaDevSchema,
};

export function getSiteSchemaForTenant(tenantSlug?: string | null): SiteSchema | null {
  if (!tenantSlug) return null;
  return SITE_SCHEMAS_BY_TENANT_SLUG[tenantSlug] ?? null;
}
