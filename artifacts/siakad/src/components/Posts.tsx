"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ImageSlideshow from './ImageSlideshow';

const Posts = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showAll, setShowAll] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'posts_data_list').maybeSingle();
        if (res?.value) setPosts(res.value as any[]);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchPosts();
  }, []);

  if (!loading && posts.length === 0) return null;

  const initialLimit = isMobile ? 1 : 3;
  const displayedPosts = showAll ? posts : posts.slice(0, initialLimit);

  return (
    <section id="posts" className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Artikel & Wawasan
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-emerald-600 rounded-sm -rotate-12 flex-shrink-0"></div>
            <span>
              Berita <span className="text-emerald-600 font-serif-premium italic">Terbaru</span>
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {displayedPosts.map(post => (
            <Card 
              key={post.id} 
              className="group border-0 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <ImageSlideshow 
                images={post.images || (post.image_url ? [post.image_url] : ["https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600"])} 
                className="h-36 w-full" 
                alt={post.title}
              />
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                  <Calendar className="w-3 h-3" /> 
                  {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">{post.title}</h3>
                <div className="pt-1">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Baca Artikel</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && posts.length > initialLimit && (
          <div className="mt-12 text-center">
            <Button 
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold px-8"
            >
              {showAll ? (
                <><ChevronUp className="w-4 h-4 mr-2" /> Tampilkan Lebih Sedikit</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-2" /> Lihat Semua Berita</>
              )}
            </Button>
          </div>
        )}
      </div>

      {selectedPost && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6" onClick={() => setSelectedPost(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
              <ImageSlideshow 
                images={selectedPost.images || [selectedPost.image_url]} 
                className="w-full aspect-video flex-shrink-0" 
                alt={selectedPost.title}
              />
              <div className="p-8 overflow-y-auto">
                <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-4">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedPost.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{selectedPost.title}</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
              </div>
            </div>
            <button className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors" onClick={() => setSelectedPost(null)}><X size={24} /></button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Posts;