import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import ExamCard from '@/components/ExamCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { 
  Plus, Printer, Trash2, Download, Settings2, Users, 
  RefreshCw, Pencil, CheckCircle2, AlertCircle, Loader2, 
  Upload, Image as ImageIcon, X, User as UserIcon, CalendarDays,
  LayoutGrid, Palette, FileSpreadsheet, FileJson, History, Settings,
  Info, Archive, Search, Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parse } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ExamSchedule {
  mataPelajaran: string;
  hariTanggal: string;
  waktu: string;
  ruang: string;
}

interface Participant {
  id: string;
  namaLengkap: string;
  nomorPeserta: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  nisn: string;
  fotoUrl?: string;
  username?: string;
  password?: string;
  schedules: ExamSchedule[];
  qrCode?: string;
  class_id?: string;
  judulKartu?: string;
}

const ExamCardGenerator: React.FC = () => {
  // Global Settings
  const [temaWarna, setTemaWarna] = useState<'blue' | 'orange' | 'green'>('blue');
  const [judulKartu, setJudulKartu] = useState("KARTU PESERTA TKAD");
  const [lembagaNama, setLembagaNama] = useState("MADRASAH IBTIDAIYAH NEGERI");
  const [lembagaLogo, setLembagaLogo] = useState<string>("");
  const [jabatanPanitia, setJabatanPanitia] = useState("Ketua Panitia TKAD,");
  const [panitiaNama, setPanitiaNama] = useState("H. Ahmad Syaifuddin, S.Pd.I");
  const [panitiaNip, setPanitiaNip] = useState("19750101 200501 1 001");
  const [panitiaTandaTangan, setPanitiaTandaTangan] = useState<string>("");
  
  const [globalSchedules, setGlobalSchedules] = useState<ExamSchedule[]>([
    {
      mataPelajaran: 'Literasi Bahasa',
      hariTanggal: 'Senin, 20 April 2026',
      waktu: '08:00 - 10:00',
      ruang: 'Ruang 01',
    }
  ]);

  // Data States
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Archive States
  const [archives, setArchives] = useState<any[]>([]);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveName, setArchiveName] = useState("");
  const [archiveLoading, setArchiveLoading] = useState(false);
  
  // Refs for file uploads
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Edit Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [activeTab, setActiveTab] = useState("data");
  const tabOrder = ["data", "schedule", "design", "others"];
  const [direction, setDirection] = useState(0);

  const handleTabChange = (value: string) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = tabOrder.indexOf(value);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(value);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  // Load Data from Supabase
  useEffect(() => {
    fetchClasses();
    fetchSavedData();
    fetchArchives();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'kelas_list').single();
      if (res?.value) setClasses(res.value as any[]);
    } catch (err) {
      console.error("Gagal memuat kelas", err);
    }
  };

  const fetchArchives = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'exam_card_archives').single();
      if (res?.value) setArchives(res.value as any[]);
    } catch (err) {
      console.log("Belum ada arsip");
    }
  };

  const fetchSavedData = async () => {
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'exam_card_data').single();
      if (res?.value) {
        const saved = res.value as any;
        if (saved.participants) setParticipants(saved.participants);
        if (saved.settings) {
          setTemaWarna(saved.settings.temaWarna || 'blue');
          setJudulKartu(saved.settings.judulKartu || "KARTU PESERTA TKAD");
          setLembagaNama(saved.settings.lembagaNama || "");
          setLembagaLogo(saved.settings.lembagaLogo || "");
          setJabatanPanitia(saved.settings.jabatanPanitia || "Ketua Panitia TKAD,");
          setPanitiaNama(saved.settings.panitiaNama || "");
          setPanitiaNip(saved.settings.panitiaNip || "");
          setPanitiaTandaTangan(saved.settings.panitiaTandaTangan || "");
          if (saved.settings.globalSchedules) {
            setGlobalSchedules(saved.settings.globalSchedules);
          } else if (saved.settings.globalSchedule) {
            // Migration from old single schedule
            setGlobalSchedules([{
              mataPelajaran: 'Umum',
              ...saved.settings.globalSchedule
            }]);
          }
        }
      }
    } catch (err) {
      console.log("Belum ada data tersimpan");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'photo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'logo') setLembagaLogo(base64String);
      else if (type === 'signature') setPanitiaTandaTangan(base64String);
      else if (type === 'photo' && editingParticipant) {
        setEditingParticipant({ ...editingParticipant, fotoUrl: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  const syncFromStudents = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'students_list').single();
      if (!res?.value) {
        showError("Data siswa tidak ditemukan");
        return;
      }

      const students = res.value as any[];
      const filteredStudents = selectedClass === 'all' 
        ? students 
        : students.filter(s => s.class_id === selectedClass);

      if (filteredStudents.length === 0) {
        showSuccess(`Tidak ada siswa di kelas ini`);
        return;
      }

      const newParticipants: Participant[] = filteredStudents.map((s, index) => ({
        id: s.id || `sync-${Date.now()}-${index}`,
        namaLengkap: s.name,
        nomorPeserta: `TKAD-2026-${String(index + 1).padStart(3, '0')}`,
        tempatLahir: s.tempat_lahir || '',
        tanggalLahir: s.tanggal_lahir || '',
        jenisKelamin: s.gender === 'Laki-laki' ? 'L' : 'P',
        nisn: s.nisn || '',
        username: s.username || s.nisn || '',
        password: s.password || (s.tanggal_lahir ? s.tanggal_lahir.split('-').reverse().join('') : '123456'),
        schedules: [...globalSchedules],
        class_id: s.class_id,
        fotoUrl: s.photo_url || s.foto_url || '' 
      }));

      setParticipants(newParticipants);
      showSuccess(`Berhasil sinkronisasi ${newParticipants.length} siswa`);
    } catch (err) {
      showError("Gagal sinkronisasi data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = async () => {
    try {
      const dataToSave = {
        participants,
        settings: { 
          temaWarna, 
          judulKartu,
          lembagaNama, 
          lembagaLogo, 
          jabatanPanitia,
          panitiaNama, 
          panitiaNip,
          panitiaTandaTangan, 
          globalSchedules 
        }
      };
      await supabase.from('site_settings').upsert({ 
        id: 'exam_card_data', 
        value: dataToSave,
        updated_at: new Date().toISOString()
      });
      showSuccess("Data berhasil disimpan");
    } catch (err) {
      showError("Gagal menyimpan data");
    }
  };

  const handleSaveToArchive = async () => {
    if (!archiveName.trim()) {
      showError("Nama arsip tidak boleh kosong");
      return;
    }

    setArchiveLoading(true);
    try {
      const currentData = {
        participants,
        settings: { 
          temaWarna, 
          judulKartu,
          lembagaNama, 
          lembagaLogo, 
          jabatanPanitia,
          panitiaNama, 
          panitiaNip,
          panitiaTandaTangan, 
          globalSchedules 
        }
      };

      const newArchive = {
        id: Date.now(),
        name: archiveName,
        date: new Date().toISOString(),
        participantCount: participants.length,
        data: currentData
      };

      const updatedArchives = [newArchive, ...archives];
      
      await supabase.from('site_settings').upsert({ 
        id: 'exam_card_archives', 
        value: updatedArchives,
        updated_at: new Date().toISOString()
      });

      setArchives(updatedArchives);
      setIsArchiveDialogOpen(false);
      setArchiveName("");
      showSuccess("Arsip berhasil disimpan");
    } catch (err) {
      showError("Gagal menyimpan arsip");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleLoadArchive = (archive: any) => {
    const { data } = archive;
    if (data.participants) setParticipants(data.participants);
    if (data.settings) {
      setTemaWarna(data.settings.temaWarna || 'blue');
      setJudulKartu(data.settings.judulKartu || "KARTU PESERTA TKAD");
      setLembagaNama(data.settings.lembagaNama || "");
      setLembagaLogo(data.settings.lembagaLogo || "");
      setJabatanPanitia(data.settings.jabatanPanitia || "Ketua Panitia TKAD,");
      setPanitiaNama(data.settings.panitiaNama || "");
      setPanitiaNip(data.settings.panitiaNip || "");
      setPanitiaTandaTangan(data.settings.panitiaTandaTangan || "");
      setGlobalSchedules(data.settings.globalSchedules || []);
    }
    showSuccess(`Data dari arsip "${archive.name}" berhasil dimuat`);
  };

  const handleDeleteArchive = async (id: number) => {
    if (!confirm("Hapus arsip ini?")) return;

    try {
      const updatedArchives = archives.filter(a => a.id !== id);
      await supabase.from('site_settings').upsert({ 
        id: 'exam_card_archives', 
        value: updatedArchives,
        updated_at: new Date().toISOString()
      });
      setArchives(updatedArchives);
      showSuccess("Arsip berhasil dihapus");
    } catch (err) {
      showError("Gagal menghapus arsip");
    }
  };

  const addParticipant = () => {
    const newP: Participant = {
      id: `manual-${Date.now()}`,
      namaLengkap: 'Peserta Baru',
      nomorPeserta: `TKAD-2026-${String(participants.length + 1).padStart(3, '0')}`,
      tempatLahir: '',
      tanggalLahir: '',
      jenisKelamin: 'L',
      nisn: '',
      username: '',
      password: '',
      schedules: [...globalSchedules],
    };
    setParticipants([...participants, newP]);
  };

  const openEditDialog = (p: Participant) => {
    setEditingParticipant({ ...p });
    setEditDialogOpen(true);
  };

  const saveEdit = () => {
    if (editingParticipant) {
      setParticipants(participants.map(p => p.id === editingParticipant.id ? editingParticipant : p));
      setEditDialogOpen(false);
      showSuccess("Data kartu diperbarui");
    }
  };

  const applyGlobalSchedules = () => {
    setParticipants(participants.map(p => ({
      ...p,
      schedules: [...globalSchedules],
    })));
    showSuccess("Jadwal global diterapkan ke semua kartu");
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handlePrint = () => {
    if (participants.length === 0) {
      showError("Belum ada data peserta untuk dicetak");
      return;
    }
    window.print();
  };

  const addGlobalSchedule = () => {
    const lastSchedule = globalSchedules.length > 0 ? globalSchedules[globalSchedules.length - 1] : null;
    setGlobalSchedules([...globalSchedules, {
      mataPelajaran: '',
      hariTanggal: lastSchedule ? lastSchedule.hariTanggal : '',
      waktu: '',
      ruang: lastSchedule ? lastSchedule.ruang : '',
    }]);
  };

  const removeGlobalSchedule = (index: number) => {
    setGlobalSchedules(globalSchedules.filter((_, i) => i !== index));
  };

  const updateGlobalSchedule = (index: number, field: keyof ExamSchedule, value: string) => {
    const newSchedules = [...globalSchedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setGlobalSchedules(newSchedules);
  };

  const addParticipantSchedule = () => {
    if (editingParticipant) {
      const lastSchedule = editingParticipant.schedules.length > 0 
        ? editingParticipant.schedules[editingParticipant.schedules.length - 1] 
        : null;
        
      setEditingParticipant({
        ...editingParticipant,
        schedules: [...editingParticipant.schedules, {
          mataPelajaran: '',
          hariTanggal: lastSchedule ? lastSchedule.hariTanggal : '',
          waktu: '',
          ruang: lastSchedule ? lastSchedule.ruang : '',
        }]
      });
    }
  };

  const removeParticipantSchedule = (index: number) => {
    if (editingParticipant) {
      setEditingParticipant({
        ...editingParticipant,
        schedules: editingParticipant.schedules.filter((_, i) => i !== index)
      });
    }
  };

  const updateParticipantSchedule = (index: number, field: keyof ExamSchedule, value: string) => {
    if (editingParticipant) {
      const newSchedules = [...editingParticipant.schedules];
      newSchedules[index] = { ...newSchedules[index], [field]: value };
      setEditingParticipant({
        ...editingParticipant,
        schedules: newSchedules
      });
    }
  };

  return (
    <AdminLayout title="Generator Kartu Peserta TKAD">
      <div className="space-y-6 print:hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-white p-4 rounded-2xl shadow-sm border mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              Manajemen Kartu Ujian
            </h2>
          </div>
          <p className="text-xs text-gray-500">Kustomisasi, sinkronisasi, dan cetak kartu peserta TKAD dalam format A4.</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full lg:w-auto h-auto">
              <TabsTrigger 
                value="data" 
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md text-slate-500 font-bold text-[10px] uppercase tracking-wider"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Peserta</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="schedule" 
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md text-slate-500 font-bold text-[10px] uppercase tracking-wider"
              >
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Jadwal</span>
              </TabsTrigger>

              <TabsTrigger 
                value="design" 
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md text-slate-500 font-bold text-[10px] uppercase tracking-wider"
              >
                <Palette className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Desain</span>
              </TabsTrigger>

              <TabsTrigger 
                value="others" 
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-md text-slate-500 font-bold text-[10px] uppercase tracking-wider"
              >
                <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Lainnya</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2 w-full lg:w-auto">
              <Button size="sm" variant="outline" onClick={handleSaveData} className="flex-1 lg:flex-none rounded-xl font-bold text-[10px] uppercase h-11">
                <Download className="w-4 h-4 mr-2" /> Simpan
              </Button>
              <Button size="sm" onClick={handlePrint} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase h-11 shadow-lg shadow-emerald-100">
                <Printer className="w-4 h-4 mr-2" /> Cetak A4
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden min-h-[400px]">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={activeTab}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="w-full"
              >
              {activeTab === "data" && (
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Daftar Kartu Peserta</CardTitle>
                      <CardDescription>Total: {participants.length} kartu siap cetak.</CardDescription>
                    </div>
                    <Button size="sm" onClick={addParticipant} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" /> Tambah Manual
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100/50 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b">
                          <tr>
                            <th className="py-4 px-4">Foto</th>
                            <th className="py-4 px-4">No. Peserta</th>
                            <th className="py-4 px-4">Nama Lengkap</th>
                            <th className="py-4 px-4">NISN</th>
                            <th className="py-4 px-4">Jml Mapel</th>
                            <th className="py-4 px-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {participants.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                Belum ada data. Silakan sinkronkan atau tambah manual.
                              </td>
                            </tr>
                          ) : (
                            participants.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 px-4">
                                  <Avatar className="h-10 w-8 rounded-md border shadow-sm">
                                    <AvatarImage src={p.fotoUrl} className="object-cover" />
                                    <AvatarFallback className="bg-gray-50"><UserIcon className="h-4 w-4 text-gray-300" /></AvatarFallback>
                                  </Avatar>
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.nomorPeserta}</td>
                                <td className="py-3 px-4 font-medium text-gray-700">{p.namaLengkap}</td>
                                <td className="py-3 px-4 text-gray-500">{p.nisn}</td>
                                <td className="py-3 px-4"><Badge variant="outline">{p.schedules?.length || 0} Mapel</Badge></td>
                                <td className="py-3 px-4">
                                  <div className="flex justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(p)} className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => removeParticipant(p.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "schedule" && (
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-blue-600" />
                          Sinkronisasi
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Pilih Kelas</Label>
                          <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kelas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua Kelas</SelectItem>
                              {classes.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.tingkat} - {c.nama_kelas}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm" 
                          onClick={syncFromStudents}
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                          Tarik Data & Sinkron
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-emerald-600" />
                            Master Jadwal Ujian (Global)
                          </CardTitle>
                          <CardDescription>Jadwal ini akan diterapkan ke semua kartu saat sinkronisasi.</CardDescription>
                        </div>
                        <Button size="sm" variant="outline" onClick={addGlobalSchedule}>
                          <Plus className="w-4 h-4 mr-2" /> Tambah Mapel
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {globalSchedules.map((sch, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg border relative group items-end">
                              <div className="md:col-span-1">
                                <Label className="text-[10px] uppercase text-gray-400">No</Label>
                                <div className="h-8 flex items-center justify-center font-mono text-xs text-gray-400 border rounded bg-white">{idx + 1}</div>
                              </div>
                              <div className="md:col-span-3">
                                <Label className="text-[10px] uppercase text-gray-400">Hari, Tanggal</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full h-8 px-2 text-left font-normal text-xs justify-start",
                                        !sch.hariTanggal && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-3 w-3" />
                                      {sch.hariTanggal ? (
                                        <span className="truncate">{sch.hariTanggal}</span>
                                      ) : (
                                        <span>Pilih tanggal</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarUI
                                      mode="single"
                                      selected={sch.hariTanggal ? new Date(sch.hariTanggal) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          updateGlobalSchedule(idx, 'hariTanggal', format(date, 'EEEE, d MMMM yyyy', { locale: id }));
                                        }
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-[10px] uppercase text-gray-400">Waktu</Label>
                                <Input 
                                  value={sch.waktu} 
                                  onChange={(e) => updateGlobalSchedule(idx, 'waktu', e.target.value)}
                                  className="h-8 text-xs"
                                  placeholder="08:00 - 10:00"
                                />
                              </div>
                              <div className="md:col-span-3">
                                <Label className="text-[10px] uppercase text-gray-400">Mata Pelajaran</Label>
                                <Input 
                                  value={sch.mataPelajaran} 
                                  onChange={(e) => updateGlobalSchedule(idx, 'mataPelajaran', e.target.value)}
                                  className="h-8 text-xs"
                                  placeholder="Matematika"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-[10px] uppercase text-gray-400">Ruang</Label>
                                <Input 
                                  value={sch.ruang} 
                                  onChange={(e) => updateGlobalSchedule(idx, 'ruang', e.target.value)}
                                  className="h-8 text-xs"
                                  placeholder="R. 01"
                                />
                              </div>
                              <div className="md:col-span-1 flex justify-end">
                                <Button size="icon" variant="ghost" onClick={() => removeGlobalSchedule(idx)} className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={applyGlobalSchedules}>
                          Terapkan Jadwal ke Semua Kartu yang Ada
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "design" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Identitas & Visual</CardTitle>
                      <CardDescription>Sesuaikan identitas lembaga dan tema warna kartu.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Judul Kartu (Header)</Label>
                          <Input 
                            value={judulKartu} 
                            onChange={(e) => setJudulKartu(e.target.value)}
                            placeholder="Contoh: KARTU PESERTA TKAD"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nama Lembaga (Header)</Label>
                          <Input 
                            value={lembagaNama} 
                            onChange={(e) => setLembagaNama(e.target.value)}
                            placeholder="Contoh: MADRASAH IBTIDAIYAH NEGERI"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Logo Lembaga</Label>
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 border rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                              {lembagaLogo ? (
                                <img src={lembagaLogo} alt="Logo" className="w-full h-full object-contain" />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-gray-200" />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input 
                                type="file" 
                                hidden 
                                ref={logoInputRef} 
                                accept="image/*" 
                                onChange={(e) => handleFileUpload(e, 'logo')} 
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                                  <Upload className="w-4 h-4 mr-2" /> Unggah Logo
                                </Button>
                                {lembagaLogo && (
                                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setLembagaLogo("")}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400">Rekomendasi: PNG transparan, rasio 1:1.</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Tema Warna Utama</Label>
                          <div className="flex gap-4">
                            {['blue', 'orange', 'green'].map((color) => (
                              <button
                                key={color}
                                onClick={() => setTemaWarna(color as any)}
                                className={`flex-1 h-12 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                                  temaWarna === color 
                                    ? 'border-emerald-600 ring-2 ring-emerald-100 shadow-inner' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full ${
                                  color === 'blue' ? 'bg-blue-600' : color === 'orange' ? 'bg-orange-600' : 'bg-emerald-600'
                                }`} />
                                <span className="text-xs font-bold capitalize">{color}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Otoritas & Pengesahan</CardTitle>
                      <CardDescription>Pengaturan tanda tangan panitia pelaksana.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Jabatan Penandatangan</Label>
                          <Input 
                            value={jabatanPanitia} 
                            onChange={(e) => setJabatanPanitia(e.target.value)}
                            placeholder="Contoh: Ketua Panitia TKAD,"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nama Penandatangan</Label>
                          <Input 
                            value={panitiaNama} 
                            onChange={(e) => setPanitiaNama(e.target.value)}
                            placeholder="Nama Lengkap & Gelar"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>NIP Penandatangan</Label>
                          <Input 
                            value={panitiaNip} 
                            onChange={(e) => setPanitiaNip(e.target.value)}
                            placeholder="Nomor Induk Pegawai"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tanda Tangan Panitia</Label>
                          <div className="flex items-center gap-4">
                            <div className="w-32 h-20 border rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                              {panitiaTandaTangan ? (
                                <img src={panitiaTandaTangan} alt="TTD" className="max-h-full object-contain" />
                              ) : (
                                <Pencil className="w-8 h-8 text-gray-200" />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input 
                                type="file" 
                                hidden 
                                ref={signatureInputRef} 
                                accept="image/*" 
                                onChange={(e) => handleFileUpload(e, 'signature')} 
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => signatureInputRef.current?.click()}>
                                  <Upload className="w-4 h-4 mr-2" /> Unggah TTD
                                </Button>
                                {panitiaTandaTangan && (
                                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setPanitiaTandaTangan("")}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400">Rekomendasi: PNG transparan tanpa background.</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Preview Pengesahan</h4>
                          <div className="text-center bg-white p-3 rounded-lg border">
                            <div className="text-[9px] font-bold text-gray-600 mb-2">Ketua Panitia TKAD,</div>
                            <div className="h-10 flex items-center justify-center mb-1">
                          {panitiaTandaTangan ? (
                            <img src={panitiaTandaTangan} alt="TTD" className="max-h-full object-contain mix-blend-multiply" />
                          ) : (
                            <div className="w-16 h-1 border-b border-gray-200 border-dashed"></div>
                          )}
                        </div>
                            <div className="text-[10px] font-bold text-gray-800 border-b border-gray-200 px-2 inline-block leading-tight">{panitiaNama}</div>
                            <div className="text-[8px] text-gray-500 mt-1">NIP. {panitiaNip || ".........................."}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "others" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-600">
                        <Archive className="w-5 h-5" />
                        Arsip Kartu
                      </CardTitle>
                      <CardDescription>Simpan dan muat data kartu peserta yang sudah dibuat sebelumnya.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                        onClick={() => setIsArchiveDialogOpen(true)}
                        disabled={participants.length === 0}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Buat Arsip Baru
                      </Button>

                      <div className="space-y-2 pt-2 border-t">
                        <h4 className="text-xs font-bold text-gray-400 uppercase">Daftar Arsip Terakhir</h4>
                        {archives.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 rounded-lg border border-dashed">
                            Belum ada arsip tersimpan.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {archives.map((arc) => (
                              <div key={arc.id} className="p-2 bg-gray-50 rounded-lg border flex items-center justify-between group">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-gray-700 truncate">{arc.name}</div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                    <CalendarIcon className="w-3 h-3" />
                                    {new Date(arc.date).toLocaleDateString('id-ID')}
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    {arc.participantCount} Siswa
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600" onClick={() => handleLoadArchive(arc)}>
                                    <RefreshCw className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleDeleteArchive(arc.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-600">
                        <FileSpreadsheet className="w-5 h-5" />
                        Ekspor Data
                      </CardTitle>
                      <CardDescription>Ekspor daftar peserta ke format Excel atau CSV.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full justify-start gap-2 hover:bg-blue-50 hover:text-blue-600 border-blue-100">
                        <Download className="w-4 h-4" /> Download Excel (.xlsx)
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <History className="w-5 h-5" />
                        Reset Data
                      </CardTitle>
                      <CardDescription>Hapus semua data peserta dan kembali ke awal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full justify-start gap-2 text-red-500 hover:bg-red-50 hover:text-red-600 border-red-100" onClick={() => setParticipants([])}>
                        <Trash2 className="w-4 h-4" /> Kosongkan Semua Data
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-700">
                        <Settings className="w-5 h-5" />
                        Pengaturan Lanjut
                      </CardTitle>
                      <CardDescription>Konfigurasi tambahan untuk pencetakan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                        <span className="text-gray-600">Tampilkan NISN</span>
                        <Badge variant="outline" className="bg-white">Aktif</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                        <span className="text-gray-600">Gunakan QR Code</span>
                        <Badge variant="outline" className="bg-white">Aktif</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>

        {/* PRATINJAU KARTU */}
        {participants.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                Daftar Kartu Peserta ({participants.length})
              </h3>
              <div className="flex items-center gap-4">
                <p className="text-xs text-gray-400 hidden sm:block">Format 4 kartu per halaman A4</p>
                <Button size="sm" onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                  <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
                </Button>
              </div>
            </div>
            <div className="bg-slate-50 p-4 md:p-8 rounded-3xl border border-slate-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {participants.map((p) => (
                  <div key={p.id} className="flex justify-center transform hover:scale-[1.02] transition-transform duration-300">
                    <ExamCard 
                      {...p} 
                      schedules={p.schedules}
                      temaWarna={temaWarna} 
                      judulKartu={p.judulKartu || judulKartu}
                      lembagaNama={lembagaNama}
                      lembagaLogo={lembagaLogo}
                      jabatanPanitia={jabatanPanitia}
                      tandaTanganPanitia={panitiaNama}
                      panitiaNip={panitiaNip}
                      tandaTanganUrl={panitiaTandaTangan}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION KHUSUS CETAK - HANYA MUNCUL SAAT PRINT */}
      <div className="hidden print:block print:p-0 print:m-0 print:max-w-none">
        <div className="print-container">
          {participants.map((p, index) => (
            <div key={p.id || index} className="print-card-wrapper">
              <ExamCard 
                {...p} 
                schedules={p.schedules}
                temaWarna={temaWarna} 
                judulKartu={p.judulKartu || judulKartu}
                lembagaNama={lembagaNama}
                lembagaLogo={lembagaLogo}
                jabatanPanitia={jabatanPanitia}
                tandaTanganPanitia={panitiaNama}
                panitiaNip={panitiaNip}
                tandaTanganUrl={panitiaTandaTangan}
              />
            </div>
          ))}
        </div>
      </div>

      {/* DIALOG EDIT FULL PER SISWA / KARTU */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              Edit Detail Kartu Peserta
            </DialogTitle>
          </DialogHeader>
          {editingParticipant && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase border-b pb-1">Identitas Personal</h4>
                  
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border">
                    <Avatar className="h-24 w-20 rounded-lg border-2 border-white shadow-md">
                      <AvatarImage src={editingParticipant.fotoUrl} className="object-cover" />
                      <AvatarFallback className="bg-white"><UserIcon className="h-10 w-10 text-gray-100" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <input 
                        type="file" 
                        hidden 
                        ref={photoInputRef} 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, 'photo')} 
                      />
                      <Button size="sm" variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" /> Ganti Foto
                      </Button>
                      <p className="text-[10px] text-gray-400">Rekomendasi: Pas foto 3x4, background merah/biru.</p>
                    </div>
                  </div>

                    <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nama Lengkap</Label>
                      <Input 
                        value={editingParticipant.namaLengkap} 
                        onChange={(e) => setEditingParticipant({ ...editingParticipant, namaLengkap: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">No. Peserta</Label>
                        <Input 
                          value={editingParticipant.nomorPeserta} 
                          onChange={(e) => setEditingParticipant({ ...editingParticipant, nomorPeserta: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">NISN</Label>
                        <Input 
                          value={editingParticipant.nisn} 
                          onChange={(e) => setEditingParticipant({ ...editingParticipant, nisn: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Username</Label>
                        <Input 
                          value={editingParticipant.username || ''} 
                          onChange={(e) => setEditingParticipant({ ...editingParticipant, username: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Password</Label>
                        <Input 
                          value={editingParticipant.password || ''} 
                          onChange={(e) => setEditingParticipant({ ...editingParticipant, password: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Judul Kartu (Kustom)</Label>
                      <Input 
                        placeholder={judulKartu}
                        value={editingParticipant.judulKartu || ''} 
                        onChange={(e) => setEditingParticipant({ ...editingParticipant, judulKartu: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Tempat Lahir</Label>
                        <Input 
                          value={editingParticipant.tempatLahir} 
                          onChange={(e) => setEditingParticipant({ ...editingParticipant, tempatLahir: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tgl Lahir</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full h-10 px-3 text-left font-normal justify-start",
                                !editingParticipant.tanggalLahir && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editingParticipant.tanggalLahir ? (
                                <span>{editingParticipant.tanggalLahir}</span>
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarUI
                              mode="single"
                              captionLayout="dropdown-buttons"
                              fromYear={1990}
                              toYear={2030}
                              selected={editingParticipant.tanggalLahir ? new Date(editingParticipant.tanggalLahir) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setEditingParticipant({ 
                                    ...editingParticipant, 
                                    tanggalLahir: format(date, 'yyyy-MM-dd') 
                                  });
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Jadwal Spesifik Peserta</h4>
                    <Button size="sm" variant="ghost" className="h-6 text-blue-600 text-[10px]" onClick={addParticipantSchedule}>
                      <Plus className="w-3 h-3 mr-1" /> Tambah
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {editingParticipant.schedules && editingParticipant.schedules.length > 0 ? (
                      editingParticipant.schedules.map((sch, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg border relative group space-y-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-red-500 absolute -top-2 -right-2 bg-white shadow-sm border rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeParticipantSchedule(idx)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Input 
                            placeholder="Mata Pelajaran" 
                            value={sch.mataPelajaran} 
                            onChange={(e) => updateParticipantSchedule(idx, 'mataPelajaran', e.target.value)}
                            className="h-8 text-xs font-bold"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full h-7 px-2 text-left font-normal text-[10px] justify-start",
                                    !sch.hariTanggal && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-1 h-3 w-3" />
                                  {sch.hariTanggal ? (
                                    <span className="truncate">{sch.hariTanggal}</span>
                                  ) : (
                                    <span>Tgl</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarUI
                                  mode="single"
                                  selected={sch.hariTanggal ? new Date(sch.hariTanggal) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updateParticipantSchedule(idx, 'hariTanggal', format(date, 'EEEE, d MMMM yyyy', { locale: id }));
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <Input 
                              placeholder="Waktu" 
                              value={sch.waktu} 
                              onChange={(e) => updateParticipantSchedule(idx, 'waktu', e.target.value)}
                              className="h-7 text-[10px]"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Belum ada jadwal khusus untuk peserta ini.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed">
                  <strong>Tips:</strong> Perubahan di sini hanya berlaku untuk kartu ini saja. Jika ingin mengubah jadwal untuk semua siswa, gunakan fitur <strong>Master Jadwal</strong> di tab Jadwal & Sinkron.
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button onClick={saveEdit} className="bg-blue-600 hover:bg-blue-700">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SIMPAN ARSIP */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-purple-600" />
              Simpan ke Arsip
            </DialogTitle>
            <CardDescription>
              Data kartu saat ini akan disimpan sebagai arsip permanen.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Arsip</Label>
              <Input 
                placeholder="Contoh: Kartu Ujian Semester Genap 2025" 
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
              />
              <p className="text-[10px] text-gray-400 italic">
                * Menyimpan {participants.length} data peserta dan pengaturan desain saat ini.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>Batal</Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700" 
              onClick={handleSaveToArchive}
              disabled={archiveLoading || !archiveName.trim()}
            >
              {archiveLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Simpan Arsip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ExamCardGenerator;
