"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { 
  LogOut, Settings, Image, Bell, FileText, BookOpen, 
  ChevronRight, Home, LayoutDashboard, GraduationCap, Users,
  Table, Brain, BookMarked, Layers, MonitorPlay, Megaphone,
  ChevronDown, Building, FileSignature, Menu, X, Calendar, Key, KeyRound,
  UserCog, School, ListChecks, ClipboardList, Loader2, Link as LinkIcon,
  Database, UserCheck, Printer, FileSpreadsheet, Presentation, Contact2,
  PenTool, FileBadge, Wallet, Receipt, History, UserCheck2, ClipboardCheck,
  Library, BookCopy, ArrowLeftRight, Sparkles, ImageIcon, Layout, Check, Plus, AlertTriangle, ShieldAlert, Archive, Compass,
  Globe, ExternalLink, ShieldCheck, Trophy, Award, BarChart3
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UpdatePasswordCard } from '@/components/admin/UpdatePasswordCard';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const { madrasahs, visibleMadrasahs, activeMadrasah, activeMadrasahId, setActiveMadrasahId, isSuperAdmin, canBeSuperAdmin, setIsSuperAdmin, currentUserEmail, setCurrentUserEmail } = useMadrasah();

  const menuGroups = [
    {
      key: 'main',
      label: 'Dashboard & Master',
      icon: LayoutDashboard,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard Utama', path: '/admin' },
        { icon: School, label: 'Kelola Madrasah (Multi-Tenant)', path: '/admin/kelola-madrasah' },
        { icon: Calendar, label: 'Tahun Pelajaran', path: '/admin/tahun-pelajaran' },
        { icon: Archive, label: 'Arsip Data Akademik', path: '/admin/arsip-akademik' },
        { icon: FileSignature, label: 'Penandatangan', path: '/admin/penandatangan' },
      ]
    },
    {
      key: 'lembaga',
      label: 'Modul Lembaga Madrasah',
      icon: Building,
      items: [
        { icon: Building, label: 'Profil Madrasah', path: '/admin/identitas-madrasah' },
      ]
    },
    {
      key: 'gtk',
      label: 'Modul Data GTK',
      icon: UserCheck,
      items: [
        { icon: UserCheck, label: 'Daftar Guru & GTK', path: '/admin/teachers' },
      ]
    },
    {
      key: 'manajemen-siswa',
      label: 'Modul Siswa & Rombongan Belajar',
      icon: Users,
      items: [
        { icon: Users, label: 'Manajemen Data Siswa', path: '/admin/manajemen-siswa' },
        { icon: School, label: 'Kelola Rombongan Belajar', path: '/admin/manajemen-rombel' },
        { icon: GraduationCap, label: 'Proses Kelulusan Siswa', path: '/admin/manajemen-siswa?tab=kelulusan' },
        { icon: Award, label: 'Data Tamatan / Alumni', path: '/admin/data-tamatan' },
        { icon: Trophy, label: 'Data Prestasi Siswa', path: '/admin/data-prestasi' },
        { icon: BarChart3, label: 'Arsip Rekap Siswa', path: '/admin/rekap-siswa' },
      ]
    },
    {
      key: 'akademik',
      label: 'Akademik & Kurikulum',
      icon: GraduationCap,
      items: [
        { icon: ListChecks, label: 'Manajemen Mapel', path: '/admin/kurikulum/mapel' },
        { icon: Calendar, label: 'Jadwal Pelajaran', path: '/admin/kurikulum/jadwal' },
        { icon: Table, label: 'Matrik Kurikulum', path: '/admin/kurikulum/matrik' },
        { icon: BookMarked, label: 'Bedah CP (KMA 450)', path: '/admin/kurikulum/bedah-cp' },
        { icon: ClipboardList, label: 'LCKH Guru', path: '/admin/kurikulum/lckh' },
        { icon: UserCheck2, label: 'Absensi Harian', path: '/admin/kurikulum/absensi' },
        { icon: ClipboardCheck, label: 'Rekap Absensi', path: '/admin/kurikulum/rekap-absensi' },
      ]
    },
    {
      key: 'penilaian',
      label: 'Penilaian & Rapor',
      icon: FileSpreadsheet,
      items: [
        { icon: PenTool, label: 'Input Nilai Siswa', path: '/admin/kurikulum/nilai' },
        { icon: FileBadge, label: 'Cetak Rapor Digital', path: '/admin/kurikulum/rapor' },
        { icon: ListChecks, label: 'Kisi-kisi Ujian', path: '/admin/kurikulum/kisi-kisi' },
        { icon: Printer, label: 'Kartu Peserta TKAD', path: '/admin/kurikulum/exam-card' },
        { icon: Layers, label: 'Bank Soal Intelligence', path: '/admin/kurikulum/bank-soal' },
      ]
    },
    {
      key: 'media',
      label: 'Media & AI Assistant',
      icon: Sparkles,
      items: [
        { icon: Brain, label: 'AI Teaching Assistant', path: '/admin/kurikulum/ai-teaching' },
        { icon: BookOpen, label: 'Materi Interaktif', path: '/admin/kurikulum/materi-interaktif' },
        { icon: Presentation, label: 'Alat Bantu Mengajar', path: '/admin/kurikulum/teaching-aids' },
        { icon: Layout, label: 'Generator Cover', path: '/admin/kurikulum/cover' },
      ]
    },
    {
      key: 'spmb',
      label: 'Layanan SPMB',
      icon: Megaphone,
      items: [
        { icon: Megaphone, label: 'Pusat Kendali', path: '/admin/spmb/pusat-kendali' },
        { icon: UserCheck, label: 'Daftar Pendaftar', path: '/admin/spmb/pendaftar' },
        { icon: ImageIcon, label: 'Brosur Ikonik', path: '/admin/spmb/brosur' },
      ]
    },
    {
      key: 'finance',
      label: 'Keuangan & Perpus',
      icon: Wallet,
      items: [
        { icon: Wallet, label: 'Pembayaran SPP', path: '/admin/finance/payment' },
        { icon: Receipt, label: 'Generator Kuitansi', path: '/admin/finance/receipt' },
        { icon: Library, label: 'Katalog Buku', path: '/admin/library/books' },
      ]
    },
    {
      key: 'konten',
      label: 'Konten Web',
      icon: Image,
      items: [
        { icon: Bell, label: 'Pengumuman', path: '/admin/announcements' },
        { icon: Image, label: 'Galeri Foto', path: '/admin/gallery' },
        { icon: FileText, label: 'Artikel Berita', path: '/admin/posts' },
        { icon: LinkIcon, label: 'Pusat Tautan', path: '/admin/links' },
      ]
    },
    {
      key: 'sistem',
      label: 'Pengaturan Sistem',
      icon: Settings,
      items: [
        { icon: UserCog, label: 'Manajemen User', path: '/admin/users' },
        { icon: Settings, label: 'Konfigurasi Web', path: '/admin/settings' },
        { icon: Calendar, label: 'Kalender Akademik', path: '/admin/calendar' },
        { icon: Printer, label: 'Pengaturan Cetak', path: '/admin/print-settings' },
        { icon: Key, label: 'Konfigurasi API', path: '/admin/api-config' },
        { icon: Database, label: 'Backup & Restore', path: '/admin/backup' },
      ]
    }
  ];

  useEffect(() => {
    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const savedEmail = localStorage.getItem('siakad_current_user_email');
        if (!session && !savedEmail && !currentUserEmail) {
          navigate('/login');
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setCheckingAuth(false);
      }
    };
    verifySession();
  }, [navigate, currentUserEmail]);

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  };

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return (location.pathname + location.search) === path;
    }
    return location.pathname === path && !location.search;
  };
  const isGroupActive = (paths: string[]) => paths.some(p => {
    const basePath = p.split('?')[0];
    return location.pathname === basePath || (basePath !== '/admin' && location.pathname.startsWith(basePath));
  });
  const activeGroup = menuGroups.find(g => isGroupActive(g.items.map(i => i.path)));
  const activeItem = activeGroup?.items.find(i => isActive(i.path)) || activeGroup?.items.find(i => {
    const basePath = i.path.split('?')[0];
    return location.pathname === basePath || (basePath !== '/admin' && location.pathname.startsWith(basePath));
  });

  const activeMenuName = activeItem?.label || title;
  const ActiveIcon = activeItem?.icon || activeGroup?.icon || LayoutDashboard;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.warn('Sign out error', error);
    } finally {
      setCurrentUserEmail(null);
      localStorage.removeItem('siakad_current_user_email');
      localStorage.removeItem('siakad_is_super_admin');
      showSuccess('Logout berhasil!');
      navigate('/login');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-clip print:bg-white">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 lg:transform-none shrink-0 print:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg"><BookOpen className="w-5 h-5 text-white" /></div>
              <h1 className="font-bold text-gray-900">Si<span className="text-yellow-500">@</span>Kad</h1>
              <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 min-h-0">
            {menuGroups.map((group) => {
              const groupActive = isGroupActive(group.items.map(i => i.path));
              const isExpanded = expandedMenus.includes(group.key);

              return (
                <div key={group.key} className="space-y-1">
                  {/* Module Group Accordion Header */}
                  <button
                    type="button"
                    onClick={() => {
                      if (group.items[0]?.path) {
                        navigate(group.items[0].path);
                        setSidebarOpen(false);
                      }
                      toggleMenu(group.key);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all border cursor-pointer ${
                      groupActive
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 font-extrabold scale-[1.01]'
                        : 'bg-slate-50/90 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        groupActive
                          ? 'bg-white/20 text-white shadow-inner'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <group.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black block truncate">{group.label}</span>
                      <span className={`text-[10px] block truncate ${groupActive ? 'text-emerald-100 font-medium' : 'text-slate-500 font-medium'}`}>
                        {group.items.length} Sub-Modul
                      </span>
                    </div>
                    {groupActive && (
                      <div className="w-2 h-2 rounded-full bg-white shadow-xs shrink-0 animate-pulse" />
                    )}
                  </button>

                  {/* Sub-menu Items dropdown list (hidden by default unless expanded) */}
                  {isExpanded && (
                    <div className="pl-3.5 pr-1 py-1 space-y-1 border-l-2 border-emerald-300/80 ml-4 transition-all">
                      {group.items.map((item) => {
                        const itemIsActive = isActive(item.path);
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => {
                              navigate(item.path);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                              itemIsActive
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-1 ring-emerald-400 font-black'
                                : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-50/80'
                            }`}
                          >
                            <div className={`p-1 rounded-lg shrink-0 transition-colors ${
                              itemIsActive ? 'bg-white/20 text-white' : 'bg-emerald-100/70 text-emerald-700'
                            }`}>
                              <item.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate flex-1">{item.label}</span>
                            {itemIsActive && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 shadow-xs print:hidden">
          {/* Left Title & Iconic Module Badge */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button 
              className="lg:hidden p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl shrink-0 transition-all border border-emerald-200/80 shadow-xs" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Iconic Active Module Badge */}
            <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-700 text-white items-center justify-center shadow-md shadow-emerald-600/25 shrink-0 border border-emerald-400/30">
              <ActiveIcon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  SIM Madrasah
                </span>
                {activeGroup && (
                  <Badge variant="outline" className="text-[9px] font-black px-2 py-0 bg-emerald-50 text-emerald-800 border-emerald-200 rounded-md">
                    {activeGroup.label}
                  </Badge>
                )}
              </div>
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 truncate leading-tight tracking-tight flex items-center gap-2 mt-0.5">
                <span>{activeMenuName}</span>
              </h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Quick Link to Portal Web */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs transition-all border border-emerald-200/80 shadow-xs group"
              title="Lihat Halaman Depan Web Madrasah"
            >
              <Globe className="w-4 h-4 text-emerald-600 group-hover:rotate-45 transition-transform" />
              <span>Portal Web</span>
              <ExternalLink className="w-3 h-3 text-emerald-500" />
            </a>

            {/* Madrasah Switcher Dropdown - Modern Iconic Card */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 p-1.5 pr-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl border border-emerald-500/30 shadow-md hover:shadow-xl transition-all text-left group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 p-0.5 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {activeMadrasah.logo_url ? (
                      <img src={activeMadrasah.logo_url} alt="" className="w-full h-full object-contain p-0.5 rounded-lg bg-white/90" />
                    ) : (
                      <School className="w-4 h-4 text-slate-950" />
                    )}
                  </div>
                  <div className="hidden sm:block text-left max-w-[160px] lg:max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest truncate">
                        {activeMadrasah.jenjang_pendidikan || 'MI'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-bold text-slate-300 truncate">
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                      </span>
                    </div>
                    <p className="text-xs font-black text-white truncate leading-tight">
                      {activeMadrasah.nama_madrasah}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 rounded-3xl p-2.5 shadow-2xl border-slate-200 bg-white/95 backdrop-blur-xl">
                <DropdownMenuLabel className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 py-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Building className="w-3.5 h-3.5 text-emerald-600" /> Pilih Akses Madrasah
                  </span>
                  <Badge className={`text-[9px] font-black px-2 py-0.5 border-0 ${isSuperAdmin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {isSuperAdmin ? 'Super Admin' : 'Admin Madrasah'}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {visibleMadrasahs.map((m) => {
                    const isSelected = m.id === activeMadrasahId;
                    return (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => {
                          setActiveMadrasahId(m.id);
                          showSuccess(`Beralih ke ${m.nama_madrasah}`);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/20' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-xs ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {m.jenjang_pendidikan || 'MI'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                {m.nama_madrasah}
                              </p>
                              {m.is_active === false && (
                                <Badge className="bg-rose-100 text-rose-700 text-[8px] px-1 py-0 border-rose-200">Nonaktif</Badge>
                              )}
                            </div>
                            <p className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {m.nsm ? `NSM: ${m.nsm}` : (m.alamat || 'Alamat Belum Diisi')}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>

                <DropdownMenuSeparator className="my-1.5" />
                
                <DropdownMenuItem
                  onClick={() => setPasswordDialogOpen(true)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-slate-700 font-bold text-xs hover:bg-slate-100"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Update Password Akun</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/admin/kelola-madrasah')}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-emerald-700 font-extrabold text-xs hover:bg-emerald-50"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Kelola & Hak Akses Madrasah</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-full overflow-x-hidden print:p-0">
          {activeMadrasah?.is_active === false && !isSuperAdmin && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 flex items-center gap-3 shadow-sm">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-sm text-rose-900">Perhatian: Akun Madrasah Nonaktif</p>
                <p className="mt-0.5 text-rose-700">Akun madrasah ini telah dinonaktifkan oleh Super Admin. Harap hubungi Super Admin untuk proses aktivasi kembali.</p>
              </div>
            </div>
          )}

          {/* Sub-Modul Navigasi Ikonik pada Halaman */}
          {activeGroup && activeGroup.items.length > 1 && (
            <div className="mb-6 bg-white p-3.5 sm:p-4 rounded-3xl shadow-md border border-slate-200/80 transition-all print:hidden">
              <div className="flex items-center justify-between gap-2 mb-3 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                    <activeGroup.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                      Navigasi Sub-Modul
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                      {activeGroup.label}
                    </h3>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-black px-2.5 py-1 rounded-full">
                  {activeGroup.items.length} Menu Modul
                </Badge>
              </div>

              {/* Grid Layout (Non-slide) for Sub-modules */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 pt-0.5">
                {activeGroup.items.map((item) => {
                  const itemActive = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all min-w-0 border cursor-pointer ${
                        itemActive
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01] ring-2 ring-emerald-300'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl shrink-0 transition-colors ${
                        itemActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="whitespace-normal leading-tight font-black text-left flex-1 break-words text-[11px] sm:text-xs">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {children}
        </main>

        {/* Sticky Footer Admin Dashboard & System */}
        <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-4 lg:px-8 py-3 shadow-lg print:hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-extrabold text-slate-800">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-[10px] shadow-xs">
                S
              </div>
              <span>Si@Kad Madrasah &copy; {new Date().getFullYear()}</span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-emerald-700 font-extrabold truncate max-w-[200px] sm:max-w-[300px]">
                {activeMadrasah?.nama_madrasah || 'Sistem Informasi Akademik'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 font-bold text-slate-600 text-[11px]">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dashboard</span>
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={() => navigate('/admin/manajemen-siswa')}
                className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Data Siswa</span>
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={() => navigate('/admin/manajemen-rombel')}
                className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <School className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kelola Rombel</span>
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={() => navigate('/admin/teachers')}
                className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>GTK</span>
              </button>
              <span className="text-slate-300">&bull;</span>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-extrabold hover:underline flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Portal Web</span>
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal Dialog Update Password */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 rounded-3xl overflow-hidden border-0">
          <UpdatePasswordCard />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLayout;