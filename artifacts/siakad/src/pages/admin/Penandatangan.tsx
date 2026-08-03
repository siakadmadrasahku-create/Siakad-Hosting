"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Users, Upload, X, ImageIcon, GraduationCap, Trash2, Plus, Pencil, Info, UserCheck, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressImage, compressSignature } from '@/utils/imageCompression';

interface GuruKelas {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  tanda_tangan_url: string;
  kelas: string;
  created_at: string;
}

interface Penandatangan {
  id: string;
  kepala_nama: string;
  kepala_nip: string;
  kepala_jabatan: string;
  kepala_instansi: string;
  kepala_tanda_tangan_url: string;
  kepala_stempel_url: string;
  // Tambahan untuk SPMB
  ketua_panitia_nama: string;
  ketua_panitia_nip: string;
  ketua_panitia_tanda_tangan_url: string;
  guru_kelas: GuruKelas[];
  updated_at: string;
}

const Penandatangan = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const namaMadrasah = settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || 'Si@Kad';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<GuruKelas | null>(null);
  
  const [penandatangan, setPenandatangan] = useState<Penandatangan>({
    id: 'penandatangan',
    kepala_nama: 'Kepala Madrasah',
    kepala_nip: '',
    kepala_jabatan: 'Kepala Madrasah',
    kepala_instansi: namaMadrasah,
    kepala_tanda_tangan_url: '',
    kepala_stempel_url: '',
    ketua_panitia_nama: '',
    ketua_panitia_nip: '',
    ketua_panitia_tanda_tangan_url: '',
    guru_kelas: [],
    updated_at: new Date().toISOString(),
  });

  const [guruForm, setGuruForm] = useState<GuruKelas>({
    id: '',
    nama: '',
    nip: '',
    jabatan: 'Guru Kelas',
    tanda_tangan_url: '',
    kelas: '',
    created_at: new Date().toISOString(),
  });

  useEffect(() => {
    fetchPenandatangan();
  }, []);

  const fetchPenandatangan = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'penandatangan').maybeSingle();
      if (data?.value) {
        setPenandatangan(prev => ({ ...prev, ...data.value }));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, target: 'kepala' | 'kepala-stempel' | 'panitia' | 'guru', guruId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(target + (guruId || ''));
    try {
      const compressedFile = target === 'kepala-stempel' ? await compressImage(file) : await compressSignature(file);
      const suffix = target === 'kepala-stempel' ? 'stempel' : target === 'guru' ? 'ttd-guru' : `ttd-${target}`;
      const fileName = `${suffix}-${Date.now()}.${file.name.split('.').pop()}`;
      const storagePath = target === 'kepala-stempel' ? `stamps/${fileName}` : `signatures/${fileName}`;
      await supabase.storage.from('public').upload(storagePath, compressedFile);
      const { data } = supabase.storage.from('public').getPublicUrl(storagePath);
      
      if (target === 'kepala') setPenandatangan(p => ({ ...p, kepala_tanda_tangan_url: data.publicUrl }));
      else if (target === 'kepala-stempel') setPenandatangan(p => ({ ...p, kepala_stempel_url: data.publicUrl }));
      else if (target === 'panitia') setPenandatangan(p => ({ ...p, ketua_panitia_tanda_tangan_url: data.publicUrl }));
      else if (target === 'guru') setGuruForm(g => ({ ...g, tanda_tangan_url: data.publicUrl }));
      
      showSuccess('Gambar berhasil diunggah!');
    } catch (err) { showError('Gagal unggah'); } finally { setUploading(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('site_settings').upsert({ id: 'penandatangan', value: penandatangan, updated_at: new Date().toISOString() });
      await refreshSettings();
      showSuccess('Data penandatangan berhasil disimpan!');
    } catch (error) { showError('Gagal menyimpan'); } finally { setSaving(false); }
  };

  const handleAddGuru = () => {
    const newGuru = { ...guruForm, id: editingGuru?.id || Date.now().toString() };
    const newList = editingGuru 
      ? penandatangan.guru_kelas.map(g => g.id === editingGuru.id ? newGuru : g)
      : [...penandatangan.guru_kelas, newGuru];
    
    setPenandatangan({ ...penandatangan, guru_kelas: newList });
    setDialogOpen(false);
    setEditingGuru(null);
  };

  if (loading) return <AdminLayout title="Penandatangan"><div className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></div></AdminLayout>;

  return (
    <AdminLayout title="Data Penandatangan">
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">Kelola pejabat penandatangan dokumen resmi madrasah.</p>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white rounded-xl font-bold">
          <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Kepala Madrasah */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-emerald-50 border-b"><CardTitle className="text-emerald-800 flex items-center gap-2"><Users className="w-5 h-5" /> Kepala Madrasah</CardTitle></CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32 border-2 border-dashed rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden group">
                {penandatangan.kepala_tanda_tangan_url ? (
                  <>
                    <img src={penandatangan.kepala_tanda_tangan_url} className="w-full h-full object-contain" alt="" />
                    <button onClick={() => setPenandatangan({...penandatangan, kepala_tanda_tangan_url: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    {uploading === 'kepala' ? <Loader2 className="animate-spin" /> : <ImageIcon className="text-gray-300" />}
                    <span className="text-[10px] font-bold text-gray-400 mt-1">UPLOAD TTD</span>
                    <input type="file" className="hidden" onChange={e => handleUploadImage(e, 'kepala')} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24 border-2 border-dashed rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden group">
                {penandatangan.kepala_stempel_url ? (
                  <>
                    <img src={penandatangan.kepala_stempel_url} className="w-full h-full object-contain" alt="Stempel Kepala" />
                    <button onClick={() => setPenandatangan({...penandatangan, kepala_stempel_url: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    {uploading === 'kepala-stempel' ? <Loader2 className="animate-spin" /> : <ImageIcon className="text-gray-300" />}
                    <span className="text-[10px] font-bold text-gray-400 mt-1">UPLOAD STEMPEL</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadImage(e, 'kepala-stempel')} />
                  </label>
                )}
              </div>
            </div>

            <Input placeholder="Nama Kepala" value={penandatangan.kepala_nama} onChange={e => setPenandatangan({...penandatangan, kepala_nama: e.target.value})} className="rounded-xl" />
            <Input placeholder="NIP Kepala" value={penandatangan.kepala_nip} onChange={e => setPenandatangan({...penandatangan, kepala_nip: e.target.value})} className="rounded-xl" />
          </CardContent>
        </Card>

        {/* Ketua Panitia SPMB */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-blue-50 border-b"><CardTitle className="text-blue-800 flex items-center gap-2"><UserCheck className="w-5 h-5" /> Ketua Panitia SPMB</CardTitle></CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32 border-2 border-dashed rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden group">
                {penandatangan.ketua_panitia_tanda_tangan_url ? (
                  <>
                    <img src={penandatangan.ketua_panitia_tanda_tangan_url} className="w-full h-full object-contain" alt="" />
                    <button onClick={() => setPenandatangan({...penandatangan, ketua_panitia_tanda_tangan_url: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    {uploading === 'panitia' ? <Loader2 className="animate-spin" /> : <ImageIcon className="text-gray-300" />}
                    <span className="text-[10px] font-bold text-gray-400 mt-1">UPLOAD TTD</span>
                    <input type="file" className="hidden" onChange={e => handleUploadImage(e, 'panitia')} />
                  </label>
                )}
              </div>
            </div>
            <Input placeholder="Nama Ketua Panitia" value={penandatangan.ketua_panitia_nama} onChange={e => setPenandatangan({...penandatangan, ketua_panitia_nama: e.target.value})} className="rounded-xl" />
            <Input placeholder="NIP Ketua Panitia" value={penandatangan.ketua_panitia_nip} onChange={e => setPenandatangan({...penandatangan, ketua_panitia_nip: e.target.value})} className="rounded-xl" />
          </CardContent>
        </Card>
      </div>

      {/* Guru Kelas Section */}
      <Card className="mt-8 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-purple-600" /> Guru Kelas</CardTitle>
          <Button onClick={() => { setEditingGuru(null); setGuruForm({id:'', nama:'', nip:'', jabatan:'Guru Kelas', tanda_tangan_url:'', kelas:'', created_at:''}); setDialogOpen(true); }} size="sm" className="bg-purple-600 text-white rounded-xl"><Plus className="w-4 h-4 mr-1" /> Tambah Guru</Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            {penandatangan.guru_kelas.map(guru => (
              <div key={guru.id} className="p-4 border rounded-2xl bg-gray-50 flex justify-between items-center group">
                <div>
                  <p className="font-bold text-sm">{guru.nama}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{guru.kelas}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingGuru(guru); setGuruForm(guru); setDialogOpen(true); }} className="h-8 w-8 p-0 text-blue-600"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setPenandatangan({...penandatangan, guru_kelas: penandatangan.guru_kelas.filter(g => g.id !== guru.id)})} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>{editingGuru ? 'Edit Guru' : 'Tambah Guru'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex justify-center">
              <div className="relative w-24 h-24 border-2 border-dashed rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                {guruForm.tanda_tangan_url ? (
                  <img src={guruForm.tanda_tangan_url} className="w-full h-full object-contain" alt="" />
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <ImageIcon className="text-gray-300 w-6 h-6" />
                    <input type="file" className="hidden" onChange={e => handleUploadImage(e, 'guru')} />
                  </label>
                )}
              </div>
            </div>
            <Input placeholder="Nama Guru" value={guruForm.nama} onChange={e => setGuruForm({...guruForm, nama: e.target.value})} className="rounded-xl" />
            <Input placeholder="NIP Guru" value={guruForm.nip} onChange={e => setGuruForm({...guruForm, nip: e.target.value})} className="rounded-xl" />
            <Input placeholder="Kelas (Contoh: Kelas 1A)" value={guruForm.kelas} onChange={e => setGuruForm({...guruForm, kelas: e.target.value})} className="rounded-xl" />
            <Button onClick={handleAddGuru} className="w-full bg-emerald-600 text-white rounded-xl font-bold">Simpan Data Guru</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Penandatangan;