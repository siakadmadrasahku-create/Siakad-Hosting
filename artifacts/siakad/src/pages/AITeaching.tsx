"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  BookOpen, 
  Search,
  FileText,
  CalendarDays,
  CalendarRange,
  ListChecks,
  FileCheck,
  History,
  Layers,
  ClipboardCheck,
  Brain,
  ChevronRight,
  X,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';

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
  tahun_pelajaran?: string;
  semester?: string;
}

const DOKUMEN_INFO: Record<string, { label: string, icon: any, color: string, bg: string }> = {
  prota: { label: 'PROTA', icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  promes: { label: 'PROMES', icon: CalendarRange, color: 'text-teal-600', bg: 'bg-teal-50' },
  silabus: { label: 'ATP / Silabus', icon: ListChecks, color: 'text-purple-600', bg: 'bg-purple-50' },
  rpp_rpm: { label: 'RPP / RPM', icon: FileCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  modul_ajar: { label: 'Modul Ajar', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
  jurnal_mengajar: { label: 'Jurnal Mengajar', icon: History, color: 'text-rose-600', bg: 'bg-rose-50' },
  cp_tp_atp: { label: 'Analisis CP', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  kktp: { label: 'KKTP', icon: ClipboardCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
};

const cleanText = (text: string) => text.replace(/[#*]/g, '').trim();

const RenderTable = ({ text }: { text: string }) => {
  const lines = text.split('\n').filter(l => l.includes('|'));
  if (lines.length === 0) return null;
  
  const headers = lines[0].trim().replace(/^\||\|$/g, '').split('|').map(h => cleanText(h));
  const rows = lines.slice(1).filter(l => !l.includes('---')).map(r => {
    const cells = r.trim().replace(/^\||\|$/g, '').split('|').map(c => cleanText(c));
    return cells.filter((_, i) => i < headers.length);
  });

  return (
    <div className="my-6 border border-black overflow-hidden rounded-sm text-left">
      <table className="w-full text-[9pt] border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-black">
            {headers.map((h, i) => (<th key={i} className="border-r border-black p-2 font-bold text-center last:border-0">{h}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-black last:border-0">
              {row.map((cell, j) => (<td key={j} className="border-r border-black p-2 last:border-0 align-top">{cell}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AITeaching = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const general = settings.general || {};
  const [data, setData] = useState<AITeachingItem[]>([]);
  const [todayDocuments, setTodayDocuments] = useState<AITeachingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<AITeachingItem | null>(null);

  const isSameDate = (date1: string | Date, date2: string | Date): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const { data: res } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', 'ai_teaching_list')
          .maybeSingle();
        
        if (res?.value) {
          const updatedList = (res.value as AITeachingItem[]).map(item => ({
            ...item,
            created_at: item.created_at || item.tanggal_cetak ? new Date(`${item.tanggal_cetak}T00:00:00`).toISOString() : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            tahun_pelajaran: (item as any).tahun_pelajaran || '2026/2027',
            semester: (item as any).semester || 'Ganjil'
          }));
          setData(updatedList);
          
          // Filter today's documents
          const today = new Date();
          const todayDocs = updatedList.filter(item => {
            const itemDate = item.tanggal_cetak 
              ? new Date(`${item.tanggal_cetak}T00:00:00`) 
              : new Date(item.created_at);
            return isSameDate(itemDate, today);
          });
          setTodayDocuments(todayDocs);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.topik.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (DOKUMEN_INFO[item.jenis_dokumen]?.label || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  // Grouping data by jenis_dokumen
  const groupedData = useMemo(() => {
    const groups: Record<string, AITeachingItem[]> = {};
    filteredData.forEach(item => {
      if (!groups[item.jenis_dokumen]) groups[item.jenis_dokumen] = [];
      groups[item.jenis_dokumen].push(item);
    });
    return groups;
  }, [filteredData]);

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

  const renderIdentityTable = (item: AITeachingItem) => {
    const schoolName = settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || "Si@Kad";
    const year = item.tahun_pelajaran || settings.tahun_pelajaran?.active_year || "2026/2027";
    const semester = item.semester || settings.tahun_pelajaran?.semester || "Ganjil";
    const materiList = Array.isArray(item.materi_pokok) ? item.materi_pokok.join(', ') : '-';
    const tanggalCetak = item.tanggal_cetak ? new Date(item.tanggal_cetak).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
    return (
      <div className="mb-6 text-left">
        <table className="w-full text-[10pt] border-collapse leading-tight">
          <tbody>
            <tr><td className="w-[180px] py-0.5">Satuan Pendidikan</td><td className="w-[10px] py-0.5">:</td><td className="py-0.5 font-bold">{schoolName}</td></tr>
            <tr><td className="py-0.5">Mata Pelajaran</td><td className="py-0.5">:</td><td className="py-0.5">{item.mata_pelajaran}</td></tr>
            <tr><td className="py-0.5">Fase / Kelas</td><td className="py-0.5">:</td><td className="py-0.5">{item.fase}</td></tr>
            <tr><td className="py-0.5">Materi Pokok</td><td className="py-0.5">:</td><td className="py-0.5 font-medium">{materiList}</td></tr>
            <tr><td className="py-0.5">Alokasi Waktu</td><td className="py-0.5">:</td><td className="py-0.5">{item.alokasi_waktu}</td></tr>
            <tr><td className="py-0.5">Tahun Pelajaran</td><td className="py-0.5">:</td><td className="py-0.5">{year} ({semester})</td></tr>
            <tr><td className="py-0.5">Tanggal Cetak</td><td className="py-0.5">:</td><td className="py-0.5 font-bold">{tanggalCetak}</td></tr>
          </tbody>
        </table>
        <div className="border-b border-black mt-2"></div>
      </div>
    );
  };

  if (previewItem) {
    const pages = previewItem.hasil.split('[PAGE_BREAK]').filter(p => p.trim() !== '');
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="sticky top-0 z-50 bg-white border-b p-4 flex justify-between items-center print:hidden">
          <Button variant="ghost" onClick={() => setPreviewItem(null)} className="font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold">
            <Printer className="w-4 h-4 mr-2" /> Cetak Berkas
          </Button>
        </div>
        <div className="flex-1 p-4 sm:p-12 overflow-y-auto print:p-0">
          <div id="print-content-public" className="mx-auto">
            {pages.map((page, i, arr) => {
              const isCover = page.includes('[HALAMAN COVER]');
              const isTable = page.includes('[IDENTITAS_TABLE]');
              const isLastPage = i === arr.length - 1;
              const pageContent = page.replace('[HALAMAN COVER]', '').replace('[IDENTITAS_TABLE]', '');
              
              const coverParts = pageContent.split('Disusun Oleh:');
              const mainCoverContent = coverParts[0];
              const authorContent = coverParts[1];

              return (
                <div 
                  key={i} 
                  className={`bg-white mx-auto shadow-2xl print:shadow-none print:m-0 print:p-0 print:w-full ${!isLastPage ? 'break-after-page mb-10' : ''} ${isCover ? 'flex flex-col' : ''}`} 
                  style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    padding: isCover ? '2cm 2cm 0.5cm 2cm' : '2cm', 
                    boxSizing: 'border-box' 
                  }}
                >
                  {!isCover && <KopSurat />}
                  
                  {isCover ? (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 flex flex-col items-center justify-center text-center whitespace-pre-wrap font-serif text-[11pt] leading-relaxed text-gray-900">
                        {settings.identitas_madrasah?.logo_url && (<img src={settings.identitas_madrasah.logo_url} alt="Logo" className="w-32 h-32 mb-12 mx-auto object-contain" />)}
                        {mainCoverContent.split('\n\n').map((block, idx) => (
                          <p key={idx} className="mb-4">{cleanText(block)}</p>
                        ))}
                      </div>

                      {authorContent && (
                        <div className="text-center font-serif text-[11pt] mb-40">
                          <p className="font-bold mb-2">Disusun Oleh:</p>
                          {authorContent.split('\n').map((line, idx) => (
                            <p key={idx}>{cleanText(line)}</p>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto text-center font-serif border-t-2 border-black pt-4">
                        <p className="text-[14pt] font-bold uppercase leading-tight">{settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || "Si@Kad"}</p>
                        <p className="text-[12pt] font-bold leading-tight">TAHUN PELAJARAN {previewItem.tahun_pelajaran || settings.tahun_pelajaran?.active_year || "2026/2027"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`whitespace-pre-wrap font-serif text-[11pt] leading-relaxed text-gray-900 mt-6 text-justify`}>
                      {isTable && renderIdentityTable(previewItem)}
                      {pageContent.split('\n\n').map((block, idx) => block.includes('|') ? (<RenderTable key={idx} text={block} />) : (<p key={idx} className="mb-4">{cleanText(block)}</p>))}
                    </div>
                  )}
                  
                  {!isCover && isLastPage && <PenandatanganDokumen targetKelas={previewItem.fase} tanggalCetak={previewItem.tanggal_cetak} />}
                  
                  {/* Tanggal Cetak - Hanya muncul saat print */}
                  <div className="print:block hidden text-right text-[8pt] font-serif text-gray-500 mt-4 border-t border-gray-300 pt-2">
                    Dicetak pada: {new Date().toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print { 
            @page { size: A4; margin: 2cm; } 
            body { background: white !important; } 
            .print\\:hidden { display: none !important; } 
            header, footer, nav, aside, button, .fixed { display: none !important; }
            .break-after-page { break-after: page; page-break-after: always; }
            #print-content-public > div { width: 100% !important; min-height: auto !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
          }
        ` }} />
      </div>
    );
  }

  const formattedDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col items-center py-16 px-4 sm:px-6">
      {/* Header Section */}
      <div className="w-full max-w-2xl text-center mb-14">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl mb-8 border border-white">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
          {renderLogoText()}
        </h1>
        <p className="text-slate-500 text-base font-medium max-w-sm mx-auto">
          Pusat Perangkat Ajar & Administrasi Digital
        </p>
      </div>

      {/* Materi Hari Ini */}
      <div className="w-full max-w-5xl mb-14">
        <div className="bg-white border border-slate-100 rounded-3xl p-7 shadow-lg shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-gradient-to-br from-emerald-100/50 to-teal-50 rounded-full blur-3xl"></div>
          <div className="relative space-y-6">
            {/* Date Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.25em] mb-1">Materi Hari Ini</p>
                <h2 className="text-2xl font-black text-slate-900">{formattedDate}</h2>
              </div>
              <div className="flex items-center gap-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl">
                <CalendarDays className="w-5 h-5" />
                <span className="text-sm font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</span>
              </div>
            </div>
            
            {/* Documents Carousel */}
            {todayDocuments.length > 0 ? (
              <div className="w-full overflow-x-auto pb-2 -mx-2 px-2">
                <div className="flex gap-4 w-max">
                  {todayDocuments.map((item, index) => {
                    const info = DOKUMEN_INFO[item.jenis_dokumen] || DOKUMEN_INFO.modul_ajar;
                    const Icon = info.icon;
                    const materiList = Array.isArray(item.materi_pokok) ? item.materi_pokok.join(', ') : '';
                    return (
                      <button 
                        key={item.id || index}
                        onClick={() => setPreviewItem(item)}
                        className="group flex-shrink-0"
                      >
                        <Card className="border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden bg-white w-72">
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 ${info.bg} rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                                <Icon className={`w-6 h-6 ${info.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  {info.label}
                                </p>
                                <h3 className="font-bold text-slate-900 text-sm truncate">
                                  {item.topik || item.mata_pelajaran}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 truncate">
                                  {item.mata_pelajaran} • {item.fase}
                                </p>
                                {materiList && (
                                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                                    {materiList}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Belum ada materi hari ini</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-lg mb-12">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari perangkat ajar..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-lg shadow-slate-200/50 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-sm font-medium placeholder:text-slate-300 transition-all"
          />
        </div>
      </div>

      {/* Generator Section */}
      <div className="w-full max-w-lg mb-16">
        <h2 className="text-sm font-bold text-slate-700 mb-6 text-center uppercase tracking-[0.2em]">Generator Dokumen Kurikulum</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(DOKUMEN_INFO).slice(0, 4).map(([key, info]) => (
            <button 
              key={key}
              onClick={() => navigate('/admin/kurikulum/ai-teaching')}
              className="block w-full text-left group"
            >
              <Card className="border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-3xl overflow-hidden bg-white group-active:scale-[0.98]">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className={`w-12 h-12 ${info.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <info.icon className={`w-6 h-6 ${info.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">{info.label}</h3>
                    <p className="text-slate-400 text-xs mt-1">{info.label === 'PROTA' ? 'Program Tahunan' : info.label === 'PROMES' ? 'Program Semester' : info.label === 'ATP / Silabus' ? 'Alur Tujuan Pembelajaran' : info.label === 'Modul Ajar' ? 'Modul Pembelajaran' : 'Dokumen Kurikulum'}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* Documents Section */}
      <div className="w-full max-w-lg space-y-10">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-4 w-28 ml-2" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-3xl" />
                <Skeleton className="h-24 w-full rounded-3xl" />
              </div>
            </div>
          ))
        ) : Object.keys(groupedData).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/30">
            <FileText className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 text-base">Belum ada perangkat ajar publik.</p>
          </div>
        ) : (
          Object.entries(groupedData).map(([type, items]) => (
            <div key={type} className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 ml-2">
                {DOKUMEN_INFO[type]?.label || type.toUpperCase()}
              </h2>
              <div className="grid gap-4">
                {items.map((item) => {
                  const info = DOKUMEN_INFO[item.jenis_dokumen] || DOKUMEN_INFO.modul_ajar;
                  const Icon = info.icon;
                  const materiList = Array.isArray(item.materi_pokok) ? item.materi_pokok.join(', ') : '';
                  const formatTanggal = (tanggal: string) => {
                    if (!tanggal) return '';
                    const date = new Date(tanggal);
                    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                  };
                  const tanggalDisplay = item.tanggal_cetak || item.created_at;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => setPreviewItem(item)}
                      className="block w-full text-left group"
                    >
                      <Card className="border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-3xl overflow-hidden bg-white group-active:scale-[0.98]">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-5">
                            <div className={`w-14 h-14 ${info.bg} rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                              <Icon className={`w-7 h-7 ${info.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-900 text-base truncate">{item.topik || item.mata_pelajaran}</h3>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                  {item.fase}
                                </span>
                                <span className="text-slate-400 text-xs truncate">{item.mata_pelajaran}</span>
                              </div>
                              {materiList && (
                                <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                                  {materiList}
                                </p>
                              )}
                              {tanggalDisplay && (
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-3">
                                  <CalendarDays className="w-3 h-3" />
                                  {formatTanggal(tanggalDisplay)}
                                </p>
                              )}
                            </div>
                            <div className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-all">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Section */}
      <div className="w-full max-w-lg mt-20 text-center space-y-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-emerald-600 font-bold text-xs uppercase tracking-[0.25em] py-3 px-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Beranda
        </Button>
        
        <div className="pt-10 border-t border-slate-200">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.35em]">
            © {new Date().getFullYear()} {general.school_name || 'Si@Kad'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AITeaching;