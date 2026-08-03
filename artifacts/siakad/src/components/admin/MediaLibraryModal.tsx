import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Search, Check, Loader2, RefreshCw, Layers } from 'lucide-react';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  title?: string;
}

interface MediaItem {
  id: string;
  url: string;
  title?: string;
  category: string;
  source: string;
}

const DEFAULT_FALLBACK_IMG = "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600&auto=format&fit=crop";

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  title = "Galeri Foto & Media Tersimpan"
}) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [customUrl, setCustomUrl] = useState<string>('');

  const fetchMedia = async () => {
    setLoading(true);
    const mediaList: MediaItem[] = [];
    const urlSet = new Set<string>();

    const addUniqueUrl = (url: string, category: string, title?: string, source: string = 'Sistem') => {
      if (!url || typeof url !== 'string' || url.trim() === '') return;
      const cleanUrl = url.trim();
      if (!urlSet.has(cleanUrl)) {
        urlSet.add(cleanUrl);
        mediaList.push({
          id: `${category}-${mediaList.length}-${Date.now()}`,
          url: cleanUrl,
          title: title || `Foto ${category}`,
          category,
          source
        });
      }
    };

    try {
      // 1. Fetch site_settings
      const { data: settingsData } = await supabase.from('site_settings').select('*');
      if (settingsData) {
        settingsData.forEach((row: any) => {
          const val = row.value || {};
          if (row.id === 'hero') {
            if (val.background_image) addUniqueUrl(val.background_image, 'hero', 'Hero Background', 'Settings');
            if (val.right_image) addUniqueUrl(val.right_image, 'hero', 'Hero Gambar Kanan', 'Settings');
            if (Array.isArray(val.images)) {
              val.images.forEach((img: any, idx: number) => {
                const u = typeof img === 'string' ? img : img?.url;
                if (u) addUniqueUrl(u, 'hero', img?.title || `Hero Slider #${idx + 1}`, 'Settings');
              });
            }
          }
          if (row.id === 'about') {
            if (val.image_url) addUniqueUrl(val.image_url, 'tentang', 'Tentang Madrasah', 'Settings');
            if (Array.isArray(val.images)) {
              val.images.forEach((img: any, idx: number) => {
                const u = typeof img === 'string' ? img : img?.url;
                if (u) addUniqueUrl(u, 'tentang', img?.title || `Tentang Slider #${idx + 1}`, 'Settings');
              });
            }
          }
          if (row.id === 'seo' && val.image_url) {
            addUniqueUrl(val.image_url, 'seo', 'SEO Meta Image', 'Settings');
          }
        });
      }

      // 2. Fetch gallery
      const { data: galleryData } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (galleryData) {
        galleryData.forEach((item: any) => {
          if (item.image_url) {
            addUniqueUrl(item.image_url, 'galeri', item.title || 'Foto Galeri', 'Galeri');
          }
          if (Array.isArray(item.images)) {
            item.images.forEach((u: string) => addUniqueUrl(u, 'galeri', item.title || 'Foto Galeri', 'Galeri'));
          }
        });
      }

      // 3. Fetch posts
      const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (postsData) {
        postsData.forEach((item: any) => {
          if (item.image_url) {
            addUniqueUrl(item.image_url, 'berita', item.title || 'Foto Berita', 'Berita');
          }
          if (Array.isArray(item.images)) {
            item.images.forEach((u: string) => addUniqueUrl(u, 'berita', item.title || 'Foto Berita', 'Berita'));
          }
        });
      }

      // 4. Fetch announcements
      const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (annData) {
        annData.forEach((item: any) => {
          if (item.image_url) {
            addUniqueUrl(item.image_url, 'pengumuman', item.title || 'Foto Pengumuman', 'Pengumuman');
          }
          if (Array.isArray(item.images)) {
            item.images.forEach((u: string) => addUniqueUrl(u, 'pengumuman', item.title || 'Foto Pengumuman', 'Pengumuman'));
          }
        });
      }

      // 5. Check localStorage backups
      try {
        const localKeys = Object.keys(localStorage);
        localKeys.forEach((key) => {
          if (key.includes('identitas') || key.includes('settings') || key.includes('activity')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.logo_url) addUniqueUrl(parsed.logo_url, 'logo', 'Logo Madrasah', 'Identitas');
              if (Array.isArray(parsed?.activity_groups)) {
                parsed.activity_groups.forEach((g: any) => {
                  if (Array.isArray(g.urls)) {
                    g.urls.forEach((u: string) => addUniqueUrl(u, 'kegiatan', g.title || 'Foto Kegiatan', 'Kegiatan'));
                  }
                });
              }
            }
          }
        });
      } catch (e) {
        console.warn("Error reading localStorage images:", e);
      }

    } catch (err) {
      console.error("Error fetching media library:", err);
    } finally {
      setItems(mediaList);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen]);

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'semua' || item.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'semua', label: 'Semua Foto' },
    { id: 'hero', label: 'Hero / Sliders' },
    { id: 'tentang', label: 'Tentang Madrasah' },
    { id: 'galeri', label: 'Galeri Media' },
    { id: 'berita', label: 'Berita & Artikel' },
    { id: 'pengumuman', label: 'Pengumuman' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white shadow-2xl border-0">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Pilih dari foto yang pernah diunggah sebelumnya tanpa perlu upload ulang.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchMedia}
              disabled={loading}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>

          {/* Search & Categories Bar */}
          <div className="mt-4 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari foto berdasarkan judul atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl text-xs bg-white border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Media Grid Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 min-h-[300px]">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-xs font-bold">Memuat koleksi foto tersimpan...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <Layers className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Belum ada foto tersimpan</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Foto yang Anda unggah melalui menu Hero, Galeri, atau Berita akan otomatis tersimpan di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-400 transition-all flex flex-col"
                >
                  <div className="aspect-video w-full relative bg-slate-100 overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.title || 'Foto Media'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMG;
                      }}
                    />
                    <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/95 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">
                      {item.title}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onSelectImage(item.url);
                        onClose();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 rounded-xl gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Gunakan Foto Ini
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer for Custom URL input */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex-1 w-full flex items-center gap-2">
            <Input
              placeholder="Atau masukkan URL Foto langsung (http/https)..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="text-xs h-9 rounded-xl border-slate-200"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!customUrl.trim()}
              onClick={() => {
                if (customUrl.trim()) {
                  onSelectImage(customUrl.trim());
                  setCustomUrl('');
                  onClose();
                }
              }}
              className="rounded-xl text-xs font-bold h-9 shrink-0"
            >
              Gunakan URL
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-bold text-slate-500 h-9"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
