"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  FolderOpen, 
  Globe, 
  Cloud, 
  BookOpen, 
  MessageCircle,
  Share2,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const ICON_MAP: Record<string, any> = {
  LinkIcon, Globe, Cloud, BookOpen, MessageCircle, FolderOpen, Share2
};

const Links = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const general = settings.general || {};
  const [linkGroups, setLinkGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const { data: res } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'links_center_data')
          .maybeSingle();
        
        if (res?.value) {
          setLinkGroups(res.value as any[]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLinks();
  }, []);

  const renderLogoText = () => {
    const name = general.school_name || 'Si@Kad';
    if (name.includes('@')) {
      const parts = name.split('@');
      return (
        <>
          {parts[0]}
          <span className="text-emerald-600">@</span>
          {parts[1]}
        </>
      );
    }
    return name;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6">
      {/* Header Section */}
      <div className="w-full max-w-md text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-3xl shadow-xl mb-6 border border-slate-100">
          <BookOpen className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          {renderLogoText()}
        </h1>
        <p className="text-slate-500 text-sm font-medium px-4">
          Pusat Tautan & Sumber Daya Digital Resmi
        </p>
      </div>

      {/* Links Section */}
      <div className="w-full max-w-md space-y-8">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-24 ml-1" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ))
        ) : linkGroups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <LinkIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Belum ada tautan publik.</p>
          </div>
        ) : (
          linkGroups.map((group, idx) => (
            <div key={idx} className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                {group.category}
              </h2>
              <div className="grid gap-3">
                {group.links.map((link: any, lIdx: number) => {
                  const Icon = ICON_MAP[link.icon] || LinkIcon;
                  return (
                    <a 
                      key={lIdx} 
                      href={link.url} 
                      target={link.url.startsWith('http') ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden bg-white group-active:scale-[0.98]">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 ${link.bg || 'bg-emerald-50'} rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 overflow-hidden`}>
                            {link.image_url ? (
                              <img src={link.image_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <Icon className={`w-6 h-6 ${link.color || 'text-emerald-600'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate">{link.title}</h3>
                            <p className="text-slate-400 text-[11px] truncate">{link.desc}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Section */}
      <div className="w-full max-w-md mt-12 text-center space-y-6">
        <div className="flex justify-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-emerald-600 font-bold text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft className="w-3 h-3 mr-2" /> Kembali ke Beranda
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-400 hover:text-emerald-600 font-bold text-[10px] uppercase tracking-widest"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Pusat Tautan Si@Kad', url: window.location.href });
              }
            }}
          >
            <Share2 className="w-3 h-3 mr-2" /> Bagikan
          </Button>
        </div>
        
        <div className="pt-8 border-t border-slate-200">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} {general.school_name || 'Si@Kad'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Links;