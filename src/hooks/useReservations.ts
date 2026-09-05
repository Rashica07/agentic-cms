import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export type Reservation = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  partySize: number;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  notes: string | null;
  resourceId: string | null;
  resource?: { id: string; name: string; capacity: number } | null;
  source: 'web' | 'whatsapp' | 'manual';
};

export type Resource = {
  id: string;
  name: string;
  kind: string;
  capacity: number;
  active: boolean;
};

export type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  durationMinutes: number;
  active: boolean;
};

/** Mirrors the server's TRANSITIONS map — the UI must not offer moves the API will reject. */
export const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['pending'],
  no_show: ['pending'],
};

export const STATUS_TONE: Record<ReservationStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  confirmed: 'bg-green-500/10 text-green-400',
  seated: 'bg-blue-500/10 text-blue-400',
  completed: 'bg-neutral-500/10 text-neutral-400',
  cancelled: 'bg-red-500/10 text-red-400',
  no_show: 'bg-rose-500/10 text-rose-400',
};

export function useReservations(opts: { from?: string; to?: string; status?: ReservationStatus } = {}) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<Reservation[]>({
    queryKey: ['reservations', activeTenantId, opts.from, opts.to, opts.status],
    queryFn: async () => createPulseClient(session?.accessToken).getReservations(opts),
    enabled: !!session?.accessToken,
  });
}

export function useResources() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<Resource[]>({
    queryKey: ['resources', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getResources(),
    enabled: !!session?.accessToken,
  });
}

export function useAvailabilityRules() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<AvailabilityRule[]>({
    queryKey: ['availability-rules', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getAvailabilityRules(),
    enabled: !!session?.accessToken,
  });
}

export function useReservationMutations() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  // Availability shifts whenever a booking or resource changes, so invalidate together.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations', activeTenantId] });
    queryClient.invalidateQueries({ queryKey: ['resources', activeTenantId] });
    queryClient.invalidateQueries({ queryKey: ['availability-rules', activeTenantId] });
  };

  const create = useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      createPulseClient(session?.accessToken).createReservation(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      createPulseClient(session?.accessToken).updateReservation(id, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => createPulseClient(session?.accessToken).deleteReservation(id),
    onSuccess: invalidate,
  });

  const createResource = useMutation({
    mutationFn: async (input: { name: string; kind?: string; capacity?: number }) =>
      createPulseClient(session?.accessToken).createResource(input),
    onSuccess: invalidate,
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      createPulseClient(session?.accessToken).updateResource(id, data),
    onSuccess: invalidate,
  });

  const removeResource = useMutation({
    mutationFn: async (id: string) => createPulseClient(session?.accessToken).deleteResource(id),
    onSuccess: invalidate,
  });

  const createRule = useMutation({
    mutationFn: async (input: { dayOfWeek: number; openTime: string; closeTime: string; slotMinutes?: number; durationMinutes?: number }) =>
      createPulseClient(session?.accessToken).createAvailabilityRule(input),
    onSuccess: invalidate,
  });

  const removeRule = useMutation({
    mutationFn: async (id: string) => createPulseClient(session?.accessToken).deleteAvailabilityRule(id),
    onSuccess: invalidate,
  });

  return { create, update, remove, createResource, updateResource, removeResource, createRule, removeRule };
}
