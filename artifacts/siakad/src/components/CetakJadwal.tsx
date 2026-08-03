"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, LayoutGrid, Table as TableIcon, Calendar, GraduationCap, Clock, Sparkles } from 'lucide-react';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export interface JadwalItem {
  id: string;
  class_id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_id: string;
  teacher_name?: string;
  period_number?: number;
}

interface CetakJadwalProps {
  selectedClassId: string;
  className: string;
  schedules: JadwalItem[];
  classes: any[];
  mapels: any[];
  onClose: () => void;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const CetakJadwal: React.FC<CetakJadwalProps> = ({
  selectedClassId,
  className,
  schedules,
  classes,
  mapels,
  onClose
}) => {
  const { settings } = useSiteSettings();
  const [layoutMode, setLayoutMode] = useState<'grid' | 'matrix'>('grid');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const uniqueClassesList = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    const map = new Map<string, any>();
    classes.forEach(c => {
      if (!c || !c.nama_kelas) return;
      const cleanName = String(c.nama_kelas).trim();
      const key = cleanName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { ...c, id: c.id || key, nama_kelas: cleanName });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const tA = parseInt(a.tingkat || '0') || 0;
      const tB = parseInt(b.tingkat || '0') || 0;
      if (tA !== tB) return tA - tB;
      return a.nama_kelas.localeCompare(b.nama_kelas, undefined, { numeric: true });
    });
  }, [classes]);

  const initialClassId = useMemo(() => {
    if (selectedClassId && selectedClassId !== 'all') return selectedClassId;
    if (uniqueClassesList && uniqueClassesList.length > 0) return uniqueClassesList[0].id || uniqueClassesList[0].nama_kelas;
    return '';
  }, [selectedClassId, uniqueClassesList]);

  const [activeClassId, setActiveClassId] = useState<string>(initialClassId);

  const printConfig = settings.pengaturan_cetak || {
    margin_top: 1,
    margin_right: 1,
    margin_bottom: 1,
    margin_left: 1,
    show_kop: true,
    show_signature: true
  };

  const currentClassObj = useMemo(() => {
    return classes.find(c => c.id === activeClassId || c.nama_kelas === activeClassId || c.id === selectedClassId || c.nama_kelas === className);
  }, [classes, activeClassId, selectedClassId, className]);

  const activeClassName = currentClassObj?.nama_kelas || className || 'Kelas';

  const classSchedules = useMemo(() => {
    return schedules.filter(s => 
      s.class_id === activeClassId || 
      (currentClassObj && (s.class_id === currentClassObj.id || s.class_id === currentClassObj.nama_kelas || s.class_id?.toLowerCase() === currentClassObj.nama_kelas?.toLowerCase())) ||
      s.class_id === selectedClassId || 
      s.class_id === className
    );
  }, [schedules, activeClassId, currentClassObj, selectedClassId, className]);

  const getMapelName = (id: string) => {
    if (id === 'pembiasaan') return 'PEMBIASAAN RELIGI';
    if (id === 'upacara') return 'UPACARA BENDERA';
    if (id === 'istirahat') return 'ISTIRAHAT 1';
    if (id === 'istirahat_2') return 'ISTIRAHAT 2';
    if (id === 'ishoma') return 'ISHOMA';
    const found = mapels.find(m => m.id === id);
    return found ? found.nama : 'Mata Pelajaran';
  };

  // Extract unique sorted time slots for matrix mode
  const uniqueTimeSlots = useMemo(() => {
    const slotsMap = new Map<string, { start_time: string; end_time: string }>();
    classSchedules.forEach(s => {
      const key = `${s.start_time}-${s.end_time}`;
      if (!slotsMap.has(key)) {
        slotsMap.set(key, { start_time: s.start_time, end_time: s.end_time });
      }
    });
    return Array.from(slotsMap.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [classSchedules]);

  const activeYear = settings.tahun_pelajaran?.active_year || '2024/2025';
  const totalMapelJam = classSchedules.filter(s => !['istirahat', 'ishoma', 'upacara'].includes(s.subject_id)).length;

  return (
    <div className="min-h-screen bg-slate-100 p-0 text-slate-900 font-serif">
      {/* Top Bar for Print Controls - Non-Printable */}
      <div className="sticky top-0 z-[100] bg-white border-b border-slate-200 p-4 flex flex-wrap justify-between items-center print:hidden shadow-md gap-3">
        <Button variant="ghost" onClick={onClose} className="font-bold text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Aplikasi
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          {/* Class Selector Dropdown */}
          {uniqueClassesList && uniqueClassesList.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 pl-1">Kelas:</span>
              <select
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
                className="h-7 text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 text-slate-800 outline-none cursor-pointer"
              >
                {uniqueClassesList.map((c, idx) => (
                  <option key={`${c.id || c.nama_kelas}_${idx}`} value={c.id || c.nama_kelas}>
                    {c.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Layout Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Button
              size="sm"
              variant={layoutMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => { setLayoutMode('grid'); setOrientation('portrait'); }}
              className={`h-8 text-xs font-bold rounded-lg ${layoutMode === 'grid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Grid Kartu Harian
            </Button>
            <Button
              size="sm"
              variant={layoutMode === 'matrix' ? 'default' : 'ghost'}
              onClick={() => { setLayoutMode('matrix'); setOrientation('landscape'); }}
              className={`h-8 text-xs font-bold rounded-lg ${layoutMode === 'matrix' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
            >
              <TableIcon className="w-3.5 h-3.5 mr-1" /> Matriks Mingguan
            </Button>
          </div>

          {/* Orientation Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Button
              size="sm"
              variant={orientation === 'portrait' ? 'default' : 'ghost'}
              onClick={() => setOrientation('portrait')}
              className={`h-8 text-xs font-bold rounded-lg ${orientation === 'portrait' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
            >
              Portrait (Tegak)
            </Button>
            <Button
              size="sm"
              variant={orientation === 'landscape' ? 'default' : 'ghost'}
              onClick={() => setOrientation('landscape')}
              className={`h-8 text-xs font-bold rounded-lg ${orientation === 'landscape' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
            >
              Landscape (Mendatar)
            </Button>
          </div>

          <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 font-bold h-10 rounded-xl shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Jadwal
          </Button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div 
        className="mx-auto bg-white shadow-2xl print:shadow-none print:w-full flex flex-col justify-between my-6 print:my-0"
        style={{ 
          width: orientation === 'landscape' ? '297mm' : '210mm', 
          minHeight: orientation === 'landscape' ? '210mm' : '297mm',
          padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
          boxSizing: 'border-box'
        }}
      >
        <div>
          {/* Kop Surat */}
          {printConfig.show_kop && <KopSurat />}

          {/* Iconic Modern Banner Header */}
          <div className="mb-6 border-2 border-black p-4 rounded-none bg-slate-50 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white text-[9pt] font-sans font-bold uppercase tracking-wider mb-1">
                  JADWAL PELAJARAN KELAS
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none mt-1">
                  {activeClassName}
                </h1>
                <p className="text-xs font-sans font-bold text-slate-600 mt-1">
                  Tingkat Rombel: {currentClassObj?.tingkat || '-'} | Tahun Pelajaran {activeYear}
                </p>
              </div>

              <div className="text-left md:text-right border-t md:border-t-0 border-slate-300 pt-2 md:pt-0 w-full md:w-auto text-xs font-sans">
                <p className="font-bold text-slate-900">
                  Wali Kelas: <span className="uppercase text-emerald-800">{currentClassObj?.wali_kelas || '-'}</span>
                </p>
                {currentClassObj?.nip_wali_kelas && (
                  <p className="text-slate-600 font-mono text-[10px]">NIP: {currentClassObj.nip_wali_kelas}</p>
                )}
                {currentClassObj?.nuptk_wali_kelas && (
                  <p className="text-slate-600 font-mono text-[10px]">NUPTK: {currentClassObj.nuptk_wali_kelas}</p>
                )}
                <div className="mt-1 inline-block bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[9pt] font-extrabold rounded-none border border-emerald-300">
                  Total Jam: {totalMapelJam} Jam/Minggu
                </div>
              </div>
            </div>
          </div>

          {/* MODE 1: GRID KARTU HARIAN MODERN */}
          {layoutMode === 'grid' && (
            <div className={`grid ${orientation === 'landscape' ? 'grid-cols-3 gap-4' : 'grid-cols-2 gap-4'} mb-6`}>
              {DAYS.map(day => {
                const daySchedules = classSchedules
                  .filter(s => s.day === day)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <div key={day} className="border border-black flex flex-col bg-white overflow-hidden break-inside-avoid">
                    {/* Day Card Header */}
                    <div className="bg-slate-900 text-white px-3 py-1.5 flex justify-between items-center border-b border-black">
                      <span className="font-black text-xs uppercase tracking-widest font-sans">{day}</span>
                      <span className="text-[8pt] font-mono font-bold bg-emerald-500 text-black px-1.5 py-0.5">
                        {daySchedules.length} Sesi
                      </span>
                    </div>

                    {/* Day Schedule Table */}
                    <div className="flex-1 p-0">
                      {daySchedules.length > 0 ? (
                        <table className="w-full border-collapse text-[8.5pt]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-black font-sans text-[7.5pt] uppercase text-slate-700">
                              <th className="p-1 border-r border-black w-20 text-center">Waktu</th>
                              <th className="p-1 text-left">Mata Pelajaran & Pengampu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {daySchedules.map((s, idx) => {
                              const isRest = s.subject_id === 'istirahat' || s.subject_id === 'istirahat_2' || s.subject_id === 'ishoma';
                              const isCeremony = s.subject_id === 'upacara';
                              const isPembiasaan = s.subject_id === 'pembiasaan';

                              return (
                                <tr 
                                  key={s.id || idx} 
                                  className={`border-b border-slate-300 last:border-b-0 ${
                                    isPembiasaan ? 'bg-emerald-50/80 font-semibold' :
                                    isRest ? 'bg-amber-50/80 font-semibold' : 
                                    isCeremony ? 'bg-blue-50/80' : 
                                    'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="p-1.5 border-r border-black text-center font-mono text-[7.5pt] whitespace-nowrap font-bold text-slate-800">
                                    {s.start_time} - {s.end_time}
                                  </td>
                                  <td className="p-1.5 leading-snug">
                                    <div className={`font-bold uppercase ${
                                      isPembiasaan ? 'text-emerald-900 font-black flex items-center gap-1' :
                                      isRest ? 'text-amber-800 italic flex items-center gap-1' : 
                                      isCeremony ? 'text-blue-900 font-extrabold flex items-center gap-1' : 
                                      'text-slate-900'
                                    }`}>
                                      {isPembiasaan && '🕌 '}
                                      {isCeremony && '🇮🇩 '}
                                      {isRest && '☕ '}
                                      {getMapelName(s.subject_id)}
                                    </div>
                                    {s.teacher_name && !isRest && !isCeremony && (
                                      <div className="text-[7.5pt] text-slate-600 font-sans font-medium flex items-center gap-0.5 mt-0.5">
                                        <span className="text-slate-400">Guru:</span> {s.teacher_name}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-6 text-center text-slate-400 text-xs italic font-sans">
                          Tidak ada jam pelajaran
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE 2: TABEL MATRIKS MINGGUAN */}
          {layoutMode === 'matrix' && (
            <div className="mb-6 overflow-x-auto border border-black">
              <table className="w-full border-collapse text-[8pt]">
                <thead>
                  <tr className="bg-slate-900 text-white font-sans uppercase text-[8pt]">
                    <th className="border border-black p-2 w-10 text-center">No</th>
                    <th className="border border-black p-2 w-28 text-center">Jam / Waktu</th>
                    {DAYS.map(d => (
                      <th key={d} className="border border-black p-2 text-center font-bold tracking-wider">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueTimeSlots.length > 0 ? (
                    uniqueTimeSlots.map((slot, index) => (
                      <tr key={`${slot.start_time}-${slot.end_time}`} className="even:bg-slate-50">
                        <td className="border border-black p-1.5 text-center font-mono font-bold text-slate-700">
                          {index + 1}
                        </td>
                        <td className="border border-black p-1.5 text-center font-mono text-[7.5pt] font-bold bg-slate-100">
                          {slot.start_time} - {slot.end_time}
                        </td>
                        {DAYS.map(day => {
                          const item = classSchedules.find(
                            s => s.day === day && s.start_time === slot.start_time
                          );

                          if (!item) {
                            return <td key={day} className="border border-black p-1.5 text-center text-slate-300 italic text-[7pt]">-</td>;
                          }

                          const isRest = item.subject_id === 'istirahat' || item.subject_id === 'ishoma';
                          const isCeremony = item.subject_id === 'upacara';

                          return (
                            <td 
                              key={day} 
                              className={`border border-black p-1.5 text-center ${
                                isRest ? 'bg-amber-100 font-bold text-amber-900 italic' : 
                                isCeremony ? 'bg-blue-100 font-bold text-blue-900' : 
                                ''
                              }`}
                            >
                              <div className="font-bold uppercase leading-tight text-[8pt]">
                                {getMapelName(item.subject_id)}
                              </div>
                              {item.teacher_name && !isRest && !isCeremony && (
                                <div className="text-[7pt] text-slate-600 font-sans mt-0.5">
                                  {item.teacher_name}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="border border-black p-8 text-center text-slate-400 italic">
                        Belum ada data jadwal untuk kelas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Catatan / Keterangan Singkat */}
          <div className="mb-6 p-2.5 border border-dashed border-black bg-slate-50 text-[8pt] font-sans flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-4">
              <span className="font-bold uppercase text-slate-700">Keterangan Khusus:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-800">
                🇮🇩 Upacara Bendera
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                ☕ Istirahat / Ishoma
              </span>
            </div>
            <p className="text-slate-500 italic">
              Harap hadir 15 menit sebelum jam pelajaran pertama dimulai.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div>
          {printConfig.show_signature && (
            <div className="mt-8">
              <PenandatanganDokumen targetKelas={className} />
            </div>
          )}

          {/* Footer Metadata */}
          <div className="mt-6 pt-2 border-t border-slate-300 text-[8pt] text-slate-500 flex justify-between items-center font-sans">
            <p>
              Dokumen Resmi Jadwal Pelajaran Madrasah | Dicetak pada: {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="font-semibold">Halaman 1 dari 1</p>
          </div>
        </div>
      </div>

      {/* Print Style Injections */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { 
          @page { 
            size: A4 ${orientation}; 
            margin: 0; 
          } 
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          } 
          .print\\:hidden { 
            display: none !important; 
          } 
        }
      ` }} />
    </div>
  );
};

export default CetakJadwal;
