import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export type ContactLifecycleStage = 'lead' | 'prospect' | 'customer' | 'churned';

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  lifecycleStage: ContactLifecycleStage;
  source: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  ownerId: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactNote = {
  id: string;
  contactId: string;
  body: string;
  authorId: string;
  createdAt: string;
};

export type RelatedReservation = {
  id: string;
  customerName: string;
  startsAt: string;
  status: string;
  partySize: number;
};

export type ContactDetail = Contact & { notes: ContactNote[]; reservations: RelatedReservation[] };

export const LIFECYCLE_STAGES: ContactLifecycleStage[] = ['lead', 'prospect', 'customer', 'churned'];

export const STAGE_TONE: Record<ContactLifecycleStage, string> = {
  lead: 'bg-amber-500/10 text-amber-400',
  prospect: 'bg-blue-500/10 text-blue-400',
  customer: 'bg-green-500/10 text-green-400',
  churned: 'bg-neutral-500/10 text-neutral-400',
};

export function useContacts(opts: { q?: string; stage?: ContactLifecycleStage; tag?: string; limit?: number; offset?: number } = {}) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<{ items: Contact[]; total: number }>({
    queryKey: ['contacts', activeTenantId, opts.q, opts.stage, opts.tag, opts.limit, opts.offset],
    queryFn: async () => createPulseClient(session?.accessToken).getContacts(opts),
    enabled: !!session?.accessToken,
  });
}

export function useContact(id: string | null) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<ContactDetail>({
    queryKey: ['contact', activeTenantId, id],
    queryFn: async () => createPulseClient(session?.accessToken).getContact(id as string),
    enabled: !!session?.accessToken && !!id,
  });
}

export function useContactMutations() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['contacts', activeTenantId] });
    if (id) queryClient.invalidateQueries({ queryKey: ['contact', activeTenantId, id] });
  };

  const create = useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      createPulseClient(session?.accessToken).createContact(input),
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      createPulseClient(session?.accessToken).updateContact(id, data),
    onSuccess: (_res, vars) => invalidate(vars.id),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => createPulseClient(session?.accessToken).deleteContact(id),
    onSuccess: () => invalidate(),
  });

  const addNote = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) =>
      createPulseClient(session?.accessToken).addContactNote(id, body),
    onSuccess: (_res, vars) => invalidate(vars.id),
  });

  return { create, update, remove, addNote };
}
