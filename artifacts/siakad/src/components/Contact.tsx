"use client";

import React from 'react';
import { MapPin, Phone, Mail, Send, Sparkles, ExternalLink, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { showSuccess } from '@/utils/toast';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const DEFAULT_LAT = '-7.517606';
const DEFAULT_LNG = '109.132984';
const DEFAULT_ZOOM = '16';

export const getGoogleMapEmbedUrl = (
  lat?: string,
  lng?: string,
  zoom?: string,
  customEmbedUrl?: string,
  placeName?: string
) => {
  if (customEmbedUrl && customEmbedUrl.trim()) {
    const trimmed = customEmbedUrl.trim();
    if (trimmed.includes('<iframe')) {
      const match = trimmed.match(/src=["']([^"']+)["']/);
      if (match && match[1]) return match[1];
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }
  const cleanLat = (lat || DEFAULT_LAT).trim();
  const cleanLng = (lng || DEFAULT_LNG).trim();
  const cleanZoom = (zoom || DEFAULT_ZOOM).trim();
  const name = (placeName || "MI Ma'arif NU 2 Sanggreman").trim();

  // Formatting Google Maps query parameter to include place name label: LAT,LNG (Name)
  const query = `${cleanLat},${cleanLng} (${name})`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${cleanZoom}&output=embed`;
};

const Contact = () => {
  const { settings } = useSiteSettings();
  const general = settings.general || {};
  const identitas = settings.identitas_madrasah || {};

  const madrasahName = identitas.nama_madrasah || "MI Ma'arif NU 2 Sanggreman";

  const currentLat = general.maps_latitude || identitas.maps_latitude || DEFAULT_LAT;
  const currentLng = general.maps_longitude || identitas.maps_longitude || DEFAULT_LNG;
  const currentZoom = general.maps_zoom || identitas.maps_zoom || DEFAULT_ZOOM;
  const currentEmbedUrl = general.maps_embed_url || identitas.maps_embed_url || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess('Pesan terkirim!');
  };

  const activeEmbedUrl = getGoogleMapEmbedUrl(currentLat, currentLng, currentZoom, currentEmbedUrl, madrasahName);

  const contactInfo = [
    { icon: MapPin, title: 'Alamat', content: general.address || identitas.alamat || 'Jl. Pendidikan No. 123' },
    { icon: Phone, title: 'Telepon', content: general.phone || identitas.telepon || '(021) 1234-5678' },
    { icon: Mail, title: 'Email', content: general.email || identitas.email || 'info@siakad.sch.id' }
  ];

  return (
    <section id="contact" className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Hubungi Kami
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-emerald-600 rounded-sm flex-shrink-0"></div>
            <span>
              Mari <span className="text-emerald-600 font-serif-premium italic">Berkenalan</span>
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <div className="grid gap-4">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <info.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{info.title}</h3>
                    <p className="text-slate-500 text-[11px]">{info.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Google Maps Container */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-900 group">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-bold tracking-tight text-slate-100 truncate">
                    {madrasahName}
                  </span>
                  <span className="text-[10px] bg-slate-800 font-mono text-emerald-400 px-2 py-0.5 rounded-md border border-slate-700 hidden sm:inline-block flex-shrink-0">
                    {currentLat}, {currentLng}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${encodeURIComponent(`${currentLat},${currentLng} (${madrasahName})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Maps</span>
                </a>
              </div>

              <div className="h-64 sm:h-72 w-full relative">
                {/* Floating Identity Label Overlay on top left of map */}
                <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-emerald-100 flex items-center gap-2 pointer-events-none">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    MI
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 leading-tight">{madrasahName}</p>
                    <p className="text-[9px] font-semibold text-emerald-700">Lokasi Resmi Madrasah</p>
                  </div>
                </div>

                <iframe
                  title={`Peta Lokasi ${madrasahName}`}
                  src={activeEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                />
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  Koordinat Lokasi: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">{currentLat}, {currentLng}</code>
                </span>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-sm rounded-3xl bg-slate-50/50 overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Nama" className="rounded-xl h-12 bg-white border-slate-100 text-xs" required />
                  <Input placeholder="Telepon" className="rounded-xl h-12 bg-white border-slate-100 text-xs" required />
                </div>
                <Input type="email" placeholder="Email" className="rounded-xl h-12 bg-white border-slate-100 text-xs" required />
                <Textarea placeholder="Pesan" className="rounded-xl min-h-[100px] bg-white border-slate-100 text-xs p-4" required />
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl text-xs font-bold shadow-sm">
                  <Send className="w-3 h-3 mr-2" /> KIRIM PESAN
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
