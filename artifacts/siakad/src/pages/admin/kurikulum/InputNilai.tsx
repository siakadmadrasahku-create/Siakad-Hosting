"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Save, Loader2, Search, Filter, BookOpen, Users, 
  CheckCircle2, AlertCircle, RefreshCw, PenTool, Info
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface NilaiItem {
  student_id: string;
  mapel_id: string;
  tp_scores: Record<string, number>; // tp_id: score
  sas_score: number; // Sumatif Akhir Semester
  description: string;
}

const InputNilai = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [bedahCP, setBedahCP] = useState<any[]>([]);
  const [nilaiList, setNilaiList] = useState<NilaiItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('id, value');
      
      setStudents(res?.find(s => s.id === 'students_list')?.value || []);
      setClasses(res?.find(s => s.id === 'kelas_list')?.value || []);
      setMapels(res?.find(s => s.id === 'mata_pelajaran_list')?.value || []);
      setBedahCP(res?.find(s => s.id === 'bedah_cp_data')?.value || []);
      setNilaiList(res?.find(s => s.id === 'nilai_siswa_list')?.value || []);
    } catch (err) {
      showError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const currentClassStudents = useMemo(() => {
    return students.filter(s => s.class_id === selectedClass);
  }, [students, selectedClass]);

  const currentMapelTP = useMemo(() => {
    const mapel = mapels.find(m => m.id === selectedMapel);
    if (!mapel) return [];
    
    // Cari fase berdasarkan tingkat kelas (1-6)
    const kelas = classes.find(c => c.id === selectedClass);
    const tingkat = kelas?.tingkat || '1';
    
    // Pemetaan Fase Kurikulum Merdeka
    // Tingkat 1-2: Fase A
    // Tingkat 3-4: Fase B
    // Tingkat 5-6: Fase C
    const fase = (tingkat === '1' || tingkat === '2') ? 'A' : 
                 (tingkat === '3' || tingkat === '4') ? 'B' : 'C';

    return bedahCP.filter(cp => cp.mata_pelajaran === mapel.nama && cp.fase === fase);
  }, [mapels, selectedMapel, selectedClass, bedahCP, classes]);

  const handleScoreChange = (studentId: string, tpId: string, score: number) => {
    setNilaiList(prev => {
      const existing = prev.find(n => n.student_id === studentId && n.mapel_id === selectedMapel);
      if (existing) {
        return prev.map(n => n.student_id === studentId && n.mapel_id === selectedMapel 
          ? { ...n, tp_scores: { ...n.tp_scores, [tpId]: score } } 
          : n
        );
      }
      return [...prev, { student_id: studentId, mapel_id: selectedMapel, tp_scores: { [tpId]: score }, sas_score: 0, description: '' }];
    });
  };

  const handleSASChange = (studentId: string, score: number) => {
    setNilaiList(prev => {
      const existing = prev.find(n => n.student_id === studentId && n.mapel_id === selectedMapel);
      if (existing) {
        return prev.map(n => n.student_id === studentId && n.mapel_id === selectedMapel ? { ...n, sas_score: score } : n);
      }
      return [...prev, { student_id: studentId, mapel_id: selectedMapel, tp_scores: {}, sas_score: score, description: '' }];
    });
  };

  const generateDescription = (studentId: string) => {
    const nilai = nilaiList.find(n => n.student_id === studentId && n.mapel_id === selectedMapel);
    if (!nilai) return "";

    const scores = Object.entries(nilai.tp_scores);
    if (scores.length === 0) return "Belum ada data nilai TP.";

    const highTP = scores.filter(([_, s]) => s >= 85).map(([id, _]) => currentMapelTP.find(t => t.id === id)?.materi_pokok).filter(Boolean);
    const lowTP = scores.filter(([_, s]) => s < 70).map(([id, _]) => currentMapelTP.find(t => t.id === id)?.materi_pokok).filter(Boolean);

    let desc = "";
    if (highTP.length > 0) {
      desc += `Menunjukkan penguasaan yang sangat baik dalam materi ${highTP.join(', ')}. `;
    }
    if (lowTP.length > 0) {
      desc += `Perlu bimbingan lebih lanjut dalam memahami materi ${lowTP.join(', ')}.`;
    } else if (highTP.length === 0) {
      desc = "Menunjukkan penguasaan yang cukup dalam seluruh materi yang diajarkan.";
    }

    return desc;
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updatedNilai = nilaiList.map(n => {
        if (n.mapel_id === selectedMapel) {
          return { ...n, description: generateDescription(n.student_id) };
        }
        return n;
      });

      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'nilai_siswa_list', 
          value: updatedNilai, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      setNilaiList(updatedNilai);
      showSuccess('Seluruh nilai berhasil disimpan!');
    } catch (err) {
      showError('Gagal menyimpan nilai');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Input Nilai Siswa">
      <div className="space-y-6">
        <Card className="border-0 shadow-lg bg-emerald-600 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <PenTool className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Manajemen Nilai Kurikulum Merdeka</h2>
                  <p className="text-emerald-100 text-sm">Input nilai sumatif untuk Tingkat 1-6 (Fase A, B, C).</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white rounded-xl h-12">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.sort((a, b) => parseInt(a.tingkat) - parseInt(b.tingkat)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nama_kelas} (Tingkat {c.tingkat})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedMapel} onValueChange={setSelectedMapel}>
                  <SelectTrigger className="w-full md:w-56 bg-white/10 border-white/20 text-white rounded-xl h-12">
                    <SelectValue placeholder="Pilih Mata Pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {mapels.map(m => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedClass || !selectedMapel ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed">
            <Info className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Silakan pilih Kelas and Mata Pelajaran terlebih dahulu.</p>
          </div>
        ) : currentMapelTP.length === 0 ? (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900">Data TP Belum Ada</h4>
              <p className="text-sm text-amber-700">Anda belum melakukan Bedah CP untuk mata pelajaran ini di fase yang sesuai. Silakan isi data di menu <strong>Bedah CP</strong> agar kolom nilai muncul.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge className="bg-emerald-100 text-emerald-700 border-0 px-4 py-1.5 rounded-full font-bold">
                {currentClassStudents.length} Siswa Terdeteksi
              </Badge>
              <Button onClick={handleSaveAll} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Semua Nilai
              </Button>
            </div>

            <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[50px] text-center font-bold">No</TableHead>
                      <TableHead className="min-w-[200px] font-bold">Nama Siswa</TableHead>
                      {currentMapelTP.map((tp, idx) => (
                        <TableHead key={tp.id} className="text-center min-w-[100px] font-bold">
                          <div className="text-[10px] text-gray-400 uppercase mb-1">TP {idx + 1}</div>
                          <div className="text-[9px] leading-tight line-clamp-2 max-w-[100px] mx-auto">{tp.materi_pokok}</div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center w-[100px] font-bold bg-blue-50/50">SAS</TableHead>
                      <TableHead className="min-w-[300px] font-bold">Preview Deskripsi Rapor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentClassStudents.map((student, idx) => {
                      const nilai = nilaiList.find(n => n.student_id === student.id && n.mapel_id === selectedMapel);
                      return (
                        <TableRow key={student.id} className="hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="text-center font-medium text-gray-400">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-gray-900">{student.name}</TableCell>
                          {currentMapelTP.map((tp) => (
                            <TableCell key={tp.id} className="p-2">
                              <Input 
                                type="number" 
                                min="0" max="100"
                                value={nilai?.tp_scores[tp.id] || ''}
                                onChange={(e) => handleScoreChange(student.id, tp.id, parseInt(e.target.value))}
                                className="w-16 mx-auto text-center font-bold rounded-lg h-10 focus:ring-emerald-500"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="p-2 bg-blue-50/30">
                            <Input 
                              type="number" 
                              min="0" max="100"
                              value={nilai?.sas_score || ''}
                              onChange={(e) => handleSASChange(student.id, parseInt(e.target.value))}
                              className="w-16 mx-auto text-center font-bold border-blue-200 rounded-lg h-10 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-[10px] text-gray-500 leading-relaxed italic">
                              {generateDescription(student.id) || "Masukkan nilai untuk generate deskripsi..."}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default InputNilai;