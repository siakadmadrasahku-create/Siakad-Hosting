"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Save, Building, School, Globe, FileText, Users, Calendar, Upload, X, ImageIcon, 
  MapPin, RotateCcw, Printer, ShieldCheck, Landmark, CheckCircle2, Phone, Mail, 
  BookOpen, Sparkles, Zap, HardDrive, CreditCard, Award, ChevronRight, FileCheck,
  GraduationCap, Trophy, Plus, Pencil, Trash2, Search, Download, Filter, Medal
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { uploadImageToStorage } from '@/utils/imageCompression';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { getGoogleMapEmbedUrl } from '@/components/Contact';

export interface IdentitasMadrasahEmis {
  id: string;
  // 1. Kelembagaan Utama
  nama_yayasan: string;
  nama_madrasah: string;
  nsm: string;
  npsn: string;
  jenjang_pendidikan: string; // RA, MI, MTs, MA, MAK
  status: string; // Negeri, Swasta
  kategori_wilayah: string;
  tahun_berdiri: string;
  nama_pimpinan: string;
  nip_pimpinan: string;
  telepon_pimpinan: string;
  jabatan: string;
  logo_url: string;

  // 2. Alamat & Kontak
  alamat: string;
  rt_rw: string;
  dusun: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kode_pos: string;
  telepon: string;
  email: string;
  website: string;
  akses_internet: string;
  sumber_listrik: string;
  daya_listrik: string;

  // 3. Dokumen & Legalitas
  sk_pendirian: string;
  tgl_sk_pendirian: string;
  sk_ijin_operasional: string;
  tgl_sk_ijin_operasional: string;
  akreditasi: string;
  sk_akreditasi: string;
  tgl_sk_akreditasi: string;
  npwp: string;
  nama_bank: string;
  no_rekening: string;
  rekening_atas_nama: string;

  // 4. Lahan & Sarpras
  status_tanah: string;
  luas_tanah: string;
  luas_bangunan: string;
  jumlah_ruang_kelas: string;
  jumlah_lab: string;
  jumlah_perpustakaan: string;
  jumlah_sanitasi: string;

  // 5. Visi Misi & Kurikulum
  visi: string;
  misi: string;
  motto: string;
  program_unggulan: string;
  kurikulum: string;

  // 6. Lokasi Peta
  maps_latitude: string;
  maps_longitude: string;
  maps_zoom: string;
  maps_embed_url: string;
  updated_at?: string;
}

export interface TamatanItem {
  id: string;
  tahun_pelajaran: string;
  lulus_l: number;
  lulus_p: number;
  lulus_total: number;
  melanjutkan_mts: number;
  melanjutkan_smp: number;
  tidak_melanjutkan: number;
  keterangan?: string;
}

export interface PrestasiItem {
  id: string;
  nama_siswa: string;
  tanggal_kegiatan: string;
  jenis_lomba: string;
  tingkat: string;
  juara_ke: string;
  penyelenggara?: string;
  keterangan?: string;
}

const defaultTamatanList: TamatanItem[] = [
  { id: '1', tahun_pelajaran: '2021/2022', lulus_l: 18, lulus_p: 22, lulus_total: 40, melanjutkan_mts: 28, melanjutkan_smp: 12, tidak_melanjutkan: 0, keterangan: 'Lulus 100%' },
  { id: '2', tahun_pelajaran: '2022/2023', lulus_l: 20, lulus_p: 25, lulus_total: 45, melanjutkan_mts: 32, melanjutkan_smp: 13, tidak_melanjutkan: 0, keterangan: 'Lulus 100%' },
  { id: '3', tahun_pelajaran: '2023/2024', lulus_l: 22, lulus_p: 26, lulus_total: 48, melanjutkan_mts: 35, melanjutkan_smp: 13, tidak_melanjutkan: 0, keterangan: 'Lulus 100%' },
  { id: '4', tahun_pelajaran: '2024/2025', lulus_l: 25, lulus_p: 27, lulus_total: 52, melanjutkan_mts: 38, melanjutkan_smp: 14, tidak_melanjutkan: 0, keterangan: 'Lulus 100%' },
];

const defaultPrestasiList: PrestasiItem[] = [
  { id: '1', nama_siswa: 'Ahmad Fauzi & Tim', tanggal_kegiatan: '2024-05-14', jenis_lomba: 'KSM (Kompetisi Sains Madrasah)', tingkat: 'Kabupaten', juara_ke: 'Juara 1', penyelenggara: 'Kemenag Kab. Banyumas', keterangan: 'Lolos ke Tingkat Provinsi' },
  { id: '2', nama_siswa: 'Siti Nurhaliza', tanggal_kegiatan: '2024-08-20', jenis_lomba: 'PORSENI (Tahfidz Juz 30)', tingkat: 'Kecamatan', juara_ke: 'Juara 1', penyelenggara: 'KKMI Kecamatan Rawalo', keterangan: 'Piala Tetap' },
  { id: '3', nama_siswa: 'Muhammad Rizky', tanggal_kegiatan: '2024-09-10', jenis_lomba: 'AXIOMA (Kaligrafi Islam)', tingkat: 'Provinsi', juara_ke: 'Juara 2', penyelenggara: 'Kanwil Kemenag Jawa Tengah', keterangan: 'Piagam Penghargaan' },
  { id: '4', nama_siswa: 'Tim Regu Pramuka Penggalang', tanggal_kegiatan: '2024-10-28', jenis_lomba: 'Lomba Tingkat Pramuka (LT-II)', tingkat: 'Kecamatan', juara_ke: 'Juara 1 Utama', penyelenggara: 'Kwarran Rawalo', keterangan: 'Regu Berprestasi Tinggi' },
];

const defaultEmisIdentitas: IdentitasMadrasahEmis = {
  id: '',
  nama_yayasan: 'YAYASAN PENDIDIKAN ISLAM',
  nama_madrasah: "MI Ma'arif NU 2 Sanggreman",
  nsm: '111233020000',
  npsn: '60700000',
  jenjang_pendidikan: 'MI',
  status: 'Swasta',
  kategori_wilayah: 'Perdesaan',
  tahun_berdiri: '2010',
  nama_pimpinan: 'Kepala Madrasah, S.Pd.I',
  nip_pimpinan: '198501012010011001',
  telepon_pimpinan: '081234567890',
  jabatan: 'Kepala Madrasah',
  logo_url: '',

  alamat: 'Jl. Raya Sanggreman No. 12',
  rt_rw: 'RT 02 / RW 03',
  dusun: 'Sanggreman',
  desa: 'Sanggreman',
  kecamatan: 'Rawalo',
  kabupaten: 'Banyumas',
  provinsi: 'Jawa Tengah',
  kode_pos: '53173',
  telepon: '(0281) 654321',
  email: 'mimadarahsanggreman2@gmail.com',
  website: 'https://mimaarifnu2sanggreman.sch.id',
  akses_internet: 'Indihome Fiber 100 Mbps',
  sumber_listrik: 'PLN 2200 VA',
  daya_listrik: '2200 VA',

  sk_pendirian: 'Kd.11.02/4/PP.00.7/012/2010',
  tgl_sk_pendirian: '2010-07-15',
  sk_ijin_operasional: 'Kd.11.02/4/PP.00.7/012/2010',
  tgl_sk_ijin_operasional: '2010-07-15',
  akreditasi: 'A',
  sk_akreditasi: '1347/BAN-SM/SK/2021',
  tgl_sk_akreditasi: '2021-12-08',
  npwp: '02.123.456.7-521.000',
  nama_bank: 'Bank BRI / Bank BSI',
  no_rekening: '0088-01-001234-53-1',
  rekening_atas_nama: "MI MAARIF NU 2 SANGGREMAN",

  status_tanah: 'Milik Sendiri (Wakaf)',
  luas_tanah: '1200',
  luas_bangunan: '850',
  jumlah_ruang_kelas: '6',
  jumlah_lab: '1',
  jumlah_perpustakaan: '1',
  jumlah_sanitasi: '4',

  visi: 'Menjadi Madrasah Unggulan Berbasis Iman, Ilmu, dan Akhlakul Karimah Berwawasan Global',
  misi: "1. Menyelenggarakan pendidikan Islam berkualitas unggul.\n2. Membentuk karakter siswa yang religius dan santun.\n3. Mengembangkan potensi bakat akademik dan non-akademik siswa.",
  motto: 'Iman, Ilmu, dan Amal',
  program_unggulan: 'Tahfidz Juz 30, Bahasa Arab & Inggris, Pramuka, AI Science & Robotik',
  kurikulum: 'KMA 450 (Kurikulum Merdeka)',

  maps_latitude: '-7.517606',
  maps_longitude: '109.132984',
  maps_zoom: '16',
  maps_embed_url: '',
};

const IdentitasMadrasah = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');

  const { refreshSettings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId, updateMadrasah, getScopedKey } = useMadrasah();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'kelembagaan');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  // Tamatan State
  const [tamatanList, setTamatanList] = useState<TamatanItem[]>(defaultTamatanList);
  const [tamatanModalOpen, setTamatanModalOpen] = useState(false);
  const [editingTamatan, setEditingTamatan] = useState<TamatanItem | null>(null);
  const [tamatanForm, setTamatanForm] = useState<Omit<TamatanItem, 'id'>>({
    tahun_pelajaran: '2024/2025',
    lulus_l: 25,
    lulus_p: 27,
    lulus_total: 52,
    melanjutkan_mts: 38,
    melanjutkan_smp: 14,
    tidak_melanjutkan: 0,
    keterangan: 'Lulus 100%',
  });

  // Prestasi State
  const [prestasiList, setPrestasiList] = useState<PrestasiItem[]>(defaultPrestasiList);
  const [prestasiModalOpen, setPrestasiModalOpen] = useState(false);
  const [editingPrestasi, setEditingPrestasi] = useState<PrestasiItem | null>(null);
  const [prestasiForm, setPrestasiForm] = useState<Omit<PrestasiItem, 'id'>>({
    nama_siswa: '',
    tanggal_kegiatan: new Date().toISOString().split('T')[0],
    jenis_lomba: 'KSM (Kompetisi Sains Madrasah)',
    tingkat: 'Kabupaten',
    juara_ke: 'Juara 1',
    penyelenggara: '',
    keterangan: '',
  });
  const [searchPrestasi, setSearchPrestasi] = useState('');

  const [identitas, setIdentitas] = useState<IdentitasMadrasahEmis>({
    ...defaultEmisIdentitas,
    id: activeMadrasahId,
    nama_madrasah: activeMadrasah.nama_madrasah || defaultEmisIdentitas.nama_madrasah,
    nsm: activeMadrasah.nsm || defaultEmisIdentitas.nsm,
    npsn: activeMadrasah.npsn || defaultEmisIdentitas.npsn,
    nama_pimpinan: activeMadrasah.nama_pimpinan || defaultEmisIdentitas.nama_pimpinan,
    nip_pimpinan: activeMadrasah.nip_pimpinan || defaultEmisIdentitas.nip_pimpinan,
    alamat: activeMadrasah.alamat || defaultEmisIdentitas.alamat,
    telepon: activeMadrasah.telepon || defaultEmisIdentitas.telepon,
    email: activeMadrasah.email || defaultEmisIdentitas.email,
    logo_url: activeMadrasah.logo_url || '',
  });

  useEffect(() => {
    fetchIdentitas();
  }, [activeMadrasahId]);

  const fetchIdentitas = async () => {
    setLoading(true);
    try {
      const storageKey = getScopedKey('identitas_madrasah');
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', storageKey)
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setIdentitas(prev => ({ ...defaultEmisIdentitas, ...prev, ...data.value }));
      } else {
        setIdentitas(prev => ({
          ...defaultEmisIdentitas,
          ...prev,
          nama_madrasah: activeMadrasah.nama_madrasah || prev.nama_madrasah,
          nsm: activeMadrasah.nsm || prev.nsm,
          npsn: activeMadrasah.npsn || prev.npsn,
          nama_pimpinan: activeMadrasah.nama_pimpinan || prev.nama_pimpinan,
          nip_pimpinan: activeMadrasah.nip_pimpinan || prev.nip_pimpinan,
          alamat: activeMadrasah.alamat || prev.alamat,
          telepon: activeMadrasah.telepon || prev.telepon,
          email: activeMadrasah.email || prev.email,
          status: activeMadrasah.status || prev.status,
          jenjang_pendidikan: activeMadrasah.jenjang_pendidikan || prev.jenjang_pendidikan,
          logo_url: activeMadrasah.logo_url || prev.logo_url,
        }));
      }

      // Fetch Tamatan List
      const tamatanKey = getScopedKey('tamatan_madrasah');
      const { data: tamatanRes } = await supabase.from('site_settings').select('value').eq('id', tamatanKey).maybeSingle();
      if (tamatanRes?.value && Array.isArray(tamatanRes.value) && tamatanRes.value.length > 0) {
        setTamatanList(tamatanRes.value);
      } else {
        setTamatanList(defaultTamatanList);
      }

      // Fetch Prestasi List
      const prestasiKey = getScopedKey('prestasi_madrasah');
      const { data: prestasiRes } = await supabase.from('site_settings').select('value').eq('id', prestasiKey).maybeSingle();
      if (prestasiRes?.value && Array.isArray(prestasiRes.value) && prestasiRes.value.length > 0) {
        setPrestasiList(prestasiRes.value);
      } else {
        setPrestasiList(defaultPrestasiList);
      }
    } catch (error) {
      console.error('Error fetching identitas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tamatan Handlers
  const handleSaveTamatanList = async (newList: TamatanItem[]) => {
    setTamatanList(newList);
    try {
      const tamatanKey = getScopedKey('tamatan_madrasah');
      await supabase.from('site_settings').upsert({ id: tamatanKey, value: newList, updated_at: new Date().toISOString() });
      showSuccess('Data tamatan siswa berhasil diperbarui!');
    } catch (e: any) {
      showError('Gagal menyimpan data tamatan: ' + e.message);
    }
  };

  const handleOpenAddTamatan = () => {
    setEditingTamatan(null);
    setTamatanForm({
      tahun_pelajaran: '2024/2025',
      lulus_l: 0,
      lulus_p: 0,
      lulus_total: 0,
      melanjutkan_mts: 0,
      melanjutkan_smp: 0,
      tidak_melanjutkan: 0,
      keterangan: 'Lulus 100%',
    });
    setTamatanModalOpen(true);
  };

  const handleOpenEditTamatan = (item: TamatanItem) => {
    setEditingTamatan(item);
    setTamatanForm({
      tahun_pelajaran: item.tahun_pelajaran,
      lulus_l: item.lulus_l,
      lulus_p: item.lulus_p,
      lulus_total: item.lulus_total,
      melanjutkan_mts: item.melanjutkan_mts,
      melanjutkan_smp: item.melanjutkan_smp,
      tidak_melanjutkan: item.tidak_melanjutkan,
      keterangan: item.keterangan || '',
    });
    setTamatanModalOpen(true);
  };

  const handleSaveTamatanItem = (e: React.FormEvent) => {
    e.preventDefault();
    const totalLulus = Number(tamatanForm.lulus_l) + Number(tamatanForm.lulus_p);
    const itemData: TamatanItem = {
      id: editingTamatan ? editingTamatan.id : Date.now().toString(),
      ...tamatanForm,
      lulus_l: Number(tamatanForm.lulus_l),
      lulus_p: Number(tamatanForm.lulus_p),
      lulus_total: totalLulus,
      melanjutkan_mts: Number(tamatanForm.melanjutkan_mts),
      melanjutkan_smp: Number(tamatanForm.melanjutkan_smp),
      tidak_melanjutkan: Number(tamatanForm.tidak_melanjutkan),
    };

    let updated: TamatanItem[] = [];
    if (editingTamatan) {
      updated = tamatanList.map(t => t.id === editingTamatan.id ? itemData : t);
    } else {
      updated = [...tamatanList, itemData];
    }
    handleSaveTamatanList(updated);
    setTamatanModalOpen(false);
  };

  const handleDeleteTamatan = (id: string) => {
    const updated = tamatanList.filter(t => t.id !== id);
    handleSaveTamatanList(updated);
  };

  // Prestasi Handlers
  const handleSavePrestasiList = async (newList: PrestasiItem[]) => {
    setPrestasiList(newList);
    try {
      const prestasiKey = getScopedKey('prestasi_madrasah');
      await supabase.from('site_settings').upsert({ id: prestasiKey, value: newList, updated_at: new Date().toISOString() });
      showSuccess('Data prestasi madrasah berhasil diperbarui!');
    } catch (e: any) {
      showError('Gagal menyimpan data prestasi: ' + e.message);
    }
  };

  const handleOpenAddPrestasi = () => {
    setEditingPrestasi(null);
    setPrestasiForm({
      nama_siswa: '',
      tanggal_kegiatan: new Date().toISOString().split('T')[0],
      jenis_lomba: 'KSM (Kompetisi Sains Madrasah)',
      tingkat: 'Kabupaten',
      juara_ke: 'Juara 1',
      penyelenggara: '',
      keterangan: '',
    });
    setPrestasiModalOpen(true);
  };

  const handleOpenEditPrestasi = (item: PrestasiItem) => {
    setEditingPrestasi(item);
    setPrestasiForm({
      nama_siswa: item.nama_siswa,
      tanggal_kegiatan: item.tanggal_kegiatan,
      jenis_lomba: item.jenis_lomba,
      tingkat: item.tingkat,
      juara_ke: item.juara_ke,
      penyelenggara: item.penyelenggara || '',
      keterangan: item.keterangan || '',
    });
    setPrestasiModalOpen(true);
  };

  const handleSavePrestasiItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestasiForm.nama_siswa.trim()) {
      showError('Nama siswa / tim wajib diisi');
      return;
    }
    const itemData: PrestasiItem = {
      id: editingPrestasi ? editingPrestasi.id : Date.now().toString(),
      ...prestasiForm,
    };

    let updated: PrestasiItem[] = [];
    if (editingPrestasi) {
      updated = prestasiList.map(p => p.id === editingPrestasi.id ? itemData : p);
    } else {
      updated = [itemData, ...prestasiList];
    }
    handleSavePrestasiList(updated);
    setPrestasiModalOpen(false);
  };

  const handleDeletePrestasi = (id: string) => {
    const updated = prestasiList.filter(p => p.id !== id);
    handleSavePrestasiList(updated);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('File harus berupa gambar (JPG/PNG)');
      return;
    }

    setUploading(true);
    try {
      const newLogoUrl = await uploadImageToStorage(file, 'madrasah');
      const storageKey = getScopedKey('identitas_madrasah');
      const updatedIdentitas = { ...identitas, logo_url: newLogoUrl };
      setIdentitas(updatedIdentitas);

      await supabase
        .from('site_settings')
        .upsert({ id: storageKey, value: updatedIdentitas, updated_at: new Date().toISOString() });

      await updateMadrasah(activeMadrasahId, { logo_url: newLogoUrl });
      await refreshSettings();
      showSuccess('Logo berhasil diperbarui & disimpan!');
    } catch (error: any) {
      console.error('Upload error:', error);
      showError(error.message || 'Gagal mengunggah logo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const storageKey = getScopedKey('identitas_madrasah');
      const payload = {
        ...identitas,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: storageKey, value: payload, updated_at: new Date().toISOString() });

      if (error) throw error;

      // Sync site settings general
      const { data: generalData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'general')
        .maybeSingle();

      const existingGeneral = generalData?.value || {};
      await supabase
        .from('site_settings')
        .upsert({
          id: 'general',
          value: {
            ...existingGeneral,
            school_name: identitas.nama_madrasah,
            address: identitas.alamat || existingGeneral.address,
            phone: identitas.telepon || existingGeneral.phone,
            email: identitas.email || existingGeneral.email,
            maps_latitude: identitas.maps_latitude || '-7.517606',
            maps_longitude: identitas.maps_longitude || '109.132984',
            maps_zoom: identitas.maps_zoom || '16',
            maps_embed_url: identitas.maps_embed_url || '',
          },
          updated_at: new Date().toISOString()
        });

      await updateMadrasah(activeMadrasahId, {
        nama_madrasah: identitas.nama_madrasah,
        nsm: identitas.nsm,
        npsn: identitas.npsn,
        nama_pimpinan: identitas.nama_pimpinan,
        nip_pimpinan: identitas.nip_pimpinan,
        alamat: identitas.alamat,
        telepon: identitas.telepon,
        email: identitas.email,
        jenjang_pendidikan: identitas.jenjang_pendidikan,
        status: identitas.status,
        logo_url: identitas.logo_url,
      });

      await refreshSettings();
      showSuccess('Data Profil Madrasah Standar EMIS Kemenag Berhasil Disimpan!');
    } catch (error: any) {
      showError(error.message || 'Gagal menyimpan profil madrasah');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintEmisProfile = () => {
    window.print();
  };

  return (
    <AdminLayout title="Profil Madrasah (EMIS Kemenag)">
      {/* Printable Area for Formal EMIS Report */}
      <div className="hidden print:block font-serif text-black p-6 space-y-6">
        <div className="text-center border-b-2 border-black pb-4 mb-4 flex items-center justify-between">
          {identitas.logo_url && <img src={identitas.logo_url} alt="Logo" className="w-20 h-20 object-contain" />}
          <div className="flex-1 text-center px-4">
            <h3 className="text-sm font-bold uppercase tracking-wider">KEMENTERIAN AGAMA REPUBLIK INDONESIA</h3>
            <h1 className="text-xl font-bold uppercase tracking-wider">{identitas.nama_yayasan}</h1>
            <h2 className="text-2xl font-black uppercase text-emerald-900">{identitas.nama_madrasah}</h2>
            <p className="text-xs italic mt-1">
              NSM: {identitas.nsm} | NPSN: {identitas.npsn} | Akreditasi: {identitas.akreditasi}
            </p>
            <p className="text-xs mt-0.5">
              {identitas.alamat}, {identitas.desa}, Kec. {identitas.kecamatan}, Kab. {identitas.kabupaten}, {identitas.provinsi} {identitas.kode_pos}
            </p>
          </div>
          <div className="w-20"></div>
        </div>

        <div className="text-center my-4">
          <h2 className="text-lg font-bold underline uppercase">LEMBAR PROFIL RESMI MADRASAH (STANDAR EMIS KEMENAG)</h2>
          <p className="text-xs text-gray-600">Dicetak Pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold border-b border-black pb-1 mb-2 text-sm bg-gray-100 p-1">I. KELEMBAGAN & IDENTITAS UTAMA</h4>
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr><td className="border border-black p-1.5 w-1/3 font-semibold">Nama Madrasah</td><td className="border border-black p-1.5">{identitas.nama_madrasah}</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">NSM / NPSN</td><td className="border border-black p-1.5">{identitas.nsm} / {identitas.npsn}</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">Jenjang & Status</td><td className="border border-black p-1.5">{identitas.jenjang_pendidikan} ({identitas.status})</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">Yayasan / Penyelenggara</td><td className="border border-black p-1.5">{identitas.nama_yayasan}</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">Kepala Madrasah</td><td className="border border-black p-1.5">{identitas.nama_pimpinan} (NIP: {identitas.nip_pimpinan || '-'})</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">Tahun Berdiri & Akreditasi</td><td className="border border-black p-1.5">{identitas.tahun_berdiri} | Peringkat {identitas.akreditasi} (SK: {identitas.sk_akreditasi})</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold border-b border-black pb-1 mb-2 text-sm bg-gray-100 p-1">II. PERIZINAN & LEGALITAS DOKUMEN</h4>
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr><td className="border border-black p-1.5 w-1/3 font-semibold">SK Pendirian</td><td className="border border-black p-1.5">{identitas.sk_pendirian} (Tgl: {identitas.tgl_sk_pendirian})</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">SK Izin Operasional</td><td className="border border-black p-1.5">{identitas.sk_ijin_operasional} (Tgl: {identitas.tgl_sk_ijin_operasional})</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">NPWP Lembaga</td><td className="border border-black p-1.5">{identitas.npwp}</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">Rekening Bank Resmi</td><td className="border border-black p-1.5">{identitas.nama_bank} - {identitas.no_rekening} a.n {identitas.rekening_atas_nama}</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold border-b border-black pb-1 mb-2 text-sm bg-gray-100 p-1">III. ALAMAT, KONTAK & SARPRAS</h4>
            <table className="w-full border-collapse border border-black">
              <tbody>
                <tr><td className="border border-black p-1.5 w-1/3 font-semibold">Alamat Lengkap</td><td className="border border-black p-1.5">{identitas.alamat}, {identitas.dusun}, {identitas.desa}, Kec. {identitas.kecamatan}, Kab. {identitas.kabupaten}, Prov. {identitas.provinsi} ({identitas.kode_pos})</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">Kontak & Website</td><td className="border border-black p-1.5">Telp: {identitas.telepon} | Email: {identitas.email} | Web: {identitas.website}</td></tr>
                <tr><td className="border border-black p-1.5 font-semibold">Sarpras & Lahan</td><td className="border border-black p-1.5">Tanah: {identitas.luas_tanah} m² ({identitas.status_tanah}) | Bangunan: {identitas.luas_bangunan} m² | R. Kelas: {identitas.jumlah_ruang_kelas}</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold border-b border-black pb-1 mb-2 text-sm bg-gray-100 p-1">IV. DATA TAMATAN SISWA MADRASAH</h4>
            <table className="w-full border-collapse border border-black text-center text-[11px]">
              <thead>
                <tr className="bg-gray-200 font-bold">
                  <th className="border border-black p-1">No</th>
                  <th className="border border-black p-1">Tahun Pelajaran</th>
                  <th className="border border-black p-1">Lulus (L)</th>
                  <th className="border border-black p-1">Lulus (P)</th>
                  <th className="border border-black p-1">Jumlah Lulus</th>
                  <th className="border border-black p-1">Melanjutkan MTs</th>
                  <th className="border border-black p-1">Melanjutkan SMP</th>
                  <th className="border border-black p-1">Tdk Lanjut</th>
                  <th className="border border-black p-1">Ket</th>
                </tr>
              </thead>
              <tbody>
                {tamatanList.map((t, idx) => (
                  <tr key={t.id}>
                    <td className="border border-black p-1">{idx + 1}</td>
                    <td className="border border-black p-1 font-bold">{t.tahun_pelajaran}</td>
                    <td className="border border-black p-1">{t.lulus_l}</td>
                    <td className="border border-black p-1">{t.lulus_p}</td>
                    <td className="border border-black p-1 font-bold">{t.lulus_total}</td>
                    <td className="border border-black p-1">{t.melanjutkan_mts}</td>
                    <td className="border border-black p-1">{t.melanjutkan_smp}</td>
                    <td className="border border-black p-1">{t.tidak_melanjutkan}</td>
                    <td className="border border-black p-1 text-left">{t.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold border-b border-black pb-1 mb-2 text-sm bg-gray-100 p-1">V. DATA PRESTASI & KEJUARAAN SISWA MADRASAH</h4>
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead>
                <tr className="bg-gray-200 font-bold text-center">
                  <th className="border border-black p-1">No</th>
                  <th className="border border-black p-1">Nama Siswa / Tim</th>
                  <th className="border border-black p-1">Tanggal</th>
                  <th className="border border-black p-1">Jenis Lomba</th>
                  <th className="border border-black p-1">Tingkat</th>
                  <th className="border border-black p-1">Juara Ke</th>
                  <th className="border border-black p-1">Penyelenggara / Ket</th>
                </tr>
              </thead>
              <tbody>
                {prestasiList.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                    <td className="border border-black p-1 font-bold">{p.nama_siswa}</td>
                    <td className="border border-black p-1 text-center">{p.tanggal_kegiatan}</td>
                    <td className="border border-black p-1">{p.jenis_lomba}</td>
                    <td className="border border-black p-1 text-center">{p.tingkat}</td>
                    <td className="border border-black p-1 text-center font-bold">{p.juara_ke}</td>
                    <td className="border border-black p-1">{p.penyelenggara} {p.keterangan ? `(${p.keterangan})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 flex justify-between text-xs px-8">
          <div></div>
          <div className="text-center">
            <p>{identitas.kabupaten}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Kepala Madrasah</p>
            <div className="h-20"></div>
            <p className="font-bold underline">{identitas.nama_pimpinan}</p>
            <p>NIP. {identitas.nip_pimpinan || '-'}</p>
          </div>
        </div>
      </div>

      {/* Main Admin UI Screen */}
      <div className="print:hidden space-y-6">
        {/* Header Header Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4">
            {identitas.logo_url ? (
              <img src={identitas.logo_url} alt="Logo" className="w-16 h-16 object-contain bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-md" />
            ) : (
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                <School className="w-8 h-8 text-emerald-300" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full">
                  Modul Profil EMIS Kemenag
                </Badge>
                <Badge variant="outline" className="text-emerald-200 border-emerald-400/30 text-[10px]">
                  Akreditasi {identitas.akreditasi || 'A'}
                </Badge>
              </div>
              <h1 className="text-xl md:text-2xl font-black mt-1 text-white">{identitas.nama_madrasah}</h1>
              <p className="text-xs text-emerald-100/80 flex items-center gap-3 mt-1 font-mono">
                <span>NSM: <strong className="text-white">{identitas.nsm}</strong></span>
                <span>•</span>
                <span>NPSN: <strong className="text-white">{identitas.npsn}</strong></span>
                <span>•</span>
                <span>Jenjang: <strong className="text-white">{identitas.jenjang_pendidikan} ({identitas.status})</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <Button
              onClick={handlePrintEmisProfile}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl gap-2 text-xs font-bold"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              Cetak Profil EMIS
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl gap-2 shadow-lg shadow-emerald-500/20 px-5 text-xs"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Simpan Profil'}
            </Button>
          </div>
        </div>

        {/* Tabbed Profile Sections */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-slate-200/80 dark:bg-slate-800 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 h-auto">
            <TabsTrigger value="kelembagaan" className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 shadow-sm">
              <Building className="w-4 h-4 text-emerald-600" /> Kelembagaan
            </TabsTrigger>
            <TabsTrigger value="kontak" className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 shadow-sm">
              <MapPin className="w-4 h-4 text-emerald-600" /> Alamat & Kontak
            </TabsTrigger>
            <TabsTrigger value="perizinan" className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> SK & Legalitas
            </TabsTrigger>
            <TabsTrigger value="sarpras" className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 shadow-sm">
              <Landmark className="w-4 h-4 text-emerald-600" /> Lahan & Sarpras
            </TabsTrigger>
            <TabsTrigger value="visi" className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Visi & Kurikulum
            </TabsTrigger>
            <TabsTrigger value="peta" className="rounded-xl text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800 shadow-sm">
              <Globe className="w-4 h-4 text-emerald-600" /> Peta & GPS
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: KELEMBAGAAN */}
          <TabsContent value="kelembagaan">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <Building className="w-5 h-5 text-emerald-600" /> Identitas Utama & Kepala Madrasah
                </CardTitle>
                <CardDescription className="text-xs">
                  Data dasar kelembagaan madrasah sesuai standar pangkalan data EMIS Kemenag.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Logo Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-200 bg-white group w-28 h-28 shrink-0 flex items-center justify-center shadow-md">
                    {identitas.logo_url ? (
                      <img src={identitas.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-emerald-400" />
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <h4 className="text-sm font-bold text-slate-800">Logo Resmi Madrasah</h4>
                    <p className="text-xs text-slate-500">
                      Gunakan file gambar berformat PNG/JPG dengan latar transparan atau putih (maks. 2MB).
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="cursor-pointer">
                        <Button size="sm" type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5 font-bold" asChild disabled={uploading}>
                          <span><Upload className="w-3.5 h-3.5" /> {uploading ? 'Mengunggah...' : 'Upload Logo Baru'}</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                      </label>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMediaModalOpen(true)}
                        className="rounded-xl text-xs font-bold border-emerald-200 text-emerald-800 hover:bg-emerald-100 gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Galeri Foto
                      </Button>

                      {identitas.logo_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIdentitas({ ...identitas, logo_url: '' })}
                          className="rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Hapus Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Yayasan / Penyelenggara</label>
                    <Input
                      placeholder="Contoh: YAYASAN PENDIDIKAN ISLAM NU"
                      value={identitas.nama_yayasan}
                      onChange={(e) => setIdentitas({ ...identitas, nama_yayasan: e.target.value })}
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Resmi Madrasah <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Contoh: MI MA'ARIF NU 2 SANGGREMAN"
                      value={identitas.nama_madrasah}
                      onChange={(e) => setIdentitas({ ...identitas, nama_madrasah: e.target.value })}
                      className="rounded-xl text-xs font-bold text-emerald-950 bg-emerald-50/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">NSM (Nomor Statistik Madrasah)</label>
                    <Input
                      value={identitas.nsm}
                      onChange={(e) => setIdentitas({ ...identitas, nsm: e.target.value })}
                      placeholder="12 angka NSM"
                      className="rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">NPSN (Nomor Pokok Sekolah Nasional)</label>
                    <Input
                      value={identitas.npsn}
                      onChange={(e) => setIdentitas({ ...identitas, npsn: e.target.value })}
                      placeholder="8 angka NPSN"
                      className="rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenjang Pendidikan</label>
                    <Select
                      value={identitas.jenjang_pendidikan}
                      onValueChange={(val) => setIdentitas({ ...identitas, jenjang_pendidikan: val })}
                    >
                      <SelectTrigger className="rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Pilih Jenjang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RA">RA (Raudhatul Athfal)</SelectItem>
                        <SelectItem value="MI">MI (Madrasah Ibtidaiyah)</SelectItem>
                        <SelectItem value="MTs">MTs (Madrasah Tsanawiyah)</SelectItem>
                        <SelectItem value="MA">MA (Madrasah Aliyah)</SelectItem>
                        <SelectItem value="MAK">MAK (Madrasah Aliyah Kejuruan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Madrasah</label>
                    <Select
                      value={identitas.status}
                      onValueChange={(val) => setIdentitas({ ...identitas, status: val })}
                    >
                      <SelectTrigger className="rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Pilih Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Swasta">Swasta</SelectItem>
                        <SelectItem value="Negeri">Negeri</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori / Kelompok Wilayah</label>
                    <Select
                      value={identitas.kategori_wilayah || 'Perdesaan'}
                      onValueChange={(val) => setIdentitas({ ...identitas, kategori_wilayah: val })}
                    >
                      <SelectTrigger className="rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Kategori Wilayah" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Perdesaan">Perdesaan</SelectItem>
                        <SelectItem value="Perkotaan">Perkotaan</SelectItem>
                        <SelectItem value="Terpencil">Terpencil / 3T</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Tahun Berdiri Madrasah</label>
                    <Input
                      value={identitas.tahun_berdiri}
                      onChange={(e) => setIdentitas({ ...identitas, tahun_berdiri: e.target.value })}
                      placeholder="Contoh: 2010"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Data Kepala Madrasah (Penanggung Jawab EMIS)
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                      <Input
                        value={identitas.nama_pimpinan}
                        onChange={(e) => setIdentitas({ ...identitas, nama_pimpinan: e.target.value })}
                        placeholder="Nama Kepala Madrasah"
                        className="rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">NIP / NPK</label>
                      <Input
                        value={identitas.nip_pimpinan}
                        onChange={(e) => setIdentitas({ ...identitas, nip_pimpinan: e.target.value })}
                        placeholder="18 angka NIP / NPK"
                        className="rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">No. HP / WhatsApp Kepala</label>
                      <Input
                        value={identitas.telepon_pimpinan || ''}
                        onChange={(e) => setIdentitas({ ...identitas, telepon_pimpinan: e.target.value })}
                        placeholder="0812xxxxxxxx"
                        className="rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ALAMAT & KONTAK */}
          <TabsContent value="kontak">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <MapPin className="w-5 h-5 text-emerald-600" /> Alamat Domisili, Kontak & Fasilitas Komunikasi
                </CardTitle>
                <CardDescription className="text-xs">
                  Detail lokasi geografis madrasah, saluran komunikasi resmi, serta pasokan energi & internet.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Alamat Jalan / Gang</label>
                  <Textarea
                    value={identitas.alamat}
                    onChange={(e) => setIdentitas({ ...identitas, alamat: e.target.value })}
                    placeholder="Jl. Pendidikan No. 12"
                    className="rounded-xl text-xs font-medium"
                    rows={2}
                  />
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">RT / RW</label>
                    <Input
                      value={identitas.rt_rw || ''}
                      onChange={(e) => setIdentitas({ ...identitas, rt_rw: e.target.value })}
                      placeholder="RT 02 / RW 03"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dusun / Lingkungan</label>
                    <Input
                      value={identitas.dusun || ''}
                      onChange={(e) => setIdentitas({ ...identitas, dusun: e.target.value })}
                      placeholder="Sanggreman"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Desa / Kelurahan</label>
                    <Input
                      value={identitas.desa}
                      onChange={(e) => setIdentitas({ ...identitas, desa: e.target.value })}
                      placeholder="Sanggreman"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kecamatan</label>
                    <Input
                      value={identitas.kecamatan}
                      onChange={(e) => setIdentitas({ ...identitas, kecamatan: e.target.value })}
                      placeholder="Rawalo"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kabupaten / Kota</label>
                    <Input
                      value={identitas.kabupaten}
                      onChange={(e) => setIdentitas({ ...identitas, kabupaten: e.target.value })}
                      placeholder="Banyumas"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Provinsi</label>
                    <Input
                      value={identitas.provinsi}
                      onChange={(e) => setIdentitas({ ...identitas, provinsi: e.target.value })}
                      placeholder="Jawa Tengah"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kode Pos</label>
                    <Input
                      value={identitas.kode_pos}
                      onChange={(e) => setIdentitas({ ...identitas, kode_pos: e.target.value })}
                      placeholder="53173"
                      className="rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> Nomor Telepon Kantor
                    </label>
                    <Input
                      value={identitas.telepon}
                      onChange={(e) => setIdentitas({ ...identitas, telepon: e.target.value })}
                      placeholder="(0281) 654321"
                      className="rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email Resmi Madrasah
                    </label>
                    <Input
                      value={identitas.email}
                      onChange={(e) => setIdentitas({ ...identitas, email: e.target.value })}
                      placeholder="madrasah@kemenag.go.id"
                      className="rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" /> Website Resmi
                    </label>
                    <Input
                      value={identitas.website}
                      onChange={(e) => setIdentitas({ ...identitas, website: e.target.value })}
                      placeholder="https://mimaarifnu2sanggreman.sch.id"
                      className="rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Akses Internet Utama</label>
                    <Input
                      value={identitas.akses_internet || ''}
                      onChange={(e) => setIdentitas({ ...identitas, akses_internet: e.target.value })}
                      placeholder="Indihome Fiber / Starlink"
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sumber Listrik</label>
                    <Input
                      value={identitas.sumber_listrik || ''}
                      onChange={(e) => setIdentitas({ ...identitas, sumber_listrik: e.target.value })}
                      placeholder="PLN / Solar Cell"
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Daya Listrik (VA)</label>
                    <Input
                      value={identitas.daya_listrik || ''}
                      onChange={(e) => setIdentitas({ ...identitas, daya_listrik: e.target.value })}
                      placeholder="2200 VA"
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: DOKUMEN & LEGALITAS */}
          <TabsContent value="perizinan">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Dokumen Perizinan, Akreditasi & Rekening
                </CardTitle>
                <CardDescription className="text-xs">
                  Legalitas operasional, akreditasi BAN-SM/S/M, NPWP, serta data rekening bank penampung dana BOS/BOP.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SK Pendirian</label>
                    <Input
                      value={identitas.sk_pendirian || ''}
                      onChange={(e) => setIdentitas({ ...identitas, sk_pendirian: e.target.value })}
                      placeholder="Nomor SK Pendirian dari Kemenag / Yayasan"
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal SK Pendirian</label>
                    <Input
                      type="date"
                      value={identitas.tgl_sk_pendirian || ''}
                      onChange={(e) => setIdentitas({ ...identitas, tgl_sk_pendirian: e.target.value })}
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SK Izin Operasional</label>
                    <Input
                      value={identitas.sk_ijin_operasional || ''}
                      onChange={(e) => setIdentitas({ ...identitas, sk_ijin_operasional: e.target.value })}
                      placeholder="Nomor SK Izin Operasional Kemenag"
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal SK Izin Operasional</label>
                    <Input
                      type="date"
                      value={identitas.tgl_sk_ijin_operasional || ''}
                      onChange={(e) => setIdentitas({ ...identitas, tgl_sk_ijin_operasional: e.target.value })}
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Peringkat Akreditasi</label>
                    <Select
                      value={identitas.akreditasi}
                      onValueChange={(val) => setIdentitas({ ...identitas, akreditasi: val })}
                    >
                      <SelectTrigger className="rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Peringkat Akreditasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A (Unggul)</SelectItem>
                        <SelectItem value="B">B (Baik)</SelectItem>
                        <SelectItem value="C">C (Cukup)</SelectItem>
                        <SelectItem value="Belum">Belum Terakreditasi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SK Akreditasi BAN-SM</label>
                    <Input
                      value={identitas.sk_akreditasi || ''}
                      onChange={(e) => setIdentitas({ ...identitas, sk_akreditasi: e.target.value })}
                      placeholder="SK BAN-SM"
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal SK Akreditasi</label>
                    <Input
                      type="date"
                      value={identitas.tgl_sk_akreditasi || ''}
                      onChange={(e) => setIdentitas({ ...identitas, tgl_sk_akreditasi: e.target.value })}
                      className="rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider mb-3 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Keuangan, NPWP & Rekening Bank Penampung BOS / BOP
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">NPWP Lembaga Madrasah</label>
                      <Input
                        value={identitas.npwp || ''}
                        onChange={(e) => setIdentitas({ ...identitas, npwp: e.target.value })}
                        placeholder="00.000.000.0-000.000"
                        className="rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank Penampung</label>
                      <Input
                        value={identitas.nama_bank || ''}
                        onChange={(e) => setIdentitas({ ...identitas, nama_bank: e.target.value })}
                        placeholder="BRI / Bank BSI"
                        className="rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening & Atas Nama</label>
                      <Input
                        value={identitas.no_rekening || ''}
                        onChange={(e) => setIdentitas({ ...identitas, no_rekening: e.target.value })}
                        placeholder="Nomor Rekening"
                        className="rounded-xl text-xs font-mono font-bold mb-2"
                      />
                      <Input
                        value={identitas.rekening_atas_nama || ''}
                        onChange={(e) => setIdentitas({ ...identitas, rekening_atas_nama: e.target.value })}
                        placeholder="Atas Nama (a.n MI MAARIF...)"
                        className="rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: LAHAN & SARPRAS */}
          <TabsContent value="sarpras">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <Landmark className="w-5 h-5 text-emerald-600" /> Ringkasan Lahan & Sarana Prasarana (EMIS)
                </CardTitle>
                <CardDescription className="text-xs">
                  Luas tanah, kepemilikan lahan, serta jumlah ruang fisik gedung madrasah.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kepemilikan Lahan / Tanah</label>
                    <Select
                      value={identitas.status_tanah || 'Milik Sendiri (Wakaf)'}
                      onValueChange={(val) => setIdentitas({ ...identitas, status_tanah: val })}
                    >
                      <SelectTrigger className="rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Status Tanah" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Milik Sendiri (Wakaf)">Milik Sendiri (Wakaf / Hak Milik)</SelectItem>
                        <SelectItem value="Sewa">Sewa / Kontrak</SelectItem>
                        <SelectItem value="Pinjam Pakai">Pinjam Pakai</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Luas Tanah Total (m²)</label>
                    <Input
                      type="number"
                      value={identitas.luas_tanah || ''}
                      onChange={(e) => setIdentitas({ ...identitas, luas_tanah: e.target.value })}
                      placeholder="Luas m²"
                      className="rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Luas Bangunan Total (m²)</label>
                    <Input
                      type="number"
                      value={identitas.luas_bangunan || ''}
                      onChange={(e) => setIdentitas({ ...identitas, luas_bangunan: e.target.value })}
                      placeholder="Luas m²"
                      className="rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                    <span className="text-xs font-bold text-emerald-800">Ruang Kelas (Rombel)</span>
                    <Input
                      type="number"
                      value={identitas.jumlah_ruang_kelas || ''}
                      onChange={(e) => setIdentitas({ ...identitas, jumlah_ruang_kelas: e.target.value })}
                      placeholder="6"
                      className="rounded-xl text-center text-lg font-black mt-2 bg-white text-emerald-950"
                    />
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                    <span className="text-xs font-bold text-blue-800">Ruang Laboratorium</span>
                    <Input
                      type="number"
                      value={identitas.jumlah_lab || ''}
                      onChange={(e) => setIdentitas({ ...identitas, jumlah_lab: e.target.value })}
                      placeholder="1"
                      className="rounded-xl text-center text-lg font-black mt-2 bg-white text-blue-950"
                    />
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                    <span className="text-xs font-bold text-amber-800">Perpustakaan</span>
                    <Input
                      type="number"
                      value={identitas.jumlah_perpustakaan || ''}
                      onChange={(e) => setIdentitas({ ...identitas, jumlah_perpustakaan: e.target.value })}
                      placeholder="1"
                      className="rounded-xl text-center text-lg font-black mt-2 bg-white text-amber-950"
                    />
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center">
                    <span className="text-xs font-bold text-purple-800">Sanitasi / Toilet</span>
                    <Input
                      type="number"
                      value={identitas.jumlah_sanitasi || ''}
                      onChange={(e) => setIdentitas({ ...identitas, jumlah_sanitasi: e.target.value })}
                      placeholder="4"
                      className="rounded-xl text-center text-lg font-black mt-2 bg-white text-purple-950"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: VISI & KURIKULUM */}
          <TabsContent value="visi">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <Sparkles className="w-5 h-5 text-emerald-600" /> Visi, Misi, Motto & Pedoman Kurikulum
                </CardTitle>
                <CardDescription className="text-xs">
                  Slogan kebanggaan, visi misi lembaga, serta pedoman kurikulum operasional madrasah (KMA 450).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kurikulum Operasional Utama</label>
                  <Input
                    value={identitas.kurikulum || ''}
                    onChange={(e) => setIdentitas({ ...identitas, kurikulum: e.target.value })}
                    placeholder="Contoh: KMA 450 Tahun 2024 (Kurikulum Merdeka)"
                    className="rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motto / Slogan Madrasah</label>
                  <Input
                    value={identitas.motto}
                    onChange={(e) => setIdentitas({ ...identitas, motto: e.target.value })}
                    placeholder="Contoh: Iman, Ilmu, dan Amal"
                    className="rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visi Madrasah</label>
                  <Textarea
                    value={identitas.visi}
                    onChange={(e) => setIdentitas({ ...identitas, visi: e.target.value })}
                    placeholder="Visi lengkap madrasah"
                    className="rounded-xl text-xs font-medium"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Misi Madrasah (Poin per Poin)</label>
                  <Textarea
                    value={identitas.misi}
                    onChange={(e) => setIdentitas({ ...identitas, misi: e.target.value })}
                    placeholder="1. Menyelenggarakan pendidikan Islam...&#10;2. Membentuk akhlak..."
                    className="rounded-xl text-xs font-medium"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Program Unggulan Madrasah</label>
                  <Textarea
                    value={identitas.program_unggulan || ''}
                    onChange={(e) => setIdentitas({ ...identitas, program_unggulan: e.target.value })}
                    placeholder="Tahfidz Juz 30, Robotik AI, Bahasa Arab..."
                    className="rounded-xl text-xs font-medium"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: PETA & GPS */}
          <TabsContent value="peta">
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                    <Globe className="w-5 h-5 text-emerald-600" /> Koordinat Geografis & Google Maps Embed
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pengaturan lokasi peta presisi untuk tampilan beranda & lokasi GPS.
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIdentitas({
                      ...identitas,
                      maps_latitude: '-7.517606',
                      maps_longitude: '109.132984',
                      maps_zoom: '16',
                      maps_embed_url: ''
                    });
                    showSuccess('Koordinat diatur ke posisi lokasi default!');
                  }}
                  className="rounded-xl text-xs font-bold border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Koordinat
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Latitude (Lintang GPS)</label>
                    <Input
                      value={identitas.maps_latitude || '-7.517606'}
                      onChange={(e) => setIdentitas({ ...identitas, maps_latitude: e.target.value })}
                      placeholder="-7.517606"
                      className="rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Longitude (Bujur GPS)</label>
                    <Input
                      value={identitas.maps_longitude || '109.132984'}
                      onChange={(e) => setIdentitas({ ...identitas, maps_longitude: e.target.value })}
                      placeholder="109.132984"
                      className="rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Zoom Level (1 - 20)</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={identitas.maps_zoom || '16'}
                      onChange={(e) => setIdentitas({ ...identitas, maps_zoom: e.target.value })}
                      className="rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Embed Custom Google Maps (Opsional)</label>
                  <Input
                    value={identitas.maps_embed_url || ''}
                    onChange={(e) => setIdentitas({ ...identitas, maps_embed_url: e.target.value })}
                    placeholder="Kosongkan untuk otomatis dari koordinat di atas"
                    className="rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-700">Pratinjau Peta Google Maps</label>
                  <div className="h-64 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                    <iframe
                      title="Pratinjau Peta Profil Madrasah"
                      src={getGoogleMapEmbedUrl(identitas.maps_latitude, identitas.maps_longitude, identitas.maps_zoom, identitas.maps_embed_url, identitas.nama_madrasah || "Madrasah")}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Media Library Dialog */}
        <MediaLibraryModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelectImage={(url) => {
            setIdentitas(prev => ({ ...prev, logo_url: url }));
            showSuccess('Logo diperbarui dari Galeri Foto!');
          }}
          title="Pilih Logo dari Galeri Foto"
        />

        {/* Modal Tamatan Dialog */}
        <Dialog open={tamatanModalOpen} onOpenChange={setTamatanModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-800">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                {editingTamatan ? 'Edit Data Tamatan Siswa' : 'Tambah Data Tamatan Siswa'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Isi rincian jumlah kelulusan siswa dan statistik sekolah tujuan kelanjutan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveTamatanItem} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
                <Input
                  required
                  placeholder="Contoh: 2024/2025"
                  value={tamatanForm.tahun_pelajaran}
                  onChange={(e) => setTamatanForm({ ...tamatanForm, tahun_pelajaran: e.target.value })}
                  className="rounded-xl font-mono text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">Lulus Laki-laki (L)</label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={tamatanForm.lulus_l}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, lulus_l: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">Lulus Perempuan (P)</label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={tamatanForm.lulus_p}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, lulus_p: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div className="col-span-2 text-xs font-extrabold text-emerald-900 text-right pt-1">
                  Total Lulus: {Number(tamatanForm.lulus_l) + Number(tamatanForm.lulus_p)} Siswa
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">Ke MTs</label>
                  <Input
                    type="number"
                    min="0"
                    value={tamatanForm.melanjutkan_mts}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, melanjutkan_mts: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">Ke SMP</label>
                  <Input
                    type="number"
                    min="0"
                    value={tamatanForm.melanjutkan_smp}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, melanjutkan_smp: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 mb-1">Tdk Lanjut</label>
                  <Input
                    type="number"
                    min="0"
                    value={tamatanForm.tidak_melanjutkan}
                    onChange={(e) => setTamatanForm({ ...tamatanForm, tidak_melanjutkan: Number(e.target.value) })}
                    className="rounded-xl text-xs font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan (Opsional)</label>
                <Input
                  placeholder="Lulus 100%, dll"
                  value={tamatanForm.keterangan || ''}
                  onChange={(e) => setTamatanForm({ ...tamatanForm, keterangan: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTamatanModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Save className="w-4 h-4" /> Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Prestasi Dialog */}
        <Dialog open={prestasiModalOpen} onOpenChange={setPrestasiModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-800">
                <Trophy className="w-5 h-5 text-amber-600" />
                {editingPrestasi ? 'Edit Data Prestasi Madrasah' : 'Tambah Data Prestasi Madrasah'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Catat rincian juara kejuaraan lomba akademik maupun non-akademik siswa.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSavePrestasiItem} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Siswa / Tim Regu</label>
                <Input
                  required
                  placeholder="Contoh: Ahmad Fauzi / Tim Regu Pramuka"
                  value={prestasiForm.nama_siswa}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, nama_siswa: e.target.value })}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Kegiatan</label>
                  <Input
                    type="date"
                    required
                    value={prestasiForm.tanggal_kegiatan}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, tanggal_kegiatan: e.target.value })}
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Lomba</label>
                  <Select
                    value={prestasiForm.tingkat}
                    onValueChange={(val) => setPrestasiForm({ ...prestasiForm, tingkat: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Pilih tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kecamatan">Kecamatan</SelectItem>
                      <SelectItem value="Kabupaten">Kabupaten / Kota</SelectItem>
                      <SelectItem value="Provinsi">Provinsi</SelectItem>
                      <SelectItem value="Nasional">Nasional</SelectItem>
                      <SelectItem value="Internasional">Internasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Lomba</label>
                  <Input
                    required
                    placeholder="Porseni, AXIOMA, KSM, OSN, Pramuka..."
                    value={prestasiForm.jenis_lomba}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, jenis_lomba: e.target.value })}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Juara Ke</label>
                  <Input
                    required
                    placeholder="Juara 1, Juara 2, Harapan 1..."
                    value={prestasiForm.juara_ke}
                    onChange={(e) => setPrestasiForm({ ...prestasiForm, juara_ke: e.target.value })}
                    className="rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Penyelenggara Kegiatan</label>
                <Input
                  placeholder="Kemenag Kab / KKMI / Dll"
                  value={prestasiForm.penyelenggara || ''}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, penyelenggara: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Tambahan (Opsional)</label>
                <Input
                  placeholder="Lolos provinsi, Piala bergilir, dll"
                  value={prestasiForm.keterangan || ''}
                  onChange={(e) => setPrestasiForm({ ...prestasiForm, keterangan: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrestasiModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Save className="w-4 h-4" /> Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default IdentitasMadrasah;
