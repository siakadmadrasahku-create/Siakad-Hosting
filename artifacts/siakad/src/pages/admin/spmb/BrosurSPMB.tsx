"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Pencil, Trash2, Camera, 
  Upload, X, Sparkles, Loader2, Phone, 
  CheckCircle, ArrowLeft, Eye, Download,
  BookOpen, QrCode, ChevronRight, Mail, Globe2,
  ShieldCheck, Trophy, Library, GraduationCap,
  Quote, Instagram, Facebook, Star, Wand2, Palette,
  Megaphone, MapPin, Globe, Calendar, Rocket, ListChecks,
  Award, Medal, Users, Heart, Zap, Shield, Code, School
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { toJpeg } from 'html-to-image';
import { compressImage, uploadImageToStorage } from '@/utils/imageCompression';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { DEFAULT_SITE_URL } from '@/config/site';

type LayoutType = 'emerald' | 'modern' | 'premium' | 'indigo' | 'rose' | 'teal' | 'slate';

interface BrosurItem {
  id: string;
  nama_madrasah_header: string;
  judul: string;
  tagline_brosur: string;
  deskripsi: string;
  layout_type: LayoutType;
  label_prestasi: string;
  icon_prestasi: string;
  label_akreditasi: string;
  icon_akreditasi: string;
  label_unggulan: string;
  icon_unggulan: string;
  logo_kemenag: string;
  logo_maarif: string;
  foto_utama: string;
  foto_ayo_daftar: string;
  teks_ayo_daftar: string;
  foto_1: string; foto_2: string;
  foto_3: string; foto_4: string;
  foto_5: string; foto_6: string;
  foto_7: string; foto_8: string;
  desc_kolase_1: string; desc_kolase_2: string;
  desc_kolase_3: string; desc_kolase_4: string;
  desc_kolase_5: string; desc_kolase_6: string;
  desc_kolase_7: string; desc_kolase_8: string;
  poin_unggulan: string[];
  persyaratan: string[];
  jadwal_pendaftaran: string[];
  ekstrakurikuler: string[];
  testimoni_nama: string;
  testimoni_teks: string;
  ig_handle: string;
  fb_handle: string;
  website_url: string;
  alamat_brosur: string;
  kontak: string;
  is_active: boolean;
  created_at: string;
}

const ICON_OPTIONS = [
  { value: 'Trophy', icon: Trophy },
  { value: 'ShieldCheck', icon: ShieldCheck },
  { value: 'GraduationCap', icon: GraduationCap },
  { value: 'Star', icon: Star },
  { value: 'Award', icon: Award },
  { value: 'Medal', icon: Medal },
  { value: 'BookOpen', icon: BookOpen },
  { value: 'Users', icon: Users },
  { value: 'Heart', icon: Heart },
  { value: 'Sparkles', icon: Sparkles },
  { value: 'Zap', icon: Zap },
  { value: 'Rocket', icon: Rocket },
];

const ICON_MAP: Record<string, any> = {
  Trophy, ShieldCheck, GraduationCap, Star, Award, Medal, BookOpen, Users, Heart, Sparkles, Zap, Rocket, Calendar, CheckCircle, Library
};

const INITIAL_FORM_DATA: Omit<BrosurItem, 'id' | 'created_at'> = {
  nama_madrasah_header: 'Si@Kad',
  judul: 'Penerimaan Peserta Didik Baru', 
  tagline_brosur: 'Mencetak Generasi Rabbani, Cerdas, dan Beradab',
  deskripsi: 'Segera daftarkan putra-putri Anda untuk mendapatkan pendidikan terbaik dengan fasilitas lengkap dan kurikulum yang terintegrasi nilai-nilai Al-Qur\'an.', 
  layout_type: 'emerald',
  label_prestasi: '25+ Prestasi',
  icon_prestasi: 'Trophy',
  label_akreditasi: 'Akreditasi A',
  icon_akreditasi: 'ShieldCheck',
  label_unggulan: 'Program Unggulan',
  icon_unggulan: 'GraduationCap',
  logo_kemenag: '',
  logo_maarif: '',
  foto_utama: '',
  foto_ayo_daftar: '',
  teks_ayo_daftar: 'AYO DAFTAR KE MADRASAH!',
  foto_1: '', foto_2: '', foto_3: '', foto_4: '', foto_5: '', foto_6: '', foto_7: '', foto_8: '',
  desc_kolase_1: 'Tahfidz Quran', desc_kolase_2: 'Lab Komputer',
  desc_kolase_3: 'Olahraga Sunnah', desc_kolase_4: 'Gedung Modern',
  desc_kolase_5: 'Perpustakaan', desc_kolase_6: 'Kantin Sehat',
  desc_kolase_7: 'Seni Islami', desc_kolase_8: 'Outbound',
  poin_unggulan: ['Kurikulum Merdeka Terintegrasi', 'Program Tahfidz 3 Juz', 'Pembiasaan Adab & Akhlak', 'Ekstrakurikuler Panahan'],
  persyaratan: ['Fotokopi Akta Kelahiran', 'Fotokopi Kartu Keluarga', 'Pas Foto 3x4 (4 Lembar)', 'Ijazah/Surat Keterangan Lulus'],
  jadwal_pendaftaran: ['Gelombang 1: Jan - Mar', 'Gelombang 2: Apr - Jun', 'Tes Observasi: Setiap Sabtu', 'Daftar Ulang: Juli'],
  ekstrakurikuler: ['Pramuka', 'Pencak Silat', 'Hadroh', 'Panahan', 'English Club', 'Coding Kids'],
  testimoni_nama: 'Bunda Aisyah (Wali Murid)',
  testimoni_teks: 'Alhamdulillah, anak saya menjadi lebih mandiri dan hafalannya meningkat pesat sejak sekolah di sini. Gurunya sangat sabar dan penuh kasih sayang.',
  ig_handle: '@siakad_madrasah',
  fb_handle: 'Si@Kad Madrasah',
  website_url: DEFAULT_SITE_URL,
  alamat_brosur: 'Jl. Pendidikan No. 123, Kota Bahagia',
  kontak: '0812-3456-7890', is_active: true
};

const THEME_CONFIG: Record<LayoutType, { bg: string, text: string, accent: string, sub: string, border: string, darkText: string }> = {
  emerald: { bg: 'bg-[#064e3b]', text: 'text-white', accent: 'bg-yellow-400', sub: 'text-emerald-300', border: 'border-white/10', darkText: '#022c22' },
  modern: { bg: 'bg-[#0f172a]', text: 'text-white', accent: 'bg-blue-500', sub: 'text-blue-300', border: 'border-white/10', darkText: '#020617' },
  premium: { bg: 'bg-white', text: 'text-amber-900', accent: 'bg-amber-500', sub: 'text-amber-600', border: 'border-amber-100', darkText: '#451a03' },
  indigo: { bg: 'bg-[#312e81]', text: 'text-white', accent: 'bg-indigo-400', sub: 'text-indigo-200', border: 'border-white/10', darkText: '#1e1b4b' },
  rose: { bg: 'bg-[#881337]', text: 'text-white', accent: 'bg-rose-400', sub: 'text-rose-200', border: 'border-white/10', darkText: '#4c0519' },
  teal: { bg: 'bg-[#134e4a]', text: 'text-white', accent: 'bg-teal-400', sub: 'text-teal-200', border: 'border-white/10', darkText: '#042f2e' },
  slate: { bg: 'bg-[#1e293b]', text: 'text-white', accent: 'bg-emerald-400', sub: 'text-slate-300', border: 'border-white/10', darkText: '#0f172a' },
};

const BrosurSPMB = () => {
  const { settings } = useSiteSettings();
  const [data, setData] = useState<BrosurItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<BrosurItem | null>(null);
  const [editingItem, setEditingItem] = useState<BrosurItem | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [mediaModalSlot, setMediaModalSlot] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [formData, setFormData] = useState<Omit<BrosurItem, 'id' | 'created_at'>>(INITIAL_FORM_DATA);

  useEffect(() => {
    fetchBrosur();
  }, []);

  const fetchBrosur = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'brosur_spmb_list').maybeSingle();
      if (res?.value && Array.isArray(res.value)) {
        setData(res.value as BrosurItem[]);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      nama_madrasah_header: settings.general?.school_name || INITIAL_FORM_DATA.nama_madrasah_header
    });
    setDialogOpen(true);
  };

  const handleEdit = (item: BrosurItem) => {
    setEditingItem(item);
    setFormData({ ...INITIAL_FORM_DATA, ...item });
    setDialogOpen(true);
  };

  const handleGenerateAI = () => {
    setIsGenerating(true);
    
    const themes: any[] = [
      {
        layout_type: 'emerald',
        judul: 'Pendaftaran Generasi Penghafal Quran',
        tagline: 'Mahkota Surga untuk Orang Tua, Prestasi Dunia untuk Ananda',
        deskripsi: 'Fokus pada pembentukan karakter Qurani dengan target hafalan yang terukur and sanad yang jelas. Kami membimbing ananda mencintai Al-Quran sejak dini.',
        prestasi: 'Juara Tahfidz Nasional',
        icon_prestasi: 'Trophy',
        akreditasi: 'Unggul (A)',
        icon_akreditasi: 'ShieldCheck',
        unggulan: 'Tahfidz Bersanad',
        icon_unggulan: 'BookOpen',
        poin: ['Metode Murajaah Intensif', 'Karantina Tahfidz Tahunan', 'Ujian Tasmi Sekali Duduk', 'Bahasa Arab Komunikatif'],
        testimoni: 'Ustadz Yusuf (Wali Murid)',
        teks: 'Program tahfidznya sangat luar biasa. Anak saya tidak hanya hafal, tapi juga paham adab terhadap Al-Quran.'
      },
      {
        layout_type: 'modern',
        judul: 'Smart Madrasah: Future Ready School',
        tagline: 'Integrasi Teknologi Digital dengan Nilai-Nilai Islami',
        deskripsi: 'Mempersiapkan siswa menghadapi era digital dengan literasi teknologi tinggi tanpa meninggalkan akar budaya and agama Islam yang kuat.',
        prestasi: 'Madrasah Digital Terbaik',
        icon_prestasi: 'Zap',
        akreditasi: 'Terakreditasi A',
        icon_akreditasi: 'ShieldCheck',
        unggulan: 'Coding & Robotik',
        icon_unggulan: 'Rocket',
        poin: ['Pembelajaran Berbasis iPad', 'E-Library & Digital Lab', 'Ekskul Robotik & Coding', 'Kurikulum Internasional'],
        testimoni: 'Bpk. Hermawan (Wali Murid)',
        teks: 'Sekolah yang sangat visioner. Anak saya jadi sangat antusias belajar sains and teknologi di lingkungan yang islami.'
      },
      {
        layout_type: 'premium',
        judul: 'Madrasah Adab & Karakter Mulia',
        tagline: 'Adab Sebelum Ilmu, Iman Sebelum Amal',
        deskripsi: 'Kami percaya bahwa kecerdasan tanpa akhlak adalah kesia-siaan. Di sini, setiap detik adalah proses pembiasaan karakter Rabbani yang santun.',
        prestasi: 'Sekolah Ramah Anak',
        icon_prestasi: 'Heart',
        akreditasi: 'Grade A+',
        icon_akreditasi: 'Award',
        unggulan: 'Bina Karakter',
        icon_unggulan: 'Users',
        poin: ['Pembiasaan Shalat Berjamaah', 'Kajian Adab Harian', 'Program Bakti Sosial', 'Konseling Psikologi Anak'],
        testimoni: 'Ibu Ratna (Wali Murid)',
        teks: 'Perubahan perilaku anak saya sangat terasa. Sekarang jauh lebih sopan and rajin membantu orang tua di rumah.'
      },
      {
        layout_type: 'indigo',
        judul: 'Excellent Islamic Leadership School',
        tagline: 'Membangun Pemimpin Masa Depan yang Berintegritas',
        deskripsi: 'Kurikulum kepemimpinan yang dipadukan dengan nilai-nilai Islam untuk mencetak pribadi yang tangguh, jujur, and visioner.',
        prestasi: 'Sekolah Unggulan Provinsi',
        icon_prestasi: 'Medal',
        akreditasi: 'Akreditasi A+',
        icon_akreditasi: 'ShieldCheck',
        unggulan: 'Leadership Program',
        icon_unggulan: 'Users',
        poin: ['Latihan Dasar Kepemimpinan', 'Public Speaking Class', 'Organisasi Siswa Aktif', 'Mentoring Karakter'],
        testimoni: 'Bpk. Ridwan (Wali Murid)',
        teks: 'Anak saya sekarang jauh lebih percaya diri and berani tampil di depan umum berkat program kepemimpinan di sini.'
      }
    ];

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        layout_type: randomTheme.layout_type,
        judul: randomTheme.judul,
        tagline_brosur: randomTheme.tagline,
        deskripsi: randomTheme.deskripsi,
        label_prestasi: randomTheme.prestasi,
        icon_prestasi: randomTheme.icon_prestasi,
        label_akreditasi: randomTheme.akreditasi,
        icon_akreditasi: randomTheme.icon_akreditasi,
        label_unggulan: randomTheme.unggulan,
        icon_unggulan: randomTheme.icon_unggulan,
        poin_unggulan: randomTheme.poin,
        testimoni_nama: randomTheme.testimoni,
        testimoni_teks: randomTheme.teks
      }));
      setIsGenerating(false);
      showSuccess(`AI berhasil men-generate desain tema ${randomTheme.layout_type.toUpperCase()}!`);
    }, 1500);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const imageUrl = await uploadImageToStorage(file, 'brosur');
      setFormData(prev => ({ ...prev, [slot]: imageUrl }));
      showSuccess('Foto berhasil dikompres & diunggah!');
    } catch (error) {
      showError('Gagal upload');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSave = async () => {
    if (!formData.judul.trim()) {
      showError('Judul wajib diisi!');
      return;
    }
    setIsSaving(true);
    try {
      let newList: BrosurItem[];
      if (editingItem) {
        newList = data.map(d => d.id === editingItem.id ? { ...formData, id: d.id, created_at: d.created_at } : d);
      } else {
        const newItem: BrosurItem = { 
          ...formData, 
          id: Date.now().toString(), 
          created_at: new Date().toISOString() 
        } as BrosurItem;
        newList = [newItem, ...data];
      }
      
      const { error } = await supabase.from('site_settings').upsert({ 
        id: 'brosur_spmb_list', 
        value: newList, 
        updated_at: new Date().toISOString() 
      });

      if (error) throw error;
      
      setData(newList);
      setDialogOpen(false);
      showSuccess(editingItem ? 'Brosur diperbarui!' : 'Brosur baru ditambahkan!');
    } catch (error) {
      showError('Gagal menyimpan ke database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadJPG = async () => {
    const node = document.getElementById('brochure-a4-area');
    if (!node) return;
    setIsDownloading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const dataUrl = await toJpeg(node, { quality: 1.0, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `brosur-spmb-a4-${previewItem?.judul.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      link.href = dataUrl;
      link.click();
      showSuccess('Brosur A4 berhasil diunduh!');
    } catch (err) {
      showError('Gagal mengunduh gambar');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderUploader = (slot: string, label: string, isLarge = false) => {
    const value = formData[slot as keyof typeof formData] as string;
    return (
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-gray-400 uppercase">{label}</label>
        <div className={`border rounded-xl bg-gray-50 relative flex items-center justify-center overflow-hidden group ${isLarge ? 'aspect-video' : 'aspect-[4/3]'}`}>
          {value ? (
            <>
              <img src={value} className="h-full w-full object-cover" alt="" />
              <button 
                onClick={() => setFormData({...formData, [slot]: ''})} 
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-2">
              {uploadingSlot === slot ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : <Camera className="w-8 h-8 text-gray-300" />}
              <span className="text-[10px] text-gray-400 font-bold">UPLOAD</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, slot)} />
            </label>
          )}
        </div>
      </div>
    );
  };

  const handleListChange = (field: 'poin_unggulan' | 'persyaratan' | 'jadwal_pendaftaran' | 'ekstrakurikuler', value: string) => {
    setFormData({ ...formData, [field]: value.split('\n').filter(l => l.trim() !== '') });
  };

  const renderIconPicker = (field: string, label: string) => {
    const currentValue = formData[field as keyof typeof formData] as string;
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormData({...formData, [field]: opt.value})}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                currentValue === opt.value ? 'bg-emerald-500 text-white shadow-md scale-110' : 'bg-white text-gray-400 hover:bg-gray-100'
              }`}
            >
              <opt.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderLogoText = (name: string) => {
    if (name.toLowerCase().includes('si@kad')) {
      const parts = name.split(/@/i);
      return (
        <>
          {parts[0]}
          <span style={{ color: '#FFD700', filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))', fontWeight: '900' }}>@</span>
          {parts[1]}
        </>
      );
    }
    return name;
  };

  return (
    <AdminLayout title="Brosur Ikonik Emerald">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Brosur Ikonik</h2>
          <p className="text-gray-500 text-sm">Desain premium dengan variasi layout yang didukung AI.</p>
        </div>
        <Button 
          onClick={handleCreateNew} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" /> Buat Brosur Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
          <Sparkles className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">Belum ada brosur ikonik. Klik tombol di atas untuk membuat.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {data.map(item => (
            <Card key={item.id} className="overflow-hidden border-0 shadow-lg rounded-2xl group bg-white">
              <div className={`h-48 relative overflow-hidden ${THEME_CONFIG[item.layout_type].bg}`}>
                <img src={item.foto_utama || item.foto_1 || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400'} className="w-full h-full object-cover opacity-60" alt="" />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-0 text-[8px] uppercase font-black">{item.layout_type} Layout</Badge>
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" size="sm" className="rounded-full font-bold" onClick={() => setPreviewItem(item)}>
                    <Eye className="w-4 h-4 mr-1" /> Preview A4
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 truncate">{item.judul}</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-xl font-bold border-emerald-100 text-emerald-700" 
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500 border-red-100 rounded-xl" 
                    onClick={() => { if(confirm('Hapus?')) { const nl = data.filter(d => d.id !== item.id); supabase.from('site_settings').upsert({ id: 'brosur_spmb_list', value: nl }).then(() => setData(nl)); } }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-5xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Konfigurasi Brosur Ikonik
              {!editingItem && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateAI} 
                  disabled={isGenerating}
                  className="ml-auto text-purple-600 border-purple-100 hover:bg-purple-50 rounded-lg"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                  AI Magic Designer
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-8 pt-4">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Pilih Tema Warna</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(THEME_CONFIG) as LayoutType[]).map(t => (
                        <button 
                          key={t} 
                          onClick={() => setFormData({...formData, layout_type: t})}
                          className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm ${formData.layout_type === t ? 'scale-125 border-emerald-500 ring-2 ring-emerald-200' : 'border-transparent'} ${THEME_CONFIG[t].bg}`}
                          title={t.toUpperCase()}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Madrasah (Header)</label>
                    <Input placeholder="Nama Madrasah di Header" value={formData.nama_madrasah_header} onChange={e => setFormData({...formData, nama_madrasah_header: e.target.value})} className="rounded-xl h-12 font-black text-emerald-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Judul Utama Brosur (Mendukung Enter/Spasi Manual)</label>
                    <Textarea 
                      placeholder="Judul Brosur" 
                      value={formData.judul} 
                      onChange={e => setFormData({...formData, judul: e.target.value})} 
                      className="rounded-xl min-h-[100px] font-bold" 
                    />
                  </div>
                  <Input placeholder="Tagline Ikonik" value={formData.tagline_brosur} onChange={e => setFormData({...formData, tagline_brosur: e.target.value})} className="rounded-xl h-12" />
                  <Input placeholder="Alamat Madrasah (Untuk Header)" value={formData.alamat_brosur} onChange={e => setFormData({...formData, alamat_brosur: e.target.value})} className="rounded-xl h-12" />
                  <Textarea placeholder="Keterangan Hero" value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} className="rounded-xl min-h-[80px]" />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Badge Hero (Label & Ikon)</label>
                  <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-2xl border border-dashed">
                    <div className="space-y-3">
                      <Input placeholder="Label Prestasi" value={formData.label_prestasi} onChange={e => setFormData({...formData, label_prestasi: e.target.value})} className="rounded-xl h-10" />
                      {renderIconPicker('icon_prestasi', 'Pilih Ikon Prestasi')}
                    </div>
                    <div className="space-y-3">
                      <Input placeholder="Label Akreditasi" value={formData.label_akreditasi} onChange={e => setFormData({...formData, label_akreditasi: e.target.value})} className="rounded-xl h-10" />
                      {renderIconPicker('icon_akreditasi', 'Pilih Ikon Akreditasi')}
                    </div>
                    <div className="space-y-3">
                      <Input placeholder="Label Unggulan" value={formData.label_unggulan} onChange={e => setFormData({...formData, label_unggulan: e.target.value})} className="rounded-xl h-10" />
                      {renderIconPicker('icon_unggulan', 'Pilih Ikon Unggulan')}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Atribut Madrasah (Logo)</label>
                  <div className="grid grid-cols-2 gap-4">
                    {renderUploader('logo_kemenag', 'Logo Kemenag (Kiri)')}
                    {renderUploader('logo_maarif', 'Logo Ma\'arif (Kanan)')}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Seksi "Ayo Daftar"</label>
                  {renderUploader('foto_ayo_daftar', 'Gambar Anak (Ayo Daftar)', true)}
                  <Input placeholder="Teks Ajakan" value={formData.teks_ayo_daftar} onChange={e => setFormData({...formData, teks_ayo_daftar: e.target.value})} className="rounded-xl h-12 font-black text-emerald-700" />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Gambar Utama (Hero)</label>
                  {renderUploader('foto_utama', 'Main Cover Image', true)}
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Galeri Fasilitas (8 Foto)</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="space-y-2">
                        {renderUploader(`foto_${i}`, `F${i}`)}
                        <Input 
                          value={formData[`desc_kolase_${i}` as keyof typeof formData] as string} 
                          onChange={e => setFormData({...formData, [`desc_kolase_${i}`]: e.target.value})} 
                          className="rounded-lg h-7 text-[9px] px-2" 
                          placeholder={`Label ${i}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Daftar Informasi (Gunakan Baris Baru)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Keunggulan</label>
                      <Textarea value={formData.poin_unggulan.join('\n')} onChange={e => handleListChange('poin_unggulan', e.target.value)} className="rounded-xl text-xs min-h-[100px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Persyaratan</label>
                      <Textarea value={formData.persyaratan.join('\n')} onChange={e => handleListChange('persyaratan', e.target.value)} className="rounded-xl text-xs min-h-[100px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Jadwal Pendaftaran</label>
                      <Textarea value={formData.jadwal_pendaftaran.join('\n')} onChange={e => handleListChange('jadwal_pendaftaran', e.target.value)} className="rounded-xl text-xs min-h-[100px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ekstrakurikuler</label>
                      <Textarea value={formData.ekstrakurikuler.join('\n')} onChange={e => handleListChange('ekstrakurikuler', e.target.value)} className="rounded-xl text-xs min-h-[100px]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Testimoni & Footer</label>
                  <div className="grid grid-cols-1 gap-4">
                    <Input placeholder="Nama Pemberi Testimoni" value={formData.testimoni_nama} onChange={e => setFormData({...formData, testimoni_nama: e.target.value})} className="rounded-xl h-10" />
                    <Textarea placeholder="Isi Testimoni" value={formData.testimoni_teks} onChange={e => setFormData({...formData, testimoni_teks: e.target.value})} className="rounded-xl min-h-[60px]" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input value={formData.kontak} onChange={e => setFormData({...formData, kontak: e.target.value})} className="rounded-xl h-10" placeholder="WhatsApp" />
                      <Input value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} className="rounded-xl h-10" placeholder="Website" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input value={formData.ig_handle} onChange={e => setFormData({...formData, ig_handle: e.target.value})} className="rounded-xl h-10" placeholder="Instagram" />
                      <Input value={formData.fb_handle} onChange={e => setFormData({...formData, fb_handle: e.target.value})} className="rounded-xl h-10" placeholder="Facebook" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold text-lg shadow-xl"
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Simpan & Publikasikan Brosur Ikonik'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {previewItem && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md overflow-y-auto p-4 md:p-12">
          <div className="max-w-[210mm] mx-auto">
            <div className="flex justify-between mb-8">
              <Button variant="ghost" onClick={() => setPreviewItem(null)} className="font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl shadow-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
              </Button>
              <Button 
                onClick={handleDownloadJPG} 
                disabled={isDownloading} 
                className="bg-yellow-400 text-emerald-950 font-black px-10 rounded-xl h-14 shadow-xl hover:bg-yellow-500 transition-all"
              >
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />} UNDUH BROSUR (A4)
              </Button>
            </div>
            
            {/* DYNAMIC LAYOUT RENDERING */}
            <div id="brochure-a4-area" className={`min-h-[297mm] flex flex-col relative overflow-hidden shadow-2xl border-[12px] border-white ${THEME_CONFIG[previewItem.layout_type].bg}`} style={{ width: '210mm' }}>
              
              {/* Background Pattern & Floating Shapes */}
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/islamic-art.png")' }}></div>
              <div className="absolute top-[-50px] left-[-50px] w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
              <div className="absolute bottom-[-50px] right-[-50px] w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>
              
              <div className="pt-[4mm] px-[12mm] pb-[4mm] flex flex-col h-full relative z-10">
                {/* Header with Logos */}
                <div className={`flex justify-between items-center mb-3 border-b pb-6 ${THEME_CONFIG[previewItem.layout_type].border}`}>
                  <div className="flex items-center gap-4">
                    {previewItem.logo_kemenag && (
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-white/20 flex items-center justify-center p-2.5 backdrop-blur-sm">
                        <img src={previewItem.logo_kemenag} className="h-full w-full object-contain" alt="Kemenag" />
                      </div>
                    )}
                    <div className="h-12 w-[1px] bg-white/20 mx-1"></div>
                    <div className="flex flex-col">
                      <h2 className={`text-2xl font-black tracking-tighter uppercase leading-none flex items-center gap-2 ${THEME_CONFIG[previewItem.layout_type].text}`}>
                        <span className="w-1.5 h-8 bg-yellow-400 rounded-full"></span>
                        {renderLogoText(previewItem.nama_madrasah_header)}
                      </h2>
                      <p className={`text-[8px] font-bold uppercase tracking-[0.2em] mt-1.5 ml-3.5 ${THEME_CONFIG[previewItem.layout_type].sub}`}>
                        {previewItem.alamat_brosur || settings.general?.address}
                      </p>
                    </div>
                    {previewItem.logo_maarif && (
                      <>
                        <div className="h-12 w-[1px] bg-white/20 mx-1"></div>
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-white/20 flex items-center justify-center p-2.5 backdrop-blur-sm">
                          <img src={previewItem.logo_maarif} className="h-full w-full object-contain" alt="Maarif" />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* ICONIC MODERN ACADEMIC YEAR DISPLAY */}
                  <div className="relative">
                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-md shadow-xl bg-white/10 border-white/20`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${THEME_CONFIG[previewItem.layout_type].accent} text-white`}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`text-[7px] font-black uppercase tracking-[0.2em] ${THEME_CONFIG[previewItem.layout_type].sub}`}>Tahun Pelajaran</p>
                        <p className={`text-base font-black tracking-tight ${THEME_CONFIG[previewItem.layout_type].text}`}>
                          {settings.tahun_pelajaran?.spmb_year || '2025/2026'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero Section - SLIMMED DOWN */}
                <div className={`grid grid-cols-2 gap-8 mb-8 items-center ${previewItem.layout_type === 'modern' ? 'flex-row-reverse' : ''}`}>
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${THEME_CONFIG[previewItem.layout_type].accent} text-white`}>
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span> New Admissions
                    </div>
                    <h1 
                      className={`text-3xl font-black leading-[1.05] tracking-tighter whitespace-pre-wrap`}
                      style={{ 
                        color: '#FFFFFF',
                        fontFamily: "'Unbounded', cursive"
                      }}
                    >
                      {previewItem.judul}
                    </h1>
                    <p className={`text-base font-bold italic leading-tight ${THEME_CONFIG[previewItem.layout_type].sub}`}>
                      "{previewItem.tagline_brosur}"
                    </p>
                    <p className={`text-[11px] leading-relaxed font-medium ${previewItem.layout_type === 'premium' ? 'text-gray-600' : 'text-white/80'}`}>
                      {previewItem.deskripsi}
                    </p>
                    <div className="flex gap-2">
                      {[
                        { icon: ICON_MAP[previewItem.icon_prestasi] || Trophy, label: previewItem.label_prestasi },
                        { icon: ICON_MAP[previewItem.icon_akreditasi] || ShieldCheck, label: previewItem.label_akreditasi },
                        { icon: ICON_MAP[previewItem.icon_unggulan] || GraduationCap, label: previewItem.label_unggulan }
                      ].map((badge, idx) => (
                        <div key={idx} className={`flex flex-col items-center p-2 backdrop-blur-sm rounded-xl border flex-1 bg-white/5 border-white/10`}>
                          <badge.icon className={`w-4 h-4 mb-0.5 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`} />
                          <p className={`text-[7px] font-black uppercase text-center ${THEME_CONFIG[previewItem.layout_type].text}`}>{badge.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    {/* Floating Decorative Badge */}
                    <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-xl z-20 ${THEME_CONFIG[previewItem.layout_type].accent} text-white border-4 border-white`}>
                      <Sparkles className="w-6 h-6" />
                    </div>
                    
                    <div className={`aspect-[3/2] rounded-[1.5rem] overflow-hidden shadow-xl border-[4px] ${THEME_CONFIG[previewItem.layout_type].border}`}>
                      <img src={previewItem.foto_utama || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600'} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className={`absolute -bottom-2 -left-2 p-2 rounded-xl shadow-lg ${THEME_CONFIG[previewItem.layout_type].accent} text-white`}>
                      <p className="text-lg font-black leading-none">100%</p>
                      <p className="text-[5px] font-bold uppercase tracking-widest">Islami & Modern</p>
                    </div>
                  </div>
                </div>

                {/* Ayo Daftar Section - SLIMMED & RAMPING */}
                <div className={`mb-6 rounded-2xl overflow-hidden relative bg-white/5 border ${THEME_CONFIG[previewItem.layout_type].border}`}>
                  <div className="flex items-center">
                    <div className="flex-1 p-4 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Megaphone className={`w-3.5 h-3.5 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`} />
                        <span className={`text-[8px] font-black uppercase tracking-widest ${THEME_CONFIG[previewItem.layout_type].text}`}>Mari Bergabung!</span>
                      </div>
                      <h3 className={`text-lg font-black leading-tight ${THEME_CONFIG[previewItem.layout_type].text}`}>
                        {previewItem.teks_ayo_daftar}
                      </h3>
                      <p className={`text-[8px] font-medium leading-relaxed ${THEME_CONFIG[previewItem.layout_type].sub}`}>
                        Jadilah bagian dari keluarga besar madrasah kami and raih masa depan gemilang dengan iman and ilmu.
                      </p>
                    </div>
                    <div className="w-[25%] relative self-stretch flex items-end">
                      {previewItem.foto_ayo_daftar ? (
                        <img src={previewItem.foto_ayo_daftar} className="max-h-20 w-full object-contain object-right-bottom" alt="Anak Madrasah" />
                      ) : (
                        <div className="h-16 w-full bg-gray-200/10 flex items-center justify-center text-gray-400 text-[7px] font-bold">FOTO</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gallery Section */}
                <div className="mb-10">
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${THEME_CONFIG[previewItem.layout_type].text}`}>Fasilitas & Kegiatan Ikonik</h3>
                    <div className={`h-[1px] flex-1 ${THEME_CONFIG[previewItem.layout_type].border}`}></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className={`group relative aspect-[4/3] rounded-xl overflow-hidden shadow-md border ${THEME_CONFIG[previewItem.layout_type].border}`}>
                        <img src={previewItem[`foto_${i}` as keyof typeof previewItem] as string || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200'} className="w-full h-full object-cover" alt="" />
                        {previewItem[`desc_kolase_${i}` as keyof typeof previewItem] && (
                          <div className={`absolute inset-x-0 bottom-0 backdrop-blur-sm p-1.5 text-center bg-black/60`}>
                            <p className="text-[7px] font-bold text-white uppercase truncate">{previewItem[`desc_kolase_${i}` as keyof typeof previewItem] as string}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ICONIC INFO CARDS SECTION - RAMPING & MODERN */}
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {/* Card 1: Keunggulan */}
                  <div className={`flex flex-col rounded-xl overflow-hidden border shadow-sm bg-white/5 border-white/10 relative`}>
                    <div className={`p-2 flex items-center gap-1.5 bg-emerald-500`}>
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Keunggulan</span>
                    </div>
                    <div className="p-3 flex-1">
                      <ul className="space-y-1.5">
                        {previewItem.poin_unggulan.map((p, i) => (
                          <li key={i} className={`text-[8px] font-bold flex items-start gap-1.5 leading-tight ${THEME_CONFIG[previewItem.layout_type].text}`}>
                            <CheckCircle className={`w-2.5 h-2.5 flex-shrink-0 text-emerald-400`} /> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card 2: Persyaratan */}
                  <div className={`flex flex-col rounded-xl overflow-hidden border shadow-sm bg-white/5 border-white/10 relative`}>
                    <div className={`p-2 flex items-center gap-1.5 bg-indigo-500`}>
                      <Library className="w-3.5 h-3.5 text-white" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Persyaratan</span>
                    </div>
                    <div className="p-3 flex-1">
                      <ul className="space-y-1.5">
                        {previewItem.persyaratan.map((p, i) => (
                          <li key={i} className={`text-[8px] font-bold flex items-start gap-1.5 leading-tight ${THEME_CONFIG[previewItem.layout_type].text}`}>
                            <div className={`w-1 h-1 rounded-full mt-1 flex-shrink-0 bg-indigo-400`} /> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card 3: Jadwal */}
                  <div className={`flex flex-col rounded-xl overflow-hidden border shadow-sm bg-white/5 border-white/10 relative`}>
                    <div className={`p-2 flex items-center gap-1.5 bg-amber-500`}>
                      <Calendar className="w-3.5 h-3.5 text-white" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Jadwal</span>
                    </div>
                    <div className="p-3 flex-1">
                      <ul className="space-y-1.5">
                        {previewItem.jadwal_pendaftaran.map((p, i) => (
                          <li key={i} className={`text-[8px] font-bold flex items-start gap-1.5 leading-tight ${THEME_CONFIG[previewItem.layout_type].text}`}>
                            <div className={`w-1 h-1 rounded-full mt-1 flex-shrink-0 bg-amber-400`} /> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card 4: Ekstrakurikuler */}
                  <div className={`flex flex-col rounded-xl overflow-hidden border shadow-sm bg-white/5 border-white/10 relative`}>
                    <div className={`p-2 flex items-center gap-1.5 bg-rose-500`}>
                      <Rocket className="w-3.5 h-3.5 text-white" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Ekskul</span>
                    </div>
                    <div className="p-3 flex-1">
                      <ul className="space-y-1.5">
                        {previewItem.ekstrakurikuler.map((p, i) => (
                          <li key={i} className={`text-[8px] font-bold flex items-start gap-1.5 leading-tight ${THEME_CONFIG[previewItem.layout_type].text}`}>
                            <div className={`w-1 h-1 rounded-full mt-1 flex-shrink-0 bg-rose-400`} /> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Testimoni - RAMPING & FLOATING STYLE */}
                <div className={`backdrop-blur-sm p-3 rounded-2xl border relative mb-4 bg-white/5 ${THEME_CONFIG[previewItem.layout_type].border}`}>
                  <div className="absolute top-2 right-2 opacity-10">
                    <Quote className={`w-4 h-4 ${THEME_CONFIG[previewItem.layout_type].text}`} />
                  </div>
                  <h4 className={`text-[9px] font-black uppercase tracking-widest mb-1 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`}>Apa Kata Mereka?</h4>
                  <p className={`text-[8px] italic leading-relaxed mb-1 ${THEME_CONFIG[previewItem.layout_type].text}`}>
                    "{previewItem.testimoni_teks}"
                  </p>
                  <p className={`text-[7px] font-black uppercase ${THEME_CONFIG[previewItem.layout_type].text}`}>{previewItem.testimoni_nama}</p>
                </div>

                {/* Footer - MODERN FLOATING STYLE */}
                <div className={`mt-auto pt-2 border-t flex justify-between items-end relative ${THEME_CONFIG[previewItem.layout_type].border}`}>
                  {/* Subtle Watermark */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                    <p className={`text-4xl font-black uppercase tracking-[0.5em] whitespace-nowrap ${THEME_CONFIG[previewItem.layout_type].text}`}>
                      OFFICIAL DOCUMENT
                    </p>
                  </div>

                  {/* ICONIC CENTER BADGES (School Name & Developer) */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-1 z-20 flex flex-col items-center gap-1">
                    {/* School Name Badge */}
                    <div className={`flex items-center gap-1.5 px-4 py-1 rounded-full backdrop-blur-md border bg-white/10 border-white/20 shadow-lg`}>
                      <School className={`w-3 h-3 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`} />
                      <p className={`text-[8px] font-black uppercase tracking-tighter ${THEME_CONFIG[previewItem.layout_type].text}`}>
                        {renderLogoText(previewItem.nama_madrasah_header)}
                      </p>
                    </div>
                    
                    {/* Developer Credit - ICONIC & MODERN */}
                    <div className="flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-xl border bg-white/10 border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.1)] group/dev">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <p className={`text-[6px] font-black uppercase tracking-[0.2em] ${THEME_CONFIG[previewItem.layout_type].text}`}>
                        <span className="opacity-50">Engineered by</span>{" "}
                        <span className="bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                          Jaenal Maskun, S.Pd.I
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Floating Particles */}
                  <div className="absolute top-2 left-1/4 w-1 h-1 rounded-full bg-white/20"></div>
                  <div className="absolute bottom-4 right-1/3 w-1.5 h-1.5 rounded-full bg-white/10"></div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${THEME_CONFIG[previewItem.layout_type].accent} text-white`}>
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-[7px] font-black uppercase tracking-widest ${THEME_CONFIG[previewItem.layout_type].sub}`}>Hubungi Kami</p>
                        <p className={`text-lg font-black ${THEME_CONFIG[previewItem.layout_type].text}`}>{previewItem.kontak || '0812-3456-7890'}</p>
                      </div>
                    </div>
                    
                    {/* MODERN MICRO-PILL SOCIAL CONTACTS */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md border bg-white/5 border-white/10 shadow-sm`}>
                          <Instagram className={`w-2 h-2 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`} />
                          <span className={`text-[6px] font-bold ${THEME_CONFIG[previewItem.layout_type].text}`}>{previewItem.ig_handle}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md border bg-white/5 border-white/10 shadow-sm`}>
                          <Facebook className={`w-2 h-2 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`} />
                          <span className={`text-[6px] font-bold ${THEME_CONFIG[previewItem.layout_type].text}`}>{previewItem.fb_handle}</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md border bg-white/5 border-white/10 shadow-sm w-fit`}>
                        <Globe className={`w-2 h-2 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`} />
                        <span className={`text-[6px] font-bold ${THEME_CONFIG[previewItem.layout_type].text}`}>{previewItem.website_url}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    <div className="text-right">
                      <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${THEME_CONFIG[previewItem.layout_type].accent.replace('bg-', 'text-')}`}>Scan Untuk Daftar</p>
                      <p className={`text-[6px] font-bold max-w-[80px] leading-tight ${THEME_CONFIG[previewItem.layout_type].sub}`}>Akses pendaftaran online melalui kode QR ini.</p>
                    </div>
                    <div className={`w-16 h-16 p-1 rounded-xl shadow-xl bg-white relative group`}>
                      <QrCode className={`w-full h-full text-slate-900`} />
                      <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-xl animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`h-1.5 w-full ${THEME_CONFIG[previewItem.layout_type].accent}`}></div>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal for choosing stored photos in Brosur SPMB */}
      <MediaLibraryModal
        isOpen={mediaModalSlot !== null}
        onClose={() => setMediaModalSlot(null)}
        onSelectImage={(url) => {
          if (mediaModalSlot) {
            setFormData(prev => ({ ...prev, [mediaModalSlot]: url }));
            showSuccess(`Foto diperbarui dari galeri tersimpan!`);
          }
          setMediaModalSlot(null);
        }}
        title={`Pilih Foto Tersimpan untuk Brosur (${mediaModalSlot || ''})`}
      />
    </AdminLayout>
  );
};

export default BrosurSPMB;
