import type { FieldDef, Block } from '@/lib/blocks';
import { makeBlockId } from '@/lib/blocks';

export interface SiteBlockTypeDef {
  type: string;
  name: string;
  description: string;
}

/**
 * A linked site's own fixed section vocabulary — used instead of the
 * generic BLOCK_TYPES/FIELD_SCHEMA when a tenant's frontend is a real,
 * hand-built codebase (not the generic in-app renderer). The site itself
 * must consume the same `content.blocks` shape (see its home page) for
 * edits made here to actually appear on the live site.
 */
export interface SiteSchema {
  tenantSlug: string;
  siteName: string;
  siteUrl: string;
  blockTypes: SiteBlockTypeDef[];
  fieldSchema: Record<string, FieldDef[]>;
  defaultProps: Record<string, Record<string, unknown>>;
  defaultOrder: string[];
}

export function createSiteBlock(type: string, schema: SiteSchema): Block {
  const defaults = schema.defaultProps[type] ?? {};
  return {
    id: makeBlockId(),
    type,
    // Deep clone so editing one block's list items never mutates the schema defaults.
    props: JSON.parse(JSON.stringify(defaults)),
  };
}

export function siteBlockName(type: string, schema: SiteSchema): string {
  return schema.blockTypes.find((b) => b.type === type)?.name ?? type;
}
