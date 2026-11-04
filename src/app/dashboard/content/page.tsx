'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Database, ArrowRight, Layers } from 'lucide-react';
import { toast } from 'sonner';

type ContentType = {
  id: string;
  apiId: string;
  name: string;
  description: string;
  kind: string;
};

export default function ContentLibraryPage() {
  const { data: session } = useSession();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchTypes();
  }, [session]);

  const fetchTypes = async () => {
    try {
      const res = await fetch('/api/content/types');
      if (!res.ok) throw new Error('Failed to fetch content types');
      const data = await res.json();
      setTypes(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-semibold text-foreground tracking-[-0.01em]">Content Library</h1>
          <p className="text-neutral-400 mt-1">Manage all your dynamic content entries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map(type => (
          <Link
            key={type.id}
            href={`/dashboard/content/${type.apiId}`}
            className="group p-5 rounded-xl border border-border bg-surface-2/30 hover:bg-surface hover:border-brand/50 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand-fg flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-neutral-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-brand-fg transition-colors">{type.name}</h3>
              <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                {type.description || `Manage entries for ${type.name.toLowerCase()}`}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400">
                {type.kind}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800/50 text-neutral-500 font-mono">
                {type.apiId}
              </span>
            </div>
          </Link>
        ))}

        {types.length === 0 && (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-xl">
            <Database className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Content Types found</h3>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              Before you can create content, you need to define your content structure using the Schema Builder.
            </p>
            <Link
              href="/dashboard/schema"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-brand text-brand-foreground shadow hover:bg-brand/90 h-9 px-4 py-2"
            >
              Go to Schema Builder
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
