"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import QuickMenuGrid from '@/components/QuickMenuGrid';
import KurikulumLiterasi from '@/components/KurikulumLiterasi';
import About from '@/components/About';
import Programs from '@/components/Programs';
import Announcements from '@/components/Announcements';
import Posts from '@/components/Posts';
import Gallery from '@/components/Gallery';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, Sparkles, Calendar, FileCheck } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from '@/integrations/supabase/client';

interface AITeachingItem {
  id: string;
  jenis_dokumen: string;
  mata_pelajaran: string;
  fase: string;
  topik: string;
  materi_pokok: string[];
  alokasi_waktu: string;
  hasil: string;
  created_at: string;
  tanggal_cetak?: string;
}

const DOKUMEN_INFO: Record<string, { label: string }> = {
  prota: { label: 'PROTA' },
  promes: { label: 'PROMES' },
  silabus: { label: 'ATP / Silabus' },
  rpp_rpm: { label: 'RPP / RPM' },
  modul_ajar: { label: 'Modul Ajar' },
  jurnal_mengajar: { label: 'Jurnal Mengajar' },
  cp_tp_atp: { label: 'Analisis CP' },
  kktp: { label: 'KKTP' },
};

const Index = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const dayName = today.toLocaleDateString('id-ID', { weekday: 'long' });
  const dateNumber = today.getDate();
  const monthName = today.toLocaleDateString('id-ID', { month: 'long' });
  const [materials, setMaterials] = useState<AITeachingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const { data: res } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'ai_teaching_list')
          .maybeSingle();
        
        if (res?.value && Array.isArray(res.value)) {
          const sorted = (res.value as AITeachingItem[]).sort((a, b) => 
            new Date(b.created_at || b.tanggal_cetak).getTime() - new Date(a.created_at || a.tanggal_cetak).getTime()
          );
          setMaterials(sorted);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO />
      <Navbar />
      <main className="flex-1">
        <section id="home">
          <Hero />
        </section>

        {/* Quick Menu Icons Grid under Hero */}
        <QuickMenuGrid />

        {/* Section Literasi Kurikulum Merdeka & Kurikulum Berbasis Cinta */}
        <section id="literasi-kurikulum">
          <KurikulumLiterasi />
        </section>

        <section id="about">
          <About />
        </section>

        {/* Materi dan Tanggal Display */}
        <section className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Decorative Elements */}
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-emerald-200 rounded-full blur-2xl opacity-40"></div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-teal-200 rounded-full blur-2xl opacity-30"></div>
              
              <Card className="border border-emerald-100/80 shadow-md hover:shadow-lg transition-shadow overflow-hidden relative bg-gradient-to-r from-white via-emerald-50/30 to-teal-50/50 rounded-2xl">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-5 relative">
                    {/* Icon Header */}
                    <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-emerald-400 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                      {/* Materi Section with Carousel */}
                      <div className="flex-1 w-full min-w-0">
                        {loading ? (
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-gray-200 rounded-xl animate-pulse" />
                            <div className="space-y-1.5">
                              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                            </div>
                          </div>
                        ) : materials.length > 0 ? (
                          <Carousel className="w-full">
                            <CarouselContent>
                              {materials.map((material, index) => (
                                <CarouselItem key={material.id || index}>
                                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                                      <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] sm:text-xs font-extrabold text-amber-700 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                                        ✨ {DOKUMEN_INFO[material.jenis_dokumen]?.label || 'Materi'}
                                      </p>
                                      <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 leading-snug whitespace-nowrap overflow-hidden text-ellipsis">
                                        {material.topik || material.mata_pelajaran}
                                      </h2>
                                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                        {material.mata_pelajaran} • {material.fase}
                                      </p>
                                      {material.materi_pokok && material.materi_pokok.length > 0 && (
                                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                          <span className="font-semibold">Materi: </span>
                                          {Array.isArray(material.materi_pokok) 
                                            ? material.materi_pokok.join(', ') 
                                            : material.materi_pokok}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                            <CarouselPrevious className="-left-8 w-7 h-7" />
                            <CarouselNext className="-right-8 w-7 h-7" />
                          </Carousel>
                        ) : (
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                              <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest mb-0.5">
                                ✨ Materi Hari Ini
                              </p>
                              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug whitespace-nowrap">
                                Belum ada materi
                              </h2>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tanggal Section */}
                      <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-md shrink-0 self-stretch md:self-auto justify-between md:justify-start">
                        <div className="w-10 h-10 bg-emerald-400 rounded-xl flex flex-col items-center justify-center text-slate-900 shrink-0">
                          <span className="text-[9px] font-bold uppercase leading-tight">{dateNumber}</span>
                          <span className="text-xs font-black leading-tight">{monthName.substring(0, 4)}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{dayName}</p>
                          <p className="text-xs sm:text-sm font-bold text-white">{formattedDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section id="programs">
          <Programs />
        </section>
        <section id="announcements">
          <Announcements />
        </section>
        <section id="posts">
          <Posts />
        </section>
        <section id="gallery">
          <Gallery />
        </section>
        <section id="contact">
          <Contact />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;