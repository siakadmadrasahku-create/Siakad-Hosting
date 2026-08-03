"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Printer, FileText, Type, Calendar, User, 
  Tag, ArrowLeft, Layout, Sparkles, Download, Info, Fingerprint,
  Save, Trash2, History, Loader2, RefreshCw, FolderOpen, Building, ImageIcon, Upload, X
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import DocumentCover from '@/components/DocumentCover';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { compressImage } from '@/utils/imageCompression';

interface SavedCover {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  author: string;
  nip: string;
  nama_yayasan: string;
  nama_madrasah: string;
  logo_url: string;
  created_at: string;
}

const CoverGenerator = () => {
  const { settings } = useSiteSettings();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedCovers, setSavedCovers] = useState<SavedCover[]>([]);
  
  const [formData, setFormData] = useState({
    title: 'RENCANA PELAKSANAAN PEMBELAJARAN (RPP)',
    subtitle: 'Materi Al-Qur\'an Hadits Semester Ganjil',
    category: 'DOKUMEN AKADEMIK',
    year: settings.tahun_pelajaran?.active_year || '2024/2025',
    author: settings.general?.headmaster_name || 'NAMA PENYUSUN',
    nip: '',
    nama_yayasan: settings.identitas_madrasah?.nama_yayasan || 'YAYASAN PENDIDIKAN ISLAM',
    nama_madrasah: settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || 'Si@Kad Madrasah',
    logo_url: settings.identitas_madrasah?.logo_url || ''
  });

  useEffect(() => { fetchSavedCovers(); }, []);

  const fetchSavedCovers = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'saved_covers_list').maybeSingle();
      if (res?.value) setSavedCovers(res.value as SavedCover[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const fileName = `cover-logo-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `covers/${fileName}`;
      await supabase.storage.from('public').upload(filePath, compressedFile);
      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));
      showSuccess('Logo cover diunggah!');
    } catch (err) { showError('Gagal upload'); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { showError('Judul kosong!'); return; }
    setIsSaving(true);
    try {
      const newCover = { ...formData, id: `cover-${Date.now()}`, created_at: new Date().toISOString() };
      const newList = [newCover, ...savedCovers];
      await supabase.from('site_settings').upsert({ id: 'saved_covers_list', value: newList, updated_at: new Date().toISOString() });
      setSavedCovers(newList as any);
      showSuccess('Desain disimpan!');
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus?')) return;
    const newList = savedCovers.filter(c => c.id !== id);
    await supabase.from('site_settings').upsert({ id: 'saved_covers_list', value: newList });
    setSavedCovers(newList);
    showSuccess('Dihapus');
  };

  const loadCover = (cover: SavedCover) => {
    setFormData({
      title: cover.title,
      subtitle: cover.subtitle,
      category: cover.category,
      year: cover.year,
      author: cover.author,
      nip: cover.nip,
      nama_yayasan: cover.nama_yayasan || formData.nama_yayasan,
      nama_madrasah: cover.nama_madrasah || formData.nama_madrasah,
      logo_url: cover.logo_url || formData.logo_url
    });
    showSuccess('Data cover dimuat!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isPreviewing) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPreviewing(false)} className="font-bold text-gray-600"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg"><Printer className="w-4 h-4 mr-2" /> Cetak Sekarang</Button>
        </div>
        <div className="flex-1 p-4 sm:p-12 overflow-y-auto print:p-0 flex justify-center items-start">
          <DocumentCover {...formData} className="print:m-0 shadow-2xl print:shadow-none" />
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4 portrait; margin: 0 !important; } html, body { height: 297mm; overflow: hidden !important; background: white !important; margin: 0 !important; padding: 0 !important; } .print\\:hidden { display: none !important; } }` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Generator Cover Dokumen">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-2 bg-emerald-600"></div>
              <CardHeader><CardTitle className="flex items-center gap-2"><Layout className="w-5 h-5 text-emerald-600" /> Konfigurasi Cover</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-dashed">
                  <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2"><Building className="w-3 h-3" /> Identitas Sekolah</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 border-2 border-dashed rounded-xl flex items-center justify-center bg-white overflow-hidden group">
                      {formData.logo_url ? (
                        <><img src={formData.logo_url} className="w-full h-full object-contain" alt="" /><button onClick={() => setFormData({...formData, logo_url: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 shadow-lg"><X className="w-3 h-3" /></button></>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center">
                          {uploading ? (
                            <Loader2 className="animate-spin text-emerald-500" />
                          ) : (
                            <>
                              <ImageIcon className="text-gray-300 w-5 h-5" />
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    <div className="flex-1 space-y-2"><Input value={formData.nama_yayasan} onChange={e => setFormData({...formData, nama_yayasan: e.target.value})} placeholder="Yayasan" className="h-9 text-xs rounded-lg" /><Input value={formData.nama_madrasah} onChange={e => setFormData({...formData, nama_madrasah: e.target.value})} placeholder="Madrasah" className="h-9 text-xs font-bold rounded-lg" /></div>
                  </div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Kategori</label><Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="rounded-xl h-11" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Judul Utama</label><Textarea value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl min-h-[80px] font-bold" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Sub-Judul</label><Input value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="rounded-xl h-11 italic" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Tahun</label><Input value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="rounded-xl h-11" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">Penyusun</label><Input value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="rounded-xl h-11" /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400">NIP</label><Input value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="rounded-xl h-11" /></div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button onClick={handleSave} disabled={isSaving} variant="outline" className="rounded-xl h-14 font-bold border-emerald-200 text-emerald-700">{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan</Button>
                  <Button onClick={() => setIsPreviewing(true)} className="bg-emerald-600 text-white rounded-xl h-14 px-2 text-xs sm:text-sm font-bold shadow-xl"><Printer className="w-4 h-4 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Preview & Cetak</span></Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="hidden lg:block sticky top-24">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Live Preview (Mini)</p>
            <div className="scale-[0.42] origin-top transform shadow-2xl rounded-lg overflow-hidden border"><DocumentCover {...formData} /></div>
          </div>
        </div>
        <div className="space-y-4 pt-8 border-t">
          <div className="flex items-center justify-between"><h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><History className="w-6 h-6 text-emerald-600" /> Riwayat Cover</h3><Button variant="ghost" size="sm" onClick={fetchSavedCovers} className="text-gray-400"><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button></div>
          {loading ? (<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>) : savedCovers.length === 0 ? (<div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-gray-100"><FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 font-medium">Belum ada cover.</p></div>) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCovers.map((cover) => (
                <Card key={cover.id} className="border-0 shadow-md hover:shadow-lg transition-all group overflow-hidden rounded-2xl bg-white">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3"><Badge className="bg-emerald-50 text-emerald-700 border-0 text-[9px] font-black uppercase">{cover.category}</Badge><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="sm" onClick={() => loadCover(cover)} className="h-8 w-8 p-0 text-blue-600"><FolderOpen className="w-4 h-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete(cover.id)} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button></div></div>
                    <h4 className="font-bold text-gray-900 line-clamp-2 mb-1 text-sm">{cover.title}</h4>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50"><span className="text-[10px] font-bold text-gray-400">{cover.year}</span><span className="text-[10px] font-bold text-emerald-600 uppercase">{cover.author}</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default CoverGenerator;