"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, Pencil, Trash2, Link as LinkIcon, ExternalLink, 
  Save, Loader2, RefreshCw, FolderOpen, Globe, 
  Cloud, BookOpen, MessageCircle, Share2, Camera, X, ImageIcon
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { compressImage, uploadImageToStorage } from '@/utils/imageCompression';

interface LinkItem {
  id: string;
  title: string;
  desc: string;
  url: string;
  icon: string;
  color: string;
  bg: string;
  image_url?: string;
}

interface LinkGroup {
  id: string;
  category: string;
  links: LinkItem[];
}

const ICON_MAP: Record<string, any> = {
  LinkIcon, Globe, Cloud, BookOpen, MessageCircle, FolderOpen, Share2
};

const ICON_OPTIONS = [
  { value: 'LinkIcon', icon: LinkIcon },
  { value: 'Globe', icon: Globe },
  { value: 'Cloud', icon: Cloud },
  { value: 'BookOpen', icon: BookOpen },
  { value: 'MessageCircle', icon: MessageCircle },
  { value: 'FolderOpen', icon: FolderOpen },
  { value: 'Share2', icon: Share2 },
];

const COLOR_OPTIONS = [
  { label: 'Emerald', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Blue', color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Purple', color: 'text-purple-500', bg: 'bg-purple-50' },
  { label: 'Amber', color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'Rose', color: 'text-rose-500', bg: 'bg-rose-50' },
  { label: 'Slate', color: 'text-slate-500', bg: 'bg-slate-50' },
  { label: 'Green', color: 'text-green-500', bg: 'bg-green-50' },
];

const LinksAdmin = () => {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ category: '' });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'links_center_data')
        .maybeSingle();

      if (error) throw error;
      if (res?.value) {
        setGroups(res.value as LinkGroup[]);
      } else {
        setGroups([
          {
            id: '1',
            category: "Dokumen & Drive",
            links: [
              { id: 'l1', title: "Google Drive Utama", desc: "Akses folder dokumen publik madrasah", url: "#", icon: "Cloud", color: "text-blue-500", bg: "bg-blue-50" },
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async (updatedGroups: LinkGroup[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'links_center_data', 
          value: updatedGroups, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      setGroups(updatedGroups);
    } catch (error) {
      showError('Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, groupId: string, linkId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(linkId);
    try {
      const imageUrl = await uploadImageToStorage(file, 'links');
      
      const newList = groups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            links: g.links.map(l => l.id === linkId ? { ...l, image_url: imageUrl } : l)
          };
        }
        return g;
      });
      
      await handleSaveAll(newList);
      showSuccess('Gambar berhasil diunggah!');
    } catch (error) {
      showError('Gagal mengunggah gambar');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const addGroup = () => {
    const newGroup: LinkGroup = {
      id: Date.now().toString(),
      category: formData.category || 'Kategori Baru',
      links: []
    };
    const newList = [...groups, newGroup];
    handleSaveAll(newList);
    setDialogOpen(false);
    setFormData({ category: '' });
  };

  const removeGroup = (id: string) => {
    if (!confirm('Hapus kategori ini beserta semua link di dalamnya?')) return;
    const newList = groups.filter(g => g.id !== id);
    handleSaveAll(newList);
  };

  const addLink = (groupId: string) => {
    const newList = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          links: [...g.links, {
            id: Date.now().toString(),
            title: 'Link Baru',
            desc: 'Deskripsi singkat...',
            url: 'https://',
            icon: 'LinkIcon',
            color: 'text-emerald-500',
            bg: 'bg-emerald-50'
          }]
        };
      }
      return g;
    });
    handleSaveAll(newList);
  };

  const updateLink = (groupId: string, linkId: string, field: keyof LinkItem, value: string) => {
    const newList = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          links: g.links.map(l => l.id === linkId ? { ...l, [field]: value } : l)
        };
      }
      return g;
    });
    setGroups(newList);
  };

  const removeLink = (groupId: string, linkId: string) => {
    const newList = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, links: g.links.filter(l => l.id !== linkId) };
      }
      return g;
    });
    handleSaveAll(newList);
  };

  return (
    <AdminLayout title="Manajemen Pusat Tautan">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <p className="text-gray-500">Kelola daftar tautan penting yang tampil di halaman publik.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLinks} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 text-white rounded-xl font-bold shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Tambah Kategori
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <Card key={group.id} className="border-0 shadow-lg overflow-hidden rounded-2xl">
              <CardHeader className="bg-gray-50 border-b flex flex-row items-center justify-between px-4 py-4 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-4 h-4 text-emerald-600" />
                  </div>
                  <Input 
                    value={group.category} 
                    onChange={(e) => {
                      const newList = groups.map(g => g.id === group.id ? { ...g, category: e.target.value } : g);
                      setGroups(newList);
                    }}
                    onBlur={() => handleSaveAll(groups)}
                    className="bg-transparent border-0 font-bold text-gray-900 focus-visible:ring-0 p-0 h-auto flex-1 min-w-0"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => addLink(group.id)} className="rounded-lg h-8 text-[10px] font-bold uppercase px-2">
                    <Plus className="w-3 h-3 mr-1" /> Tambah
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeGroup(group.id)} className="text-red-500 hover:bg-red-50 h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4">
                  {group.links.length === 0 ? (
                    <p className="text-center py-6 text-gray-400 text-xs italic">Belum ada link di kategori ini.</p>
                  ) : (
                    group.links.map((link) => (
                      <div key={link.id} className="p-4 border rounded-2xl bg-white hover:border-emerald-200 transition-all group relative">
                        <div className="grid md:grid-cols-12 gap-4 items-start">
                          {/* Icon & Image Picker */}
                          <div className="md:col-span-3 flex flex-col gap-3">
                            <div className={`relative w-16 h-16 ${link.bg} rounded-2xl flex items-center justify-center mx-auto overflow-hidden border group/img`}>
                              {link.image_url ? (
                                <img src={link.image_url} className="w-full h-full object-cover" alt="" />
                              ) : (
                                React.createElement(ICON_MAP[link.icon] || LinkIcon, { className: `w-8 h-8 ${link.color}` })
                              )}
                              
                              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                {uploadingId === link.id ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, group.id, link.id)} disabled={!!uploadingId} />
                              </label>

                              {link.image_url && (
                                <button 
                                  onClick={() => updateLink(group.id, link.id, 'image_url', '')}
                                  className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1">
                              <select 
                                className="text-[9px] border rounded p-1"
                                value={link.icon}
                                onChange={(e) => updateLink(group.id, link.id, 'icon', e.target.value)}
                                onBlur={() => handleSaveAll(groups)}
                              >
                                {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                              </select>
                              <select 
                                className="text-[9px] border rounded p-1"
                                value={link.color}
                                onChange={(e) => {
                                  const opt = COLOR_OPTIONS.find(o => o.color === e.target.value);
                                  if (opt) {
                                    updateLink(group.id, link.id, 'color', opt.color);
                                    updateLink(group.id, link.id, 'bg', opt.bg);
                                  }
                                }}
                                onBlur={() => handleSaveAll(groups)}
                              >
                                {COLOR_OPTIONS.map(opt => <option key={opt.color} value={opt.color}>{opt.label}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Content Inputs */}
                          <div className="md:col-span-8 space-y-3">
                            <Input 
                              placeholder="Judul Link" 
                              value={link.title} 
                              onChange={(e) => updateLink(group.id, link.id, 'title', e.target.value)}
                              onBlur={() => handleSaveAll(groups)}
                              className="font-bold h-9 rounded-lg"
                            />
                            <Input 
                              placeholder="Deskripsi singkat" 
                              value={link.desc} 
                              onChange={(e) => updateLink(group.id, link.id, 'desc', e.target.value)}
                              onBlur={() => handleSaveAll(groups)}
                              className="text-xs h-8 rounded-lg text-gray-500"
                            />
                            <div className="flex gap-2">
                              <Input 
                                placeholder="URL (https://...)" 
                                value={link.url} 
                                onChange={(e) => updateLink(group.id, link.id, 'url', e.target.value)}
                                onBlur={() => handleSaveAll(groups)}
                                className="text-xs h-8 rounded-lg font-mono text-blue-600"
                              />
                              <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
                                <a href={link.url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                              </Button>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="md:col-span-1 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeLink(group.id, link.id)}
                              className="text-red-400 hover:text-red-600 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Kategori Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kategori</label>
              <Input 
                placeholder="Contoh: Media Sosial" 
                value={formData.category}
                onChange={(e) => setFormData({ category: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">Batal</Button>
              <Button onClick={addGroup} className="bg-emerald-600 text-white flex-1 rounded-xl font-bold">
                Tambah Kategori
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-12 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 text-sm">Kustomisasi Visual</h4>
          <p className="text-xs text-amber-700 leading-relaxed mt-1">
            Anda dapat mengunggah logo kustom untuk setiap tautan dengan mengklik area ikon. Jika gambar diunggah, ia akan menggantikan ikon standar. Gunakan gambar dengan rasio 1:1 (persegi) untuk hasil terbaik.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LinksAdmin;