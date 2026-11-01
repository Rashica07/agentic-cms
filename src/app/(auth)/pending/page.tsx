'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Shown when login is blocked because the workspace is still awaiting
 * payment/approval (backend returns the PENDING_APPROVAL gate). The login
 * page routes here so a gated user gets a real explanation instead of a
 * bare error toast.
 */
export default function PendingApprovalPage() {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
          <Clock className="h-5 w-5 text-brand-fg" />
        </div>
        <CardTitle className="text-2xl">Awaiting approval</CardTitle>
        <CardDescription>Your workspace is verified and in our review queue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-neutral-400">
        <p>
          We&apos;ll email you as soon as your account is activated — usually shortly. Once it&apos;s
          approved you can log in and your dashboard will be ready.
        </p>
        <p className="text-xs">Think this is taking too long? Reply to your signup email and we&apos;ll take a look.</p>
      </CardContent>
      <CardFooter className="border-t border-border pt-4">
        <Link href="/login" className="text-sm text-brand-fg hover:underline">
          Back to log in
        </Link>
      </CardFooter>
    </Card>
  );
}
