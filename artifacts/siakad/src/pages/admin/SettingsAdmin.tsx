"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Settings, Globe, User, Sparkles, BookOpen, Plus, Trash2, Palette, Music, Calculator, Heart, Upload, X, ImageIcon, Loader2, UserCircle, Share2, Search, LayoutGrid, Smartphone, KeyRound, AlertCircle, Megaphone, ExternalLink, Copy, History, Check, Clock, Bookmark, Play, MapPin, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { compressImage, uploadImageToStorage, convertBase64ToPublicUrl } from '@/utils/imageCompression';
import { UpdatePasswordCard } from '@/components/admin/UpdatePasswordCard';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { appendVersionToAssetUrl, DEFAULT_OG_IMAGE_PATH, DEFAULT_SITE_URL, DEFAULT_SITE_URL_WITH_SLASH, normalizeSiteUrl, SEO_SHARE_IMAGE_STORAGE_PATH, stripVersionFromAssetUrl } from '@/config/site';
import { getGoogleMapEmbedUrl } from '@/components/Contact';

const availableIcons = [
  { value: 'Home', label: 'Beranda (Home)' },
  { value: 'Brain', label: 'Modul Ajar KBC (Brain)' },
  { value: 'Link', label: 'Tautan (Link)' },
  { value: 'Users', label: 'SPMB / Pengguna (Users)' },
  { value: 'UserCircle', label: 'Admin / Profil (UserCircle)' },
  { value: 'BookOpen', label: 'Buku / Program (BookOpen)' },
  { value: 'Sparkles', label: 'Fitur / Kilau (Sparkles)' },
  { value: 'Calendar', label: 'Jadwal (Calendar)' },
  { value: 'Phone', label: 'Telepon (Phone)' },
  { value: 'Mail', label: 'Email / Pesan (Mail)' },
  { value: 'Info', label: 'Informasi (Info)' },
  { value: 'FileText', label: 'Dokumen (FileText)' },
  { value: 'Award', label: 'Prestasi (Award)' },
  { value: 'Image', label: 'Galeri (Image)' },
  { value: 'Compass', label: 'Jelajah (Compass)' },
  { value: 'Heart', label: 'Favorit (Heart)' },
  { value: 'Globe', label: 'Situs / Publik (Globe)' },
  { value: 'ShoppingBag', label: 'Toko (ShoppingBag)' },
  { value: 'HelpCircle', label: 'Bantuan (HelpCircle)' },
  { value: 'MessageSquare', label: 'Obrolan (MessageSquare)' },
  { value: 'Star', label: 'Bintang (Star)' },
  { value: 'Shield', label: 'Keamanan (Shield)' },
];

interface TitleGroup {
  title: string;
  subtitle: string;
  urls: string[];
}

interface SlideListEditorProps {
  label: string;
  description: string;
  rawImages: any[];
  defaultTitle: string;
  defaultSubtitle: string;
  uploadType: 'hero_gallery' | 'about';
  onUpdate: (newItems: TitleGroup[]) => void;
}

const detectImageMimeType = (value?: string, fallback = 'image/jpeg') => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('.png')) return 'image/png';
  if (normalized.includes('.webp')) return 'image/webp';
  if (normalized.includes('.gif')) return 'image/gif';
  if (normalized.includes('.svg')) return 'image/svg+xml';
  return fallback;
};

const uploadSeoImageToStableStorage = async (file: File) => {
  const compressedFile = await compressImage(file);
  const targetBlob: Blob = compressedFile || file;
  const targetMimeType = targetBlob.type || file.type || detectImageMimeType(file.name);

  const { error } = await supabase.storage.from('public').upload(SEO_SHARE_IMAGE_STORAGE_PATH, targetBlob, {
    cacheControl: '0',
    upsert: true,
    contentType: targetMimeType,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('public').getPublicUrl(SEO_SHARE_IMAGE_STORAGE_PATH);
  if (!data?.publicUrl) {
    throw new Error('URL publik gambar SEO tidak tersedia');
  }

  return {
    publicUrl: data.publicUrl,
    imageType: targetMimeType,
  };
};

const parseRawToGroups = (rawImages: any[], defaultTitle: string, defaultSubtitle: string): TitleGroup[] => {
  if (!Array.isArray(rawImages) || rawImages.length === 0) {
    return [{ title: defaultTitle, subtitle: defaultSubtitle, urls: [] }];
  }

  const groups: TitleGroup[] = [];

  rawImages.forEach((item) => {
    if (!item) return;

    if (typeof item === 'string') {
      if (item.trim()) {
        groups.push({
          title: defaultTitle,
          subtitle: defaultSubtitle,
          urls: [item.trim()]
        });
      }
    } else if (typeof item === 'object') {
      const title = item.title !== undefined && item.title !== null ? item.title : defaultTitle;
      const subtitle = item.subtitle !== undefined && item.subtitle !== null ? item.subtitle : defaultSubtitle;
      let urls: string[] = [];

      if (Array.isArray(item.urls)) {
        urls = item.urls.filter((u: any) => typeof u === 'string' && u.trim());
      } else if (Array.isArray(item.images)) {
        urls = item.images.filter((u: any) => typeof u === 'string' && u.trim());
      } else if (typeof item.url === 'string' && item.url.trim()) {
        urls = [item.url.trim()];
      }

      groups.push({ title, subtitle, urls });
    }
  });

  if (groups.length === 0) {
    groups.push({ title: defaultTitle, subtitle: defaultSubtitle, urls: [] });
  }

  return groups;
};

const SlideListEditor: React.FC<SlideListEditorProps> = ({
  label,
  description,
  rawImages = [],
  defaultTitle,
  defaultSubtitle,
  uploadType,
  onUpdate
}) => {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [urlInputs, setUrlInputs] = useState<{ [key: number]: string }>({});
  const [activeMediaModalGroup, setActiveMediaModalGroup] = useState<number | null>(null);

  const groups = React.useMemo(() => {
    return parseRawToGroups(rawImages, defaultTitle, defaultSubtitle);
  }, [rawImages, defaultTitle, defaultSubtitle]);

  const handleUpdateGroups = (nextGroups: TitleGroup[]) => {
    onUpdate(nextGroups);
  };

  const handleFieldChange = (idx: number, field: 'title' | 'subtitle', value: string) => {
    const next = groups.map((g, i) => i === idx ? { ...g, [field]: value } : g);
    handleUpdateGroups(next);
  };

  const handleRemoveGroup = (idx: number) => {
    const next = groups.filter((_, i) => i !== idx);
    handleUpdateGroups(next.length > 0 ? next : [{ title: defaultTitle, subtitle: defaultSubtitle, urls: [] }]);
  };

  const handleAddGroup = () => {
    const next = [...groups, { title: `${defaultTitle} #${groups.length + 1}`, subtitle: defaultSubtitle, urls: [] }];
    handleUpdateGroups(next);
  };

  const handleRemovePhoto = (groupIdx: number, photoIdx: number) => {
    const next = groups.map((g, i) => {
      if (i === groupIdx) {
        return { ...g, urls: g.urls.filter((_, p) => p !== photoIdx) };
      }
      return g;
    });
    handleUpdateGroups(next);
  };

  const handleAddPhotoUrl = (groupIdx: number, newUrl?: string) => {
    const inputUrl = (newUrl || urlInputs[groupIdx] || '').trim();
    if (!inputUrl) return;

    const next = groups.map((g, i) => {
      if (i === groupIdx) {
        return { ...g, urls: [...g.urls, inputUrl] };
      }
      return g;
    });
    handleUpdateGroups(next);
    if (!newUrl) {
      setUrlInputs({ ...urlInputs, [groupIdx]: '' });
    }
  };

  const handleFileUploadForGroup = async (e: React.ChangeEvent<HTMLInputElement>, groupIdx: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingIndex(groupIdx);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = await uploadImageToStorage(file, 'settings');
        if (imageUrl) {
          uploadedUrls.push(imageUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        const next = groups.map((g, i) => {
          if (i === groupIdx) {
            return { ...g, urls: [...g.urls, ...uploadedUrls] };
          }
          return g;
        });
        handleUpdateGroups(next);
      }
      showSuccess(`Berhasil mengunggah ${uploadedUrls.length} foto kegiatan!`);
    } catch (err) {
      console.error("Upload error:", err);
      showError("Gagal mengunggah foto. Silakan coba lagi.");
    } finally {
      setUploadingIndex(null);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <div>
        <label className="block text-sm font-bold text-slate-800">{label}</label>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div className="space-y-4">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                Kelompok Judul #{gIdx + 1}
              </span>
              {groups.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 text-xs h-8"
                  onClick={() => handleRemoveGroup(gIdx)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Kelompok Judul
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Badge / Kegiatan</label>
                <Input
                  value={group.title}
                  onChange={(e) => handleFieldChange(gIdx, 'title', e.target.value)}
                  placeholder={`misal: ${defaultTitle}`}
                  className="bg-white rounded-xl text-xs h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subjudul / Keterangan Badge</label>
                <Input
                  value={group.subtitle}
                  onChange={(e) => handleFieldChange(gIdx, 'subtitle', e.target.value)}
                  placeholder={`misal: ${defaultSubtitle}`}
                  className="bg-white rounded-xl text-xs h-9"
                />
              </div>
            </div>

            {/* Multiple Photos Upload Section */}
            <div className="pt-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" /> Foto Kegiatan untuk "{group.title || `Judul #${gIdx + 1}`}" ({group.urls.length} foto)
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveMediaModalGroup(gIdx)}
                  className="h-8 text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Pilih dari Foto Tersimpan
                </Button>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 mb-3">
                {group.urls.map((url, pIdx) => (
                  <div key={pIdx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-300 group bg-slate-200">
                    <img 
                      src={url} 
                      alt={`Foto ${pIdx + 1}`} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=600&auto=format&fit=crop";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 w-7 p-0 rounded-full"
                        onClick={() => handleRemovePhoto(gIdx, pIdx)}
                        title="Hapus foto ini"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                      #{pIdx + 1}
                    </span>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 rounded-xl cursor-pointer transition-colors p-2 text-center group">
                  {uploadingIndex === gIdx ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  ) : (
                    <Plus className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-bold text-emerald-800 mt-1">
                    {uploadingIndex === gIdx ? 'Mengunggah...' : '+ Unggah Foto Baru'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUploadForGroup(e, gIdx)}
                    disabled={uploadingIndex !== null}
                  />
                </label>
              </div>

              {/* Paste Photo URL */}
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Atau tempel URL foto kegiatan di sini..."
                  value={urlInputs[gIdx] || ''}
                  onChange={(e) => setUrlInputs({ ...urlInputs, [gIdx]: e.target.value })}
                  className="bg-white text-xs h-8 rounded-lg flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0 px-3"
                  onClick={() => handleAddPhotoUrl(gIdx)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah URL
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddGroup}
        className="w-full bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 rounded-xl py-2.5 text-xs font-bold transition-colors"
      >
        <Plus className="w-4 h-4 mr-1.5 text-emerald-600" /> Tambah Kelompok Judul Kegiatan Baru
      </Button>

      {/* Media Library Modal for choosing existing photo for this group */}
      <MediaLibraryModal
        isOpen={activeMediaModalGroup !== null}
        onClose={() => setActiveMediaModalGroup(null)}
        onSelectImage={(url) => {
          if (activeMediaModalGroup !== null) {
            handleAddPhotoUrl(activeMediaModalGroup, url);
          }
        }}
        title={`Pilih Foto Tersimpan untuk ${groups[activeMediaModalGroup ?? 0]?.title || 'Kegiatan'}`}
      />
    </div>
  );
};

const iconOptions = [
  { value: 'BookOpen', label: 'Buku', icon: BookOpen },
  { value: 'Palette', label: 'Seni', icon: Palette },
  { value: 'Music', label: 'Musik', icon: Music },
  { value: 'Globe', label: 'Global', icon: Globe },
  { value: 'Calculator', label: 'Matematika', icon: Calculator },
  { value: 'Heart', label: 'Karakter', icon: Heart },
];

const colorOptions = [
  { value: 'bg-emerald-500', label: 'Hijau' },
  { value: 'bg-blue-500', label: 'Biru' },
  { value: 'bg-purple-500', label: 'Ungu' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-orange-500', label: 'Oranye' },
  { value: 'bg-red-500', label: 'Merah' },
];

const SettingsAdmin = () => {
  const { settings = {}, refreshSettings } = useSiteSettings();
  const identitas = settings?.identitas_madrasah || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [heroBgImgError, setHeroBgImgError] = useState(false);
  const [seoImgError, setSeoImgError] = useState(false);
  const [mediaModalTarget, setMediaModalTarget] = useState<'hero_bg' | 'seo' | null>(null);
  
  const [general, setGeneral] = useState({
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
  });

  const [seo, setSeo] = useState({
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
  });

  const [hero, setHero] = useState({
    background_image: '',
    right_image: '',
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
  });

  const [about, setAbout] = useState({
    title: "",
    description: '',
    images: [] as string[],
    experience_years: '',
    features: [
      { title: 'Kurikulum Terintegrasi', desc: '' },
      { title: 'Pendidikan Karakter', desc: '' },
      { title: 'Guru Profesional', desc: '' }
    ]
  });

  const [programs, setPrograms] = useState({
    list: [] as any[]
  });

  const [footer, setFooter] = useState({
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
  });

  const [stickyFooter, setStickyFooter] = useState({
    items: [
      { icon_name: 'Home', label: 'Beranda', path: '/' },
      { icon_name: 'Brain', label: 'Modul Ajar KBC', path: '/ai-teaching' },
      { icon_name: 'Link', label: 'Tautan', path: '/links' },
      { icon_name: 'Users', label: 'SPMB', path: '/spmb' },
      { icon_name: 'UserCircle', label: 'Admin', path: '/login' },
    ]
  });

  const [runningText, setRunningText] = useState({
    enabled: true,
    text: 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Tahun Pelajaran 2025/2026 Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
    direction: 'right_to_left',
    speed: 'normal',
    badge: 'INFORMASI MADRASAH',
    bg_color: 'emerald',
    link_url: '',
    link_label: 'Lihat Detail',
    show_close_button: true,
    archive: [] as Array<{
      id: string;
      text: string;
      badge?: string;
      direction?: string;
      speed?: string;
      bg_color?: string;
      link_url?: string;
      link_label?: string;
      created_at: string;
    }>
  });
  const [archiveSearch, setArchiveSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleApplyArchiveItem = (item: any) => {
    setRunningText(prev => ({
      ...prev,
      text: item.text || prev.text,
      badge: item.badge || prev.badge,
      direction: item.direction || prev.direction,
      speed: item.speed || prev.speed,
      bg_color: item.bg_color || prev.bg_color,
      link_url: item.link_url || '',
      link_label: item.link_label || 'Lihat Detail',
    }));
    showSuccess('Pesan dari arsip berhasil diterapkan ke form!');
  };

  const handleAddCurrentToArchive = () => {
    if (!runningText.text?.trim()) {
      showError('Teks pengumuman tidak boleh kosong');
      return;
    }
    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    const newItem = {
      id: Date.now().toString(),
      text: runningText.text.trim(),
      badge: runningText.badge || 'INFORMASI MADRASAH',
      direction: runningText.direction || 'right_to_left',
      speed: runningText.speed || 'normal',
      bg_color: runningText.bg_color || 'emerald',
      link_url: runningText.link_url || '',
      link_label: runningText.link_label || 'Lihat Detail',
      created_at: new Date().toISOString()
    };
    const updatedArchive = [newItem, ...currentArchive.filter(i => i.text.trim() !== newItem.text.trim())];
    const updated = { ...runningText, archive: updatedArchive };
    setRunningText(updated);
    handleSave('running_text', updated);
    showSuccess('Running text berhasil ditambahkan ke arsip!');
  };

  const handleDeleteArchiveItem = (id: string) => {
    const currentArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
    const updatedArchive = currentArchive.filter(item => item.id !== id);
    const updated = { ...runningText, archive: updatedArchive };
    setRunningText(updated);
    handleSave('running_text', updated);
    showSuccess('Item berhasil dihapus dari arsip!');
  };

  const handleCopyArchiveText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccess('Teks berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (settings.general) setGeneral(prev => ({ ...prev, ...settings.general }));
      if (settings.seo) {
        const s = { ...settings.seo };
        let img = s.image_url || s.og_image_url || '';
        if (img.includes('tmpfiles.org')) {
          img = '';
        }
        s.image_url = img;
        s.og_image_url = img;
        s.og_image_type = s.og_image_type || detectImageMimeType(img, '');
        s.og_image_updated_at = s.og_image_updated_at || '';
        setSeo(prev => ({ ...prev, ...s }));
      }
      if (settings.hero) {
        const h = { ...settings.hero };
        if (!h.heading_line1 || h.heading_line1.includes('Membangun Generasi')) {
          h.heading_line1 = 'Si@Kad';
        }
        if (!h.heading_line2 || h.heading_line2.includes("Qur'ani")) {
          h.heading_line2 = 'Madrasah';
        }
        setHero(prev => ({ ...prev, ...h }));
      }
      if (settings.about) {
        const val = settings.about;
        setAbout(prev => ({ 
          ...prev, 
          ...val, 
          images: val.images || (val.image_url ? [val.image_url] : []) 
        }));
      }
      if (settings.programs) setPrograms(prev => ({ ...prev, ...settings.programs }));
      if (settings.footer) setFooter(prev => ({ ...prev, ...settings.footer }));
      if (settings.sticky_footer) {
        const sf = { ...settings.sticky_footer };
        if (Array.isArray(sf.items)) {
          sf.items = sf.items.map((it: any) => {
            if (it.label === 'AI Teach' || it.label === 'AI Teaching') {
              return { ...it, label: 'Modul Ajar KBC' };
            }
            return it;
          });
        }
        setStickyFooter(sf);
      }
      if (settings.running_text) {
        setRunningText(prev => ({
          ...prev,
          ...settings.running_text,
          archive: Array.isArray(settings.running_text.archive) 
            ? settings.running_text.archive 
            : (prev.archive || [])
        }));
      }
      setLoading(false);
    }
  }, [settings]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'hero_bg' | 'hero_right' | 'hero_gallery' | 'about' | 'seo') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(type);
    try {
      if (type === 'about') {
        const rawExisting = (Array.isArray(about.images) && about.images.length > 0)
          ? about.images
          : (about.image_url ? [{ url: about.image_url, title: about.image_title || 'Mengenal Madrasah', subtitle: about.image_subtitle || 'Unggul & Berakhlak' }] : []);
        
        const newImages = rawExisting.map((item: any) => 
          typeof item === 'string' 
            ? { url: item, title: about.image_title || 'Mengenal Madrasah', subtitle: about.image_subtitle || 'Unggul & Berakhlak' } 
            : item
        );

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const finalUrl = await uploadImageToStorage(file, 'settings');
          newImages.push({
            url: finalUrl,
            title: about.image_title || 'Mengenal Madrasah',
            subtitle: about.image_subtitle || 'Unggul & Berakhlak'
          });
        }
        const updated = { ...about, images: newImages, image_url: newImages[0]?.url || about.image_url };
        setAbout(updated);
        await handleSave('about', updated);
      } else if (type === 'hero_gallery') {
        const rawExisting = (Array.isArray(hero.images) && hero.images.length > 0)
          ? hero.images
          : (hero.right_image ? [{ url: hero.right_image, title: hero.right_image_title || 'Pendidikan Berkarakter', subtitle: hero.right_image_subtitle || 'Terakreditasi & Berprestasi' }] : []);
        
        const currentImages = rawExisting.map((item: any) => 
          typeof item === 'string' 
            ? { url: item, title: hero.right_image_title || 'Pendidikan Berkarakter', subtitle: hero.right_image_subtitle || 'Terakreditasi & Berprestasi' } 
            : item
        );

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const finalUrl = await uploadImageToStorage(file, 'settings');
          currentImages.push({
            url: finalUrl,
            title: hero.right_image_title || 'Pendidikan Berkarakter',
            subtitle: hero.right_image_subtitle || 'Terakreditasi & Berprestasi'
          });
        }
        const updated = { 
          ...hero, 
          images: currentImages, 
          right_image: currentImages[0]?.url || hero.right_image 
        };
        setHero(updated);
        await handleSave('hero', updated);
      } else {
        const file = files[0];
        
        if (type === 'hero_bg') {
          const finalUrl = await uploadImageToStorage(file, 'settings');
          const updated = { ...hero, background_image: finalUrl };
          setHero(updated);
          await handleSave('hero', updated);
        } else if (type === 'hero_right') {
          const finalUrl = await uploadImageToStorage(file, 'settings');
          const updated = { ...hero, right_image: finalUrl };
          setHero(updated);
          await handleSave('hero', updated);
        } else if (type === 'seo') {
          let publicUrl = '';
          let imageType = file.type || detectImageMimeType(file.name);

          try {
            const uploaded = await uploadSeoImageToStableStorage(file);
            publicUrl = uploaded.publicUrl;
            imageType = uploaded.imageType;
          } catch (stableUploadError) {
            console.warn('Stable SEO image upload gagal, fallback ke upload umum:', stableUploadError);
            publicUrl = await uploadImageToStorage(file, 'settings');
            if (publicUrl.startsWith('data:')) {
              publicUrl = await convertBase64ToPublicUrl(publicUrl);
            }
            imageType = detectImageMimeType(publicUrl, imageType);
          }

          const updatedAt = new Date().toISOString();
          setSeoImgError(false);
          const updated = {
            ...seo,
            image_url: stripVersionFromAssetUrl(publicUrl),
            og_image_url: stripVersionFromAssetUrl(publicUrl),
            og_image_type: imageType,
            og_image_updated_at: updatedAt,
          };
          setSeo(updated);
          await handleSave('seo', updated);
        }
      }

      showSuccess('Gambar berhasil diunggah!');
    } catch (error: any) {
      showError('Gagal mengunggah gambar.');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const removeAboutImage = async (index: number) => {
    const newImages = (about.images || []).filter((_, i) => i !== index);
    const updated = { ...about, images: newImages };
    setAbout(updated);
    await handleSave('about', updated);
  };

  const removeHeroImage = async (index: number) => {
    const currentImages = (Array.isArray(hero.images) && hero.images.length > 0)
      ? [...hero.images]
      : (hero.right_image ? [hero.right_image] : []);
    const newImages = currentImages.filter((_, i) => i !== index);
    const updated = { ...hero, images: newImages, right_image: newImages[0] || '' };
    setHero(updated);
    await handleSave('hero', updated);
  };

  const handleSyncMetadata = async () => {
    setSaving(true);
    try {
      let imgUrl = seo?.image_url || seo?.og_image_url || identitas?.logo_url || '';
      if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:')) {
        imgUrl = await convertBase64ToPublicUrl(imgUrl);
      }
      imgUrl = stripVersionFromAssetUrl(imgUrl);
      const cleanDesc = (seo?.description || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
      const updatedSeo = { 
        ...seo, 
        image_url: imgUrl, 
        og_image_url: imgUrl,
        og_image_type: seo?.og_image_type || detectImageMimeType(imgUrl, ''),
        og_image_updated_at: seo?.og_image_updated_at || (imgUrl ? new Date().toISOString() : ''),
        title: seo?.title || general?.school_name || 'Si@Kad Madrasah',
        description: cleanDesc || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah',
        og_title: seo?.og_title || seo?.title || general?.school_name || 'Si@Kad Madrasah',
        og_description: (seo?.og_description || cleanDesc || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah'),
        twitter_title: seo?.twitter_title || seo?.og_title || seo?.title || general?.school_name || 'Si@Kad Madrasah',
        twitter_description: (seo?.twitter_description || seo?.og_description || cleanDesc || general?.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah')
      };
      setSeo(updatedSeo);
      await handleSave('seo', updatedSeo);
    } catch (e) {
      showError('Gagal sinkronisasi metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    try {
      let finalValue = value;
      if (key === 'seo') {
        let imgUrl = finalValue?.image_url || finalValue?.og_image_url || identitas?.logo_url || '';
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:')) {
          imgUrl = await convertBase64ToPublicUrl(imgUrl);
        }
        imgUrl = stripVersionFromAssetUrl(imgUrl);
        const cleanDesc = (finalValue?.description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        const cleanOgDesc = (finalValue?.og_description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        const cleanTwDesc = (finalValue?.twitter_description || '').replace(/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/gi, '').trim();
        const currentStoredImage = stripVersionFromAssetUrl(seo?.image_url || seo?.og_image_url || '');
        const nextImageVersion = imgUrl
          ? (finalValue?.og_image_updated_at || (imgUrl !== currentStoredImage ? new Date().toISOString() : seo?.og_image_updated_at || new Date().toISOString()))
          : '';
        const nextImageType = imgUrl ? (finalValue?.og_image_type || detectImageMimeType(imgUrl, 'image/jpeg')) : '';
        const versionedImgUrl = appendVersionToAssetUrl(imgUrl, nextImageVersion);

        finalValue = {
          ...finalValue,
          image_url: imgUrl,
          og_image_url: imgUrl,
          og_image_type: nextImageType,
          og_image_updated_at: nextImageVersion,
          description: cleanDesc,
          og_description: cleanOgDesc,
          twitter_description: cleanTwDesc
        };
        if (versionedImgUrl && typeof versionedImgUrl === 'string' && !versionedImgUrl.startsWith('data:')) {
          try {
            localStorage.setItem('siakad_og_image', versionedImgUrl);
          } catch (e) {
            console.warn('Unable to save siakad_og_image to localStorage:', e);
          }
        }

        // Real-time DOM Meta Sync for Social Media Crawlers
        try {
          const title = finalValue.title || general.school_name || 'Si@Kad Madrasah';
          const desc = finalValue.description || general.tagline || 'Sistem Informasi Akademik Modern';
          const ogTitle = finalValue.og_title || title;
          const ogDesc = finalValue.og_description || desc;
          const twitterTitle = finalValue.twitter_title || ogTitle || title;
          const twitterDesc = finalValue.twitter_description || ogDesc || desc;
          document.title = `${title} - ${desc}`;

          const updateMeta = (attr: string, keyName: string, val: string) => {
            let el = document.querySelector(`meta[${attr}="${keyName}"]`);
            if (!el) {
              el = document.createElement('meta');
              el.setAttribute(attr, keyName);
              document.head.appendChild(el);
            }
            el.setAttribute('content', val);
          };

          const updateLink = (rel: string, href: string) => {
            let el = document.querySelector(`link[rel="${rel}"]`);
            if (!el) {
              el = document.createElement('link');
              el.setAttribute('rel', rel);
              document.head.appendChild(el);
            }
            el.setAttribute('href', href);
          };

          updateMeta('property', 'og:title', ogTitle);
          updateMeta('property', 'og:description', ogDesc);
          updateMeta('property', 'og:site_name', title);
          updateMeta('name', 'twitter:title', twitterTitle);
          updateMeta('name', 'twitter:description', twitterDesc);
          updateMeta('name', 'description', desc);
          updateMeta('name', 'twitter:card', 'summary_large_image');
          if (finalValue.twitter_site) updateMeta('name', 'twitter:site', finalValue.twitter_site);
          if (finalValue.twitter_creator) updateMeta('name', 'twitter:creator', finalValue.twitter_creator);

          const canonicalBase = (finalValue.website_url && typeof finalValue.website_url === 'string')
            ? finalValue.website_url.trim().replace(/\/?$/, '/')
            : (typeof window !== 'undefined' ? `${window.location.origin.replace(/\/+$/, '')}/` : DEFAULT_SITE_URL_WITH_SLASH);
          updateMeta('property', 'og:url', canonicalBase);
          updateMeta('name', 'twitter:url', canonicalBase);
          updateLink('canonical', canonicalBase);

          if (versionedImgUrl && !versionedImgUrl.startsWith('data:')) {
            updateMeta('property', 'og:image', versionedImgUrl);
            updateMeta('property', 'og:image:url', versionedImgUrl);
            updateMeta('property', 'og:image:secure_url', versionedImgUrl);
            updateMeta('property', 'og:image:type', nextImageType || 'image/jpeg');
            updateMeta('name', 'twitter:image', versionedImgUrl);
            updateMeta('name', 'twitter:image:src', versionedImgUrl);
            updateMeta('name', 'image', versionedImgUrl);
            updateLink('image_src', versionedImgUrl);
          }
        } catch (err) {
          console.warn('DOM Meta sync warning:', err);
        }
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: key, value: finalValue, updated_at: new Date().toISOString() });

      if (error) throw error;
      
      await refreshSettings();
      
      if (key === 'general') setGeneral(finalValue);
      if (key === 'hero') setHero(finalValue);
      if (key === 'about') setAbout(finalValue);
      if (key === 'programs') setPrograms(finalValue);
      if (key === 'seo') setSeo(finalValue);
      if (key === 'footer') setFooter(finalValue);
      if (key === 'sticky_footer') setStickyFooter(finalValue);
      if (key === 'running_text') setRunningText(finalValue);

      if (key === 'seo') {
        showSuccess('Metadata OpenGraph & WhatsApp Berhasil Disinkronkan!');
      } else {
        showSuccess(`Pengaturan ${key} berhasil disimpan!`);
      }
    } catch (error: any) {
      showError('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const addStickyItem = () => {
    setStickyFooter(prev => ({
      ...prev,
      items: [...(prev.items || []), { icon_name: 'Home', label: 'Menu Baru', path: '/' }]
    }));
  };

  const removeStickyItem = (index: number) => {
    setStickyFooter(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateStickyItem = (index: number, field: string, value: string) => {
    setStickyFooter(prev => {
      const updated = [...(prev.items || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const syncStickyFromWebFooter = () => {
    if (footer?.quick_links && footer.quick_links.length > 0) {
      const itemsFromFooter = footer.quick_links.map((link: any) => {
        let icon_name = 'Globe';
        const nameLower = (link.name || '').toLowerCase();
        if (nameLower.includes('beranda') || link.href === '/') icon_name = 'Home';
        else if (nameLower.includes('tentang')) icon_name = 'Info';
        else if (nameLower.includes('program')) icon_name = 'BookOpen';
        else if (nameLower.includes('galeri')) icon_name = 'Image';
        else if (nameLower.includes('kontak')) icon_name = 'Phone';
        else if (nameLower.includes('spmb')) icon_name = 'Users';
        else if (nameLower.includes('ai') || nameLower.includes('teach')) icon_name = 'Brain';
        return {
          icon_name,
          label: link.name || 'Menu',
          path: link.href?.startsWith('#') ? `/${link.href}` : (link.href || '/')
        };
      });
      setStickyFooter({ items: itemsFromFooter });
      showSuccess('Menu sticky footer disamakan dengan Menu Quick Links Footer!');
    } else {
      showError('Menu Quick Links Web belum disetting.');
    }
  };

  const addQuickLink = () => {
    setFooter(prev => ({
      ...prev,
      quick_links: [...(prev.quick_links || []), { name: 'Menu Baru', href: '#' }]
    }));
  };

  const removeQuickLink = (index: number) => {
    setFooter(prev => ({
      ...prev,
      quick_links: prev.quick_links.filter((_, i) => i !== index)
    }));
  };

  const updateQuickLink = (index: number, field: string, value: string) => {
    setFooter(prev => {
      const updated = [...prev.quick_links];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, quick_links: updated };
    });
  };

  const addProgramLink = () => {
    setFooter(prev => ({
      ...prev,
      programs_links: [...(prev.programs_links || []), { name: 'Program Baru', href: '#programs' }]
    }));
  };

  const removeProgramLink = (index: number) => {
    setFooter(prev => ({
      ...prev,
      programs_links: prev.programs_links.filter((_, i) => i !== index)
    }));
  };

  const updateProgramLink = (index: number, field: string, value: string) => {
    setFooter(prev => {
      const updated = [...prev.programs_links];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, programs_links: updated };
    });
  };

  const addProgram = () => {
    setPrograms({
      ...programs,
      list: [...programs.list, { icon: 'BookOpen', title: 'Program Baru', description: 'Deskripsi program...', color: 'bg-emerald-500' }]
    });
  };

  const removeProgram = (index: number) => {
    const newList = [...programs.list];
    newList.splice(index, 1);
    setPrograms({ ...programs, list: newList });
  };

  const updateProgram = (index: number, field: string, value: string) => {
    const newList = [...programs.list];
    newList[index] = { ...newList[index], [field]: value };
    setPrograms({ ...programs, list: newList });
  };

  const seoImagePreviewUrl = appendVersionToAssetUrl(seo.image_url || seo.og_image_url, seo.og_image_updated_at);
  const socialPreviewImageUrl = appendVersionToAssetUrl(seo.image_url || seo.og_image_url || identitas.logo_url, seo.og_image_updated_at);

  return (
    <AdminLayout title="Pengaturan Website">
      <div className="max-w-5xl mx-auto space-y-6 w-full min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full min-w-0">
          {/* Iconic Modern Navigation Bar for Web Configuration */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/30">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">Konfigurasi Website</h2>
                  <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Pilih menu di bawah ini untuk mengelola tampilan dan informasi website</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                <span className="text-[10px] sm:text-[11px] bg-white text-emerald-700 font-bold px-3 py-1 rounded-lg border border-slate-200/60 uppercase tracking-wider shadow-2xs">
                  {activeTab}
                </span>
              </div>
            </div>

            {/* Icon Navigation Grid Strip */}
            <TabsList className="bg-slate-100/60 p-1.5 rounded-xl h-auto w-full grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1 sm:gap-1.5 border border-slate-200/50">
              {[
                { id: 'general', label: 'Umum', icon: Globe },
                { id: 'seo', label: 'SEO & Sosmed', icon: Share2 },
                { id: 'hero', label: 'Hero', icon: Sparkles },
                { id: 'about', label: 'Tentang', icon: User },
                { id: 'programs', label: 'Program', icon: BookOpen },
                { id: 'footer', label: 'Footer', icon: LayoutGrid },
                { id: 'sticky_footer', label: 'Sticky HP', icon: Smartphone },
                { id: 'running_text', label: 'Running', icon: Megaphone },
                { id: 'account', label: 'Keamanan', icon: KeyRound },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className={`flex flex-col items-center justify-center gap-1 py-2 sm:py-2.5 px-1 rounded-lg transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm font-bold scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'}`} />
                    <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight text-center whitespace-normal leading-tight break-words max-w-full">{item.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

        <TabsContent value="general">
          <Card className="border-0 shadow-lg">
            <CardHeader><CardTitle>Informasi Kontak & Sekolah</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Identitas Website
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Judul Header <span className="text-red-500">*</span></label>
                    <Input 
                      placeholder="Nama judul header" 
                      value={general.school_name}
                      onChange={(e) => setGeneral({...general, school_name: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Tagline / Sub-judul Header</label>
                    <Input 
                      placeholder="Muncul di bawah judul header"
                      value={general.tagline} 
                      onChange={(e) => setGeneral({...general, tagline: e.target.value})} 
                      className="rounded-xl" 
                    />
                  </div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Alamat</label><Textarea value={general.address} onChange={(e) => setGeneral({...general, address: e.target.value})} className="rounded-xl" /></div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2">
                    <UserCircle className="w-4 h-4" /> Pimpinan Madrasah
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Kepala Madrasah</label>
                    <Input 
                      placeholder="Contoh: Jaenal Maskun, S.Pd.I" 
                      value={general.headmaster_name}
                      onChange={(e) => setGeneral({...general, headmaster_name: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Gelar / Jabatan</label>
                    <Input 
                      placeholder="Contoh: Kepala Madrasah" 
                      value={general.headmaster_title}
                      onChange={(e) => setGeneral({...general, headmaster_title: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Kontak & Operasional</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Telepon</label><Input value={general.phone} onChange={(e) => setGeneral({...general, phone: e.target.value})} className="rounded-xl" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label><Input value={general.email} onChange={(e) => setGeneral({...general, email: e.target.value})} className="rounded-xl" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Jam Kerja</label><Input value={general.operational_hours} onChange={(e) => setGeneral({...general, operational_hours: e.target.value})} className="rounded-xl" /></div>
                </div>
              </div>

              {/* Lokasi Peta Google Maps Section */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Lokasi & Peta Google Maps Beranda
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGeneral({
                        ...general,
                        maps_latitude: '-7.517606',
                        maps_longitude: '109.132984',
                        maps_zoom: '16',
                        maps_embed_url: ''
                      });
                      showSuccess('Koordinat diatur ke default (-7.517606, 109.132984)!');
                    }}
                    className="h-8 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Set Koordinat Default
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Latitude (Lintang)</label>
                    <Input
                      value={general.maps_latitude || '-7.517606'}
                      onChange={(e) => setGeneral({ ...general, maps_latitude: e.target.value })}
                      placeholder="-7.517606"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Longitude (Bujur)</label>
                    <Input
                      value={general.maps_longitude || '109.132984'}
                      onChange={(e) => setGeneral({ ...general, maps_longitude: e.target.value })}
                      placeholder="109.132984"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Zoom Level (1 - 20)</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={general.maps_zoom || '16'}
                      onChange={(e) => setGeneral({ ...general, maps_zoom: e.target.value })}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">URL Embed Custom / Kode iFrame Google Maps (Opsional)</label>
                  <Input
                    value={general.maps_embed_url || ''}
                    onChange={(e) => setGeneral({ ...general, maps_embed_url: e.target.value })}
                    placeholder="Kosongkan untuk menggunakan Latitude & Longitude"
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-gray-700">Pratinjau Peta Beranda</label>
                  <div className="h-52 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    <iframe
                      title="Pratinjau Peta Settings"
                      src={getGoogleMapEmbedUrl(general.maps_latitude, general.maps_longitude, general.maps_zoom, general.maps_embed_url, "MI Ma'arif NU 2 Sanggreman")}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave('general', general)} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 font-bold">
                <Save className="w-4 h-4 mr-2" /> Simpan Perubahan Umum
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          {/* Fitur Pamungkas Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">FITUR PAMUNGKAS: IDENTITAS BERBAGI SOSIAL MEDIA</h3>
                  <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Aktif 100%
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed max-w-2xl">
                  Setiap gambar yang diunggah di sini akan otomatis disinkronkan secara real-time ke Open Graph & Twitter Card Metadata. Saat tautan madrasah dibagikan via WhatsApp, Facebook, Telegram, & Medsos, gambar identitas resmi akan tampil sempurna dan profesional.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleSyncMetadata}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs h-10 px-4 shadow-lg shrink-0 gap-2 border border-emerald-300/50"
            >
              <Save className="w-4 h-4" /> Sinkronkan Metadata Sekarang
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 w-full min-w-0">
            <Card className="border-0 shadow-lg w-full overflow-hidden">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-600 shrink-0" /> Pengaturan Share Link & SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Judul Share (Meta Title)</label>
                    <Input 
                      placeholder="Kosongkan untuk menggunakan Nama Sekolah" 
                      value={seo.title || ''}
                      onChange={(e) => setSeo({...seo, title: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi Share (Meta Description)</label>
                    <Textarea 
                      placeholder="Kosongkan untuk menggunakan Tagline" 
                      value={seo.description || ''}
                      onChange={(e) => setSeo({...seo, description: e.target.value})}
                      className="rounded-xl min-h-[90px]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Judul Open Graph (WhatsApp/Facebook)</label>
                      <Input
                        placeholder="Opsional (default: Meta Title)"
                        value={seo.og_title || ''}
                        onChange={(e) => setSeo({ ...seo, og_title: e.target.value })}
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Jika dikosongkan, sistem memakai Judul Share.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi Open Graph</label>
                      <Textarea
                        placeholder="Opsional (default: Meta Description)"
                        value={seo.og_description || ''}
                        onChange={(e) => setSeo({ ...seo, og_description: e.target.value })}
                        className="rounded-xl min-h-[90px]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Twitter Site (opsional)</label>
                      <Input
                        placeholder="@akunresmi"
                        value={seo.twitter_site || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_site: e.target.value })}
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Contoh: <code className="bg-slate-100 px-1 rounded">@siakad</code></p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Twitter Creator (opsional)</label>
                      <Input
                        placeholder="@pembuatkonten"
                        value={seo.twitter_creator || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_creator: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Judul Twitter (opsional)</label>
                      <Input
                        placeholder="Opsional (default: Judul Open Graph)"
                        value={seo.twitter_title || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_title: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deskripsi Twitter (opsional)</label>
                      <Textarea
                        placeholder="Opsional (default: Deskripsi Open Graph)"
                        value={seo.twitter_description || ''}
                        onChange={(e) => setSeo({ ...seo, twitter_description: e.target.value })}
                        className="rounded-xl min-h-[90px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Domain / Link Utama Berbagi (Canonical Share Domain)</label>
                    <Input 
                      type="url"
                      placeholder={DEFAULT_SITE_URL}
                      value={seo.website_url || ''}
                      onChange={(e) => setSeo({...seo, website_url: e.target.value})}
                      className="rounded-xl"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">{`Domain ini (Default: ${DEFAULT_SITE_URL}) yang akan dipakai ketika menyebarkan link ke WhatsApp & Medsos.`}</p>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Gambar Share (Open Graph Image)</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMediaModalTarget('seo')}
                        className="h-7 text-[11px] rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold gap-1 self-start sm:self-auto shrink-0"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Pilih dari Galeri
                      </Button>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 aspect-video flex items-center justify-center bg-gray-50 group mb-2 max-w-full">
                      {seo.image_url ? (
                        <>
                          <img 
                            key={seoImagePreviewUrl || seo.image_url}
                            src={seoImagePreviewUrl || seo.image_url} 
                            referrerPolicy="no-referrer"
                            onError={() => setSeoImgError(true)}
                            onLoad={() => setSeoImgError(false)}
                            className="w-full h-full object-cover" 
                            alt="Preview OpenGraph" 
                          />

                          {seoImgError && (
                            <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center gap-2 z-10 text-white">
                              <AlertCircle className="w-8 h-8 text-amber-400 animate-bounce" />
                              <div>
                                <p className="text-xs font-bold text-slate-100">Gambar SEO Gagal Dimuat</p>
                                <p className="text-[10px] text-slate-300 mt-0.5">Silakan unggah ulang gambar atau pilih dari galeri.</p>
                              </div>
                              <label className="cursor-pointer mt-1">
                                <span className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow">
                                  <Upload className="w-3.5 h-3.5" /> Unggah Ulang
                                </span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => { 
                                    setSeoImgError(false); 
                                    handleImageUpload(e, 'seo'); 
                                  }} 
                                />
                              </label>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap p-2 z-20">
                            <label className="cursor-pointer">
                              <Button size="sm" variant="secondary" className="rounded-xl font-bold" asChild>
                                <span>Ganti Foto</span>
                              </Button>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { setSeoImgError(false); handleImageUpload(e, 'seo'); }} />
                            </label>
                            <Button size="sm" variant="outline" className="rounded-xl font-bold bg-white/90 text-slate-800" onClick={() => setMediaModalTarget('seo')}>
                              Galeri
                            </Button>
                            <Button size="sm" variant="destructive" className="rounded-xl font-bold" onClick={() => { const u = {...seo, image_url: '', og_image_url: '', og_image_type: '', og_image_updated_at: ''}; setSeo(u); setSeoImgError(false); handleSave('seo', u); }}>
                              Hapus Foto
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-3 text-center max-w-full">
                          {uploading === 'seo' ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                              <span className="text-xs text-emerald-700 font-bold">Mengunggah Gambar SEO...</span>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300" />
                              <span className="text-[11px] sm:text-xs text-gray-500 font-semibold px-2">Upload Gambar Khusus Share (1200x630px)</span>
                              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                                <label className="cursor-pointer">
                                  <span className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm inline-block">
                                    Upload File Gambar
                                  </span>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { setSeoImgError(false); handleImageUpload(e, 'seo'); }} />
                                </label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setMediaModalTarget('seo')}
                                  className="h-8 rounded-xl text-xs font-bold border-slate-300"
                                >
                                  Pilih dari Galeri
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-400 mt-1 italic leading-relaxed break-words">* Apabila tidak diunggah, sistem otomatis menggunakan Logo Utama Madrasah ({identitas.logo_url ? 'Sudah Tersedia' : 'Belum diunggah'}).</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700">Atau Tempel Tautan Gambar Langsung (Direct HTTPS URL):</label>
                      <Input
                        type="url"
                        placeholder="misal: https://i.imgur.com/... atau URL gambar https publik"
                        value={seo.image_url || ''}
                        onChange={(e) => setSeo({ ...seo, image_url: e.target.value })}
                        className="rounded-xl text-xs bg-white border-slate-200"
                      />
                      <p className="text-[10px] text-slate-500">Crawler WhatsApp & Facebook membutuhkan URL berawalan <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">https://</code> publik agar thumbnail gambar langsung tampil secara sempurna saat tautan dibagikan.</p>
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleSave('seo', seo)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl w-full h-11 font-bold shadow-md">
                  <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan SEO
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6 w-full min-w-0">
              {/* Google Preview */}
              <Card className="border-0 shadow-md overflow-hidden w-full">
                <CardHeader className="bg-gray-50 py-3 px-4 sm:px-6 border-b">
                  <CardTitle className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Google Search Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 bg-white overflow-hidden">
                  <div className="w-full max-w-full overflow-hidden space-y-1">
                    <p className="text-[#1a0dab] text-base sm:text-lg font-semibold hover:underline cursor-pointer truncate">{seo.title || general.school_name || 'Si@Kad Madrasah'}</p>
                    <p className="text-[#006621] text-xs sm:text-sm truncate mb-1">{seo.website_url || DEFAULT_SITE_URL}</p>
                    <p className="text-[#545454] text-xs sm:text-sm line-clamp-2 leading-relaxed break-words">{seo.description || general.tagline || 'Sistem Informasi Akademik'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp/Social Preview & Sharing Tools */}
              <Card className="border-0 shadow-md overflow-hidden w-full">
                <CardHeader className="bg-slate-900 text-white py-3.5 px-4 sm:px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-400 shrink-0" /> WhatsApp & Social Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 bg-white flex flex-col items-center overflow-hidden">
                  <div className="w-full max-w-sm border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-[#f0f2f5]">
                    <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden relative">
                      {(seo.image_url || identitas.logo_url) ? (
                        <img 
                          src={socialPreviewImageUrl || seo.image_url || identitas.logo_url} 
                          className="w-full h-full object-cover" 
                          alt="Social Media Preview" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_OG_IMAGE_PATH;
                          }}
                        />
                      ) : (
                        <img 
                          src={DEFAULT_OG_IMAGE_PATH}
                          className="w-full h-full object-cover" 
                          alt="Default OG Preview" 
                        />
                      )}
                      <span className="absolute top-2 right-2 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {seo.image_url ? 'Gambar Custom' : identitas.logo_url ? 'Logo' : 'Default OG'}
                      </span>
                    </div>
                    <div className="p-3 bg-white border-t border-slate-200">
                      <p className="text-[10px] text-emerald-800 uppercase font-bold truncate tracking-wider">{(seo.website_url || DEFAULT_SITE_URL).replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{seo.og_title || seo.title || general.school_name || 'Si@Kad Madrasah'}</p>
                      <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">{seo.og_description || seo.description || general.tagline || 'Sistem Informasi Akademik Modern Si@Kad Madrasah'}</p>
                    </div>
                  </div>

                  {/* WhatsApp Sharing & Testing Action Buttons */}
                  <div className="w-full mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700 text-center mb-1">
                      Aksi Bagikan & Pengujian Tautan WhatsApp:
                    </p>
                    
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 gap-2 shadow-sm w-full"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          const testUrl = `${domain}/?v=${Date.now()}`;
                          const text = `*${seo.title || general.school_name || 'Si@Kad Madrasah'}*\n${seo.description || general.tagline || 'Sistem Informasi Akademik'}\n\nKunjungi website resmi kami:\n${testUrl}`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                      >
                        <Share2 className="w-4 h-4 shrink-0" /> Bagikan ke WhatsApp
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="border-emerald-600 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold h-auto py-2.5 px-3 gap-2 w-full whitespace-normal leading-tight text-center"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          const testUrl = `${domain}/?v=${Date.now().toString().slice(-4)}`;
                          navigator.clipboard.writeText(testUrl);
                          showSuccess(`Link Pengujian berhasil disalin (${testUrl}). Tempelkan di WhatsApp!`);
                        }}
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Salin Link Pengujian (Refresh Cache WA)</span>
                      </Button>
                    </div>

                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-[11px] text-slate-500 hover:text-emerald-700 font-medium h-auto py-1.5 whitespace-normal text-center"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          window.open(`https://www.opengraph.xyz/url/${encodeURIComponent(domain)}`, '_blank');
                        }}
                      >
                        🔍 Uji Status Gambar Meta Tag di OpenGraph Checker
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-[11px] text-slate-500 hover:text-emerald-700 font-medium h-auto py-1.5 whitespace-normal text-center"
                        onClick={() => {
                          const domain = normalizeSiteUrl(seo.website_url);
                          window.open(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(domain + '/')}`, '_blank');
                        }}
                      >
                        🔄 Paksa Refresh Cache (Facebook/WhatsApp)
                      </Button>
                    </div>
                  </div>

                  {/* Informative Guidance */}
                  <div className="w-full mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-slate-800 text-[11px] space-y-1.5 overflow-hidden">
                    <p className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                      📌 Mengapa Gambar WhatsApp Belum Langsung Muncul?
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 text-[10px] sm:text-[11px] leading-normal break-words">
                      <li><b>Sistem Cache WhatsApp:</b> Bot WhatsApp menyimpan cache tautan lama. Gunakan tombol <b>"Salin Link Pengujian"</b> di atas.</li>
                      <li><b>Format File:</b> WhatsApp hanya mendukung <b>JPG/JPEG atau PNG</b>.</li>
                      <li><b>Ukuran Ideal:</b> Rekomendasi <b>1200 x 630 pixel</b> (&lt; 300 KB).</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hero">
          <Card className="border-0 shadow-lg">
            <CardHeader><CardTitle>Tampilan Utama (Hero)</CardTitle></CardHeader>
            <CardContent className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Background Image */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-700">Gambar Background Hero</label>
                    {heroBgImgError && (
                      <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Gambar Tidak Dapat Dimuat
                      </span>
                    )}
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-emerald-200 hover:border-emerald-400 transition-colors aspect-video flex items-center justify-center bg-slate-50 group">
                    {hero.background_image ? (
                      <>
                        <img 
                          key={hero.background_image}
                          src={hero.background_image} 
                          onError={() => setHeroBgImgError(true)}
                          onLoad={() => setHeroBgImgError(false)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                          alt="Preview Background Hero" 
                        />

                        {heroBgImgError && (
                          <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center gap-2.5 z-10 text-white">
                            <AlertCircle className="w-8 h-8 text-amber-400 animate-bounce" />
                            <div>
                              <p className="text-xs font-bold text-slate-100">Foto Tidak Dapat Ditampilkan</p>
                              <p className="text-[10px] text-slate-300 mt-1">Silakan unggah ulang foto dari galeri/HP Anda.</p>
                            </div>
                            <label className="cursor-pointer mt-1">
                              <span className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md">
                                <Upload className="w-3.5 h-3.5" /> Unggah Ulang Foto
                              </span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => { 
                                  setHeroBgImgError(false); 
                                  handleImageUpload(e, 'hero_bg'); 
                                }} 
                              />
                            </label>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => setMediaModalTarget('hero_bg')} 
                            className="rounded-xl font-semibold shadow gap-1"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Pilih Tersimpan
                          </Button>
                          <label className="cursor-pointer">
                            <Button type="button" size="sm" variant="secondary" asChild className="rounded-xl font-semibold shadow">
                              <span className="flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" /> Unggah Baru
                              </span>
                            </Button>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => { 
                                setHeroBgImgError(false); 
                                handleImageUpload(e, 'hero_bg'); 
                              }} 
                            />
                          </label>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="destructive" 
                            className="rounded-xl font-semibold shadow"
                            onClick={() => { 
                              const u = {...hero, background_image: ''}; 
                              setHero(u); 
                              setHeroBgImgError(false); 
                              handleSave('hero', u); 
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                          </Button>
                        </div>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-2.5 p-6 text-center w-full h-full hover:bg-emerald-50/50 transition-colors">
                        {uploading === 'hero_bg' ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Mengunggah Foto...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-800">Klik untuk Unggah Foto Background Hero</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">Pilih foto lanskap (JPG, PNG, WEBP) dari perangkat Anda</span>
                            </div>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => { 
                            setHeroBgImgError(false); 
                            handleImageUpload(e, 'hero_bg'); 
                          }} 
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Right Side Image / Multiple Hero Gallery */}
                <div className="space-y-3 md:col-span-2">
                  <SlideListEditor
                    label="Gambar Visual Hero / Slideshow (Dapat Unggah Foto Kegiatan Lebih Dari Satu Per Judul)"
                    description="Unggah foto-foto kegiatan untuk tiap judul. Anda dapat mengunggah beberapa foto sekaligus per judul kegiatan."
                    rawImages={hero.images || (hero.right_image ? [hero.right_image] : [])}
                    defaultTitle={hero.right_image_title || 'Pendidikan Berkarakter'}
                    defaultSubtitle={hero.right_image_subtitle || 'Terakreditasi & Berprestasi'}
                    uploadType="hero_gallery"
                    onUpdate={(newItems) => {
                      const firstUrl = newItems[0]?.urls[0] || '';
                      const updated = { ...hero, images: newItems, right_image: firstUrl };
                      setHero(updated);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-emerald-600">Teks Badge (Di atas Judul Utama)</label>
                  <Input 
                    value={hero.badge_text} 
                    onChange={(e) => setHero({...hero, badge_text: e.target.value})} 
                    placeholder="Contoh: Madrasah Ibtidaiyah Modern" 
                    className="rounded-xl h-12 border-emerald-100"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-700">Judul Utama - Baris 1 (Teks Hitam)</label>
                    <Input 
                      value={hero.heading_line1} 
                      onChange={(e) => setHero({...hero, heading_line1: e.target.value})} 
                      placeholder="Contoh: Madrasah Ibtidaiyah" 
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-emerald-600">Judul Utama - Baris 2 (Teks Hijau Italik)</label>
                    <Input 
                      value={hero.heading_line2} 
                      onChange={(e) => setHero({...hero, heading_line2: e.target.value})} 
                      placeholder="Contoh: Modern & Terpadu" 
                      className="rounded-xl h-12 border-emerald-100"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic -mt-2">* Gabungan kedua baris ini akan membentuk judul besar di halaman depan.</p>
              
              <div><label className="text-sm font-medium">Deskripsi Singkat</label><Textarea value={hero.description} onChange={(e) => setHero({...hero, description: e.target.value})} className="rounded-xl" /></div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-xs font-bold text-gray-400 uppercase">Siswa</label><Input value={hero.stats_students} onChange={(e) => setHero({...hero, stats_students: e.target.value})} className="rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Prestasi</label><Input value={hero.stats_achievements} onChange={(e) => setHero({...hero, stats_achievements: e.target.value})} className="rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Guru</label><Input value={hero.stats_teachers} onChange={(e) => setHero({...hero, stats_teachers: e.target.value})} className="rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase">Tahun</label><Input value={hero.stats_years} onChange={(e) => setHero({...hero, stats_years: e.target.value})} className="rounded-xl" /></div>
              </div>
              
              <Button onClick={() => handleSave('hero', hero)} disabled={saving || !!uploading} className="bg-emerald-500 text-white w-full h-14 rounded-xl font-bold shadow-lg">
                <Save className="w-4 h-4 mr-2" /> Simpan Perubahan Hero
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card className="border-0 shadow-lg">
            <CardHeader><CardTitle>Tentang Kami</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <SlideListEditor
                label="Gambar Tentang Kami / Slideshow (Dapat Unggah Foto Kegiatan Lebih Dari Satu Per Judul)"
                description="Unggah foto-foto kegiatan untuk tiap judul tentang kami. Anda dapat mengunggah beberapa foto sekaligus per judul kegiatan."
                rawImages={about.images || (about.image_url ? [about.image_url] : [])}
                defaultTitle={about.image_title || 'Mengenal Madrasah'}
                defaultSubtitle={about.image_subtitle || 'Unggul & Berakhlak'}
                uploadType="about"
                onUpdate={(newItems) => {
                  const firstUrl = newItems[0]?.urls[0] || '';
                  const updated = { ...about, images: newItems, image_url: firstUrl };
                  setAbout(updated);
                }}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Judul</label><Input value={about.title} onChange={(e) => setAbout({...about, title: e.target.value})} className="rounded-xl" /></div>
                <div><label className="text-sm font-medium">Tahun Pengalaman</label><Input value={about.experience_years} onChange={(e) => setAbout({...about, experience_years: e.target.value})} className="rounded-xl" /></div>
              </div>
              <div><label className="text-sm font-medium">Deskripsi</label><Textarea value={about.description} onChange={(e) => setAbout({...about, description: e.target.value})} rows={4} className="rounded-xl" /></div>
              
              <div className="space-y-3 border-t pt-4">
                <label className="text-sm font-bold">Fitur Unggulan</label>
                {about.features?.map((f, i) => (
                  <div key={i} className="grid md:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                    <Input value={f.title} onChange={(e) => {
                      const newF = [...about.features];
                      newF[i].title = e.target.value;
                      setAbout({...about, features: newF});
                    }} placeholder="Judul Fitur" className="rounded-lg" />
                    <Input value={f.desc} onChange={(e) => {
                      const newF = [...about.features];
                      newF[i].desc = e.target.value;
                      setAbout({...about, features: newF});
                    }} placeholder="Deskripsi Singkat" className="rounded-lg" />
                  </div>
                ))}
              </div>
              <Button onClick={() => handleSave('about', about)} disabled={saving || !!uploading} className="bg-emerald-500 text-white rounded-xl h-12 px-8 font-bold"><Save className="w-4 h-4 mr-2" />Simpan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Program Unggulan</CardTitle>
              <Button onClick={addProgram} size="sm" className="bg-emerald-500 text-white rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Tambah Program
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {programs.list.map((prog, index) => (
                  <div key={index} className="p-4 border rounded-xl bg-gray-50 relative group">
                    <button 
                      onClick={() => removeProgram(index)}
                      className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Judul Program</label>
                          <Input value={prog.title} onChange={(e) => updateProgram(index, 'title', e.target.value)} className="rounded-lg" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                          <Textarea value={prog.description} onChange={(e) => updateProgram(index, 'description', e.target.value)} rows={2} className="rounded-lg" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Ikon</label>
                          <select 
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={prog.icon}
                            onChange={(e) => updateProgram(index, 'icon', e.target.value)}
                          >
                            {iconOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Warna</label>
                          <select 
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={prog.color}
                            onChange={(e) => updateProgram(index, 'color', e.target.value)}
                          >
                            {colorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => handleSave('programs', programs)} disabled={saving} className="bg-emerald-500 text-white rounded-xl h-12 px-8 font-bold">
                <Save className="w-4 h-4 mr-2" /> Simpan Semua Program
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Pengaturan Menu & Tampilan Footer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Menu Cepat (Quick Links) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Menu Cepat (Quick Links)
                  </h3>
                  <Button onClick={addQuickLink} size="sm" variant="outline" className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Menu
                  </Button>
                </div>
                <div className="grid gap-3">
                  {footer.quick_links?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50/50">
                      <div className="flex-1 grid md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Nama Menu"
                          value={item.name}
                          onChange={(e) => updateQuickLink(idx, 'name', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                        <Input
                          placeholder="Link Target (e.g. #about atau /spmb)"
                          value={item.href}
                          onChange={(e) => updateQuickLink(idx, 'href', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeQuickLink(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Program Kami Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Program Kami (Footer Links)
                  </h3>
                  <Button onClick={addProgramLink} size="sm" variant="outline" className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Program
                  </Button>
                </div>
                <div className="grid gap-3">
                  {footer.programs_links?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50/50">
                      <div className="flex-1 grid md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Nama Program"
                          value={item.name}
                          onChange={(e) => updateProgramLink(idx, 'name', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                        <Input
                          placeholder="Link Target (e.g. #programs)"
                          value={item.href}
                          onChange={(e) => updateProgramLink(idx, 'href', e.target.value)}
                          className="rounded-lg bg-white"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProgramLink(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-bold text-gray-700">Link Media Sosial</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Facebook URL</label>
                    <Input
                      placeholder="https://facebook.com/..."
                      value={footer.facebook || ''}
                      onChange={(e) => setFooter({ ...footer, facebook: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Instagram URL</label>
                    <Input
                      placeholder="https://instagram.com/..."
                      value={footer.instagram || ''}
                      onChange={(e) => setFooter({ ...footer, instagram: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">YouTube URL</label>
                    <Input
                      placeholder="https://youtube.com/..."
                      value={footer.youtube || ''}
                      onChange={(e) => setFooter({ ...footer, youtube: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Twitter / X URL</label>
                    <Input
                      placeholder="https://twitter.com/..."
                      value={footer.twitter || ''}
                      onChange={(e) => setFooter({ ...footer, twitter: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Bar Info */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-bold text-gray-700">Teks Hak Cipta & Pengembang</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Teks Hak Cipta (Kiri)</label>
                    <Input
                      placeholder="Kosongkan untuk otomatis © 2025 Nama Sekolah"
                      value={footer.copyright_text || ''}
                      onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Pengembang (Developed By)</label>
                    <Input
                      placeholder="Jaenal Maskun, S.Pd.I"
                      value={footer.developer_name || ''}
                      onChange={(e) => setFooter({ ...footer, developer_name: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave('footer', footer)} disabled={saving} className="bg-emerald-500 text-white rounded-xl h-12 px-8 font-bold w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan Footer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sticky_footer">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-lg font-bold">Pengaturan Menu Sticky Footer (Navigasi Bawah Mobile)</span>
                  <p className="text-xs font-normal text-gray-500 mt-1">
                    Atur menu navigasi melayang yang muncul di bagian bawah layar ponsel/HP. Anda dapat menambah, mengubah nama, ikon, dan link tujuan.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button onClick={syncStickyFromWebFooter} size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl">
                    <Share2 className="w-4 h-4 mr-1" /> Samakan dengan Menu Footer Web
                  </Button>
                  <Button onClick={addStickyItem} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                    <Plus className="w-4 h-4 mr-1" /> Tambah Menu
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {stickyFooter.items?.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all space-y-3">
                    <div className="flex items-center justify-between gap-3 border-b pb-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        Item Menu #{idx + 1}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStickyItem(idx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs h-8 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Label Menu</label>
                        <Input
                          placeholder="misal: Beranda, SPMB"
                          value={item.label || ''}
                          onChange={(e) => updateStickyItem(idx, 'label', e.target.value)}
                          className="rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Link Target / Halaman</label>
                        <Input
                          placeholder="misal: / atau /spmb atau /ai-teaching"
                          value={item.path || ''}
                          onChange={(e) => updateStickyItem(idx, 'path', e.target.value)}
                          className="rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ikon Menu</label>
                        <select
                          className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm"
                          value={item.icon_name || 'Home'}
                          onChange={(e) => updateStickyItem(idx, 'icon_name', e.target.value)}
                        >
                          {availableIcons.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!stickyFooter.items || stickyFooter.items.length === 0) && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Belum ada menu sticky footer. Klik "Tambah Menu" di atas untuk menambahkan.
                </div>
              )}

              <Button 
                onClick={() => handleSave('sticky_footer', stickyFooter)} 
                disabled={saving} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-8 font-bold w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" /> Simpan Menu Sticky Footer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="running_text">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-lg font-bold flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-emerald-600" /> Pengaturan Papan Informasi & Running Text (Tulisan Berjalan)
                  </span>
                  <p className="text-xs font-normal text-gray-500 mt-1">
                    Atur papan berita / teks pengumuman melayang yang berjalan secara terus-menerus tepat di atas Sticky Footer.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-800">Status Papan Informasi:</span>
                  <Switch
                    checked={runningText.enabled}
                    onCheckedChange={(checked) => setRunningText({ ...runningText, enabled: checked })}
                  />
                  <span className={`text-xs font-extrabold ${runningText.enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {runningText.enabled ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Live Preview Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Pratinjau Tampilan Papan Informasi (Live Preview):
                </label>
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-900 text-white space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-white/10 p-1.5 bg-slate-950 flex items-center gap-2">
                    <div className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold tracking-wide uppercase text-white ${
                      runningText.bg_color === 'emerald' ? 'bg-emerald-600' :
                      runningText.bg_color === 'dark' ? 'bg-amber-500 text-slate-950' :
                      runningText.bg_color === 'indigo' ? 'bg-indigo-600' :
                      runningText.bg_color === 'amber' ? 'bg-amber-500 text-slate-950' : 'bg-rose-600'
                    }`}>
                      {runningText.badge || 'INFORMASI'}
                    </div>
                    <div className="flex-1 overflow-hidden relative select-none">
                      <div 
                        className={`whitespace-nowrap animate-marquee-pause ${runningText.direction === 'right_to_left' ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`}
                        style={{ animationDuration: runningText.speed === 'slow' ? '35s' : runningText.speed === 'fast' ? '12s' : '20s' }}
                      >
                        <span className="text-[11px] sm:text-xs font-semibold">
                          {runningText.text || 'Tulis pesan pengumuman di bawah...'}
                        </span>
                      </div>
                    </div>
                    {runningText.link_url && (
                      <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded font-bold shrink-0">
                        {runningText.link_label || 'Detail'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    * Papan informasi di atas otomatis akan tampil melayang persis di atas Sticky Footer di seluruh halaman publik website.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Teks Pesan / Informasi */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Teks Pengumuman Running Text <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Masukkan kalimat pengumuman running text yang ingin ditampilkan..."
                    value={runningText.text}
                    onChange={(e) => setRunningText({ ...runningText, text: e.target.value })}
                    className="rounded-xl bg-white border-slate-300 font-medium text-sm"
                  />
                  <p className="text-[11px] text-gray-500">
                    Tips: Buat kalimat ringkas, padat, dan jelas agar mudah dibaca saat tulisan berjalan.
                  </p>
                </div>

                {/* Badge Label */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Judul Badge Papan Informasi (Kiri)
                  </label>
                  <Input
                    placeholder="misal: INFORMASI, PENGUMUMAN, SPMB 2025"
                    value={runningText.badge}
                    onChange={(e) => setRunningText({ ...runningText, badge: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>

                {/* Arah Gerak Tulisan */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Arah Berjalan Tulisan
                  </label>
                  <select
                    className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm font-semibold"
                    value={runningText.direction}
                    onChange={(e) => setRunningText({ ...runningText, direction: e.target.value })}
                  >
                    <option value="left_to_right">⬅️ Dari Kiri ke Kanan (Left to Right)</option>
                    <option value="right_to_left">➡️ Dari Kanan ke Kiri (Right to Left)</option>
                  </select>
                </div>

                {/* Kecepatan Gerak */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Kecepatan Alur Berjalan
                  </label>
                  <select
                    className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm font-semibold"
                    value={runningText.speed}
                    onChange={(e) => setRunningText({ ...runningText, speed: e.target.value })}
                  >
                    <option value="slow">🐢 Lambat (35 detik - Mudah Dibaca)</option>
                    <option value="normal">⚡ Sedang (20 detik - Standar)</option>
                    <option value="fast">🚀 Cepat (12 detik)</option>
                  </select>
                </div>

                {/* Tema Warna */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tema Warna Papan Informasi
                  </label>
                  <select
                    className="w-full h-10 rounded-xl border border-input bg-white px-3 py-2 text-sm font-semibold"
                    value={runningText.bg_color}
                    onChange={(e) => setRunningText({ ...runningText, bg_color: e.target.value })}
                  >
                    <option value="emerald">🟢 Emerald Kemenag (Hijau Tua Nuansa Islami)</option>
                    <option value="dark">⚫ Dark Slate (Hitam Elegan Accent Gold)</option>
                    <option value="indigo">🔵 Indigo Premium (Biru Gelap Modern)</option>
                    <option value="amber">🟡 Amber Gold (Emas Mewah)</option>
                    <option value="rose">🔴 Rose Marun (Merah Mewah)</option>
                  </select>
                </div>

                {/* URL Link Tambahan */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tautan/URL Tombol Tambahan (Opsional)
                  </label>
                  <Input
                    placeholder="misal: /spmb atau /calendar atau https://..."
                    value={runningText.link_url}
                    onChange={(e) => setRunningText({ ...runningText, link_url: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>

                {/* Label Tombol Tautan */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Label Teks Tombol Tautan
                  </label>
                  <Input
                    placeholder="misal: Daftar Sekarang, Lihat Jadwal"
                    value={runningText.link_label}
                    onChange={(e) => setRunningText({ ...runningText, link_label: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>

                {/* Option: Close Button */}
                <div className="md:col-span-2 flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
                  <input
                    type="checkbox"
                    id="showCloseBtn"
                    checked={runningText.show_close_button}
                    onChange={(e) => setRunningText({ ...runningText, show_close_button: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="showCloseBtn" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Tampilkan tombol silang tutup (X) agar pengunjung bisa menutup papan informasi jika mengganggu
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button 
                  onClick={() => {
                    const textToArchive = runningText.text?.trim();
                    const updatedArchive = Array.isArray(runningText.archive) ? [...runningText.archive] : [];
                    if (textToArchive) {
                      const exists = updatedArchive.some(item => item.text?.trim() === textToArchive);
                      if (!exists) {
                        updatedArchive.unshift({
                          id: Date.now().toString(),
                          text: textToArchive,
                          badge: runningText.badge || 'INFORMASI MADRASAH',
                          direction: runningText.direction || 'right_to_left',
                          speed: runningText.speed || 'normal',
                          bg_color: runningText.bg_color || 'emerald',
                          link_url: runningText.link_url || '',
                          link_label: runningText.link_label || 'Lihat Detail',
                          created_at: new Date().toISOString()
                        });
                      }
                    }
                    const finalData = { ...runningText, archive: updatedArchive };
                    setRunningText(finalData);
                    handleSave('running_text', finalData);
                  }} 
                  disabled={saving} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-bold w-full sm:w-auto shadow-md"
                >
                  <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan Running Text
                </Button>

                <Button
                  type="button"
                  onClick={handleAddCurrentToArchive}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl h-12 px-5 font-bold w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2 text-emerald-600" /> Simpan Teks Ini Ke Arsip Saja
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card Arsip Running Text */}
          <Card className="border-0 shadow-lg mt-6 bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                    <History className="w-5 h-5 text-emerald-600" /> Arsip Running Text (Riwayat Pengumuman)
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Seluruh teks running text yang pernah dibuat tersimpan secara otomatis di sini. Anda dapat memilih dan menerapkan kembali pesan ke website kapan saja.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-emerald-600" />
                    {(runningText.archive || []).length} Tersimpan
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {/* Filter Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Cari teks running text atau badge di arsip..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="pl-9 pr-9 bg-white border-slate-300 rounded-xl text-xs h-10"
                />
                {archiveSearch && (
                  <button 
                    onClick={() => setArchiveSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Archive Item List */}
              {(() => {
                const rawArchive = Array.isArray(runningText.archive) ? runningText.archive : [];
                const filteredArchive = rawArchive.filter(item => {
                  if (!archiveSearch.trim()) return true;
                  const query = archiveSearch.toLowerCase();
                  return (
                    item.text?.toLowerCase().includes(query) ||
                    item.badge?.toLowerCase().includes(query)
                  );
                });

                if (rawArchive.length === 0) {
                  return (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">Belum Ada Arsip Running Text</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Setiap kali Anda menyimpan running text baru di atas, pesannya akan tersimpan secara otomatis di daftar arsip ini.
                      </p>
                    </div>
                  );
                }

                if (filteredArchive.length === 0) {
                  return (
                    <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Tidak ada arsip yang cocok dengan pencarian "{archiveSearch}".</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredArchive.map((item, idx) => {
                      const isActive = runningText.text === item.text;
                      const themeKey = item.bg_color || 'emerald';
                      return (
                        <div
                          key={item.id || idx}
                          className={`p-4 rounded-2xl border transition-all duration-200 ${
                            isActive
                              ? 'bg-emerald-50/70 border-emerald-400 shadow-sm ring-1 ring-emerald-400/30'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            {/* Top info row */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Badge Theme Tag */}
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide text-white ${
                                  themeKey === 'emerald' ? 'bg-emerald-600' :
                                  themeKey === 'dark' ? 'bg-slate-900 text-amber-400' :
                                  themeKey === 'indigo' ? 'bg-indigo-600' :
                                  themeKey === 'amber' ? 'bg-amber-500 text-slate-950' : 'bg-rose-600'
                                }`}>
                                  {item.badge || 'INFORMASI'}
                                </span>

                                {/* Active status tag */}
                                {isActive && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                    SEDANG AKTIF DI WEBSITE
                                  </span>
                                )}

                                {/* Direction & Speed tags */}
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  {item.direction === 'left_to_right' ? '⬅️ Kiri ke Kanan' : '➡️ Kanan ke Kiri'} • {
                                    item.speed === 'slow' ? '🐢 Lambat' :
                                    item.speed === 'fast' ? '🚀 Cepat' : '⚡ Sedang'
                                  }
                                </span>
                              </div>

                              {/* Timestamp */}
                              {item.created_at && (
                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {new Date(item.created_at).toLocaleString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </div>

                            {/* Text message box */}
                            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 font-medium text-xs sm:text-sm leading-relaxed">
                              {item.text}
                            </div>

                            {/* Link detail if present */}
                            {item.link_url && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-semibold">{item.link_label || 'Tautan'}:</span>
                                <span className="text-slate-500 underline font-mono text-[11px]">{item.link_url}</span>
                              </div>
                            )}

                            {/* Actions bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  onClick={() => handleApplyArchiveItem(item)}
                                  size="sm"
                                  disabled={isActive}
                                  className={`text-xs font-bold rounded-xl h-8 px-3 ${
                                    isActive
                                      ? 'bg-emerald-100 text-emerald-700 cursor-default opacity-80'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  }`}
                                >
                                  {isActive ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1" /> Digunakan Saat Ini
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3.5 h-3.5 mr-1" /> Gunakan Teks Ini
                                    </>
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  onClick={() => handleCopyArchiveText(item.text, item.id || idx.toString())}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl h-8 px-3"
                                >
                                  {copiedId === (item.id || idx.toString()) ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Tersalin!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" /> Salin Teks
                                    </>
                                  )}
                                </Button>
                              </div>

                              <Button
                                type="button"
                                onClick={() => handleDeleteArchiveItem(item.id)}
                                variant="ghost"
                                size="sm"
                                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-8 px-2.5"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus dari Arsip
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <UpdatePasswordCard />
        </TabsContent>
      </Tabs>
    </div>

      {/* Main Media Library Modal for Hero Background or SEO Image */}
      <MediaLibraryModal
        isOpen={mediaModalTarget !== null}
        onClose={() => setMediaModalTarget(null)}
        onSelectImage={async (url) => {
          if (mediaModalTarget === 'hero_bg') {
            const updated = { ...hero, background_image: url };
            setHero(updated);
            setHeroBgImgError(false);
            handleSave('hero', updated);
          } else if (mediaModalTarget === 'seo') {
            let publicUrl = url;
            if (publicUrl.startsWith('data:')) {
              publicUrl = await convertBase64ToPublicUrl(publicUrl);
            }
            const updated = {
              ...seo,
              image_url: stripVersionFromAssetUrl(publicUrl),
              og_image_url: stripVersionFromAssetUrl(publicUrl),
              og_image_type: detectImageMimeType(publicUrl, seo.og_image_type || 'image/jpeg'),
              og_image_updated_at: new Date().toISOString(),
            };
            setSeo(updated);
            handleSave('seo', updated);
          }
          setMediaModalTarget(null);
        }}
        title={`Pilih Foto Tersimpan untuk ${mediaModalTarget === 'hero_bg' ? 'Background Hero' : 'Gambar SEO'}`}
      />
    </AdminLayout>
  );
};

export default SettingsAdmin;
