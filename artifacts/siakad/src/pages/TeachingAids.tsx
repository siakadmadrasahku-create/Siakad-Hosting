"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  MonitorPlay, Play, X, Search, Film, Sparkles, Presentation, 
  Image as ImageIcon, Layout, Star, Download, Volume2, Pause, RotateCcw, User, Users, Loader2, BookOpen, Calendar 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toBlob } from 'html-to-image';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const TeachingAidsPublic = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAids();
  }, []);

  const fetchAids = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'teaching_aids_list').maybeSingle();
      if (res?.value) setData(res.value as any[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filteredData = data.filter(item => 
    item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClosePreview = () => {
    window.speechSynthesis.cancel();
    setPreviewItem(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Presentation className="w-3 h-3" /> Teaching Aids Hub
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Alat Bantu <span className="text-emerald-600 font-serif-premium italic">Mengajar</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
              Eksplorasi media pembelajaran modern berupa video animasi 3D panjang dan infografis edukatif.
            </p>
            <div className="max-w-md mx-auto pt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input type="text" placeholder="Cari media..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" />
              </div>
            </div>
          </div>

          {/* Materi dan Tanggal Display */}
          <div className="mb-12">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Materi Hari Ini</p>
                    <h3 className="text-xl font-bold text-slate-900">Shalat Jumat</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-64 animate-pulse bg-white rounded-[2rem] shadow-sm" />)
            ) : filteredData.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <MonitorPlay className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Belum ada alat bantu mengajar tersedia.</p>
              </div>
            ) : (
              filteredData.map((item) => (
                <Card key={item.id} className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden group rounded-[2rem] bg-white">
                  <div className={`h-48 flex items-center justify-center relative overflow-hidden ${item.tipe === 'video' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                    {item.tipe === 'video' ? <Film className="w-16 h-16 text-white/20" /> : <ImageIcon className="w-16 h-16 text-white/20" />}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <Button onClick={() => setPreviewItem(item)} className="bg-white text-gray-900 hover:bg-gray-100 rounded-full font-bold px-8 py-6 shadow-xl"><Play className="w-5 h-5 mr-2 fill-gray-900" /> Lihat Media</Button>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold uppercase tracking-wider">{item.mata_pelajaran}</span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[9px] font-bold uppercase tracking-wider">{item.tipe}</span>
                    </div>
                    <h3 className="font-extrabold text-gray-900 mb-2 truncate text-xl group-hover:text-emerald-600 transition-colors">{item.judul}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{item.deskripsi}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="sm:max-w-5xl rounded-[2.5rem] overflow-hidden p-0 border-0 shadow-2xl flex flex-col max-h-[95vh]">
          {previewItem && (
            previewItem.tipe === 'video' ? 
              <VideoPlayer item={previewItem} onClose={handleClosePreview} /> : 
              <ImageDisplay item={previewItem} onClose={handleClosePreview} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const VideoPlayer = ({ item, onClose }: { item: any, onClose: () => void }) => {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const scenes = item?.video_data || [];
  const timerRef = useRef<any>(null);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      if (item?.voice_gender === 'male') {
        return (name.includes('male') || name.includes('david') || name.includes('wira')) && lang.startsWith('id');
      } else {
        return (name.includes('female') || name.includes('zira') || name.includes('gadis')) && lang.startsWith('id');
      }
    });

    if (!selectedVoice && item?.voice_gender === 'male') {
      selectedVoice = voices.find(v => v.name.toLowerCase().includes('male'));
    }

    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isPlaying && currentScene < scenes.length) {
      speak(scenes[currentScene].narasi);
      timerRef.current = setTimeout(() => {
        if (currentScene < scenes.length - 1) setCurrentScene(prev => prev + 1);
        else { setIsPlaying(false); window.speechSynthesis.cancel(); }
      }, 8000);
    }
    return () => { 
      clearTimeout(timerRef.current); 
      window.speechSynthesis.cancel(); 
    };
  }, [isPlaying, currentScene, scenes.length]);

  const scene = scenes[currentScene] || {};

  const get3DBackground = () => {
    const mapel = item.mata_pelajaran.toLowerCase();
    if (mapel.includes('quran') || mapel.includes('akidah') || mapel.includes('fiqih')) {
      return "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=1200&q=80";
    }
    if (mapel.includes('matematika') || mapel.includes('ipas')) {
      return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80";
    }
    return "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=1200&q=80";
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="p-4 sm:p-6 flex items-center justify-between bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg"><MonitorPlay className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm sm:text-base truncate">{item.judul}</h2>
            <p className="text-blue-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Scene {currentScene + 1} of {scenes.length} • Suara {item.voice_gender === 'male' ? 'Laki-laki' : 'Perempuan'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center"><X /></button>
      </div>
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="w-full max-w-4xl aspect-video rounded-2xl sm:rounded-[2.5rem] shadow-2xl relative flex flex-col items-center justify-center text-center p-6 sm:p-12 transition-all duration-1000 overflow-hidden border-4 border-white/10">
          <img src={get3DBackground()} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-950"></div>
          <div className="relative z-10 space-y-4 sm:space-y-8 animate-in zoom-in fade-in duration-700">
            <h1 className="text-3xl sm:text-6xl font-black text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] tracking-tighter leading-tight font-serif-premium italic">{scene.teks_layar}</h1>
          </div>
          <div className="absolute bottom-4 sm:bottom-10 left-4 sm:left-10 right-4 sm:right-10 bg-white/10 backdrop-blur-2xl p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/20 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${item.voice_gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                {item.voice_gender === 'male' ? <User className="text-white w-6 h-6" /> : <Users className="text-white w-6 h-6" />}
              </div>
              <p className="text-white text-sm sm:text-xl font-bold leading-relaxed text-left line-clamp-3 drop-shadow-sm">{scene.narasi}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-8 bg-white/5 backdrop-blur-md border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 sm:flex-none ${isPlaying ? 'bg-amber-500' : 'bg-blue-600'} text-white rounded-full px-10 h-12 sm:h-16 font-black shadow-2xl transition-all hover:scale-105`}>
            {isPlaying ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />} {isPlaying ? 'PAUSE' : 'PUTAR VIDEO'}
          </Button>
          <Button variant="ghost" onClick={() => { setCurrentScene(0); setIsPlaying(false); }} className="text-white hover:bg-white/10 rounded-2xl font-bold h-12 sm:h-16 px-6"><RotateCcw className="w-5 h-5 mr-2" /> RESTART</Button>
        </div>
        <div className="flex gap-2">
          {scenes.map((_: any, i: number) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === currentScene ? 'w-10 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-2 bg-white/20'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

const ImageDisplay = ({ item, onClose }: { item: any, onClose: () => void }) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const d = item.image_data || {};

  // LOGIKA CERDAS: Pre-flight Base64 Conversion
  const prepareImage = async () => {
    if (!d.image_url || localImageUrl) return;
    setIsPreparing(true);
    try {
      const response = await fetch(d.image_url, { mode: 'cors' });
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImageUrl(reader.result as string);
        setIsPreparing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Base64 Pre-flight failed:", err);
      setIsPreparing(false);
      setLocalImageUrl(d.image_url);
    }
  };

  useEffect(() => {
    prepareImage();
  }, [d.image_url]);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    const toastId = showLoading('Menjalankan Logika Unduh Cerdas...');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const blob = await toBlob(posterRef.current, { 
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      if (!blob) throw new Error("Gagal memproses data biner gambar.");

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `infografis-3d-${item.judul.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = url;
      link.click();
      window.URL.revokeObjectURL(url);
      
      dismissToast(toastId as string);
      showSuccess('Gambar 3D berhasil diunduh!');
    } catch (err) { 
      dismissToast(toastId as string);
      console.error(err);
      showError('Gagal mengunduh. Browser memblokir akses. Coba refresh halaman.'); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 sm:p-6 flex items-center justify-between bg-white border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Layout className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h2 className="text-gray-900 font-bold text-sm sm:text-base truncate">{item.judul}</h2>
            <p className="text-emerald-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Infografis Digital 3D</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"><X /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-12 flex justify-center items-start">
        <div ref={posterRef} className="w-full max-w-md sm:max-w-2xl bg-white rounded-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden border-[6px] sm:border-[12px] border-white flex flex-col" style={{ minHeight: '600px' }}>
          <div className="p-6 sm:p-12 text-white relative overflow-hidden" style={{ backgroundColor: d.theme_color || '#064e3b' }}>
            {localImageUrl && (
              <img 
                src={localImageUrl} 
                className="absolute inset-0 w-full h-full object-cover opacity-30" 
                alt="" 
              />
            )}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="relative z-10 space-y-2 sm:space-y-4">
              <Badge className="bg-white/20 text-white border-0 px-3 py-0.5 rounded-full font-black text-[8px] sm:text-[10px] uppercase tracking-widest">Materi {item.mata_pelajaran}</Badge>
              <h1 className="text-xl sm:text-4xl font-black leading-tight tracking-tighter drop-shadow-md">{d.main_title}</h1>
              <p className="text-white/90 text-[10px] sm:text-lg font-medium italic line-clamp-2">"{d.subtitle}"</p>
            </div>
          </div>
          <div className="flex-1 p-6 sm:p-12 space-y-6 sm:space-y-8 bg-white">
            {d.points?.map((p: any, i: number) => (
              <div key={i} className="flex gap-4 sm:gap-6 items-start group">
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-3xl bg-gray-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500"><Star className="w-5 h-5 sm:w-8 sm:h-8" /></div>
                <div className="flex-1 space-y-0.5 sm:space-y-1">
                  <h3 className="text-sm sm:text-xl font-black text-gray-900">{p.title}</h3>
                  <p className="text-gray-500 text-[10px] sm:text-base leading-relaxed line-clamp-3">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 sm:p-12 bg-gray-50 border-t flex items-center justify-between">
            <p className="text-[8px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">{d.footer_note}</p>
            <div className="text-right"><p className="text-[8px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Si@Kad Madrasah</p></div>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-8 bg-white border-t flex items-center justify-center gap-3">
        <Button 
          onClick={handleDownload} 
          disabled={isPreparing}
          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-10 h-12 sm:h-14 font-black shadow-xl"
        >
          {isPreparing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />} 
          {isPreparing ? 'MENYIAPKAN MEDIA...' : 'UNDUH GAMBAR 3D'}
        </Button>
      </div>
    </div>
  );
};

export default TeachingAidsPublic;