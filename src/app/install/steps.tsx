'use client';

import { Fragment } from 'react';
import { Check, CheckCircle2, Loader2, MinusCircle, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  AdminFormData,
  InstallStatus,
  InstallStepResult,
  InstallStepStatus,
  SupportedLanguage,
  WebsiteFormData,
} from './types';
import { passwordStrength } from './validation';
import type { AdminFieldErrors, WebsiteFieldErrors } from './validation';

const STEP_LABELS = ['Welcome', 'License', 'Database', 'Administrator', 'Website', 'Install'];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < current;
        const isActive = stepNumber === current;
        return (
          <Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  isComplete && 'border-brand bg-brand text-black',
                  isActive && !isComplete && 'border-brand text-brand',
                  !isActive && !isComplete && 'border-border text-neutral-500'
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : stepNumber}
              </div>
              <span
                className={cn(
                  'hidden text-center text-[11px] leading-tight sm:block',
                  isActive ? 'text-white' : 'text-neutral-500'
                )}
              >
                {label}
              </span>
            </div>
            {stepNumber < STEP_LABELS.length && (
              <div className={cn('mx-1 h-px flex-1', stepNumber < current ? 'bg-brand' : 'bg-border')} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        ok ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {ok ? 'Reachable' : 'Unreachable'}
    </span>
  );
}

export function WelcomeStep({
  status,
  loading,
  error,
  onRetry,
}: {
  status: InstallStatus | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Welcome to Novus Pulse</h2>
        <p className="text-sm text-neutral-400">
          This wizard sets up your Novus Pulse installation: it verifies your environment, creates
          your administrator account, and configures your first website. It only takes a few
          minutes.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking environment...
        </div>
      )}

      {!loading && error && (
        <div className="space-y-3 rounded-md border border-red-900/50 bg-red-950/30 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && status && (
        <div className="space-y-3 rounded-md border border-border bg-surface-2 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Requirements</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-neutral-400">Node.js version</dt>
              <dd className="font-mono text-white">{status.checks.nodeVersion}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-400">Database</dt>
              <dd>
                <StatusBadge ok={status.checks.db === 'ok'} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-400">Pending migrations</dt>
              <dd className="font-mono text-white">{status.checks.pendingMigrations}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

const LICENSE_TEXT = `Novus Pulse is provided for use in configuring and operating your own
instance of the platform. By continuing, you agree to use this software in
accordance with your organization's license agreement, to keep administrator
credentials confidential, and to comply with applicable data protection laws
for any content you manage through this installation. Novus Pulse is provided
without warranty of any kind, express or implied.`;

export function LicenseStep({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">License Agreement</h2>
        <p className="text-sm text-neutral-400">Please read and accept the terms below to continue.</p>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-surface-2 p-4 text-sm leading-relaxed whitespace-pre-line text-neutral-300">
        {LICENSE_TEXT}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="license-accept"
          checked={accepted}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
        <Label htmlFor="license-accept" className="cursor-pointer text-sm font-normal">
          I have read and accept the license agreement
        </Label>
      </div>
    </div>
  );
}

export function DatabaseStep({
  status,
  checking,
  onTestConnection,
}: {
  status: InstallStatus | null;
  checking: boolean;
  onTestConnection: () => void;
}) {
  const dbOk = status?.checks.db === 'ok';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Database</h2>
        <p className="text-sm text-neutral-400">
          Novus Pulse needs a reachable database before it can install. Verify the connection below.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 p-4">
        <div>
          <p className="text-sm font-medium text-white">Connection status</p>
          <p className="text-xs text-neutral-500">
            {status
              ? `${status.checks.pendingMigrations} pending migration${status.checks.pendingMigrations === 1 ? '' : 's'}`
              : 'Not checked yet'}
          </p>
        </div>
        {status ? <StatusBadge ok={dbOk} /> : <span className="text-xs text-neutral-500">Unknown</span>}
      </div>

      <Button type="button" variant="outline" onClick={onTestConnection} isLoading={checking}>
        Test Connection
      </Button>

      {status && !dbOk && (
        <p className="text-xs text-red-400">
          The database is not reachable. Fix the connection and test again before continuing.
        </p>
      )}
    </div>
  );
}

export function AdminStep({
  value,
  onChange,
  confirmPassword,
  onConfirmPasswordChange,
  errors,
}: {
  value: AdminFormData;
  onChange: (patch: Partial<AdminFormData>) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  errors: AdminFieldErrors;
}) {
  const strength = value.password ? passwordStrength(value.password) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Administrator Account</h2>
        <p className="text-sm text-neutral-400">This account will have full access to manage Novus Pulse.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="Jane"
            value={value.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
          />
          {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={value.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
          />
          {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          type="email"
          placeholder="admin@example.com"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          value={value.password}
          onChange={(e) => onChange({ password: e.target.value })}
        />
        {strength && !errors.password && (
          <p
            className={cn(
              'text-xs',
              strength === 'strong' && 'text-green-400',
              strength === 'fair' && 'text-yellow-400',
              strength === 'weak' && 'text-red-400'
            )}
          >
            Strength: {strength}
          </p>
        )}
        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-confirm-password">Confirm Password</Label>
        <Input
          id="admin-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
        />
        {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
      </div>
    </div>
  );
}

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sq', label: 'Shqip (Albanian)' },
  { value: 'it', label: 'Italiano' },
];

export function WebsiteStep({
  value,
  onChange,
  errors,
}: {
  value: WebsiteFormData;
  onChange: (patch: Partial<WebsiteFormData>) => void;
  errors: WebsiteFieldErrors;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Your Website</h2>
        <p className="text-sm text-neutral-400">Set up the first tenant workspace Novus Pulse will manage.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="siteName">Site Name</Label>
        <Input
          id="siteName"
          placeholder="Acme Corp"
          value={value.siteName}
          onChange={(e) => onChange({ siteName: e.target.value })}
        />
        {errors.siteName && <p className="text-xs text-red-500">{errors.siteName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tenantSlug">Tenant Slug</Label>
        <Input
          id="tenantSlug"
          placeholder="acme-corp"
          value={value.tenantSlug}
          onChange={(e) => onChange({ tenantSlug: e.target.value })}
        />
        <p className="text-xs text-neutral-500">Lowercase letters, numbers, and single hyphens only. Used in URLs.</p>
        {errors.tenantSlug && <p className="text-xs text-red-500">{errors.tenantSlug}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultLanguage">Default Language</Label>
        <select
          id="defaultLanguage"
          value={value.defaultLanguage}
          onChange={(e) => onChange({ defaultLanguage: e.target.value as SupportedLanguage })}
          className="flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepStatusIcon({ status }: { status: InstallStepStatus }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />;
  if (status === 'error') return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
  return <MinusCircle className="h-4 w-4 shrink-0 text-neutral-500" />;
}

export type InstallPhase = 'running' | 'revealing' | 'success' | 'failed' | 'networkError';

export function InstallStep({
  phase,
  steps,
  visibleCount,
  errorMessage,
  onRetry,
  onBack,
  onGoToLogin,
}: {
  phase: InstallPhase;
  steps: InstallStepResult[];
  visibleCount: number;
  errorMessage: string | null;
  onRetry: () => void;
  onBack: () => void;
  onGoToLogin: () => void;
}) {
  const visibleSteps = steps.slice(0, visibleCount);
  const showChecklist = phase === 'running' || phase === 'revealing' || phase === 'success' || phase === 'failed';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Installing Novus Pulse</h2>
        <p className="text-sm text-neutral-400">
          {phase === 'success'
            ? 'Installation complete.'
            : phase === 'failed' || phase === 'networkError'
              ? 'Installation did not finish successfully.'
              : 'Sit tight while we set everything up.'}
        </p>
      </div>

      {showChecklist && (
        <ul className="space-y-2 rounded-md border border-border bg-surface-2 p-4">
          {visibleSteps.length === 0 && (
            <li className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting installation...
            </li>
          )}
          {visibleSteps.map((s) => (
            <li key={s.name} className="anim-fade-in flex items-start gap-2 text-sm">
              <StepStatusIcon status={s.status} />
              <div className="flex-1">
                <span className="text-neutral-200">{s.name}</span>
                {s.status === 'error' && s.detail && <p className="text-xs text-red-400">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {phase === 'networkError' && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-4">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      {phase === 'failed' && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-4">
          <p className="text-sm text-red-400">
            {errorMessage || 'One or more steps failed. Review the details above and retry.'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {phase === 'failed' || phase === 'networkError' ? (
          <>
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="button" onClick={onRetry}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry
            </Button>
          </>
        ) : phase === 'success' ? (
          <Button type="button" className="ml-auto" onClick={onGoToLogin}>
            Go to Login
          </Button>
        ) : (
          <span className="text-xs text-neutral-500">This can take a moment...</span>
        )}
      </div>
    </div>
  );
}
