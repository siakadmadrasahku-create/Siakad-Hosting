import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Heart, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Smile, 
  BookMarked,
  Info,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Play,
  Pause
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ReferenceItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'merdeka' | 'cinta' | 'regulasi';
  tag: string;
  excerpt: string;
  fullContent: string;
  highlights: string[];
  icon: any;
  colorScheme: 'emerald' | 'rose' | 'amber' | 'blue';
  gradientBg: string;
}

export const KurikulumLiterasi: React.FC = () => {
  const [selectedRef, setSelectedRef] = useState<ReferenceItem | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isOpenFullModal, setIsOpenFullModal] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const slides: ReferenceItem[] = [
    {
      id: 'km-1',
      title: 'Kurikulum Merdeka Madrasah',
      subtitle: 'Standar BSKAP Kemendikbud & KMA No. 450/2024',
      category: 'merdeka',
      tag: 'Standar Pembelajaran Esensial',
      excerpt: 'Mewujudkan pembelajaran berdiferensiasi yang fleksibel, berfokus pada materi esensial, dan penguatan karakter P5 & PPRA.',
      fullContent: `Kurikulum Merdeka di lingkungan Madrasah dan Sekolah dirancang untuk memulihkan dan meningkatkan kualitas pembelajaran. Karakteristik utamanya meliputi:
1. Pembelajaran Berbasis Projek (P5 & PPRA): Mengembangkan karakter Profil Pelajar Pancasila dan Profil Pelajar Rahmatan Lil 'Alamin.
2. Berfokus pada Materi Esensial: Pembelajaran mendalam pada kompetensi dasar seperti literasi dan numerasi tanpa terburu-buru.
3. Fleksibilitas Bagi Pendidik: Guru dapat melakukan pembelajaran berdiferensiasi sesuai dengan tahap capaian dan perkembangan peserta didik (Teaching at the Right Level).
4. Asesmen Autentik: Penekanan pada asesmen formatif untuk perbaikan proses belajar berkala.`,
      highlights: [
        'Capaian Pembelajaran (CP) Terpadu Fase A - F',
        'Alur Tujuan Pembelajaran (ATP) Sistematis',
        'Modul Ajar & Projek P5-PPRA',
        'Pembelajaran Berdiferensiasi Sesuai Bakat'
      ],
      icon: GraduationCap,
      colorScheme: 'emerald',
      gradientBg: 'from-emerald-600/30 via-teal-900/40 to-slate-950'
    },
    {
      id: 'kbc-1',
      title: 'Kurikulum Berbasis Cinta (Love-Based Education)',
      subtitle: 'Mendidik Dengan Qolbu, Kasih Sayang & Rahmatan Lil \'Alamin',
      category: 'cinta',
      tag: 'Pendidikan Kasih Sayang',
      excerpt: 'Pendidikan yang mengutamakan keteladanan, rasa aman, kehangatan jiwa, serta mengasah kecerdasan emosional & spiritual.',
      fullContent: `Kurikulum Berbasis Cinta (KBC) mendudukkan proses belajar mengajar di atas pondasi kasih sayang, senyuman, dan pengayoman (Rahmatan Lil 'Alamin).

Prinsip-Prinsip Utama Kurikulum Berbasis Cinta:
1. Mendidik dengan Hati (Qolbun Salim): Guru hadir bukan sekadar pengtransfer ilmu, melainkan sebagai sosok pelindung dan teladan jiwa.
2. Lingkungan Bebas Ketakutan & Perundungan: Menjamin peserta didik merasa dihargai, diterima, dan aman menyampaikan gagasan.
3. Apresiasi Setiap Kemajuan: Menghargai proses dan keunikan gaya belajar setiap anak tanpa dibanding-bandingkan.
4. Pendidikan Emosional & Akhlakul Karimah: Menumbuhkan empati, kelembutan tutur kata, dan kepedulian sosial tinggi.`,
      highlights: [
        '5 Pilar Welas Asih Guru & Siswa',
        'Komunikasi Empatis & Tanpa Kekerasan',
        'Budaya Senyum, Salam, Sapa & Doa',
        'Pendidikan Karakter Berbasis Rahmatan Lil Alamin'
      ],
      icon: Heart,
      colorScheme: 'rose',
      gradientBg: 'from-rose-600/30 via-pink-900/40 to-slate-950'
    },
    {
      id: 'kbc-2',
      title: 'Madrasah & Sekolah Ramah Anak (SRA)',
      subtitle: 'Lingkungan Aman, Bersih, Sehat & Bebas Perundungan',
      category: 'cinta',
      tag: 'Aman & Menyenangkan',
      excerpt: 'Menciptakan iklim pembelajaran yang bersih, sehat, inklusif, serta menjamin hak dan perlindungan anak secara utuh.',
      fullContent: `Sekolah / Madrasah Ramah Anak (SRA) adalah satuan pendidikan formal yang mampu menjamin, memenuhi, dan menghargai hak-hak anak serta perlindungan dari kekerasan, diskriminasi, dan perlakuan salah lainnya.

Pilar Utama Implementasi SRA:
1. Komitmen Kebijakan SRA dari pimpinan dan seluruh majelis guru.
2. Pelaksanaan proses belajar yang ramah dan menyenangkan (Joyful Learning).
3. Pendidik & Tenaga Kependidikan Terlatih Hak Anak.
4. Sarana Prasarana Aman, Bersih, Aksesibel, dan Sehat.
5. Partisipasi Aktif Anak dan Pelibatan Orang Tua / Masyarakat.`,
      highlights: [
        'Bebas Perundungan (Zero Bullying)',
        'Ruang Belajar Inklusif & Nyaman',
        'Kantin Sehat & Sanitasi Ramah Anak',
        'Sistem Pengaduan Anti-Kekerasan'
      ],
      icon: ShieldCheck,
      colorScheme: 'amber',
      gradientBg: 'from-amber-600/30 via-orange-900/40 to-slate-950'
    },
    {
      id: 'reg-1',
      title: 'Regulasi & Acuan Kurikulum Resmi',
      subtitle: 'KMA No. 450/2024 & Permendikbudristek No. 12/2024',
      category: 'regulasi',
      tag: 'Dokumen Acuan Resmi',
      excerpt: 'Landasan hukum lengkap untuk penyusunan KSP, Modul Ajar, ATP, serta Sistem Asesmen Nasional.',
      fullContent: `Landasan Hukum & Regulasi Resmi Implementasi Kurikulum:
1. KMA No. 450 Tahun 2024: Pedoman Implementasi Kurikulum pada Madrasah (RA, MI, MTs, MA, MAK).
2. Permendikbudristek No. 12 Tahun 2024: Kurikulum pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.
3. Panduan Pembelajaran dan Asesmen (PPA) BSKAP.
4. Panduan Pengembangan Projek Penguatan Profil Pelajar Pancasila (P5) & PPRA.`,
      highlights: [
        'KMA No. 450 Tahun 2024 (Madrasah)',
        'Permendikbudristek No. 12/2024',
        'Panduan PPA & P5-PPRA BSKAP',
        'Standar Kelulusan & Asesmen'
      ],
      icon: FileText,
      colorScheme: 'blue',
      gradientBg: 'from-blue-600/30 via-indigo-900/40 to-slate-950'
    }
  ];

  // Auto-play interval for compact slider
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const currentSlide = slides[currentSlideIndex];
  const IconComponent = currentSlide.icon;

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const filteredReferences = activeTab === 'all' 
    ? slides 
    : slides.filter(r => r.category === activeTab);

  return (
    <div className="w-full py-4 px-4 sm:px-6 lg:px-8 bg-slate-950 text-white relative">
      {/* COMPACT SLIDE BANNER (Tampilan Ringkas & Hemat Ruang di Beranda) */}
      <div 
        className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-slate-900/90 shadow-2xl overflow-hidden relative group backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Animated Background Gradients */}
        <div className={`absolute inset-0 bg-gradient-to-r ${currentSlide.gradientBg} opacity-60 transition-opacity duration-700 pointer-events-none`} />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-4 sm:p-6 lg:p-7 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6">
          
          {/* Left Icon + Slide Content */}
          <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
            {/* Slide Badge & Icon */}
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white transition-all duration-500 ${
              currentSlide.colorScheme === 'emerald' ? 'bg-emerald-500 shadow-emerald-500/30' :
              currentSlide.colorScheme === 'rose' ? 'bg-rose-500 shadow-rose-500/30' :
              currentSlide.colorScheme === 'amber' ? 'bg-amber-500 shadow-amber-500/30' :
              'bg-blue-500 shadow-blue-500/30'
            }`}>
              <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>

            {/* Slide Text Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] sm:text-xs font-bold text-emerald-300">
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                  Literasi Kurikulum
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:inline">
                  • Slide {currentSlideIndex + 1} dari {slides.length}
                </span>
                <Badge className="bg-rose-500/80 text-white border-0 text-[10px] px-1.5 py-0">
                  {currentSlide.tag}
                </Badge>
              </div>

              <h3 className="text-base sm:text-xl font-black text-white truncate tracking-tight group-hover:text-emerald-300 transition-colors">
                {currentSlide.title}
              </h3>

              <p className="text-slate-300 text-xs sm:text-sm line-clamp-1 font-normal">
                {currentSlide.excerpt}
              </p>
            </div>
          </div>

          {/* Right Action Controls & Slide Dots */}
          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
            
            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/10">
              <button 
                onClick={prevSlide}
                className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Slide Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white transition-colors text-[10px]"
                title={isAutoPlaying ? "Pause Slide" : "Play Slide"}
              >
                {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button 
                onClick={nextSlide}
                className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Slide Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Dots Indicator */}
            <div className="hidden lg:flex items-center gap-1">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlideIndex 
                      ? 'w-6 bg-emerald-400' 
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Expand / Open Modal Button */}
            <Button
              onClick={() => setIsOpenFullModal(true)}
              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm px-4 py-2 sm:py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-transform hover:scale-105"
            >
              <BookOpen className="w-4 h-4" />
              <span className="whitespace-nowrap">Buka Literasi Lengkap</span>
              <Maximize2 className="w-3.5 h-3.5 opacity-80" />
            </Button>

          </div>

        </div>
      </div>

      {/* FULL MODAL / EXPANDED SLIDES & ARTICLES (Tampil Ketika Di-Klik) */}
      <Dialog open={isOpenFullModal} onOpenChange={setIsOpenFullModal}>
        <DialogContent className="max-w-5xl bg-slate-950 border-slate-800 text-white p-6 sm:p-8 rounded-3xl max-h-[90vh] overflow-y-auto">
          
          <DialogHeader className="pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
                Pusat Literasi & Panduan Resmi
              </Badge>
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs px-3 py-1">
                Rahmatan Lil 'Alamin
              </Badge>
            </div>
            <DialogTitle className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-rose-200 to-amber-300">
              Kurikulum Merdeka & Kurikulum Berbasis Cinta
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs sm:text-sm mt-1">
              Satu pintu referensi lengkap pengintegrasian standar kurikulum nasional dengan nilai kasih sayang dan pembentukan karakter ramah anak.
            </DialogDescription>
          </DialogHeader>

          {/* Interactive Modal Slider & Tabs */}
          <div className="mt-6 space-y-8">
            
            {/* Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="bg-slate-900 border border-white/10 p-1 rounded-2xl w-full sm:w-auto grid grid-cols-4 sm:flex">
                  <TabsTrigger value="all" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl text-xs sm:text-sm">Semua Topik</TabsTrigger>
                  <TabsTrigger value="merdeka" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-xl text-xs sm:text-sm">Merdeka</TabsTrigger>
                  <TabsTrigger value="cinta" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white rounded-xl text-xs sm:text-sm">Berbasis Cinta</TabsTrigger>
                  <TabsTrigger value="regulasi" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl text-xs sm:text-sm">Regulasi</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="text-xs text-slate-400">
                Menampilkan <span className="font-bold text-emerald-400">{filteredReferences.length}</span> materi literasi pilihan
              </div>
            </div>

            {/* Slide Cards Grid Inside Modal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredReferences.map((item) => {
                const IconComp = item.icon;
                return (
                  <Card 
                    key={item.id} 
                    className="bg-slate-900/80 border-white/10 hover:border-emerald-500/50 transition-all duration-300 overflow-hidden flex flex-col justify-between group cursor-pointer"
                    onClick={() => setSelectedRef(item)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className={`p-3.5 rounded-2xl ${
                          item.colorScheme === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                          item.colorScheme === 'rose' ? 'bg-rose-500/20 text-rose-400' :
                          item.colorScheme === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          <IconComp className="w-6 h-6" />
                        </div>
                        <Badge className={`${
                          item.colorScheme === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          item.colorScheme === 'rose' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          item.colorScheme === 'amber' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {item.tag}
                        </Badge>
                      </div>

                      <h4 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-slate-400 text-xs sm:text-sm mb-4 line-clamp-2">
                        {item.excerpt}
                      </p>

                      <div className="space-y-1.5 mb-6 bg-slate-950 p-3 rounded-xl border border-white/5">
                        {item.highlights.slice(0, 3).map((hl, i) => (
                          <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                        <span>Baca Penjelasan Detail</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Motivational Quote & Quick Tool Link */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-rose-950 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Smile className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-amber-200 italic">
                    "Mendidik pikiran tanpa mendidik hati adalah bukan pendidikan sama sekali. Mengajarlah dengan rasa cinta agar ilmu bertumbuh subur."
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">— Filosofi Pendidikan Ramah Anak & Kasih Sayang</p>
                </div>
              </div>

              <a href="/admin/kurikulum/ai-teaching" className="shrink-0">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm whitespace-nowrap shadow-lg shadow-emerald-500/20">
                  Buat Modul Ajar Otomatis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* SUB-DIALOG: Penjelasan Detail Setiap Item Literasi */}
      <Dialog open={!!selectedRef} onOpenChange={() => setSelectedRef(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white p-6 sm:p-8 rounded-3xl max-h-[85vh] overflow-y-auto">
          {selectedRef && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    {selectedRef.tag}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-black text-white leading-tight">
                  {selectedRef.title}
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs sm:text-sm mt-1">
                  {selectedRef.subtitle}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                <div className="bg-slate-950 p-5 rounded-2xl border border-white/10 text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {selectedRef.fullContent}
                </div>

                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Poin Kunci & Panduan Implementasi:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRef.highlights.map((h, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/80 rounded-xl border border-white/5 text-xs text-emerald-200 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-200">
                      Dokumen dan Modul Ajar dapat digenerate otomatis menggunakan AI Teaching Assistant Si@Kad.
                    </p>
                  </div>
                  <a href="/ai-teaching">
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg whitespace-nowrap">
                      Coba AI Teaching
                    </Button>
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KurikulumLiterasi;
