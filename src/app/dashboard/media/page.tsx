'use client';

import { useState, useEffect, useRef } from 'react';
import { useMedia, useMediaFolders, useUploadMedia, useDeleteMedia, useUpdateMedia, useCreateFolder, useSiteFiles } from '@/hooks/useMedia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Plus, Trash2, Copy, ExternalLink, Link as LinkIcon, Loader2, UploadCloud, Folder, FolderOpen, ChevronRight, HardDrive, Globe, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

/** Accepted upload types — mirrors the backend's raster-only allowlist (svg/ico rejected as an XSS vector). */
const ALLOWED_UPLOAD_ACCEPT = '.webp,.jpg,.jpeg,.jpe,.png,.gif,.avif';
const ALLOWED_UPLOAD_EXT = /\.(webp|jpe?g|jpe|png|gif|avif)$/i;

function humanFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function MediaPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const { data: mediaData, isLoading: isLoadingMedia } = useMedia(selectedFolderId || undefined);
  const media = mediaData?.items || [];
  
  const { data: folders, isLoading: isLoadingFolders } = useMediaFolders(selectedFolderId || undefined);

  const { data: siteFiles } = useSiteFiles();
  const siteImages = siteFiles?.files.filter((f) => f.kind === 'image') ?? [];
  const siteAssets = siteFiles?.files.filter((f) => f.kind === 'asset') ?? [];

  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia();
  const { mutateAsync: deleteMedia } = useDeleteMedia();
  const { mutateAsync: updateMedia, isPending: isUpdating } = useUpdateMedia();
  const { mutateAsync: createFolder, isPending: isCreatingFolder } = useCreateFolder();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newAltText, setNewAltText] = useState('');
  const [newCaption, setNewCaption] = useState('');
  
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [editAltText, setEditAltText] = useState('');
  const [editCaption, setEditCaption] = useState('');

  useEffect(() => {
    if (selectedPhoto) {
      setEditAltText(selectedPhoto.altText || '');
      setEditCaption(selectedPhoto.caption || '');
    }
  }, [selectedPhoto]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_UPLOAD_EXT.test(file.name)) {
      toast.error(`"${file.name}" isn't a supported image type. Allowed: webp, jpg, jpe, png, gif, avif.`);
      e.target.value = '';
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolderId) formData.append('folderId', selectedFolderId);
      if (newAltText) formData.append('altText', newAltText);
      if (newCaption) formData.append('caption', newCaption);

      await uploadMedia(formData);
      toast.success('Asset uploaded successfully');
      setIsAddOpen(false);
      setNewAltText('');
      setNewCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload asset');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName) return;
    try {
      await createFolder({ name: newFolderName, parentId: selectedFolderId || undefined });
      toast.success('Folder created');
      setIsFolderOpen(false);
      setNewFolderName('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create folder');
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await deleteMedia(id);
      toast.success('Asset deleted');
      if (selectedPhoto?.id === id) {
        setSelectedPhoto(null);
      }
    } catch (error) {
      toast.error('Failed to delete asset');
    }
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard');
  };

  const handleUpdateMetadata = async () => {
    if (!selectedPhoto) return;
    try {
      await updateMedia({
        id: selectedPhoto.id,
        data: { altText: editAltText, caption: editCaption },
      });
      toast.success('Metadata updated successfully');
      setSelectedPhoto({ ...selectedPhoto, altText: editAltText, caption: editCaption });
    } catch (error) {
      toast.error('Failed to update metadata');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative">
      
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ImageIcon className="h-7 w-7 text-brand" /> Media Library
          </h1>
          <p className="text-sm text-neutral-400 mt-2">Manage your images, videos, and uploaded assets.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog.Root open={isFolderOpen} onOpenChange={setIsFolderOpen}>
            <Dialog.Trigger asChild>
              <Button variant="outline" className="gap-2 rounded-full px-5 shadow-sm bg-surface hover:bg-surface-2 border-border-strong text-white">
                <Folder className="h-4 w-4" /> New Folder
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-border-strong bg-surface p-6 shadow-2xl sm:rounded-2xl">
                <Dialog.Title className="text-lg font-bold text-white">Create Folder</Dialog.Title>
                <form onSubmit={handleCreateFolder} className="space-y-4 pt-2">
                  <Input 
                    placeholder="Folder Name" 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="bg-surface-2 border-border-strong"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Dialog.Close asChild>
                      <Button type="button" variant="ghost">Cancel</Button>
                    </Dialog.Close>
                    <Button type="submit" className="bg-brand text-black hover:bg-brand-hover" disabled={isCreatingFolder}>
                      {isCreatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                    </Button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
            <Dialog.Trigger asChild>
              <Button className="bg-brand text-black hover:bg-brand-hover gap-2 rounded-full px-5 font-semibold shadow-sm">
                <Plus className="h-4 w-4" /> Upload
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border-strong bg-surface p-0 shadow-2xl sm:rounded-2xl md:w-full overflow-hidden">
                <div className="bg-brand/10 border-b border-border/50 p-6 flex flex-col items-center justify-center text-center">
                  <div className="h-14 w-14 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center mb-4">
                    <UploadCloud className="h-6 w-6 text-brand" />
                  </div>
                  <Dialog.Title className="text-xl font-bold text-white">Upload Asset</Dialog.Title>
                  <Dialog.Description className="text-sm text-neutral-400 mt-1">Select a file to upload to the library.</Dialog.Description>
                </div>
                <form onSubmit={handleAddMedia} className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="file" className="text-sm font-medium text-neutral-300">Select File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept={ALLOWED_UPLOAD_ACCEPT}
                      onChange={handleFileInputChange}
                      ref={fileInputRef}
                      className="h-11 bg-surface-2 border-border-strong rounded-lg focus-visible:ring-brand px-4 text-sm pt-2"
                    />
                    <p className="text-[11px] text-neutral-500">Webp, jpg, jpe, png, gif, or avif only.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="altText" className="text-sm font-medium text-neutral-300">Alt Text (Optional)</Label>
                    <Input 
                      id="altText" 
                      placeholder="A description for screen readers" 
                      value={newAltText}
                      onChange={(e) => setNewAltText(e.target.value)}
                      className="h-11 bg-surface-2 border-border-strong rounded-lg focus-visible:ring-brand px-4 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caption" className="text-sm font-medium text-neutral-300">Caption (Optional)</Label>
                    <Input 
                      id="caption" 
                      placeholder="Display caption for the image" 
                      value={newCaption}
                      onChange={(e) => setNewCaption(e.target.value)}
                      className="h-11 bg-surface-2 border-border-strong rounded-lg focus-visible:ring-brand px-4 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Dialog.Close asChild>
                      <Button type="button" variant="ghost" className="rounded-full px-6 hover:bg-neutral-800 text-neutral-300">Cancel</Button>
                    </Dialog.Close>
                    <Button type="submit" disabled={isUploading} className="rounded-full px-8 bg-brand text-black hover:bg-brand-hover font-semibold">
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      Upload
                    </Button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      {/* Site Files — read-only gallery of images already living in the connected site's public/ folder */}
      {siteFiles?.available && (siteImages.length > 0 || siteAssets.length > 0) && (
        <div className="mb-6 shrink-0 rounded-xl border border-border-strong bg-surface p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-brand" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Site Files</h2>
                <p className="text-xs text-neutral-500">Read-only — already living in {siteFiles.siteUrl}/public</p>
              </div>
            </div>
            <span className="text-xs text-neutral-500 shrink-0">
              {siteImages.length} image{siteImages.length === 1 ? '' : 's'}
              {siteAssets.length > 0 ? `, ${siteAssets.length} asset${siteAssets.length === 1 ? '' : 's'}` : ''}
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            {siteImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {siteImages.map((file) => (
                  <div
                    key={file.relPath}
                    className="group relative aspect-square rounded-lg border border-border-strong bg-surface-2 overflow-hidden"
                  >
                    <img src={file.url} alt={file.filename} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(file.url)}
                          className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                          title="Copy URL"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-white truncate" title={file.filename}>{file.filename}</p>
                        <p className="text-[9px] text-neutral-400 font-mono">{humanFileSize(file.sizeBytes)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {siteAssets.length > 0 && (
              <div className={cn('flex flex-wrap gap-2', siteImages.length > 0 && 'pt-3 border-t border-border/50')}>
                {siteAssets.map((file) => (
                  <div
                    key={file.relPath}
                    className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5"
                  >
                    <FileWarning className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-neutral-300 truncate max-w-[140px]" title={file.filename}>{file.filename}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                      asset — not a photo
                    </span>
                    <span className="text-[10px] text-neutral-500 shrink-0">{humanFileSize(file.sizeBytes)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(file.url)}
                      className="text-neutral-500 hover:text-white shrink-0"
                      title="Copy URL"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left Pane: Folders */}
        <div className="w-64 shrink-0 flex flex-col gap-2 bg-surface rounded-xl border border-border-strong p-4 overflow-y-auto custom-scrollbar">
          <button 
            className={cn(
              "flex items-center gap-3 w-full p-2 rounded-lg text-sm font-medium transition-colors text-left",
              selectedFolderId === null ? "bg-brand/10 text-brand" : "text-neutral-300 hover:bg-surface-2"
            )}
            onClick={() => setSelectedFolderId(null)}
          >
            <HardDrive className="h-4 w-4 shrink-0" /> Root Directory
          </button>
          
          <div className="h-px bg-border-strong my-2" />

          {isLoadingFolders ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          ) : (
            <div className="space-y-1">
              {folders?.map((folder: any) => (
                <button
                  key={folder.id}
                  className={cn(
                    "flex items-center gap-3 w-full p-2 rounded-lg text-sm font-medium transition-colors text-left",
                    selectedFolderId === folder.id ? "bg-brand/10 text-brand" : "text-neutral-300 hover:bg-surface-2"
                  )}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <Folder className={cn("h-4 w-4 shrink-0", selectedFolderId === folder.id ? "fill-brand/20" : "")} /> 
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
              {folders?.length === 0 && (
                <div className="text-xs text-neutral-500 text-center py-4">No subfolders</div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Media Assets */}
        <div className="flex-1 bg-surface rounded-xl border border-border-strong p-6 overflow-y-auto custom-scrollbar">
          {isLoadingMedia ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-surface-2 border border-border animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : media?.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="h-20 w-20 bg-surface-2 border border-border-strong rounded-full flex items-center justify-center mb-6 shadow-sm">
                <ImageIcon className="h-10 w-10 text-neutral-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No assets here</h2>
              <p className="text-sm text-neutral-400 max-w-md">Upload an image or asset to this folder.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 anim-fade-up">
              {media?.map((photo: any) => (
                <div 
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative aspect-square bg-surface-2 rounded-2xl border border-border-strong overflow-hidden cursor-pointer hover:border-brand/50 transition-colors"
                >
                  {/* Image */}
                  <img 
                    src={photo.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${photo.url}` : photo.url} 
                    alt={photo.filename} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Glassmorphic Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 backdrop-blur-[2px]">
                    <div className="flex justify-end gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md"
                        onClick={(e) => copyToClipboard(photo.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${photo.url}` : photo.url, e)}
                        title="Copy URL"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-500 text-white border-0 backdrop-blur-md"
                        onClick={(e) => handleDelete(photo.id, e)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    <div className="translate-y-[10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                      <p className="text-sm font-medium text-white truncate drop-shadow-md">{photo.filename}</p>
                      <p className="text-[10px] text-neutral-300 mt-1 font-mono uppercase tracking-widest">{formatDistanceToNow(new Date(photo.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Drawer / Modal */}
      <Dialog.Root open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md border-l border-border bg-surface shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[400px] flex flex-col">
            {selectedPhoto && (
              <>
                <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0">
                  <Dialog.Title className="text-lg font-bold text-white">Asset Details</Dialog.Title>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-neutral-800">
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </Dialog.Close>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="bg-surface-2 border border-border-strong rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                    <img 
                      src={selectedPhoto.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${selectedPhoto.url}` : selectedPhoto.url} 
                      alt={selectedPhoto.filename} 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Filename</h4>
                      <p className="text-sm font-medium text-white bg-surface-2 border border-border px-3 py-2 rounded-lg break-all">
                        {selectedPhoto.filename}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Public URL</h4>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={selectedPhoto.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${selectedPhoto.url}` : selectedPhoto.url} 
                          readOnly 
                          className="h-10 bg-surface-2 border-border text-xs font-mono"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="shrink-0 h-10 w-10 bg-surface-2 border-border hover:bg-neutral-800 text-neutral-300"
                          onClick={() => copyToClipboard(selectedPhoto.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${selectedPhoto.url}` : selectedPhoto.url)}
                          title="Copy URL"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div>
                        <Label htmlFor="editAltText" className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Alt Text</Label>
                        <Input 
                          id="editAltText" 
                          value={editAltText} 
                          onChange={(e) => setEditAltText(e.target.value)}
                          className="h-10 bg-surface-2 border-border text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editCaption" className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Caption</Label>
                        <Input 
                          id="editCaption" 
                          value={editCaption} 
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="h-10 bg-surface-2 border-border text-sm"
                        />
                      </div>
                      <Button onClick={handleUpdateMetadata} disabled={isUpdating} className="w-full bg-surface-2 text-white border border-border-strong hover:bg-neutral-800">
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Metadata
                      </Button>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Uploaded</h4>
                      <p className="text-sm text-neutral-300">
                        {new Date(selectedPhoto.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-border/50 bg-surface-2/30 shrink-0 flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-border-strong bg-surface-2 hover:bg-surface-3 hover:text-white"
                    onClick={() => window.open(selectedPhoto.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${selectedPhoto.url}` : selectedPhoto.url, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="shrink-0 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20"
                    onClick={(e) => handleDelete(selectedPhoto.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg {...props} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  );
}
