"use client";

import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  ShieldCheck, 
  Sparkles, 
  GraduationCap, 
  HeartHandshake, 
  CheckCircle2, 
  ArrowRight,
  Target,
  Compass,
  Star
} from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import ImageSlideshow from './ImageSlideshow';
import { flattenSlideItems } from '@/utils/slideHelpers';

const About = () => {
  const { settings, loading } = useSiteSettings();
  const about = settings.about || {};
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'profile' | 'vision'>('profile');
  
  const pillars = [
    { 
      icon: BookOpen, 
      title: 'Kurikulum Merdeka & Ke-NU-an', 
      desc: 'Penggabungan pendidikan nasional dan nilai-nilai keislaman Aswaja An-Nahdliyah.',
      color: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50 text-emerald-700'
    },
    { 
      icon: ShieldCheck, 
      title: 'Pendidikan Karakter & Adab', 
      desc: 'Pembiasaan ibadah harian, tahfidz, dan penanaman akhlakul karimah.',
      color: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50 text-blue-700'
    },
    { 
      icon: GraduationCap, 
      title: 'Tenaga Pendidik Berpengalaman', 
      desc: 'Guru profesional, berdedikasi tinggi, dan ramah terhadap tumbuh kembang siswa.',
      color: 'from-purple-500 to-violet-600',
      bgLight: 'bg-purple-50 text-purple-700'
    },
    { 
      icon: HeartHandshake, 
      title: 'Madrasah Digital Ramah Anak', 
      desc: 'Fasilitas pembelajaran berbasis teknologi digital yang aman dan kondusif.',
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50 text-amber-700'
    }
  ];

  const highlights = [
    { label: 'Terakreditasi A', sub: 'Unggul & Berkualitas' },
    { label: 'Pembelajaran Digital', sub: 'Si@Kad Integrated' },
    { label: 'Tahfidz & Tartil', sub: 'Bimbingan Rutin' },
    { label: 'Ekstrakurikuler', sub: 'Bakat & Minat' },
  ];

  if (loading) return null;

  const aboutSlides = flattenSlideItems(
    (Array.isArray(about.images) && about.images.length > 0)
      ? about.images
      : (about.image_url ? [{ url: about.image_url, title: about.image_title, subtitle: about.image_subtitle }] : []),
    about.image_title || 'Mengenal Madrasah',
    about.image_subtitle || 'Unggul, Agamis & Berakhlak'
  );

  const fallbackSlide = {
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800",
    title: about.image_title || 'Mengenal Madrasah',
    subtitle: about.image_subtitle || 'Unggul, Agamis & Berakhlak'
  };

  const currentItem = aboutSlides[currentSlideIndex] || aboutSlides[0] || fallbackSlide;
  const activeTitle = currentItem.title;
  const activeSubtitle = currentItem.subtitle;

  return (
    <section id="about" className="py-16 md:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      {/* Background Decorative Blur Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-teal-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-black mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>MENGENAL KAMI</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Membangun Masa Depan Gemilang <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 bg-clip-text text-transparent italic font-serif-premium">
              Berlandaskan Iman & Ilmu
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-medium">
            {about.description || 'Komitmen kami menghadirkan pendidikan Islam berstandar unggul, memadukan kekayaan nilai tradisi pesantren, keilmuan umum, serta teknologi digital modern.'}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16">
          {/* Left Column: Visual Showcase Slideshow */}
          <div className="lg:col-span-5 relative">
            {/* Outer Decorative Card Glow */}
            <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 rounded-[32px] blur-xl opacity-25 group-hover:opacity-40 transition-opacity"></div>

            <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-900 group">
              <ImageSlideshow 
                images={aboutSlides.length > 0 ? aboutSlides : [fallbackSlide]} 
                onIndexChange={(idx) => setCurrentSlideIndex(idx)}
                className="w-full h-[320px] sm:h-[400px] lg:h-[440px] object-cover" 
                alt="Tentang Madrasah"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

              {/* Top Tag */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full border border-white/20 shadow-md">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Madrasah Digital Unggulan</span>
                </span>
              </div>

              {/* Floating Info Badge at Bottom */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-xl flex items-center justify-between z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{activeTitle}</p>
                    <p className="text-[11px] text-emerald-700 font-bold truncate">{activeSubtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Slide {currentSlideIndex + 1}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tab Switcher & Pillars */}
          <div className="lg:col-span-7 space-y-6">
            {/* Profile vs Visi Misi Tab Navigation */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'profile' 
                    ? 'bg-emerald-700 text-white shadow-md' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Keunggulan Utama</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vision')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'vision' 
                    ? 'bg-emerald-700 text-white shadow-md' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Visi & Misi</span>
              </button>
            </div>

            {/* Tab 1: Profile & Pillars */}
            {activeTab === 'profile' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid sm:grid-cols-2 gap-3.5">
                  {pillars.map((p, idx) => {
                    const PillarIcon = p.icon;
                    return (
                      <div 
                        key={idx} 
                        className="group bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-200`}>
                            <PillarIcon className="w-5 h-5 stroke-[2.2]" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug mb-1 group-hover:text-emerald-700 transition-colors">
                              {p.title}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                              {p.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Direct Action Link */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a 
                    href="#programs" 
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95"
                  >
                    <span>Lihat Program Unggulan</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </a>

                  <a 
                    href="/spmb" 
                    className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all active:scale-95"
                  >
                    <span>Pendaftaran SPMB Online</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </a>
                </div>
              </div>
            )}

            {/* Tab 2: Visi & Misi */}
            {activeTab === 'vision' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-wider">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span>VISI MADRASAH</span>
                  </div>
                  <p className="text-slate-800 font-bold text-sm leading-relaxed italic bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                    "{about.vision || 'Terwujudnya Generasi Islam yang Unggul dalam Prestasi, Anggun dalam Akhlak, Berkemajuan dalam Ilmu Pengetahuan, dan Berpijak pada Nilai Aswaja An-Nahdliyah.'}"
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <span>MISI MADRASAH</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>Menyelenggarakan proses pembelajaran berkualitas berbasis Kurikulum Merdeka & Kemenag.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>Membina pembentukan karakter islami melalui kebiasaan shalat, tahfidz, dan adab santun.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>Mengembangkan potensi bakat, minat, dan literasi digital seluruh peserta didik.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Highlight Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {highlights.map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-1">
              <p className="font-black text-slate-900 text-sm sm:text-base">{item.label}</p>
              <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-tight">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
