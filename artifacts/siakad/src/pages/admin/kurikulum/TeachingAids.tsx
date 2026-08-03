"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Pencil, Trash2, MonitorPlay, Sparkles, Loader2, Save, Play, 
  Download, X, Film, Wand2, Presentation, Volume2, Image as ImageIcon, 
  Layout, Star, Pause, RotateCcw, CheckCircle2, User, Users, BookOpen, Calendar 
} from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { toBlob } from 'html-to-image';
import { toast } from 'sonner';

interface AidItem {
  id: string;
  mata_pelajaran: string;
  fase: string;
  materi_pokok: string;
  judul: string;
  tipe: 'video' | 'gambar';
  voice_gender: 'male' | 'female';
  deskripsi: string;
  video_data?: any[]; 
  image_data?: any;
  created_at: string;
}

const MATA_PELAJARAN = [
  'Al-Quran Hadits', 'Akidah Akhlak', 'Fiqih', 'Sejarah Kebudayaan Islam',
  'Bahasa Arab', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 
  'IPAS', 'Seni Budaya', 'PJOK', 'Bahasa Inggris', 'Muatan Lokal'
];

const TeachingAids = () => {
  const [data, setData] = useState<AidItem[]>([]);
  const [bedahCPData, setBedahCPData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<AidItem | null>(null);
  const [editingItem, setEditingItem] = useState<AidItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({ 
    mata_pelajaran: 'Al-Quran Hadits', 
    fase: 'A', 
    materi_pokok: '',
    judul: '', 
    tipe: 'video' as 'video' | 'gambar', 
    voice_gender: 'female' as 'male' | 'female',
    deskripsi: '',
    video_data: null as any,
    image_data: null as any
  });

  useEffect(() => {
    fetchAids();
    fetchBedahCP();
  }, []);

  const fetchAids = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'teaching_aids_list').maybeSingle();
      if (res?.value) setData(res.value as AidItem[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchBedahCP = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'bedah_cp_data').maybeSingle();
      if (res?.value) setBedahCPData(res.value as any[]);
    } catch (err) { console.error(err); }
  };

  const handleGenerateAI = async () => {
    if (!formData.judul && !formData.materi_pokok) {
      showError('Pilih Materi Pokok atau isi Judul terlebih dahulu!');
      return;
    }
    setIsGenerating(true);
    try {
      const { data: apiConfigRes } = await supabase.from('site_settings').select('value').eq('id', 'api_keys').maybeSingle();
      const apiConfig = apiConfigRes?.value;

      const prompt = formData.tipe === 'video' ? `
        TUGAS: Buatlah PRODUKSI VIDEO ANIMASI LENGKAP (Intro, Materi Inti, Outro) untuk:
        Topik: ${formData.judul || formData.materi_pokok}
        Mapel: ${formData.mata_pelajaran}
        Fase: ${formData.fase}

        STRUKTUR WAJIB:
        1. INTRO: Pembukaan ceria (1 Scene)
        2. CONTENT: Materi inti mendalam (Minimal 5 Scene)
        3. OUTRO: Kesimpulan & Motivasi (1 Scene)
        
        FORMAT OUTPUT WAJIB JSON ARRAY:
        [
          { "type": "intro", "visual_style": "3d_islamic_kids", "narasi": "Teks narasi suara...", "teks_layar": "Judul di layar", "bg_color": "#064e3b" },
          ...
        ]
      ` : `
        TUGAS: Buatlah DESAIN INFOGRAFIS EDUKASI DIGITAL 3D yang sangat menarik untuk:
        Topik: ${formData.judul || formData.materi_pokok}
        Mapel: ${formData.mata_pelajaran}

        PENTING: 
        1. Sertakan 'image_url' dari Unsplash yang sangat relevan. Gunakan keyword pencarian yang spesifik seperti: "3d render, octane render, cinematic lighting, high detail, [topik terkait]".
        2. Buatlah 4 poin materi yang sangat detail dan informatif.

        FORMAT OUTPUT WAJIB JSON OBJECT:
        {
          "main_title": "...",
          "subtitle": "...",
          "image_url": "https://images.unsplash.com/photo-...", 
          "points": [
            {"title": "...", "desc": "...", "icon": "Star/Heart/Zap/Check"}
          ],
          "footer_note": "...",
          "theme_color": "#064e3b"
        }
      `;

      const { data: aiRes, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: { message: prompt, systemPrompt: "Anda adalah AI Production Engine Media Pembelajaran 3D. Jawab hanya dengan JSON.", config: apiConfig, history: [] }
      });

      if (aiError) throw aiError;
      if (aiRes?.text) {
        const cleanJson = aiRes.text.replace(/```json|```/g, '').trim();
        const resultData = JSON.parse(cleanJson);
        
        if (formData.tipe === 'video') {
          setFormData(prev => ({ ...prev, video_data: resultData, image_data: null, deskripsi: `Video animasi 3D mengenai ${formData.judul || formData.materi_pokok}` }));
          showSuccess('Video Produksi AI Berhasil Disusun!');
        } else {
          setFormData(prev => ({ ...prev, image_data: resultData, video_data: null, deskripsi: `Infografis 3D mengenai ${formData.judul || formData.materi_pokok}` }));
          showSuccess('Infografis AI Berhasil Didesain!');
        }
      }
    } catch (error) {
      showError('Gagal generate AI. Periksa API Key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.mata_pelajaran || !formData.materi_pokok) {
      showError('Lengkapi data!');
      return;
    }
    setIsSaving(true);
    try {
      let newList: AidItem[];
      if (editingItem) {
        newList = data.map(d => d.id === editingItem.id ? { ...formData, id: d.id, created_at: d.created_at } : d);
      } else {
        const newItem: AidItem = { ...formData, id: Date.now().toString(), created_at: new Date().toISOString() } as AidItem;
        newList = [newItem, ...data];
      }
      await supabase.from('site_settings').upsert({ id: 'teaching_aids_list', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      showSuccess('Produksi Media Berhasil Disimpan!');
      setDialogOpen(false);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const formattedDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <AdminLayout title="Alat Bantu Mengajar Modern">
      {/* Materi dan Tanggal Display */}
      <Card className="mb-6 border-0 shadow-md bg-white overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span className="font-bold">Materi:</span>
              <span className="font-medium">Shalat Jumat</span>
            </div>
            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="font-semibold">{formattedDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Presentation className="w-7 h-7 text-emerald-600" /> AI Production Hub
          </h2>
          <p className="text-gray-500 text-sm">Produksi video animasi 3D & infografis otomatis berbasis AI.</p>
        </div>
        <Button onClick={() => {
          setEditingItem(null);
          setFormData({ mata_pelajaran: 'Al-Quran Hadits', fase: 'A', materi_pokok: '', judul: '', tipe: 'video', voice_gender: 'female', deskripsi: '', video_data: null, image_data: null });
          setDialogOpen(true);
        }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-6 shadow-lg font-bold">
          <Plus className="w-5 h-5 mr-2" /> Produksi Media Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <Card key={i} className="h-64 animate-pulse bg-gray-100 border-0 rounded-3xl" />)
        ) : data.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
            <MonitorPlay className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Belum ada media produksi.</p>
          </div>
        ) : (
          data.map((item) => (
            <Card key={item.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group rounded-[2rem] overflow-hidden bg-white">
              <div className={`h-40 flex items-center justify-center relative overflow-hidden ${
                item.tipe === 'video' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-400 to-teal-600'
              }`}>
                {item.tipe === 'video' ? <Film className="w-12 h-12 text-white/30" /> : <ImageIcon className="w-12 h-12 text-white/30" />}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button onClick={() => setPreviewItem(item)} className="bg-white text-gray-900 hover:bg-gray-100 rounded-full font-bold px-6 shadow-xl">
                    <Play className="w-4 h-4 mr-2" /> Putar / Lihat
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">{item.tipe.toUpperCase()}</Badge>
                    {item.tipe === 'video' && <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">{item.voice_gender === 'male' ? 'Laki-laki' : 'Perempuan'}</Badge>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormData({ ...item, video_data: item.video_data || null, image_data: item.image_data || null }); setDialogOpen(true); }} className="h-8 w-8 p-0 text-blue-600"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if(confirm('Hapus?')) { const nl = data.filter(d => d.id !== item.id); supabase.from('site_settings').upsert({ id: 'teaching_aids_list', value: nl }).then(() => setData(nl)); } }} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{item.judul}</h3>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{item.mata_pelajaran}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Wand2 className="w-6 h-6 text-yellow-300" />
                {editingItem ? 'Edit Produksi Media' : 'AI Media Production Engine'}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mata Pelajaran</label>
                <Select value={formData.mata_pelajaran} onValueChange={(v) => setFormData({ ...formData, mata_pelajaran: v, materi_pokok: '' })}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{MATA_PELAJARAN.map(mp => <SelectItem key={mp} value={mp}>{mp}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase Belajar</label>
                <Select value={formData.fase} onValueChange={(v) => setFormData({ ...formData, fase: v, materi_pokok: '' })}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl"><SelectItem value="A">Fase A</SelectItem><SelectItem value="B">Fase B</SelectItem><SelectItem value="C">Fase C</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipe Media</label>
                <Select value={formData.tipe} onValueChange={(v: any) => setFormData({ ...formData, tipe: v })}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="video">Video Animasi 3D (Intro-Outro)</SelectItem>
                    <SelectItem value="gambar">Infografis Edukasi Digital 3D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.tipe === 'video' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pilihan Suara Narasi</label>
                  <Select value={formData.voice_gender} onValueChange={(v: any) => setFormData({ ...formData, voice_gender: v })}>
                    <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="female"><div className="flex items-center gap-2"><User className="w-4 h-4 text-pink-500" /> Suara Perempuan</div></SelectItem>
                      <SelectItem value="male"><div className="flex items-center gap-2"><User className="w-4 h-4 text-blue-500" /> Suara Laki-laki</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Materi Pokok (Kurikulum)</label>
              <Select value={formData.materi_pokok} onValueChange={(v) => setFormData({ ...formData, materi_pokok: v, judul: v })}>
                <SelectTrigger className="rounded-2xl h-14 border-emerald-100 bg-emerald-50/30"><SelectValue placeholder="Pilih dari Bedah CP..." /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {bedahCPData.filter(cp => cp.mata_pelajaran === formData.mata_pelajaran && cp.fase === formData.fase).map((m, idx) => <SelectItem key={idx} value={m.materi_pokok}>{m.materi_pokok}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data Produksi AI</label>
                <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="text-purple-600 border-purple-100 hover:bg-purple-50 rounded-xl font-bold">
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Produksi AI
                </Button>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border border-dashed text-center">
                {formData.video_data || formData.image_data ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <p className="text-sm font-bold text-gray-700">Data Produksi Siap!</p>
                    <p className="text-xs text-gray-400">Klik Simpan untuk mempublikasikan media ini.</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Belum ada data produksi. Klik tombol Generate di atas.</p>
                )}
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-2xl h-14 font-bold text-gray-500">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving || (!formData.video_data && !formData.image_data)} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold shadow-xl">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Simpan Produksi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Player Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-5xl rounded-[2.5rem] max-h-[95vh] overflow-hidden p-0 border-0 shadow-2xl flex flex-col">
          {previewItem?.tipe === 'video' ? (
            <VideoRenderer item={previewItem} onClose={() => setPreviewItem(null)} />
          ) : (
            <ImageRenderer item={previewItem} onClose={() => setPreviewItem(null)} />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

// COMPONENT RENDERER VIDEO ANIMASI PANJANG
const VideoRenderer = ({ item, onClose }: { item: AidItem | null, onClose: () => void }) => {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const scenes = useMemo(() => item?.video_data || [], [item?.video_data]);
  const timerRef = useRef<any>(null);

  const speak = useCallback((text: string) => {
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
  }, [item?.voice_gender]);

  useEffect(() => {
    if (isPlaying && currentScene < scenes.length) {
      speak(scenes[currentScene].narasi);
      timerRef.current = setTimeout(() => {
        if (currentScene < scenes.length - 1) setCurrentScene(prev => prev + 1);
        else { setIsPlaying(false); window.speechSynthesis.cancel(); }
      }, 8000); 
    }
    return () => { 
      if (timerRef.current) clearTimeout(timerRef.current); 
      window.speechSynthesis.cancel(); 
    };
  }, [isPlaying, currentScene, scenes, speak]);

  if (!item) return null;
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
        <div 
          className="w-full max-w-4xl aspect-video rounded-2xl sm:rounded-[2.5rem] shadow-2xl relative flex flex-col items-center justify-center text-center p-6 sm:p-12 transition-all duration-1000 overflow-hidden border-4 border-white/10"
        >
          <img src={get3DBackground()} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-950"></div>

          <div className="relative z-10 space-y-4 sm:space-y-8 animate-in zoom-in fade-in duration-700">
            <h1 className="text-3xl sm:text-6xl font-black text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] tracking-tighter leading-tight font-serif-premium italic">
              {scene.teks_layar}
            </h1>
          </div>

          <div className="absolute bottom-4 sm:bottom-10 left-4 sm:left-10 right-4 sm:right-10 bg-white/10 backdrop-blur-2xl p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/20 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${item.voice_gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                {item.voice_gender === 'male' ? <User className="text-white w-6 h-6" /> : <Users className="text-white w-6 h-6" />}
              </div>
              <p className="text-white text-sm sm:text-xl font-bold leading-relaxed text-left line-clamp-3 drop-shadow-sm">
                {scene.narasi}
              </p>
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
        <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
          <div className="flex gap-2">
            {scenes.map((_: any, i: number) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === currentScene ? 'w-10 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-2 bg-white/20'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// COMPONENT RENDERER INFOGRAFIS
const ImageRenderer = ({ item, onClose }: { item: AidItem | null, onClose: () => void }) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // LOGIKA CERDAS: Pre-flight Base64 Conversion
  const prepareImage = useCallback(async () => {
    if (!item?.image_data?.image_url || localImageUrl) return;
    setIsPreparing(true);
    try {
      const response = await fetch(item.image_data.image_url, { mode: 'cors' });
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
      // Fallback ke URL asli jika gagal, tapi kemungkinan unduh akan gagal juga
      if (item?.image_data?.image_url) setLocalImageUrl(item.image_data.image_url);
    }
  }, [item?.image_data?.image_url, localImageUrl]);

  useEffect(() => {
    prepareImage();
  }, [prepareImage]);

  if (!item || !item.image_data) return null;
  const d = item.image_data;
  const handleDownload = async () => {
    if (!posterRef.current) return;
    const toastId = showLoading('Menjalankan Logika Unduh Cerdas...');
    try {
      // Jeda untuk memastikan render ulang dengan Base64 selesai
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
      console.error("Smart Download Error:", err);
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
        <div 
          ref={posterRef}
          className="w-full max-w-md sm:max-w-2xl bg-white rounded-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden border-[6px] sm:border-[12px] border-white flex flex-col"
          style={{ minHeight: '600px' }}
        >
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
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-3xl bg-gray-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                  <Star className="w-5 h-5 sm:w-8 sm:h-8" />
                </div>
                <div className="flex-1 space-y-0.5 sm:space-y-1">
                  <h3 className="text-sm sm:text-xl font-black text-gray-900">{p.title}</h3>
                  <p className="text-gray-500 text-[10px] sm:text-base leading-relaxed line-clamp-3">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 sm:p-12 bg-gray-50 border-t flex items-center justify-between">
            <p className="text-[8px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">{d.footer_note}</p>
            <div className="text-right">
              <p className="text-[8px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Si@Kad Madrasah</p>
            </div>
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

export default TeachingAids;