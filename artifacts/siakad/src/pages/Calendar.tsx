"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Clock, MapPin, Info, Sparkles, BookOpen, Bell
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const CATEGORIES = [
  { value: 'academic', label: 'Akademik', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  { value: 'holiday', label: 'Libur', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  { value: 'event', label: 'Kegiatan', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { value: 'exam', label: 'Ujian', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
];

const CalendarPublic = () => {
  const { settings } = useSiteSettings();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'academic_calendar_list').maybeSingle();
      if (res?.value) setEvents(res.value as any[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Padding for start of month
    const firstDay = date.getDay();
    for (let i = 0; i < firstDay; i++) days.push(null);
    
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getDate() === day.getDate() && 
             eventDate.getMonth() === day.getMonth() && 
             eventDate.getFullYear() === day.getFullYear();
    });
  };

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return events
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [events]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <CalendarIcon className="w-3 h-3" /> Agenda Madrasah
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Kalender <span className="text-emerald-600 font-serif-premium italic">Akademik</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
              Pantau seluruh jadwal kegiatan, hari libur, and agenda penting madrasah dalam satu tampilan interaktif.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Calendar */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-xl rounded-[2rem] overflow-hidden bg-white">
                <div className="p-6 bg-emerald-600 text-white flex items-center justify-between">
                  <h2 className="text-xl font-bold capitalize">{monthName}</h2>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="text-white hover:bg-white/10 rounded-xl"><ChevronLeft /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="text-white hover:bg-white/10 rounded-xl"><ChevronRight /></Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                      <div key={d} className="text-center text-[10px] font-black uppercase text-gray-400 py-2">{d}</div>
                    ))}
                    {daysInMonth.map((day, idx) => (
                      <div key={idx} className={`aspect-square rounded-2xl border border-gray-50 p-1 flex flex-col items-center justify-start relative ${day ? 'bg-white' : 'bg-gray-50/50'}`}>
                        {day && (
                          <>
                            <span className={`text-xs font-bold ${day.getDay() === 0 ? 'text-red-500' : 'text-gray-700'}`}>{day.getDate()}</span>
                            <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                              {getEventsForDay(day).map((e, i) => {
                                const cat = CATEGORIES.find(c => c.value === e.category);
                                return <div key={i} className={`w-1.5 h-1.5 rounded-full ${cat?.color || 'bg-gray-300'}`} title={e.title} />;
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-100">
                    {CATEGORIES.map(cat => (
                      <div key={cat.value} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{cat.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events Sidebar */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" /> Agenda Terdekat
              </h3>
              <div className="space-y-4">
                {loading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-white rounded-2xl shadow-sm" />)
                ) : upcomingEvents.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-gray-100">
                    <p className="text-xs text-gray-400 italic">Belum ada agenda mendatang.</p>
                  </div>
                ) : (
                  upcomingEvents.map((event) => {
                    const cat = CATEGORIES.find(c => c.value === event.category) || CATEGORIES[0];
                    return (
                      <Card key={event.id} className="border-0 shadow-md hover:shadow-lg transition-all rounded-2xl overflow-hidden group bg-white">
                        <div className={`w-1 h-full absolute left-0 top-0 ${cat.color}`}></div>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${cat.bg} ${cat.text}`}>
                              <span className="text-lg font-black leading-none">{new Date(event.date).getDate()}</span>
                              <span className="text-[8px] font-bold uppercase">{new Date(event.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-emerald-600 transition-colors">{event.title}</h4>
                              <p className="text-[10px] text-gray-500 line-clamp-2">{event.description}</p>
                              <div className="flex items-center gap-3 pt-1">
                                <Badge className={`${cat.bg} ${cat.text} border-0 text-[8px] font-black uppercase px-2 py-0.5`}>{cat.label}</Badge>
                                {event.end_date && <span className="text-[8px] text-emerald-600 font-bold uppercase">Hingga {new Date(event.end_date).getDate()} {new Date(event.end_date).toLocaleDateString('id-ID', { month: 'short' })}</span>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2rem] overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <CardContent className="p-8 relative z-10 space-y-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Info className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold leading-tight">Butuh Bantuan?</h4>
                  <p className="text-emerald-100 text-xs leading-relaxed">Hubungi bagian tata usaha untuk informasi lebih lanjut mengenai jadwal and agenda madrasah.</p>
                  <Button className="w-full bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold h-12">Hubungi Kami</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CalendarPublic;