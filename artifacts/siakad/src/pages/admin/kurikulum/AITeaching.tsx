"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Trash2, Brain, Sparkles, Eye, Printer, Loader2, FileCheck, BookOpen, ListChecks, History, 
  CalendarDays, CalendarRange, Layers, ArrowLeft, Save, Search, X, ChevronRight, ClipboardCheck
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
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
  pertemuan?: string;
  hasil: string;
  created_at: string;
  tanggal_cetak?: string;
}

const dokumenTypes = [
  { value: 'prota', label: 'PROTA', fullLabel: 'Program Tahunan (PROTA)', icon: CalendarDays, color: 'bg-cyan-600' },
  { value: 'promes', label: 'PROMES', fullLabel: 'Program Semester (PROMES)', icon: CalendarRange, color: 'bg-teal-600' },
  { value: 'silabus', label: 'ATP / Silabus', fullLabel: 'Alur Tujuan Pembelajaran (ATP) / Silabus', icon: ListChecks, color: 'bg-purple-600' },
  { value: 'rpp_rpm', label: 'RPP / RPM', fullLabel: 'Rencana Pelaksanaan Pembelajaran (RPP/RPM)', icon: FileCheck, color: 'bg-amber-500' },
  { value: 'modul_ajar', label: 'Modul Ajar', fullLabel: 'Modul Ajar Kurikulum Merdeka', icon: BookOpen, color: 'bg-emerald-600' },
  { value: 'jurnal_mengajar', label: 'Jurnal Mengajar', fullLabel: 'Jurnal Harian Mengajar', icon: History, color: 'bg-rose-500' },
  { value: 'cp_tp_atp', label: 'Analisis CP-TP-ATP', fullLabel: 'Analisis Capaian dan Tujuan Pembelajaran', icon: Layers, color: 'bg-indigo-600' },
  { value: 'kktp', label: 'KKTP', fullLabel: 'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)', icon: ClipboardCheck, color: 'bg-orange-600' },
];

const FASE_OPTIONS = [
  { value: 'Fase A - Kelas 1', label: 'Fase A - Kelas 1' },
  { value: 'Fase A - Kelas 2', label: 'Fase A - Kelas 2' },
  { value: 'Fase B - Kelas 3', label: 'Fase B - Kelas 3' },
  { value: 'Fase B - Kelas 4', label: 'Fase B - Kelas 4' },
  { value: 'Fase C - Kelas 5', label: 'Fase C - Kelas 5' },
  { value: 'Fase C - Kelas 6', label: 'Fase C - Kelas 6' },
];

const MATA_PELAJARAN = [
  'Al-Quran Hadits', 'Akidah Akhlak', 'Fiqih', 'Sejarah Kebudayaan Islam',
  'Bahasa Arab', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 
  'IPAS', 'Seni Budaya', 'PJOK', 'Bahasa Inggris', 'Muatan Lokal'
];

const AITeaching = () => {
  const { settings } = useSiteSettings();
  const [data, setData] = useState<AITeachingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<AITeachingItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Tanggal dinamis hari ini
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  const dayName = today.toLocaleDateString('id-ID', { weekday: 'long' });

  const [formData, setFormData] = useState({
    jenis_dokumen: 'modul_ajar',
    mata_pelajaran: 'Al-Quran Hadits',
    fase: 'Fase A - Kelas 1',
    topik: '',
    materi_pokok: [] as string[],
    alokasi_waktu: '2 × 35 menit',
    pertemuan: '',
    hasil: '',
    tanggal_cetak: new Date().toISOString().split('T')[0] // Default ke hari ini
  });

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    try {
      const { data: res, error } = await supabase.from('site_settings').select('value').eq('id', 'ai_teaching_list').maybeSingle();
      if (res?.value && Array.isArray(res.value)) {
        // Add missing fields to old documents
        const updatedList = (res.value as AITeachingItem[]).map(item => ({
          ...item,
          created_at: item.created_at || item.tanggal_cetak ? new Date(`${item.tanggal_cetak}T00:00:00`).toISOString() : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          tahun_pelajaran: item.tahun_pelajaran || '2024/2025',
          semester: item.semester || 'Ganjil'
        }));
        setData(updatedList);
        // Optional: Save back to database if you want to persist the changes
        // await supabase.from('site_settings').upsert({ id: 'ai_teaching_list', value: updatedList, updated_at: new Date().toISOString() });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.topik.toLowerCase().includes(searchQuery.toLowerCase()) || item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = selectedType === 'all' || item.jenis_dokumen === selectedType;
      return matchSearch && matchType;
    });
  }, [data, searchQuery, selectedType]);

  const availableMateri = useMemo(() => {
    const bedahCP = settings.bedah_cp_data || [];
    const faseLetter = formData.fase.split(' ')[1]; 
    return bedahCP.filter((item: any) => item.mata_pelajaran === formData.mata_pelajaran && item.fase === faseLetter);
  }, [settings.bedah_cp_data, formData.mata_pelajaran, formData.fase]);

  const toggleMateri = (materi: string) => {
    setFormData(prev => ({
      ...prev,
      materi_pokok: prev.materi_pokok.includes(materi) ? prev.materi_pokok.filter(m => m !== materi) : [...prev.materi_pokok, materi]
    }));
  };

  const getTeacherForClass = (faseLabel: string) => {
    const teachers = settings.penandatangan?.guru_kelas || [];
    const classMatch = faseLabel.match(/\d+/);
    const classNum = classMatch ? classMatch[0] : null;
    
    if (classNum) {
      const found = teachers.find((g: any) => {
        const k = g.kelas?.toLowerCase() || "";
        const teacherClassMatch = k.match(/\d+/);
        return teacherClassMatch && teacherClassMatch[0] === classNum;
      });
      if (found) return found;
    }
    
    return { 
      nama: '..........................................', 
      nip: '..........................................', 
      jabatan: 'Guru Kelas', 
      kelas: faseLabel 
    };
  };

  const generateCpTpAtpAnalysis = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nANALISIS CP-TP-ATP\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nTANGGAL: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;
    const identity = `[PAGE_BREAK]\n[IDENTITAS_TABLE]\n`;
    const content = `1. CAPAIAN PEMBELAJARAN (CP)\n${cpItems.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n2. RASIONALITAS CP\nMateri ${materi_pokok[0]} penting untuk perkembangan siswa karena terkait kehidupan sehari-hari dan pembentukan karakter yang mengintegrasikan Moderasi Beragama, Profil Pelajar Pancasila, Deep Learning, dan KBC.\n\n3. TUJUAN PEMBELAJARAN (TP)\n| Elemen | TP | Level | Materi | Indikator |\n|---|---|---|---|---|\n${tpItems.map((t, i) => `| ${i + 1} | ${t} | C${i + 2} | ${materi_pokok[0]} | Siswa dapat ${t.toLowerCase()} |`).join('\n')}\n\n4. ALUR TUJUAN PEMBELAJARAN (ATP)\n| No | Urutan | Materi | Kegiatan | Asesmen |\n|---|---|---|---|---|\n${tpItems.map((t, i) => `| ${i + 1} | ${i === 0 ? 'Awal' : i === 1 ? 'Lanjutan' : 'Penguatan'} | ${materi_pokok[0]} | ${i === 0 ? 'Pemahaman konsep' : i === 1 ? 'Aplikasi praktis' : 'Evaluasi'} | ${i === 0 ? 'Observasi' : i === 1 ? 'Rubrik' : 'Portofolio'} |`).join('\n')}\n\n5. INTEGRASI NILAI\n- Moderasi Beragama: Toleransi perspektif berbeda\n- Profil Pelajar Pancasila: Gotong royong, berpikir kritis\n- Deep Learning: Pemahaman mendalam melalui analisis\n- KBC: Berpikir kritis, kolaborasi, kreativitas\n\n6. ASESMEN\nDiagnostik: Observasi awal\nFormatif: LKPD, tes lisan\nSumatif: Tes tertulis, portofolio`;
    
    return header + identity + content;
  };

  const generateRppDocument = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, pertemuan, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    // Filter Profil Pelajar Pancasila yang relevan dengan materi agama
    const relevantPancasilaProfiles = [
      {
        dimensi: "Beriman, Bertakwa Kepada Tuhan YME & Berakhlak Mulia",
        indikator: "Melaksanakan ibadah, berdoa dengan khusyuk, berakhlak mulia",
        integrasi: "Doa bersama, pembiasaan ibadah, pengamalan nilai agama dalam pembelajaran",
        kbc: "Cinta kepada Allah"
      },
      {
        dimensi: "Bergotong Royong",
        indikator: "Bekerja sama, saling membantu dalam kelompok",
        integrasi: "Diskusi kelompok, proyek bersama, tolong-menolong antar siswa",
        kbc: "Cinta kepada Sesama"
      },
      {
        dimensi: "Berkebinekaan Global",
        indikator: "Menghargai perbedaan, toleransi beragama",
        integrasi: "Dialog tentang keberagaman, moderasi beragama, menghargai keyakinan lain",
        kbc: "Cinta kepada Sesama"
      }
    ];

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nRENCANA PELAKSANAAN PEMBELAJARAN (RPP)\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nMATERI POKOK: ${materi_pokok[0]}\nALOKASI WAKTU: ${alokasi_waktu}\nPERTEMUAN KE: ${pertemuan || '-'}\nTANGGAL: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;

    const identity = `[PAGE_BREAK]\n`;

    const content = `**A. IDENTITAS**\n\n| Aspek | Keterangan |\n|-------|------------|\n| Nama Madrasah | ${schoolName} |\n| Mata Pelajaran | ${mata_pelajaran} |\n| Kelas/Semester | ${fase} / ${semester} |\n| Materi Pokok | ${materi_pokok.join(', ')} |\n| Alokasi Waktu | ${alokasi_waktu} |\n| Pertemuan Ke | ${pertemuan || '-'} |\n| Tahun Pelajaran | ${year} |\n\n**B. TUJUAN PEMBELAJARAN**\n\nTujuan pembelajaran dirumuskan dari CP (Capaian Pembelajaran) Kurikulum Merdeka dengan mengintegrasikan aspek pengetahuan, sikap, dan keterampilan:\n\n${tpItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n**C. PROFIL PELAJAR PANCASILA & INTEGRASI KBC**

| **Dimensi** | **Indikator** | **Integrasi dalam Pembelajaran** | **KBC Terintegrasi** |
|-------------|---------------|----------------------------------|---------------------|
${relevantPancasilaProfiles.map(p => `| **${p.dimensi}** | ${p.indikator} | ${p.integrasi} | ${p.kbc} |`).join('\n')}

**Materi Integrasi KBC:**

Materi ${materi_pokok[0]} diintegrasikan dengan nilai-nilai Cinta sebagai berikut:
1. **Cinta kepada Allah**: Melalui pengenalan konsep ${materi_pokok[0]} sebagai bagian dari ajaran agama dan pelaksanaan ibadah
2. **Cinta kepada Rasul**: Meneladani akhlak dan sunnah Nabi Muhammad SAW yang terkait dengan materi ${materi_pokok[0]}
3. **Cinta kepada Orang Tua**: Menghormati dan mentaati orang tua sebagai manifestasi dari nilai ${materi_pokok[0]}
4. **Cinta kepada Sesama**: Menerapkan toleransi, saling membantu, dan menghargai perbedaan sesuai materi ${materi_pokok[0]}
5. **Cinta kepada Lingkungan**: Menjaga kebersihan dan kelestarian alam sebagai wujud dari nilai ${materi_pokok[0]}
6. **Cinta kepada Ilmu**: Bersemangat belajar dan mencari pengetahuan tentang materi ${materi_pokok[0]} dengan cinta

**Integrasi Nilai Kurikulum Berbasis Cinta (KBC):**\n\n| Aspek Cinta | Penjelasan Integrasi | Contoh Implementasi |\n|-------------|-------------------|---------------------|\n| **Cinta kepada Allah** | Melalui pembiasaan ibadah dan pengamalan ajaran agama | Doa bersama, dzikir, pengingat kewajiban agama |\n| **Cinta kepada Rasul** | Dengan meneladani akhlak dan sunnah Nabi Muhammad SAW | Pembelajaran sirah, praktik sunnah, teladan akhlak |\n| **Cinta kepada Orang Tua** | Melalui penghormatan, ketaatan, dan membantu pekerjaan | Pengingat kewajiban anak, berdoa untuk orang tua |\n| **Cinta kepada Sesama** | Dengan sikap saling menghargai, tolong-menolong, toleransi | Kerja sama kelompok, berbagi, menghargai perbedaan |\n| **Cinta kepada Lingkungan** | Melalui kepedulian kebersihan dan kelestarian alam | Kebersihan kelas, pelestarian lingkungan sekolah |\n| **Cinta kepada Ilmu** | Dengan semangat belajar tinggi dan kecintaan pengetahuan | Motivasi belajar, eksplorasi, diskusi aktif |\n\n**D. KOMPETENSI AWAL**\n\nKemampuan awal siswa yang menjadi prasyarat pembelajaran:\n- Siswa memiliki pengetahuan dasar tentang ${materi_pokok[0]}\n- Siswa mampu mengidentifikasi nilai-nilai moral dalam kehidupan sehari-hari\n- Siswa memiliki motivasi belajar dan kecintaan terhadap ilmu agama\n- Siswa terbiasa dengan pembiasaan ibadah dan akhlak mulia\n\n**E. SARANA DAN PRASARANA**\n\n| Kategori | Sarana/Prasarana |\n|----------|------------------|\n| **Ruang** | Ruang kelas nyaman, mushola, lingkungan sekitar |\n| **Media** | LCD proyektor, laptop, speaker, bahan ajar visual |\n| **Bahan Ajar** | Buku siswa/guru Kurikulum Merdeka, alat tulis, kertas |\n| **Praktikum** | Bahan praktikum sesuai materi, alat peraga edukatif |\n\n**F. MODEL, METODE, DAN PENDEKATAN**\n\n| Aspek | Keterangan |\n|-------|------------|\n| **Model Pembelajaran** | Project Based Learning (PjBL) dengan integrasi nilai cinta |\n| **Metode** | Discovery Learning, Cooperative Learning, Contextual Teaching Learning |\n| **Pendekatan** | Deep Learning melalui eksplorasi mendalam, analisis kritis, refleksi berkelanjutan |\n| **Strategi Berbasis Cinta** | Setiap kegiatan diintegrasikan nilai cinta; pembelajaran aktif berbasis proyek; penguatan karakter melalui refleksi |\n\n**G. LANGKAH-LANGKAH PEMBELAJARAN**\n\n**1. PENDAHULUAN**\n\n| Waktu | Kegiatan | Integrasi Nilai Cinta | Contoh Implementasi |\n|-------|----------|----------------------|-------------------|\n| 5 menit | Salam dan doa bersama | Cinta kepada Allah | "Mari kita mulai dengan doa sebagai wujud cinta kita kepada Allah SWT" |\n| 5 menit | Apersepsi dan motivasi | Cinta kepada Ilmu | "Siapa yang bisa menceritakan pengalaman tentang ${materi_pokok[0]}?" |\n| 3 menit | Penanaman nilai cinta | Cinta kepada Sesama | "Hari ini kita akan belajar saling menghargai pendapat teman" |\n| 2 menit | Penyampaian tujuan | Cinta kepada Ilmu | "Tujuan kita hari ini adalah memahami ${materi_pokok[0]} dengan penuh cinta" |\n\n**2. KEGIATAN INTI**\n\n| Tahap | Waktu | Kegiatan | Integrasi KBC | Pendekatan Deep Learning |\n|-------|-------|----------|---------------|------------------------|\n| **Eksplorasi**(Mengamati/Menanya) | 15 menit | Siswa mengamati contoh penerapan materi, mengajukan pertanyaan, mengumpulkan informasi | Cinta kepada Ilmu (eksplorasi), Cinta kepada Allah (pembiasaan doa) | Mengaktifkan pengetahuan awal, merangsang rasa ingin tahu |\n| **Elaborasi**(Diskusi/Kolaborasi) | 25 menit | Diskusi kelompok tentang implementasi nilai cinta, kerja sama menyelesaikan tugas, berbagi hasil | Cinta kepada Sesama (kolaborasi), Cinta kepada Lingkungan (tugas kontekstual) | Mengkonstruksi pengetahuan melalui interaksi sosial |\n| **Konfirmasi**(Refleksi & Penguatan) | 15 menit | Pembahasan bersama hasil eksplorasi, penguatan nilai cinta, klarifikasi konsep | Cinta kepada Allah (penguatan nilai), Cinta kepada Orang Tua (tindak lanjut rumah) | Mentransfer pengetahuan ke konteks kehidupan |\n\n**3. PENUTUP**\n\n| Waktu | Kegiatan | Integrasi Nilai Cinta | Contoh Implementasi |\n|-------|----------|----------------------|-------------------|\n| 5 menit | Refleksi siswa | Cinta kepada Ilmu | "Apa yang kamu pelajari hari ini? Bagaimana mengamalkannya?" |\n| 3 menit | Kesimpulan materi | Cinta kepada Allah | "Kesimpulannya, ${materi_pokok[0]} mengajarkan kita untuk selalu mencintai Allah" |\n| 3 menit | Penguatan nilai cinta | Cinta kepada Orang Tua | "Di rumah, tunjukkan cinta kepada orang tua dengan membantu pekerjaan" |\n| 4 menit | Doa penutup | Cinta kepada Allah | "Mari kita akhiri dengan doa syukur atas ilmu yang diperoleh" |\n\n**H. ASESMEN**\n\n**1. ASESMEN DIAGNOSTIK**\n\n| Instrumen | Tujuan | Contoh |\n|-----------|--------|--------|\n| Observasi awal | Mengidentifikasi kemampuan awal | Mengamati partisipasi siswa dalam apersepsi |\n| Angket sederhana | Mengetahui pengetahuan dasar | "Sebutkan 3 nilai yang terkandung dalam ${materi_pokok[0]}" |\n\n**2. ASESMEN FORMATIF**\n\n| Instrumen | Teknik Penilaian | Rubrik Sederhana |\n|-----------|------------------|-----------------|\n| LKPD | Checklist | ✓ Lengkap (4), ✓ Cukup (3), ✓ Kurang (2), ✓ Belum (1) |\n| Observasi partisipasi | Skala penilaian | Aktif (4), Cukup aktif (3), Kurang aktif (2), Pasif (1) |\n| Diskusi kelompok | Rubrik | Berkontribusi (4), Mendengarkan (3), Mengganggu (2), Tidak terlibat (1) |\n\n**Rubrik Nilai Cinta:**\n\n| Aspek | 4 (Sangat Baik) | 3 (Baik) | 2 (Cukup) | 1 (Kurang) |\n|-------|------------------|----------|-----------|------------|\n| Cinta Allah | Selalu berdoa | Sering berdoa | Kadang berdoa | Jarang berdoa |\n| Cinta Rasul | Meneladani akhlak | Mengenal sunnah | Tahu sedikit | Tidak mengenal |\n| Cinta Orang Tua | Selalu membantu | Sering membantu | Kadang membantu | Jarang membantu |\n| Cinta Sesama | Selalu tolong-menolong | Sering membantu | Kadang membantu | Egois |\n| Cinta Lingkungan | Selalu menjaga kebersihan | Sering menjaga | Kadang menjaga | Tidak peduli |\n| Cinta Ilmu | Sangat antusias | Antusias | Cukup antusias | Malas belajar |\n\n**3. ASESMEN SUMATIF**\n\n| Instrumen | Bentuk | Contoh Soal |\n|-----------|--------|-------------|\n| Tes tertulis | Pilihan ganda, uraian singkat | "Mengapa kita harus mencintai orang tua? Jelaskan dengan contoh!" |\n| Portofolio | Kumpulan hasil kerja siswa | Jurnal harian penerapan nilai cinta |\n| Penilaian proyek | Presentasi hasil proyek | Presentasi "Nilai Cinta dalam Kehidupan Sehari-hari" |\n\n**I. PENGAYAAN DAN REMEDIAL**\n\n**PENGAYAAN (untuk siswa yang telah mencapai tujuan):**\n- Membuat poster edukasi tentang nilai cinta\n- Proyek mini: "Aku dan Nilai Cinta dalam Kehidupan Sehari-hari"\n- Menjadi tutor bagi teman yang membutuhkan bantuan\n- Membuat video pendek tentang penerapan nilai cinta\n- Mengikuti lomba karya tulis tentang nilai cinta\n\n**REMEDIAL (untuk siswa yang belum mencapai tujuan):**\n- Pengulangan materi dengan metode berbeda (cerita, gambar, permainan)\n- Bimbingan individual atau kelompok kecil\n- Tugas remedial: Membuat jurnal harian tentang penerapan nilai cinta\n- Penggunaan media pembelajaran alternatif (video, audio, gambar)\n- Konsultasi dengan guru atau teman sebaya\n\n**J. REFLEKSI GURU & PESERTA DIDIK**\n\n**REFLEKSI GURU:**\n- Apakah tujuan pembelajaran tercapai sesuai target?\n- Bagaimana implementasi nilai cinta dalam setiap langkah pembelajaran?\n- Metode mana yang paling efektif menumbuhkan cinta ilmu?\n- Apakah Profil Pelajar Pancasila terintegrasi dengan baik?\n- Perbaikan apa yang diperlukan untuk pembelajaran selanjutnya?\n- Bagaimana pengembangan Moderasi Beragama melalui kegiatan ini?\n\n**REFLEKSI PESERTA DIDIK:**\n- Apa yang paling kamu sukai dari pembelajaran hari ini?\n- Nilai cinta mana yang paling mudah kamu terapkan?\n- Bagaimana kamu akan mengamalkan nilai cinta di rumah?\n- Saran untuk membuat pembelajaran lebih menarik?\n- Apa yang sudah kamu lakukan hari ini sebagai wujud cinta?\n\n**CATATAN PENTING:**
- RPP ini dirancang sesuai prinsip efektif, efisien, dan berorientasi siswa
- Fokus utama adalah pengembangan karakter melalui nilai cinta
- Pembelajaran aktif dengan pendekatan deep learning
- Asesmen holistik meliputi kognitif, afektif, dan psikomotorik
- Siap digunakan sebagai acuan pembelajaran di madrasah ibtidaiyah

[PAGE_BREAK]

**LAMPIRAN 1: LEMBAR KERJA PESERTA DIDIK (LKPD)**

---

# LEMBAR KERJA PESERTA DIDIK

| Keterangan | Detail |
|------------|--------|
| **Mata Pelajaran** | ${mata_pelajaran} |
| **Materi** | ${materi_pokok[0]} |
| **Kelas/Fase** | ${fase} |
| **Semester** | ${semester} |
| **Tahun Pelajaran** | ${year} |

---

**Identitas Siswa:**

| Field | Keterangan |
|-------|------------|
| **Nama Siswa** | ___________________________ |
| **NIS** | ___________________________ |
| **Tanggal Pengerjaan** | ___________________________ |

---

## **PETUNJUK KERJA:**

1. Bacalah dengan teliti setiap soal yang diberikan
2. Kerjakan soal-soal berikut dengan penuh cinta ilmu dan keikhlasan
3. Gunakan bahasa yang baik dan benar
4. Jawablah dengan jujur dan sesuai kemampuanmu
5. Perlihatkan nilai cinta dalam setiap jawabanmu

---

## **A. PEMAHAMAN KONSEP**

### 1. Pengertian dan Konsep Dasar
Jelaskan pengertian ${materi_pokok[0]} menurut ajaran Islam:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 2. Nilai-nilai Cinta yang Terkandung
Sebutkan nilai cinta yang dapat dipelajari dari materi ${materi_pokok[0]}:

| No | Aspek Cinta | Contoh Penerapan |
|----|-------------|------------------|
| 1 | Cinta kepada Allah | |
| 2 | Cinta kepada Rasul | |
| 3 | Cinta kepada Orang Tua | |
| 4 | Cinta kepada Sesama | |
| 5 | Cinta kepada Lingkungan | |
| 6 | Cinta kepada Ilmu | |

---

## **B. PENERAPAN DALAM KEHIDUPAN**

### 3. Contoh Penerapan di Rumah
Bagaimana kamu akan menerapkan nilai ${materi_pokok[0]} di rumah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 4. Contoh Penerapan di Sekolah
Bagaimana kamu akan menerapkan nilai ${materi_pokok[0]} di sekolah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 5. Contoh Penerapan di Masyarakat
Bagaimana kamu akan menerapkan nilai ${materi_pokok[0]} di masyarakat?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **C. REFLEKSI DAN NILAI CINTA**

### 6. Refleksi Pembelajaran
Apa yang kamu pelajari dari materi ${materi_pokok[0]}?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 7. Nilai Cinta yang Paling Berkesan
Nilai cinta mana yang paling berkesan bagimu? Mengapa?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 8. Rencana Pengamalan
Bagaimana kamu akan mengamalkan nilai cinta tersebut dalam kehidupan sehari-hari?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **D. KREATIVITAS DAN EKSPRESI**

### 9. Ekspresi Kreatif
Buatlah gambar, poster, atau simbol yang menunjukkan penerapan nilai cinta dari materi ${materi_pokok[0]}:

**[Ruang Gambar/Karya Seni - 15x20 cm]**

### 10. Pesan untuk Teman
Tuliskan pesan untuk teman-temanmu tentang pentingnya nilai cinta dalam kehidupan:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

**PENILAIAN LKPD**

| Aspek | Kriteria | Skor | Keterangan |
|-------|----------|------|------------|
| **Pemahaman Konsep** | Jawaban lengkap, benar, dan sesuai | _____/20 | |
| **Penerapan** | Contoh konkret dan relevan | _____/30 | |
| **Refleksi** | Jawaban mendalam dan jujur | _____/20 | |
| **Kreativitas** | Ekspresi orisinal dan menarik | _____/20 | |
| **Nilai Cinta** | Terlihat dalam setiap jawaban | _____/10 | |
| **TOTAL** | | _____/100 | |

**Skor Akhir:** _________  
**Nilai Huruf:** _________  
**Keterangan Guru:** __________________________________________

[PAGE_BREAK]

**LAMPIRAN 2: KUNCI JAWABAN (UNTUK GURU)**

## **A. PEMAHAMAN KONSEP**

### 1. Pengertian dan Konsep Dasar
Jawaban bervariasi sesuai pemahaman siswa tentang ${materi_pokok[0]}

### 2. Nilai-nilai Cinta yang Terkandung
| No | Aspek Cinta | Contoh Penerapan |
|----|-------------|------------------|
| 1 | Cinta kepada Allah | Melaksanakan ibadah, berdoa, dzikir |
| 2 | Cinta kepada Rasul | Meneladani akhlak, mengikuti sunnah |
| 3 | Cinta kepada Orang Tua | Hormat, taat, membantu pekerjaan |
| 4 | Cinta kepada Sesama | Tolong-menolong, toleransi |
| 5 | Cinta kepada Lingkungan | Menjaga kebersihan, melestarikan alam |
| 6 | Cinta kepada Ilmu | Semangat belajar, mencari pengetahuan |

## **B. PENERAPAN DALAM KEHIDUPAN**

Jawaban bervariasi sesuai pengalaman dan pemahaman siswa

## **C. REFLEKSI DAN NILAI CINTA**

Jawaban dinilai berdasarkan kejujuran dan kedalaman refleksi

---

**RUBRIK PENILAIAN:**

| Skor | Kriteria |
|------|----------|
| 90-100 | Jawaban sangat lengkap, benar, kreatif, dan menunjukkan nilai cinta |
| 80-89 | Jawaban lengkap, benar, dan cukup kreatif |
| 70-79 | Jawaban cukup lengkap dan cukup benar |
| 60-69 | Jawaban kurang lengkap dan kurang benar |
| <60 | Jawaban tidak lengkap dan tidak benar |
`;

    return header + identity + content;
  };

  const generateModulAjarDocument = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, pertemuan, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nMODUL AJAR KURIKULUM MERDEKA\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nMATERI: ${materi_pokok[0]}\nALOKASI WAKTU: ${alokasi_waktu}\nPERTEMUAN: ${pertemuan || '-'}\nTANGGAL: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;

    // Filter Profil Pelajar Pancasila yang relevan dengan materi agama
    const relevantPancasilaProfiles = [
      {
        dimensi: "Beriman, Bertakwa Kepada Tuhan YME & Berakhlak Mulia",
        indikator: "Melaksanakan ibadah, berdoa dengan khusyuk, berakhlak mulia",
        integrasi: "Doa bersama, pembiasaan ibadah, pengamalan nilai agama dalam pembelajaran",
        kbc: "Cinta kepada Allah"
      },
      {
        dimensi: "Bergotong Royong",
        indikator: "Bekerja sama, saling membantu dalam kelompok",
        integrasi: "Diskusi kelompok, proyek bersama, tolong-menolong antar siswa",
        kbc: "Cinta kepada Sesama"
      },
      {
        dimensi: "Berkebinekaan Global",
        indikator: "Menghargai perbedaan, toleransi beragama",
        integrasi: "Dialog tentang keberagaman, moderasi beragama, menghargai keyakinan lain",
        kbc: "Cinta kepada Sesama"
      }
    ];

    // Filter Moderasi Beragama yang relevan dengan materi
    const relevantModerasiBeragama = [
      {
        prinsip: "Toleransi",
        implementasi: "Diskusi tentang perbedaan pandangan dalam agama, menghargai keyakinan orang lain",
        tujuan: "Membentuk sikap saling menghormati dan hidup harmonis",
        kbc: "Cinta kepada Sesama"
      },
      {
        prinsip: "Akhlak Mulia",
        implementasi: "Pengamalan nilai-nilai universal (jujur, disiplin, tanggung jawab) dalam kehidupan sehari-hari",
        tujuan: "Membentuk karakter yang baik sesuai ajaran agama",
        kbc: "Cinta kepada Allah, Rasul, Orang Tua"
      },
      {
        prinsip: "Inklusivitas",
        implementasi: "Pembelajaran yang mencakup semua siswa tanpa membedakan latar belakang",
        tujuan: "Membentuk masyarakat yang inklusif dan peduli",
        kbc: "Cinta kepada Sesama"
      }
    ];

    const content = `**A. IDENTITAS MODUL AJAR**

| Kategori | Informasi | Keterangan |
|---|---|---|
| Satuan Pendidikan | ${schoolName} | Madrasah |
| Nama Yayasan | ${yayasan} | - |
| Mata Pelajaran | ${mata_pelajaran} | PAI |
| Fase/Kelas | ${fase} | Sesuai KM |
| Semester | ${semester} | ${semester === 'Ganjil' ? 'Jan-Jun' : 'Jul-Des'} |
| Materi Pokok | ${materi_pokok[0]} | Topik Utama |
| Alokasi Waktu | ${alokasi_waktu} | Total JP |
| Pertemuan | ${pertemuan || '-'} | Ke-N |
| Tahun Pelajaran | ${year} | Periode |
| Tanggal Pembuatan | ${tanggal_cetak} | Tgl Cetak |
| Penyusun | ${teacher.nama} | Guru |
| NIP | ${teacher.nip} | NUPTK/NIP |

**B. CAPAIAN PEMBELAJARAN (CP)**

${cpItems.map((cp, i) => `${i + 1}. ${cp}`).join('\n')}

**C. TUJUAN PEMBELAJARAN (TP)**

${tpItems.map((tp, i) => `${i + 1}. ${tp}`).join('\n')}

**D. KOMPETENSI AWAL PESERTA DIDIK**

Pengetahuan/Prasyarat Siswa:
- Siswa telah memahami konsep dasar ${materi_pokok[0]} sebagai bagian dari ajaran agama Islam
- Siswa memiliki pengetahuan tentang nilai-nilai moral dan etika dalam kehidupan sehari-hari
- Siswa mampu mengidentifikasi contoh penerapan nilai cinta dalam kehidupan
- Siswa memiliki pengalaman kolaborasi dan diskusi kelompok

**E. PROFIL PELAJAR PANCASILA (Yang Relevan dengan Materi)**

| **Dimensi** | **Indikator** | **Integrasi dalam Pembelajaran** | **KBC Terintegrasi** |
|-------------|---------------|----------------------------------|---------------------|
${relevantPancasilaProfiles.map(p => `| **${p.dimensi}** | ${p.indikator} | ${p.integrasi} | ${p.kbc} |`).join('\n')}

**F. MODERASI BERAGAMA (Yang Relevan dengan Materi)**

| **Prinsip** | **Implementasi dalam Pembelajaran** | **Tujuan** | **KBC Terintegrasi** |
|-------------|-------------------------------------|------------|---------------------|
${relevantModerasiBeragama.map(m => `| **${m.prinsip}** | ${m.implementasi} | ${m.tujuan} | ${m.kbc} |`).join('\n')}

**G. KETERAMPILAN ABAD KE-21**

| Keterampilan | Indikator | Strategi Pengembangan |
|-------------|-----------|----------------------|
| **Berpikir Kritis** | Menganalisis, mengevaluasi informasi | Diskusi kritis, analisis kasus, problem solving |
| **Kreativitas** | Berinovasi, menghasilkan ide baru | Proyek kreatif, brainstorming, pembuatan produk |
| **Komunikasi** | Menyampaikan ide dengan jelas & efektif | Presentasi, diskusi kelas, berbagi hasil kerja |
| **Kolaborasi** | Bekerja sama dalam tim | Proyek kelompok, diskusi, peer teaching |
| **Literasi Digital** | Menggunakan teknologi informasi | E-learning, digital tools, video edukasi |

**H. KURIKULUM BERBASIS CINTA (KBC) - INTEGRASI UTAMA**

| **Aspek Cinta** | **Nilai yang Dikembangkan** | **Implementasi Konkret** | **Indikator Pencapaian** |
|-----------------|----------------------------|--------------------------|-------------------------|
| **Cinta kepada Allah** | Iman dan ketakwaan, pengamalan ibadah | Pembiasaan ibadah 5 waktu, doa bersama, dzikir | Siswa aktif melaksanakan ibadah dengan ikhlas |
| **Cinta kepada Rasul** | Meneladani akhlak Nabi, sunnah | Pembelajaran sirah Nabi, praktik sunnah | Siswa meneladani perilaku Rasulullah SAW |
| **Cinta kepada Orang Tua** | Hormat dan taat, membantu pekerjaan rumah | Pengingat kewajiban anak, berdoa untuk orang tua | Siswa menunjukkan sikap hormat kepada orang tua |
| **Cinta kepada Sesama** | Toleransi, tolong-menolong, solidaritas | Kerja sama kelompok, menghargai perbedaan | Siswa aktif membantu teman dan menghargai orang lain |
| **Cinta kepada Lingkungan** | Kepedulian alam, kebersihan | Menjaga kebersihan kelas, pelestarian lingkungan | Siswa menjaga kebersihan dan kelestarian alam |
| **Cinta kepada Ilmu** | Semangat belajar, kecintaan pengetahuan | Motivasi tinggi, eksplorasi pengetahuan | Siswa aktif bertanya dan belajar dengan semangat |

**I. PEMAHAMAN BERMAKNA**

Melalui pembelajaran ini, siswa akan memahami bahwa ${materi_pokok[0]} bukan hanya sebagai pengetahuan agama, tetapi juga sebagai panduan hidup yang penuh cinta. Siswa akan mampu mengimplementasikan nilai-nilai cinta dalam kehidupan sehari-hari, sehingga terbentuk karakter yang berakhlak mulia sesuai Profil Pelajar Pancasila.

**J. PERTANYAAN PEMANTIK**

1. Bagaimana kita menunjukkan cinta kepada Allah dalam kehidupan sehari-hari?
2. Apa contoh cinta kepada Rasul yang bisa kita teladani dari ${materi_pokok[0]}?
3. Bagaimana cara kita mencintai orang tua melalui pengamalan nilai-nilai agama?
4. Mengapa penting mencintai sesama dan lingkungan dalam ajaran Islam?
5. Bagaimana cinta kepada ilmu dapat membawa kita lebih dekat kepada Allah?

**K. SARANA DAN PRASARANA**

| Jenis | Keterangan | Ketersediaan |
|-------|-----------|--------------|
| **Ruang Belajar** | Ruang kelas, mushola, ruang terbuka | Tersedia |
| **Media Pembelajaran** | LCD, laptop, speaker, whiteboard | Tersedia |
| **Bahan Ajar** | Buku siswa, buku guru, modul, LKPD | Lengkap |
| **Alat Peraga** | Alat peraga ${materi_pokok[0]}, alat praktik | Tersedia |
| **Buku Referensi** | Kitab Suci, buku penunjang | Lengkap |

**L. LANGKAH-LANGKAH PEMBELAJARAN**

### Tabel Rancangan Kegiatan Pembelajaran Terintegrasi

| No | Tahap | Waktu | Kegiatan Pembelajaran | Integrasi Nilai Cinta | Alat & Media | Tujuan |
|----|-------|-------|----------------------|----------------------|-------------|--------|
| 1 | **Pendahuluan** | 10-15 menit | • Doa bersama • Apersepsi tentang value cinta • Motivasi tentang pentingnya cinta ilmu • Penyampaian tujuan pembelajaran | • Cinta kepada Allah (doa) • Cinta kepada Ilmu (motivasi) • Cinta kepada Sesama (penguatan) | Video/Gambar motivasi | Menciptakan suasana pembelajaran yang positif |
| 2 | **Inti - Eksplorasi** | 15 menit | • Siswa mengeksplorasi materi ${materi_pokok[0]} secara mandiri • Pengamatan contoh-contoh penerapan • Mengajukan pertanyaan awal | Cinta kepada Ilmu | Buku, Sumber Daya Alam | Memunculkan rasa penasaran & kecintaan ilmu |
| 3 | **Inti - Kolaborasi** | 20 menit | • Diskusi kelompok tentang implementasi nilai cinta • Sharing pengalaman pribadi • Membuat brainstorm solusi | Cinta kepada Sesama & Lingkungan | Mind map, Flipchart | Mengembangkan kolaborasi & berpikir kritis |
| 4 | **Inti - Refleksi** | 15 menit | • Siswa merefleksikan penerapan di kehidupan • Menulis jurnal pembelajaran • Menyiapkan presentasi | Cinta kepada Allah, Orang Tua, Ilmu | Jurnal, Buku Tulis | Memperdalam pemahaman & koneksi emosional |
| 5 | **Penutup** | 10-15 menit | • Presentasi hasil kerja kelompok • Refleksi bersama (guru & siswa) • Penguatan nilai cinta • Doa penutup • Penugasan tindak lanjut | Cinta kepada Allah, Sesama, Orang Tua, Ilmu | Video/Musik islami | Memperkuat pemahaman & motivasi berkelanjutan |

**M. PENILAIAN**

### 1. Penilaian SIKAP (Afektif)

| Aspek | Teknik Penilaian | Instrumen | Rubrik Penilaian |
|-------|-----------------|-----------|-----------------|
| **Akhlak & Karakter (Nilai Cinta)** | Observasi Berkelanjutan | Jurnal Guru & Lembar Observasi | **SB (4):** Menunjukkan seluruh nilai cinta dengan konsisten • **B (3):** Menunjukkan sebagian besar nilai cinta • **C (2):** Menunjukkan beberapa nilai cinta • **K (1):** Belum menunjukkan nilai cinta |

### 2. Penilaian PENGETAHUAN (Kognitif)

| Aspek | Teknik Penilaian | Instrumen | Rubrik Penilaian |
|-------|-----------------|-----------|-----------------|
| **Pemahaman Konsep & TP** | Tes Tertulis | Soal Uraian & Pilihan Ganda | **SB (4):** Pemahaman sangat mendalam & sempurna • **B (3):** Pemahaman jelas & tepat • **C (2):** Pemahaman dasar & terbatas • **K (1):** Pemahaman sangat terbatas |

### 3. Penilaian KETERAMPILAN (Psikomotor)

| Aspek | Teknik Penilaian | Instrumen | Rubrik Penilaian |
|-------|-----------------|-----------|-----------------|
| **Praktik & Proyek** | Unjuk Kerja | Rubrik Proyek & Portofolio | **SB (4):** Hasil karya sangat baik, proses rapi & kreatif • **B (3):** Hasil karya baik, proses cukup baik • **C (2):** Hasil karya cukup, proses ada kekurangan • **K (1):** Hasil karya kurang, proses tidak optimal |

### Skala Penilaian 4 Level

| Level | Deskripsi | Nilai | Bobot |
|-------|-----------|-------|-------|
| **SB (Sangat Baik)** | Pencapaian sempurna, pemahaman mendalam, inisiatif tinggi, kreativitas luar biasa | 4 | 90-100 |
| **B (Baik)** | Pencapaian baik, pemahaman cukup, partisipasi aktif | 3 | 80-89 |
| **C (Cukup)** | Pencapaian dasar, pemahaman terbatas, partisipasi minimal | 2 | 70-79 |
| **K (Kurang)** | Belum mencapai target, pemahaman sangat terbatas, pasif | 1 | 0-69 |

**N. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)**

| No | TP | Indikator Pencapaian | Teknik Penilaian | Kriteria Ketercapaian |
|----|----|--------------------|---|---|
${tpItems.map((tp, i) => `| ${i + 1} | ${tp} | Siswa mampu ${tp.toLowerCase().replace(/^siswa mampu /, '')} dengan benar dan menerapkannya | Tes & Observasi | SB/B mencapai ≥75% sesuai rubrik |`).join('\n')}

**O. PROGRAM TINDAK LANJUT**

### Remedial (Bagi Siswa dengan Skor < 70)

**Strategi:**
- Pembelajaran ulang dengan metode berbeda (cerita, gambar, permainan, demonstrasi)
- Bimbingan individual atau kelompok kecil (max 5 siswa)
- Tugas remedial yang lebih sederhana & kontekstual
- Kolaborasi dengan orang tua untuk pendampingan di rumah
- Penggunaan media pembelajaran yang lebih menarik (video, animasi)

**Waktu:** Setelah penilaian formatif/sumatif
**Kriteria Tuntas:** Skor ≥ 70 pada tes ulang

### Pengayaan (Bagi Siswa dengan Skor ≥ 80)

**Strategi:**
- Tugas yang lebih kompleks & menantang (analisis kasus, studi komparasi)
- Proyek penelitian atau investigasi yang lebih mendalam tentang penerapan nilai cinta
- Menjadi tutor bagi teman sebaya atau kelompok pendamping
- Pengembangan kreativitas melalui pembuatan produk inovatif (poster, video, komik)
- Partisipasi dalam kegiatan ekstrakurikuler atau kompetisi

**Waktu:** Setelah penilaian formatif/sumatif
**Kriteria:** Skor ≥ 80

**P. REFLEKSI GURU DAN PESERTA DIDIK**

### Refleksi untuk Guru:
- Apakah tujuan pembelajaran tercapai sesuai target? Apa hambatannya?
- Bagaimana efektivitas penerapan nilai cinta dalam pembelajaran?
- Metode/media mana yang paling efektif menumbuhkan cinta ilmu?
- Apakah semua siswa terlibat aktif? Siapa yang perlu perhatian khusus?
- Perbaikan apa yang diperlukan untuk pembelajaran selanjutnya?
- Bagaimana pengembangan Profil Pelajar Pancasila melalui kegiatan ini?
- Apakah integrasi keterampilan abad ke-21 sudah optimal?

### Refleksi untuk Peserta Didik:
- Apa yang paling aku sukai dari pembelajaran hari ini?
- Bagian mana yang masih membingungkan?
- Nilai cinta mana yang paling mudah aku terapkan?
- Bagaimana aku akan mengamalkan pembelajaran ini di rumah?
- Saran apa untuk membuat pembelajaran lebih menarik?

---

**CATATAN PENTING:**
- Modul Ajar ini disusun sesuai Kurikulum Merdeka Madrasah Ibtidaiyah
- Fokus pada pengembangan karakter & nilai-nilai islami
- Integrasi Profil Pelajar Pancasila, Moderasi Beragama, dan Keterampilan Abad ke-21
- Pembelajaran aktif dengan pendekatan berbasis proyek dan nilai-nilai cinta
- Asesmen holistik meliputi sikap, pengetahuan, dan keterampilan
- Siap digunakan sebagai panduan pembelajaran yang komprehensif dan terukur

[PAGE_BREAK]

# LAMPIRAN 1: LEMBAR KERJA PESERTA DIDIK (LKPD)

**LEMBAR KERJA PESERTA DIDIK**  
**Mata Pelajaran: ${mata_pelajaran}**  
**Materi: ${materi_pokok[0]}**  
**Kelas/Fase: ${fase}**  
**Semester: ${semester}**  
**Tahun Pelajaran: ${year}**

**Nama Siswa:** ___________________________  
**NIS:** ___________________________  
**Tanggal Pengerjaan:** ___________________________

---

## **PETUNJUK KERJA:**

1. Bacalah dengan teliti setiap soal yang diberikan
2. Kerjakan soal-soal berikut dengan penuh cinta ilmu dan keikhlasan
3. Gunakan bahasa yang baik dan benar
4. Jawablah dengan jujur dan sesuai kemampuanmu
5. Perlihatkan nilai cinta dalam setiap jawabanmu

---

## **A. PEMAHAMAN KONSEP**

### 1. Pengertian dan Konsep Dasar
Jelaskan pengertian ${materi_pokok[0]} menurut ajaran Islam:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 2. Nilai-nilai Cinta yang Terkandung
Sebutkan nilai cinta yang dapat dipelajari dari materi ${materi_pokok[0]}:

| No | Aspek Cinta | Contoh Penerapan |
|----|-------------|------------------|
| 1 | Cinta kepada Allah | |
| 2 | Cinta kepada Rasul | |
| 3 | Cinta kepada Orang Tua | |
| 4 | Cinta kepada Sesama | |
| 5 | Cinta kepada Lingkungan | |
| 6 | Cinta kepada Ilmu | |

---

## **B. PENERAPAN DALAM KEHIDUPAN**

### 3. Contoh Penerapan di Rumah
Bagaimana kamu akan menerapkan nilai ${materi_pokok[0]} di rumah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 4. Contoh Penerapan di Sekolah
Bagaimana kamu akan menerapkan nilai ${materi_pokok[0]} di sekolah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 5. Contoh Penerapan di Masyarakat
Bagaimana kamu akan menerapkan nilai ${materi_pokok[0]} di masyarakat?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **C. REFLEKSI DAN NILAI CINTA**

### 6. Refleksi Pembelajaran
Apa yang kamu pelajari dari materi ${materi_pokok[0]}?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 7. Nilai Cinta yang Paling Berkesan
Nilai cinta mana yang paling berkesan bagimu? Mengapa?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 8. Rencana Pengamalan
Bagaimana kamu akan mengamalkan nilai cinta tersebut dalam kehidupan sehari-hari?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **D. KREATIVITAS DAN EKSPRESI**

### 9. Ekspresi Kreatif
Buatlah gambar, poster, atau simbol yang menunjukkan penerapan nilai cinta dari materi ${materi_pokok[0]}:

**[Ruang Gambar/Karya Seni - 15x20 cm]**

### 10. Pesan untuk Teman
Tuliskan pesan untuk teman-temanmu tentang pentingnya nilai cinta dalam kehidupan:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

**PENILAIAN LKPD**

| Aspek | Kriteria | Skor | Keterangan |
|-------|----------|------|------------|
| **Pemahaman Konsep** | Jawaban lengkap, benar, dan sesuai | _____/20 | |
| **Penerapan** | Contoh konkret dan relevan | _____/30 | |
| **Refleksi** | Jawaban mendalam dan jujur | _____/20 | |
| **Kreativitas** | Ekspresi orisinal dan menarik | _____/20 | |
| **Nilai Cinta** | Terlihat dalam setiap jawaban | _____/10 | |
| **TOTAL** | | _____/100 | |

**Skor: _________**  
**Nilai: _________**  
**Keterangan Guru:** __________________________________________

[PAGE_BREAK]

# LAMPIRAN 2: SOAL PENILAIAN FORMATIF & SUMATIF

**SOAL PENILAIAN**  
**Mata Pelajaran: ${mata_pelajaran}**  
**Materi: ${materi_pokok[0]}**  
**Kelas/Fase: ${fase}**  
**Semester: ${semester}**  
**Tahun Pelajaran: ${year}**

**Nama Siswa:** ___________________________  
**NIS:** ___________________________  
**Tanggal:** ___________________________

---

## **PETUNJUK PENGERJAAN:**

1. Bacalah soal dengan teliti sebelum menjawab
2. Kerjakan soal dengan penuh cinta ilmu dan keikhlasan
3. Gunakan bahasa yang baik dan benar
4. Perlihatkan nilai cinta dalam setiap jawaban
5. Waktu pengerjaan: 60 menit

---

## **A. SOAL PILIHAN GANDA (20 poin)**

Pilihlah jawaban yang paling benar dengan memberikan tanda silang (X) pada huruf jawaban yang dipilih!

### 1. Nilai cinta yang paling mendasar dalam ajaran Islam adalah...
a) Cinta kepada kekayaan dan kemewahan  
b) Cinta kepada Allah SWT sebagai pencipta  
c) Cinta kepada teman dan kesenangan dunia  
d) Cinta kepada diri sendiri saja

### 2. Salah satu bentuk cinta kepada Rasul adalah...
a) Mengikuti sunnah dan meneladani akhlak beliau  
b) Hanya membaca sirah Nabi tanpa mengamalkan  
c) Mengutamakan kesenangan dunia daripada ibadah  
d) Melupakan ajaran-ajaran Nabi dalam kehidupan

### 3. Cinta kepada orang tua dalam Islam ditunjukkan dengan...
a) Memberikan uang saja tanpa perhatian  
b) Menghormati, menaati, dan mendoakan orang tua  
c) Mengabaikan nasihat orang tua  
d) Hanya mencintai orang tua saat dibutuhkan

### 4. Nilai cinta kepada sesama yang sesuai ajaran Islam adalah...
a) Membantu orang lain dengan ikhlas  
b) Membantu hanya untuk mendapatkan imbalan  
c) Tidak peduli dengan kesulitan orang lain  
d) Membantu hanya keluarga dekat saja

### 5. Cinta kepada lingkungan ditunjukkan dengan...
a) Membuang sampah sembarangan  
b) Merawat kebersihan dan kelestarian alam  
c) Mengambil milik orang lain  
d) Tidak peduli dengan kerusakan lingkungan

---

## **B. SOAL ISIAN SINGKAT (20 poin)**

Jawablah pertanyaan berikut dengan singkat dan jelas!

### 6. Sebutkan 3 cara menunjukkan cinta kepada Allah dalam kehidupan sehari-hari!
   1. ________________________________________________________________  
   2. ________________________________________________________________  
   3. ________________________________________________________________  

### 7. Apa saja nilai cinta yang terkandung dalam materi ${materi_pokok[0]}?
   ________________________________________________________________________  
   ________________________________________________________________________  

### 8. Bagaimana cara kita menghormati orang tua sesuai ajaran Islam?
   ________________________________________________________________________  
   ________________________________________________________________________  

### 9. Mengapa penting mencintai sesama dalam kehidupan bermasyarakat?
   ________________________________________________________________________  
   ________________________________________________________________________  

### 10. Sebutkan 2 contoh penerapan cinta kepada lingkungan di sekolah!
    1. ________________________________________________________________  
    2. ________________________________________________________________  

---

## **C. SOAL URAIAN (40 poin)**

Jawablah pertanyaan berikut dengan lengkap dan jelas! Perlihatkan nilai cinta dalam jawabanmu.

### 11. Jelaskan pengertian ${materi_pokok[0]} menurut ajaran Islam dan berikan contoh penerapannya dalam kehidupan sehari-hari!

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

### 12. Bagaimana nilai cinta kepada Rasul dapat membimbing kita menjadi manusia yang lebih baik? Berikan contoh konkret!

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

### 13. Analisislah bagaimana materi ${materi_pokok[0]} mengajarkan kita untuk mencintai sesama dan lingkungan! Berikan contoh penerapan di 3 tempat berbeda (rumah, sekolah, masyarakat)!

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

### 14. Buatlah refleksi pribadi tentang pentingnya nilai cinta dalam kehidupanmu! Bagaimana kamu akan mengamalkannya setelah mempelajari materi ini?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

---

## **D. SOAL PRAKTIK/KREATIVITAS (20 poin)**

### 15. Buatlah sebuah karya kreatif (gambar, puisi, atau cerita pendek) yang menunjukkan penerapan nilai cinta dari materi ${materi_pokok[0]}!

**[Ruang Karya - Gunakan kertas terpisah jika diperlukan]**

**Deskripsi Karya:** ______________________________________________  
________________________________________________________________________  
________________________________________________________________________  

---

## **E. PENILAIAN SOAL**

| Komponen | Aspek | Bobot | Skor | Keterangan |
|----------|-------|-------|------|------------|
| **Pilihan Ganda** | Ketepatan jawaban | 20 | _____/20 | |
| **Isian Singkat** | Kelengkapan & ketepatan | 20 | _____/20 | |
| **Uraian** | Kedalaman analisis & nilai cinta | 40 | _____/40 | |
| **Praktik/Kreativitas** | Orisinalitas & nilai cinta | 20 | _____/20 | |
| **TOTAL** | | **100** | _____/100 | |

**Skor Akhir: _________**  
**Nilai Huruf: _________**  
**Predikat: _________**

**Keterangan Guru:**  
________________________________________________________________________  
________________________________________________________________________  

---

## **F. KUNCI JAWABAN (UNTUK GURU)**

### Pilihan Ganda:
1. b) Cinta kepada Allah SWT sebagai pencipta  
2. a) Mengikuti sunnah dan meneladani akhlak beliau  
3. b) Menghormati, menaati, dan mendoakan orang tua  
4. a) Membantu orang lain dengan ikhlas  
5. b) Merawat kebersihan dan kelestarian alam  

### Isian Singkat:
6. Jawaban bervariasi: sholat tepat waktu, dzikir, membaca Al-Quran, dll.  
7. Cinta kepada Allah, Rasul, Orang Tua, Sesama, Lingkungan, Ilmu  
8. Menghormati, menaati perintah, mendoakan, membantu pekerjaan rumah  
9. Menciptakan harmoni sosial, membangun solidaritas, mengurangi konflik  
10. Menjaga kebersihan kelas, merawat tanaman, mengurangi sampah plastik

### Uraian:
Jawaban dinilai berdasarkan:  
- Pemahaman konsep yang benar  
- Contoh penerapan yang konkret  
- Terlihat nilai cinta dalam jawaban  
- Analisis yang mendalam dan logis  
- Bahasa yang baik dan benar

[PAGE_BREAK]

# LAMPIRAN 3: RUBRIK PENILAIAN LENGKAP

**RUBRIK PENILAIAN HOLISTIK**  
**Mata Pelajaran: ${mata_pelajaran}**  
**Materi: ${materi_pokok[0]}**

---

## **A. RUBRIK PENILAIAN SIKAP (Afektif)**

| Aspek Penilaian | **SB (4)** | **B (3)** | **C (2)** | **K (1)** |
|-----------------|------------|-----------|-----------|-----------|
| **Akhlak Mulia** | Selalu menunjukkan akhlak mulia, menjadi teladan | Sering menunjukkan akhlak mulia | Kadang menunjukkan akhlak mulia | Jarang menunjukkan akhlak mulia |
| **Cinta kepada Allah** | Aktif dalam ibadah, doa khusyuk | Cukup aktif dalam ibadah | Kurang aktif dalam ibadah | Pasif dalam ibadah |
| **Cinta kepada Rasul** | Meneladani akhlak Nabi | Mencoba meneladani | Kurang meneladani | Tidak meneladani |
| **Cinta kepada Orang Tua** | Sangat hormat & taat | Cukup hormat | Kurang hormat | Tidak hormat |
| **Cinta kepada Sesama** | Saling membantu, toleran | Cukup membantu | Kurang membantu | Egois |
| **Cinta kepada Lingkungan** | Sangat peduli kebersihan | Cukup peduli | Kurang peduli | Tidak peduli |
| **Cinta kepada Ilmu** | Sangat antusias belajar | Cukup antusias | Kurang antusias | Malas belajar |

---

## **B. RUBRIK PENILAIAN PENGETAHUAN (Kognitif)**

| Aspek Penilaian | **SB (4)** | **B (3)** | **C (2)** | **K (1)** |
|-----------------|------------|-----------|-----------|-----------|
| **Pemahaman Konsep** | Sangat mendalam & akurat | Cukup mendalam | Dasar saja | Salah/kurang |
| **Aplikasi Konsep** | Dapat menerapkan dengan benar | Dapat menerapkan sebagian | Sulit menerapkan | Tidak dapat menerapkan |
| **Analisis** | Analisis sangat baik | Analisis cukup baik | Analisis dasar | Tidak dapat menganalisis |
| **Evaluasi** | Dapat mengevaluasi dengan baik | Cukup dapat mengevaluasi | Sulit mengevaluasi | Tidak dapat mengevaluasi |

---

## **C. RUBRIK PENILAIAN KETERAMPILAN (Psikomotor)**

| Aspek Penilaian | **SB (4)** | **B (3)** | **C (2)** | **K (1)** |
|-----------------|------------|-----------|-----------|-----------|
| **Praktik Ibadah** | Sangat lancar & khusyuk | Cukup lancar | Kurang lancar | Tidak lancar |
| **Keterampilan Sosial** | Sangat baik dalam berkomunikasi | Cukup baik | Kurang baik | Buruk |
| **Keterampilan Motorik** | Sangat terampil | Cukup terampil | Kurang terampil | Tidak terampil |
| **Kreativitas** | Sangat kreatif & orisinal | Cukup kreatif | Kurang kreatif | Tidak kreatif |

---

## **D. KONVERSI NILAI**

| Rentang Skor | Nilai Huruf | Predikat | Keterangan |
|--------------|-------------|----------|------------|
| 90-100 | A | SB (Sangat Baik) | Luar biasa, melebihi harapan |
| 80-89 | B | B (Baik) | Baik, sesuai harapan |
| 70-79 | C | C (Cukup) | Cukup, perlu perbaikan |
| 60-69 | D | K (Kurang) | Kurang, perlu bantuan |
| 0-59 | E | K (Kurang) | Sangat kurang, remedial intensif |

---

## **E. KRITERIA KETUNTASAN MINIMAL (KKM)**

**KKM Mata Pelajaran ${mata_pelajaran}: 75**

| Aspek | KKM | Indikator Ketuntasan |
|-------|-----|---------------------|
| **Sikap** | 75 | Menunjukkan nilai cinta dalam kehidupan sehari-hari |
| **Pengetahuan** | 75 | Memahami konsep ${materi_pokok[0]} dengan benar |
| **Keterampilan** | 75 | Dapat menerapkan nilai cinta dalam praktik |

**Keterangan:**  
- Siswa dinyatakan **TUNTAS** jika mencapai KKM pada semua aspek  
- Siswa yang belum tuntas mendapatkan **REMEDIAL**  
- Siswa yang sudah tuntas dapat mengikuti **PENGAJAAN**`;

    return header + '\n[PAGE_BREAK]\n' + content;
  };

  const generateJurnalMengajarDocument = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nJURNAL MENGAJAR HARIAN\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nTANGGAL: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;

    const identity = `[PAGE_BREAK]\n[JURNAL_TABLE]\n`;

    const content = `**JURNAL MENGAJAR HARIAN - ${mata_pelajaran.toUpperCase()}**\n**Kelas/Fase: ${fase} | Semester: ${semester} | Tahun: ${year}**\n**Guru: ${teacher.nama}**\n\n**PETUNJUK PENGISIAN:**\n- Diisi setiap hari setelah selesai mengajar\n- Gunakan bahasa singkat dan jelas\n- Fokus pada kegiatan nyata dan refleksi\n- Integrasi KBC, Profil Pancasila, dan Moderasi Beragama wajib dicatat\n\n**TABEL JURNAL MENGAJAR HARIAN**\n\n| Hari/Tanggal | Materi | Kegiatan Pembelajaran | Integrasi KBC | Profil Pelajar Pancasila | Kehadiran | Asesmen | Refleksi Guru | Tindak Lanjut |\n|-------------|--------|----------------------|---------------|--------------------------|-----------|---------|--------------|--------------|\n| ${tanggal_cetak} | ${materi_pokok.join(', ')} | **Pendahuluan:** Doa bersama, apersepsi tentang ${materi_pokok[0]}, motivasi belajar**Inti:** Eksplorasi konsep ${materi_pokok[0]}, diskusi kelompok, praktik penerapan**Penutup:** Refleksi siswa, penguatan nilai cinta, doa penutup | **Cinta Allah:** Doa bersama sebagai wujud cinta**Cinta Rasul:** Meneladani akhlak Nabi dalam perilaku**Cinta Orang Tua:** Pengingat kewajiban anak**Cinta Sesama:** Kerja sama dalam kelompok**Cinta Lingkungan:** Kebersihan kelas**Cinta Ilmu:** Semangat eksplorasi siswa | Beriman (doa bersama), Bergotong royong (kerja kelompok), Berkebinekaan (toleransi), Mandiri (eksplorasi), Bernalar kritis (diskusi), Kreatif (praktik) | **Hadir:** 25 siswa**Tidak Hadir:** 2 siswa (sakit: 1, izin: 1) | **Formatif:**- Observasi partisipasi: 80% aktif- LKPD: 75% tuntas**Hasil:** Mayoritas siswa memahami konsep dasar | **Keberhasilan:** Siswa antusias, diskusi berjalan baik**Kendala:** Beberapa siswa kurang fokus, waktu terbatas | **Remedial:** Pengulangan materi untuk 5 siswa yang belum tuntas**Pengayaan:** Proyek mini untuk siswa maju |\n\n**CATATAN TAMBAHAN:**\n- **Moderasi Beragama:** Ditekankan toleransi antar siswa, anti-kekerasan dalam diskusi, akhlak mulia dalam perilaku\n- **Deep Learning:** Fokus pada eksplorasi mendalam, analisis kritis, dan transfer pengetahuan ke kehidupan sehari-hari\n- **Format ini siap digunakan di aplikasi SI-KURMA atau dicetak untuk dokumentasi**\n- **Evaluasi berkala:** Tinjau efektivitas pembelajaran setiap minggu untuk perbaikan`;

    return header + identity + content;
  };

  const generateSilabusDocument = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nSILABUS\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nTANGGAL CETAK: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;

    const identity = `[PAGE_BREAK]\n`;

    const content = `**A. IDENTITAS**\n\n| Aspek | Keterangan |\n|-------|------------|\n| Nama Madrasah | ${schoolName} |\n| Mata Pelajaran | ${mata_pelajaran} |\n| Fase/Kelas | ${fase} |\n| Semester | ${semester} |\n| Tahun Pelajaran | ${year} |\n| Alokasi Waktu | ${alokasi_waktu} |\n| Pengembang Silabus | ${teacher.nama} |\n\n**B. RASIONALITAS**\n\nMata pelajaran ${mata_pelajaran} merupakan bagian integral dari pembentukan karakter siswa MI sesuai Kurikulum Merdeka. Pembelajaran ini dirancang untuk mengembangkan potensi siswa melalui pendekatan berbasis cinta (KBC), Profil Pelajar Pancasila, Moderasi Beragama, dan Deep Learning. Materi ${materi_pokok.join(', ')} penting untuk membekali siswa dengan pengetahuan agama, keterampilan hidup, dan nilai-nilai moral yang akan membentuk generasi yang beriman, berakhlak mulia, dan siap menghadapi tantangan masa depan.\n\n**C. CAPAIAN PEMBELAJARAN (CP)**\n\n${cpItems.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n**D. TUJUAN PEMBELAJARAN (TP)**\n\n${tpItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n**E. ALUR TUJUAN PEMBELAJARAN (ATP)**\n\n| Minggu | Tema/Materi | TP yang Dicapai | Kegiatan Utama | Asesmen |\n|--------|-------------|------------------|----------------|---------|\n| 1-2 | Pengenalan Konsep Dasar | TP 1: ${tpItems[0] || 'Mengenal konsep dasar'} | Observasi, diskusi, apersepsi | Diagnostik, formatif |\n| 3-4 | Pengembangan Pemahaman | TP 2: ${tpItems[1] || 'Mengembangkan pemahaman'} | Eksplorasi, praktik, kolaborasi | Formatif, rubrik |\n| 5-6 | Aplikasi dan Integrasi | TP 3: ${tpItems[2] || 'Menerapkan dalam kehidupan'} | Proyek, presentasi, refleksi | Sumatif, portofolio |\n| 7-8 | Penguatan dan Evaluasi | TP 4: ${tpItems[3] || 'Merefleksikan pembelajaran'} | Review, remedial, pengayaan | Sumatif akhir |\n\n**F. MATERI PEMBELAJARAN**\n\n| TP | Materi Pokok | Sub Materi | Alokasi Waktu |\n|----|-------------|------------|---------------|\n${tpItems.map((t, i) => `| ${i + 1} | ${materi_pokok[0]} | Konsep dasar, contoh penerapan, nilai-nilai terkandung | ${Math.floor(parseInt(alokasi_waktu.split(' ')[0]) / tpItems.length)} × 35 menit |`).join('\n')}\n\n**G. KEGIATAN PEMBELAJARAN**\n\n| Tahap | Waktu | Kegiatan | Integrasi KBC | Pendekatan Deep Learning |\n|-------|-------|----------|---------------|------------------------|\n| **Pendahuluan** | 10-15 menit | Doa bersama, apersepsi, motivasi, penguatan karakter | Cinta kepada Allah (doa), Cinta kepada Ilmu (motivasi) | Mengaktifkan pengetahuan awal |\n| **Inti** | 50-60 menit | Eksplorasi mendalam, kolaborasi kelompok, praktik berbasis proyek | Cinta kepada Sesama (kolaborasi), Cinta kepada Lingkungan (praktik) | Mengkonstruksi pengetahuan, mengembangkan keterampilan |\n| **Penutup** | 10-15 menit | Refleksi, penguatan nilai, doa penutup, tindak lanjut | Cinta kepada Allah (doa), Cinta kepada Orang Tua (tindak lanjut rumah) | Mentransfer pengetahuan dalam kehidupan |\n\n**H. ASESMEN**\n\n| Jenis Asesmen | Tujuan | Instrumen | Teknik | Waktu |\n|---------------|--------|-----------|--------|-------|\n| **Diagnostik** | Mengidentifikasi kemampuan awal siswa | Angket, observasi, wawancara | Kualitatif | Awal semester |\n| **Formatif** | Memantau kemajuan belajar | LKPD, kuis harian, observasi partisipasi, diskusi kelompok | Rubrik, checklist, skala penilaian | Setiap pertemuan |\n| **Sumatif** | Mengukur pencapaian TP/CP | Tes tertulis, portofolio, proyek akhir, presentasi | Rubrik holistik, analitik | Akhir tema/materi |\n\n**I. ALOKASI WAKTU**\n\n| Komponen | Waktu |\n|----------|-------|\n| Total per Semester | ${alokasi_waktu} |\n| Per TP | ${Math.floor(parseInt(alokasi_waktu.split(' ')[0]) / tpItems.length)} × 35 menit |\n| Pendahuluan | 10-15 menit per pertemuan |\n| Kegiatan Inti | 50-60 menit per pertemuan |\n| Penutup | 10-15 menit per pertemuan |\n| Asesmen | Terintegrasi dalam kegiatan |\n\n**J. SUMBER BELAJAR**\n\n| Kategori | Sumber |\n|----------|--------|\n| **Utama** | Kitab Suci Al-Quran dan Hadits, Buku Siswa Kurikulum Merdeka, Buku Guru |\n| **Pendukung** | Media audio-visual, bahan ajar kontekstual, lingkungan sekitar, kisah inspiratif |\n| **Digital** | Aplikasi pembelajaran interaktif, video edukasi, bahan ajar online |\n\n**K. INTEGRASI NILAI**\n\n**1. PROFIL PELAJAR PANCASILA**\n\n| Dimensi | Indikator | Implementasi dalam Pembelajaran |\n|---------|-----------|-------------------------------|\n| Beriman, bertakwa kepada Tuhan YME dan berakhlak mulia | Melaksanakan ibadah, berdoa, berakhlak baik | Doa bersama, pembiasaan ibadah, pengamalan nilai agama |\n| Bergotong royong untuk kemajuan bersama | Bekerja sama, saling membantu, peduli sesama | Diskusi kelompok, proyek bersama, tolong-menolong |\n| Berkebinekaan global dengan menghargai perbedaan | Toleransi, menghargai perbedaan, moderasi beragama | Diskusi nilai toleransi, menghargai keberagaman |\n| Mandiri dalam belajar dan mengembangkan potensi | Belajar mandiri, mengembangkan bakat | Tugas mandiri, eksplorasi individu |\n| Bernalar kritis dalam memecahkan masalah | Berpikir kritis, analisis, pemecahan masalah | Analisis kasus, diskusi kritis |\n| Kreatif dalam berkarya dan berinovasi | Berkreasi, berinovasi, menghasilkan karya | Proyek kreatif, presentasi inovatif |\n\n**2. KURIKULUM BERBASIS CINTA (KBC)**\n\n| Aspek Cinta | Nilai yang Dikembangkan | Implementasi Konkret |\n|-------------|----------------------|---------------------|\n| **Cinta kepada Allah** | Iman dan ketakwaan | Pembiasaan ibadah 5 waktu, doa sebelum/sesudah kegiatan, pengamalan ajaran agama |\n| **Cinta kepada Rasul** | Meneladani akhlak Nabi | Pembelajaran sirah Nabi, praktik sunnah, meneladani perilaku Rasulullah SAW |\n| **Cinta kepada Orang Tua** | Hormat dan taat | Pengingat kewajiban anak, berdoa untuk orang tua, membantu pekerjaan rumah |\n| **Cinta kepada Sesama** | Toleransi dan solidaritas | Kerja sama kelompok, tolong-menolong, menghargai perbedaan teman |\n| **Cinta kepada Lingkungan** | Kepedulian alam | Kebersihan kelas, pelestarian lingkungan sekolah, kepedulian terhadap makhluk hidup |\n| **Cinta kepada Ilmu** | Semangat belajar | Motivasi tinggi, eksplorasi pengetahuan, kegembiraan dalam belajar |\n\n**3. MODERASI BERAGAMA**\n\n| Prinsip | Implementasi | Tujuan |\n|---------|--------------|--------|\n| **Toleransi** | Menghargai perbedaan mazhab, keyakinan, dan pendapat | Membentuk sikap saling menghormati dan hidup harmonis |\n| **Anti Kekerasan** | Penyelesaian masalah secara damai, menghindari konflik | Mengembangkan budaya damai dalam beragama |\n| **Anti Ekstremisme** | Pandangan seimbang, menghindari pemahaman berlebihan | Menjaga keseimbangan dalam beragama |\n| **Akhlak Mulia** | Pengamalan nilai-nilai universal (jujur, disiplin, tanggung jawab) | Membentuk karakter yang baik sesuai ajaran agama |\n| **Nasionalisme** | Cinta tanah air, NKRI, dan kebhinekaan | Membentuk warga negara yang baik |\n\n**4. PENDEKATAN DEEP LEARNING**\n\n| Prinsip Deep Learning | Implementasi dalam Pembelajaran |\n|----------------------|-------------------------------|\n| **Mengaktifkan Pengetahuan Awal** | Apersepsi, diskusi awal, aktivasi skema |\n| **Mengkonstruksi Pengetahuan** | Eksplorasi, elaborasi, kolaborasi |\n| **Mengembangkan Keterampilan** | Praktik, proyek, aplikasi nyata |\n| **Mentransfer Pengetahuan** | Refleksi, transfer ke kehidupan sehari-hari |\n\n**CATATAN PENTING:**\n- Silabus ini bersifat fleksibel dan dapat disesuaikan dengan kondisi siswa\n- Fokus utama pada pengembangan karakter dan nilai-nilai cinta\n- Asesmen dilakukan secara holistik dengan memperhatikan aspek kognitif, afektif, dan psikomotorik\n- Pembelajaran berbasis proyek untuk mengembangkan keterampilan abad ke-21\n- Siap digunakan sebagai acuan pembelajaran di madrasah ibtidaiyah`;

    return header + identity + content;
  };

  const generatePromesDocument = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nPROGRAM SEMESTER (PROMES)\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nTANGGAL CETAK: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;

    const identity = `[PAGE_BREAK]\n`;

    const content = `**A. IDENTITAS PROMES**\n\n| Aspek | Keterangan |\n|-------|------------|\n| Satuan Pendidikan | ${schoolName} |\n| Mata Pelajaran | ${mata_pelajaran} |\n| Kelas/Fase | ${fase} |\n| Semester | ${semester} |\n| Tahun Pelajaran | ${year} |\n| Alokasi Waktu | ${alokasi_waktu} |\n| Tanggal Cetak | ${tanggal_cetak} |\n\n**B. RASIONAL**\n\n**1. Landasan Filosofis**\n\nProgram Semester (PROMES) mata pelajaran ${mata_pelajaran} disusun berdasarkan prinsip-prinsip Kurikulum Merdeka yang menekankan pada pengembangan kompetensi siswa secara holistik. Pembelajaran ${mata_pelajaran} di Madrasah Ibtidaiyah bertujuan untuk membentuk karakter siswa yang beriman, bertakwa, berakhlak mulia, dan siap menghadapi tantangan masa depan melalui integrasi nilai-nilai Pancasila, Moderasi Beragama, dan Kurikulum Berbasis Cinta (KBC).\n\n**2. Fokus Pembelajaran Semester Ini**\n\nSemester ${semester} ini fokus pada pengembangan pemahaman mendalam tentang ${materi_pokok.join(', ')} dengan pendekatan Deep Learning yang mendorong eksplorasi mendalam, analisis kritis, dan transfer pengetahuan ke kehidupan sehari-hari. Program ini memperhatikan perkembangan usia anak usia dini dengan metode pembelajaran yang menyenangkan dan kontekstual.\n\n**3. Berbasis Capaian Pembelajaran (CP)**\n\nPROMES ini disusun berdasarkan Capaian Pembelajaran (CP) Kurikulum Merdeka yang meliputi:\n${cpItems.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n**4. Integrasi Nilai Utama**\n\n| Aspek | Penjelasan |\n|-------|------------|\n| **Profil Pelajar Pancasila** | Pengembangan 6 dimensi karakter: Beriman, Gotong Royong, Berkebinekaan, Mandiri, Bernalar Kritis, Kreatif |\n| **Moderasi Beragama** | Toleransi, Anti Radikalisme, Inklusivitas, Persatuan, Akhlak Mulia |\n| **KBC (Kurikulum Berbasis Cinta)** | 7 aspek cinta: Allah, Rasul, Orang Tua, Sesama, Lingkungan, Ilmu, Diri Sendiri |\n| **Deep Learning** | Eksplorasi mendalam, analisis kritis, refleksi berkelanjutan, transfer pengetahuan |\n\n**C. TUJUAN PEMBELAJARAN**\n\nTujuan pembelajaran mata pelajaran ${mata_pelajaran} pada semester ${semester} adalah:\n\n${tpItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n**D. DISTRIBUSI MATERI PEMBELAJARAN**\n\n| No | TP/Materi Pokok | Minggu Ke | Alokasi JP | Kegiatan Utama | Asesmen |\n|----|----------------|-----------|------------|----------------|---------|\n${tpItems.map((t, i) => `| ${i + 1} | ${materi_pokok[0]}${t} | ${Math.floor(i/2) + 1}-${Math.floor(i/2) + 2} | 2 JP | Eksplorasi, praktik, proyek | Formatif |`).join('\n')}\n\n**Total Alokasi JP: ${tpItems.length * 2} JP**\n\n**E. KALENDER AKADEMIK**\n\n| Bulan | Minggu Efektif | Tema Pembelajaran | Kegiatan Utama |\n|-------|----------------|-------------------|----------------|\n| Juli | 1-4 | Pengenalan Konsep Dasar | Apersepsi, eksplorasi awal |\n| Agustus | 5-8 | Pengembangan Pemahaman | Diskusi kelompok, praktik |\n| September | 9-12 | Aplikasi Kontekstual | Proyek berbasis masalah |\n| Oktober | 13-16 | Penguatan Konsep | Review, remedial, pengayaan |\n| November | 17-20 | Integrasi Nilai | Refleksi, transfer pengetahuan |\n| Desember | 21-24 | Evaluasi Akhir | Penilaian sumatif, refleksi |\n\n**Total Minggu Efektif: 24 minggu**\n\n**F. PENILAIAN**\n\n**1. Penilaian Diagnostik (Awal Semester)**\n\n| Aspek | Teknik | Instrumen | Waktu | Tujuan |\n|-------|--------|-----------|-------|--------|\n| Pengetahuan Awal | Observasi, wawancara, angket | Checklist, rubrik observasi | Minggu 1 | Mengidentifikasi kemampuan awal siswa |\n| Sikap dan Perilaku | Observasi berkelanjutan | Jurnal guru, catatan harian | Selama semester | Memantau perkembangan karakter |\n| Keterampilan Dasar | Tes praktik sederhana | Rubrik keterampilan | Minggu 1-2 | Mengukur kemampuan motorik/psikomotorik |\n\n**2. Penilaian Formatif (Berkala)**\n\n| Aspek | Teknik | Instrumen | Frekuensi | Bobot |\n|-------|--------|-----------|-----------|-------|\n| **Pengetahuan** | Kuis harian, diskusi kelas | Soal pilihan ganda, uraian singkat | Setiap akhir materi | 30% |\n| **Keterampilan** | Praktik, demonstrasi | Rubrik praktik, checklist | Setiap kegiatan praktik | 30% |\n| **Sikap** | Observasi partisipasi | Rubrik sikap, jurnal | Setiap pertemuan | 40% |\n\n**3. Penilaian Sumatif Tengah Semester (PTS)**\n\n| Komponen | Bentuk | Bobot | Waktu |\n|----------|--------|-------|-------|\n| Tes Tertulis | Pilihan ganda, uraian | 40% | Minggu 12 |\n| Praktik/Keterampilan | Demonstrasi, proyek kecil | 30% | Minggu 11-12 |\n| Portofolio | Kumpulan karya siswa | 20% | Akumulasi selama semester |\n| Sikap | Observasi berkelanjutan | 10% | Selama semester |\n\n**4. Penilaian Sumatif Akhir Semester (PAS)**\n\n| Komponen | Bentuk | Bobot | Waktu |\n|----------|--------|-------|-------|\n| Tes Komprehensif | Pilihan ganda, uraian, essai | 40% | Minggu 24 |\n| Proyek Akhir | Produk akhir semester | 30% | Minggu 22-23 |\n| Presentasi | Presentasi proyek/tugas akhir | 15% | Minggu 24 |\n| Sikap | Rubrik pengamatan akhir | 15% | Selama semester |\n\n**G. KEGIATAN PEMBELAJARAN**\n\n**1. Model Pembelajaran**\n\n| Model | Deskripsi | Implementasi |\n|-------|------------|--------------|\n| **Project Based Learning (PjBL)** | Pembelajaran berbasis proyek | Siswa mengerjakan proyek nyata terkait materi |\n| **Discovery Learning** | Pembelajaran penemuan | Siswa menemukan konsep melalui eksplorasi |\n| **Cooperative Learning** | Pembelajaran kooperatif | Kerja kelompok untuk mencapai tujuan bersama |\n| **Problem Based Learning** | Pembelajaran berbasis masalah | Mengatasi masalah dunia nyata |\n\n**2. Pendekatan Deep Learning**\n\n| Tahap | Aktivitas | Tujuan |\n|-------|----------|--------|\n| **Mengaktifkan Pengetahuan Awal** | Apersepsi, brainstorming | Menyiapkan skema kognitif |\n| **Mengkonstruksi Pengetahuan** | Eksplorasi, investigasi | Membangun pemahaman baru |\n| **Mengembangkan Keterampilan** | Praktik, aplikasi | Transfer pengetahuan |\n| **Mentransfer Pengetahuan** | Refleksi, proyek | Penerapan dalam kehidupan |\n\n**3. Metode Pembelajaran**\n\n| Metode | Teknik | Contoh |\n|--------|--------|--------|\n| **Ceramah Interaktif** | Tanya jawab, diskusi | Penjelasan konsep dengan interaksi |\n| **Diskusi Kelas** | Brainstorming, debat | Pertukaran pendapat siswa |\n| **Praktik Langsung** | Demonstrasi, eksperimen | Pembelajaran hands-on |\n| **Studi Kasus** | Analisis masalah | Penerapan konsep |\n| **Pembelajaran Berbasis Proyek** | Proyek kelompok | Produk akhir bermakna |\n\n**H. SUMBER BELAJAR**\n\n| Kategori | Sumber Belajar | Ketersediaan |\n|----------|----------------|--------------|\n| **Utama** | Kitab Suci Al-Quran, Hadits, Buku Siswa/Guru Kurikulum Merdeka | Lengkap |\n| **Pendukung** | Media audio-visual, alat peraga edukatif, bahan praktikum | Tersedia |\n| **Digital** | Aplikasi pembelajaran interaktif, video edukasi, bahan ajar online | Terbatas |\n| **Lingkungan** | Masjid, mushola, rumah ibadah, lingkungan sekitar sekolah | Mudah diakses |\n\n**1. Profil Pelajar Pancasila**\n\n| Dimensi | Implementasi | Indikator |\n|---------|--------------|-----------|\n| **Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia** | Pembiasaan ibadah, pengamalan nilai agama | Siswa melaksanakan ibadah dengan baik |\n| **Mandiri** | Tugas mandiri, eksplorasi individu | Siswa mampu belajar sendiri |\n| **Gotong Royong** | Kerja sama kelompok, proyek bersama | Siswa aktif dalam kelompok |\n| **Bernalar Kritis** | Analisis kasus, diskusi kritis | Siswa mampu berpikir logis |\n| **Kreatif** | Proyek kreatif, presentasi inovatif | Siswa menghasilkan karya baru |\n| **Demokratis** | Diskusi kelas, voting keputusan | Siswa menghargai pendapat lain |\n\n**2. Moderasi Beragama**\n\n| Aspek | Implementasi | Tujuan |\n|-------|--------------|--------|\n| **Toleransi** | Diskusi perbedaan mazhab, menghargai keyakinan lain | Membentuk sikap saling menghormati |\n| **Anti Radikalisme** | Pendidikan tentang persatuan umat | Menjaga keharmonisan beragama |\n| **Inklusivitas** | Pembelajaran untuk semua siswa | Membentuk masyarakat inklusif |\n| **Persatuan** | Kegiatan bersama antar siswa | Memperkuat persatuan bangsa |\n\n**3. KBC (Kurikulum Berbasis Cinta)**\n\n| Nilai Cinta | Strategi Implementasi | Contoh Kegiatan |\n|------------|---------------------|-----------------|\n| **Cinta kepada Allah** | Pembiasaan ibadah, doa bersama | Sholat dhuha, dzikir pagi |\n| **Cinta kepada Rasul** | Pembelajaran sirah, sunnah | Meneladani akhlak Nabi |\n| **Cinta kepada Orang Tua** | Pengingat kewajiban anak | Membantu pekerjaan rumah |\n| **Cinta kepada Sesama** | Kerja sama, tolong-menolong | Berbagi dengan teman |\n| **Cinta kepada Lingkungan** | Kebersihan, pelestarian | Membersihkan kelas, sekolah |\n| **Cinta kepada Ilmu** | Motivasi belajar tinggi | Eksplorasi pengetahuan |\n| **Cinta kepada Diri Sendiri** | Pengembangan potensi | Menjaga kesehatan diri |\n\n**G. TINDAK LANJUT**\n\n**1. Remedial**\n\n- Siswa yang belum mencapai KKM mendapat bimbingan khusus\n- Pengulangan materi dengan metode berbeda\n- Bimbingan individual atau kelompok kecil\n- Penggunaan media alternatif (video, gambar, permainan)\n- Konsultasi dengan guru atau teman sebaya\n\n**2. Pengayaan**\n\n- Siswa yang telah mencapai KKM mendapat tantangan tambahan\n- Proyek lanjutan dengan tema lebih kompleks\n- Menjadi tutor bagi teman yang membutuhkan\n- Mengikuti lomba atau kompetisi terkait materi\n- Pengembangan bakat dan minat siswa\n\n**3. Refleksi Pembelajaran**\n\n**Refleksi Guru:**\n- Apakah tujuan pembelajaran tercapai?\n- Bagaimana implementasi nilai cinta?\n- Metode mana yang paling efektif?\n- Perbaikan apa yang diperlukan?\n- Bagaimana pengembangan karakter siswa?\n\n**Refleksi Siswa:**\n- Apa yang paling kamu sukai?\n- Nilai cinta mana yang sudah kamu terapkan?\n- Bagaimana mengamalkan di rumah?\n- Saran untuk pembelajaran lebih baik?\n- Apa yang sudah kamu lakukan hari ini?\n\n**CATATAN PENTING:**\n- PROMES ini sesuai Kurikulum Merdeka MI\n- Fokus pada pengembangan karakter dan nilai cinta\n- Pembelajaran aktif berbasis proyek\n- Asesmen holistik meliputi kognitif, afektif, psikomotorik\n- Siap digunakan sebagai acuan pembelajaran semester`;

    return header + identity + content;
  };

  const handleGenerateAI = () => {
    if (formData.materi_pokok.length === 0) { showError('Pilih materi pokok!'); return; }
    setIsGenerating(true);

    setTimeout(() => {
      const { mata_pelajaran, fase, jenis_dokumen, alokasi_waktu, materi_pokok } = formData;
      const schoolName = settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || "Si@Kad";
      const yayasan = settings.identitas_madrasah?.nama_yayasan || "";
      const year = settings.tahun_pelajaran?.active_year || "2024/2025";
      const semester = settings.tahun_pelajaran?.semester || "Ganjil";
      const docInfo = dokumenTypes.find(d => d.value === jenis_dokumen);
      const teacher = getTeacherForClass(fase);
      const selectedMateriData = availableMateri.find(m => m.materi_pokok === materi_pokok[0]);
      const tanggalCetak = new Date(formData.tanggal_cetak || new Date()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
      
      let hasil = '';

      if (jenis_dokumen === 'cp_tp_atp') {
        hasil = generateCpTpAtpAnalysis({
          schoolName,
          yayasan,
          year,
          semester,
          mata_pelajaran,
          fase,
          materi_pokok,
          alokasi_waktu,
          tanggal_cetak: tanggalCetak,
          teacher,
          selectedMateriData
        });
      } else if (jenis_dokumen === 'modul_ajar') {
        hasil = generateModulAjarDocument({
          schoolName,
          yayasan,
          year,
          semester,
          mata_pelajaran,
          fase,
          materi_pokok,
          alokasi_waktu,
          pertemuan: formData.pertemuan,
          tanggal_cetak: tanggalCetak,
          teacher,
          selectedMateriData
        });
      } else if (jenis_dokumen === 'rpp_rpm') {
        hasil = generateRppDocument({
          schoolName,
          yayasan,
          year,
          semester,
          mata_pelajaran,
          fase,
          materi_pokok,
          alokasi_waktu,
          pertemuan: formData.pertemuan,
          tanggal_cetak: tanggalCetak,
          teacher,
          selectedMateriData
        });
      } else if (jenis_dokumen === 'jurnal_mengajar') {
        hasil = generateJurnalMengajarDocument({
          schoolName,
          yayasan,
          year,
          semester,
          mata_pelajaran,
          fase,
          materi_pokok,
          alokasi_waktu,
          tanggal_cetak: tanggalCetak,
          teacher,
          selectedMateriData
        });
      } else if (jenis_dokumen === 'promes') {
        hasil = generatePromesDocument({
          schoolName,
          yayasan,
          year,
          semester,
          mata_pelajaran,
          fase,
          materi_pokok,
          alokasi_waktu,
          tanggal_cetak: tanggalCetak,
          teacher,
          selectedMateriData
        });
      } else if (jenis_dokumen === 'prota') {
        hasil = generateProtaDocument({
          schoolName,
          yayasan,
          year,
          semester,
          mata_pelajaran,
          fase,
          materi_pokok,
          alokasi_waktu,
          tanggal_cetak: tanggalCetak,
          teacher,
          selectedMateriData
        });

      } else if (jenis_dokumen === 'kktp') {
        hasil = generateKKTPDocument({
          schoolName,
          yayasan,
          year,
          semester,
          mata_pelajaran,
          fase,
          materi_pokok,
          alokasi_waktu,
          tanggal_cetak: tanggalCetak,
          teacher,
          selectedMateriData
        });
      }

      setFormData(prev => ({ ...prev, hasil }));
      setIsGenerating(false);
      showSuccess(`Dokumen ${docInfo?.label} berhasil disusun!`);
    }, 1500);
  };
  const generateKKTPDocument = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nKRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nTANGGAL: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;

    const tujuanPembelajaran = tpItems.map((tp, i) => `${i + 1}. ${tp}`).join('\n');
    
    const fokusKompetensi = `Mata pelajaran ${mata_pelajaran} untuk ${fase} semester ${semester} fokus pada pengembangan kompetensi siswa dalam:
- Memahami konsep-konsep dasar ${materi_pokok[0]}
- Menerapkan nilai-nilai agama dalam kehidupan sehari-hari
- Mengembangkan sikap toleran, jujur, dan disiplin
- Memperkuat karakter islami dan nilai Pancasila
- Mengintegrasikan pembelajaran dengan nilai-nilai cinta (Allah, Rasul, Orang Tua, Sesama, Lingkungan, Ilmu)`;

    const nilaiKBC = `1. **Cinta kepada Allah (Tuhan Yang Maha Esa)**
   - Implementasi: Melalui pembiasaan ibadah, doa, dan dzikir
   - Indikator: Siswa aktif melakukan ibadah, doa dengan khusyuk
   
2. **Cinta kepada Rasul (Nabi Muhammad SAW)**
   - Implementasi: Melalui pembelajaran akhlak dan sunnah
   - Indikator: Siswa meneladani akhlak Rasul dalam kehidupan
   
3. **Cinta kepada Orang Tua**
   - Implementasi: Melalui pengajaran berbakti dan menghormati
   - Indikator: Siswa menunjukkan sikap hormat dan taat kepada orang tua
   
4. **Cinta kepada Sesama**
   - Implementasi: Melalui diskusi kelompok, kerja sama, dan tolong-menolong
   - Indikator: Siswa mampu bekerja sama dan saling membantu
   
5. **Cinta kepada Lingkungan**
   - Implementasi: Melalui kepedulian terhadap kebersihan dan alam
   - Indikator: Siswa menjaga kebersihan dan kelestarian lingkungan
   
6. **Cinta kepada Ilmu (Pengetahuan)**
   - Implementasi: Melalui motivasi belajar tinggi dan semangat eksplorasi
   - Indikator: Siswa aktif bertanya, mencari pengetahuan, dan berbagi ilmu`;

    const aspekPenilaian = cpItems.map((cp, i) => ({
      no: i + 1,
      cp: cp,
      tp: tpItems[i] || `TP ${i + 1}`,
      indikator: `Siswa mampu menunjukkan pemahaman ${cp.toLowerCase()} dengan benar dan dapat menerapkannya dalam kehidupan`,
      teknikPenilaian: 'Tes tertulis, Performa, Observasi',
      instrumen: 'Soal uraian, Rubrik penilaian, Checklist',
      sangaatBaik: 'Pemahaman sangat mendalam, penerapan sempurna, menunjukkan inisiatif dalam pembelajaran',
      baik: 'Pemahaman jelas, penerapan tepat, partisipasi aktif dalam pembelajaran',
      cukup: 'Pemahaman dasar, penerapan mulai terlihat, partisipasi minimal',
      kurang: 'Pemahaman terbatas, penerapan belum terlihat jelas, sangat pasif',
      remedial: 'Pembelajaran ulang dengan metode berbeda, bimbingan individual, tugas tambahan',
      pengayaan: 'Proyek penelitian lebih mendalam, tugas lebih kompleks, menjadi tutor sebaya'
    }));

    const aspekTableRow = aspekPenilaian.map(a =>
      `| ${a.no} | ${a.cp} | ${a.tp} | ${a.indikator} | ${a.teknikPenilaian} | ${a.instrumen} | **SB:** ${a.sangaatBaik}<br>**B:** ${a.baik}<br>**C:** ${a.cukup}<br>**K:** ${a.kurang} | **Remedial:** ${a.remedial}<br>**Pengayaan:** ${a.pengayaan} |`
    ).join('\n');

    const content = `**A. IDENTITAS KKTP**

| Aspek | Keterangan |
|-------|------------|
| Satuan Pendidikan | ${schoolName} |
| Mata Pelajaran | ${mata_pelajaran} |
| Kelas/Fase | ${fase} |
| Semester | ${semester} |
| Tahun Pelajaran | ${year} |
| Nama Penyusun | ${teacher.nama} |
| NIP | ${teacher.nip} |
| Tanggal Pembuatan | ${tanggal_cetak} |

**B. TUJUAN PEMBELAJARAN**

${tujuanPembelajaran}

**C. FOKUS KOMPETENSI**

${fokusKompetensi}

**D. INTEGRASI NILAI KURIKULUM BERBASIS CINTA (KBC)**

${nilaiKBC}

**E. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN**

| No | CP | TP | Indikator Pencapaian | Teknik Penilaian | Instrumen | Rubrik Penilaian | Tindak Lanjut |
|----|----|----|----------------------|------------------|-----------|---------------------|---------------|
${aspekTableRow}

**F. PENJELASAN RUBRIK PENILAIAN**

Skala Penilaian 4 Level (SBCK):

| Level | Deskripsi | Nilai | Bobot |
|-------|-----------|-------|-------|
| **SB (Sangat Baik)** | Siswa mencapai seluruh indikator dengan sangat baik, pemahaman mendalam, penerapan sempurna | 4 | 90-100 |
| **B (Baik)** | Siswa mencapai sebagian besar indikator dengan baik, pemahaman cukup mendalam, penerapan tepat | 3 | 80-89 |
| **C (Cukup)** | Siswa mencapai sebagian indikator dengan cukup, pemahaman dasar, penerapan mulai terlihat | 2 | 70-79 |
| **K (Kurang)** | Siswa belum mencapai indikator optimal, pemahaman terbatas, penerapan belum terlihat | 1 | 0-69 |

**G. TEKNIK PENILAIAN**

1. **Tes Tertulis:** Pilihan ganda, uraian, isian singkat (Berkala sesuai pencapaian materi)
2. **Performa/Praktik:** Demonstrasi, praktik langsung, eksperimen (Selama proses pembelajaran)
3. **Portofolio:** Kumpulan hasil kerja siswa, karya tulis, sketsa (Sepanjang semester)
4. **Sikap/Observasi:** Observasi berkelanjutan, jurnal guru, checklist (Setiap saat pembelajaran)
5. **Produk:** Hasil karya siswa (proyek, makalah, presentasi) (Akhir unit pembelajaran)

**H. INSTRUMEN PENILAIAN**

| Instrumen | Keterangan | Waktu Penggunaan |
|-----------|-----------|------------------|
| **Tes Tertulis** | Soal pilihan ganda, uraian, isian singkat | Setelah pembelajaran materi |
| **Rubrik Penilaian** | Panduan penilaian dengan kriteria jelas | Saat menilai hasil kerja |
| **Checklist** | Daftar periksa ciri/indikator pencapaian | Observasi berkelanjutan |
| **Lembar Observasi** | Format pengamatan sikap dan perilaku | Setiap saat pembelajaran |
| **Jurnal Guru** | Catatan reflektif tentang perkembangan siswa | Setelah setiap pembelajaran |

**I. PROGRAM TINDAK LANJUT**

**1. Remedial (Bagi yang belum tuntas)**
- Pembelajaran ulang dengan metode berbeda (cerita, gambar, permainan)
- Bimbingan individual atau kelompok kecil
- Tugas remedial yang lebih sederhana dan kontekstual
- Waktu: Setelah penilaian formatif/sumatif
- Kriteria Tuntas: Skor ≥ 70

**2. Pengayaan (Bagi yang sudah tuntas)**
- Tugas yang lebih kompleks dan menantang
- Proyek penelitian atau investigasi yang lebih mendalam
- Menjadi tutor bagi teman yang membutuhkan
- Pengembangan kreativitas melalui pembuatan produk inovatif
- Waktu: Setelah penilaian formatif/sumatif
- Kriteria: Skor ≥ 80

**CATATAN PENTING:**
- KKTP ini disusun sesuai Kurikulum Merdeka Madrasah Ibtidaiyah
- Fokus pada pencapaian terukur dan integrasi nilai-nilai karakter
- Integrasikan Profil Pelajar Pancasila, Moderasi Beragama, dan KBC
- Penilaian holistik meliputi kognitif, afektif, dan psikomotorik
- Rubrik 4 level memudahkan guru melihat progres siswa secara jelas
- Siap digunakan sebagai panduan penilaian dan tindak lanjut pembelajaran`;

    return header + '\n[PAGE_BREAK]\n' + content;
  };
  const generateProtaDocument = (params: any) => {
    const { schoolName, yayasan, year, semester, mata_pelajaran, fase, materi_pokok, alokasi_waktu, tanggal_cetak, teacher, selectedMateriData } = params;
    const rawCp = selectedMateriData?.cp || "1. Menghayati nilai pendidikan agama.\n2. Mengamalkan sikap toleran, jujur, dan disiplin.";
    const rawTp = selectedMateriData?.tp || "1. Menjelaskan konsep materi.\n2. Mengidentifikasi contoh penerapan.\n3. Menerapkan nilai karakter.";
    const cpItems = rawCp.split(/\r?\n/).filter(Boolean);
    const tpItems = rawTp.split(/\r?\n/).filter(Boolean).map(t => t.replace(/^\d+\.\s*/, ''));

    const header = `[HALAMAN COVER]\n\n${yayasan.toUpperCase()}\n${schoolName.toUpperCase()}\nTAHUN PELAJARAN ${year}\n\n\nPROGRAM TAHUNAN (PROTA)\n\nMATA PELAJARAN: ${mata_pelajaran.toUpperCase()}\nKELAS/FASE: ${fase.toUpperCase()}\nSEMESTER: ${semester}\nTANGGAL CETAK: ${tanggal_cetak}\n\nDisusun Oleh:\n${teacher.nama}\nNIP. ${teacher.nip}`;

    const identity = `[PAGE_BREAK]\n`;

    const content = `**A. IDENTITAS PROTA**\n\n| Aspek | Keterangan |\n|-------|------------|\n| Satuan Pendidikan | ${schoolName} |\n| Nama Yayasan | ${yayasan} |\n| Mata Pelajaran | ${mata_pelajaran} |\n| Kelas/Fase | ${fase} |\n| Semester | ${semester} |\n| Tahun Pelajaran | ${year} |\n| Alokasi Waktu | ${alokasi_waktu} |\n| Tanggal Cetak | ${tanggal_cetak} |\n| Penyusun | ${teacher.nama} |\n| NIP | ${teacher.nip} |\n\n**B. CAPAIAN PEMBELAJARAN (CP)**\n\nCapaian Pembelajaran (CP) mata pelajaran ${mata_pelajaran} untuk ${fase} adalah:\n\n${cpItems.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n**C. ALUR TUJUAN PEMBELAJARAN (ATP)**\n\n| No | Tujuan Pembelajaran (TP) | Capaian Pembelajaran (CP) | Indikator Pencapaian |\n|----|--------------------------|---------------------------|----------------------|\n${tpItems.map((t, i) => `| ${i + 1} | ${t} | ${cpItems[i] || 'CP ' + (i + 1)} | Siswa mampu menunjukkan pemahaman dan penerapan konsep |`).join('\n')}\n\n**D. PEMETAAN MATERI POKOK**\n\n| Semester | Materi Pokok | Alokasi Waktu | TP yang Dicapai |\n|----------|--------------|---------------|-----------------|\n| ${semester} | ${materi_pokok.join('')} | ${alokasi_waktu} | ${tpItems.map((t, i) => `TP ${i + 1}`).join(', ')} |\n\n**E. DISTRIBUSI WAKTU PEMBELAJARAN**\n\n| Komponen | Waktu | Persentase |\n|----------|-------|------------|\n| **Pendahuluan** | 10-15 menit | 15-20% |\n| **Kegiatan Inti** | 50-60 menit | 70-75% |\n| **Penutup** | 10-15 menit | 10-15% |\n| **Total per Pertemuan** | 70-90 menit | 100% |\n\n**F. INTEGRASI NILAI PROFIL PELAJAR PANCASILA**\n\n| Dimensi | Indikator | Strategi Implementasi | Contoh Kegiatan |\n|---------|-----------|----------------------|-----------------|\n| **Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia** | Melaksanakan ibadah, berdoa, berakhlak baik | Pembiasaan ibadah, pengamalan nilai agama | Doa bersama, sholat dhuha, dzikir |\n| **Mandiri** | Belajar sendiri, mengembangkan potensi | Tugas mandiri, eksplorasi individu | Jurnal harian, proyek pribadi |\n| **Gotong Royong** | Bekerja sama, saling membantu | Diskusi kelompok, proyek bersama | Kerja kelompok, gotong royong |\n| **Bernalar Kritis** | Berpikir logis, analisis masalah | Diskusi kritis, pemecahan masalah | Analisis kasus, debat |\n| **Kreatif** | Berkreasi, berinovasi | Proyek kreatif, presentasi | Karya seni, inovasi pembelajaran |\n| **Berkebinekaan Global** | Menghargai perbedaan, toleransi | Diskusi keberagaman, moderasi beragama | Studi komparasi budaya |\n\n**G. INTEGRASI MODERASI BERAGAMA**\n\n| Prinsip | Implementasi | Tujuan |\n|---------|--------------|--------|\n| **Toleransi** | Diskusi perbedaan mazhab, menghargai keyakinan lain | Membentuk sikap saling menghormati |\n| **Anti Radikalisme** | Pendidikan persatuan, anti-kekerasan | Menjaga keharmonisan beragama |\n| **Inklusivitas** | Pembelajaran untuk semua siswa | Membentuk masyarakat inklusif |\n| **Akhlak Mulia** | Pengamalan nilai universal | Membentuk karakter yang baik |\n| **Nasionalisme** | Cinta NKRI, kebhinekaan | Membentuk warga negara yang baik |\n\n**H. INTEGRASI KETERAMPILAN ABAD KE-21**\n\n| Keterampilan | Indikator | Strategi Pengembangan | Contoh Aktivitas |\n|-------------|-----------|----------------------|------------------|\n| **Berpikir Kritis** | Menganalisis, mengevaluasi informasi | Diskusi kritis, analisis kasus | Debat kelas, problem solving |\n| **Kreativitas** | Berinovasi, menghasilkan ide baru | Proyek kreatif, brainstorming | Karya seni, presentasi inovatif |\n| **Komunikasi** | Menyampaikan ide dengan jelas | Presentasi, diskusi kelas | Public speaking, kerja kelompok |\n| **Kolaborasi** | Bekerja sama dalam tim | Proyek kelompok, diskusi | Team work, peer teaching |\n| **Literasi Digital** | Menggunakan teknologi informasi | E-learning, digital tools | Aplikasi pembelajaran, video edukasi |\n| **Adaptabilitas** | Menyesuaikan diri dengan perubahan | Pembelajaran kontekstual | Project based learning |\n\n**I. KEGIATAN PEMBELAJARAN**\n\n| Tahap | Waktu | Kegiatan | Tujuan |\n|-------|-------|----------|--------|\n| **Pendahuluan** | 10-15 menit | Doa bersama, apersepsi, motivasi | Mengaktifkan pengetahuan awal |\n| **Kegiatan Inti** | 50-60 menit | Eksplorasi, diskusi, praktik, proyek | Mengkonstruksi pengetahuan |\n| **Penutup** | 10-15 menit | Refleksi, penguatan nilai, doa | Mentransfer pengetahuan |\n\n**J. PENILAIAN**\n\n| Jenis Penilaian | Teknik | Instrumen | Waktu |\n|---------------|--------|-----------|-------|\n| **Diagnostik** | Observasi, angket | Checklist, rubrik | Awal tahun |\n| **Formatif** | Tes, praktik, proyek | Soal, rubrik penilaian | Berkala |\n| **Sumatif** | Ujian, portofolio | Tes komprehensif | Akhir semester |\n| **Sikap** | Observasi berkelanjutan | Jurnal guru | Selama proses |\n\n**K. SUMBER BELAJAR**\n\n| Kategori | Sumber | Ketersediaan |\n|----------|--------|--------------|\n| **Utama** | Kitab Suci, Buku Kurikulum Merdeka | Lengkap |\n| **Pendukung** | Media audio-visual, alat peraga | Tersedia |\n| **Digital** | Aplikasi interaktif, video edukasi | Terbatas |\n| **Lingkungan** | Masjid, mushola, lingkungan sekitar | Mudah diakses |\n\n**L. SARANA DAN PRASARANA**\n\n| Kategori | Sarana/Prasarana | Kondisi |\n|----------|------------------|---------|\n| **Ruang** | Ruang kelas, mushola | Baik |\n| **Media** | LCD, laptop, speaker | Baik |\n| **Bahan Ajar** | Buku, modul, alat tulis | Lengkap |\n| **Praktikum** | Alat peraga agama | Perlu ditambah |\n\n**M. PENGEMBANGAN PROFESIONAL GURU**\n\n| Aspek | Kegiatan | Frekuensi |\n|-------|----------|-----------|\n| **Kompetensi** | Workshop, seminar, pelatihan | Berkala |\n| **Pengembangan Diri** | Membaca buku, komunitas guru | Berkelanjutan |\n| **Kolaborasi** | MGMP, KKG, sharing session | Rutin |\n| **Refleksi** | Jurnal mengajar, supervisi | Berkala |\n\n**CATATAN PENTING:**\n- PROTA ini disusun sesuai Kurikulum Merdeka Madrasah Ibtidaiyah\n- Fokus pada pengembangan karakter dan nilai-nilai islami\n- Integrasi Profil Pelajar Pancasila, Moderasi Beragama, dan KBC\n- Pengembangan keterampilan abad ke-21\n- Pembelajaran aktif dengan pendekatan berbasis proyek\n- Asesmen holistik meliputi kognitif, afektif, dan psikomotorik\n- Siap digunakan sebagai acuan pembelajaran tahunan`;

    return header + identity + content;
  };
  const handleSave = async () => {
    if (!formData.hasil) return;
    setIsSaving(true);
    try {
      const createdAt = formData.tanggal_cetak ? new Date(`${formData.tanggal_cetak}T00:00:00`).toISOString() : new Date().toISOString();
      const newItem = { 
        id: Date.now().toString(), 
        ...formData, 
        created_at: createdAt,
        tanggal_cetak: formData.tanggal_cetak || new Date().toISOString().split('T')[0],
        tahun_pelajaran: settings.tahun_pelajaran?.active_year || '2024/2025',
        semester: settings.tahun_pelajaran?.semester || 'Ganjil'
      };
      const newList = [newItem, ...data];
      await supabase.from('site_settings').upsert({ id: 'ai_teaching_list', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      setDialogOpen(false);
      showSuccess('Dokumen tersimpan!');
    } catch (error) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const cleanText = (text: string) => text.replace(/[#*]/g, '').trim();

  const renderTable = (text: string) => {
    const lines = text.split('\n').filter(l => l.includes('|'));
    if (lines.length === 0) return null;
    const headers = lines[0].trim().replace(/^\||\|$/g, '').split('|').map(h => cleanText(h));
    const rows = lines.slice(1).filter(l => !l.includes('---')).map(r => {
      const cells = r.trim().replace(/^\||\|$/g, '').split('|').map(c => cleanText(c));
      return cells.filter((_, i) => i < headers.length);
    });
    return (
      <div className="my-4 border border-black overflow-hidden">
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

  const renderIdentityTable = (item: AITeachingItem) => {
    const schoolName = settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || "Si@Kad";
    const year = item.tahun_pelajaran || settings.tahun_pelajaran?.active_year || "2024/2025";
    const semester = item.semester || settings.tahun_pelajaran?.semester || "Ganjil";
    const teacher = getTeacherForClass(item.fase);
    const materiList = Array.isArray(item.materi_pokok) ? item.materi_pokok.join(', ') : '-';
    const tanggalCetak = item.tanggal_cetak ? new Date(item.tanggal_cetak).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
    return (
      <div className="mb-4">
        <table className="w-full text-[10pt] border-collapse leading-tight">
          <tbody>
            <tr><td className="w-[180px] py-0.5">Satuan Pendidikan</td><td className="w-[10px] py-0.5">:</td><td className="py-0.5 font-bold">{schoolName}</td></tr>
            <tr><td className="py-0.5">Mata Pelajaran</td><td className="py-0.5">:</td><td className="py-0.5">{item.mata_pelajaran}</td></tr>
            <tr><td className="py-0.5">Kelas / Semester</td><td className="py-0.5">:</td><td className="py-0.5">{teacher.kelas} / {semester}</td></tr>
            <tr><td className="py-0.5">Materi Pokok</td><td className="py-0.5">:</td><td className="py-0.5 font-medium">{materiList}</td></tr>
            <tr><td className="py-0.5">Alokasi Waktu</td><td className="py-0.5">:</td><td className="py-0.5">{item.alokasi_waktu}</td></tr>
            {(item.jenis_dokumen === 'modul_ajar' || item.jenis_dokumen === 'rpp_rpm') && item.pertemuan && (
              <tr><td className="py-0.5">Pertemuan</td><td className="py-0.5">:</td><td className="py-0.5">{item.pertemuan}</td></tr>
            )}
            <tr><td className="py-0.5">Tahun Pelajaran</td><td className="py-0.5">:</td><td className="py-0.5">{year}</td></tr>
            <tr><td className="py-0.5">Tanggal Cetak</td><td className="py-0.5">:</td><td className="py-0.5 font-bold">{tanggalCetak}</td></tr>
            <tr><td className="py-0.5">Nama Guru</td><td className="py-0.5">:</td><td className="py-0.5 font-bold">{teacher.nama}</td></tr>
          </tbody>
        </table>
        <div className="border-b border-black mt-2"></div>
      </div>
    );
  };

  if (previewItem) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white">
        <div className="sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md">
          <Button variant="ghost" onClick={() => setPreviewItem(null)} className="font-bold text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-400 italic hidden sm:block">Margin: 2cm (Atas, Bawah, Kiri, Kanan)</p>
            <Button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 font-bold shadow-lg">
              <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
            </Button>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-12 overflow-y-auto print:p-0 print:overflow-visible">
          <div id="print-area-root" className="mx-auto print:w-full">
            {previewItem.hasil.split('[PAGE_BREAK]').filter(p => p.trim() !== '').map((page, i, arr) => {
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
                  className={`bg-white mx-auto shadow-2xl print:shadow-none print:m-0 print:p-0 print:w-full print:border-none ${!isLastPage ? 'break-after-page mb-10' : ''} flex flex-col`} 
                  style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    padding: '2cm', 
                    boxSizing: 'border-box',
                    position: 'relative'
                  }}
                >
                  {!isCover && <KopSurat />}
                  
                  {isCover ? (
                    <div className="flex flex-col h-full justify-between">
                      <div className="flex-1 flex flex-col items-center justify-center text-center whitespace-pre-wrap font-serif text-[11pt] leading-relaxed text-gray-900">
                        {settings.identitas_madrasah?.logo_url && (<img src={settings.identitas_madrasah.logo_url} alt="Logo" className="w-32 h-32 mb-12 mx-auto object-contain" />)}
                        {mainCoverContent.split('\n\n').map((block, idx) => (<p key={idx} className="mb-4">{cleanText(block)}</p>))}
                      </div>
                      <div className="flex flex-col items-center">
                        {authorContent && (
                          <div className="text-center font-serif text-[11pt] mb-20">
                            <p className="font-bold mb-2">Disusun Oleh:</p>
                            {authorContent.split('\n').map((line, idx) => (<p key={idx}>{cleanText(line)}</p>))}
                          </div>
                        )}
                        <div className="w-full text-center font-serif border-t-2 border-black pt-4">
                          <p className="text-[14pt] font-bold uppercase leading-tight">{settings.identitas_madrasah?.nama_madrasah || settings.general?.school_name || "Si@Kad"}</p>
                          <p className="text-[12pt] font-bold leading-tight">TAHUN PELAJARAN {previewItem.tahun_pelajaran || settings.tahun_pelajaran?.active_year || "2024/2025"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className={`whitespace-pre-wrap font-serif text-[11pt] leading-relaxed text-gray-900 text-justify flex-1`}>
                        {isTable && renderIdentityTable(previewItem)}
                        {pageContent.split('\n\n').map((block, idx) => block.includes('|') ? (<div key={idx}>{renderTable(block)}</div>) : (<p key={idx} className="mb-4">{cleanText(block)}</p>))}
                      </div>
                      {isLastPage && (
                        <div className="mt-8">
                          <PenandatanganDokumen targetKelas={previewItem.fase} tanggalCetak={previewItem.tanggal_cetak} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              size: A4; 
              margin: 2cm !important; 
            }
            html, body { 
              height: auto; 
              background: white !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
            .print\\:hidden { display: none !important; }
            .break-after-page { 
              page-break-after: always; 
              break-after: page;
              display: block;
            }
            #print-area-root { 
              width: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
            #print-area-root > div { 
              box-shadow: none !important; 
              border: none !important; 
              width: 100% !important; 
              min-height: 0 !important;
              height: auto !important;
              padding: 0 !important; 
              margin: 0 !important;
              page-break-inside: auto;
            }
            .mb-4, .mb-6, .mt-8 { margin-bottom: 1rem !important; margin-top: 1rem !important; }
          }
        ` }} />
      </div>
    );
  }

  return (
    <AdminLayout title="AI Teaching Assistant">
      {/* Materi dan Tanggal Display - Baru */}
      <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-teal-50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Materi Hari Ini</p>
                <h3 className="text-xl font-black text-gray-900">Shalat Jumat</h3>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-sm">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Hari</p>
                <p className="text-lg font-black text-emerald-600">{dayName}</p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Tanggal</p>
                <p className="text-lg font-bold text-gray-900">{formattedDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Cari topik..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl bg-white border-0 shadow-sm" />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48 rounded-xl bg-white border-0 shadow-sm"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {dokumenTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setFormData({ jenis_dokumen: 'modul_ajar', mata_pelajaran: 'Al-Quran Hadits', fase: 'Fase A - Kelas 1', topik: '', materi_pokok: [], alokasi_waktu: '2 × 35 menit', pertemuan: '', hasil: '', tanggal_cetak: new Date().toISOString().split('T')[0] }); setDialogOpen(true); }} className="bg-emerald-600 text-white rounded-xl font-bold shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Buat Baru
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredData.map((item) => {
            const info = dokumenTypes.find(d => d.value === item.jenis_dokumen) || dokumenTypes[0];
            const formatTanggal = (tanggal: string) => {
              if (!tanggal) return '';
              const date = new Date(tanggal);
              return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            };
            return (
              <Card key={item.id} className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-all group">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${info.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}><info.icon className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                    <Button variant="ghost" size="sm" onClick={() => { if(confirm('Hapus?')) { const nl = data.filter(d => d.id !== item.id); supabase.from('site_settings').upsert({ id: 'ai_teaching_list', value: nl }).then(() => setData(nl)); } }} className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">{info.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{item.fase}</Badge>
                    {item.tahun_pelajaran && <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{item.tahun_pelajaran}</Badge>}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{item.mata_pelajaran}</h3>
                  {item.materi_pokok && item.materi_pokok.length > 0 && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                      <span className="font-medium text-gray-700">Materi: </span>
                      {item.materi_pokok.join(', ')}
                    </p>
                  )}
                  {(item.tanggal_cetak || item.created_at) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {formatTanggal(item.tanggal_cetak || item.created_at)}
                    </p>
                  )}
                  <Button variant="outline" className="w-full rounded-xl font-bold mt-3" onClick={() => setPreviewItem(item)}>
                    <Eye className="w-4 h-4 mr-2" /> Lihat & Cetak
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[calc(100dvh-40px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Konfigurasi Dokumen
              <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="ml-auto text-purple-600 border-purple-100 rounded-lg">
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} Generate
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Jenis Dokumen</label>
                <Select value={formData.jenis_dokumen} onValueChange={(v) => setFormData({...formData, jenis_dokumen: v})}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>{dokumenTypes.map(d => <SelectItem key={d.value} value={d.value}>{d.fullLabel}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Mata Pelajaran</label>
                <Select value={formData.mata_pelajaran} onValueChange={(v) => setFormData({...formData, mata_pelajaran: v, materi_pokok: []})}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">{MATA_PELAJARAN.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Fase dan Kelas</label>
                <Select value={formData.fase} onValueChange={(v) => setFormData({...formData, fase: v, materi_pokok: []})}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>{FASE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Alokasi Waktu</label>
                <Input value={formData.alokasi_waktu} onChange={(e) => setFormData({...formData, alokasi_waktu: e.target.value})} className="rounded-xl h-12" />
              </div>
            </div>
            {(formData.jenis_dokumen === 'modul_ajar' || formData.jenis_dokumen === 'rpp_rpm') && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Pertemuan Ke-</label>
                <Input 
                  value={formData.pertemuan} 
                  onChange={(e) => setFormData({...formData, pertemuan: e.target.value})} 
                  className="rounded-xl h-12" 
                  placeholder="Contoh: 1, 2, 3, dst." 
                />
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Tanggal Cetak</label>
                <Input 
                  type="date" 
                  value={formData.tanggal_cetak} 
                  onChange={(e) => setFormData({...formData, tanggal_cetak: e.target.value})} 
                  className="rounded-xl h-12" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Topik</label>
                <Input value={formData.topik} onChange={(e) => setFormData({...formData, topik: e.target.value})} className="rounded-xl h-12" placeholder="Masukkan topik pembelajaran..." />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-emerald-600 uppercase">Pilih Materi Pokok (Dari Bedah CP)</label>
              <Card className="border-dashed border-2 bg-gray-50/50">
                <ScrollArea className="h-[150px] p-4">
                  {availableMateri.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableMateri.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm">
                          <Checkbox id={`materi-${idx}`} checked={formData.materi_pokok.includes(m.materi_pokok)} onCheckedChange={() => toggleMateri(m.materi_pokok)} />
                          <label htmlFor={`materi-${idx}`} className="text-xs font-medium cursor-pointer">{m.materi_pokok}</label>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-gray-400 text-center py-4">Data Bedah CP tidak ditemukan.</p>}
                </ScrollArea>
              </Card>
            </div>
            {formData.hasil && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Hasil Preview</label>
                <Textarea value={formData.hasil} onChange={(e) => setFormData({...formData, hasil: e.target.value})} className="min-h-[250px] rounded-xl text-[10pt] font-mono bg-gray-50 p-4" />
              </div>
            )}
            <Button onClick={handleSave} disabled={isSaving || !formData.hasil} className="w-full bg-emerald-600 text-white rounded-xl h-14 font-bold shadow-xl">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} Simpan Dokumen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AITeaching;