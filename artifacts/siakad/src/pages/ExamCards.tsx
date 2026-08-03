import React, { useState, useEffect } from 'react';
import ExamCard from '../components/ExamCard';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Users, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ExamCards: React.FC = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState<any[]>([]);
  const [activeData, setActiveData] = useState<any>(null);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>('active');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resActive, resArchives] = await Promise.all([
        supabase.from('site_settings').select('value').eq('id', 'exam_card_data').single(),
        supabase.from('site_settings').select('value').eq('id', 'exam_card_archives').single()
      ]);

      if (resActive.data?.value) {
        const saved = resActive.data.value as any;
        setActiveData(saved);
        if (saved.participants) setParticipants(saved.participants);
        if (saved.settings) setSettings(saved.settings);
      }

      if (resArchives.data?.value) {
        setArchives(resArchives.data.value as any[]);
      }
    } catch (err) {
      console.error("Gagal memuat data kartu", err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveChange = (val: string) => {
    setSelectedArchiveId(val);
    if (val === 'active') {
      if (activeData) {
        setParticipants(activeData.participants || []);
        setSettings(activeData.settings || {});
      } else {
        setParticipants([]);
        setSettings({});
      }
    } else {
      const selectedArc = archives.find(a => a.id.toString() === val);
      if (selectedArc && selectedArc.data) {
        setParticipants(selectedArc.data.participants || []);
        setSettings(selectedArc.data.settings || {});
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white print:p-0">
      <div className="print:hidden">
        <Navbar />
      </div>
      
      <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto print:p-0 print:pt-0 print:max-w-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12 print:hidden">
          <div className="text-left">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">KARTU PESERTA <span className="text-emerald-600">TKAD</span></h1>
            <p className="text-slate-500 font-medium max-w-2xl">
              Halaman publik untuk melihat dan mencetak kartu peserta ujian yang telah di-generate oleh admin.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {archives.length > 0 && (
              <Select value={selectedArchiveId} onValueChange={handleArchiveChange}>
                <SelectTrigger className="w-full sm:w-[250px] h-12 rounded-xl border-slate-200 font-medium bg-white">
                  <Archive className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Pilih Data Arsip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="font-medium text-emerald-700">Data Aktif Saat Ini</SelectItem>
                  {archives.map((arc) => (
                    <SelectItem key={arc.id} value={arc.id.toString()}>
                      {arc.name} ({arc.participantCount} Peserta)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-emerald-200 transition-all hover:-translate-y-1 w-full sm:w-auto">
              <Printer className="w-5 h-5 mr-2" /> CETAK SEMUA KARTU
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 print:hidden">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">Memuat Data Peserta...</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 border border-slate-100 shadow-sm text-center print:hidden">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Belum Ada Data Kartu</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Admin belum melakukan generate kartu peserta. Silakan hubungi admin kurikulum untuk informasi lebih lanjut.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4 print:p-0">
            {participants.map((p, index) => (
              <div key={p.id || index} className="flex justify-center print:break-inside-avoid">
                <ExamCard
                  {...p}
                  schedules={p.schedules}
                  temaWarna={settings.temaWarna || 'blue'}
                  judulKartu={p.judulKartu || settings.judulKartu}
                  lembagaNama={settings.lembagaNama}
                  lembagaLogo={settings.lembagaLogo}
                  jabatanPanitia={settings.jabatanPanitia}
                  tandaTanganPanitia={settings.panitiaNama}
                  panitiaNip={settings.panitiaNip}
                  tandaTanganUrl={settings.panitiaTandaTangan}
                />
              </div>
            ))}
          </div>
        )}

        {/* Print Instructions */}
        <div className="mt-12 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm print:hidden">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-5 bg-emerald-600 rounded-full"></div>
            Panduan Pencetakan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Langkah 01</span>
              <p className="text-sm text-slate-600 font-medium">Gunakan browser modern (Chrome/Edge) dan tekan Ctrl+P.</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Langkah 02</span>
              <p className="text-sm text-slate-600 font-medium">Pilih Ukuran Kertas A4 dengan orientasi Portrait.</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Langkah 03</span>
              <p className="text-sm text-slate-600 font-medium">Aktifkan opsi "Background Graphics" di pengaturan cetak.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};

export default ExamCards;
