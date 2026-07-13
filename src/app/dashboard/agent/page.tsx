'use client';

import { useState, type FormEvent } from 'react';
import { Sparkles, Check, X, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useRunAgent,
  useAgentRun,
  useAgentRuns,
  useApproveAction,
  useRejectAction,
} from '@/hooks/useAgent';
import type { ActionStatus, AgentMode } from '@/lib/agent-client';

const MODES: { value: AgentMode; label: string; hint: string }[] = [
  { value: 'copilot', label: 'Copilot', hint: 'Proposes — you approve every change' },
  { value: 'agent', label: 'Agent', hint: 'Reads freely — mutations need one click' },
  { value: 'autonomous', label: 'Autonomous', hint: 'Applies changes automatically' },
];

const STATUS_STYLES: Record<ActionStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  applied: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function StatusPill({ status }: { status: ActionStatus }) {
  const Icon =
    status === 'applied'
      ? CheckCircle2
      : status === 'pending'
        ? Clock
        : status === 'failed'
          ? AlertTriangle
          : X;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[status],
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export default function AgentPage() {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<AgentMode | undefined>(undefined);
  const [runId, setRunId] = useState<string | null>(null);

  const runAgent = useRunAgent();
  const { data: current } = useAgentRun(runId);
  const recent = useAgentRuns();
  const approve = useApproveAction();
  const reject = useRejectAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || runAgent.isPending) return;
    runAgent.mutate(
      { message: message.trim(), mode },
      { onSuccess: (res) => setRunId(res.run.id) },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI Agent</h1>
          <p className="text-sm text-neutral-400">
            Describe what you want done. The agent uses your CMS tools and asks before
            it changes anything.
          </p>
        </div>
      </div>

      {/* Instruction composer */}
      <Card>
        <form onSubmit={submit}>
          <CardContent className="space-y-4 pt-6">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='e.g. "Create an About page, then publish it."'
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-500">Mode</span>
                <select
                  value={mode ?? ''}
                  onChange={(e) => setMode((e.target.value || undefined) as AgentMode | undefined)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <option value="">Auto (by plan)</option>
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span className="hidden text-xs text-neutral-500 sm:inline">
                  {MODES.find((m) => m.value === mode)?.hint ?? 'Clamped to your plan'}
                </span>
              </div>
              <Button type="submit" isLoading={runAgent.isPending} disabled={!message.trim()}>
                Run agent
              </Button>
            </div>
            {runAgent.isError && (
              <p className="text-sm text-red-400">
                {(runAgent.error as Error)?.message || 'Something went wrong.'}
              </p>
            )}
          </CardContent>
        </form>
      </Card>

      {/* Current run */}
      {current && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Result</CardTitle>
              <span className="text-xs uppercase tracking-wide text-neutral-500">
                {current.run.mode} · {current.run.status}
              </span>
            </div>
            {current.run.summary && (
              <CardDescription className="whitespace-pre-wrap text-foreground/90">
                {current.run.summary}
              </CardDescription>
            )}
            {current.run.error && (
              <CardDescription className="text-red-400">{current.run.error}</CardDescription>
            )}
          </CardHeader>
          {current.actions.length > 0 && (
            <CardContent className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Actions
              </p>
              {current.actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{action.summary}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {action.toolName}
                      {action.error ? ` · ${action.error}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {action.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={reject.isPending && reject.variables === action.id}
                          onClick={() => reject.mutate(action.id)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          isLoading={approve.isPending && approve.variables === action.id}
                          onClick={() => approve.mutate(action.id)}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </>
                    ) : (
                      <StatusPill status={action.status} />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Recent runs */}
      {recent.data && recent.data.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Recent
          </p>
          {recent.data.map((run) => (
            <button
              key={run.id}
              onClick={() => setRunId(run.id)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-2',
                run.id === runId && 'border-brand/40',
              )}
            >
              <span className="truncate text-sm text-foreground">{run.message}</span>
              <span className="shrink-0 text-xs text-neutral-500">{run.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
