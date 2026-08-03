"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Pencil, Trash2, Layers, Sparkles, Loader2, 
  CheckCircle2, Calculator, BookOpen, ListChecks, FileText, Search, 
  ChevronRight, Folder, ArrowLeft, Printer, AlertCircle, X, Save
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SoalItem {
  id: string;
  nama_paket: string;
  mata_pelajaran: string;
  fase: string;
  materi_pokok: string;
  tipe: 'pilihan_ganda' | 'isian' | 'uraian' | 'campuran';
  pertanyaan: string;
  opsi_a?: string;
  opsi_b?: string;
  opsi_c?: string;
  opsi_d?: string;
  kunci_jawaban: string;
  bobot_nilai: number;
  created_at: string;
}

const MATA_PELAJARAN = [
  'Al-Quran Hadits', 'Akidah Akhlak', 'Fiqih', 'Sejarah Kebudayaan Islam',
  'Bahasa Arab', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 
  'IPAS', 'Seni Budaya', 'PJOK', 'Bahasa Inggris', 'Muatan Lokal'
];

const BankSoal = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [data, setData] = useState<SoalItem[]>([]);
  const [kisiKisiData, setKisiKisiData] = useState<any[]>([]);
  const [bedahCPData, setBedahCPData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingItem, setEditingItem] = useState<SoalItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    nama_paket: '',
    mata_pelajaran: 'Al-Quran Hadits',
    fase: 'A',
    selected_materi: [] as string[],
    count_pg: 5,
    count_isian: 3,
    count_uraian: 2,
    pertanyaan: '',
    opsi_a: '',
    opsi_b: '',
    opsi_c: '',
    opsi_d: '',
    kunci_jawaban: '',
    bobot_nilai: 2,
    tipe: 'pilihan_ganda'
  });

  const [genConfig, setGenConfig] = useState({
    nama_paket: '',
    mata_pelajaran: 'Al-Quran Hadits',
    fase: 'A',
    ujian_id: ''
  });

  useEffect(() => {
    fetchSoal();
    fetchKisiKisi();
    fetchBedahCP();
  }, []);

  const fetchSoal = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'bank_soal_data').maybeSingle();
      if (res?.value) setData(res.value as SoalItem[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchKisiKisi = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'kisi_kisi_data').maybeSingle();
      if (res?.value) setKisiKisiData(res.value as any[]);
    } catch (err) { console.error(err); }
  };

  const fetchBedahCP = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'bedah_cp_data').maybeSingle();
      if (res?.value) setBedahCPData(res.value as any[]);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!formData.pertanyaan || !formData.kunci_jawaban || !formData.nama_paket) {
      showError('Lengkapi data soal!');
      return;
    }
    setIsSaving(true);
    try {
      let newList: SoalItem[];
      const materiText = formData.selected_materi.length > 0 ? formData.selected_materi.join(', ') : formData.materi_pokok;
      
      if (editingItem) {
        newList = data.map(d => d.id === editingItem.id ? { ...formData, materi_pokok: materiText, id: d.id, created_at: d.created_at } : d);
      } else {
        const newItem: SoalItem = { ...formData, materi_pokok: materiText, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...data];
      }
      await supabase.from('site_settings').upsert({ id: 'bank_soal_data', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      await refreshSettings();
      showSuccess('Soal berhasil disimpan!');
      setDialogOpen(false);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const handleGenerateSingleAI = async () => {
    if (!formData.nama_paket || formData.selected_materi.length === 0) {
      showError('Isi Nama Paket dan pilih minimal satu Materi Pokok!');
      return;
    }

    setIsGeneratingSingle(true);
    try {
      const { data: apiConfigRes } = await supabase.from('site_settings').select('value').eq('id', 'api_keys').maybeSingle();
      const apiConfig = apiConfigRes?.value;

      const prompt = `
        Buatlah paket soal MI yang berkualitas untuk:
        Mapel: ${formData.mata_pelajaran}
        Fase: ${formData.fase}
        Materi Pokok: ${formData.selected_materi.join(', ')}
        
        JUMLAH SOAL YANG HARUS DIBUAT:
        - Pilihan Ganda: ${formData.count_pg}
        - Isian Singkat: ${formData.count_isian}
        - Uraian: ${formData.count_uraian}

        FORMAT OUTPUT (WAJIB JSON ARRAY):
        [
          {
            "tipe": "pilihan_ganda",
            "pertanyaan": "...",
            "opsi_a": "...", "opsi_b": "...", "opsi_c": "...", "opsi_d": "...",
            "kunci_jawaban": "A/B/C/D",
            "bobot_nilai": 2
          },
          {
            "tipe": "isian",
            "pertanyaan": "...",
            "kunci_jawaban": "...",
            "bobot_nilai": 3
          },
          {
            "tipe": "uraian",
            "pertanyaan": "...",
            "kunci_jawaban": "...",
            "bobot_nilai": 5
          }
        ]
        HANYA BERIKAN JSON ARRAY.
      `;

      const { data: aiRes, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: { message: prompt, systemPrompt: "Anda adalah pakar pembuat soal Madrasah.", config: apiConfig, history: [] }
      });

      if (aiError) throw aiError;
      if (aiRes?.text) {
        const cleanJson = aiRes.text.replace(/```json|```/g, '').trim();
        const generated = JSON.parse(cleanJson);
        
        if (Array.isArray(generated)) {
          const finalSoals = generated.map((s: any, i: number) => ({
            ...s, 
            id: `ai-man-${Date.now()}-${i}`, 
            nama_paket: formData.nama_paket,
            mata_pelajaran: formData.mata_pelajaran, 
            fase: formData.fase, 
            materi_pokok: formData.selected_materi.join(', '), 
            created_at: new Date().toISOString()
          }));
          const newList = [...finalSoals, ...data];
          await supabase.from('site_settings').upsert({ id: 'bank_soal_data', value: newList });
          setData(newList);
          showSuccess(`Berhasil menyusun ${finalSoals.length} soal via AI!`);
          setDialogOpen(false);
        }
      }
    } catch (error: any) {
      showError("Gagal terhubung ke AI. Periksa API Key.");
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!genConfig.nama_paket || !genConfig.ujian_id) {
      showError('Pilih Kisi-kisi and isi nama paket!');
      return;
    }

    setIsGenerating(true);
    try {
      const { data: apiConfigRes } = await supabase.from('site_settings').select('value').eq('id', 'api_keys').maybeSingle();
      const apiConfig = apiConfigRes?.value;

      const selectedKisi = kisiKisiData.filter(k => k.nama_ujian === genConfig.ujian_id && k.mata_pelajaran === genConfig.mata_pelajaran);
      
      const prompt = `
        Buatlah soal ujian MI Fase ${genConfig.fase} Mapel ${genConfig.mata_pelajaran} berdasarkan Kisi-kisi berikut:
        ${JSON.stringify(selectedKisi.map(k => ({ no: k.no_soal, materi: k.materi_pokok, indikator: k.indikator_soal, level: k.level_kognitif, bentuk: k.bentuk_soal })))}

        ATURAN:
        1. Bahasa sederhana untuk anak MI.
        2. Output JSON array murni: [{"tipe":"pilihan_ganda","pertanyaan":"...","opsi_a":"...","opsi_b":"...","opsi_c":"...","opsi_d":"...","kunci_jawaban":"A","bobot_nilai":2}, ...]
      `;
      
      const { data: aiRes, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: { message: prompt, systemPrompt: "Anda adalah pakar pembuat soal MI. Berikan JSON array.", config: apiConfig, history: [] }
      });

      if (aiError) throw aiError;
      if (aiRes?.text) {
        const cleanJson = aiRes.text.replace(/```json|```/g, '').trim();
        const generated = JSON.parse(cleanJson);
        const finalSoals = generated.map((s: any, i: number) => ({
          ...s, id: `ai-${Date.now()}-${i}`, nama_paket: genConfig.nama_paket,
          mata_pelajaran: genConfig.mata_pelajaran, fase: genConfig.fase, created_at: new Date().toISOString()
        }));
        const newList = [...finalSoals, ...data];
        await supabase.from('site_settings').upsert({ id: 'bank_soal_data', value: newList });
        setData(newList);
        showSuccess(`Berhasil menyusun ${finalSoals.length} soal via AI!`);
        setGenDialogOpen(false);
      }
    } catch (error) {
      showError("Gagal generate soal. Pastikan API Key aktif.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePackage = async (packageName: string) => {
    if (!confirm(`Hapus seluruh paket soal "${packageName}"?`)) return;
    const newList = data.filter(d => d.nama_paket !== packageName);
    await supabase.from('site_settings').upsert({ id: 'bank_soal_data', value: newList });
    setData(newList);
    showSuccess('Paket soal berhasil dihapus');
  };

  const filteredData = data.filter(item => 
    item.pertanyaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nama_paket.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPackages = useMemo(() => {
    const groups: Record<string, { mapel: string, fase: string, count: number, items: SoalItem[] }> = {};
    filteredData.forEach(item => {
      const key = item.nama_paket;
      if (!groups[key]) groups[key] = { mapel: item.mata_pelajaran, fase: item.fase, count: 0, items: [] };
      groups[key].count++;
      groups[key].items.push(item);
    });
    return groups;
  }, [filteredData]);

  const uniqueUjianNames = Array.from(new Set(kisiKisiData.map(k => k.nama_ujian)));
  
  const availableMateri = bedahCPData.filter(item => 
    item.mata_pelajaran === formData.mata_pelajaran && 
    item.fase === formData.fase
  );

  const toggleMateri = (materi: string) => {
    setFormData((prev: any) => ({
      ...prev,
      selected_materi: prev.selected_materi.includes(materi) 
        ? prev.selected_materi.filter((m: string) => m !== materi) 
        : [...prev.selected_materi, materi]
    }));
  };

  if (isPrinting && selectedPackage) {
    const pkg = groupedPackages[selectedPackage];
    const pg = pkg.items.filter(i => i.tipe === 'pilihan_ganda');
    const isian = pkg.items.filter(i => i.tipe === 'isian');
    const uraian = pkg.items.filter(i => i.tipe === 'uraian');

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg"><Printer className="w-4 h-4 mr-2" /> Cetak Sekarang</Button>
        </div>
        <div className="flex-1 p-8 overflow-y-auto print:p-0">
          <div className="bg-white mx-auto shadow-2xl print:shadow-none p-[2cm]" style={{ width: '210mm', minHeight: '297mm' }}>
            <KopSurat />
            <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h2 className="text-xl font-bold uppercase">LEMBAR SOAL {selectedPackage}</h2>
              <div className="grid grid-cols-2 gap-4 text-left mt-4 text-sm">
                <div>
                  <p>Mata Pelajaran : <strong>{pkg.mapel}</strong></p>
                  <p>Fase / Kelas : <strong>{pkg.fase}</strong></p>
                </div>
                <div>
                  <p>Waktu : 90 Menit</p>
                  <p>Nama Siswa : ...........................................</p>
                </div>
              </div>
            </div>

            <div className="space-y-8 font-serif text-[11pt]">
              {pg.length > 0 && (
                <div>
                  <h3 className="font-bold mb-4">I. Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!</h3>
                  <div className="space-y-6">
                    {pg.map((s, idx) => (
                      <div key={s.id} className="flex gap-3">
                        <span className="w-5">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="mb-2">{s.pertanyaan}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <p>A. {s.opsi_a}</p>
                            <p>B. {s.opsi_b}</p>
                            <p>C. {s.opsi_c}</p>
                            <p>D. {s.opsi_d}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isian.length > 0 && (
                <div>
                  <h3 className="font-bold mb-4">II. Isilah titik-titik di bawah ini dengan jawaban yang singkat and tepat!</h3>
                  <div className="space-y-4">
                    {isian.map((s, idx) => (
                      <div key={s.id} className="flex gap-3">
                        <span className="w-5">{idx + 1}.</span>
                        <p className="flex-1">{s.pertanyaan} ...................................................................................</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uraian.length > 0 && (
                <div>
                  <h3 className="font-bold mb-4">III. Jawablah pertanyaan-pertanyaan di bawah ini dengan uraian yang jelas!</h3>
                  <div className="space-y-6">
                    {uraian.map((s, idx) => (
                      <div key={s.id} className="flex gap-3">
                        <span className="w-5">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="mb-2">{s.pertanyaan}</p>
                          <div className="h-16 border-b border-dotted border-gray-400"></div>
                          <div className="h-16 border-b border-dotted border-gray-400"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-12">
              <PenandatanganDokumen targetKelas={pkg.fase} />
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Bank Soal Intelligence">
      {selectedPackage ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex items-center justify-between bg-white p-4 md:p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedPackage(null)} className="rounded-xl h-10 w-10 p-0"><ArrowLeft className="w-5 h-5" /></Button>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedPackage}</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{groupedPackages[selectedPackage]?.mapel} • FASE {groupedPackages[selectedPackage]?.fase}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsPrinting(true)} className="bg-blue-600 text-white rounded-xl font-bold px-4 h-10 text-xs shadow-md">
                <Printer className="w-4 h-4 mr-1.5" /> Cetak
              </Button>
              <Button onClick={() => { setEditingItem(null); setFormData({ ...formData, nama_paket: selectedPackage, mata_pelajaran: groupedPackages[selectedPackage].mapel, fase: groupedPackages[selectedPackage].fase, selected_materi: [] }); setDialogOpen(true); }} className="bg-emerald-600 text-white rounded-xl font-bold px-4 h-10 text-xs shadow-md">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah
              </Button>
            </div>
          </div>

          <Card className="border-0 shadow-xl overflow-hidden rounded-[2rem]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[60px] text-center font-bold">No</TableHead>
                    <TableHead className="min-w-[450px] font-bold">Pertanyaan & Pilihan Jawaban</TableHead>
                    <TableHead className="w-[150px] text-center font-bold">Tipe</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">Kunci</TableHead>
                    <TableHead className="w-[120px] text-center font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedPackages[selectedPackage]?.items.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="text-center font-bold text-gray-300">{idx + 1}</TableCell>
                      <TableCell className="py-6">
                        <p className="font-extrabold text-gray-800 text-lg mb-3">{item.pertanyaan}</p>
                        {item.tipe === 'pilihan_ganda' && (
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 bg-gray-50/50 p-4 rounded-2xl border border-dashed">
                            <p><span className="font-black text-emerald-600">A.</span> {item.opsi_a}</p>
                            <p><span className="font-black text-emerald-600">B.</span> {item.opsi_b}</p>
                            <p><span className="font-black text-emerald-600">C.</span> {item.opsi_c}</p>
                            <p><span className="font-black text-emerald-600">D.</span> {item.opsi_d}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                          item.tipe === 'pilihan_ganda' ? 'bg-purple-100 text-purple-700' :
                          item.tipe === 'isian' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        } border-0`}>{item.tipe.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto font-black shadow-md">{item.kunci_jawaban}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormData({ ...item, selected_materi: item.materi_pokok.split(', ') }); setDialogOpen(true); }} className="h-10 w-10 p-0 text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { if(confirm('Hapus soal?')) { const nl = data.filter(d => d.id !== item.id); supabase.from('site_settings').upsert({ id: 'bank_soal_data', value: nl }).then(() => setData(nl)); } }} className="h-10 w-10 p-0 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900">Repositori Paket Soal</h2>
              <p className="text-gray-500">Kelola and buat paket soal ujian cerdas berbasis kurikulum.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button onClick={() => setGenDialogOpen(true)} className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold px-6 h-14 shadow-xl shadow-purple-100">
                <Sparkles className="w-5 h-5 mr-2" /> AI Generator
              </Button>
              <Button onClick={() => { setEditingItem(null); setFormData({ nama_paket: '', mata_pelajaran: 'Al-Quran Hadits', fase: 'A', selected_materi: [], count_pg: 5, count_isian: 3, count_uraian: 2, pertanyaan: '', kunci_jawaban: '', bobot_nilai: 2, tipe: 'pilihan_ganda' }); setDialogOpen(true); }} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold px-6 h-14 shadow-xl shadow-emerald-100">
                <Plus className="w-5 h-5 mr-2" /> Buat Manual
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-gray-100 border-0 rounded-[2rem]" />)
            ) : Object.keys(groupedPackages).length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                <Folder className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <p className="text-gray-400 font-bold text-lg">Belum ada paket soal yang dibuat.</p>
                <p className="text-gray-400 text-sm mt-2">Gunakan AI Generator untuk menyusun soal secara otomatis.</p>
              </div>
            ) : (
              Object.entries(groupedPackages).map(([name, info]) => (
                <Card key={name} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group rounded-[2.5rem] overflow-hidden bg-white">
                  <div className="h-3 bg-gradient-to-r from-emerald-400 to-teal-600"></div>
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className="bg-blue-50 text-blue-700 border-0 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">FASE {info.fase}</Badge>
                        <button onClick={(e) => { e.stopPropagation(); handleDeletePackage(name); }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <h3 className="font-black text-gray-900 text-xl mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">{name}</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">{info.mapel}</p>
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <span className="text-sm font-bold text-gray-500">{info.count} Butir Soal</span>
                      <Button onClick={() => setSelectedPackage(name)} variant="ghost" className="rounded-xl font-bold text-emerald-600 hover:bg-emerald-50">
                        Buka Paket <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* AI Generator Dialog (Bulk from Kisi-kisi) */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                AI Question Intelligence
              </DialogTitle>
              <DialogDescription className="text-purple-100">AI akan menyusun soal unik berdasarkan Kisi-kisi yang telah Anda buat.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nama Paket Ujian</label><Input value={genConfig.nama_paket} onChange={(e) => setGenConfig({...genConfig, nama_paket: e.target.value})} placeholder="Contoh: PAT Semester 1" className="rounded-2xl h-14 border-gray-100 bg-gray-50/50" /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mata Pelajaran</label><Select value={genConfig.mata_pelajaran} onValueChange={(v) => setGenConfig({...genConfig, mata_pelajaran: v})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl">{MATA_PELAJARAN.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase Belajar</label><Select value={genConfig.fase} onValueChange={(v) => setGenConfig({...genConfig, fase: v})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl"><SelectItem value="A">Fase A</SelectItem><SelectItem value="B">Fase B</SelectItem><SelectItem value="C">Fase C</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Pilih Kisi-kisi Sumber</label><Select value={genConfig.ujian_id} onValueChange={(v) => setGenConfig({...genConfig, ujian_id: v})}><SelectTrigger className="rounded-2xl h-14 border-emerald-100 bg-emerald-50/30"><SelectValue placeholder="Pilih Kisi-kisi" /></SelectTrigger><SelectContent className="rounded-2xl">{uniqueUjianNames.length > 0 ? uniqueUjianNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>) : <div className="p-4 text-center text-xs text-gray-400 italic">Belum ada data Kisi-kisi.</div>}</SelectContent></Select></div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setGenDialogOpen(false)} className="flex-1 rounded-2xl h-14 font-bold text-gray-500">Batal</Button>
              <Button onClick={handleGenerateAI} disabled={isGenerating} className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-14 font-bold shadow-xl shadow-purple-100">{isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />} Generate Intelligence</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Input Dialog (Enhanced with Multi-Materi & Split Counts) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Layers className="w-6 h-6" />
                {editingItem ? 'Edit Butir Soal' : 'Konfigurasi Soal Manual & AI'}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nama Paket</label><Input value={formData.nama_paket} onChange={(e) => setFormData({...formData, nama_paket: e.target.value})} className="rounded-2xl h-14 border-gray-100 bg-gray-50/50" /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mata Pelajaran</label><Select value={formData.mata_pelajaran} onValueChange={(v) => setFormData({...formData, mata_pelajaran: v, selected_materi: []})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl">{MATA_PELAJARAN.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase</label><Select value={formData.fase} onValueChange={(v) => setFormData({...formData, fase: v, selected_materi: []})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl"><SelectItem value="A">Fase A</SelectItem><SelectItem value="B">Fase B</SelectItem><SelectItem value="C">Fase C</SelectItem></SelectContent></Select></div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Pilih Materi Pokok (Bisa Lebih dari Satu)</label>
                <Card className="border-dashed border-2 bg-gray-50/50">
                  <ScrollArea className="h-[120px] p-4">
                    {availableMateri.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {availableMateri.map((m: any, idx: number) => (
                          <div key={idx} className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm">
                            <Checkbox 
                              id={`materi-${idx}`} 
                              checked={formData.selected_materi.includes(m.materi_pokok)} 
                              onCheckedChange={() => toggleMateri(m.materi_pokok)} 
                            />
                            <label htmlFor={`materi-${idx}`} className="text-[11px] font-medium cursor-pointer leading-tight">{m.materi_pokok}</label>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-[10px] text-gray-400 text-center py-4">Data Bedah CP tidak ditemukan.</p>}
                  </ScrollArea>
                </Card>
              </div>
            </div>

            {!editingItem && (
              <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Pembagian Jumlah Soal (AI Generator)</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateSingleAI} 
                    disabled={isGeneratingSingle || formData.selected_materi.length === 0}
                    className="text-purple-600 border-purple-100 hover:bg-purple-50 rounded-xl h-8 text-[10px] font-bold"
                  >
                    {isGeneratingSingle ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    Generate Paket AI
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400">PG</label>
                    <Input type="number" value={formData.count_pg} onChange={(e) => setFormData({...formData, count_pg: Number(e.target.value)})} className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400">ISIAN</label>
                    <Input type="number" value={formData.count_isian} onChange={(e) => setFormData({...formData, count_isian: Number(e.target.value)})} className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400">URAIAN</label>
                    <Input type="number" value={formData.count_uraian} onChange={(e) => setFormData({...formData, count_uraian: Number(e.target.value)})} className="h-10 rounded-xl" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Input Manual (Satu Per Satu)</label>
                <Badge variant="outline" className="text-[9px]">{formData.tipe.replace('_', ' ').toUpperCase()}</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400">TIPE SOAL</label>
                  <Select value={formData.tipe} onValueChange={(v: any) => setFormData({...formData, tipe: v})}>
                    <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pilihan_ganda">Pilihan Ganda</SelectItem>
                      <SelectItem value="isian">Isian Singkat</SelectItem>
                      <SelectItem value="uraian">Uraian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400">BOBOT NILAI</label>
                  <Input type="number" value={formData.bobot_nilai} onChange={(e) => setFormData({...formData, bobot_nilai: Number(e.target.value)})} className="h-10 rounded-xl" />
                </div>
              </div>
              <Textarea placeholder="Tulis pertanyaan di sini..." value={formData.pertanyaan} onChange={(e) => setFormData({...formData, pertanyaan: e.target.value})} className="rounded-2xl min-h-[100px] border-gray-100 bg-gray-50/50 p-4" />
              
              {formData.tipe === 'pilihan_ganda' && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-dashed">
                  <Input placeholder="Opsi A" value={formData.opsi_a} onChange={(e) => setFormData({...formData, opsi_a: e.target.value})} className="h-10 rounded-xl" />
                  <Input placeholder="Opsi B" value={formData.opsi_b} onChange={(e) => setFormData({...formData, opsi_b: e.target.value})} className="h-10 rounded-xl" />
                  <Input placeholder="Opsi C" value={formData.opsi_c} onChange={(e) => setFormData({...formData, opsi_c: e.target.value})} className="h-10 rounded-xl" />
                  <Input placeholder="Opsi D" value={formData.opsi_d} onChange={(e) => setFormData({...formData, opsi_d: e.target.value})} className="h-10 rounded-xl" />
                </div>
              )}
              
              <Input placeholder="Kunci Jawaban" value={formData.kunci_jawaban} onChange={(e) => setFormData({...formData, kunci_jawaban: e.target.value})} className="rounded-xl h-12 border-emerald-100 bg-emerald-50/30 font-bold" />
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-2xl h-14 font-bold text-gray-500">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold shadow-xl shadow-emerald-100">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} Simpan Butir Soal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default BankSoal;