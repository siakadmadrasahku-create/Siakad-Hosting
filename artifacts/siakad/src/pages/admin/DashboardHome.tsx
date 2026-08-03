"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  School, 
  GraduationCap, 
  Calendar, 
  Palette, 
  BookOpen, 
  Sparkles, 
  TrendingUp, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Megaphone, 
  FileText, 
  Layers, 
  Activity, 
  Award,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const DashboardHome = () => {
  const { settings } = useSiteSettings();
  const activeYear = settings.tahun_pelajaran?.active_year || '2026/2027';
  const spmbYear = settings.spmb_config?.tahun_ajaran || settings.tahun_pelajaran?.spmb_year || '2026/2027';
  const semester = settings.tahun_pelajaran?.semester || 'Ganjil';

  const [stats, setStats] = useState({
    announcements: 0,
    gallery: 0,
    posts: 0,
    students: 0,
    classes: 0,
    applicants: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetchStats();
    
    // Live Clock Update
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    const handleSync = () => {
      fetchStats();
    };

    window.addEventListener('students_data_updated', handleSync);
    window.addEventListener('rekapitulasi_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleSync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      fetchStats();
    }, 5000);

    const subscription = supabase
      .channel('public:site_settings:dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload?.new && (payload.new.id === 'students_list' || payload.new.id === 'kelas_list' || payload.new.id === 'pendaftaran_spmb_list')) {
          fetchStats();
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('students_data_updated', handleSync);
      window.removeEventListener('rekapitulasi_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      clearInterval(clockInterval);
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');

      const annData = res?.find(s => s.id === 'announcements_data_list')?.value || [];
      const galleryData = res?.find(s => s.id === 'gallery_data_list')?.value || [];
      const postsData = res?.find(s => s.id === 'posts_data_list')?.value || [];
      const studentData = res?.find(s => s.id === 'students_list')?.value || [];
      const classData = res?.find(s => s.id === 'kelas_list')?.value || [];
      const applicantData = res?.find(s => s.id === 'pendaftaran_spmb_list')?.value || [];

      const tpValue = res?.find(s => s.id === 'tahun_pelajaran')?.value || {};
      const currentActiveYear = tpValue.active_year || '2026/2027';

      const activeStudentsCount = Array.isArray(studentData) 
        ? studentData.filter((s: any) => s.status === 'active' || !s.status).length 
        : 0;

      let activeClassesCount = 0;
      if (Array.isArray(classData)) {
        const yearClasses = classData.filter((c: any) => !c.tahun_pelajaran || c.tahun_pelajaran === currentActiveYear);
        activeClassesCount = yearClasses.length > 0 
          ? yearClasses.length 
          : new Set(classData.map((c: any) => c.nama_kelas)).size;
      }

      setStats({
        announcements: Array.isArray(annData) ? annData.length : 0,
        gallery: Array.isArray(galleryData) ? galleryData.length : 0,
        posts: Array.isArray(postsData) ? postsData.length : 0,
        students: activeStudentsCount,
        classes: activeClassesCount,
        applicants: Array.isArray(applicantData) ? applicantData.length : 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCards = [
    { 
      icon: Users, 
      label: 'Siswa Aktif', 
      value: stats.students, 
      gradient: 'from-emerald-500 to-teal-600', 
      bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'Data Realtime',
      href: '/admin/manajemen-siswa'
    },
    { 
      icon: GraduationCap, 
      label: 'Pendaftar SPMB', 
      value: stats.applicants, 
      gradient: 'from-blue-500 to-indigo-600', 
      bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
      badge: 'Siswa Baru',
      href: '/admin/spmb/pendaftar'
    },
    { 
      icon: School, 
      label: 'Rombongan Belajar', 
      value: stats.classes, 
      gradient: 'from-purple-500 to-violet-600', 
      bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
      badge: 'Kelas Aktif',
      href: '/admin/manajemen-rombel'
    },
    { 
      icon: Megaphone, 
      label: 'Pengumuman & Berita', 
      value: stats.announcements + stats.posts, 
      gradient: 'from-amber-500 to-orange-600', 
      bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'Publikasi',
      href: '/admin/announcements'
    },
  ];

  const quickActions = [
    { label: 'Pendaftar SPMB', desc: 'Verifikasi berkas & seleksi', href: '/admin/spmb/pendaftar', icon: GraduationCap, color: 'from-blue-500 to-indigo-600' },
    { label: 'Mata Pelajaran', desc: 'Pengaturan modul kurikulum', href: '/admin/kurikulum/mata-pelajaran', icon: BookOpen, color: 'from-emerald-500 to-teal-600' },
    { label: 'Manajemen Siswa', desc: 'Database & mutasi siswa', href: '/admin/manajemen-siswa', icon: Users, color: 'from-purple-500 to-violet-600' },
    { label: 'Logo Designer', desc: 'Kustomisasi identitas madrasah', href: '/admin/logo-designer', icon: Palette, color: 'from-pink-500 to-rose-600' },
    { label: 'Tahun Pelajaran', desc: 'Set semester & kalender', href: '/admin/tahun-pelajaran', icon: Calendar, color: 'from-amber-500 to-orange-600' },
    { label: 'Cetak Rapor', desc: 'Arsip & cetak nilai akhir', href: '/admin/arsip-akademik', icon: FileText, color: 'from-teal-500 to-cyan-600' },
  ];

  return (
    <AdminLayout title="Dashboard Utama">
      {/* Running Text Marquee Bar - Non-intrusive, Modern & Interactive */}
      <div className="mb-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-2 sm:p-2.5 flex items-center gap-3 overflow-hidden relative">
        {/* Fixed Left Badge */}
        <div className="flex items-center gap-1.5 bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shrink-0 shadow-sm z-10">
          <Megaphone className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
          <span className="uppercase tracking-wider hidden xs:inline">INFO MADRASAH</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
        </div>

        {/* Marquee Running Content */}
        <div className="flex-1 overflow-hidden">
          <marquee 
            scrollamount={4} 
            onMouseOver={(e: any) => e.currentTarget.stop()} 
            onMouseOut={(e: any) => e.currentTarget.start()}
            className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center py-0.5 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 mr-8">
              <span className="text-emerald-700 font-bold">📢 SPMB Online {spmbYear}:</span> Pendaftaran Siswa Baru telah dibuka. Pastikan verifikasi berkas berjalan lancar.
            </span>
            <span className="inline-flex items-center gap-2 mr-8">
              <span className="text-amber-600 font-bold">🕌 Kurikulum Ke-NU-an / Aswaja:</span> Modul lokal LP Ma'arif NU telah terintegrasi di fitur Mata Pelajaran.
            </span>
            <span className="inline-flex items-center gap-2 mr-8">
              <span className="text-blue-600 font-bold">✨ Logo Designer:</span> Kustomisasi identitas resmi & kop surat madrasah dapat dikelola di menu Logo Designer.
            </span>
            <span className="inline-flex items-center gap-2 mr-8">
              <span className="text-purple-600 font-bold">📞 Bantuan Layanan Admin:</span> Konfirmasi aktivasi & bantuan teknis WA Resmi 081226738883.
            </span>
          </marquee>
        </div>

        {/* Right Link Button */}
        <a 
          href="/admin/announcements" 
          className="hidden md:flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors shrink-0 border border-slate-200/70"
          title="Buka Halaman Kelola Pengumuman"
        >
          <span>Semua</span>
          <ChevronRight className="w-3 h-3 text-emerald-600" />
        </a>
      </div>

      {/* Top Banner Header - High Impact Modern Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-6 sm:p-8 mb-6 shadow-xl border border-emerald-800/50">
        {/* Background Glowing Orbs */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-extrabold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span>Sistem Informasi Akademik Madrasah Digital</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Selamat Datang di Si<span style={{ color: '#FFD700', filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.9))' }}>@</span>Kad! 👋
            </h1>

            <p className="text-emerald-100/90 text-xs sm:text-sm font-medium leading-relaxed">
              Pusat kendali manajemen madrasah ibtidaiyah secara terintegrasi, real-time, dan aman.
            </p>
          </div>

          {/* Time & Date Live Widget */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex flex-col justify-center min-w-[200px] shrink-0 text-right md:text-right">
            <div className="flex items-center gap-2 justify-end text-emerald-300 text-xs font-bold mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentTime || '00:00:00'} WIB</span>
            </div>
            <div className="text-white font-extrabold text-sm sm:text-base capitalize">
              {formattedDate}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-emerald-200 font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Database Terverifikasi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <a
              key={index}
              href={stat.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${stat.bgLight}`}>
                    {stat.badge}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300 my-1" />
                  ) : (
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {stat.value}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 group-hover:text-emerald-700 transition-colors">
                <span>Kelola Data</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          );
        })}
      </div>

      {/* Main Grid: Quick Actions & System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Aksi Cepat Akademik</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">Paling Sering Digunakan</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <a
                  key={idx}
                  href={action.href}
                  className="group bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="mb-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200 mb-2.5`}>
                      <ActionIcon className="w-4.5 h-4.5 stroke-[2.2]" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug group-hover:text-emerald-700 transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5 line-clamp-1">
                      {action.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-end text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Buka</span>
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* System Information & Quick Tips */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Status & Informasi</h2>
          </div>

          <Card className="border border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200/70">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-black text-emerald-900">Sistem Akademik Aktif</p>
                  <p className="text-emerald-700 text-[11px] leading-relaxed mt-0.5">
                    Modul SPMB, Manajemen Siswa, dan Kurikulum berjalan optimal.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Tahun Pelajaran:</span>
                  <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{activeYear}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Semester:</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{semester}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-500">Izin Akses:</span>
                  <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">Administrator</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="/admin/identitas-madrasah"
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-sm"
                >
                  <span>Pengaturan Identitas Madrasah</span>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardHome;
