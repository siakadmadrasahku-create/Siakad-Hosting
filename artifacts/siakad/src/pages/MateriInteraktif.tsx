"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, Sparkles, Eye, X, Rocket, Lightbulb, CheckCircle2, Trophy, 
  ArrowRight, ArrowLeft, Library, Quote, Book, Star, Search, Brain
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const MateriInteraktifPublic = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("intro");
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMateri();
  }, []);

  const fetchMateri = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'materi_interaktif_list').maybeSingle();
      if (res?.value) setData(res.value as any[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const parseContent = (content: string, section: string) => {
    const parts = content.split(/\[(INTRO|CONTENT|SUMMARY|CHALLENGE)\]/);
    const index = parts.indexOf(section);
    return index !== -1 ? parts[index + 1].trim() : "Konten belum tersedia.";
  };

  const getProgress = () => {
    switch(activeTab) {
      case 'intro': return 20;
      case 'content': return 50;
      case 'summary': return 75;
      case 'challenge': return 90;
      case 'ref': return 100;
      default: return 0;
    }
  };

  const filteredData = data.filter(item => 
    item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Brain className="w-3 h-3" /> Pusat Belajar Mandiri
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Materi <span className="text-emerald-600 font-serif-premium italic">Interaktif</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
              Eksplorasi pengetahuan mendalam dengan modul pembelajaran interaktif yang dirancang khusus untuk Generasi Rabbani.
            </p>
            
            <div className="max-w-md mx-auto pt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="Cari materi atau mata pelajaran..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border-0 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-64 animate-pulse bg-white rounded-[2rem] shadow-sm" />)
            ) : filteredData.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Belum ada materi yang tersedia saat ini.</p>
              </div>
            ) : (
              filteredData.map((item) => (
                <Card key={item.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group rounded-[2rem] overflow-hidden bg-white">
                  <div className="h-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500"></div>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2">
                        <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{item.mata_pelajaran}</Badge>
                        <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Fase {item.fase}</Badge>
                      </div>
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-xl mb-2 leading-tight group-hover:text-emerald-600 transition-colors">{item.judul}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-6 leading-relaxed">{item.deskripsi}</p>
                    <Button 
                      onClick={() => { setPreviewItem(item); setActiveTab("intro"); }}
                      className="w-full bg-gray-900 text-white hover:bg-emerald-600 rounded-2xl py-6 font-bold transition-all shadow-lg group-hover:shadow-emerald-200"
                    >
                      <Eye className="w-5 h-5 mr-2" /> Mulai Belajar
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Learning Player Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-5xl rounded-[2.5rem] max-h-[95vh] overflow-hidden p-0 border-0 shadow-2xl flex flex-col">
          <div className="bg-white border-b p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{previewItem?.judul}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-emerald-200 text-emerald-700">{previewItem?.mata_pelajaran}</Badge>
                  <span className="text-gray-300">•</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">FASE {previewItem?.fase}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setPreviewItem(null)} className="w-12 h-12 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-10 pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                <Star className="w-3 h-3 fill-emerald-600" /> Progress Belajar
              </span>
              <span className="text-[10px] font-bold text-gray-400">{getProgress()}% Selesai</span>
            </div>
            <Progress value={getProgress()} className="h-2.5 bg-gray-100 rounded-full" />
          </div>

          <div className="flex-1 overflow-y-auto p-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-5 gap-3 bg-gray-100/50 p-2 rounded-2xl mb-10">
                <TabsTrigger value="intro" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600">
                  <Rocket className="w-4 h-4 mr-2" /> Mulai
                </TabsTrigger>
                <TabsTrigger value="content" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-amber-600">
                  <Book className="w-4 h-4 mr-2" /> Materi
                </TabsTrigger>
                <TabsTrigger value="summary" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Intisari
                </TabsTrigger>
                <TabsTrigger value="challenge" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-purple-600">
                  <Trophy className="w-4 h-4 mr-2" /> Misi
                </TabsTrigger>
                <TabsTrigger value="ref" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-rose-600">
                  <Library className="w-4 h-4 mr-2" /> Pustaka
                </TabsTrigger>
              </TabsList>

              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <TabsContent value="intro" className="mt-0">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] p-10 border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                      <Rocket className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-3xl font-black text-blue-900 mb-6 tracking-tight">Siap Membuka Jendela Dunia?</h3>
                    <div className="prose prose-blue max-w-none text-blue-800/90 leading-relaxed text-xl font-medium italic">
                      {previewItem ? parseContent(previewItem.konten, "INTRO") : ""}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="mt-0">
                  <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
                        <Lightbulb className="w-8 h-8 text-amber-600" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">Eksplorasi Pengetahuan</h3>
                    </div>
                    
                    <div className="space-y-8">
                      {previewItem ? parseContent(previewItem.konten, "CONTENT").split('\n\n').map((block, idx) => {
                        if (block.startsWith('>')) {
                          return (
                            <div key={idx} className="bg-emerald-50 border-l-8 border-emerald-500 p-8 rounded-2xl my-8">
                              <Quote className="w-10 h-10 text-emerald-200 mb-4" />
                              <p className="text-2xl font-serif text-emerald-900 leading-relaxed text-center italic">
                                {block.replace('>', '').trim()}
                              </p>
                            </div>
                          );
                        }
                        if (block.startsWith('###')) {
                          return (
                            <h4 key={idx} className="text-2xl font-bold text-gray-900 border-b-2 border-emerald-100 pb-3 mt-10 flex items-center gap-3">
                              <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                              {block.replace('###', '').trim()}
                            </h4>
                          );
                        }
                        return (
                          <div key={idx} className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                            {block}
                          </div>
                        );
                      }) : ""}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] p-10 border border-emerald-100 shadow-sm">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-3xl font-black text-emerald-900 mb-8 tracking-tight">Intisari Pembelajaran</h3>
                    <div className="grid gap-6">
                      {previewItem ? parseContent(previewItem.konten, "SUMMARY").split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-4 bg-white/60 p-6 rounded-2xl border border-emerald-100/50">
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-xl text-emerald-800 font-semibold leading-tight">{line.replace('-', '').trim()}</p>
                        </div>
                      )) : ""}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="challenge" className="mt-0">
                  <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-[2.5rem] p-12 border border-purple-100 text-center relative overflow-hidden">
                    <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-purple-200/20 rounded-full blur-3xl"></div>
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl border-4 border-purple-100">
                      <Trophy className="w-12 h-12 text-purple-600" />
                    </div>
                    <h3 className="text-4xl font-black text-purple-900 mb-6 tracking-tight">Misi Sang Juara!</h3>
                    <div className="prose prose-purple max-w-2xl mx-auto text-purple-800/90 leading-relaxed text-xl font-bold mb-10">
                      {previewItem ? parseContent(previewItem.konten, "CHALLENGE") : ""}
                    </div>
                    <Button onClick={() => setActiveTab("ref")} className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-12 py-8 text-lg font-black shadow-2xl shadow-purple-200 transition-all hover:scale-105">
                      Selesaikan Misi & Lihat Referensi <ArrowRight className="w-6 h-6 ml-3" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="ref" className="mt-0">
                  <div className="bg-white rounded-[2.5rem] p-10 border border-rose-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner">
                        <Library className="w-8 h-8 text-rose-600" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">Referensi Pustaka</h3>
                    </div>
                    <div className="space-y-4">
                      {previewItem?.referensi.split('\n').map((ref: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 p-5 bg-rose-50/30 rounded-2xl border border-rose-100/50">
                          <Book className="w-5 h-5 text-rose-400" />
                          <p className="text-lg text-rose-900 font-medium">{ref.trim()}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-12 pt-10 border-t border-gray-100 flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-6 h-6" />
                        <span>Selamat! Kamu telah menyelesaikan modul ini.</span>
                      </div>
                      <Button onClick={() => setPreviewItem(null)} className="bg-gray-900 text-white rounded-2xl px-12 py-7 text-lg font-black shadow-xl hover:bg-emerald-600 transition-all">
                        Tutup & Selesai
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="p-8 bg-gray-50 border-t flex justify-between items-center">
            <Button 
              variant="ghost" 
              disabled={activeTab === 'intro'}
              onClick={() => {
                if (activeTab === 'content') setActiveTab('intro');
                else if (activeTab === 'summary') setActiveTab('content');
                else if (activeTab === 'challenge') setActiveTab('summary');
                else if (activeTab === 'ref') setActiveTab('challenge');
              }}
              className="rounded-2xl font-black px-8 py-6 text-gray-500 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5 mr-3" /> Sebelumnya
            </Button>
            
            <div className="hidden sm:flex gap-3">
              {['intro', 'content', 'summary', 'challenge', 'ref'].map((t) => (
                <div key={t} className={`h-3 rounded-full transition-all duration-500 ${activeTab === t ? 'w-12 bg-emerald-500 shadow-lg shadow-emerald-200' : 'w-3 bg-gray-300'}`} />
              ))}
            </div>

            <Button 
              disabled={activeTab === 'ref'}
              onClick={() => {
                if (activeTab === 'intro') setActiveTab('content');
                else if (activeTab === 'content') setActiveTab('summary');
                else if (activeTab === 'summary') setActiveTab('challenge');
                else if (activeTab === 'challenge') setActiveTab('ref');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black px-10 py-6 shadow-xl shadow-emerald-100"
            >
              Selanjutnya <ArrowRight className="w-5 h-5 ml-3" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MateriInteraktifPublic;