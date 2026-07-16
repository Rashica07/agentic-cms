'use client';

import { useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function ImpersonateLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      toast.error('No impersonation token provided');
      router.push('/login');
      return;
    }

    const performImpersonation = async () => {
      try {
        const result = await signIn('credentials', {
          impersonateToken: token,
          redirect: false,
        });

        if (result?.error) {
          toast.error(result.error);
          router.push('/login');
        } else {
          toast.success('Successfully logged in as tenant');
          router.push('/dashboard');
        }
      } catch (e: any) {
        toast.error('Failed to impersonate');
        router.push('/login');
      }
    };

    performImpersonation();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white">
      <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
      <h2 className="text-xl font-semibold">Logging into Tenant Workspace...</h2>
      <p className="text-neutral-400 mt-2">Please wait while we authenticate your super admin session.</p>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>}>
      <ImpersonateLogic />
    </Suspense>
  );
}
