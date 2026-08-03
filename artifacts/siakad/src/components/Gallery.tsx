"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Maximize2, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ImageSlideshow from './ImageSlideshow';

const Gallery = () => {
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showAll, setShowAll] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'gallery_data_list').maybeSingle();
        if (res?.value) setGallery(res.value as any[]);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchGallery();
  }, []);

  const initialLimit = isMobile ? 1 : 4;
  const displayedGallery = showAll ? gallery : gallery.slice(0, initialLimit);

  return (
    <section id="gallery" className="py-16 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Camera className="w-3 h-3" /> Momen Berharga
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-emerald-600 rounded-sm rotate-45 flex-shrink-0"></div>
            <span>
              Galeri <span className="text-emerald-600 font-serif-premium italic">Kegiatan</span>
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {loading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/2] rounded-2xl" />) : 
            displayedGallery.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 group cursor-pointer" onClick={() => setSelectedImage(item)}>
                <div className="relative rounded-2xl overflow-hidden shadow-sm aspect-[3/2]">
                  <ImageSlideshow 
                    images={item.images || (item.image_url ? [item.image_url] : [])} 
                    className="w-full h-full" 
                    alt={item.title}
                  />
                  <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] z-20">
                    <Maximize2 className="text-white w-5 h-5" />
                  </div>
                </div>
                <div className="px-1">
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">{item.title}</h3>
                </div>
              </div>
            ))
          }
        </div>

        {!loading && gallery.length > initialLimit && (
          <div className="mt-12 text-center">
            <Button 
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold px-8"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4 mr-2" /> Tampilkan Lebih Sedikit</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-2" /> Lihat Semua Galeri</>
              )}
            </Button>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <ImageSlideshow 
                images={selectedImage.images || [selectedImage.image_url]} 
                className="w-full aspect-video" 
                alt={selectedImage.title}
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900">{selectedImage.title}</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">{selectedImage.description}</p>
              </div>
            </div>
            <button className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors" onClick={() => setSelectedImage(null)}><X size={24} /></button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Gallery;