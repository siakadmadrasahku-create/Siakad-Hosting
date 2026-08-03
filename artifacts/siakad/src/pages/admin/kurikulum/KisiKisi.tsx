"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Pencil, Trash2, FileSpreadsheet, Sparkles, Loader2, 
  Save, Printer, ArrowLeft, Search, ChevronRight, BookOpen, ListChecks, Wand2,
  LayoutGrid, Settings2, CheckSquare, Square
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KisiKisiItem {
  id: string;
  nama_ujian: string;
  mata_pelajaran: string;
  fase: string;
  materi_pokok: string;
  indikator_soal: string;
  level_kognitif: 'L1' | 'L2' | 'L3' | 'HOTS';
  bentuk_soal: 'PG' | 'Isian' | 'Uraian';
  no_soal: string;
  created_at: string;
}

const MATA_PELAJARAN = [
  'Al-Quran Hadits', 'Akidah Akhlak', 'Fiqih', 'Sejarah Kebudayaan Islam',
  'Bahasa Arab', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 
  'IPAS', 'Seni Budaya', 'PJOK', 'Bahasa Inggris', 'Muatan Lokal'
];

const KisiKisi = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const [data, setData] = useState<KisiKisiItem[]>([]);
  const [bedahCPData, setBedahCPData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingItem, setEditingItem] = useState<KisiKisiItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUjian, setSelectedUjian] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<KisiKisiItem, 'id' | 'created_at'>>({
    nama_ujian: '',
    mata_pelajaran: 'Al-Quran Hadits',
    fase: 'A',
    materi_pokok: '',
    indikator_soal: '',
    level_kognitif: 'L1',
    bentuk_soal: 'PG',
    no_soal: '1'
  });

  const [genConfig, setGenConfig] = useState({
    nama_ujian: '',
    mata_pelajaran: 'Al-Quran Hadits',
    fase: 'A',
    jumlah_soal: '10',
    bentuk_soal: 'Campuran',
    selected_materi: [] as string[]
  });

  useEffect(() => {
    fetchKisiKisi();
    fetchBedahCP();
  }, []);

  const fetchKisiKisi = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'kisi_kisi_data').maybeSingle();
      if (res?.value) setData(res.value as KisiKisiItem[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchBedahCP = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'bedah_cp_data').maybeSingle();
      if (res?.value) setBedahCPData(res.value as any[]);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!formData.nama_ujian || !formData.materi_pokok || !formData.indikator_soal) {
      showError('Lengkapi data kisi-kisi!');
      return;
    }
    setIsSaving(true);
    try {
      let newList: KisiKisiItem[];
      if (editingItem) {
        newList = data.map(d => d.id === editingItem.id ? { ...formData, id: d.id, created_at: d.created_at } : d);
      } else {
        const newItem: KisiKisiItem = { ...formData, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...data];
      }
      await supabase.from('site_settings').upsert({ id: 'kisi_kisi_data', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      await refreshSettings();
      showSuccess('Kisi-kisi berhasil disimpan!');
      setDialogOpen(false);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const callAI = async (prompt: string, systemPrompt: string) => {
    const { data: apiConfigRes } = await supabase.from('site_settings').select('value').eq('id', 'api_keys').maybeSingle();
    const apiConfig = apiConfigRes?.value;

    if (!apiConfig?.gemini_api_key && !apiConfig?.openai_api_key && !apiConfig?.openrouter_api_key) {
      throw new Error("API Key belum dikonfigurasi di Dashboard Admin.");
    }

    const { data: aiRes, error: aiError } = await supabase.functions.invoke('ai-chat', {
      body: { 
        message: prompt, 
        systemPrompt, 
        config: apiConfig,
        history: []
      }
    });

    if (aiError) throw aiError;
    if (aiRes?.error) throw new Error(aiRes.error);
    
    return aiRes?.text || "";
  };

  const handleGenerateSingleAI = async () => {
    if (!formData.materi_pokok) {
      showError('Pilih Materi Pokok terlebih dahulu!');
      return;
    }

    setIsGeneratingSingle(true);
    try {
      const relevantCP = bedahCPData.find(cp => 
        cp.mata_pelajaran === formData.mata_pelajaran && 
        cp.fase === formData.fase &&
        cp.materi_pokok === formData.materi_pokok
      );

      const prompt = `
        Buatlah 1 kalimat indikator soal yang spesifik untuk:
        Materi: ${formData.materi_pokok}
        Mapel: ${formData.mata_pelajaran}
        Fase: ${formData.fase}
        Level: ${formData.level_kognitif}
        CP Referensi: ${relevantCP?.cp || 'Umum'}
        
        Format: "Disajikan [stimulus], siswa dapat [kata kerja operasional]..."
        Hanya berikan kalimat indikatornya saja.
      `;

      const result = await callAI(prompt, "Anda adalah pakar kurikulum Madrasah Ibtidaiyah.");
      if (result) {
        setFormData(prev => ({ ...prev, indikator_soal: result.trim().replace(/["']/g, '') }));
        showSuccess('Indikator berhasil disusun AI!');
      }
    } catch (error: any) {
      showError(error.message || "Gagal terhubung ke AI");
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!genConfig.nama_ujian || !genConfig.mata_pelajaran) {
      showError('Lengkapi Nama Ujian dan Mata Pelajaran!');
      return;
    }

    if (genConfig.selected_materi.length === 0) {
      showError('Pilih minimal satu materi pokok!');
      return;
    }

    setIsGenerating(true);
    try {
      const relevantCP = bedahCPData.filter(cp => 
        cp.mata_pelajaran === genConfig.mata_pelajaran && 
        cp.fase === genConfig.fase &&
        genConfig.selected_materi.includes(cp.materi_pokok)
      );

      const prompt = `
        TUGAS: Buatlah ${genConfig.jumlah_soal} baris kisi-kisi ujian MI.
        NAMA UJIAN: ${genConfig.nama_ujian}
        MATA PELAJARAN: ${genConfig.mata_pelajaran}
        FASE: ${genConfig.fase}
        BENTUK SOAL: ${genConfig.bentuk_soal}
        
        REFERENSI MATERI:
        ${JSON.stringify(relevantCP.map(c => ({ materi: c.materi_pokok, cp: c.cp })))}

        FORMAT OUTPUT (WAJIB JSON ARRAY):
        [
          {
            "materi_pokok": "Nama Materi",
            "indikator_soal": "Kalimat indikator...",
            "level_kognitif": "L1/L2/L3/HOTS",
            "bentuk_soal": "PG/Isian/Uraian",
            "no_soal": "1"
          }
        ]
        HANYA BERIKAN JSON ARRAY MURNI.
      `;
      
      const result = await callAI(prompt, "Anda adalah sistem pakar kurikulum Madrasah. Jawab hanya dengan JSON array.");

      if (result) {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Format data AI tidak valid.");

        const generated = JSON.parse(jsonMatch[0]);
        const finalItems = generated.map((item: any, i: number) => ({
          ...item,
          id: `ai-kisi-${Date.now()}-${i}`,
          nama_ujian: genConfig.nama_ujian,
          mata_pelajaran: genConfig.mata_pelajaran,
          fase: genConfig.fase,
          created_at: new Date().toISOString()
        }));

        const newList = [...finalItems, ...data];
        await supabase.from('site_settings').upsert({ id: 'kisi_kisi_data', value: newList, updated_at: new Date().toISOString() });
        setData(newList);
        showSuccess(`Berhasil menyusun ${finalItems.length} indikator via AI!`);
        setDialogOpen(false);
      }
    } catch (error: any) {
      showError(error.message || "Gagal memproses data AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kisi-kisi ini?')) return;
    const newList = data.filter(d => d.id !== id);
    await supabase.from('site_settings').upsert({ id: 'kisi_kisi_data', value: newList, updated_at: new Date().toISOString() });
    setData(newList);
    showSuccess('Kisi-kisi dihapus');
  };

  const filteredData = data.filter(item => 
    item.nama_ujian.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedUjian = useMemo(() => {
    const groups: Record<string, { mapel: string, fase: string, count: number, items: KisiKisiItem[] }> = {};
    filteredData.forEach(item => {
      const key = `${item.nama_ujian} | ${item.mata_pelajaran}`;
      if (!groups[key]) groups[key] = { mapel: item.mata_pelajaran, fase: item.fase, count: 0, items: [] };
      groups[key].count++;
      groups[key].items.push(item);
    });
    return groups;
  }, [filteredData]);

  const filteredMateriOptions = bedahCPData.filter(item => item.mata_pelajaran === formData.mata_pelajaran && item.fase === formData.fase);
  
  const availableGenMateri = bedahCPData.filter(item => 
    item.mata_pelajaran === genConfig.mata_pelajaran && 
    item.fase === genConfig.fase
  );

  const toggleGenMateri = (materi: string) => {
    setGenConfig(prev => ({
      ...prev,
      selected_materi: prev.selected_materi.includes(materi) 
        ? prev.selected_materi.filter(m => m !== materi) 
        : [...prev.selected_materi, materi]
    }));
  };

  if (isPrinting && selectedUjian) {
    const info = groupedUjian[selectedUjian];
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setIsPrinting(false)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
            <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
          </Button>
        </div>
        <div className="flex-1 p-8 overflow-y-auto print:p-0">
          <div className="bg-white mx-auto shadow-2xl print:shadow-none p-[1.5cm]" style={{ width: '297mm', minHeight: '210mm' }}>
            <KopSurat />
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold uppercase">KISI-KISI PENYUSUNAN SOAL {selectedUjian.split(' | ')[0]}</h2>
              <p className="text-sm">Mata Pelajaran: {info.mapel} | Fase: {info.fase}</p>
            </div>
            <table className="w-full border-collapse border border-black text-[10pt]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 w-10">No</th>
                  <th className="border border-black p-2">Materi Pokok</th>
                  <th className="border border-black p-2">Indikator Soal</th>
                  <th className="border border-black p-2 w-20">Level</th>
                  <th className="border border-black p-2 w-24">Bentuk</th>
                  <th className="border border-black p-2 w-16">No Soal</th>
                </tr>
              </thead>
              <tbody>
                {info.items.sort((a,b) => Number(a.no_soal) - Number(b.no_soal)).map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2">{item.materi_pokok}</td>
                    <td className="border border-black p-2">{item.indikator_soal}</td>
                    <td className="border border-black p-2 text-center font-bold">{item.level_kognitif}</td>
                    <td className="border border-black p-2 text-center">{item.bentuk_soal}</td>
                    <td className="border border-black p-2 text-center">{item.no_soal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-12">
              <PenandatanganDokumen targetKelas={info.fase} />
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4 landscape; margin: 0; } body { background: white; } .print\\:hidden { display: none; } }` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="Kisi-kisi Ujian Profesional">
      {selectedUjian ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="flex items-center justify-between bg-white p-4 md:p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedUjian(null)} className="rounded-xl h-10 w-10 p-0"><ArrowLeft className="w-5 h-5" /></Button>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedUjian.split(' | ')[0]}</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{selectedUjian.split(' | ')[1]}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsPrinting(true)} className="bg-blue-600 text-white rounded-xl font-bold px-4 h-10 text-xs shadow-md">
                <Printer className="w-4 h-4 mr-1.5" /> Cetak
              </Button>
              <Button onClick={() => { setEditingItem(null); setFormData({ ...formData, nama_ujian: selectedUjian.split(' | ')[0], mata_pelajaran: groupedUjian[selectedUjian].mapel, fase: groupedUjian[selectedUjian].fase }); setDialogOpen(true); }} className="bg-emerald-600 text-white rounded-xl font-bold px-4 h-10 text-xs shadow-md">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah
              </Button>
            </div>
          </div>

          <Card className="border-0 shadow-lg overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[60px] text-center font-bold">No Soal</TableHead>
                    <TableHead className="min-w-[200px] font-bold">Materi Pokok</TableHead>
                    <TableHead className="min-w-[300px] font-bold">Indikator Soal</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">Level</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">Bentuk</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedUjian[selectedUjian]?.items.sort((a,b) => Number(a.no_soal) - Number(b.no_soal)).map((item) => (
                    <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell className="text-center font-black text-emerald-600">{item.no_soal}</TableCell>
                      <TableCell className="font-bold text-gray-800">{item.materi_pokok}</TableCell>
                      <TableCell className="text-sm text-gray-600 leading-relaxed">{item.indikator_soal}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${item.level_kognitif === 'HOTS' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'} border-0 font-black`}>{item.level_kognitif}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.bentuk_soal}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormData({ ...item }); setDialogOpen(true); }} className="h-8 w-8 p-0 text-blue-600"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button>
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
              <h2 className="text-2xl font-black text-gray-900">Blueprint Kisi-kisi Ujian</h2>
              <p className="text-gray-500">Rancang indikator soal yang terukur sebelum menyusun bank soal.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button onClick={() => { setEditingItem(null); setFormData({ nama_ujian: '', mata_pelajaran: 'Al-Quran Hadits', fase: 'A', materi_pokok: '', indikator_soal: '', level_kognitif: 'L1', bentuk_soal: 'PG', no_soal: '1' }); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold px-8 h-14 shadow-xl shadow-emerald-100">
                <Plus className="w-5 h-5 mr-2" /> Tambah Indikator
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-gray-100 border-0 rounded-[2rem]" />)
            ) : Object.keys(groupedUjian).length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                <FileSpreadsheet className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                <p className="text-gray-400 font-bold text-lg">Belum ada kisi-kisi ujian.</p>
              </div>
            ) : (
              Object.entries(groupedUjian).map(([key, info]) => (
                <Card key={key} onClick={() => setSelectedUjian(key)} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group rounded-[2.5rem] overflow-hidden bg-white cursor-pointer">
                  <div className="h-3 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                        <ListChecks className="w-7 h-7" />
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">FASE {info.fase}</Badge>
                    </div>
                    <h3 className="font-black text-gray-900 text-xl mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{key.split(' | ')[0]}</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">{info.mapel}</p>
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <span className="text-sm font-bold text-gray-500">{info.count} Indikator</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto p-0 border-0 shadow-2xl">
          <Tabs defaultValue="manual" className="w-full">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <Settings2 className="w-6 h-6" />
                  {editingItem ? 'Edit Indikator' : 'Konfigurasi Kisi-kisi'}
                </DialogTitle>
              </DialogHeader>
              {!editingItem && (
                <TabsList className="bg-white/10 border border-white/20 p-1 rounded-xl mt-6 w-full sm:w-auto">
                  <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                    <LayoutGrid className="w-4 h-4 mr-2" /> Input Manual
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-purple-700">
                    <Sparkles className="w-4 h-4 mr-2" /> AI Generator (Bulk)
                  </TabsTrigger>
                </TabsList>
              )}
            </div>

            <div className="p-8">
              <TabsContent value="manual" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nama Ujian</label><Input value={formData.nama_ujian} onChange={(e) => setFormData({...formData, nama_ujian: e.target.value})} placeholder="Contoh: PAT Semester 1" className="rounded-2xl h-14 border-gray-100 bg-gray-50/50" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mata Pelajaran</label><Select value={formData.mata_pelajaran} onValueChange={(v) => setFormData({...formData, mata_pelajaran: v, materi_pokok: ''})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl">{MATA_PELAJARAN.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase</label><Select value={formData.fase} onValueChange={(v) => setFormData({...formData, fase: v, materi_pokok: ''})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl"><SelectItem value="A">Fase A</SelectItem><SelectItem value="B">Fase B</SelectItem><SelectItem value="C">Fase C</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Materi Pokok (Sinkron Bedah CP)</label>
                    <Select value={formData.materi_pokok} onValueChange={(v) => setFormData({...formData, materi_pokok: v})}>
                      <SelectTrigger className="rounded-2xl h-14 border-emerald-100 bg-emerald-50/30"><SelectValue placeholder="Pilih Materi" /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {filteredMateriOptions.length > 0 ? filteredMateriOptions.map((m, idx) => <SelectItem key={idx} value={m.materi_pokok}>{m.materi_pokok}</SelectItem>) : <div className="p-4 text-center text-xs text-gray-400 italic">Data Bedah CP tidak ditemukan.</div>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Indikator Soal</label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateSingleAI} 
                      disabled={isGeneratingSingle || !formData.materi_pokok}
                      className="text-purple-600 border-purple-100 hover:bg-purple-50 rounded-xl h-8 text-[10px] font-bold"
                    >
                      {isGeneratingSingle ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea value={formData.indikator_soal} onChange={(e) => setFormData({...formData, indikator_soal: e.target.value})} placeholder="Contoh: Disajikan ayat, siswa mampu menentukan hukum bacaan..." className="rounded-2xl min-h-[100px] border-gray-100 bg-gray-50/50 p-6" />
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Level Kognitif</label><Select value={formData.level_kognitif} onValueChange={(v: any) => setFormData({...formData, level_kognitif: v})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl"><SelectItem value="L1">L1 (Pemahaman)</SelectItem><SelectItem value="L2">L2 (Aplikasi)</SelectItem><SelectItem value="L3">L3 (Penalaran)</SelectItem><SelectItem value="HOTS">HOTS</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bentuk Soal</label><Select value={formData.bentuk_soal} onValueChange={(v: any) => setFormData({...formData, bentuk_soal: v})}><SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl"><SelectItem value="PG">Pilihan Ganda</SelectItem><SelectItem value="Isian">Isian Singkat</SelectItem><SelectItem value="Uraian">Uraian</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Soal</label><Input type="number" value={formData.no_soal} onChange={(e) => setFormData({...formData, no_soal: e.target.value})} className="rounded-2xl h-14 border-gray-100 bg-gray-50/50" /></div>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-2xl h-14 font-bold text-gray-500">Batal</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold shadow-xl shadow-emerald-100">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} Simpan Indikator
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="mt-0 space-y-6">
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <p className="text-xs text-purple-800 leading-relaxed">AI akan menyusun indikator kisi-kisi secara otomatis berdasarkan data Bedah CP Anda. Pilih materi pokok yang ingin diujikan di bawah ini.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nama Ujian</label>
                    <Input value={genConfig.nama_ujian} onChange={(e) => setGenConfig({...genConfig, nama_ujian: e.target.value})} placeholder="Contoh: Sumatif Akhir Semester" className="rounded-2xl h-14 border-gray-100 bg-gray-50/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mata Pelajaran</label>
                    <Select value={genConfig.mata_pelajaran} onValueChange={(v) => setGenConfig({...genConfig, mata_pelajaran: v, selected_materi: []})}>
                      <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl">{MATA_PELAJARAN.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase Belajar</label>
                    <Select value={genConfig.fase} onValueChange={(v) => setGenConfig({...genConfig, fase: v, selected_materi: []})}>
                      <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl"><SelectItem value="A">Fase A</SelectItem><SelectItem value="B">Fase B</SelectItem><SelectItem value="C">Fase C</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bentuk Soal</label>
                    <Select value={genConfig.bentuk_soal} onValueChange={(v) => setGenConfig({...genConfig, bentuk_soal: v})}>
                      <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="Campuran">Campuran (PG, Isian, Uraian)</SelectItem>
                        <SelectItem value="PG">Hanya Pilihan Ganda</SelectItem>
                        <SelectItem value="Isian">Hanya Isian Singkat</SelectItem>
                        <SelectItem value="Uraian">Hanya Uraian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Jumlah Indikator</label>
                    <Select value={genConfig.jumlah_soal} onValueChange={(v) => setGenConfig({...genConfig, jumlah_soal: v})}>
                      <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="5">5 Indikator</SelectItem>
                        <SelectItem value="10">10 Indikator</SelectItem>
                        <SelectItem value="15">15 Indikator</SelectItem>
                        <SelectItem value="20">20 Indikator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Pilih Materi Pokok (Dari Bedah CP)</label>
                  <Card className="border-dashed border-2 bg-gray-50/50">
                    <ScrollArea className="h-[150px] p-4">
                      {availableGenMateri.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availableGenMateri.map((m: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm">
                              <Checkbox 
                                id={`gen-materi-${idx}`} 
                                checked={genConfig.selected_materi.includes(m.materi_pokok)} 
                                onCheckedChange={() => toggleGenMateri(m.materi_pokok)} 
                              />
                              <label htmlFor={`gen-materi-${idx}`} className="text-xs font-medium cursor-pointer leading-tight">{m.materi_pokok}</label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-xs text-gray-400 italic">Data Bedah CP tidak ditemukan untuk Mapel & Fase ini.</p>
                        </div>
                      )}
                    </ScrollArea>
                  </Card>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-2xl h-14 font-bold text-gray-500">Batal</Button>
                  <Button onClick={handleGenerateAI} disabled={isGenerating} className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-14 font-bold shadow-xl shadow-purple-100">
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
                    Generate Blueprint AI
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default KisiKisi;