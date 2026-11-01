'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Settings2, Trash2, Database, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type ContentField = {
  id: string;
  apiId: string;
  label: string;
  type: string;
  required: boolean;
};

type ContentType = {
  id: string;
  apiId: string;
  name: string;
  description: string;
  fields: ContentField[];
};

export default function SchemaBuilderPage() {
  const { data: session } = useSession();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [loading, setLoading] = useState(true);

  // New Type Modal
  const [isTypeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeApiId, setNewTypeApiId] = useState('');

  // New Field Modal
  const [isFieldModalOpen, setFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldApiId, setNewFieldApiId] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldConfig, setNewFieldConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (session) fetchTypes();
  }, [session]);

  const fetchTypes = async () => {
    try {
      const res = await fetch('/api/content/types');
      if (!res.ok) throw new Error('Failed to fetch types');
      const data = await res.json();
      setTypes(data);
      if (data.length > 0 && !selectedType) setSelectedType(data[0]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/content/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName, apiId: newTypeApiId, description: '' }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Content type created');
      setTypeModalOpen(false);
      setNewTypeName('');
      setNewTypeApiId('');
      fetchTypes();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    try {
      const res = await fetch(`/api/content/types/${selectedType.apiId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newFieldLabel,
          apiId: newFieldApiId,
          type: newFieldType,
          required: newFieldRequired,
          config: newFieldConfig,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Field added');
      setFieldModalOpen(false);
      setNewFieldLabel('');
      setNewFieldApiId('');
      setNewFieldType('text');
      setNewFieldRequired(false);
      fetchTypes();
      
      // Update selected type optimistically
      const createdField = await res.json();
      setSelectedType(prev => prev ? { ...prev, fields: [...prev.fields, createdField] } : null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteField = async (fieldApiId: string) => {
    if (!selectedType || !confirm('Are you sure you want to delete this field?')) return;
    try {
      const res = await fetch(`/api/content/types/${selectedType.apiId}/fields/${fieldApiId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete field');
      toast.success('Field deleted');
      setSelectedType(prev => prev ? { ...prev, fields: prev.fields.filter(f => f.apiId !== fieldApiId) } : null);
      setTypes(types.map(t => t.id === selectedType.id ? { ...t, fields: t.fields.filter(f => f.apiId !== fieldApiId) } : t));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="p-8">Loading schema builder...</div>;

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-xl border border-border bg-surface-2/30">
      {/* LEFT PANEL - Types List */}
      <div className="w-64 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Content Types</h2>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setTypeModalOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {types.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                selectedType?.id === type.id ? 'bg-brand/10 text-brand-fg font-medium' : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-2'
              }`}
            >
              <Database className="h-4 w-4" />
              {type.name}
            </button>
          ))}
          {types.length === 0 && (
            <div className="text-xs text-neutral-500 p-4 text-center">No content types yet.</div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Fields List */}
      <div className="flex-1 flex flex-col bg-surface-2/10">
        {selectedType ? (
          <>
            <div className="p-6 border-b border-border bg-surface/50">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">{selectedType.name}</h1>
                  <p className="text-sm text-neutral-400 mt-1 font-mono">{selectedType.apiId}</p>
                </div>
                <Button onClick={() => setFieldModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Field
                </Button>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-3 max-w-3xl">
                {selectedType.fields.map(field => (
                  <div key={field.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface group hover:border-border-strong transition-colors">
                    <GripVertical className="h-4 w-4 text-neutral-600 cursor-move" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-neutral-200">{field.label}</span>
                        {field.required && <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Required</span>}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono mt-1">{field.apiId}</div>
                    </div>
                    
                    <div className="px-3 py-1 bg-surface-2 rounded-md border border-border/50 text-xs text-neutral-400 capitalize">
                      {field.type}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-400 hover:bg-red-400/10" onClick={() => handleDeleteField(field.apiId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {selectedType.fields.length === 0 && (
                  <div className="text-center p-12 border border-dashed border-border rounded-xl">
                    <Database className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-neutral-300">No fields yet</h3>
                    <p className="text-xs text-neutral-500 mt-1 mb-4">Add your first field to define the structure for {selectedType.name}.</p>
                    <Button onClick={() => setFieldModalOpen(true)} variant="outline" size="sm">Add Field</Button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
            Select or create a content type to manage its schema.
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {/* Create Type Modal */}
      <Dialog open={isTypeModalOpen} onOpenChange={setTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="mb-4">Create Content Type</DialogTitle>
          <form onSubmit={handleCreateType} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" required value={newTypeName} onChange={e => {
                setNewTypeName(e.target.value);
                setNewTypeApiId(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
              }} placeholder="e.g. Product" className="bg-surface-2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apiId">API ID</Label>
              <Input id="apiId" required value={newTypeApiId} onChange={e => setNewTypeApiId(e.target.value)} placeholder="e.g. product" className="bg-surface-2 font-mono" />
              <p className="text-xs text-neutral-500">The unique identifier used in the API.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setTypeModalOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Field Modal */}
      <Dialog open={isFieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="mb-4">Add Field to {selectedType?.name}</DialogTitle>
          <form onSubmit={handleCreateField} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fieldLabel">Field Label</Label>
                <Input id="fieldLabel" required value={newFieldLabel} onChange={e => {
                  setNewFieldLabel(e.target.value);
                  setNewFieldApiId(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
                }} placeholder="e.g. Price" className="bg-surface-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fieldApiId">API ID</Label>
                  <Input id="fieldApiId" required value={newFieldApiId} onChange={e => setNewFieldApiId(e.target.value)} className="bg-surface-2 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fieldType">Type</Label>
                  <select
                    id="fieldType"
                    value={newFieldType}
                    onChange={e => setNewFieldType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-surface-2 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="text">Text (Short)</option>
                    <option value="richtext">Rich Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="media">Media</option>
                    <option value="json">JSON</option>
                    <option value="reference">Reference (Relation)</option>
                  </select>
                </div>
              </div>
              {newFieldType === 'reference' && (
                <div className="space-y-1.5">
                  <Label htmlFor="referenceTarget">Reference Target</Label>
                  <select
                    id="referenceTarget"
                    value={newFieldConfig.targetApiId || ''}
                    onChange={e => setNewFieldConfig({ ...newFieldConfig, targetApiId: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-surface-2 px-3 py-1 text-sm shadow-sm transition-colors"
                    required
                  >
                    <option value="">Select a content type...</option>
                    {types.map(t => (
                      <option key={t.id} value={t.apiId}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="required" checked={newFieldRequired} onCheckedChange={(c) => setNewFieldRequired(c as boolean)} />
                <Label htmlFor="required" className="cursor-pointer">Make this field required</Label>
              </div>
              
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setFieldModalOpen(false)}>Cancel</Button>
              <Button type="submit">Add Field</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
