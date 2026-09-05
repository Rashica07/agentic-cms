import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPulseClient } from '@/lib/novus-pulse-client';
import { useUIStore } from '@/store/useStore';
import type { ContactLifecycleStage } from '@/hooks/useCrm';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export type CampaignAudience = {
  stage?: ContactLifecycleStage;
  tag?: string;
};

export type Campaign = {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  html: string;
  status: CampaignStatus;
  audience: CampaignAudience;
  scheduledAt: string | null;
  sentAt: string | null;
  stats: { total?: number; sent?: number; failed?: number };
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignRecipient = {
  id: string;
  campaignId: string;
  contactId: string;
  email: string;
  status: 'pending' | 'sent' | 'failed';
  messageId: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type CampaignDetail = Campaign & { recipients: CampaignRecipient[] };

export type EmailTemplate = {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  html: string;
  createdAt: string;
  updatedAt: string;
};

export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, string> = {
  draft: 'bg-neutral-500/10 text-neutral-400',
  scheduled: 'bg-blue-500/10 text-blue-400',
  sending: 'bg-amber-500/10 text-amber-400',
  sent: 'bg-green-500/10 text-green-400',
  failed: 'bg-red-500/10 text-red-400',
};

export function useCampaigns() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<Campaign[]>({
    queryKey: ['campaigns', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getCampaigns(),
    enabled: !!session?.accessToken,
  });
}

export function useCampaign(id: string | null) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<CampaignDetail>({
    queryKey: ['campaign', activeTenantId, id],
    queryFn: async () => createPulseClient(session?.accessToken).getCampaign(id as string),
    enabled: !!session?.accessToken && !!id,
    // Poll while a send is in flight so stats/recipients update live.
    refetchInterval: (query) => (query.state.data?.status === 'sending' ? 3000 : false),
  });
}

/** Live "sends to N contacts" count for the audience picker. */
export function useAudiencePreview(audience: CampaignAudience) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<{ total: number }>({
    queryKey: ['audience-preview', activeTenantId, audience.stage, audience.tag],
    queryFn: async () => createPulseClient(session?.accessToken).previewAudience(audience.stage, audience.tag),
    enabled: !!session?.accessToken,
  });
}

export function useEmailTemplates() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery<EmailTemplate[]>({
    queryKey: ['email-templates', activeTenantId],
    queryFn: async () => createPulseClient(session?.accessToken).getEmailTemplates(),
    enabled: !!session?.accessToken,
  });
}

export function useCampaignMutations() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['campaigns', activeTenantId] });
    if (id) queryClient.invalidateQueries({ queryKey: ['campaign', activeTenantId, id] });
  };

  const create = useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      createPulseClient(session?.accessToken).createCampaign(input),
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      createPulseClient(session?.accessToken).updateCampaign(id, data),
    onSuccess: (_res, vars) => invalidate(vars.id),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => createPulseClient(session?.accessToken).deleteCampaign(id),
    onSuccess: () => invalidate(),
  });

  const send = useMutation({
    mutationFn: async (id: string) => createPulseClient(session?.accessToken).sendCampaign(id),
    onSuccess: (_res, id) => invalidate(id),
  });

  const schedule = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      createPulseClient(session?.accessToken).scheduleCampaign(id, scheduledAt),
    onSuccess: (_res, vars) => invalidate(vars.id),
  });

  return { create, update, remove, send, schedule };
}

export function useTemplateMutations() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['email-templates', activeTenantId] });

  const create = useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      createPulseClient(session?.accessToken).createEmailTemplate(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      createPulseClient(session?.accessToken).updateEmailTemplate(id, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => createPulseClient(session?.accessToken).deleteEmailTemplate(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
