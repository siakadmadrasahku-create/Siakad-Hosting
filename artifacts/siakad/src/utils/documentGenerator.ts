import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';

export interface DocumentConfig {
  title: string;
  content: string;
  schoolName?: string;
  date?: string;
  footer?: string;
  type?: 'pamflet' | 'sertifikat' | 'surat' | 'laporan' | 'berita_acara' | 'modul_ajar';
}

/**
 * Generate PDF document dengan tema sekolah
 */
export async function generatePDF(config: DocumentConfig): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Header dengan logo dan nama sekolah
  if (config.schoolName) {
    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94); // Green color
    doc.text(config.schoolName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }

  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(config.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Separator line
  doc.setDrawColor(34, 197, 94);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;

  // Content
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(config.content, pageWidth - 30);
  doc.text(lines, 15, yPosition);

  // Footer
  if (config.footer || config.date) {
    const footerY = pageHeight - 20;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (config.footer) {
      doc.text(config.footer, 15, footerY);
    }
    if (config.date) {
      doc.text(`${config.date}`, pageWidth - 15, footerY, { align: 'right' });
    }
  }

  return doc.output('blob');
}

/**
 * Generate Word document (.docx)
 */
export async function generateDocx(config: DocumentConfig): Promise<Blob> {
  const sections = [
    // Header
    new Paragraph({
      text: config.schoolName || 'Madrasah',
      style: 'Heading1',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: config.title,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      run: { bold: true, size: 28 }
    }),
    // Separator
    new Paragraph({
      border: {
        bottom: {
          color: '22C55E',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6
        }
      },
      spacing: { after: 400 }
    }),
    // Content
    new Paragraph({
      text: config.content,
      spacing: { after: 400, line: 360 }
    })
  ];

  // Footer
  if (config.date || config.footer) {
    sections.push(
      new Paragraph({
        spacing: { before: 400 },
        text: ''
      }),
      new Paragraph({
        text: config.footer || '',
        alignment: AlignmentType.LEFT
      }),
      new Paragraph({
        text: `${config.date || new Date().toLocaleDateString('id-ID')}`,
        alignment: AlignmentType.RIGHT
      })
    );
  }

  const doc = new Document({
    sections: [{
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Generate pamflet TKA dengan template
 */
export async function generatePamfletTKA(title: string, details: Record<string, string>): Promise<Blob> {
  const content = `
PENGUMUMAN
${title}

${Object.entries(details)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

Untuk informasi lebih lanjut, silakan hubungi bagian administrasi.
  `.trim();

  return generatePDF({
    title: 'PAMFLET PENERIMAAN SISWA BARU',
    schoolName: 'Madrasah Ibtidaiyah',
    content: content,
    date: new Date().toLocaleDateString('id-ID')
  });
}

/**
 * Generate sertifikat
 */
export async function generateSertifikat(nama: string, prestasi: string, tanggal: string): Promise<Blob> {
  const content = `
SERTIFIKAT PENGHARGAAN

Dengan bangga kami umumkan bahwa:

${nama}

Telah berhasil meraih prestasi luar biasa dalam:

${prestasi}

Semoga pencapaian ini menjadi motivasi untuk terus berkembang dan mencapai kesuksesan yang lebih tinggi.

Diberikan pada tanggal: ${tanggal}
  `.trim();

  return generatePDF({
    title: 'SERTIFIKAT PENGHARGAAN',
    schoolName: 'Madrasah Ibtidaiyah Terpadu',
    content: content,
    footer: 'Kepala Madrasah'
  });
}

/**
 * Generate laporan dalam format tabel
 */
export async function generateLaporan(judul: string, data: Record<string, string>[]): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(judul, pageWidth / 2, 15, { align: 'center' });

  const yPosition = 25;

  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    const rows = data.map(item => Object.values(item).map(v => String(v)));

    (doc as any).autoTable({
      head: [columns],
      body: rows,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 }
    });
  }

  return doc.output('blob');
}

/**
 * Download file blob
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ModulAjarActivities {
  tahap: string;
  waktu: string;
  kegiatan: string;
  integrasiNilaiCinta: string;
  tujuan: string;
}

export interface PenilaianAspek {
  aspek: string;
  teknik: string;
  instrumen: string;
  rubrik: string;
}

export interface ModulAjarConfig {
  namaMadrasah: string;
  mataPelajaran: string;
  faseKelasSemester: string;
  materiPokok: string;
  alokasiWaktu: string;
  pertemuan?: string;
  tahunPelajaran: string;
  penyusun?: string;
  nip?: string;
  capaianPembelajaran: string;
  tujuanPembelajaran: string[];
  kompetensiAwal: string;
  pemahamanBermakna: string;
  pertanyaanPemantik: string[];
  profilPancasila: string[];
  nilaiKBC: Record<string, string>;
  moderasiBeragama: string;
  keterampilanAbad21: string[];
  saranaPrasarana: string[];
  targetPeserta: string[];
  modelPembelajaran: string;
  pendekatanDeepLearning: string;
  kegiatanPembelajaran: ModulAjarActivities[] | {
    pendahuluan: string;
    inti: string;
    penutup: string;
  };
  penilaianSikap: PenilaianAspek;
  penilaianPengetahuan: PenilaianAspek;
  penilaianKeterampilan: PenilaianAspek;
  rubrikPenilaian: {
    sangaatBaik: string;
    baik: string;
    cukup: string;
    kurang: string;
  };
  kktp: string;
  pengayaanRemedial: string;
  refleksi: string;
  lampiran: string[];
}

/**
 * Generate Modul Ajar MI sesuai Kurikulum Merdeka - Format Komprehensif
 */
export async function generateModulAjar(config: ModulAjarConfig): Promise<Blob> {
  const content = `
# MODUL AJAR MI (MADRASAH IBTIDAIYAH)
## Sesuai Kurikulum Merdeka Belajar

## A. IDENTITAS MODUL AJAR

| Aspek | Keterangan |
|-------|------------|
| **Nama Madrasah** | ${config.namaMadrasah} |
| **Mata Pelajaran** | ${config.mataPelajaran} |
| **Fase/Kelas/Semester** | ${config.faseKelasSemester} |
| **Materi Pokok** | ${config.materiPokok} |
| **Alokasi Waktu** | ${config.alokasiWaktu} |
${config.pertemuan ? `| **Pertemuan** | ${config.pertemuan} |` : ''}
${config.tahunPelajaran ? `| **Tahun Pelajaran** | ${config.tahunPelajaran} |` : ''}
${config.penyusun ? `| **Nama Penyusun** | ${config.penyusun} |` : ''}
${config.nip ? `| **NIP** | ${config.nip} |` : ''}

## B. CAPAIAN PEMBELAJARAN (CP)

${config.capaianPembelajaran}

## C. TUJUAN PEMBELAJARAN (TP)

${config.tujuanPembelajaran.map((tp, i) => `${i + 1}. ${tp}`).join('\n')}

## D. KOMPETENSI AWAL PESERTA DIDIK

${config.kompetensiAwal}

## E. PROFIL PELAJAR PANCASILA & NILAI KURIKULUM BERBASIS CINTA (KBC)

### 1. Profil Pelajar Pancasila

| Dimensi | Indikator | Kegiatan Pembelajaran |
|---------|-----------|----------------------|
${config.profilPancasila.map(p => `| ${p.split(':')[0] || p} | ${p.split(':')[1] || 'Dimensi pengembangan'} | Terintegrasi dalam pembelajaran ${config.mataPelajaran} |`).join('\n')}

### 2. Nilai Kurikulum Berbasis Cinta (KBC)

${Object.entries(config.nilaiKBC).map(([k, v]) => `**${k}:** ${v}`).join('\n\n')}

### 3. Moderasi Beragama

${config.moderasiBeragama}

### 4. Keterampilan Abad ke-21

| Keterampilan | Indikator | Strategi Pengembangan |
|-------------|-----------|----------------------|
${config.keterampilanAbad21.map(k => `| ${k.split(':')[0] || k} | ${k.split(':')[1] || 'Pengembangan keterampilan'} | Melalui kegiatan kolaboratif dan proyek |`).join('\n')}

## F. PEMAHAMAN BERMAKNA

${config.pemahamanBermakna}

## G. PERTANYAAN PEMANTIK

${config.pertanyaanPemantik.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## H. SARANA DAN PRASARANA

| Jenis | Keterangan | Jumlah |
|-------|-----------|--------|
${config.saranaPrasarana.map(s => `| ${s.split(':')[0] || s} | ${s.split(':')[1] || 'Tersedia'} | Sesuai kebutuhan |`).join('\n')}

## I. TARGET PESERTA DIDIK

${config.targetPeserta.map(t => `- ${t}`).join('\n')}

## J. MODEL, METODE, DAN PENDEKATAN PEMBELAJARAN

- **Model Pembelajaran:** ${config.modelPembelajaran}
- **Metode yang Digunakan:** Discovery Learning, Cooperative Learning, Contextual Teaching Learning
- **Pendekatan Deep Learning:** ${config.pendekatanDeepLearning}

## K. KEGIATAN PEMBELAJARAN

### Tabel Rancangan Kegiatan Pembelajaran Terintegrasi

| No | Tahap | Waktu | Kegiatan Pembelajaran | Integrasi Nilai Cinta | Alat & Media | Tujuan |
|----|-------|-------|----------------------|----------------------|-------------|--------|
${Array.isArray(config.kegiatanPembelajaran) 
  ? config.kegiatanPembelajaran.map((k, idx) =>
      `| ${idx + 1} | ${k.tahap} | ${k.waktu} | ${k.kegiatan} | ${k.integrasiNilaiCinta} | Sesuai tersedia | ${k.tujuan} |`
    ).join('\n')
  : `| 1 | **Pendahuluan** | 10-15 menit | ${typeof config.kegiatanPembelajaran === 'object' && 'pendahuluan' in config.kegiatanPembelajaran ? config.kegiatanPembelajaran.pendahuluan : 'Doa, apersepsi, motivasi'} | Cinta Allah, Ilmu | Video/Gambar | Menciptakan suasana pembelajaran |
| 2 | **Inti** | 50-60 menit | ${typeof config.kegiatanPembelajaran === 'object' && 'inti' in config.kegiatanPembelajaran ? config.kegiatanPembelajaran.inti : 'Eksplorasi, kolaborasi, refleksi'} | Cinta Sesama, Ilmu | Buku, Alat Peraga | Mencapai tujuan pembelajaran |
| 3 | **Penutup** | 10-15 menit | ${typeof config.kegiatanPembelajaran === 'object' && 'penutup' in config.kegiatanPembelajaran ? config.kegiatanPembelajaran.penutup : 'Refleksi, penguatan, doa'} | Cinta Allah, Orang Tua | Jurnal | Memperkuat pemahaman |`
}

## L. PENILAIAN

### 1. Penilaian Sikap (Afektif)

| Aspek | Teknik Penilaian | Instrumen | Rubrik |
|-------|-----------------|-----------|--------|
| **${config.penilaianSikap.aspek || 'Akhlak/Karakter'}** | ${config.penilaianSikap.teknik || 'Observasi'} | ${config.penilaianSikap.instrumen || 'Jurnal Guru'} | **SB:** ${config.rubrikPenilaian.sangaatBaik}<br>**B:** ${config.rubrikPenilaian.baik}<br>**C:** ${config.rubrikPenilaian.cukup}<br>**K:** ${config.rubrikPenilaian.kurang} |

### 2. Penilaian Pengetahuan (Kognitif)

| Aspek | Teknik Penilaian | Instrumen | Rubrik |
|-------|-----------------|-----------|--------|
| **${config.penilaianPengetahuan.aspek || 'Pemahaman Konsep'}** | ${config.penilaianPengetahuan.teknik || 'Tes Tertulis'} | ${config.penilaianPengetahuan.instrumen || 'Soal Uraian'} | **SB:** ${config.rubrikPenilaian.sangaatBaik}<br>**B:** ${config.rubrikPenilaian.baik}<br>**C:** ${config.rubrikPenilaian.cukup}<br>**K:** ${config.rubrikPenilaian.kurang} |

### 3. Penilaian Keterampilan (Psikomotor)

| Aspek | Teknik Penilaian | Instrumen | Rubrik |
|-------|-----------------|-----------|--------|
| **${config.penilaianKeterampilan.aspek || 'Praktik & Proyek'}** | ${config.penilaianKeterampilan.teknik || 'Unjuk Kerja'} | ${config.penilaianKeterampilan.instrumen || 'Rubrik Proyek'} | **SB:** ${config.rubrikPenilaian.sangaatBaik}<br>**B:** ${config.rubrikPenilaian.baik}<br>**C:** ${config.rubrikPenilaian.cukup}<br>**K:** ${config.rubrikPenilaian.kurang} |

### Rubrik Penilaian 4 Level

| Level | Deskripsi | Nilai | Bobot |
|-------|-----------|-------|-------|
| **Sangat Baik (SB)** | Pencapaian sempurna, pemahaman mendalam, inisiatif tinggi | 4 | 90-100 |
| **Baik (B)** | Pencapaian baik, pemahaman cukup, partisipasi aktif | 3 | 80-89 |
| **Cukup (C)** | Pencapaian dasar, pemahaman terbatas, partisipasi minimal | 2 | 70-79 |
| **Kurang (K)** | Belum mencapai target, pemahaman sangat terbatas | 1 | 0-69 |

## M. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)

${config.kktp}

## N. PROGRAM TINDAK LANJUT

### Remedial (Bagi Peserta Didik yang Belum Tuntas)

Strategi:
- Pembelajaran ulang dengan metode berbeda
- Bimbingan individual atau kelompok kecil
- Tugas tambahan yang lebih sederhana
- Kolaborasi dengan orang tua

Kriteria Tuntas: Skor ≥ 70

### Pengayaan (Bagi Peserta Didik yang Sudah Tuntas)

Strategi:
- Tugas yang lebih kompleks dan menantang
- Proyek penelitian lebih mendalam
- Menjadi tutor bagi teman sebaya
- Pengembangan kreativitas melalui produk inovatif

Kriteria Pengayaan: Skor ≥ 80

## O. PENGAYAAN DAN REMEDIAL TERPERINCI

${config.pengayaanRemedial}

## P. REFLEKSI GURU DAN PESERTA DIDIK

### Refleksi untuk Guru:
${config.refleksi}

### Refleksi untuk Peserta Didik:
- Apa yang paling aku sukai dari pembelajaran hari ini?
- Nilai cinta mana yang paling mudah aku terapkan?
- Bagaimana aku akan mengamalkan pembelajaran ini di rumah?
- Saran untuk membuat pembelajaran lebih menarik

## Q. LAMPIRAN

${config.lampiran.map((l, i) => `${i + 1}. ${l}`).join('\n')}

---

**CATATAN PENTING:**
- Modul Ajar ini disusun sesuai Kurikulum Merdeka Madrasah Ibtidaiyah
- Fokus pada pengembangan karakter dan nilai-nilai islami
- Integrasi Profil Pelajar Pancasila, Moderasi Beragama, dan Keterampilan Abad ke-21
- Pembelajaran aktif dengan pendekatan berbasis proyek dan nilai-nilai cinta
- Asesmen holistik meliputi sikap, pengetahuan, dan keterampilan
- Siap digunakan sebagai panduan pembelajaran yang komprehensif
  `.trim();

  return generateDocx({
    title: `Modul Ajar ${config.mataPelajaran} - ${config.materiPokok}`,
    schoolName: config.namaMadrasah,
    content: content,
    type: 'modul_ajar',
    date: new Date().toLocaleDateString('id-ID')
  });
}

/**
 * Generate PROMES (Program Semester) MI sesuai Kurikulum Merdeka
 */
export async function generatePromes(config: PromesConfig): Promise<Blob> {
  const content = `
# PROGRAM SEMESTER (PROMES)
## Madrasah Ibtidaiyah (MI) - Kurikulum Merdeka Belajar

## A. IDENTITAS PROMES

| Aspek | Keterangan |
|-------|------------|
| **Satuan Pendidikan** | ${config.satuanPendidikan} |
| **Mata Pelajaran** | ${config.mataPelajaran} |
| **Kelas/Fase** | ${config.kelasFase} |
| **Semester** | ${config.semester} |
| **Tahun Pelajaran** | ${config.tahunPelajaran} |
| **Alokasi Waktu** | ${config.alokasiWaktu} |
| **Tanggal Pembuatan** | ${config.tanggalBuat || new Date().toLocaleDateString('id-ID')} |

## B. CAPAIAN PEMBELAJARAN (CP)

Capaian Pembelajaran (CP) mata pelajaran ${config.mataPelajaran} untuk ${config.kelasFase} adalah:

${config.cp?.map((cp, index) => `${index + 1}. ${cp}`).join('\n') || 'CP belum ditentukan'}

## C. ALUR TUJUAN PEMBELAJARAN (ATP)

| No | Tujuan Pembelajaran (TP) | Capaian Pembelajaran (CP) | Indikator Pencapaian |
|----|--------------------------|---------------------------|----------------------|
${config.atp?.map((atp, index) =>
  `| ${index + 1} | ${atp.tp} | ${atp.cp || 'CP ' + (index + 1)} | ${atp.indikator || 'Siswa mampu menunjukkan pemahaman dan penerapan konsep'} |`
).join('\n') || '| 1 | TP belum ditentukan | CP 1 | Indikator belum ditentukan |'}

## D. PEMETAAN MATERI MINGGUAN

| Minggu | Materi Pokok | Tujuan Pembelajaran | Alokasi Waktu | Kegiatan Pembelajaran |
|--------|--------------|---------------------|---------------|----------------------|
${config.distribusiMateri.map(item =>
  `| ${item.mingguKe} | ${item.tpMateri} | TP ${item.no} | ${item.alokasiJp} | ${item.keterangan} |`
).join('\n')}

**Total Alokasi Waktu Semester: ${config.totalAlokasiJp} JP**

## E. KALENDER EFEKTIF PEMBELAJARAN

| Bulan | Minggu Efektif | Jumlah Pertemuan | Keterangan |
|-------|----------------|------------------|------------|
${config.distribusiMinggu.map(item =>
  `| ${item.bulan} | ${item.mingguEfektif} | ${item.mingguEfektif} x 4 = ${parseInt(item.mingguEfektif) * 4} JP | ${item.keterangan} |`
).join('\n')}

**Total Minggu Efektif Semester: ${config.totalMingguEfektif} minggu**

## F. PROGRAM PENILAIAN

### 1. Penilaian Diagnostik (Awal Semester)
${config.agendaPenilaian.diagnostik}

### 2. Penilaian Formatif (Berkala)
${config.agendaPenilaian.formatif}

### 3. Penilaian Sumatif Tengah Semester (PTS)
${config.agendaPenilaian.pts}

### 4. Penilaian Sumatif Akhir Semester (PAS)
${config.agendaPenilaian.pas}

### 5. Teknik dan Instrumen Penilaian

| Jenis Penilaian | Teknik | Instrumen | Waktu Pelaksanaan |
|---------------|--------|-----------|-------------------|
| **Diagnostik** | Observasi, wawancara, angket | Checklist, rubrik observasi | Minggu ke-1 |
| **Formatif** | Tes tertulis, praktik, proyek, observasi | Soal tes, rubrik penilaian, checklist | Setiap akhir materi |
| **Sumatif Tengah** | Tes tertulis, praktik, portofolio | Soal komprehensif, rubrik | Minggu ke-9-10 |
| **Sumatif Akhir** | Tes tertulis, praktik, portofolio | Soal komprehensif, rubrik | Minggu ke-18-19 |
| **Sikap** | Observasi berkelanjutan | Jurnal guru, rubrik sikap | Selama semester |

## G. TINDAK LANJUT

### 1. Remedial
${config.tindakLanjut.remedial}

### 2. Pengayaan
${config.tindakLanjut.pengayaan}

### 3. Refleksi Pembelajaran
${config.tindakLanjut.refleksi}

### 4. Program Perbaikan

| Aspek | Program Perbaikan | Waktu | Penanggung Jawab |
|-------|-------------------|-------|------------------|
| **Kurangnya Pemahaman** | Remedial teaching, tutorial tambahan | Setelah penilaian | Guru Mata Pelajaran |
| **Kesulitan Belajar** | Pendampingan individu, metode alternatif | Berkelanjutan | Guru dan Orang Tua |
| **Kurangnya Motivasi** | Konseling, reward system | Berkala | Guru BK |
| **Sarana Prasarana** | Pengadaan alat peraga, media pembelajaran | Sebelum semester | Kepala Madrasah |

---

*Dibuat dengan Generator PROMES SIAKAD MI*
*Tanggal: ${config.tanggalBuat || new Date().toLocaleDateString('id-ID')}*
  `.trim();

  return generateDocx({
    title: `PROMES ${config.mataPelajaran} - ${config.kelasFase} Semester ${config.semester}`,
    schoolName: config.satuanPendidikan,
    content: content,
    type: 'promes',
    date: config.tanggalBuat || new Date().toLocaleDateString('id-ID')
  });
}

/**
 * Interface untuk Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)
 */
export interface KKTPAspek {
  no: number;
  cp: string;
  tp: string;
  indikator: string;
  teknikPenilaian: string;
  instrumen: string;
  sangaatBaik: string;
  baik: string;
  cukup: string;
  kurang: string;
  remedial: string;
  pengayaan: string;
}

export interface KKTPConfig {
  satuanPendidikan: string;
  mataPelajaran: string;
  kelasFase: string;
  semester: string;
  tahunPelajaran: string;
  namaPenyusun: string;
  nip: string;
  tanggalBuat?: string;
  tujuanPembelajaran: string;
  fokusKompetensi: string;
  nilaiKBC: string;
  aspekPenilaian: KKTPAspek[];
}

/**
 * Generate KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) MI sesuai Kurikulum Merdeka
 */
export async function generateKKTP(config: KKTPConfig): Promise<Blob> {
  const content = `
# KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)
## Madrasah Ibtidaiyah (MI) - Kurikulum Merdeka Belajar

## A. IDENTITAS KKTP

| Aspek | Keterangan |
|-------|------------|
| **Satuan Pendidikan** | ${config.satuanPendidikan} |
| **Mata Pelajaran** | ${config.mataPelajaran} |
| **Kelas/Fase** | ${config.kelasFase} |
| **Semester** | ${config.semester} |
| **Tahun Pelajaran** | ${config.tahunPelajaran} |
| **Nama Penyusun** | ${config.namaPenyusun} |
| **NIP** | ${config.nip} |
| **Tanggal Pembuatan** | ${config.tanggalBuat || new Date().toLocaleDateString('id-ID')} |

## B. TUJUAN PEMBELAJARAN

${config.tujuanPembelajaran}

## C. FOKUS KOMPETENSI

${config.fokusKompetensi}

## D. INTEGRASI NILAI KURIKULUM BERBASIS CINTA (KBC)

${config.nilaiKBC}

## E. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN

### Tabel Komprehensif KKTP Terintegrasi

| No | CP | TP | Indikator Pencapaian | Teknik Penilaian | Instrumen | **Rubrik Penilaian** | Tindak Lanjut |
|----|----|----|----------------------|------------------|-----------|---------------------|---------------|
${config.aspekPenilaian.map(aspek =>
  `| ${aspek.no} | ${aspek.cp} | ${aspek.tp} | ${aspek.indikator} | ${aspek.teknikPenilaian} | ${aspek.instrumen} | **SB:** ${aspek.sangaatBaik}<br>**B:** ${aspek.baik}<br>**C:** ${aspek.cukup}<br>**K:** ${aspek.kurang} | **Remedial:** ${aspek.remedial}<br>**Pengayaan:** ${aspek.pengayaan} |`
).join('\n')}

## F. PENJELASAN RUBRIK PENILAIAN

### Skala Penilaian 4 Level (SBCK)

| Level | Deskripsi | Nilai | Bobot |
|-------|-----------|-------|-------|
| **SB (Sangat Baik)** | Siswa telah mencapai seluruh indikator dengan sangat baik, menampilkan pemahaman mendalam, penerapan konsep yang tepat, dan keterlibatan aktif dalam pembelajaran | 4 | 90-100 |
| **B (Baik)** | Siswa telah mencapai sebagian besar indikator dengan baik, menampilkan pemahaman yang cukup mendalam, penerapan konsep yang tepat, dan keterlibatan aktif | 3 | 80-89 |
| **C (Cukup)** | Siswa telah mencapai sebagian indikator dengan cukup, menampilkan pemahaman dasar, penerapan konsep mulai terlihat, dan keterlibatan minimal | 2 | 70-79 |
| **K (Kurang)** | Siswa belum mencapai indikator dengan optimal, pemahaman masih terbatas, penerapan konsep belum terlihat jelas, keterlibatan sangat minimal | 1 | 0-69 |

## G. TEKNIK PENILAIAN YANG DIGUNAKAN

### 1. Penilaian Tes Tertulis
- **Jenis:** Pilihan ganda, uraian, isian singkat
- **Waktu:** Berkala sesuai pencapaian materi
- **Tujuan:** Mengukur pemahaman konsep dan pengetahuan faktual

### 2. Penilaian Performa/Praktik
- **Jenis:** Demonstrasi, praktek langsung, eksperimen
- **Waktu:** Selama proses pembelajaran
- **Tujuan:** Mengukur kemampuan aplikatif dan keterampilan

### 3. Penilaian Portofolio
- **Jenis:** Kumpulan hasil kerja siswa, karya tulis, sketsa
- **Waktu:** Sepanjang semester
- **Tujuan:** Melacak perkembangan pembelajaran siswa

### 4. Penilaian Sikap/Observasi
- **Jenis:** Observasi berkelanjutan, jurnal guru, checklist
- **Waktu:** Setiap saat selama pembelajaran
- **Tujuan:** Mengukur perkembangan karakter dan sikap

### 5. Penilaian Produk
- **Jenis:** Hasil karya siswa (proyek, makalah, presentasi)
- **Waktu:** Akhir unit pembelajaran
- **Tujuan:** Mengukur hasil kreativitas dan inovasi siswa

## H. INSTRUMEN PENILAIAN YANG DIGUNAKAN

| Instrumen | Keterangan | Waktu Penggunaan |
|-----------|-----------|------------------|
| **Tes Tertulis** | Soal pilihan ganda, uraian, isian singkat | Setelah pembelajaran materi |
| **Rubrik Penilaian** | Panduan penilaian dengan kriteria jelas | Saat menilai hasil kerja |
| **Checklist** | Daftar periksa ciri/indikator pencapaian | Observasi berkelanjutan |
| **Lembar Observasi** | Format pengamatan sikap dan perilaku | Setiap saat pembelajaran |
| **Jurnal Guru** | Catatan reflektif tentang perkembangan siswa | Setelah setiap pembelajaran |
| **Soal Uraian** | Pertanyaan terbuka untuk mengukur pemikiran | Evaluasi formatif |
| **Pedoman Wawancara** | Panduan pertanyaan untuk menggali info | Wawancara dengan siswa |
| **Rubrik Portofolio** | Kriteria penilaian untuk evaluasi portofolio | Akhir periode pembelajaran |

## I. SKALA KONVERSI NILAI

| Capaian Pengetahuan (%) | Tingkat Capaian | Huruf | Deskripsi |
|------------------------|-----------------|-------|-----------|
| 90-100 | Sangat Baik | A | Telah mencapai tujuan pembelajaran dengan sangat baik |
| 80-89 | Baik | B | Telah mencapai tujuan pembelajaran dengan baik |
| 70-79 | Cukup | C | Telah mencapai tujuan pembelajaran dengan cukup |
| 0-69 | Kurang | D | Belum mencapai tujuan pembelajaran |

## J. PROGRAM TINDAK LANJUT

### 1. Program Remedial

**Tujuan:** Membantu siswa yang belum mencapai tujuan pembelajaran untuk menguasai kompetensi yang diharapkan.

**Strategi Remedial:**
- Pembelajaran ulang dengan metode dan pendekatan berbeda
- Pemberian tugas tambahan yang lebih sederhana dan kontekstual
- Bimbingan intensif secara individual atau kelompok kecil
- Penggunaan media pembelajaran yang lebih menarik dan mudah dipahami
- Kolaborasi dengan orang tua untuk pendampingan di rumah

**Waktu Pelaksanaan:** Setelah penilaian formatif/sumatif

**Evaluasi:** Siswa dinyatakan tuntas jika mencapai skor minimal 70 pada tes ulang

### 2. Program Pengayaan

**Tujuan:** Mengembangkan potensi siswa yang telah mencapai tujuan pembelajaran dengan optimal.

**Strategi Pengayaan:**
- Pemberian tugas yang lebih kompleks dan menantang
- Proyek penelitian atau investigasi yang lebih mendalam
- Kegiatan perkaya berupa membuat materi pembelajaran untuk teman
- Pengembangan kreativitas melalui pembuatan produk/karya inovatif
- Partisipasi dalam kegiatan ekstrakurikuler atau kompetisi

**Waktu Pelaksanaan:** Setelah penilaian formatif/sumatif

**Kriteria Peserta:** Siswa dengan skor ≥ 80

## K. ANALISIS DAN REFLEKSI

### 1. Analisis Ketercapaian

- Persentase siswa yang mencapai setiap level (SB, B, C, K)
- Indikator mana yang paling mudah dan paling sulit dicapai
- Pola kesalahan atau kesulitan siswa
- Efektivitas teknik dan instrumen penilaian yang digunakan

### 2. Refleksi Pembelajaran

- Apakah strategi pembelajaran telah efektif?
- Apakah semua indikator dapat diukur dengan instrumen yang ada?
- Apakah perlu ada modifikasi pada teknik penilaian?
- Bagaimana keterlibatan siswa dalam proses pembelajaran?
- Apa kekuatan dan kelemahan dalam implementasi KKTP ini?

### 3. Tindak Lanjut Pembelajaran

- Rencana perbaikan untuk pembelajaran berikutnya
- Modifikasi strategi pembelajaran berdasarkan hasil analisis
- Pengembangan media atau sumber belajar baru
- Kolaborasi dengan guru lain untuk meningkatkan kualitas pembelajaran

---

*Dibuat dengan Generator KKTP SIAKAD MI*
*Tanggal: ${config.tanggalBuat || new Date().toLocaleDateString('id-ID')}*
*Sesuai Kurikulum Merdeka Madrasah Ibtidaiyah*
  `.trim();

  return generateDocx({
    title: `KKTP ${config.mataPelajaran} - ${config.kelasFase} Semester ${config.semester}`,
    schoolName: config.satuanPendidikan,
    content: content,
    type: 'kktp',
    date: config.tanggalBuat || new Date().toLocaleDateString('id-ID')
  });
}
