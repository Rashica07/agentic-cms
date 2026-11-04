import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Building2, Layers } from 'lucide-react';
import { TenantRowActions } from './TenantRowActions';

export default async function TenantsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // Fetch all tenants from the backend
  let tenants: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/v1/tenants`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store'
    });
    if (res.ok) {
      tenants = await res.json();
    } else {
      console.error('Failed to fetch tenants:', await res.text());
    }
  } catch (err) {
    console.error('Failed to fetch tenants:', err);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-semibold text-foreground tracking-[-0.01em]">Tenants</h1>
          <p className="text-neutral-400 mt-1">Manage all platform tenants and subscriptions.</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {tenants.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Tenants Found</h3>
            <p className="text-neutral-400">There are no tenants registered on the platform yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-400">
              <thead className="text-xs text-neutral-500 uppercase bg-surface-2/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Slug</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium text-right">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{tenant.name}</div>
                      <div className="text-xs text-neutral-500 font-mono mt-1">{tenant.id}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-neutral-300">{tenant.slug}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 text-xs uppercase tracking-wider font-semibold">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <TenantRowActions tenantId={tenant.id} status={tenant.status} slug={tenant.slug} name={tenant.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
