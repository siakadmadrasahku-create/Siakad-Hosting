"use client";

import React from 'react';
import { 
  Home, Users, Bell, LayoutGrid, UserCircle, Brain, Link as LinkIcon,
  BookOpen, Sparkles, Calendar, Phone, Mail, Info, FileText, Award,
  Image, Compass, Heart, Globe, ShoppingBag, HelpCircle, MessageSquare, Star, Shield,
  School, LayoutDashboard, UserCheck
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Brain,
  Link: LinkIcon,
  LinkIcon,
  Users,
  UserCircle,
  Bell,
  LayoutGrid,
  BookOpen,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  Info,
  FileText,
  Award,
  Image,
  Compass,
  Heart,
  Globe,
  ShoppingBag,
  HelpCircle,
  MessageSquare,
  Star,
  Shield,
  School,
  LayoutDashboard,
  UserCheck
};

const StickyFooter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  
  // Jangan tampilkan di login atau signup
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const isAdminRoute = location.pathname.startsWith('/admin');

  const adminMenuItems = [
    { icon_name: 'LayoutDashboard', label: 'Dashboard', path: '/admin' },
    { icon_name: 'Users', label: 'Data Siswa', path: '/admin/manajemen-siswa' },
    { icon_name: 'School', label: 'Kelola Rombel', path: '/admin/manajemen-rombel' },
    { icon_name: 'UserCheck', label: 'Data GTK', path: '/admin/teachers' },
    { icon_name: 'Globe', label: 'Portal Web', path: '/' },
  ];

  const defaultMenuItems = [
    { icon_name: 'Home', label: 'Beranda', path: '/' },
    { icon_name: 'Brain', label: 'Modul Ajar KBC', path: '/ai-teaching' }, 
    { icon_name: 'Link', label: 'Tautan', path: '/links' },
    { icon_name: 'Users', label: 'SPMB', path: '/spmb' },
    { icon_name: 'UserCircle', label: 'Admin', path: '/login' },
  ];

  const rawItems = isAdminRoute
    ? adminMenuItems
    : (settings.sticky_footer?.items?.length > 0 
        ? settings.sticky_footer.items 
        : defaultMenuItems).map((item: any) => {
          if (item.label === 'AI Teach' || item.label === 'AI Teaching') {
            return { ...item, label: 'Modul Ajar KBC' };
          }
          return item;
        });

  const handleNav = (path: string) => {
    if (!path) return;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }
    if (path.startsWith('/#')) {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById(path.substring(2));
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const el = document.getElementById(path.substring(2));
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden print:hidden">
      <div className="bg-white/80 backdrop-blur-lg border-t border-gray-100 px-4 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {rawItems.map((item: any, i: number) => {
          const IconComponent = ICON_MAP[item.icon_name] || ICON_MAP[item.icon] || Globe;
          return (
            <button
              key={i}
              onClick={() => handleNav(item.path)}
              className="flex flex-col items-center gap-0.5 group flex-1 max-w-[70px] min-w-0"
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive(item.path) 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : 'text-gray-400 group-hover:text-gray-600'
              }`}>
                <IconComponent className="w-5 h-5 shrink-0" />
              </div>
              <span className={`text-[9px] font-bold transition-colors truncate w-full text-center ${
                isActive(item.path) ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StickyFooter;