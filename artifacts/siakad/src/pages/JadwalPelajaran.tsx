"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Clock, BookOpen, Search, LayoutGrid, 
  ChevronRight, Info, Sparkles, GraduationCap, Printer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CetakJadwal from '@/components/CetakJadwal';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const JadwalPelajaranPublic = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter unique non-duplicate classes by name / id
  const uniqueClasses = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    const map = new Map<string, any>();
    classes.forEach(c => {
      if (!c || !c.nama_kelas) return;
      const cleanName = String(c.nama_kelas).trim();
      const key = cleanName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          ...c,
          id: c.id || key,
          nama_kelas: cleanName
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const tA = parseInt(a.tingkat || '0') || 0;
      const tB = parseInt(b.tingkat || '0') || 0;
      if (tA !== tB) return tA - tB;
      return a.nama_kelas.localeCompare(b.nama_kelas, undefined, { numeric: true });
    });
  }, [classes]);

  const fetchData = async () => {
    try {
      const { data: res, error } = await supabase.from('site_settings').select('id, value');
      let scheduleData = res?.find(s => s.id === 'jadwal_pelajaran_list')?.value;
      let classData = res?.find(s => s.id === 'kelas_list')?.value;
      let mapelData = res?.find(s => s.id === 'mata_pelajaran_list')?.value;

      if (error || !res || res.length === 0) {
        const cachedStr = localStorage.getItem('siakad_site_settings');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          scheduleData = scheduleData || cached.jadwal_pelajaran_list;
          classData = classData || cached.kelas_list;
          mapelData = mapelData || cached.mata_pelajaran_list;
        }
      }

      setSchedules(scheduleData || []);
      setClasses(classData || []);
      setMapels(mapelData || []);

      if (classData && classData.length > 0 && !selectedClass) {
        const first = classData[0];
        setSelectedClass(first.id || first.nama_kelas);
      }
    } catch (err) { 
      console.warn('Jadwal fetch fallback:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  const filteredSchedules = useMemo(() => {
    if (!selectedClass) return [];
    const currentClassObj = uniqueClasses.find(c => c.id === selectedClass || c.nama_kelas === selectedClass);
    const targetId = currentClassObj?.id || selectedClass;
    const targetName = currentClassObj?.nama_kelas?.toLowerCase();

    return schedules.filter(s => 
      s.class_id === selectedClass || 
      s.class_id === targetId ||
      (targetName && s.class_id?.toLowerCase() === targetName)
    );
  }, [schedules, selectedClass, uniqueClasses]);

  const getMapelName = (id: string) => {
    if (!id) return '-';
    if (id === 'pembiasaan') return '🕌 PEMBIASAAN RELIGI';
    if (id === 'upacara') return '🇮🇩 UPACARA BENDERA';
    if (id === 'istirahat') return '☕ ISTIRAHAT';
    if (id === 'istirahat_2') return '☕ ISTIRAHAT 2';
    if (id === 'ishoma') return '🍱 ISHOMA';
    return mapels.find(m => m.id === id)?.nama || 'Mata Pelajaran';
  };

  if (isPrinting) {
    const classObj = uniqueClasses.find(c => c.id === selectedClass || c.nama_kelas === selectedClass);
    return (
      <CetakJadwal
        selectedClassId={selectedClass || (uniqueClasses[0]?.id ?? '')}
        className={classObj?.nama_kelas || 'Kelas'}
        schedules={schedules}
        classes={uniqueClasses}
        mapels={mapels}
        onClose={() => setIsPrinting(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Calendar className="w-3 h-3" /> Agenda Belajar
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Jadwal <span className="text-emerald-600 font-serif-premium italic">Pelajaran</span>
            </h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
              Pilih kelas ananda untuk melihat jadwal mata pelajaran harian secara lengkap and terupdate.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-6">
              <div className="w-full sm:flex-1">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full h-14 bg-white border-0 rounded-2xl shadow-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold">
                    <SelectValue placeholder="Pilih Kelas Anda" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {uniqueClasses.map((c, idx) => (
                      <SelectItem key={`${c.id || c.nama_kelas}_${idx}`} value={c.id || c.nama_kelas} className="font-bold">
                        {c.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClass && (
                <Button 
                  onClick={() => setIsPrinting(true)}
                  className="w-full sm:w-auto h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" /> Cetak Jadwal
                </Button>
              )}
            </div>
          </div>

          {!selectedClass ? (
            <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <LayoutGrid className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Silakan pilih kelas untuk menampilkan jadwal.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {DAYS.map(day => (
                <Card key={day} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group rounded-[2.5rem] overflow-hidden bg-white">
                  <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-sm">{day}</h3>
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                  </div>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      {filteredSchedules.filter(s => s.day === day).sort((a,b) => a.start_time.localeCompare(b.start_time)).map(s => (
                        <div key={s.id} className="p-6 flex items-center gap-4 hover:bg-emerald-50/30 transition-colors">
                          <div className="text-center min-w-[70px] border-r pr-4 border-slate-100">
                            <div className="text-xs font-black text-emerald-600">{s.start_time}</div>
                            <div className="text-[10px] font-bold text-slate-300">{s.end_time}</div>
                          </div>
                          <div>
                            <div className={`font-extrabold text-base leading-tight ${
                              s.subject_id === 'pembiasaan' ? 'text-emerald-700 font-extrabold' :
                              s.subject_id === 'istirahat' || s.subject_id === 'istirahat_2' || s.subject_id === 'ishoma' ? 'text-amber-600 italic' : 
                              s.subject_id === 'upacara' ? 'text-blue-600 font-black' : 
                              'text-slate-900'
                            }`}>
                              {getMapelName(s.subject_id)}
                            </div>
                            {s.teacher_name && <div className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {s.teacher_name}</div>}
                          </div>
                        </div>
                      ))}
                      {filteredSchedules.filter(s => s.day === day).length === 0 && (
                        <div className="p-12 text-center text-slate-300 text-xs italic font-medium">Tidak ada jam pelajaran</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default JadwalPelajaranPublic;