'use client';

import { usePages } from '@/hooks/usePages';
import { useMedia } from '@/hooks/useMedia';
import { useApiStatus } from '@/hooks/useApiStatus';
import { useStats } from '@/hooks/useStats';
import { useContentStats } from '@/hooks/useContentStats';
import { useAuditLogs, type AuditAction, type AuditLogEntry } from '@/hooks/useAuditLogs';
import { usePlan } from '@/hooks/usePlan';
import { useEnabledModules, type ModuleKey } from '@/hooks/useModules';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Image as ImageIcon,
  Settings,
  Paintbrush,
  Zap,
  CheckCircle2,
  TrendingUp,
  Plus,
  Lightbulb,
  Layers,
  Database,
  FolderTree,
  SearchCheck,
  FormInput,
  AlignLeft,
  LineChart,
  Sparkles,
  Webhook,
  KeyRound,
  Users,
  ArrowRightLeft,
  CalendarCheck,
  Contact,
  Mail,
  Lock,
  Clock,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  LogIn,
  UserPlus,
  UserCheck,
  ChevronRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { hasFeature, PLAN_LABEL, type FeatureKey } from '@/lib/plan';

// ─── STATUS BADGE ──────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, string> = {
  published: 'bg-green-500/10 text-green-400',
  draft: 'bg-amber-500/10 text-amber-400',
  in_review: 'bg-blue-500/10 text-blue-400',
  scheduled: 'bg-purple-500/10 text-purple-400',
  archived: 'bg-neutral-500/10 text-neutral-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[status] ?? STATUS_TONE.archived)}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── MODULE GRID ───────────────────────────────────────────────────────────────

type ModuleCard = {
  name: string;
  desc: string;
  icon: React.ElementType;
  tone: string;
  /** Absent → not clickable yet. */
  href?: string;
  /** Live count key resolved at render. */
  countKey?: 'entries' | 'types' | 'media' | 'pages';
  /** Hidden entirely when the tenant disables this module. */
  module?: ModuleKey;
  /** Locked when the plan lacks this feature. */
  gate?: FeatureKey;
  /** Backend exists, UI still to come. */
  apiReady?: boolean;
};

const MODULES: ModuleCard[] = [
  { name: 'Entries', desc: 'All structured content', icon: Layers, tone: 'bg-brand/10 text-brand', href: '/dashboard/content', countKey: 'entries', module: 'content' },
  { name: 'Schema Builder', desc: 'Define content types & fields', icon: Database, tone: 'bg-violet-500/10 text-violet-400', href: '/dashboard/schema', countKey: 'types', module: 'content' },
  { name: 'Media Library', desc: 'Images, files & folders', icon: ImageIcon, tone: 'bg-pink-500/10 text-pink-400', href: '/dashboard/media', countKey: 'media', module: 'media' },
  { name: 'Visual Editor', desc: 'Design your live site', icon: Paintbrush, tone: 'bg-orange-500/10 text-orange-400', href: '/dashboard/builder', module: 'pages' },
  { name: 'Pages', desc: 'Site pages & revisions', icon: FileText, tone: 'bg-blue-500/10 text-blue-400', href: '/dashboard/pages', countKey: 'pages', module: 'pages' },
  { name: 'Categories & Tags', desc: 'Taxonomy & organisation', icon: FolderTree, tone: 'bg-teal-500/10 text-teal-400', href: '/dashboard/categories', module: 'content' },
  { name: 'SEO & Meta', desc: 'Optimisation & metadata', icon: SearchCheck, tone: 'bg-cyan-500/10 text-cyan-400', href: '/dashboard/seo', gate: 'seo' },
  { name: 'Forms', desc: 'Submissions & lead capture', icon: FormInput, tone: 'bg-emerald-500/10 text-emerald-400', href: '/dashboard/forms', module: 'forms', gate: 'forms' },
  { name: 'Menus', desc: 'Navigation builder', icon: AlignLeft, tone: 'bg-indigo-500/10 text-indigo-400', href: '/dashboard/menus', module: 'menus', gate: 'menus' },
  { name: 'Analytics', desc: 'Traffic & reporting', icon: LineChart, tone: 'bg-sky-500/10 text-sky-400', href: '/dashboard/analytics', module: 'analytics' },
  { name: 'AI Copilot', desc: 'Drafts & suggestions', icon: Sparkles, tone: 'bg-fuchsia-500/10 text-fuchsia-400', href: '/dashboard/agent', module: 'agent' },
  { name: 'Webhooks', desc: 'Outbound event delivery', icon: Webhook, tone: 'bg-amber-500/10 text-amber-400', href: '/dashboard/settings/webhooks' },
  { name: 'API Keys', desc: 'Delivery API & previews', icon: KeyRound, tone: 'bg-yellow-500/10 text-yellow-400', href: '/dashboard/settings/api-keys' },
  { name: 'Team & Permissions', desc: 'Roles per content type', icon: Users, tone: 'bg-rose-500/10 text-rose-400', href: '/dashboard/settings/team', gate: 'roles' },
  { name: 'Redirects', desc: 'URL redirect manager', icon: ArrowRightLeft, tone: 'bg-lime-500/10 text-lime-400', href: '/dashboard/seo/redirects', gate: 'seo' },
  { name: 'Reservations', desc: 'Bookings & availability', icon: CalendarCheck, tone: 'bg-purple-500/10 text-purple-400', href: '/dashboard/reservations', module: 'reservations' },
  { name: 'CRM', desc: 'Contacts & pipeline', icon: Contact, tone: 'bg-slate-500/10 text-slate-400', href: '/dashboard/crm', module: 'crm' },
  { name: 'Email Campaigns', desc: 'Broadcasts & templates', icon: Mail, tone: 'bg-red-500/10 text-red-400', href: '/dashboard/email', module: 'email' },
];

// ─── ACTIVITY FEED ─────────────────────────────────────────────────────────────

const ACTION_META: Record<AuditAction, { icon: React.ElementType; tone: string; verb: string }> = {
  create: { icon: Plus, tone: 'text-green-400', verb: 'Created' },
  update: { icon: Edit, tone: 'text-blue-400', verb: 'Updated' },
  delete: { icon: Trash2, tone: 'text-red-400', verb: 'Deleted' },
  publish: { icon: CheckCircle2, tone: 'text-green-400', verb: 'Published' },
  archive: { icon: Archive, tone: 'text-neutral-400', verb: 'Archived' },
  trash: { icon: Trash2, tone: 'text-amber-400', verb: 'Trashed' },
  restore: { icon: RotateCcw, tone: 'text-blue-400', verb: 'Restored' },
  login: { icon: LogIn, tone: 'text-neutral-400', verb: 'Signed in' },
  invite_sent: { icon: UserPlus, tone: 'text-purple-400', verb: 'Invited' },
  invite_accepted: { icon: UserCheck, tone: 'text-green-400', verb: 'Joined' },
};

function activityText(log: AuditLogEntry): string {
  const meta = ACTION_META[log.action];
  const verb = meta?.verb ?? log.action;
  // resourceType looks like "content:page" — the part after ':' is the type apiId.
  const [kind, typeApiId] = log.resourceType.split(':');
  const label = log.metadata?.slug ?? log.resourceId?.slice(0, 8) ?? '';
  const count = log.metadata?.count;

  if (count) return `${verb} ${count} entries in ${typeApiId ?? kind}`;
  if (log.action === 'login') return 'Signed in';
  if (label) return `${verb} “${label}”${typeApiId ? ` in ${typeApiId}` : ''}`;
  return `${verb} ${typeApiId ?? kind}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({
  label, value, icon: Icon, iconClassName, hint, className,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('bg-surface hover:border-border-strong transition-colors border-border shadow-sm', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-neutral-400">{label}</span>
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', iconClassName)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <span className="text-2xl font-bold text-foreground leading-none">{value}</span>
        <p className="text-xs text-neutral-500 mt-2 min-h-[1em]">{hint}</p>
      </CardContent>
    </Card>
  );
}

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const { data: session } = useSession();
  const { data: pages, isLoading: isLoadingPages } = usePages();
  const { data: photos, isLoading: isLoadingPhotos } = useMedia();
  const { data: stats, isLoading: isLoadingStats } = useStats(7);
  const { data: content, isLoading: isLoadingContent } = useContentStats();
  const { data: activity, isLoading: isLoadingActivity } = useAuditLogs(8);
  const { plan } = usePlan();
  const { isModuleEnabled, enabledModules } = useEnabledModules();
  const apiOnline = useApiStatus();

  const role = session?.user?.role;
  const canSeeActivity = role === 'admin' || role === 'super_admin';

  const firstName = session?.user?.name?.split(' ')[0];
  const mediaCount = (photos as any)?.total ?? 0;
  const totals = content?.totals;

  const counts: Record<NonNullable<ModuleCard['countKey']>, number> = {
    entries: totals?.entries ?? 0,
    types: content?.types?.length ?? 0,
    media: mediaCount,
    pages: pages?.length ?? 0,
  };

  const visibleModules = MODULES.filter((m) => !m.module || isModuleEnabled(m.module));

  const chartData = stats?.dailyViews?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    views: d.views,
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ─── HEADER ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/builder">
            <Button className="gap-2 shadow-md">
              <Plus className="h-4 w-4" /> Add Page
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── STATS GRID ───────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Published"
          value={isLoadingContent ? '–' : totals?.published ?? 0}
          icon={CheckCircle2}
          iconClassName="bg-green-500/10 text-green-400"
          hint={!isLoadingContent && totals?.entries ? `${Math.round(((totals.published ?? 0) / totals.entries) * 100)}% of all content` : undefined}
          className="anim-fade-up stagger-1"
        />
        <StatCard
          label="Drafts"
          value={isLoadingContent ? '–' : totals?.drafts ?? 0}
          icon={FileText}
          iconClassName="bg-amber-500/10 text-amber-400"
          hint={!isLoadingContent && (totals?.scheduled ?? 0) > 0 ? `${totals?.scheduled} scheduled` : !isLoadingContent && (totals?.trashed ?? 0) > 0 ? `${totals?.trashed} in trash` : undefined}
          className="anim-fade-up stagger-2"
        />
        <StatCard
          label="Total Views (7d)"
          value={isLoadingStats ? '–' : stats?.totalViews ?? 0}
          icon={TrendingUp}
          iconClassName="bg-blue-500/10 text-blue-400"
          hint={!isLoadingStats ? `${stats?.uniqueVisitors ?? 0} unique visitors` : undefined}
          className="anim-fade-up stagger-3"
        />
        <StatCard
          label="Live Sync Status"
          value={
            <span className={cn('text-lg', apiOnline === null ? 'text-neutral-400' : apiOnline ? 'text-green-400' : 'text-red-400')}>
              {apiOnline === null ? 'Checking…' : apiOnline ? 'Online' : 'Offline'}
            </span>
          }
          icon={Zap}
          iconClassName={cn(
            apiOnline === true && 'bg-green-500/10 text-green-400',
            apiOnline === false && 'bg-red-500/10 text-red-400',
            apiOnline === null && 'bg-neutral-500/10 text-neutral-400',
          )}
          hint={apiOnline === false ? 'Check your API connection' : apiOnline === true ? 'All systems normal' : undefined}
          className="anim-fade-up stagger-4"
        />
      </div>

      {/* ─── MODULE GRID ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Platform Modules</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {visibleModules.filter((m) => m.href).length} active — click to manage
            </p>
          </div>
          <Link href="/dashboard/settings" className="flex items-center gap-1.5 text-xs text-brand hover:text-brand/80 transition-colors">
            Configure modules
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {visibleModules.map((mod) => {
            const locked = mod.gate ? !hasFeature(plan, mod.gate) : false;
            const count = mod.countKey ? counts[mod.countKey] : undefined;
            const clickable = !!mod.href && !locked;

            const inner = (
              <>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform', mod.tone, clickable && 'group-hover:scale-110', !clickable && 'opacity-50')}>
                  <mod.icon className="h-[22px] w-[22px]" />
                </div>
                <h4 className={cn('text-xs font-semibold truncate', clickable ? 'text-foreground' : 'text-neutral-400')}>
                  {mod.name}
                </h4>
                <p className="text-neutral-500 text-[10px] mt-0.5 line-clamp-2 min-h-[2em]">{mod.desc}</p>
                <div className="flex items-center justify-between mt-2 gap-1">
                  {count !== undefined && clickable ? (
                    <span className="text-[10px] text-neutral-600">{count} item{count === 1 ? '' : 's'}</span>
                  ) : <span />}
                  {locked ? (
                    <span className="shrink-0 rounded bg-neutral-800/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                      <Lock className="h-2.5 w-2.5 inline-block mr-0.5" />
                      {PLAN_LABEL[hasFeature('studio', mod.gate!) ? 'studio' : 'agency']}
                    </span>
                  ) : mod.apiReady ? (
                    <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">
                      API ready
                    </span>
                  ) : !mod.href ? (
                    <span className="shrink-0 rounded bg-neutral-800/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                      Soon
                    </span>
                  ) : null}
                </div>
              </>
            );

            const classes = cn(
              'group rounded-xl p-4 border text-left transition-all bg-surface',
              clickable ? 'border-border hover:border-border-strong cursor-pointer' : 'border-border/50 cursor-not-allowed',
            );

            return clickable ? (
              <Link key={mod.name} href={mod.href!} className={classes}>{inner}</Link>
            ) : (
              <div key={mod.name} className={classes} title={locked ? 'Not available on your plan' : 'Coming soon'}>{inner}</div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── MAIN COLUMN ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Card */}
          <Card className="bg-surface border-border shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50 bg-surface-2/30">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Store Sessions</CardTitle>
                <CardDescription>Page views over the last 7 days</CardDescription>
              </div>
              <select className="h-8 rounded-md border border-border-strong bg-surface-2 px-2 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-brand">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[280px] w-full pt-6 pr-6 pb-2 pl-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff8c00" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff8c00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dx={-10} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="views" stroke="#ff8c00" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Content Table */}
          <Card className="bg-surface border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Recent Content</CardTitle>
                <CardDescription>Latest entries across every content type</CardDescription>
              </div>
              <Link href="/dashboard/content">
                <Button variant="link" className="text-brand h-auto p-0 font-medium">View all</Button>
              </Link>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-400 bg-surface-2/50 uppercase border-b border-border/50">
                  <tr>
                    <th className="px-5 py-3 font-medium">Entry</th>
                    <th className="px-5 py-3 font-medium hidden sm:table-cell">Type</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium hidden md:table-cell">Updated</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoadingContent ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded w-3/4" /></td>
                        <td className="px-5 py-4 hidden sm:table-cell"><div className="h-4 bg-neutral-800 rounded w-16" /></td>
                        <td className="px-5 py-4"><div className="h-4 bg-neutral-800 rounded w-16" /></td>
                        <td className="px-5 py-4 hidden md:table-cell"><div className="h-4 bg-neutral-800 rounded w-24" /></td>
                        <td className="px-5 py-4" />
                      </tr>
                    ))
                  ) : content?.recent?.length ? (
                    content.recent.map((entry) => (
                      <tr key={entry.id} className="hover:bg-surface-2/30 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-neutral-500 shrink-0" />
                            <Link href={`/dashboard/content/${entry.typeApiId}/${entry.id}`} className="font-medium text-foreground hover:underline truncate">
                              {entry.slug}
                            </Link>
                            <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium uppercase text-neutral-400 shrink-0">
                              {entry.locale}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-xs text-neutral-400 bg-surface-2 px-2 py-0.5 rounded">{entry.typeApiId}</span>
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={entry.status} /></td>
                        <td className="px-5 py-3.5 text-neutral-400 hidden md:table-cell">
                          {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
                        </td>
                        <td className="px-5 py-3.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/dashboard/content/${entry.typeApiId}/${entry.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs font-medium">Edit</Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-neutral-500">
                        No content yet. <Link href="/dashboard/schema" className="text-brand hover:underline">Define a content type</Link> to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ─── RIGHT COLUMN ───────────────────────────────── */}
        <div className="space-y-6">
          {/* Activity Feed — audit log is admin-only server-side */}
          {canSeeActivity && (
            <Card className="bg-surface border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Activity</CardTitle>
                  <CardDescription>Recent changes in this workspace</CardDescription>
                </div>
                <Clock className="h-4 w-4 text-neutral-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-3">
                {isLoadingActivity ? (
                  <div className="space-y-3 p-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 bg-neutral-800/50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : activity?.length ? (
                  <div className="space-y-0.5">
                    {activity.map((log) => {
                      const meta = ACTION_META[log.action] ?? ACTION_META.update;
                      const Icon = meta.icon;
                      const who = log.user?.firstName ?? log.user?.email?.split('@')[0];
                      return (
                        <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-2/50 transition-colors">
                          <Icon className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', meta.tone)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-neutral-300 leading-relaxed">{activityText(log)}</p>
                            <p className="text-[10px] text-neutral-600 mt-0.5">
                              {who ? `${who} · ` : ''}
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-neutral-500">No activity recorded yet.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Setup Guide */}
          <Card className="bg-brand/5 border-brand/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Lightbulb className="h-24 w-24 text-brand" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-brand">Setup Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-300 mb-5 relative z-10">
                You&apos;re almost there! Complete these remaining steps to launch your store.
              </p>
              <div className="space-y-3 relative z-10">
                <div className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="text-neutral-400 line-through">Create workspace</span>
                </div>
                <div className={cn('flex items-start gap-3 text-sm', (content?.types?.length ?? 0) > 0 ? 'text-neutral-400' : 'font-medium text-foreground')}>
                  {(content?.types?.length ?? 0) > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-brand flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-brand" />
                    </div>
                  )}
                  <span className={(content?.types?.length ?? 0) > 0 ? 'line-through' : undefined}>Define a content type</span>
                </div>
                <div className={cn('flex items-start gap-3 text-sm', (totals?.entries ?? 0) > 0 ? 'text-neutral-400' : 'font-medium text-foreground')}>
                  {(totals?.entries ?? 0) > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-neutral-600 shrink-0" />
                  )}
                  <span className={(totals?.entries ?? 0) > 0 ? 'line-through' : undefined}>Create your first entry</span>
                </div>
                <div className={cn('flex items-start gap-3 text-sm', (totals?.published ?? 0) > 0 ? 'text-neutral-400' : 'text-neutral-400')}>
                  {(totals?.published ?? 0) > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-neutral-600 shrink-0" />
                  )}
                  <span className={(totals?.published ?? 0) > 0 ? 'line-through' : undefined}>Publish something</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-surface border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                <Link href="/dashboard/builder" className="group flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors border-b border-border/50">
                  <div className="h-8 w-8 rounded bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Paintbrush className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Visual Editor</p>
                    <p className="text-xs text-neutral-400">Design your live site</p>
                  </div>
                  {!isLoadingPages && <span className="text-xs text-neutral-500 shrink-0">{pages?.length ?? 0} pages</span>}
                </Link>
                <Link href="/dashboard/media" className="group flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors border-b border-border/50">
                  <div className="h-8 w-8 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Upload Media</p>
                    <p className="text-xs text-neutral-400">Add photos to your library</p>
                  </div>
                  {!isLoadingPhotos && <span className="text-xs text-neutral-500 shrink-0">{mediaCount} files</span>}
                </Link>
                <Link href="/dashboard/settings" className="group flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors">
                  <div className="h-8 w-8 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Manage Settings</p>
                    <p className="text-xs text-neutral-400">Configure your tenant</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── SYSTEM STATUS STRIP ──────────────────────────── */}
      <div className="p-4 rounded-xl bg-surface/50 border border-border/50 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', apiOnline === null ? 'bg-neutral-500' : apiOnline ? 'bg-green-400' : 'bg-red-400')} />
          <span className="text-xs text-neutral-400">
            API: {apiOnline === null ? 'Checking' : apiOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-neutral-500" />
          <span className="text-xs text-neutral-400">
            {enabledModules === null || enabledModules === undefined ? 'All modules enabled' : `${enabledModules.length} modules enabled`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-3 w-3 text-neutral-500" />
          <span className="text-xs text-neutral-400">
            {isLoadingContent ? '–' : `${content?.types?.length ?? 0} content types · ${totals?.entries ?? 0} entries`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-3 w-3 text-neutral-500" />
          <span className="text-xs text-neutral-400">{mediaCount} media files</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand" />
          <span className="text-xs text-neutral-400">Plan: {PLAN_LABEL[plan]}</span>
        </div>
      </div>
    </div>
  );
}
