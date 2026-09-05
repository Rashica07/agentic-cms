import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/store/useStore';
import { createPulseClient } from '@/lib/novus-pulse-client';

/**
 * NEXT_PUBLIC_API_URL is the bare origin (e.g. http://localhost:3000) — the
 * backend serves everything under /api/v1, which the SDK appends internally.
 * These hooks talk to the media endpoints with raw fetch (multipart upload and
 * folders have no SDK methods), so they must add the prefix themselves.
 */
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1`;

export function useMedia(folderId?: string) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  
  return useQuery({
    queryKey: ['media', activeTenantId, folderId],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/media`);
      if (folderId) url.searchParams.set('folderId', folderId);
      
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'X-Tenant-Id': activeTenantId || '',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch media');
      return res.json();
    },
    enabled: !!session?.accessToken,
  });
}

/**
 * Read-only listing of images already sitting in the connected site's own
 * public/ folder — separate from the uploaded media library above. Backed
 * by the framework's workspace auto-discovery (dev-only; `available: false`
 * in production when nothing is scanned).
 */
export function useSiteFiles() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();

  return useQuery({
    queryKey: ['site-files', activeTenantId],
    queryFn: async () => {
      const pulse = createPulseClient(session?.accessToken);
      return pulse.getSiteFiles();
    },
    enabled: !!session?.accessToken,
    staleTime: 60_000,
  });
}

export function useMediaFolders(parentId?: string) {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  
  return useQuery({
    queryKey: ['media-folders', activeTenantId, parentId],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/media/folders`);
      if (parentId) url.searchParams.set('parentId', parentId);
      
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'X-Tenant-Id': activeTenantId || '',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch folders');
      return res.json();
    },
    enabled: !!session?.accessToken,
  });
}

export function useUploadMedia() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'X-Tenant-Id': activeTenantId || '',
        },
        body: data, // Using FormData for file uploads
      });
      if (!res.ok) throw new Error('Failed to upload media');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', activeTenantId] });
    },
  });
}

export function useUpdateMedia() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        altText?: string;
        caption?: string;
        folderId?: string | null;
        /** Focal point for smart cropping, 0..1 each; null clears it. */
        focalX?: number | null;
        focalY?: number | null;
      };
    }) => {
      const res = await fetch(`${API_BASE}/media/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
          'X-Tenant-Id': activeTenantId || '',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update media');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', activeTenantId] });
    },
  });
}

export function useDeleteMedia() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/media/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'X-Tenant-Id': activeTenantId || '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete media');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', activeTenantId] });
    },
  });
}

export function useCreateFolder() {
  const { data: session } = useSession();
  const { activeTenantId } = useUIStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; parentId?: string }) => {
      const res = await fetch(`${API_BASE}/media/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
          'X-Tenant-Id': activeTenantId || '',
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create folder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders', activeTenantId] });
    },
  });
}
