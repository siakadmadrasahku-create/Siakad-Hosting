"use client";

import React from 'react';
import { 
  BookOpen, Facebook, Instagram, Youtube, Twitter, Heart, 
  Home, Info, LayoutGrid, Image, Phone, MapPin, Mail, 
  GraduationCap, Sparkles, ChevronRight, Globe, Award, 
  BookMarked, Compass, Calendar, Users
} from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const Footer = () => {
  const { settings } = useSiteSettings();
  const general = settings.general || {};
  const footerSettings = settings.footer || {};

  const defaultQuickLinks = [
    { name: 'Beranda', href: '#home', icon: Home },
    { name: 'Tentang Kami', href: '#about', icon: Info },
    { name: 'Program & Layanan', href: '#programs', icon: LayoutGrid },
    { name: 'Galeri & Kegiatan', href: '#gallery', icon: Image },
    { name: 'Kalender & Jadwal', href: '/calendar', icon: Calendar },
    { name: 'Daftar SPMB', href: '/spmb', icon: GraduationCap },
  ];
  
  const defaultPrograms = [
    { name: 'Tahfidz Al-Quran', href: '#programs', icon: BookOpen },
    { name: 'Bahasa & Literasi', href: '#literasi-kurikulum', icon: Globe },
    { name: 'Sains & Matematika', href: '#programs', icon: Award },
    { name: 'Seni & Kaligrafi Islam', href: '#programs', icon: Compass },
    { name: 'Data & Prestasi Siswa', href: '/profil-madrasah', icon: Users },
    { name: 'Perpustakaan Digital', href: '/library', icon: BookMarked },
  ];

  const quickLinks = footerSettings.quick_links?.length > 0 ? footerSettings.quick_links : defaultQuickLinks;
  const programs = footerSettings.programs_links?.length > 0 ? footerSettings.programs_links : defaultPrograms;

  const socialLinks = [
    { icon: Facebook, href: footerSettings.facebook || '#' },
    { icon: Instagram, href: footerSettings.instagram || '#' },
    { icon: Youtube, href: footerSettings.youtube || '#' },
    { icon: Twitter, href: footerSettings.twitter || '#' },
  ];

  // Helper to resolve dynamic icons for custom links if provided
  const getQuickLinkIcon = (name: string, index: number) => {
    const defaultIcon = defaultQuickLinks[index % defaultQuickLinks.length]?.icon || ChevronRight;
    const lower = name.toLowerCase();
    if (lower.includes('beranda') || lower.includes('home')) return Home;
    if (lower.includes('tentang') || lower.includes('about')) return Info;
    if (lower.includes('program') || lower.includes('layanan')) return LayoutGrid;
    if (lower.includes('galeri') || lower.includes('foto')) return Image;
    if (lower.includes('kontak') || lower.includes('hubungi')) return Phone;
    if (lower.includes('spmb') || lower.includes('daftar')) return GraduationCap;
    if (lower.includes('kalender') || lower.includes('jadwal')) return Calendar;
    return defaultIcon;
  };

  const getProgramIcon = (name: string, index: number) => {
    const defaultIcon = defaultPrograms[index % defaultPrograms.length]?.icon || Sparkles;
    const lower = name.toLowerCase();
    if (lower.includes('tahfidz') || lower.includes('quran')) return BookOpen;
    if (lower.includes('bahasa') || lower.includes('literasi')) return Globe;
    if (lower.includes('sains') || lower.includes('matematika')) return Award;
    if (lower.includes('seni') || lower.includes('kaligrafi')) return Compass;
    if (lower.includes('pramuka')) return Users;
    if (lower.includes('perpustakaan') || lower.includes('buku')) return BookMarked;
    return defaultIcon;
  };

  const renderLogoText = () => {
    const name = general.school_name || 'Si@Kad';
    if (name.includes('@')) {
      const parts = name.split('@');
      return (
        <>
          {parts[0]}
          <span style={{ color: '#FFD700', filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.9))', fontWeight: 'bold' }}>@</span>
          {parts[1]}
        </>
      );
    }
    return name;
  };

  return (
    <footer className="bg-slate-950 text-white pb-24 lg:pb-12 border-t border-slate-800/80 print:hidden relative overflow-hidden">
      {/* Decorative Subtle Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-teal-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 pt-12 md:pt-16 pb-8 relative z-10">
        {/* 3 Column Main Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
          
          {/* Kolom 1: Profil Madrasah & Informasi Kontak */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-2xl tracking-tight text-white">
                  {renderLogoText()}
                </h3>
                <p className="text-emerald-400 text-xs font-medium">
                  {general.tagline || "Sistem Informasi Akademik Modern Si@Kad Madrasah"}
                </p>
              </div>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {general.tagline || "Sistem Informasi Akademik Madrasah yang berprestasi, berakhlak mulia, dan siap menghadapi tantangan masa depan."}
            </p>

            {/* Direct Contact Badges */}
            <div className="space-y-2.5 pt-1 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="leading-tight">{general.address || 'Jl. Pendidikan No. 123, Kabupaten/Kota'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span>{general.phone || '(021) 1234-5678'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{general.email || 'info@siakad.sch.id'}</span>
              </div>
            </div>

            {/* Social Media Buttons */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Media Sosial</p>
              <div className="flex items-center gap-2">
                {socialLinks.map((social, index) => (
                  <a 
                    key={index}
                    href={social.href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 bg-slate-900 border border-slate-800/90 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-500 transition-all duration-300 text-slate-400 hover:text-white hover:scale-105 shadow-sm"
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Kolom 2: Navigasi Cepat (Modern Iconic Menu) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-200">Navigasi Utama</h4>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {quickLinks.map((link, index) => {
                const IconComponent = link.icon || getQuickLinkIcon(link.name, index);
                return (
                  <a 
                    key={index}
                    href={link.href} 
                    className="group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:bg-emerald-950/40 hover:border-emerald-700/50 transition-all duration-200 text-slate-300 hover:text-emerald-300 min-w-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-800/90 group-hover:bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 transition-colors">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold group-hover:translate-x-0.5 transition-transform truncate">{link.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Kolom 3: Program & Layanan Unggulan (Modern Iconic Menu) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-200">Program & Layanan</h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {programs.map((program, index) => {
                const IconComponent = program.icon || getProgramIcon(program.name, index);
                return (
                  <a 
                    key={index}
                    href={program.href} 
                    className="group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:bg-teal-950/40 hover:border-teal-700/50 transition-all duration-200 text-slate-300 hover:text-teal-300 min-w-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-800/90 group-hover:bg-teal-600/20 text-teal-400 flex items-center justify-center shrink-0 transition-colors">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold group-hover:translate-x-0.5 transition-transform truncate">{program.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-slate-800/80 mt-12 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-slate-500 text-xs text-center sm:text-left">
                {footerSettings.copyright_text || `© ${new Date().getFullYear()} ${general.school_name || 'Si@Kad'}. Hak Cipta Dilindungi.`}
              </p>
              <p className="text-emerald-500/70 text-[10px] flex items-center justify-center sm:justify-start gap-1 font-medium">
                Developed by <span className="text-emerald-400 font-bold">{footerSettings.developer_name || 'Jaenal Maskun, S.Pd.I'}</span>
              </p>
            </div>
            <p className="text-slate-400 text-xs flex items-center gap-1 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full shadow-2xs">
              Dibuat dengan <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" /> untuk pendidikan Indonesia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;