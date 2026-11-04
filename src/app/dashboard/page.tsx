'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import {
  Layers,
  Database,
  Activity,
  LineChart,
  Plus,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  LogIn,
  UserPlus,
  UserCheck,
  CheckCircle2,
  Paintbrush,
} from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import { useContentStats } from '@/hooks/useContentStats';
import { useMedia } from '@/hooks/useMedia';
import { useAuditLogs, type AuditAction, type AuditLogEntry } from '@/hooks/useAuditLogs';
import { useEnabledModules } from '@/hooks/useModules';
import { usePlan } from '@/hooks/usePlan';
import { PLAN_LABEL } from '@/lib/plan';
import { Button } from '@/components/ui/button';
import { PageHeader, MetaTag } from '@/components/omni/page-header';
import { Panel } from '@/components/omni/panel';
import { Status } from '@/components/omni/status';
import { TrafficChart, FigureStrip } from '@/components/omni/traffic-chart';

const ACTION_META: Record<AuditAction, { icon: React.ElementType; tone: string; verb: string }> = {
  create: { icon: Plus, tone: 'text-green-400', verb: 'Created' },
  update: { icon: Edit, tone: 'text-blue-400', verb: 'Updated' },
  delete: { icon: Trash2, tone: 'text-red-400', verb: 'Deleted' },
  publish: { icon: CheckCircle2, tone: 'text-green-400', verb: 'Published' },
  archive: { icon: Archive, tone: 'text-neutral-400', verb: 'Archived' },
  trash: { icon: Trash2, tone: 'text-amber-400', verb: 'Trashed' },
  restore: { icon: RotateCcw, tone: 'text-blue-400', verb: 'Restored' },
  login: { icon: LogIn, tone: 'text-neutral-400', verb: 'Signed in' },
  invite_sent: { icon: UserPlus, tone: 'text-neutral-300', verb: 'Invited' },
  invite_accepted: { icon: UserCheck, tone: 'text-green-400', verb: 'Joined' },
};

function activityText(log: AuditLogEntry): string {
  const verb = ACTION_META[log.action]?.verb ?? log.action;
  const [kind, typeApiId] = log.resourceType.split(':');
  const type = typeApiId ?? log.metadata?.type ?? kind.replace(/_/g, ' ');
  const label = log.metadata?.slug ?? log.metadata?.title ?? log.metadata?.email;
  if (log.metadata?.count) return `${verb} ${log.metadata.count} entries in ${type}`;
  if (log.action === 'login') return 'Signed in';
  if (label) return `${verb} ${type} “${label}”`;
  return `${verb} ${type}`;
}

export default function CmsOverview() {
  const { data: session } = useSession();
  const { plan } = usePlan();
  const { isModuleEnabled, data: tenant } = useEnabledModules();
  const showTraffic = isModuleEnabled('analytics');
  const { data: stats, isLoading: loadingStats } = useStats(7);
  const { data: content, isLoading: loadingContent } = useContentStats();
  const { data: media } = useMedia();
  const { data: activity, isLoading: loadingActivity } = useAuditLogs(10);
  const role = session?.user?.role;
  const canSeeActivity = role === 'admin' || role === 'super_admin';
  const totals = content?.totals;
  const mediaCount = (media as { total?: number } | undefined)?.total;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        qualifier={tenant?.name}
        meta={<MetaTag>{PLAN_LABEL[plan]}</MetaTag>}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/builder/editor">
                <Paintbrush className="h-3.5 w-3.5" /> Visual editor
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/schema">
                <Database className="h-3.5 w-3.5" /> Schema
              </Link>
            </Button>
          </>
        }
      />

      <FigureStrip
        items={[
          { label: 'Published', value: loadingContent ? '—' : totals?.published ?? 0, hint: totals?.entries ? `of ${totals.entries} entries` : undefined, href: '/dashboard/content' },
          { label: 'Drafts', value: loadingContent ? '—' : totals?.drafts ?? 0, hint: 'Not yet live', href: '/dashboard/content' },
          { label: 'Scheduled', value: loadingContent ? '—' : totals?.scheduled ?? 0, hint: 'Queued to publish', href: '/dashboard/content' },
          { label: 'In trash', value: loadingContent ? '—' : totals?.trashed ?? 0, hint: 'Restorable', href: '/dashboard/content' },
          ...(isModuleEnabled('media') ? [{ label: 'Media files', value: mediaCount ?? '—', hint: 'In the library', href: '/dashboard/media' }] : []),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel
            icon={Layers}
            title="Recently edited"
            description="Latest changes across every content type"
            action={<Link href="/dashboard/content" className="text-xs text-brand-fg hover:underline">All entries</Link>}
          >
            {loadingContent ? (
              <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-surface-2/40" />)}</div>
            ) : content?.recent?.length ? (
              <table className="w-full table-fixed text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="omni-label px-4 py-2 font-normal">Entry</th>
                    <th scope="col" className="omni-label hidden w-[130px] px-4 py-2 font-normal sm:table-cell">Type</th>
                    <th scope="col" className="omni-label w-[120px] px-4 py-2 font-normal">Status</th>
                    <th scope="col" className="omni-label hidden w-[130px] px-4 py-2 text-right font-normal md:table-cell">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {content.recent.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-2/40">
                      <td className="max-w-0 px-4 py-2">
                        <Link href={`/dashboard/content/${entry.typeApiId}/${entry.id}`} className="block truncate text-neutral-200 hover:text-foreground hover:underline">
                          {entry.slug}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-2 font-mono text-xs text-neutral-500 sm:table-cell">{entry.typeApiId}</td>
                      <td className="px-4 py-2">
                        <Status status={entry.status} />
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-2 text-right font-mono text-xs text-neutral-500 md:table-cell">
                        {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-[13px] text-neutral-400">
                No entries yet. <Link href="/dashboard/schema" className="text-brand-fg hover:underline">Define a content type</Link>, then create your first entry.
              </p>
            )}
          </Panel>

          {showTraffic && (
            <Panel
              icon={LineChart}
              title="Site traffic"
              description={
                loadingStats
                  ? 'Last 7 days'
                  : `${(stats?.totalViews ?? 0).toLocaleString()} views · ${(stats?.uniqueVisitors ?? 0).toLocaleString()} unique visitors · last 7 days`
              }
              action={<Link href="/dashboard/analytics" className="text-xs text-brand-fg hover:underline">Analytics</Link>}
            >
              <div className="px-2 py-3">
                {loadingStats ? <div className="h-[160px] animate-pulse rounded bg-surface-2/40" /> : <TrafficChart data={stats?.dailyViews ?? []} height={160} />}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel
            icon={Database}
            title="Content types"
            description={content?.types ? `${content.types.length} defined` : undefined}
            action={<Link href="/dashboard/schema" className="text-xs text-brand-fg hover:underline">Edit schema</Link>}
          >
            {content?.types?.length ? (
              <ul className="divide-y divide-border">
                {content.types.map((t) => (
                  <li key={t.apiId}>
                    <Link href={`/dashboard/content/${t.apiId}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-2/50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-neutral-200">{t.name}</span>
                        <span className="block font-mono text-[11px] text-neutral-500">{t.apiId}</span>
                      </span>
                      <span className="text-right font-mono text-[11px] tabular-nums text-neutral-500">
                        <span className="text-neutral-300">{t.entryCount}</span> entries
                        {t.draftCount > 0 && <span className="block text-amber-400">{t.draftCount} draft</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-[13px] text-neutral-400">{loadingContent ? 'Loading…' : 'No content types yet.'}</p>
            )}
          </Panel>

          {canSeeActivity && (
            <Panel
              icon={Activity}
              title="Activity"
              description="Audit log for this workspace"
              action={<Link href="/dashboard/settings/audit" className="text-xs text-brand-fg hover:underline">Full log</Link>}
            >
              {loadingActivity ? (
                <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-7 animate-pulse rounded bg-surface-2/40" />)}</div>
              ) : activity?.length ? (
                <ul className="divide-y divide-border">
                  {activity.map((log) => {
                    const meta = ACTION_META[log.action] ?? ACTION_META.update;
                    const who = log.user?.firstName ?? log.user?.email?.split('@')[0];
                    return (
                      <li key={log.id} className="flex items-start gap-2.5 px-4 py-2">
                        <meta.icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.tone}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-neutral-300">{activityText(log)}</p>
                          <p className="font-mono text-[11px] text-neutral-500">
                            {who ? `${who} · ` : ''}
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-4 py-6 text-[13px] text-neutral-400">No activity recorded yet.</p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
