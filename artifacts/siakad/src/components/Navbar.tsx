"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, Home, Info, Bell, LayoutGrid, Link as LinkIcon, Sparkles, ChevronDown, Presentation, Calendar, Library, Languages, Users as UsersIcon, Compass, Building, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const { settings } = useSiteSettings();
  const general = settings.general || {};

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const primaryNavLinks = [
    { name: 'Beranda', href: '/#home', icon: Home },
    { name: 'Tentang', href: '/#about', icon: Info },
    { name: 'Program', href: '/#programs', icon: LayoutGrid },
    { name: 'Berita', href: '/#announcements', icon: Bell },
  ];

  const academicLinks = [
    { name: 'Profil Madrasah (EMIS)', href: '/profil-madrasah', icon: Building },
    { name: 'Daftar Guru & Pendidik', href: '/teachers', icon: GraduationCap },
    { name: 'Kelas & Siswa', href: '/kelas', icon: UsersIcon },
    { name: 'Rekapitulasi Siswa', href: '/rekap-siswa-publik', icon: Compass },
    { name: 'Literasi Kurikulum', href: '/#literasi-kurikulum', icon: Sparkles },
    { name: 'Kalender Akademik', href: '/calendar', icon: Calendar },
    { name: 'Jadwal Pelajaran', href: '/jadwal', icon: LayoutGrid },
    { name: 'Perpustakaan', href: '/library', icon: Library },
    { name: 'Tautan Cepat', href: '/links', icon: LinkIcon },
  ];

  const renderLogoText = () => {
    const name = general.school_name || 'Si@Kad';
    if (name.includes('@')) {
      const parts = name.split('@');
      return <>{parts[0]}<span className="text-yellow-500">@</span>{parts[1]}</>;
    }
    return name;
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 md:px-6 py-3 print:hidden ${isScrolled ? 'translate-y-0' : 'translate-y-1'}`}>
      <div className={`flex items-center justify-between h-16 px-5 md:px-8 rounded-2xl transition-all ${isScrolled ? 'bg-white/90 backdrop-blur-xl border border-slate-200 shadow-lg' : 'bg-white/50 backdrop-blur-md border border-slate-100 shadow-sm'}`}>
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-600 shadow-lg flex-shrink-0"><BookOpen className="w-5 h-5 text-white" /></div>
          <div className="flex flex-col">
            <h1 className="font-black text-lg md:text-xl tracking-tighter text-slate-900 leading-none">{renderLogoText()}</h1>
            <p className="text-[8px] md:text-[9px] font-bold text-emerald-600 uppercase tracking-[0.1em] mt-1 leading-none">
              {general.tagline || "Sistem Informasi Akademik Madrasah"}
            </p>
          </div>
        </a>
        <div className="hidden lg:flex items-center gap-5">
          {primaryNavLinks.map((link, index) => (
            <a key={index} href={link.href} className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider transition-all hover:text-emerald-600 text-slate-700 hover:scale-105">
              <link.icon className="w-3.5 h-3.5 text-slate-400" /> {link.name}
            </a>
          ))}

          {/* Academic & Services Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:text-emerald-600 text-slate-700 outline-none">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" /> AKADEMIK <ChevronDown className="w-3 h-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl border-slate-100 shadow-xl p-2 min-w-[200px]">
              {academicLinks.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={idx} onClick={() => navigate(item.href)} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer flex items-center gap-2">
                    <Icon className="w-4 h-4 text-emerald-600" /> {item.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Interactive Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:text-emerald-600 text-slate-700 outline-none">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" /> INTERAKTIF <ChevronDown className="w-3 h-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl border-slate-100 shadow-xl p-2 min-w-[200px]">
              <DropdownMenuItem onClick={() => navigate('/materi-interaktif')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><BookOpen className="w-4 h-4 mr-2 text-emerald-500" /> Materi Interaktif</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/teaching-aids')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><Presentation className="w-4 h-4 mr-2 text-blue-500" /> Alat Bantu Mengajar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/ai-teaching')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><Sparkles className="w-4 h-4 mr-2 text-teal-500" /> AI Teaching Hub</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/translator')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><Languages className="w-4 h-4 mr-2 text-orange-500" /> AI Translator</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/exam-cards')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><UsersIcon className="w-4 h-4 mr-2 text-purple-500" /> Kartu Peserta TKAD</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden lg:block"></div>
          <a href="/spmb"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 font-bold text-[10px] sm:text-[11px] tracking-wide shadow-md shadow-emerald-600/20">DAFTAR SPMB</Button></a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;