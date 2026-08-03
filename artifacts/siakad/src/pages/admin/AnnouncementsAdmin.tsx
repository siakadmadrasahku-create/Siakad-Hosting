"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Bell, Upload, X, Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { compressImage, uploadImageToStorage } from '@/utils/imageCompression';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';

const AnnouncementsAdmin = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    is_active: true, 
    images: [] as string[],
    event_date: '',
    event_location: '',
    event_time: ''
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'announcements_data_list')
        .maybeSingle();
      
      if (error) throw error;
      if (res?.value) setAnnouncements(res.value as any[]);
    } catch (error: any) {
      console.error('Announcements Fetch Error:', error);
      showError('Gagal memuat data pengumuman');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const newImages = [...formData.images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = await uploadImageToStorage(file, 'announcements');
        if (imageUrl) {
          newImages.push(imageUrl);
        }
      }
      setFormData(prev => ({ ...prev, images: newImages }));
      showSuccess(`${files.length} gambar berhasil diunggah!`);
    } catch (error: any) { 
      showError('Gagal upload gambar'); 
    } finally { 
      setUploading(false); 
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.title) return showError('Isi judul pengumuman!');
    setSaving(true);
    try {
      let newList: any[];
      if (editingItem) {
        newList = announcements.map(item => 
          item.id === editingItem.id 
            ? { ...formData, id: item.id, created_at: item.created_at } 
            : item
        );
      } else {
        const newItem = { ...formData, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...announcements];
      }
      
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'announcements_data_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      setAnnouncements(newList);
      showSuccess('Pengumuman berhasil disimpan!');
      setDialogOpen(false);
    } catch (error: any) { 
      showError('Gagal menyimpan data'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
      const newList = announcements.filter(item => item.id !== id);
      await supabase.from('site_settings').upsert({ id: 'announcements_data_list', value: newList });
      setAnnouncements(newList);
      showSuccess('Pengumuman dihapus!');
    } catch (error: any) { showError('Gagal menghapus'); }
  };

  return (
    <AdminLayout title="Kelola Pengumuman">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={fetchAnnouncements} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Button onClick={() => { setEditingItem(null); setFormData({title:'', content:'', is_active: true, images:[], event_date:'', event_location:'', event_time:''}); setDialogOpen(true); }} className="bg-emerald-600 text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Tambah Pengumuman
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500" /></div>
      ) : (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed">
              <Bell className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500">Belum ada pengumuman.</p>
            </div>
          ) : (
            announcements.map(item => (
              <Card key={item.id} className="p-4 border-0 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
                      <p className="text-xs text-gray-500">{item.event_date || 'Tanpa tanggal'} • {item.images?.length || 0} Gambar</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormData({ ...item, images: item.images || (item.image_url ? [item.image_url] : []) }); setDialogOpen(true); }} className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-9 w-9 p-0 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Pengumuman' : 'Tambah Pengumuman'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Judul Pengumuman" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl" />
            
            <div className="grid grid-cols-2 gap-4">
              <Input type="date" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} className="rounded-xl" />
              <Input placeholder="Lokasi (Opsional)" value={formData.event_location} onChange={e => setFormData({...formData, event_location: e.target.value})} className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Gambar Pengumuman (Bisa pilih banyak)</label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setMediaModalOpen(true)}
                  className="h-8 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-xl gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Pilih dari Foto Tersimpan
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {formData.images.map((url, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border group">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : <Plus className="w-6 h-6 text-gray-400" />}
                  <span className="text-[10px] text-gray-500 mt-1">Tambah</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
            </div>

            <Textarea placeholder="Isi pengumuman..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="min-h-[150px] rounded-xl" />
            
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} id="active-ann" />
              <label htmlFor="active-ann" className="text-sm">Tampilkan di Website</label>
            </div>

            <Button onClick={handleSave} disabled={saving || uploading} className="w-full bg-emerald-600 text-white rounded-xl h-12 font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan Pengumuman
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelectImage={(url) => {
          setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
          showSuccess('Foto ditambahkan dari galeri tersimpan');
        }}
        title="Pilih Foto Tersimpan untuk Pengumuman"
      />
    </AdminLayout>
  );
};

export default AnnouncementsAdmin;