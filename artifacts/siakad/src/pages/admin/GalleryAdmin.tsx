"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Image as ImageIcon, Upload, X, Loader2, RefreshCw } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { compressImage, uploadImageToStorage } from '@/utils/imageCompression';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';

const GalleryAdmin = () => {
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', images: [] as string[] });

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'gallery_data_list')
        .maybeSingle();
      
      if (error) throw error;
      if (res?.value) setGallery(res.value as any[]);
    } catch (error: any) {
      console.error('Gallery Fetch Error:', error);
      showError('Gagal memuat data galeri');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGallery(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const newImages = [...formData.images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = await uploadImageToStorage(file, 'gallery');
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
    if (formData.images.length === 0) return showError('Pilih gambar terlebih dahulu!');
    setSaving(true);
    try {
      let newList: any[];
      if (editingItem) {
        newList = gallery.map(item => 
          item.id === editingItem.id 
            ? { ...formData, id: item.id, created_at: item.created_at } 
            : item
        );
      } else {
        const newItem = { ...formData, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...gallery];
      }
      
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'gallery_data_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      setGallery(newList);
      showSuccess('Galeri berhasil diperbarui!');
      setDialogOpen(false);
    } catch (error: any) { 
      showError('Gagal menyimpan data'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus item galeri ini?')) return;
    try {
      const newList = gallery.filter(item => item.id !== id);
      await supabase.from('site_settings').upsert({ id: 'gallery_data_list', value: newList });
      setGallery(newList);
      showSuccess('Item galeri dihapus!');
    } catch (error: any) { showError('Gagal menghapus'); }
  };

  return (
    <AdminLayout title="Kelola Galeri">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={fetchGallery} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Button onClick={() => { setEditingItem(null); setFormData({title:'', description:'', images:[]}); setDialogOpen(true); }} className="bg-emerald-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Tambah Album
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gallery.map(item => (
            <Card key={item.id} className="relative group overflow-hidden rounded-xl border-0 shadow-md">
              <img src={item.images?.[0] || item.image_url} className="aspect-square object-cover w-full" alt="" />
              <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                {item.images?.length || 1} Foto
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                <p className="text-white font-bold text-xs mb-2 line-clamp-2">{item.title}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingItem(item); setFormData({title:item.title||'', description:item.description||'', images: item.images || (item.image_url ? [item.image_url] : []) }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Album' : 'Tambah Album'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Album</label>
              <Input placeholder="Masukkan judul..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <Textarea placeholder="Tulis deskripsi singkat..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="rounded-xl min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Gambar Galeri (Bisa pilih banyak)</label>
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
              <div className="grid grid-cols-3 gap-3 mb-3">
                {formData.images.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : <Plus className="w-6 h-6 text-gray-400" />}
                  <span className="text-[10px] text-gray-500 mt-1">Tambah</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving || uploading} className="w-full bg-emerald-600 text-white rounded-xl h-12 font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan ke Galeri
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
        title="Pilih Foto Tersimpan untuk Galeri"
      />
    </AdminLayout>
  );
};

export default GalleryAdmin;