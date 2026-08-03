"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, ArrowLeft, ArrowRight, Check, User, Users, MapPin, 
  CheckCircle2, School, Printer, Info, Stethoscope, Loader2, AlertTriangle,
  Upload, FileText, Camera, Image as ImageIcon, X
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { compressImage } from '@/utils/imageCompression';

const SPMB = () => {
  const navigate = useNavigate();
  const { settings, loading: settingsLoading, refreshSettings } = useSiteSettings();
  
  const spmbConfig = settings.spmb_config || { is_open: true, tahun_ajaran: '2025/2026' };
  const spmbUi = settings.spmb_ui || {
    hero_title: 'Formulir Pendaftaran Online',
    hero_subtitle: 'Lengkapi data calon siswa dengan teliti dan benar.',
    info_box_title: 'Fitur Auto-Save Aktif',
    info_box_text: 'Data yang Anda isi otomatis tersimpan sebagai draft di browser ini.',
  };

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    nama_lengkap: '', nama_panggilan: '', jenis_kelamin: '', tempat_lahir: '', tanggal_lahir: '',
    nik: '', nisn: '', anak_ke: '', jumlah_saudara: '', tinggi_badan: '', berat_badan: '',
    golongan_darah: '', agama: 'Islam',
    nama_ayah: '', pekerjaan_ayah: '', no_hp_ayah: '',
    nama_ibu: '', pekerjaan_ibu: '', no_hp_ibu: '',
    alamat_lengkap: '', rt: '', rw: '', kelurahan: '', kecamatan: '', kabupaten: '', provinsi: '', kode_pos: '',
    sekolah_asal: '', alamat_sekolah_asal: '', tahun_lulus: '',
    email: '', pilihan_kelas: 'Reguler', catatan: '',
    docs: { akta: '', kk: '', foto: '', ijazah: '' }
  });

  useEffect(() => {
    const saved = localStorage.getItem('spmb_full_draft_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (JSON.stringify(parsed).includes('MI Terpadu') || JSON.stringify(parsed).includes('MI Atas Angin')) {
          localStorage.removeItem('spmb_full_draft_v3');
        } else {
          setFormData({ ...parsed, docs: parsed.docs || { akta: '', kk: '', foto: '', ijazah: '' } });
        }
      } catch (e) {
        console.error("Gagal memuat draft:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('spmb_full_draft_v3', JSON.stringify(formData));
  }, [formData]);

  const updateForm = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileAsBase64 = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    try {
      const compressedFile = await compressImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData((prev: any) => ({
          ...prev,
          docs: { ...prev.docs, [field]: base64String }
        }));
        setUploadingField(null);
        showSuccess(`${field.toUpperCase()} siap dikirim!`);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      showError('Gagal memproses gambar');
      setUploadingField(null);
    }
  };

  const steps = [
    { num: 1, label: 'Siswa', icon: User },
    { num: 2, label: 'Fisik', icon: Stethoscope },
    { num: 3, label: 'Orang Tua', icon: Users },
    { num: 4, label: 'Alamat', icon: MapPin },
    { num: 5, label: 'Sekolah', icon: School },
    { num: 6, label: 'Dokumen', icon: FileText },
    { num: 7, label: 'Konfirmasi', icon: CheckCircle2 },
  ];

  const handleSubmit = async () => {
    if (!formData.nama_lengkap || !formData.nik) {
      showError('Nama Lengkap and NIK wajib diisi!');
      return;
    }

    setSubmitting(true);
    try {
      const { data: currentData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'pendaftaran_spmb_list')
        .maybeSingle();

      const existingList = currentData?.value || [];
      
      const newEntry = {
        id: Date.now().toString(),
        data: formData,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const newList = [newEntry, ...existingList];

      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'pendaftaran_spmb_list', 
          value: newList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setSubmitted(true);
      localStorage.removeItem('spmb_full_draft_v3');
      await refreshSettings();
    } catch (error: any) {
      showError(`Gagal mengirim: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderLogoText = () => {
    const name = settings.general?.school_name || 'Si@Kad';
    if (name.includes('@')) {
      const parts = name.split('@');
      return <>{parts[0]}<span className="text-emerald-600">@</span>{parts[1]}</>;
    }
    return name;
  };

  if (settingsLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;

  if (!spmbConfig.is_open) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden text-center">
          <div className="h-2 bg-red-500"></div>
          <CardContent className="p-10 space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto"><AlertTriangle className="w-10 h-10 text-red-500" /></div>
            <h2 className="text-2xl font-black text-gray-900">Pendaftaran Ditutup</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{spmbConfig.pesan_tutup}</p>
            <Button onClick={() => navigate('/')} className="w-full bg-emerald-600 text-white rounded-xl h-12 font-bold">Kembali ke Beranda</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="print:hidden">
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex justify-between items-center">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0"><BookOpen className="w-4 h-4 text-white" /></div>
              <div className="flex flex-col">
                <h1 className="font-black text-slate-900 leading-none">{renderLogoText()}</h1>
                <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-[0.1em] mt-1 leading-none">
                  {settings.general?.tagline || "Sistem Informasi Akademik Madrasah"}
                </p>
              </div>
            </a>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-500 font-bold text-xs"><ArrowLeft className="w-3 h-3 mr-1" /> KEMBALI</Button>
          </div>
        </header>

        <main className="container mx-auto px-4 max-w-4xl mt-10">
          {submitted ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in duration-700">
              <Card className="w-full max-w-lg border-0 shadow-2xl rounded-[2rem] overflow-hidden text-center bg-white">
                <div className="h-3 bg-emerald-500"></div>
                <CardContent className="p-12 space-y-6">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900">Pendaftaran Berhasil!</h2>
                  <p className="text-slate-500">Terima kasih telah mendaftar. Data and dokumen Anda telah tersimpan secara aman di sistem kami.</p>
                  <div className="pt-6 flex flex-col gap-3">
                    <Button onClick={() => window.print()} className="w-full bg-emerald-600 text-white rounded-xl h-14 font-bold shadow-lg">
                      <Printer className="w-5 h-5 mr-2" /> CETAK BUKTI DAFTAR
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/')} className="w-full text-slate-500 font-bold">
                      KEMBALI KE BERANDA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 mb-4 px-4 py-1 rounded-full font-black uppercase tracking-widest">SPMB {spmbConfig.tahun_ajaran}</Badge>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{spmbUi.hero_title}</h2>
                <p className="text-slate-500 mt-2">{spmbUi.hero_subtitle}</p>
              </div>

              <div className="flex justify-between mb-12 relative px-4">
                <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-200 -z-0">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}></div>
                </div>
                {steps.map((s) => (
                  <div key={s.num} className="relative z-10 flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${step >= s.num ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-300 border-2 border-slate-100'}`}>
                      {step > s.num ? <Check className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-[9px] mt-2 font-black uppercase tracking-tighter ${step >= s.num ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</span>
                  </div>
                ))}
              </div>

              <Card className="border-0 shadow-xl rounded-[2rem] overflow-hidden bg-white">
                <CardContent className="p-8 md:p-12">
                  {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 border-b pb-4"><User className="text-emerald-600" /> <h3 className="text-xl font-bold">Identitas Calon Siswa</h3></div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap (Sesuai Akta) *</label><Input value={formData.nama_lengkap} onChange={e => updateForm('nama_lengkap', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Jenis Kelamin *</label><Select value={formData.jenis_kelamin} onValueChange={v => updateForm('jenis_kelamin', v)}><SelectTrigger className="rounded-xl h-12 bg-slate-50 border-0"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">NIK (16 Digit) *</label><Input value={formData.nik} onChange={e => updateForm('nik', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" maxLength={16} /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">NISN (Jika Ada)</label><Input value={formData.nisn} onChange={e => updateForm('nisn', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" maxLength={10} /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Tempat Lahir *</label><Input value={formData.tempat_lahir} onChange={e => updateForm('tempat_lahir', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Tanggal Lahir *</label><Input type="date" value={formData.tanggal_lahir} onChange={e => updateForm('tanggal_lahir', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 border-b pb-4"><Stethoscope className="text-emerald-600" /> <h3 className="text-xl font-bold">Data Fisik & Saudara</h3></div>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Anak Ke-</label><Input value={formData.anak_ke} onChange={e => updateForm('anak_ke', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Jumlah Saudara</label><Input value={formData.jumlah_saudara} onChange={e => updateForm('jumlah_saudara', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Golongan Darah</label><Select value={formData.golongan_darah} onValueChange={v => updateForm('golongan_darah', v)}><SelectTrigger className="rounded-xl h-12 bg-slate-50 border-0"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="AB">AB</SelectItem><SelectItem value="O">O</SelectItem><SelectItem value="-">Tidak Tahu</SelectItem></SelectContent></Select></div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 border-b pb-4"><Users className="text-emerald-600" /> <h3 className="text-xl font-bold">Data Orang Tua / Wali</h3></div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-6 bg-slate-50 rounded-3xl">
                          <h4 className="font-bold text-emerald-700 text-sm uppercase tracking-widest">Data Ayah</h4>
                          <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Ayah *</label><Input value={formData.nama_ayah} onChange={e => updateForm('nama_ayah', e.target.value)} className="rounded-xl h-10 bg-white border-0" /></div>
                          <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase">No. HP Ayah (WhatsApp) *</label><Input value={formData.no_hp_ayah} onChange={e => updateForm('no_hp_ayah', e.target.value)} className="rounded-xl h-10 bg-white border-0" /></div>
                        </div>
                        <div className="space-y-4 p-6 bg-slate-50 rounded-3xl">
                          <h4 className="font-bold text-emerald-700 text-sm uppercase tracking-widest">Data Ibu</h4>
                          <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Ibu *</label><Input value={formData.nama_ibu} onChange={e => updateForm('nama_ibu', e.target.value)} className="rounded-xl h-10 bg-white border-0" /></div>
                          <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase">No. HP Ibu</label><Input value={formData.no_hp_ibu} onChange={e => updateForm('no_hp_ibu', e.target.value)} className="rounded-xl h-10 bg-white border-0" /></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 border-b pb-4"><MapPin className="text-emerald-600" /> <h3 className="text-xl font-bold">Alamat Domisili</h3></div>
                      <div className="space-y-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Alamat Lengkap (Jalan/Dusun) *</label><Textarea value={formData.alamat_lengkap} onChange={e => updateForm('alamat_lengkap', e.target.value)} className="rounded-xl bg-slate-50 border-0" /></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">RT</label><Input value={formData.rt} onChange={e => updateForm('rt', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                          <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">RW</label><Input value={formData.rw} onChange={e => updateForm('rw', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                          <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Kelurahan / Desa *</label><Input value={formData.kelurahan} onChange={e => updateForm('kelurahan', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Kecamatan *</label><Input value={formData.kecamatan} onChange={e => updateForm('kecamatan', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                          <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Kabupaten / Kota *</label><Input value={formData.kabupaten} onChange={e => updateForm('kabupaten', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                          <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Provinsi *</label><Input value={formData.provinsi} onChange={e => updateForm('provinsi', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 border-b pb-4"><School className="text-emerald-600" /> <h3 className="text-xl font-bold">Sekolah Asal & Pilihan</h3></div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nama Sekolah Asal (TK/RA) *</label><Input value={formData.sekolah_asal} onChange={e => updateForm('sekolah_asal', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Tahun Lulus *</label><Input type="number" value={formData.tahun_lulus} onChange={e => updateForm('tahun_lulus', e.target.value)} className="rounded-xl h-12 bg-slate-50 border-0" /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Pilihan Kelas</label><Select value={formData.pilihan_kelas} onValueChange={v => updateForm('pilihan_kelas', v)}><SelectTrigger className="rounded-xl h-12 bg-slate-50 border-0"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="Reguler">Kelas Reguler</SelectItem><SelectItem value="Tahfidz">Kelas Tahfidz (Unggulan)</SelectItem></SelectContent></Select></div>
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 border-b pb-4"><FileText className="text-emerald-600" /> <h3 className="text-xl font-bold">Upload Dokumen Pendukung</h3></div>
                      <p className="text-sm text-slate-500">Silakan pilih foto dokumen asli untuk mempercepat verifikasi. (Opsional, bisa menyusul)</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { id: 'akta', label: 'Akta Lahir', icon: FileText },
                          { id: 'kk', label: 'Kartu Keluarga', icon: Users },
                          { id: 'foto', label: 'Pas Foto', icon: Camera },
                          { id: 'ijazah', label: 'Ijazah/SKL', icon: School },
                        ].map((doc) => (
                          <div key={doc.id} className="space-y-2">
                            <div className={`relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${formData.docs[doc.id] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-emerald-400'}`}>
                              {formData.docs[doc.id] ? (
                                <>
                                  <img src={formData.docs[doc.id]} className="w-full h-full object-cover rounded-2xl" alt={doc.label} />
                                  <button onClick={() => setFormData({...formData, docs: {...formData.docs, [doc.id]: ''}})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"><X className="w-3 h-3" /></button>
                                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg"><Check className="w-3 h-3" /></div>
                                </>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                                  {uploadingField === doc.id ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : <doc.icon className="w-6 h-6 text-slate-300" />}
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{doc.label}</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileAsBase64(e, doc.id)} disabled={!!uploadingField} />
                                </label>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 7 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
                      <h3 className="text-2xl font-bold">Konfirmasi Akhir</h3>
                      <p className="text-slate-500">Silakan periksa kembali ringkasan data berikut sebelum mengirim.</p>
                      <div className="bg-slate-50 p-8 rounded-[2rem] text-left grid md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2">
                          <p className="text-slate-400 font-bold uppercase text-[10px]">Data Siswa</p>
                          <p><strong>Nama:</strong> {formData.nama_lengkap}</p>
                          <p><strong>NIK:</strong> {formData.nik}</p>
                          <p><strong>NISN:</strong> {formData.nisn || '-'}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-slate-400 font-bold uppercase text-[10px]">Data Orang Tua</p>
                          <p><strong>Ayah:</strong> {formData.nama_ayah}</p>
                          <p><strong>WhatsApp:</strong> {formData.no_hp_ayah}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 mt-12 pt-8 border-t">
                    {step > 1 && <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="flex-1 h-14 rounded-2xl font-bold text-slate-500"><ArrowLeft className="w-4 h-4 mr-2" /> KEMBALI</Button>}
                    {step < steps.length ? (
                      <Button onClick={() => setStep(s => s + 1)} className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100">LANJUTKAN <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    ) : (
                      <Button onClick={handleSubmit} disabled={submitting} className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />} KIRIM PENDAFTARAN
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>

      <div className="hidden print:block bg-white p-0 m-0 w-full">
        <div 
          className="mx-auto flex flex-col"
          style={{ 
            width: '210mm', 
            minHeight: '297mm', 
            padding: '1.5cm', 
            boxSizing: 'border-box' 
          }}
        >
          <KopSurat />
          
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold underline uppercase">BUKTI PENDAFTARAN SISWA BARU</h2>
            <p className="text-sm mt-0.5">Tahun Ajaran {spmbConfig.tahun_ajaran}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-bold border-b border-black pb-0.5 text-xs uppercase">I. DATA CALON SISWA</h3>
              <table className="w-full text-[10pt] border-collapse">
                <tbody>
                  <tr><td className="w-[180px] py-0.5">Nama Lengkap</td><td className="w-[10px]">:</td><td className="py-0.5 font-bold">{formData.nama_lengkap}</td></tr>
                  <tr><td className="py-0.5">NIK</td><td>:</td><td className="py-0.5">{formData.nik}</td></tr>
                  <tr><td className="py-0.5">NISN</td><td>:</td><td className="py-0.5">{formData.nisn || '-'}</td></tr>
                  <tr><td className="py-0.5">Tempat, Tgl Lahir</td><td>:</td><td className="py-0.5">{formData.tempat_lahir}, {formData.tanggal_lahir}</td></tr>
                  <tr><td className="py-0.5">Jenis Kelamin</td><td>:</td><td className="py-0.5">{formData.jenis_kelamin}</td></tr>
                  <tr><td className="py-0.5">Sekolah Asal</td><td>:</td><td className="py-0.5">{formData.sekolah_asal}</td></tr>
                  <tr><td className="py-0.5">Pilihan Kelas</td><td>:</td><td className="py-0.5 font-bold">{formData.pilihan_kelas}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold border-b border-black pb-0.5 text-xs uppercase">II. DATA ORANG TUA / WALI</h3>
              <table className="w-full text-[10pt] border-collapse">
                <tbody>
                  <tr><td className="w-[180px] py-0.5">Nama Ayah</td><td className="w-[10px]">:</td><td className="py-0.5">{formData.nama_ayah}</td></tr>
                  <tr><td className="py-0.5">Nama Ibu</td><td>:</td><td className="py-0.5">{formData.nama_ibu}</td></tr>
                  <tr><td className="py-0.5">No. HP / WhatsApp</td><td>:</td><td className="py-0.5">{formData.no_hp_ayah || formData.no_hp_ibu}</td></tr>
                  <tr><td className="py-0.5">Alamat Lengkap</td><td>:</td><td className="py-0.5">{formData.alamat_lengkap}, RT {formData.rt} RW {formData.rw}, {formData.kelurahan}, {formData.kecamatan}, {formData.kabupaten}, {formData.provinsi}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 border border-black rounded-lg bg-gray-50">
              <p className="text-[8pt] font-bold mb-1">CATATAN PANITIA:</p>
              <p className="text-[9pt] leading-tight">
                Bukti pendaftaran ini adalah dokumen resmi sementara. Silakan bawa dokumen fisik (FC Akta, KK, and Pas Foto) ke kantor Madrasah untuk proses verifikasi and tes observasi sesuai jadwal yang ditentukan.
              </p>
            </div>

            <div className="pt-2">
              <PenandatanganDokumen mode="spmb" />
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          header, footer, nav, button, .fixed { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      ` }} />
    </div>
  );
};

export default SPMB;