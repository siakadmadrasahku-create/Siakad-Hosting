"use client";

import React, { useState, useEffect } from 'react';
import { Megaphone, X, ExternalLink, ChevronRight, Bell, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const THEME_STYLES: Record<string, {
  container: string;
  badge: string;
  badgeText: string;
  text: string;
  accentBtn: string;
  closeBtn: string;
}> = {
  emerald: {
    container: 'bg-emerald-950/95 text-emerald-100 border-t border-emerald-800/80 shadow-[0_-4px_20px_rgba(6,78,59,0.3)]',
    badge: 'bg-emerald-500 text-white font-extrabold shadow-sm',
    badgeText: 'text-white',
    text: 'text-emerald-100 font-medium',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    closeBtn: 'text-emerald-300 hover:text-white hover:bg-emerald-800/60'
  },
  dark: {
    container: 'bg-slate-950/95 text-slate-100 border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]',
    badge: 'bg-amber-500 text-slate-950 font-extrabold shadow-sm',
    badgeText: 'text-slate-950',
    text: 'text-slate-200 font-medium',
    accentBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    closeBtn: 'text-slate-400 hover:text-white hover:bg-slate-800/60'
  },
  indigo: {
    container: 'bg-indigo-950/95 text-indigo-100 border-t border-indigo-800/80 shadow-[0_-4px_20px_rgba(30,27,75,0.3)]',
    badge: 'bg-indigo-500 text-white font-extrabold shadow-sm',
    badgeText: 'text-white',
    text: 'text-indigo-100 font-medium',
    accentBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    closeBtn: 'text-indigo-300 hover:text-white hover:bg-indigo-800/60'
  },
  amber: {
    container: 'bg-amber-950/95 text-amber-100 border-t border-amber-800/80 shadow-[0_-4px_20px_rgba(120,53,15,0.3)]',
    badge: 'bg-amber-500 text-slate-950 font-extrabold shadow-sm',
    badgeText: 'text-slate-950',
    text: 'text-amber-100 font-medium',
    accentBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    closeBtn: 'text-amber-300 hover:text-white hover:bg-amber-800/60'
  },
  rose: {
    container: 'bg-rose-950/95 text-rose-100 border-t border-rose-800/80 shadow-[0_-4px_20px_rgba(136,19,55,0.3)]',
    badge: 'bg-rose-500 text-white font-extrabold shadow-sm',
    badgeText: 'text-white',
    text: 'text-rose-100 font-medium',
    accentBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
    closeBtn: 'text-rose-300 hover:text-white hover:bg-rose-800/60'
  }
};

const RunningTextTicker: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isHidden = sessionStorage.getItem('siakad_hide_running_text');
    if (isHidden === 'true') {
      setDismissed(true);
    }
  }, []);

  // Jangan tampilkan di halaman admin, login, atau signup
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/signup'
  ) {
    return null;
  }

  const config = settings.running_text || {};
  const isEnabled = config.enabled !== false;

  if (!isEnabled || dismissed) {
    return null;
  }

  const rawText = config.text || 'Selamat Datang di Si@Kad Madrasah!';
  const direction = config.direction || 'right_to_left'; // 'left_to_right' or 'right_to_left'
  const speed = config.speed || 'normal'; // 'slow', 'normal', 'fast'
  const badgeLabel = config.badge || 'INFORMASI MADRASAH';
  const colorThemeKey = config.bg_color || 'emerald';
  const theme = THEME_STYLES[colorThemeKey] || THEME_STYLES.emerald;
  const linkUrl = config.link_url || '';
  const linkLabel = config.link_label || 'Lihat Detail';
  const showCloseBtn = config.show_close_button !== false;

  // Duration mapping (longer duration = slower scrolling speed)
  let animationDuration = '65s';
  if (speed === 'slow') animationDuration = '95s';
  if (speed === 'fast') animationDuration = '35s';

  const isLtr = direction === 'left_to_right';
  const marqueeClass = isLtr ? 'animate-marquee-ltr' : 'animate-marquee-rtl';

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('siakad_hide_running_text', 'true');
  };

  const handleLinkClick = () => {
    if (!linkUrl) return;
    if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(linkUrl);
    }
  };

  return (
    <div 
      className={`fixed left-0 right-0 z-30 print:hidden transition-all duration-300 backdrop-blur-md ${theme.container}
        bottom-[62px] lg:bottom-0`}
    >
      <div className="w-full px-2 sm:px-4 h-7 sm:h-8 flex items-center gap-1.5 sm:gap-2">
        {/* Badge Papan Informasi (Pinned Left) */}
        <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] tracking-wide uppercase z-10 ${theme.badge}`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
          </span>
          <Megaphone className="w-3 h-3 shrink-0 hidden xs:inline" />
          <span className="font-extrabold whitespace-nowrap">{badgeLabel}</span>
        </div>

        {/* Separator Line */}
        <div className="h-3.5 w-px bg-white/20 shrink-0 hidden sm:block" />

        {/* Running Text Container */}
        <div className="flex-1 overflow-hidden relative flex items-center h-full select-none">
          <div 
            className={`whitespace-nowrap animate-marquee-pause ${marqueeClass} inline-flex items-center pl-[100%] pr-24`}
            style={{ animationDuration }}
          >
            <span className={`text-[11px] sm:text-xs ${theme.text} inline-flex items-center gap-6 font-semibold`}>
              <span className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 inline" />
                <span>{rawText}</span>
              </span>
              <span className="opacity-40 font-bold">•</span>
              <span className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 inline" />
                <span>{rawText}</span>
              </span>
              <span className="opacity-40 font-bold">•</span>
              <span className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 inline" />
                <span>{rawText}</span>
              </span>
              <span className="opacity-40 font-bold">•</span>
              <span className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0 inline" />
                <span>{rawText}</span>
              </span>
            </span>
          </div>
        </div>

        {/* Optional Action Button (Pinned Right) */}
        {linkUrl && (
          <div className="shrink-0 flex items-center z-10 pl-0.5">
            <button
              onClick={handleLinkClick}
              className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 transition-transform active:scale-95 h-5 sm:h-6 ${theme.accentBtn}`}
            >
              <span>{linkLabel}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunningTextTicker;
