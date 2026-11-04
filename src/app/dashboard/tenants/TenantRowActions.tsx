'use client';

import { useState } from 'react';
import { approveTenant, denyTenant } from './actions';
import { toast } from 'sonner';
import { Check, X, Loader2, LogIn, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUIStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';

export function TenantRowActions({ tenantId, status, slug, name }: { tenantId: string; status: string; slug: string; name: string }) {
  const [loading, setLoading] = useState<'approve' | 'deny' | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [paidInCash, setPaidInCash] = useState(false);
  const setActiveTenant = useUIStore((state) => state.setActiveTenant);
  const router = useRouter();

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerEmail) {
      toast.error('Owner email is required');
      return;
    }
    setLoading('approve');
    try {
      // If paid in cash, we could pass that flag if the backend supported it. 
      // For now, the approval itself acts as the manual override.
      await approveTenant(tenantId, ownerEmail);
      toast.success(paidInCash ? 'Cash Payment Approved & Tenant Activated!' : 'Tenant approved successfully!');
      setIsApproveModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve tenant');
    } finally {
      setLoading(null);
    }
  };

  const handleDeny = async () => {
    setLoading('deny');
    try {
      await denyTenant(tenantId);
      toast.success('Tenant denied successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to deny tenant');
    } finally {
      setLoading(null);
    }
  };

  const handleSwitchCMS = () => {
    setActiveTenant({ id: tenantId, slug, name });
    toast.success(`Switched to ${name} CMS`);
    router.push('/dashboard');
  };

  const handleOpenWebsite = () => {
    window.open(`http://${slug}.localhost:21113`, '_blank');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwitchCMS}
          className="text-blue-400 hover:text-blue-500 hover:bg-blue-500/10 border-blue-500/20"
          title="Login to this Tenant's CMS"
        >
          <LogIn className="w-4 h-4 mr-1" />
          CMS
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenWebsite}
          className="text-neutral-400 hover:text-foreground hover:bg-white/10 border-white/20"
          title="Open Live Website"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Site
        </Button>

        {['pending_approval', 'pending_payment'].includes(status) ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveModalOpen(true)}
              disabled={loading !== null}
              className="text-green-500 hover:text-green-600 hover:bg-green-500/10 border-green-500/20"
            >
              {loading === 'approve' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeny}
              disabled={loading !== null}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
            >
              {loading === 'deny' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
              Deny
            </Button>
          </>
        ) : (
          <span className="text-xs text-neutral-500 ml-2 uppercase tracking-wider font-semibold">
            {status.replace('_', ' ')}
          </span>
        )}
      </div>

      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">Approve Tenant</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the tenant owner's email address. An account will be created if they don't exist.
              </p>
            </div>
            <form onSubmit={handleApprove} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="owner-email" className="text-xs font-semibold text-muted-foreground">
                  Owner Email
                </Label>
                <Input
                  id="owner-email"
                  type="email"
                  placeholder="owner@example.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2 mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <input
                  type="checkbox"
                  id="cash-payment"
                  checked={paidInCash}
                  onChange={(e) => setPaidInCash(e.target.checked)}
                  className="w-4 h-4 text-green-500 bg-background border-border rounded focus:ring-green-500"
                />
                <Label htmlFor="cash-payment" className="text-sm font-medium text-green-400 cursor-pointer">
                  Confirm Payment Received (Cash/Manual)
                </Label>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApproveModalOpen(false)}
                  disabled={loading !== null}
                  className="bg-transparent border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading !== null}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
                >
                  {loading === 'approve' ? 'Approving...' : (paidInCash ? 'Approve Cash Payment' : 'Confirm Approval')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
