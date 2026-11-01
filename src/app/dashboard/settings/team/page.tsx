'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShieldCheck, UserCog, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionMatrix } from '@/components/settings/permission-matrix';

export default function TeamSettingsPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/teams/members'),
        fetch('/api/teams/invites')
      ]);
      
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      if (!invitesRes.ok) throw new Error('Failed to fetch invites');

      setMembers(await membersRes.json());
      setInvites(await invitesRes.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch('/api/teams/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to send invite');
      }
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 anim-fade-in">
      
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
            <CardDescription className="text-neutral-400 mt-1">Manage who has access to your workspace.</CardDescription>
          </div>
          <Button onClick={() => setShowInviteForm(!showInviteForm)} className="bg-brand text-brand-foreground hover:bg-brand-hover gap-2">
            <Plus className="h-4 w-4" /> Invite member
          </Button>
        </CardHeader>

        {showInviteForm && (
          <div className="p-6 border-b border-border/50 bg-surface-2/30">
            <form onSubmit={handleInvite} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="w-48 space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="author">Author</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button type="submit" disabled={inviting} className="bg-brand text-brand-foreground hover:bg-brand-hover">
                {inviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-400 bg-surface-2/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {members.map((member, i) => (
                <tr key={member.id || i} className="hover:bg-surface-2/30">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{member.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand/10 text-brand-fg">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {loading && members.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-neutral-500">Loading members...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {invites.length > 0 && (
        <Card className="bg-surface border-border shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-semibold">Pending Invites</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-400 bg-surface-2/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Invited By</th>
                  <th className="px-6 py-3 font-medium">Expires</th>
                  <th className="px-6 py-3 font-medium">Token (Mocking email)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-surface-2/30">
                    <td className="px-6 py-4 font-medium text-foreground">{invite.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-300">
                        {invite.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      {invite.inviter?.firstName} {invite.inviter?.lastName}
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-neutral-500 font-mono text-xs">
                      {invite.token}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-fg" />
            Roles & Permissions Guide
          </CardTitle>
          <CardDescription className="text-neutral-400 mt-1">What each role can do in your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border-strong bg-surface-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand-fg">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Admin</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Full access to content, schema, settings, and team management.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-xl border border-border-strong bg-surface-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Editor</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Can create, edit, delete, and publish any content entries and photos.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border-strong bg-surface-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Author</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Can create content, but can only edit/delete their own content. Cannot publish.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border-strong bg-surface-2">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Viewer</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Can only view content and settings. Cannot make any changes.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-content-type overrides on top of the role defaults above */}
      <PermissionMatrix />
    </div>
  );
}
