'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { fetchInstallStatus, InstallApiError, runInstall } from './api';
import { AdminStep, DatabaseStep, InstallStep, LicenseStep, StepIndicator, WebsiteStep, WelcomeStep } from './steps';
import type { InstallPhase } from './steps';
import type { AdminFormData, InstallStatus, InstallStepResult, WebsiteFormData } from './types';
import { validateAdmin, validateWebsite, visibleErrors } from './validation';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function InstallPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Environment status, shared by the Welcome and Database steps.
  const [status, setStatus] = useState<InstallStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [dbChecking, setDbChecking] = useState(false);

  // Step 2: license
  const [licenseAccepted, setLicenseAccepted] = useState(false);

  // Step 4: administrator
  const [admin, setAdmin] = useState<AdminFormData>({ email: '', password: '', firstName: '', lastName: '' });
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 5: website
  const [website, setWebsite] = useState<WebsiteFormData>({ siteName: '', tenantSlug: '', defaultLanguage: 'en' });

  // Step 6: install run
  const [installPhase, setInstallPhase] = useState<InstallPhase>('running');
  const [installSteps, setInstallSteps] = useState<InstallStepResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  const loadStatus = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (options.silent) setDbChecking(true);
      else setStatusLoading(true);
      setStatusError(null);

      try {
        const data = await fetchInstallStatus();
        setStatus(data);
        if (data.installed) {
          router.replace('/login');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not reach the server.';
        setStatusError(message);
        if (options.silent) toast.error(message);
      } finally {
        if (options.silent) setDbChecking(false);
        else setStatusLoading(false);
      }
    },
    [router]
  );

  // Gating: check install status on mount; redirect away if already installed.
  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startInstall = useCallback(async () => {
    setInstallPhase('running');
    setInstallError(null);
    setInstallSteps([]);
    setVisibleCount(0);
    setInstallSuccess(false);

    try {
      const result = await runInstall({
        licenseAccepted: true,
        admin,
        website,
      });
      const steps = result.steps ?? [];
      setInstallSteps(steps);
      setInstallSuccess(result.success);
      setInstallPhase(steps.length > 0 ? 'revealing' : result.success ? 'success' : 'failed');
    } catch (err) {
      if (err instanceof InstallApiError && err.status === 403) {
        toast.error('OMNI is already installed.');
        router.replace('/login');
        return;
      }
      const message = err instanceof Error ? err.message : 'Installation failed.';
      setInstallError(message);
      setInstallPhase('networkError');
      toast.error(message);
    }
  }, [admin, website, router]);

  // Enter step 6 -> kick off the install run exactly once per visit.
  useEffect(() => {
    if (step === 6 && !hasRunRef.current) {
      hasRunRef.current = true;
      startInstall();
    }
  }, [step, startInstall]);

  // Reveal completed install steps one at a time for a "live progress" feel.
  // Whether the reveal has *finished* is derived at render time (below)
  // rather than written back into state from this effect.
  useEffect(() => {
    if (installPhase !== 'revealing') return;
    if (visibleCount >= installSteps.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 400);
    return () => clearTimeout(timer);
  }, [installPhase, visibleCount, installSteps.length]);

  const revealDone = installPhase === 'revealing' && visibleCount >= installSteps.length;
  const displayPhase: InstallPhase = revealDone ? (installSuccess ? 'success' : 'failed') : installPhase;

  const updateAdmin = (patch: Partial<AdminFormData>) => setAdmin((prev) => ({ ...prev, ...patch }));
  const updateWebsite = (patch: Partial<WebsiteFormData>) => setWebsite((prev) => ({ ...prev, ...patch }));

  const handleInstallRetry = () => {
    startInstall();
  };

  const handleInstallBack = () => {
    hasRunRef.current = false;
    setStep(5);
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  const canProceed = (() => {
    switch (step) {
      case 1:
        return !statusLoading && !statusError && !!status;
      case 2:
        return licenseAccepted;
      case 3:
        return status?.checks.db === 'ok';
      case 4:
        return Object.keys(validateAdmin(admin, confirmPassword)).length === 0;
      case 5:
        return Object.keys(validateWebsite(website)).length === 0;
      default:
        return false;
    }
  })();

  const handleBack = () => setStep((s) => (Math.max(1, s - 1) as Step));
  const handleNext = () => setStep((s) => (Math.min(6, s + 1) as Step));

  // Avoid flashing wizard content while the redirect to /login kicks in.
  if (status?.installed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-sm text-neutral-400">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-brand-fg">OMNI</h1>
          <p className="mt-2 text-sm text-neutral-400">Install Wizard</p>
        </div>

        <Card>
          <CardHeader>
            <StepIndicator current={step} />
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <WelcomeStep status={status} loading={statusLoading} error={statusError} onRetry={() => loadStatus()} />
            )}
            {step === 2 && <LicenseStep accepted={licenseAccepted} onChange={setLicenseAccepted} />}
            {step === 3 && (
              <DatabaseStep status={status} checking={dbChecking} onTestConnection={() => loadStatus({ silent: true })} />
            )}
            {step === 4 && (
              <AdminStep
                value={admin}
                onChange={updateAdmin}
                confirmPassword={confirmPassword}
                onConfirmPasswordChange={setConfirmPassword}
                errors={visibleErrors(validateAdmin(admin, confirmPassword), { ...admin, confirmPassword })}
              />
            )}
            {step === 5 && (
              <WebsiteStep value={website} onChange={updateWebsite} errors={visibleErrors(validateWebsite(website), website)} />
            )}
            {step === 6 && (
              <InstallStep
                phase={displayPhase}
                steps={installSteps}
                visibleCount={visibleCount}
                errorMessage={installError}
                onRetry={handleInstallRetry}
                onBack={handleInstallBack}
                onGoToLogin={handleGoToLogin}
              />
            )}
          </CardContent>
          {step !== 6 && (
            <CardFooter className="flex items-center justify-between border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1}>
                Back
              </Button>
              <Button type="button" onClick={handleNext} disabled={!canProceed}>
                {step === 5 ? 'Install' : 'Next'}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
