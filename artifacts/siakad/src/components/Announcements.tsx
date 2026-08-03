"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Bell, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ImageSlideshow from './ImageSlideshow';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [showAll, setShowAll] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'announcements_data_list').maybeSingle();
        if (res?.value) {
          const list = (res.value as any[]).filter(item => item.is_active);
          setAnnouncements(list);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchAnnouncements();
  }, []);

  if (!loading && announcements.length === 0) return null;

  const initialLimit = isMobile ? 1 : 3;
  const displayedAnnouncements = showAll ? announcements : announcements.slice(0, initialLimit);

  return (
    <section id="announcements" className="py-16 bg-emerald-950 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/10 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
            <Bell className="w-3 h-3" /> Informasi Terkini
          </div>
          <h2 className="text-xl md:text-3xl font-black text-white leading-tight flex items-center justify-center gap-3">
            <div className="w-1.5 h-8 bg-emerald-400 rounded-full flex-shrink-0"></div>
            <span>
              Berita & <span className="text-emerald-400 font-serif-premium italic">Pengumuman</span>
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {loading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />) : 
            displayedAnnouncements.map((item) => (
              <Card 
                key={item.id} 
                className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                onClick={() => setSelectedAnnouncement(item)}
              >
                <CardContent className="p-0 flex flex-col h-full">
                  {item.images && item.images.length > 0 && (
                    <ImageSlideshow 
                      images={item.images} 
                      className="h-36 w-full" 
                      alt={item.title}
                    />
                  )}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.event_date || item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <h3 className="text-base font-bold text-white line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                    <div className="pt-1">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-400/30 pb-0.5">Baca Selengkapnya</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>

        {!loading && announcements.length > initialLimit && (
          <div className="mt-12 text-center">
            <Button 
              onClick={() => setShowAll(!showAll)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold px-8"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4 mr-2" /> Tampilkan Lebih Sedikit</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-2" /> Lihat Semua Pengumuman</>
              )}
            </Button>
          </div>
        )}
      </div>

      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6" onClick={() => setSelectedAnnouncement(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
              <ImageSlideshow 
                images={selectedAnnouncement.images || []} 
                className="w-full aspect-video flex-shrink-0" 
                alt={selectedAnnouncement.title}
              />
              <div className="p-8 overflow-y-auto">
                <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-4">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedAnnouncement.event_date || selectedAnnouncement.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{selectedAnnouncement.title}</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>
            </div>
            <button className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors" onClick={() => setSelectedAnnouncement(null)}><X size={24} /></button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Announcements;