"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Building, School, Globe, FileText, Users, Calendar, MapPin, Printer, ShieldCheck, 
  Landmark, CheckCircle2, Phone, Mail, BookOpen, Award, Sparkles, ChevronRight, HardDrive, CreditCard, ArrowLeft
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { useMadrasah } from '@/contexts/MadrasahContext';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { IdentitasMadrasahEmis } from './admin/IdentitasMadrasah';
import { useNavigate } from 'react-router-dom';

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

export default function ProfilMadrasah() {
  const navigate = useNavigate();
  const { activeMadrasah, activeMadrasahId, getScopedKey } = useMadrasah();
  const [loading, setLoading] = useState(true);
  const [identitas, setIdentitas] = useState<IdentitasMadrasahEmis>({
    ...defaultEmisIdentitas,
    id: activeMadrasahId,
  });

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public:site_settings:profil_madrasah_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload?.new && payload.new.id?.includes('identitas')) {
          fetchData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMadrasahId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ALL_IDENTITAS_KEYS = Array.from(new Set([
        getScopedKey('identitas_madrasah'),
        `identitas_madrasah_${activeMadrasahId || 'madrasah_default'}`,
        'identitas_madrasah_madrasah_default',
        'identitas_madrasah'
      ]));

      const { data } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', ALL_IDENTITAS_KEYS);

      let foundVal: any = null;
      if (data && data.length > 0) {
        for (const k of ALL_IDENTITAS_KEYS) {
          const row = data.find(d => d.id === k);
          if (row?.value && typeof row.value === 'object' && Object.keys(row.value).length > 0) {
            foundVal = row.value;
            break;
          }
        }
      }

      if (foundVal) {
        setIdentitas((prev) => ({ ...defaultEmisIdentitas, ...prev, ...foundVal }));
      } else {
        setIdentitas((prev) => ({
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
    } catch (err) {
      console.error("Error loading identitas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <SEO title={`Profil Lengkap EMIS - ${identitas.nama_madrasah}`} description="Profil Kelembagaan, Legalitas, Sarpras, dan Visi Misi Madrasah terintegrasi EMIS Kemenag RI" />
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* PRINT HEADER ONLY VISIBLE ON PRINT */}
        <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            {identitas.logo_url && (
              <img src={identitas.logo_url} alt="Logo" className="w-20 h-20 object-contain" />
            )}
            <div className="flex-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">{identitas.nama_yayasan}</h2>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{identitas.nama_madrasah}</h1>
              <p className="text-xs font-medium text-slate-700">{identitas.alamat}, Desa {identitas.desa}, Kec. {identitas.kecamatan}, Kab. {identitas.kabupaten}, {identitas.provinsi}</p>
              <div className="flex gap-4 text-[10px] font-mono mt-1 text-slate-600">
                <span>NSM: <strong>{identitas.nsm}</strong></span>
                <span>NPSN: <strong>{identitas.npsn}</strong></span>
                <span>AKREDITASI: <strong>{identitas.akreditasi}</strong></span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center border-t border-slate-300 pt-2">
            <h3 className="text-sm font-black uppercase tracking-wider">PROFIL LENGKAP KELEMBAGAAN MADRASAH (STANDAR EMIS KEMENAG RI)</h3>
          </div>
        </div>

        {/* BREADCRUMB & TOP ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mb-1">
              <button onClick={() => navigate('/')} className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Beranda
              </button>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span>Profil Madrasah</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Building className="w-8 h-8 text-emerald-600" />
              Profil Lengkap Madrasah (EMIS)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Data Resmi Kelembagaan, Legalitas, Sarana Prasarana, dan Visi Misi Terintegrasi EMIS Kemenag RI
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl px-5 h-11 shadow-lg shadow-slate-900/10 gap-2 text-xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              Cetak Profil EMIS
            </Button>
          </div>
        </div>

        {/* HERO BRAND CARD */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-900 via-emerald-850 to-teal-950 text-white rounded-3xl overflow-hidden mb-8 print:shadow-none print:bg-white print:text-slate-900">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/10 backdrop-blur-md p-3 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              {identitas.logo_url ? (
                <img src={identitas.logo_url} alt="Logo Madrasah" className="max-w-full max-h-full object-contain" />
              ) : (
                <School className="w-16 h-16 text-emerald-300" />
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-[10px] font-bold px-3 py-1">
                  {identitas.status}
                </Badge>
                <Badge className="bg-teal-500/30 text-teal-200 border-teal-400/40 text-[10px] font-bold px-3 py-1">
                  Jenjang {identitas.jenjang_pendidikan}
                </Badge>
                <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] px-3 py-1">
                  Akreditasi {identitas.akreditasi || 'A'}
                </Badge>
              </div>

              <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-200">
                {identitas.nama_yayasan}
              </h2>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {identitas.nama_madrasah}
              </h1>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
                {identitas.alamat}, Desa {identitas.desa}, Kec. {identitas.kecamatan}, Kab. {identitas.kabupaten}, {identitas.provinsi}
              </p>

              <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-4 text-xs font-mono">
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-emerald-300 mr-1">NSM:</span>
                  <strong className="text-white">{identitas.nsm}</strong>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-teal-300 mr-1">NPSN:</span>
                  <strong className="text-white">{identitas.npsn}</strong>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-amber-300 mr-1">Kepala:</span>
                  <strong className="text-white">{identitas.nama_pimpinan}</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DETAILED PROFIL TABS */}
        <Tabs defaultValue="kelembagaan" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 flex flex-wrap gap-1 h-auto print:hidden">
            <TabsTrigger value="kelembagaan" className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-2">
              <School className="w-4 h-4" /> Kelembagaan
            </TabsTrigger>
            <TabsTrigger value="alamat" className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-2">
              <MapPin className="w-4 h-4" /> Alamat & Kontak
            </TabsTrigger>
            <TabsTrigger value="legalitas" className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-2">
              <ShieldCheck className="w-4 h-4" /> Legalitas & Bank
            </TabsTrigger>
            <TabsTrigger value="sarpras" className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-2">
              <Landmark className="w-4 h-4" /> Lahan & Sarpras
            </TabsTrigger>
            <TabsTrigger value="visimisi" className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-2">
              <BookOpen className="w-4 h-4" /> Visi, Misi & Kurikulum
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: KELEMBAGAAN */}
          <TabsContent value="kelembagaan" className="space-y-6">
            <Card className="border-0 shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <School className="w-5 h-5 text-emerald-400" />
                  I. DATA UTAMA KELEMBAGAAN EMIS
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Informasi Identitas Pokok dan Pengelola Organisasi Madrasah
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Yayasan / Penyelenggara</span>
                    <p className="font-extrabold text-sm text-slate-900">{identitas.nama_yayasan || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Resmi Madrasah</span>
                    <p className="font-extrabold text-sm text-emerald-800">{identitas.nama_madrasah || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nomor Statistik Madrasah (NSM)</span>
                    <p className="font-mono font-bold text-sm text-blue-700">{identitas.nsm || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">NPSN</span>
                    <p className="font-mono font-bold text-sm text-blue-700">{identitas.npsn || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jenjang Pendidikan</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.jenjang_pendidikan || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status Madrasah</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.status || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kategori Wilayah</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.kategori_wilayah || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tahun Berdiri</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.tahun_berdiri || '-'}</p>
                  </div>

                  <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">Kepala Madrasah / Pimpinan</span>
                    <p className="font-black text-sm text-emerald-950">{identitas.nama_pimpinan || '-'}</p>
                    <p className="text-xs text-emerald-700 font-mono mt-0.5">NIP: {identitas.nip_pimpinan || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ALAMAT & KONTAK */}
          <TabsContent value="alamat" className="space-y-6">
            <Card className="border-0 shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  II. ALAMAT LENGKAP & SAMBUNGAN UTILITY
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Lokasi Geografis, Kontak Resmi, serta Akses Listrik & Internet
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 lg:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alamat Jalan</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.alamat || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">RT / RW & Dusun</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.rt_rw} (Dusun {identitas.dusun})</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Desa / Kelurahan</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.desa || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kecamatan</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.kecamatan || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kabupaten / Kota</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.kabupaten || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Provinsi & Kode Pos</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.provinsi} - {identitas.kode_pos}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Telepon Kantor</span>
                    <p className="font-mono font-bold text-sm text-slate-900">{identitas.telepon || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email Resmi</span>
                    <p className="font-mono font-bold text-sm text-emerald-700">{identitas.email || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Website Resmi</span>
                    <p className="font-mono font-bold text-sm text-blue-700">{identitas.website || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Akses Internet</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.akses_internet || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sumber & Daya Listrik</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.sumber_listrik} ({identitas.daya_listrik})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: LEGALITAS */}
          <TabsContent value="legalitas" className="space-y-6">
            <Card className="border-0 shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  III. DOKUMEN LEGALITAS & REKENING OPERASIONAL
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  SK Pendirian, Izin Operasional, Akreditasi, dan Data Keuangan Bank
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">SK Pendirian & Tanggal</span>
                    <p className="font-mono font-bold text-xs text-slate-900">{identitas.sk_pendirian || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">Tgl SK: {identitas.tgl_sk_pendirian || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">SK Izin Operasional</span>
                    <p className="font-mono font-bold text-xs text-slate-900">{identitas.sk_ijin_operasional || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">Tgl SK: {identitas.tgl_sk_ijin_operasional || '-'}</p>
                  </div>

                  <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Status Akreditasi & BAN-SM</span>
                    <p className="font-black text-base text-amber-950">Peringkat {identitas.akreditasi || 'A'}</p>
                    <p className="text-xs font-mono text-amber-900 mt-0.5">SK: {identitas.sk_akreditasi || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">NPWP Lembaga</span>
                    <p className="font-mono font-bold text-sm text-slate-900">{identitas.npwp || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 lg:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rekening Operasional Bank</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.nama_bank}</p>
                    <p className="font-mono font-black text-sm text-blue-700 mt-0.5">{identitas.no_rekening} a.n. {identitas.rekening_atas_nama}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: SARPRAS */}
          <TabsContent value="sarpras" className="space-y-6">
            <Card className="border-0 shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-400" />
                  IV. KEPEMILIKAN LAHAN & REKAPITULASI SARANA PRASARANA
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Luas Bangunan, Jumlah Ruang Kelas, dan Fasilitas Pendukung Pembelajaran
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status Lahan</span>
                    <p className="font-bold text-sm text-slate-900">{identitas.status_tanah || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Luas Tanah</span>
                    <p className="font-black text-lg text-emerald-800">{identitas.luas_tanah || '0'} <span className="text-xs font-normal">m²</span></p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Luas Bangunan</span>
                    <p className="font-black text-lg text-teal-800">{identitas.luas_bangunan || '0'} <span className="text-xs font-normal">m²</span></p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Jumlah Ruang Kelas</span>
                    <p className="font-black text-lg text-blue-800">{identitas.jumlah_ruang_kelas || '0'} <span className="text-xs font-normal">Ruang</span></p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Laboratorium</span>
                    <p className="font-black text-lg text-purple-800">{identitas.jumlah_lab || '0'} <span className="text-xs font-normal">Ruang</span></p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Perpustakaan</span>
                    <p className="font-black text-lg text-amber-800">{identitas.jumlah_perpustakaan || '0'} <span className="text-xs font-normal">Ruang</span></p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sanitasi / Toilet</span>
                    <p className="font-black text-lg text-rose-800">{identitas.jumlah_sanitasi || '0'} <span className="text-xs font-normal">Unit</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: VISI MISI */}
          <TabsContent value="visimisi" className="space-y-6">
            <Card className="border-0 shadow-md rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  V. VISI, MISI, MOTTO & KURIKULUM ACUAN
                </CardTitle>
                <CardDescription className="text-slate-300 text-xs">
                  Landasan Filosofis, Program Unggulan, dan Pedoman Akademik
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-1">Visi Madrasah</span>
                  <p className="text-base font-extrabold text-emerald-950 italic">"{identitas.visi || '-'}"</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-2">Misi Utama Madrasah</span>
                  <div className="whitespace-pre-line text-xs font-semibold text-slate-800 leading-relaxed">
                    {identitas.misi || '-'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Motto Madrasah</span>
                    <p className="font-extrabold text-sm text-slate-900">{identitas.motto || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Program Unggulan</span>
                    <p className="font-extrabold text-xs text-emerald-800">{identitas.program_unggulan || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kurikulum Berlaku</span>
                    <p className="font-extrabold text-xs text-blue-800">{identitas.kurikulum || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* PRINT SIGNATURE FOOTER */}
        <div className="hidden print:block mt-12">
          <PenandatanganDokumen showGuru={false} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
