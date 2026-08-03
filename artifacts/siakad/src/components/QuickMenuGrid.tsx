"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  LayoutGrid, 
  Library, 
  BookOpen, 
  Presentation, 
  Sparkles, 
  Languages, 
  Award, 
  Link as LinkIcon, 
  Bell, 
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Compass
} from 'lucide-react';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const menuItems: MenuItem[] = [
  {
    name: 'Kelas & Siswa',
    href: '/students-list',
    icon: Users,
    color: 'text-emerald-600 group-hover:text-emerald-700',
    bgColor: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
  },
  {
    name: 'Kalender',
    href: '/calendar',
    icon: Calendar,
    color: 'text-blue-600 group-hover:text-blue-700',
    bgColor: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
  },
  {
    name: 'Jadwal KBM',
    href: '/jadwal',
    icon: LayoutGrid,
    color: 'text-cyan-600 group-hover:text-cyan-700',
    bgColor: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white'
  },
  {
    name: 'Perpustakaan',
    href: '/library',
    icon: Library,
    color: 'text-purple-600 group-hover:text-purple-700',
    bgColor: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
  },
  {
    name: 'Materi Interaktif',
    href: '/materi-interaktif',
    icon: BookOpen,
    color: 'text-amber-600 group-hover:text-amber-700',
    bgColor: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
  },
  {
    name: 'Alat Mengajar',
    href: '/teaching-aids',
    icon: Presentation,
    color: 'text-sky-600 group-hover:text-sky-700',
    bgColor: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white'
  },
  {
    name: 'AI Translator',
    href: '/translator',
    icon: Languages,
    color: 'text-orange-600 group-hover:text-orange-700',
    bgColor: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
  },
  {
    name: 'Kartu Peserta',
    href: '/exam-cards',
    icon: Award,
    color: 'text-teal-600 group-hover:text-teal-700',
    bgColor: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white'
  },
  {
    name: 'AI Teaching',
    href: '/ai-teaching',
    icon: Sparkles,
    color: 'text-violet-600 group-hover:text-violet-700',
    bgColor: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white'
  },
  {
    name: 'Tautan Resmi',
    href: '/links',
    icon: LinkIcon,
    color: 'text-slate-600 group-hover:text-slate-800',
    bgColor: 'bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white'
  },
  {
    name: 'Berita & Info',
    href: '/#announcements',
    icon: Bell,
    color: 'text-rose-600 group-hover:text-rose-700',
    bgColor: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
  },
  {
    name: 'SPMB Online',
    href: '/spmb',
    icon: GraduationCap,
    color: 'text-emerald-700 group-hover:text-emerald-800',
    bgColor: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white'
  }
];

const QuickMenuGrid = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="py-2 sm:py-4 bg-slate-50/90 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
            Akses Cepat Layanan & Fitur
          </span>
          {menuItems.length > 9 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="sm:hidden text-[10px] font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5"
            >
              <span>{isExpanded ? 'Ringkas' : 'Semua'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Minimalist Ultra-Compact Menu Strip Grid - Exactly 3 columns on mobile */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1 sm:gap-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isHiddenOnMobile = index >= 9 && !isExpanded;
            return (
              <a
                key={index}
                href={item.href}
                className={`group ${
                  isHiddenOnMobile ? 'hidden sm:flex' : 'flex'
                } flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-0.5 sm:gap-2.5 p-1 sm:p-2 rounded-lg sm:rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all duration-200`}
              >
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg ${item.bgColor} flex items-center justify-center shrink-0 transition-colors duration-200`}>
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <span className={`text-[10px] sm:text-xs font-bold text-slate-800 ${item.color} whitespace-normal leading-tight w-full transition-colors text-center sm:text-left break-words`}>
                  {item.name}
                </span>
              </a>
            );
          })}
        </div>

        {/* Bottom Expand Toggle Button on Mobile */}
        {menuItems.length > 9 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden w-full mt-2 py-1.5 px-3 rounded-lg bg-white border border-slate-200/90 text-[11px] font-extrabold text-slate-600 hover:text-emerald-700 hover:bg-slate-50 flex items-center justify-center gap-1 transition-all shadow-2xs"
          >
            {isExpanded ? (
              <>
                <span>Lihat Lebih Sedikit</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              </>
            ) : (
              <>
                <span>Lihat Semua Menu ({menuItems.length})</span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};

export default QuickMenuGrid;

