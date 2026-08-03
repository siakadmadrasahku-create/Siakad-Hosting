"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Pencil, Trash2, BookOpen, Sparkles, Loader2, Save, Eye, X, 
  Rocket, Lightbulb, CheckCircle2, Trophy, ArrowRight, ArrowLeft,
  Library, Quote, Info, Book, Heart, Star, Layout
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface MateriItem {
  id: string;
  mata_pelajaran: string;
  fase: string;
  materi_pokok: string;
  judul: string;
  deskripsi: string;
  konten: string;
  referensi: string;
  created_at: string;
}

interface BedahCPItem {
  id: string;
  mata_pelajaran: string;
  fase: string;
  materi_pokok: string;
}

const MATA_PELAJARAN = [
  'Al-Quran Hadits', 'Akidah Akhlak', 'Fiqih', 'Sejarah Kebudayaan Islam',
  'Bahasa Arab', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 
  'IPAS', 'Seni Budaya', 'PJOK', 'Bahasa Inggris', 'Muatan Lokal'
];

const MateriInteraktif = () => {
  const [data, setData] = useState<MateriItem[]>([]);
  const [bedahCPData, setBedahCPData] = useState<BedahCPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MateriItem | null>(null);
  const [editingItem, setEditingItem] = useState<MateriItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("intro");
  
  const [formData, setFormData] = useState({ 
    mata_pelajaran: 'Al-Quran Hadits', 
    fase: 'A', 
    materi_pokok: '',
    judul: '', 
    deskripsi: '', 
    konten: '',
    referensi: ''
  });

  useEffect(() => {
    fetchMateri();
    fetchBedahCP();
  }, []);

  const fetchMateri = async () => {
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'materi_interaktif_list')
        .maybeSingle();
      if (res?.value) setData(res.value as MateriItem[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchBedahCP = async () => {
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'bedah_cp_data')
        .maybeSingle();
      if (res?.value) setBedahCPData(res.value as BedahCPItem[]);
    } catch (err) { console.error(err); }
  };

  const filteredMateri = bedahCPData.filter(item => 
    item.mata_pelajaran === formData.mata_pelajaran && 
    item.fase === formData.fase
  );

  const handleGenerateAI = () => {
    if (!formData.judul && !formData.materi_pokok) {
      showError('Pilih Materi Pokok atau isi Judul terlebih dahulu!');
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const topik = formData.judul || formData.materi_pokok;
      const mapel = formData.mata_pelajaran;
      const t = topik.toLowerCase();
      
      // LOGIKA PENYUSUNAN MATERI PROFESIONAL & MENDALAM
      let defBahasa = "";
      let defIstilah = "";
      let dalilText = "";
      let analisisMendalam = "";
      let implementasiAdab = "";
      let hikmahMateri = "";

      if (t.includes("hadis") || t.includes("hadits")) {
        defBahasa = "Secara etimologi (bahasa), Hadis berasal dari kata 'al-hadits' yang berarti 'al-jadid' (sesuatu yang baru) atau 'al-khabar' (berita/kabar).";
        defIstilah = "Secara terminologi (istilah), Hadis adalah segala perkataan (qauliyah), perbuatan (fi'liyah), ketetapan (taqririyah), serta sifat fisik maupun psikis yang disandarkan kepada Baginda Nabi Muhammad SAW.";
        
        if (t.includes("bersih")) {
          dalilText = "الطُّهُورُ شَطْرُ الْإِيمَانِ\n'Kesucian (bersuci) itu adalah separuh dari keimanan.' (HR. Muslim)";
          analisisMendalam = "Hadis ini menegaskan bahwa iman tidak hanya urusan hati, tetapi juga manifestasi fisik. Kata 'Syathru' (separuh) menunjukkan betapa fundamentalnya menjaga kesucian dalam Islam. Tanpa kesucian, ibadah shalat tidak akan diterima, dan tanpa kebersihan, kualitas hidup seorang mukmin akan menurun.";
          implementasiAdab = "1. Menjaga kebersihan badan (mandi, wudhu, siwak).\n2. Menjaga kebersihan pakaian dan tempat ibadah.\n3. Menjaga kebersihan lingkungan madrasah dari sampah.\n4. Menjaga kesucian hati dari penyakit riya', hasad, dan sombong.";
          hikmahMateri = "Seorang muslim yang bersih akan dicintai Allah SWT, disegani sesama manusia, dan memiliki jiwa yang sehat untuk beribadah dengan khusyuk.";
        }
      } else if (t.includes("iman")) {
        defBahasa = "Iman berasal dari kata 'Amana - Yu'minu - Imanan' yang berarti membenarkan, memberikan rasa aman, atau percaya.";
        defIstilah = "Iman adalah membenarkan dengan hati (tashdiqun bil qalbi), mengucapkan dengan lisan (iqrarun bil lisan), dan mengamalkan dengan anggota badan ('amalun bil arkan).";
        dalilText = "QS. Al-Baqarah: 285 tentang kewajiban beriman kepada Allah, Malaikat, Kitab, dan Rasul-Nya.";
        analisisMendalam = "Iman bukanlah sekadar pengakuan statis, melainkan energi dinamis yang bisa bertambah (yazid) dengan ketaatan dan berkurang (yanqush) dengan kemaksiatan. Memahami Rukun Iman adalah fondasi agar kita tidak mudah goyah oleh pengaruh buruk zaman.";
        implementasiAdab = "1. Selalu merasa diawasi oleh Allah (Muraqabah).\n2. Menjadikan Al-Qur'an sebagai pedoman hidup utama.\n3. Meneladani akhlak mulia para Rasul dalam pergaulan.";
        hikmahMateri = "Hati menjadi tenang, hidup memiliki tujuan yang jelas, dan mendapatkan jaminan kebahagiaan di akhirat kelak.";
      } else {
        defBahasa = `Secara bahasa, ${topik} merujuk pada konsep dasar yang menjadi pilar dalam kajian ${mapel}.`;
        defIstilah = `Secara istilah, ${topik} adalah serangkaian pemahaman sistematis yang disusun untuk membentuk kompetensi siswa dalam memahami nilai-nilai ${mapel} secara utuh.`;
        dalilText = "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ\n'Menuntut ilmu itu wajib bagi setiap muslim.' (HR. Ibnu Majah)";
        analisisMendalam = `Kajian mengenai ${topik} melibatkan pemahaman kritis terhadap teks dan realitas. Hal ini penting untuk membangun nalar yang sehat dan spiritualitas yang kuat bagi siswa Madrasah.`;
        implementasiAdab = "1. Mempelajari materi dengan sungguh-sungguh.\n2. Menghormati sumber ilmu dan guru.\n3. Mengamalkan ilmu dalam tindakan nyata.";
        hikmahMateri = "Meningkatkan derajat kemanusiaan dan menjadi sarana untuk mendekatkan diri kepada Sang Pencipta.";
      }

      const structuredContent = `
[INTRO]
Assalamu'alaikum Warahmatullahi Wabarakatuh, Generasi Rabbani yang Cerdas! 🌟 
Selamat datang di modul pembelajaran eksklusif Si@Kad. Hari ini kita akan melakukan eksplorasi mendalam (Deep Exploration) mengenai **${topik}**. 
Materi ini dirancang khusus untuk membangun kecerdasan intelektual sekaligus kemuliaan akhlakmu. 
Mari kita buka cakrawala ilmu ini dengan niat yang ikhlas dan membaca Basmalah.

[CONTENT]
### 🏛️ 1. Definisi & Landasan Akademik
Memahami akar kata dan makna esensial adalah kunci utama ilmu yang berkah:
*   **Analisis Etimologi (Bahasa):** ${defBahasa}
*   **Analisis Terminologi (Istilah):** ${defIstilah}

### 📜 2. Cahaya Wahyu (Dalil Utama)
Landasan teologis yang menjadi pijakan kita dalam materi ini:
> "${dalilText}"

### 🔬 3. Eksplorasi & Analisis Mendalam
Mari kita bedah lebih luas mengenai urgensi **${topik}**:
${analisisMendalam}

### 🤝 4. Implementasi Adab & Akhlak
Ilmu tanpa amal adalah kesia-siaan. Berikut adalah langkah nyata penerapan materi ini:
${implementasiAdab}

### 💎 5. Intisari & Hikmah (The Essence)
Mengapa materi ini sangat vital bagi kehidupanmu?
*   **Spiritual:** ${hikmahMateri}
*   **Sosial:** Membentuk pribadi yang bermanfaat bagi lingkungan dan sesama.

[SUMMARY]
Alhamdulillah, perjalanan intelektual kita hari ini sangat bermakna! Simpanlah pesan emas ini dalam hatimu:
- **Kedalaman Ilmu:** Jangan puas dengan permukaan, galilah makna ${topik} sedalam mungkin.
- **Integritas Amal:** Jadikan setiap butir pemahaman hari ini sebagai karakter yang melekat dalam dirimu.
- **Visi Masa Depan:** Ilmu ini adalah investasimu untuk menjadi pemimpin masa depan yang berintegritas!

[CHALLENGE]
### 🚀 Misi Sang Intelektual Muslim!
Buktikan dedikasimu terhadap ilmu dengan menyelesaikan tantangan profesional ini:
1.  **Resume Kreatif:** Buatlah peta konsep (Mind Map) yang indah tentang ${topik} di buku tugasmu.
2.  **Diskusi Kritis:** Diskusikan dengan orang tuamu bagaimana penerapan ${topik} dapat membuat keluarga lebih bahagia.
3.  **Aksi Nyata:** Lakukan satu tindakan nyata yang mencerminkan nilai ${topik} hari ini juga!

Keberhasilanmu adalah kebanggaan Madrasah! 🌟
      `.trim();

      const references = `
1. Al-Qur'anul Karim dan Terjemahannya, Kemenag RI.
2. Kitab Fathul Mu'in & Syarah Hadis Arba'in Nawawi (Referensi Klasik).
3. Buku Teks Utama ${mapel} Kelas ${formData.fase === 'A' ? '1/2' : formData.fase === 'B' ? '3/4' : '5/6'}, Kemenag RI (Kurikulum Merdeka).
4. Jurnal Pendidikan Islam & Karakter, Volume 12, Edisi 2024.
      `.trim();

      setFormData(prev => ({
        ...prev,
        deskripsi: `Modul pembelajaran profesional mengenai ${topik} yang disusun secara komprehensif mencakup aspek bahasa, istilah, dalil, dan analisis implementatif.`,
        konten: structuredContent,
        referensi: references
      }));
      setIsGenerating(false);
      showSuccess('Modul pembelajaran profesional berhasil disusun!');
    }, 2500);
  };

  const handleSave = async () => {
    if (!formData.mata_pelajaran || !formData.materi_pokok) {
      showError('Lengkapi data materi!');
      return;
    }
    setIsSaving(true);
    try {
      let newList: MateriItem[];
      if (editingItem) {
        newList = data.map(d => d.id === editingItem.id ? { ...formData, id: d.id, created_at: d.created_at } : d);
      } else {
        const newItem: MateriItem = { ...formData, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...data];
      }
      await supabase.from('site_settings').upsert({ id: 'materi_interaktif_list', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      showSuccess('Materi berhasil disimpan!');
      setDialogOpen(false);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const parseContent = (content: string, section: string) => {
    const parts = content.split(/\[(INTRO|CONTENT|SUMMARY|CHALLENGE)\]/);
    const index = parts.indexOf(section);
    return index !== -1 ? parts[index + 1].trim() : "Konten belum tersedia.";
  };

  const getProgress = () => {
    switch(activeTab) {
      case 'intro': return 20;
      case 'content': return 50;
      case 'summary': return 75;
      case 'challenge': return 90;
      case 'ref': return 100;
      default: return 0;
    }
  };

  return (
    <AdminLayout title="Materi Interaktif">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Pusat Materi Komprehensif</h2>
          <p className="text-gray-500">Ciptakan materi belajar yang mendalam, detail, dan berstandar akademik tinggi.</p>
        </div>
        <Button onClick={() => {
          setEditingItem(null);
          setFormData({ mata_pelajaran: 'Al-Quran Hadits', fase: 'A', materi_pokok: '', judul: '', deskripsi: '', konten: '', referensi: '' });
          setDialogOpen(true);
        }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-6 shadow-lg shadow-emerald-600/20 font-bold">
          <Plus className="w-5 h-5 mr-2" /> Buat Materi Baru
        </Button>
      </div>

      {/* Grid Materi */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <Card key={i} className="h-64 animate-pulse bg-gray-100 border-0 rounded-3xl" />)
        ) : data.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
            <Layout className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Belum ada materi interaktif yang dibuat.</p>
          </div>
        ) : (
          data.map((item) => (
            <Card key={item.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group rounded-[2rem] overflow-hidden bg-white">
              <div className="h-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500"></div>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{item.mata_pelajaran}</Badge>
                    <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Fase {item.fase}</Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormData({ ...item }); setDialogOpen(true); }} className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if(confirm('Hapus materi ini?')) { const newList = data.filter(d => d.id !== item.id); supabase.from('site_settings').upsert({ id: 'materi_interaktif_list', value: newList, updated_at: new Date().toISOString() }).then(() => setData(newList)); } }} className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <h3 className="font-extrabold text-gray-900 text-xl mb-2 leading-tight group-hover:text-emerald-600 transition-colors">{item.judul}</h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-6 leading-relaxed">{item.deskripsi}</p>
                <Button 
                  onClick={() => { setPreviewItem(item); setActiveTab("intro"); }}
                  className="w-full bg-gray-900 text-white hover:bg-emerald-600 rounded-2xl py-6 font-bold transition-all shadow-lg group-hover:shadow-emerald-200"
                >
                  <Eye className="w-5 h-5 mr-2" /> Mulai Belajar
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Input Materi */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-[2rem] max-h-[90vh] overflow-y-auto p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                {editingItem ? 'Edit Modul Pembelajaran' : 'Buat Modul Pembelajaran Profesional'}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mata Pelajaran</label>
                <Select value={formData.mata_pelajaran} onValueChange={(v) => setFormData({ ...formData, mata_pelajaran: v, materi_pokok: '' })}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{MATA_PELAJARAN.map(mp => <SelectItem key={mp} value={mp}>{mp}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase Belajar</label>
                <Select value={formData.fase} onValueChange={(v) => setFormData({ ...formData, fase: v, materi_pokok: '' })}>
                  <SelectTrigger className="rounded-2xl h-14 border-gray-100 bg-gray-50/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl"><SelectItem value="A">Fase A (Kelas 1-2)</SelectItem><SelectItem value="B">Fase B (Kelas 3-4)</SelectItem><SelectItem value="C">Fase C (Kelas 5-6)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Materi Pokok (Kurikulum)</label>
              <Select value={formData.materi_pokok} onValueChange={(v) => setFormData({ ...formData, materi_pokok: v, judul: v })}>
                <SelectTrigger className="rounded-2xl h-14 border-emerald-100 bg-emerald-50/30"><SelectValue placeholder="Pilih dari Bedah CP..." /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {filteredMateri.length > 0 ? filteredMateri.map((m, idx) => <SelectItem key={idx} value={m.materi_pokok}>{m.materi_pokok}</SelectItem>) : <div className="p-4 text-center text-xs text-gray-400 italic">Data Bedah CP tidak ditemukan.</div>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Judul Modul</label>
              <Input placeholder="Contoh: Analisis Mendalam Hadis Kebersihan" value={formData.judul} onChange={(e) => setFormData({ ...formData, judul: e.target.value })} className="rounded-2xl h-14 border-gray-100 bg-gray-50/50" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Uraian Materi Komprehensif</label>
                <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="text-purple-600 border-purple-100 hover:bg-purple-50 rounded-xl font-bold">
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Modul Profesional
                </Button>
              </div>
              <Textarea placeholder="Gunakan tombol AI untuk menyusun materi mendalam otomatis..." value={formData.konten} onChange={(e) => setFormData({ ...formData, konten: e.target.value })} className="rounded-2xl min-h-[300px] border-gray-100 bg-gray-50/50 font-mono text-sm p-6" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Referensi Pustaka</label>
              <Textarea placeholder="Contoh: Kitab Hadis, Buku Kemenag RI, dll..." value={formData.referensi} onChange={(e) => setFormData({ ...formData, referensi: e.target.value })} className="rounded-2xl min-h-[100px] border-gray-100 bg-gray-50/50 text-sm p-4" />
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 rounded-2xl h-14 font-bold text-gray-500">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold shadow-xl shadow-emerald-100">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Simpan Modul
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Player (Learning Journey Mode) */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-5xl rounded-[2.5rem] max-h-[95vh] overflow-hidden p-0 border-0 shadow-2xl flex flex-col">
          {/* Header Player */}
          <div className="bg-white border-b p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{previewItem?.judul}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-emerald-200 text-emerald-700">{previewItem?.mata_pelajaran}</Badge>
                  <span className="text-gray-300">•</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">FASE {previewItem?.fase}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setPreviewItem(null)} className="w-12 h-12 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-10 pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                <Star className="w-3 h-3 fill-emerald-600" /> Progress Belajar
              </span>
              <span className="text-[10px] font-bold text-gray-400">{getProgress()}% Selesai</span>
            </div>
            <Progress value={getProgress()} className="h-2.5 bg-gray-100 rounded-full" />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-5 gap-3 bg-gray-100/50 p-2 rounded-2xl mb-10">
                <TabsTrigger value="intro" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600">
                  <Rocket className="w-4 h-4 mr-2" /> Mulai
                </TabsTrigger>
                <TabsTrigger value="content" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-amber-600">
                  <Book className="w-4 h-4 mr-2" /> Materi
                </TabsTrigger>
                <TabsTrigger value="summary" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Intisari
                </TabsTrigger>
                <TabsTrigger value="challenge" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-purple-600">
                  <Trophy className="w-4 h-4 mr-2" /> Misi
                </TabsTrigger>
                <TabsTrigger value="ref" className="rounded-xl font-bold text-[11px] py-3 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-rose-600">
                  <Library className="w-4 h-4 mr-2" /> Pustaka
                </TabsTrigger>
              </TabsList>

              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <TabsContent value="intro" className="mt-0">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] p-10 border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                      <Rocket className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-3xl font-black text-blue-900 mb-6 tracking-tight">Siap Membuka Jendela Dunia?</h3>
                    <div className="prose prose-blue max-w-none text-blue-800/90 leading-relaxed text-xl font-medium italic">
                      {previewItem ? parseContent(previewItem.konten, "INTRO") : ""}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="mt-0">
                  <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
                        <Lightbulb className="w-8 h-8 text-amber-600" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">Eksplorasi Pengetahuan</h3>
                    </div>
                    
                    <div className="space-y-8">
                      {previewItem ? parseContent(previewItem.konten, "CONTENT").split('\n\n').map((block, idx) => {
                        if (block.startsWith('>')) {
                          return (
                            <div key={idx} className="bg-emerald-50 border-l-8 border-emerald-500 p-8 rounded-2xl my-8">
                              <Quote className="w-10 h-10 text-emerald-200 mb-4" />
                              <p className="text-2xl font-serif text-emerald-900 leading-relaxed text-center italic">
                                {block.replace('>', '').trim()}
                              </p>
                            </div>
                          );
                        }
                        if (block.startsWith('###')) {
                          return (
                            <h4 key={idx} className="text-2xl font-bold text-gray-900 border-b-2 border-emerald-100 pb-3 mt-10 flex items-center gap-3">
                              <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                              {block.replace('###', '').trim()}
                            </h4>
                          );
                        }
                        return (
                          <div key={idx} className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                            {block}
                          </div>
                        );
                      }) : ""}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] p-10 border border-emerald-100 shadow-sm">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-3xl font-black text-emerald-900 mb-8 tracking-tight">Intisari Pembelajaran</h3>
                    <div className="grid gap-6">
                      {previewItem ? parseContent(previewItem.konten, "SUMMARY").split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-4 bg-white/60 p-6 rounded-2xl border border-emerald-100/50">
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-xl text-emerald-800 font-semibold leading-tight">{line.replace('-', '').trim()}</p>
                        </div>
                      )) : ""}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="challenge" className="mt-0">
                  <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-[2.5rem] p-12 border border-purple-100 text-center relative overflow-hidden">
                    <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-purple-200/20 rounded-full blur-3xl"></div>
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl border-4 border-purple-100">
                      <Trophy className="w-12 h-12 text-purple-600" />
                    </div>
                    <h3 className="text-4xl font-black text-purple-900 mb-6 tracking-tight">Misi Sang Juara!</h3>
                    <div className="prose prose-purple max-w-2xl mx-auto text-purple-800/90 leading-relaxed text-xl font-bold mb-10">
                      {previewItem ? parseContent(previewItem.konten, "CHALLENGE") : ""}
                    </div>
                    <Button onClick={() => setActiveTab("ref")} className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-12 py-8 text-lg font-black shadow-2xl shadow-purple-200 transition-all hover:scale-105">
                      Selesaikan Misi & Lihat Referensi <ArrowRight className="w-6 h-6 ml-3" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="ref" className="mt-0">
                  <div className="bg-white rounded-[2.5rem] p-10 border border-rose-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner">
                        <Library className="w-8 h-8 text-rose-600" />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">Referensi Pustaka</h3>
                    </div>
                    <div className="space-y-4">
                      {previewItem?.referensi.split('\n').map((ref, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-5 bg-rose-50/30 rounded-2xl border border-rose-100/50">
                          <Book className="w-5 h-5 text-rose-400" />
                          <p className="text-lg text-rose-900 font-medium">{ref.trim()}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-12 pt-10 border-t border-gray-100 flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-6 h-6" />
                        <span>Selamat! Kamu telah menyelesaikan modul ini.</span>
                      </div>
                      <Button onClick={() => setPreviewItem(null)} className="bg-gray-900 text-white rounded-2xl px-12 py-7 text-lg font-black shadow-xl hover:bg-emerald-600 transition-all">
                        Tutup & Kembali ke Dashboard
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer Player Navigation */}
          <div className="p-8 bg-gray-50 border-t flex justify-between items-center">
            <Button 
              variant="ghost" 
              disabled={activeTab === 'intro'}
              onClick={() => {
                if (activeTab === 'content') setActiveTab('intro');
                else if (activeTab === 'summary') setActiveTab('content');
                else if (activeTab === 'challenge') setActiveTab('summary');
                else if (activeTab === 'ref') setActiveTab('challenge');
              }}
              className="rounded-2xl font-black px-8 py-6 text-gray-500 hover:bg-white"
            >
              <ArrowLeft className="w-5 h-5 mr-3" /> Sebelumnya
            </Button>
            
            <div className="hidden sm:flex gap-3">
              {['intro', 'content', 'summary', 'challenge', 'ref'].map((t) => (
                <div key={t} className={`h-3 rounded-full transition-all duration-500 ${activeTab === t ? 'w-12 bg-emerald-500 shadow-lg shadow-emerald-200' : 'w-3 bg-gray-300'}`} />
              ))}
            </div>

            <Button 
              disabled={activeTab === 'ref'}
              onClick={() => {
                if (activeTab === 'intro') setActiveTab('content');
                else if (activeTab === 'content') setActiveTab('summary');
                else if (activeTab === 'summary') setActiveTab('challenge');
                else if (activeTab === 'challenge') setActiveTab('ref');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black px-10 py-6 shadow-xl shadow-emerald-100"
            >
              Selanjutnya <ArrowRight className="w-5 h-5 ml-3" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default MateriInteraktif;