"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  [key: string]: any;
}

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

// Default settings hanya sebagai struktur awal, akan digantikan sepenuhnya oleh data DB
const defaultSettings = {
  general: { 
    school_name: 'Si@Kad', 
    tagline: "Sistem Informasi Akademik Modern",
    address: '',
    phone: '',
    email: '',
    operational_hours: '',
    headmaster_name: '',
    headmaster_title: 'Kepala Madrasah',
    maps_latitude: '-7.517606',
    maps_longitude: '109.132984',
    maps_zoom: '16',
    maps_embed_url: ''
  },
  seo: {
    title: '',
    description: '',
    website_url: '',
    image_url: '',
    og_image_type: '',
    og_image_updated_at: '',
    og_title: '',
    og_description: '',
    og_image_url: '',
    twitter_title: '',
    twitter_description: '',
    twitter_site: '',
    twitter_creator: ''
  },
  api_keys: {
    preferred_provider: 'auto',
    gemini_api_key: '',
    openai_api_key: '',
    openrouter_api_key: '',
    custom_ai_prompt: 'Anda adalah asisten AI untuk Si@Kad.'
  },
  tahun_pelajaran: {
    active_year: '2026/2027',
    available_years: ['2026/2027', '2025/2026', '2024/2025', '2023/2024'],
    spmb_year: '2026/2027',
    semester: 'Ganjil'
  },
  print_settings: {
    margin_top: 2,
    margin_bottom: 2,
    margin_left: 2,
    margin_right: 2,
    paper_size: 'A4',
    font_size: 11,
    show_kop: true,
    show_signature: true
  },
  hero: { 
    badge_text: 'Eksklusif & Modern',
    heading_line1: 'Si@Kad',
    heading_line2: 'Madrasah',
    description: '',
    cta_primary: 'Daftar Sekarang',
    cta_secondary: 'Lihat Profil',
    stats_students: '0', 
    stats_achievements: '0', 
    stats_teachers: '0', 
    stats_years: '0',
    background_image: '',
    right_image: '',
    images: [],
    right_image_title: 'Pendidikan Berkarakter',
    right_image_subtitle: 'Terakreditasi & Berprestasi'
  },
  about: { 
    title: '', 
    description: '',
    experience_years: '',
    image_title: 'Mengenal Madrasah',
    image_subtitle: 'Unggul & Berakhlak',
    images: []
  },
  programs: {
    list: []
  },
  footer: {
    quick_links: [
      { name: 'Beranda', href: '#home' },
      { name: 'Tentang Kami', href: '#about' },
      { name: 'Program', href: '#programs' },
      { name: 'Galeri', href: '#gallery' },
      { name: 'Kontak', href: '#contact' },
    ],
    programs_links: [
      { name: 'Tahfidz Al-Quran', href: '#programs' },
      { name: 'Bahasa Arab', href: '#programs' },
      { name: 'Matematika Islam', href: '#programs' },
      { name: 'Seni Kaligrafi', href: '#programs' },
    ],
    facebook: '#',
    instagram: '#',
    youtube: '#',
    twitter: '#',
    copyright_text: '',
    developer_name: 'Jaenal Maskun, S.Pd.I'
  },
  running_text: {
    enabled: true,
    text: 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Tahun Pelajaran 2025/2026 Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
    direction: 'right_to_left',
    speed: 'normal',
    badge: 'INFORMASI MADRASAH',
    bg_color: 'emerald',
    link_url: '',
    link_label: '',
    show_close_button: true,
    archive: [
      {
        id: '1',
        text: 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Tahun Pelajaran 2025/2026 Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
        badge: 'INFORMASI MADRASAH',
        direction: 'right_to_left',
        speed: 'normal',
        bg_color: 'emerald',
        link_url: '/spmb',
        link_label: 'Lihat SPMB',
        created_at: new Date().toISOString()
      }
    ]
  },
  sticky_footer: {
    items: [
      { icon_name: 'Home', label: 'Beranda', path: '/' },
      { icon_name: 'Brain', label: 'Modul Ajar KBC', path: '/ai-teaching' },
      { icon_name: 'Link', label: 'Tautan', path: '/links' },
      { icon_name: 'Users', label: 'SPMB', path: '/spmb' },
      { icon_name: 'UserCircle', label: 'Admin', path: '/login' },
    ]
  }
};

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const cached = localStorage.getItem('siakad_site_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...defaultSettings, ...parsed };
      }
    } catch (e) {
      // Ignore cache parse error
    }
    return defaultSettings;
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      // Timeout promise to ensure Supabase statement timeouts don't block the UI
      const fetchPromise = supabase.from('site_settings').select('*');
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), 5000)
      );

      const response: any = await Promise.race([fetchPromise, timeoutPromise]).catch((err) => {
        console.warn("[SiteSettings] Supabase fetch timed out or failed:", err.message || err);
        return null;
      });

      if (!response || response.error) {
        if (response?.error) {
          console.warn("[SiteSettings] Supabase returned error:", response.error.message);
        }
        return;
      }

      const { data } = response;

      // Mulai dengan struktur default
      const settingsMap = JSON.parse(JSON.stringify(defaultSettings));
      
      if (data && data.length > 0) {
        data.forEach((item: any) => {
          if (item.id && item.value !== undefined) {
            settingsMap[item.id] = item.value;
            if (item.id.includes('_madrasah_')) {
              const baseKey = item.id.split('_madrasah_')[0];
              if (baseKey) {
                settingsMap[baseKey] = item.value;
              }
            }
          }
        });
      }

      // Sanitize hero heading to ensure "Membangun Generasi Qur'ani" is permanently replaced
      if (settingsMap.hero) {
        if (!settingsMap.hero.heading_line1 || settingsMap.hero.heading_line1.includes('Membangun Generasi')) {
          settingsMap.hero.heading_line1 = 'Si@Kad';
        }
        if (!settingsMap.hero.heading_line2 || settingsMap.hero.heading_line2.includes("Qur'ani")) {
          settingsMap.hero.heading_line2 = 'Madrasah';
        }
      }

      // Normalize sticky footer menu items
      if (Array.isArray(settingsMap.sticky_footer?.items)) {
        settingsMap.sticky_footer.items = settingsMap.sticky_footer.items.map((it: any) => {
          if (it.label === 'AI Teach' || it.label === 'AI Teaching') {
            return { ...it, label: 'Modul Ajar KBC' };
          }
          return it;
        });
      }
      
      // Normalize SEO image & description settings
      if (settingsMap.seo) {
        const cleanDesc = (settingsMap.seo.description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        settingsMap.seo.description = cleanDesc;
        settingsMap.seo.og_description = (settingsMap.seo.og_description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        settingsMap.seo.twitter_description = (settingsMap.seo.twitter_description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();

        // Normalize image url
        let ogImg = settingsMap.seo.image_url || settingsMap.seo.og_image_url || '';
        if (ogImg.includes('tmpfiles.org')) {
          ogImg = '';
        }
        settingsMap.seo.image_url = ogImg;
        settingsMap.seo.og_image_url = ogImg;
        settingsMap.seo.og_image_type = typeof settingsMap.seo.og_image_type === 'string' ? settingsMap.seo.og_image_type.trim() : '';
        settingsMap.seo.og_image_updated_at = typeof settingsMap.seo.og_image_updated_at === 'string' ? settingsMap.seo.og_image_updated_at.trim() : '';

        // Normalize website_url
        if (typeof settingsMap.seo.website_url === 'string') {
          settingsMap.seo.website_url = settingsMap.seo.website_url.trim();
        }
      }

      setSettings(settingsMap);
      try {
        localStorage.setItem('siakad_site_settings', JSON.stringify(settingsMap));
        const ogImageCandidate = settingsMap.seo?.image_url || settingsMap.seo?.og_image_url || settingsMap.identitas_madrasah?.logo_url;
        if (ogImageCandidate && typeof ogImageCandidate === 'string' && !ogImageCandidate.startsWith('data:')) {
          localStorage.setItem('siakad_og_image', ogImageCandidate);
        }
      } catch (e) {
        // Ignore localStorage error
      }
    } catch (error) {
      console.warn('[SiteSettings] Catch handler:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Real-time subscription untuk update instan tanpa reload
    const channel = supabase
      .channel('site_settings_realtime_global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
