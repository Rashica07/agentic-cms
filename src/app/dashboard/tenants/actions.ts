'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function approveTenant(tenantId: string, ownerEmail?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.user.role !== 'super_admin') {
    throw new Error('Not authenticated or authorized');
  }

  const res = await fetch(`${API_BASE}/api/v1/payments/approve/${tenantId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}` 
    },
    body: JSON.stringify({ ownerEmail }),
  });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to approve: ${txt}`);
  }
  
  revalidatePath('/dashboard/tenants');
  return { success: true };
}

export async function denyTenant(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.user.role !== 'super_admin') {
    throw new Error('Not authenticated or authorized');
  }

  const res = await fetch(`${API_BASE}/api/v1/payments/deny/${tenantId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to deny: ${txt}`);
  }
  
  revalidatePath('/dashboard/tenants');
  return { success: true };
}
