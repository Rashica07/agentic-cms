'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollText, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function AuditSettingsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchLogs();
    }
  }, [session]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit?limit=100');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 anim-fade-in">
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-brand-fg" />
            Activity & Audit Log
          </CardTitle>
          <CardDescription className="text-neutral-400 mt-1">Review actions taken across your workspace.</CardDescription>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 bg-surface-2/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Resource</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-2/30">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {log.resourceType}
                    {log.resourceId && <span className="text-neutral-500 ml-1">({log.resourceId})</span>}
                  </td>
                  <td className="px-6 py-4 text-neutral-400">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {loading && logs.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">Loading logs...</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
