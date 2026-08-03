"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Sparkles, Loader2, Save, BookOpen, Copy, RefreshCw, Database, CheckCircle2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface BedahCPItem {
  id: string;
  mata_pelajaran: string;
  fase: string;
  elemen: string;
  cp: string;
  tp: string;
  materi_pokok: string;
  integrasi_nilai: string[];
  created_at: string;
}

// MASTER DATA REFERENSI RESMI KOMPREHENSIF (KMA 450/2024 & BSKAP 032/2024)
const MASTER_REFERENSI = [
  // === AL-QUR'AN HADITS (KMA 450/2024) ===
  { mapel: 'Al-Quran Hadits', fase: 'A', elemen: 'Al-Qur\'an', cp: 'Peserta didik mampu mengenal huruf hijaiyah secara terpisah dan bersambung beserta tanda bacanya; melafalkan dan menghafal surah-surah pendek Al-Qur\'an dengan benar dan tepat.' },
  { mapel: 'Al-Quran Hadits', fase: 'A', elemen: 'Tajwid', cp: 'Peserta didik mampu mengenal dan mempraktikkan tanda baca Al-Qur\'an (fathah, kasrah, dammah, sukun, tasydid) secara sederhana dalam kata-kata pilihan.' },
  { mapel: 'Al-Quran Hadits', fase: 'A', elemen: 'Hadits', cp: 'Peserta didik mampu menghafal, mengartikan, dan menunjukkan perilaku sesuai hadits tentang kebersihan dan keutamaan belajar Al-Qur\'an.' },
  { mapel: 'Al-Quran Hadits', fase: 'B', elemen: 'Al-Qur\'an', cp: 'Peserta didik mampu membaca Al-Qur\'an dengan tartil; menghafal surah-surah pendek pilihan; memahami arti dan isi kandungan surah secara sederhana.' },
  { mapel: 'Al-Quran Hadits', fase: 'B', elemen: 'Tajwid', cp: 'Peserta didik mampu memahami dan menerapkan hukum bacaan Nun Sukun dan Tanwin (Idzhar, Idgham Bighunnah, Idgham Bilaghunnah, Iqlab, dan Ikhfa) serta hukum bacaan Qalqalah dalam membaca ayat-ayat Al-Qur\'an.' },
  { mapel: 'Al-Quran Hadits', fase: 'B', elemen: 'Hadits', cp: 'Peserta didik mampu memahami arti dan isi kandungan hadits tentang niat, silaturahim, shalat berjamaah, dan ciri-ciri orang munafik.' },
  { mapel: 'Al-Quran Hadits', fase: 'C', elemen: 'Al-Qur\'an', cp: 'Peserta didik mampu menganalisis arti dan isi kandungan surah-surah pendek pilihan; menghafal surah dengan tartil dan fasih.' },
  { mapel: 'Al-Quran Hadits', fase: 'C', elemen: 'Tajwid', cp: 'Peserta didik mampu menganalisis dan menerapkan hukum bacaan Mim Sukun, hukum bacaan Mad, dan hukum bacaan Alif Lam (Qamariyah & Syamsiyah).' },
  { mapel: 'Al-Quran Hadits', fase: 'C', elemen: 'Hadits', cp: 'Peserta didik mampu menganalisis hadits tentang menyayangi anak yatim, keutamaan memberi, dan amal shalih dalam kehidupan bermasyarakat.' },

  // === AKIDAH AKHLAK (KMA 450/2024) ===
  { mapel: 'Akidah Akhlak', fase: 'A', elemen: 'Akidah', cp: 'Peserta didik mampu mengenal rukun iman, Asmaul Husna (al-Ahad, al-Khaliq), dan kalimat thayyibah (Basmalah, Hamdalah) sebagai landasan keyakinan.' },
  { mapel: 'Akidah Akhlak', fase: 'A', elemen: 'Akhlak', cp: 'Peserta didik mampu membiasakan akhlak terpuji kepada Allah (syukur, sabar) dan menghindari akhlak tercela dalam kehidupan sehari-hari.' },
  { mapel: 'Akidah Akhlak', fase: 'A', elemen: 'Adab', cp: 'Peserta didik mampu menerapkan adab makan, minum, tidur, belajar, dan berterima kasih sesuai tuntunan agama.' },
  { mapel: 'Akidah Akhlak', fase: 'A', elemen: 'Kisah Keteladanan', cp: 'Peserta didik mampu mengenal kisah keteladanan Nabi Muhammad SAW pada masa kanak-kanak sebagai inspirasi perilaku mulia.' },
  { mapel: 'Akidah Akhlak', fase: 'B', elemen: 'Akidah', cp: 'Peserta didik mampu memahami makna iman kepada Kitab-kitab Allah, Rasul-rasul Allah, dan mengenal sifat-sifat wajib bagi Allah SWT.' },
  { mapel: 'Akidah Akhlak', fase: 'B', elemen: 'Akhlak', cp: 'Peserta didik mampu membiasakan sikap rendah hati, jujur, dan amanah; serta menghindari sikap sombong, kikir, dan berbohong.' },
  { mapel: 'Akidah Akhlak', fase: 'B', elemen: 'Adab', cp: 'Peserta didik mampu menerapkan adab bertamu, berpakaian, dan bergaul dengan teman sebaya sesuai syariat Islam.' },
  { mapel: 'Akidah Akhlak', fase: 'B', elemen: 'Kisah Keteladanan', cp: 'Peserta didik mampu memahami kisah keteladanan Nabi Ibrahim AS dan Nabi Ismail AS dalam ketaatan kepada Allah.' },
  { mapel: 'Akidah Akhlak', fase: 'C', elemen: 'Akidah', cp: 'Peserta didik mampu memahami makna iman kepada Hari Akhir dan Qada Qadar Allah SWT sebagai motivasi beramal shalih.' },
  { mapel: 'Akidah Akhlak', fase: 'C', elemen: 'Akhlak', cp: 'Peserta didik mampu membiasakan akhlak terpuji dalam pergaulan (tasamuh, ta\'awun) dan menjaga kelestarian lingkungan.' },
  { mapel: 'Akidah Akhlak', fase: 'C', elemen: 'Adab', cp: 'Peserta didik mampu menerapkan adab bertetangga, bermasyarakat, dan adab terhadap lingkungan alam.' },
  { mapel: 'Akidah Akhlak', fase: 'C', elemen: 'Kisah Keteladanan', cp: 'Peserta didik mampu memahami kisah keteladanan Nabi Ulul Azmi dan para sahabat sebagai teladan dalam kesabaran dan perjuangan.' },

  // === FIQIH (KMA 450/2024) ===
  { mapel: 'Fiqih', fase: 'A', elemen: 'Ibadah', cp: 'Peserta didik mampu mengenal rukun Islam, tata cara bersuci (thaharah) dari hadats kecil, dan gerakan shalat fardhu secara sederhana.' },
  { mapel: 'Fiqih', fase: 'B', elemen: 'Ibadah', cp: 'Peserta didik mampu memahami ketentuan shalat berjamaah, shalat jumat, shalat jamak qashar, ketentuan puasa Ramadhan, serta mengenal khitan dan tanda-tanda baligh.' },
  { mapel: 'Fiqih', fase: 'C', elemen: 'Ibadah', cp: 'Peserta didik mampu menganalisis ketentuan zakat fitrah, zakat mal, infaq, sedekah, serta tata cara haji dan umrah.' },
  { mapel: 'Fiqih', fase: 'C', elemen: 'Muamalah', cp: 'Peserta didik mampu memahami konsep dasar makanan dan minuman yang halal dan haram menurut syariat Islam.' },

  // === SEJARAH KEBUDAYAAN ISLAM (KMA 450/2024) ===
  { mapel: 'Sejarah Kebudayaan Islam', fase: 'B', elemen: 'Sejarah', cp: 'Peserta didik mampu memahami kondisi masyarakat Arab pra-Islam, masa kanak-kanak dan remaja Nabi Muhammad SAW, hingga peristiwa kerasulan.' },
  { mapel: 'Sejarah Kebudayaan Islam', fase: 'B', elemen: 'Peristiwa', cp: 'Peserta didik mampu memahami peristiwa Hijrah Nabi Muhammad SAW ke Habasyah, Thaif, dan Yatsrib (Madinah) sebagai strategi dakwah.' },
  { mapel: 'Sejarah Kebudayaan Islam', fase: 'C', elemen: 'Kepemimpinan', cp: 'Peserta didik mampu menganalisis kepemimpinan Khulafaur Rasyidin (Abu Bakar, Umar, Utsman, Ali) dalam menjaga keutuhan umat Islam.' },
  { mapel: 'Sejarah Kebudayaan Islam', fase: 'C', elemen: 'Tokoh', cp: 'Peserta didik mampu menganalisis peran Walisongo dan tokoh-tokoh penyebar Islam di Nusantara dalam mendakwahkan Islam secara damai.' },

  // === BAHASA ARAB (KMA 450/2024) ===
  { mapel: 'Bahasa Arab', fase: 'A', elemen: 'Menyimak (Istima\')', cp: 'Peserta didik mampu memahami kosa kata dan ungkapan sederhana tentang identitas diri, peralatan sekolah, dan anggota keluarga.' },
  { mapel: 'Bahasa Arab', fase: 'A', elemen: 'Berbicara (Kalam)', cp: 'Peserta didik mampu melakukan dialog sederhana tentang perkenalan diri dan lingkungan sekolah dengan intonasi yang benar.' },
  { mapel: 'Bahasa Arab', fase: 'A', elemen: 'Membaca (Qira\'ah)', cp: 'Peserta didik mampu membaca dan memahami teks visual/tulisan sangat sederhana tentang identitas diri dan lingkungan sekolah.' },
  { mapel: 'Bahasa Arab', fase: 'A', elemen: 'Menulis (Kitabah)', cp: 'Peserta didik mampu menulis huruf hijaiyah dan kosa kata sangat sederhana tentang identitas diri dan lingkungan sekolah.' },
  { mapel: 'Bahasa Arab', fase: 'B', elemen: 'Menyimak (Istima\')', cp: 'Peserta didik mampu memahami kosa kata dan ungkapan sederhana tentang hobi, cita-cita, dan alamat rumah.' },
  { mapel: 'Bahasa Arab', fase: 'B', elemen: 'Berbicara (Kalam)', cp: 'Peserta didik mampu melakukan dialog sederhana tentang hobi, cita-cita, dan alamat rumah dengan intonasi yang benar.' },
  { mapel: 'Bahasa Arab', fase: 'B', elemen: 'Membaca (Qira\'ah)', cp: 'Peserta didik mampu membaca dan memahami teks visual/tulisan sederhana tentang hobi, cita-cita, dan alamat rumah.' },
  { mapel: 'Bahasa Arab', fase: 'B', elemen: 'Menulis (Kitabah)', cp: 'Peserta didik mampu menulis kata, frasa, dan kalimat sederhana tentang hobi, cita-cita, dan alamat rumah.' },
  { mapel: 'Bahasa Arab', fase: 'C', elemen: 'Menyimak (Istima\')', cp: 'Peserta didik mampu memahami kosa kata dan ungkapan sederhana tentang profesi dan kegiatan sehari-hari.' },
  { mapel: 'Bahasa Arab', fase: 'C', elemen: 'Berbicara (Kalam)', cp: 'Peserta didik mampu melakukan dialog sederhana tentang profesi dan kegiatan sehari-hari dengan intonasi yang benar.' },
  { mapel: 'Bahasa Arab', fase: 'C', elemen: 'Membaca (Qira\'ah)', cp: 'Peserta didik mampu membaca dan memahami teks visual/tulisan sederhana tentang profesi dan kegiatan sehari-hari.' },
  { mapel: 'Bahasa Arab', fase: 'C', elemen: 'Menulis (Kitabah)', cp: 'Peserta didik mampu menulis kata, frasa, dan kalimat sederhana tentang profesi dan kegiatan sehari-hari dengan struktur yang benar.' },

  // === MATEMATIKA (BSKAP 032/2024) ===
  { mapel: 'Matematika', fase: 'A', elemen: 'Bilangan', cp: 'Peserta didik mampu menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100; membaca, menulis, membandingkan, dan mengurutkan.' },
  { mapel: 'Matematika', fase: 'A', elemen: 'Aljabar', cp: 'Peserta didik mampu menyelesaikan persamaan sederhana menggunakan operasi penjumlahan dan pengurangan bilangan cacah sampai 20, serta mengenal pola gambar dan bilangan.' },
  { mapel: 'Matematika', fase: 'A', elemen: 'Pengukuran', cp: 'Peserta didik mampu membandingkan panjang dan berat benda secara langsung, serta membandingkan durasi waktu (lama dan sebentar).' },
  { mapel: 'Matematika', fase: 'A', elemen: 'Geometri', cp: 'Peserta didik mampu mengenal berbagai bangun datar (segitiga, segiempat, lingkaran) dan bangun ruang (balok, kubus, bola) berdasarkan ciri-cirinya.' },
  { mapel: 'Matematika', fase: 'A', elemen: 'Analisis Data', cp: 'Peserta didik mampu mengurutkan, menyortir, mengelompokkan, membandingkan, dan menyajikan data dari banyak benda dengan menggunakan turus dan gambar.' },
  { mapel: 'Matematika', fase: 'B', elemen: 'Bilangan', cp: 'Peserta didik mampu menunjukkan pemahaman bilangan cacah sampai 10.000; melakukan operasi perkalian dan pembagian; serta memahami konsep pecahan sederhana.' },
  { mapel: 'Matematika', fase: 'B', elemen: 'Aljabar', cp: 'Peserta didik mampu mengidentifikasi, meniru, dan mengembangkan pola gambar atau objek sederhana dan pola bilangan membesar/mengecil.' },
  { mapel: 'Matematika', fase: 'B', elemen: 'Pengukuran', cp: 'Peserta didik mampu mengukur panjang dan berat benda menggunakan satuan baku; memahami hubungan antar satuan baku panjang, berat, dan waktu.' },
  { mapel: 'Matematika', fase: 'B', elemen: 'Geometri', cp: 'Peserta didik mampu mendeskripsikan ciri berbagai bentuk bangun datar; menyusun (komposisi) dan mengurai (dekomposisi) berbagai bangun datar.' },
  { mapel: 'Matematika', fase: 'B', elemen: 'Analisis Data', cp: 'Peserta didik mampu menyajikan dan menganalisis data dalam bentuk piktogram, diagram batang, dan tabel frekuensi.' },
  { mapel: 'Matematika', fase: 'C', elemen: 'Bilangan', cp: 'Peserta didik mampu memahami bilangan desimal dan persen; melakukan operasi hitung campuran pada bilangan cacah, pecahan, dan desimal.' },
  { mapel: 'Matematika', fase: 'C', elemen: 'Aljabar', cp: 'Peserta didik mampu menyatakan situasi harian dengan kalimat matematika; memahami konsep rasio, proporsi, dan skala.' },
  { mapel: 'Matematika', fase: 'C', elemen: 'Pengukuran', cp: 'Peserta didik mampu menentukan luas berbagai bangun datar dan volume bangun ruang sederhana (kubus dan balok).' },
  { mapel: 'Matematika', fase: 'C', elemen: 'Geometri', cp: 'Peserta didik mampu mengonstruksi dan mengurai bangun ruang; memahami konsep sudut dan sistem koordinat kartesius.' },
  { mapel: 'Matematika', fase: 'C', elemen: 'Analisis Data', cp: 'Peserta didik mampu menentukan mean, median, dan modus dari data tunggal; memahami peluang kejadian sederhana.' },

  // === PENDIDIKAN PANCASILA (BSKAP 032/2024) ===
  { mapel: 'Pendidikan Pancasila', fase: 'A', elemen: 'Pancasila', cp: 'Peserta didik mampu mengenal dan menceritakan simbol dan sila-sila Pancasila dalam lambang negara Garuda Pancasila; mengidentifikasi hubungan antara simbol dan sila.' },
  { mapel: 'Pendidikan Pancasila', fase: 'A', elemen: 'Undang-Undang Dasar 1945', cp: 'Peserta didik mampu mengenal aturan di lingkungan keluarga dan sekolah; menceritakan contoh sikap mematuhi dan tidak mematuhi aturan.' },
  { mapel: 'Pendidikan Pancasila', fase: 'A', elemen: 'Bhinneka Tunggal Ika', cp: 'Peserta didik mampu menyebutkan identitas diri sesuai jenis kelamin, ciri fisik, dan hobi; menghargai perbedaan identitas fisik dan non-fisik teman.' },
  { mapel: 'Pendidikan Pancasila', fase: 'A', elemen: 'NKRI', cp: 'Peserta didik mampu mengenal karakteristik lingkungan tempat tinggal dan sekolah sebagai bagian dari wilayah Negara Kesatuan Republik Indonesia.' },
  { mapel: 'Pendidikan Pancasila', fase: 'B', elemen: 'Pancasila', cp: 'Peserta didik mampu memahami makna dan nilai-nilai Pancasila sebagai dasar negara, pandangan hidup bangsa, dan ideologi negara.' },
  { mapel: 'Pendidikan Pancasila', fase: 'B', elemen: 'Undang-Undang Dasar 1945', cp: 'Peserta didik mampu mengidentifikasi hak dan kewajiban sebagai anggota keluarga dan sebagai warga sekolah.' },
  { mapel: 'Pendidikan Pancasila', fase: 'B', elemen: 'Bhinneka Tunggal Ika', cp: 'Peserta didik mampu menjelaskan keragaman budaya, suku bangsa, bahasa, dan agama di lingkungan sekitar.' },
  { mapel: 'Pendidikan Pancasila', fase: 'B', elemen: 'NKRI', cp: 'Peserta didik mampu menjelaskan makna Negara Kesatuan Republik Indonesia dan menjaga keutuhan wilayah NKRI.' },
  { mapel: 'Pendidikan Pancasila', fase: 'C', elemen: 'Pancasila', cp: 'Peserta didik mampu menganalisis penerapan nilai-nilai Pancasila dalam kehidupan sehari-hari; mempraktikkan nilai-nilai Pancasila.' },
  { mapel: 'Pendidikan Pancasila', fase: 'C', elemen: 'Undang-Undang Dasar 1945', cp: 'Peserta didik mampu menganalisis norma dan aturan yang berlaku di masyarakat; melaksanakan norma dan aturan tersebut.' },
  { mapel: 'Pendidikan Pancasila', fase: 'C', elemen: 'Bhinneka Tunggal Ika', cp: 'Peserta didik mampu menyajikan hasil identifikasi sikap menghormati keragaman budaya di Indonesia.' },
  { mapel: 'Pendidikan Pancasila', fase: 'C', elemen: 'NKRI', cp: 'Peserta didik mampu menampilkan sikap setia kepada NKRI dan bangga sebagai bangsa Indonesia.' },

  // === BAHASA INDONESIA (BSKAP 032/2024) ===
  { mapel: 'Bahasa Indonesia', fase: 'A', elemen: 'Menyimak', cp: 'Peserta didik mampu bersikap menjadi penyimak yang baik; memahami pesan lisan dan informasi dari media audio, teks aural, dan instruksi lisan.' },
  { mapel: 'Bahasa Indonesia', fase: 'A', elemen: 'Membaca dan Memirsa', cp: 'Peserta didik mampu memaknai kosakata baru dari teks yang dibaca atau tayangan yang dipirsa dengan bantuan ilustrasi.' },
  { mapel: 'Bahasa Indonesia', fase: 'A', elemen: 'Berbicara dan Mempresentasikan', cp: 'Peserta didik mampu berbicara dengan santun tentang diri sendiri, keluarga, teman, dan objek di sekitar menggunakan volume dan intonasi yang tepat.' },
  { mapel: 'Bahasa Indonesia', fase: 'A', elemen: 'Menulis', cp: 'Peserta didik mampu menuliskan kata-kata yang sering ditemui sehari-hari dan menuliskan kalimat sederhana untuk menyampaikan pesan.' },
  { mapel: 'Bahasa Indonesia', fase: 'B', elemen: 'Menyimak', cp: 'Peserta didik mampu memahami ide pokok (gagasan) suatu pesan lisan, informasi dari media audio, teks aural, dan instruksi lisan yang kompleks.' },
  { mapel: 'Bahasa Indonesia', fase: 'B', elemen: 'Membaca dan Memirsa', cp: 'Peserta didik mampu memahami pesan dan informasi tentang kehidupan sehari-hari, teks narasi, dan puisi anak dalam bentuk cetak atau elektronik.' },
  { mapel: 'Bahasa Indonesia', fase: 'B', elemen: 'Berbicara dan Mempresentasikan', cp: 'Peserta didik mampu menyampaikan informasi dengan suara yang jelas dan intonasi yang tepat; berdiskusi secara aktif dengan teman.' },
  { mapel: 'Bahasa Indonesia', fase: 'B', elemen: 'Menulis', cp: 'Peserta didik mampu menulis teks narasi, deskripsi, rekon, prosedur, dan eksposisi dengan rangkaian kalimat yang beragam.' },
  { mapel: 'Bahasa Indonesia', fase: 'C', elemen: 'Menyimak', cp: 'Peserta didik mampu menganalisis informasi berupa fakta, prosedur dengan mengidentifikasikan ciri objek dan urutan proses.' },
  { mapel: 'Bahasa Indonesia', fase: 'C', elemen: 'Membaca dan Memirsa', cp: 'Peserta didik mampu membaca dengan fasih dan memahami kata-kata baru yang memiliki makna denotatif, konotatif, dan kiasan.' },
  { mapel: 'Bahasa Indonesia', fase: 'C', elemen: 'Berbicara dan Mempresentasikan', cp: 'Peserta didik mampu menyampaikan presentasi secara logis, sistematis, menggunakan kosakata baru dan santun.' },
  { mapel: 'Bahasa Indonesia', fase: 'C', elemen: 'Menulis', cp: 'Peserta didik mampu menulis teks eksplanasi, laporan, dan eksposisi persuasif dengan informasi yang rinci dan akurat.' },

  // === IPAS (BSKAP 032/2024) ===
  { mapel: 'IPAS', fase: 'B', elemen: 'Pemahaman IPAS (Sains)', cp: 'Peserta didik mampu menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada manusia; memahami siklus hidup makhluk hidup.' },
  { mapel: 'IPAS', fase: 'B', elemen: 'Pemahaman IPAS (Sosial)', cp: 'Peserta didik mampu mengenal tugas dan peran diri dalam keluarga serta sekolah; mengenal ragam bentang alam di lingkungan sekitar.' },
  { mapel: 'IPAS', fase: 'B', elemen: 'Keterampilan Proses', cp: 'Peserta didik mampu mengamati, mempertanyakan, merencanakan, memproses, mengevaluasi, dan mengomunikasikan hasil penyelidikan ilmiah sederhana.' },
  { mapel: 'IPAS', fase: 'C', elemen: 'Pemahaman IPAS (Sains)', cp: 'Peserta didik mampu menganalisis hubungan antar ekosistem; memahami konsep gelombang bunyi dan cahaya dalam kehidupan.' },
  { mapel: 'IPAS', fase: 'C', elemen: 'Pemahaman IPAS (Sosial)', cp: 'Peserta didik mampu mengenal sejarah perjuangan bangsa Indonesia; memahami keragaman budaya dan kearifan lokal.' },
  { mapel: 'IPAS', fase: 'C', elemen: 'Keterampilan Proses', cp: 'Peserta didik mampu melakukan penyelidikan ilmiah secara mandiri, menganalisis data, dan menarik kesimpulan berdasarkan bukti.' },

  // === PJOK (BSKAP 032/2024) ===
  { mapel: 'PJOK', fase: 'A', elemen: 'Keterampilan Gerak', cp: 'Peserta didik mampu menirukan aktivitas pola gerak dasar, permainan dan olahraga, aktivitas senam, dan gerak berirama.' },
  { mapel: 'PJOK', fase: 'A', elemen: 'Pengetahuan Gerak', cp: 'Peserta didik mampu memahami prosedur variasi pola gerak dasar lokomotor, non-lokomotor, dan manipulatif.' },
  { mapel: 'PJOK', fase: 'A', elemen: 'Pemanfaatan Gerak', cp: 'Peserta didik mampu memahami prosedur aktivitas jasmani untuk pemeliharaan kesehatan tubuh.' },
  { mapel: 'PJOK', fase: 'A', elemen: 'Pengembangan Karakter', cp: 'Peserta didik mampu menunjukkan perilaku bertanggung jawab dalam menyimak instruksi dan menghormati orang lain.' },
  { mapel: 'PJOK', fase: 'B', elemen: 'Keterampilan Gerak', cp: 'Peserta didik mampu mempraktikkan variasi pola gerak dasar lokomotor, non-lokomotor, dan manipulatif dalam berbagai permainan.' },
  { mapel: 'PJOK', fase: 'B', elemen: 'Pengetahuan Gerak', cp: 'Peserta didik mampu memahami prosedur variasi pola gerak dasar dalam berbagai permainan bola besar dan bola kecil.' },
  { mapel: 'PJOK', fase: 'B', elemen: 'Pemanfaatan Gerak', cp: 'Peserta didik mampu memahami prosedur aktivitas jasmani untuk pengembangan kebugaran jasmani.' },
  { mapel: 'PJOK', fase: 'B', elemen: 'Pengembangan Karakter', cp: 'Peserta didik mampu menunjukkan perilaku kerja sama dan menghargai perbedaan dalam aktivitas jasmani.' },
  { mapel: 'PJOK', fase: 'C', elemen: 'Keterampilan Gerak', cp: 'Peserta didik mampu mempraktikkan kombinasi pola gerak dasar dalam berbagai permainan dan olahraga tradisional.' },
  { mapel: 'PJOK', fase: 'C', elemen: 'Pengetahuan Gerak', cp: 'Peserta didik mampu memahami prosedur kombinasi pola gerak dasar dalam berbagai aktivitas jasmani.' },
  { mapel: 'PJOK', fase: 'C', elemen: 'Pemanfaatan Gerak', cp: 'Peserta didik menganalisis prosedur aktivitas jasmani untuk pemeliharaan dan peningkatan kesehatan tubuh secara mandiri.' },
  { mapel: 'PJOK', fase: 'C', elemen: 'Pengembangan Karakter', cp: 'Peserta didik mampu menunjukkan perilaku sportif dan jujur dalam aktivitas jasmani.' },

  // === SENI BUDAYA (BSKAP 032/2024) ===
  { mapel: 'Seni Budaya', fase: 'A', elemen: 'Mengalami', cp: 'Peserta didik mampu mengenal dan mengidentifikasi unsur rupa (garis, bentuk, warna) di lingkungan sekitar.' },
  { mapel: 'Seni Budaya', fase: 'A', elemen: 'Menciptakan', cp: 'Peserta didik mampu menuangkan pengalaman melalui visual sebagai ungkapan ekspresi kreatif menggunakan berbagai media.' },
  { mapel: 'Seni Budaya', fase: 'A', elemen: 'Merefleksikan', cp: 'Peserta didik mampu mengenali dan menceritakan fokus dari karya seni rupa yang dibuatnya.' },
  { mapel: 'Seni Budaya', fase: 'A', elemen: 'Berpikir & Bekerja Artistik', cp: 'Peserta didik mampu mengeksplorasi alat dan bahan dasar dalam berkarya seni rupa.' },
  { mapel: 'Seni Budaya', fase: 'A', elemen: 'Berdampak', cp: 'Peserta didik mampu menciptakan karya seni rupa yang memberikan dampak positif bagi diri sendiri.' },
  { mapel: 'Seni Budaya', fase: 'B', elemen: 'Mengalami', cp: 'Peserta didik mampu mengamati, mengenal, dan memahami unsur rupa dan prinsip desain di lingkungan sekitar.' },
  { mapel: 'Seni Budaya', fase: 'B', elemen: 'Menciptakan', cp: 'Peserta didik mampu membuat karya seni rupa dengan menggunakan berbagai media dan teknik secara kreatif.' },
  { mapel: 'Seni Budaya', fase: 'B', elemen: 'Merefleksikan', cp: 'Peserta didik mampu menghargai dan mengomentari karya seni rupa sendiri maupun orang lain dengan santun.' },
  { mapel: 'Seni Budaya', fase: 'B', elemen: 'Berpikir & Bekerja Artistik', cp: 'Peserta didik mampu bereksperimen dengan alat, bahan, dan teknik dalam berkarya seni rupa.' },
  { mapel: 'Seni Budaya', fase: 'B', elemen: 'Berdampak', cp: 'Peserta didik mampu menciptakan karya seni rupa yang memberikan dampak bagi lingkungan sekitar.' },
  { mapel: 'Seni Budaya', fase: 'C', elemen: 'Mengalami', cp: 'Peserta didik mampu menganalisis unsur rupa dan prinsip desain dalam karya seni rupa.' },
  { mapel: 'Seni Budaya', fase: 'C', elemen: 'Menciptakan', cp: 'Peserta didik mampu menciptakan karya seni rupa yang menunjukkan penguasaan teknik dan kreativitas tinggi.' },
  { mapel: 'Seni Budaya', fase: 'C', elemen: 'Merefleksikan', cp: 'Peserta didik mampu memberikan apresiasi dan kritik seni secara objektif terhadap karya seni rupa.' },
  { mapel: 'Seni Budaya', fase: 'C', elemen: 'Berpikir & Bekerja Artistik', cp: 'Peserta didik mampu mengembangkan ide dan konsep dalam berkarya seni rupa secara mandiri.' },
  { mapel: 'Seni Budaya', fase: 'C', elemen: 'Berdampak', cp: 'Peserta didik mampu menciptakan karya seni rupa yang memberikan kontribusi bagi masyarakat.' },

  // === MUATAN LOKAL ===
  { mapel: 'Muatan Lokal', fase: 'A', elemen: 'Budaya Lokal', cp: 'Peserta didik mampu mengenal dan mencintai warisan budaya daerah setempat melalui pengenalan bahasa dan adat istiadat sederhana.' },
  { mapel: 'Muatan Lokal', fase: 'A', elemen: 'Keterampilan Lokal', cp: 'Peserta didik mampu mempraktikkan keterampilan khas daerah yang sederhana sebagai wujud pelestarian budaya.' },
  { mapel: 'Muatan Lokal', fase: 'B', elemen: 'Budaya Lokal', cp: 'Peserta didik mampu memahami sejarah dan nilai-nilai luhur yang terkandung dalam budaya daerah setempat.' },
  { mapel: 'Muatan Lokal', fase: 'B', elemen: 'Keterampilan Lokal', cp: 'Peserta didik mampu membuat produk kerajinan atau karya seni khas daerah dengan teknik yang benar.' },
  { mapel: 'Muatan Lokal', fase: 'C', elemen: 'Budaya Lokal', cp: 'Peserta didik mampu menganalisis peran budaya daerah dalam memperkokoh jati diri bangsa dan persatuan nasional.' },
  { mapel: 'Muatan Lokal', fase: 'C', elemen: 'Keterampilan Lokal', cp: 'Peserta didik mampu mengembangkan inovasi pada produk khas daerah untuk meningkatkan nilai guna dan estetika.' }
];

const BedahCP = () => {
  const [data, setData] = useState<BedahCPItem[]>([]);
  const [refData, setRefData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BedahCPItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [filterFase, setFilterFase] = useState('all');
  
  const [formData, setFormData] = useState({ 
    mata_pelajaran: 'Al-Quran Hadits', 
    fase: 'A', 
    elemen: '', 
    cp: '', 
    tp: '', 
    materi_pokok: '',
    integrasi_nilai: [] as string[]
  });

  const [tpGenCount, setTpGenCount] = useState(0); // Track number of regenerations

  const fetchBedahCP = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.from('site_settings').select('value').eq('id', 'bedah_cp_data').maybeSingle();
      if (res?.value) setData(res.value as BedahCPItem[]);
      
      const { data: refRes } = await supabase.from('site_settings').select('value').eq('id', 'reference_cp_master').maybeSingle();
      if (refRes?.value) setRefData(refRes.value as any[]);
      else setRefData(MASTER_REFERENSI);
    } catch (err) { showError('Gagal memuat data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBedahCP(); }, [fetchBedahCP]);

  const handleSyncReferences = async () => {
    setIsSyncing(true);
    try {
      await supabase.from('site_settings').upsert({ 
        id: 'reference_cp_master', 
        value: MASTER_REFERENSI, 
        updated_at: new Date().toISOString() 
      });
      setRefData(MASTER_REFERENSI);
      showSuccess('Database Referensi CP Berhasil Diperbarui dengan Redaksi Resmi!');
    } catch (err) { showError('Gagal sinkronisasi'); } finally { setIsSyncing(false); }
  };

  const handleSave = async () => {
    if (!formData.elemen || !formData.cp.trim() || !formData.materi_pokok.trim()) {
      showError('Lengkapi Elemen, CP, dan Materi Pokok!');
      return;
    }
    setIsSaving(true);
    try {
      let newList: BedahCPItem[];
      if (editingItem) {
        newList = data.map(d => d.id === editingItem.id ? { ...formData, id: d.id, created_at: d.created_at } : d);
      } else {
        const newItem: BedahCPItem = { ...formData, id: Date.now().toString(), created_at: new Date().toISOString() };
        newList = [newItem, ...data];
      }
      await supabase.from('site_settings').upsert({ id: 'bedah_cp_data', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      showSuccess('Data berhasil disimpan');
      setDialogOpen(false);
    } catch (err) { showError('Gagal menyimpan'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data ini?')) return;
    try {
      const newList = data.filter(d => d.id !== id);
      await supabase.from('site_settings').upsert({ id: 'bedah_cp_data', value: newList, updated_at: new Date().toISOString() });
      setData(newList);
      showSuccess('Data dihapus');
    } catch (err) { showError('Gagal menghapus'); }
  };

  // Tentukan integrasi nilai berdasarkan mata pelajaran
  const getIntegrationValues = (mapel: string, cpText: string): string[] => {
    const isPAI = mapel.match(/(Quran|Hadits|Akidah|Fiqih|Sejarah|Bahasa Arab)/i);
    const isPancasila = mapel.includes('Pancasila') || cpText.includes('pancasila') || cpText.includes('nkri');
    
    if (isPAI) {
      return ["(Cinta kepada Allah/Rasul)", "(Moderasi Beragama)", "(Akhlak Mulia)"];
    } else if (isPancasila) {
      return ["(Profil Pelajar Pancasila)", "(Bhinneka Tunggal Ika)", "(Moderasi Beragama)"];
    } else {
      return ["(Profil Pelajar Pancasila)", "(Cinta kepada Ilmu)", "(Berpikir Kritis)"];
    }
  };

  // Generate TP dengan template spesifik per mata pelajaran dan fase
  const generateTPBySubject = (mapel: string, fase: string, materi: string, integrasi: string[], variant: number = 0): string[] => {
    const isPAI = mapel.match(/(Quran|Hadits|Akidah|Fiqih|Sejarah|Bahasa Arab)/i);
    const isBahasaArab = mapel.includes('Bahasa Arab');
    const isMatematika = mapel.includes('Matematika');
    const isIPA = mapel.includes('IPAS') || mapel.includes('IPA');
    const isBahasaIndonesia = mapel.includes('Bahasa Indonesia');
    const isPJOK = mapel.includes('PJOK');
    const isSeniBudaya = mapel.includes('Seni Budaya');
    const isPancasila = mapel.includes('Pancasila');

    const tpTemplates: Record<string, Record<string, string[]>> = {
      'alquran': {
        'A': [
          `1. Peserta didik mampu menyebutkan dan mengidentifikasi huruf hijaiyah beserta harakat pada ${materi} dengan benar ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan pengucapan dan makna dasar ${materi} menggunakan istilah-istilah Al-Qur'an yang tepat ${integrasi[0]}`,
          `3. Peserta didik mampu membedakan bentuk dan tanda baca hijaiyah dalam konteks ${materi} berdasarkan karakteristik masing-masing ${integrasi[1]}`,
          `4. Peserta didik mampu menghubungkan pembelajaran ${materi} dengan nilai-nilai akidah dan perilaku Islami dalam kehidupan sehari-hari ${integrasi[2]}`,
          `5. Peserta didik mampu mempraktikkan membaca dan menghafal ${materi} dengan tajwid dan makhraj yang benar sesuai kaidah Al-Qur'an`,
          `6. Peserta didik mampu membiasakan perilaku hormat dan nilai ibadah dalam setiap membaca dan menghafal ${materi} sebagai bentuk amanah`
        ],
        'B': [
          `1. Peserta didik mampu menandaskan dan mengidentifikasi hukum-hukum tajwid khusus dalam membaca ${materi} dengan akurat ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan makna ayat dan konteks historis dari ${materi} menggunakan sumber-sumber kepercayaan ${integrasi[0]}`,
          `3. Peserta didik mampu menganalisis perbedaan qiraat dan cara bacaan berbeda dalam ${materi} berdasarkan dasar hukum tajwid ${integrasi[1]}`,
          `4. Peserta didik mampu menghubungkan pesan-pesan dalam ${materi} dengan nilai-nilai kehidupan modern dan relevansi sosial ${integrasi[2]}`,
          `5. Peserta didik mampu mendemonstrasikan bacaan tartil dan hafalan ${materi} dengan fasih dan memperhatikan adab membaca Al-Qur'an`,
          `6. Peserta didik mampu membiasakan diri mengamalkan isi kandungan ${materi} dalam perilaku dan akhlak sehari-hari secara konsisten`
        ],
        'C': [
          `1. Peserta didik mampu menegaskan dan menganalisis kompleksitas hukum-hukum tajwid dalam ${materi} dengan pemahaman mendalam ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan makna tafsir dan konteks sosio-historis ${materi} dengan menggunakan metode tafsir yang sesuai ${integrasi[0]}`,
          `3. Peserta didik mampu menganalisis variasi qiraat dan implikasinya terhadap pemahaman makna dalam ${materi} ${integrasi[1]}`,
          `4. Peserta didik mampu mengaitkan pesan Al-Qur'an dalam ${materi} dengan isu-isu kontemporer dan tantangan global ${integrasi[2]}`,
          `5. Peserta didik mampu memperlihatkan keahlian bacaan tartil, hafalan, dan pemahaman mendalam terhadap ${materi} dengan sempurna`,
          `6. Peserta didik mampu memperkuat konsistensi mengamalkan nilai-nilai ${materi} sebagai bagian integral dari identitas dan karakter Islami`
        ]
      },
      'matematika': {
        'A': [
          `1. Peserta didik mampu menyebutkan dan mengidentifikasi konsep-konsep dasar ${materi} serta contoh-contohnya dalam kehidupan sehari-hari ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan pengertian dan prosedur ${materi} menggunakan bahasa matematika yang tepat dan mudah dipahami ${integrasi[0]}`,
          `3. Peserta didik mampu membedakan berbagai jenis atau bentuk dalam ${materi} berdasarkan karakteristik dan sifat-sifatnya ${integrasi[1]}`,
          `4. Peserta didik mampu menghubungkan konsep ${materi} dengan penerapannya dalam situasi nyata dan pemecahan masalah sehari-hari ${integrasi[2]}`,
          `5. Peserta didik mampu mempraktikkan prosedur dan algoritma dalam menyelesaikan masalah ${materi} dengan tepat dan sistematis`,
          `6. Peserta didik mampu membiasakan berpikir logis dan kritis saat menghadapi masalah yang melibatkan ${materi}`
        ],
        'B': [
          `1. Peserta didik mampu mengidentifikasi dan menandaskan unsur-unsur fundamental dalam ${materi} serta hubungan antar konsep ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan prinsip, aturan, dan prosedur ${materi} dengan menggunakan notasi matematis yang formal dan tepat ${integrasi[0]}`,
          `3. Peserta didik mampu membandingkan dan membedakan strategi penyelesaian masalah ${materi} dengan mengevaluasi efektivitas masing-masing ${integrasi[1]}`,
          `4. Peserta didik mampu mengaitkan konsep ${materi} dengan topik matematika lainnya dan aplikasinya dalam bidang ilmu pengetahuan ${integrasi[2]}`,
          `5. Peserta didik mampu mengoperasionalkan teknik dan strategi efisien dalam menyelesaikan berbagai bentuk soal ${materi}`,
          `6. Peserta didik mampu mengembangkan sikap teliti, terstruktur, dan percaya diri dalam menerapkan ${materi} dalam berbagai konteks`
        ],
        'C': [
          `1. Peserta didik mampu menganalisis struktur mendalam dari ${materi}, termasuk konsep abstrak dan generalisasinya ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan teorema, bukti formal, dan prinsip-prinsip lanjutan dalam ${materi} dengan perhitungan presisi tinggi ${integrasi[0]}`,
          `3. Peserta didik mampu menganalisis kelebihan dan keterbatasan berbagai metode penyelesaian ${materi} serta memilih yang paling optimal ${integrasi[1]}`,
          `4. Peserta didik mampu mengintegrasikan konsep ${materi} dengan bidang studi lain dan mengidentifikasi aplikasi inovatif ${integrasi[2]}`,
          `5. Peserta didik mampu memformulasikan dan menyelesaikan masalah non-rutin yang melibatkan ${materi} dengan kreativitas tinggi`,
          `6. Peserta didik mampu mempertunjukkan keunggulan dalam berpikir matematis dan membawa sikap analitis ke dalam kehidupan sehari-hari`
        ]
      },
      'bahasaindonesia': {
        'A': [
          `1. Peserta didik mampu menyebutkan dan mengidentifikasi elemen-elemen utama dalam teks tentang ${materi} dengan akurat ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan makna kata, frasa, dan kalimat dalam konteks teks tentang ${materi} ${integrasi[0]}`,
          `3. Peserta didik mampu membedakan jenis-jenis teks dan struktur yang digunakan dalam ${materi} berdasarkan fungsinya ${integrasi[1]}`,
          `4. Peserta didik mampu menghubungkan isi ${materi} dengan pengalaman pribadi dan nilai-nilai yang terkandung di dalamnya ${integrasi[2]}`,
          `5. Peserta didik mampu mempraktikkan keterampilan membaca, menulis, atau berbicara terkait ${materi} dengan lancar dan percaya diri`,
          `6. Peserta didik mampu membiasakan sikap apresiasi terhadap kekayaan bahasa Indonesia dalam ${materi}`
        ],
        'B': [
          `1. Peserta didik mampu mengidentifikasi dan menandaskan informasi eksplisit dan implisit dalam teks ${materi} ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan tema, amanat, dan pesan yang terkandung dalam ${materi} dengan interpretasi yang mendalam ${integrasi[0]}`,
          `3. Peserta didik mampu menganalisis perbedaan gaya bahasa, teknik penyampaian, dan efektivitas pesan dalam berbagai teks ${materi} ${integrasi[1]}`,
          `4. Peserta didik mampu menghubungkan nilai dan pembelajaran dari ${materi} dengan konteks budaya dan masyarakat ${integrasi[2]}`,
          `5. Peserta didik mampu mendemonstrasikan kemampuan menganalisis, merangkum, dan menyajikan kembali isi ${materi}`,
          `6. Peserta didik mampu mengembangkan apresiasi yang mendalam terhadap karya sastra dan teks informatif yang beragam dalam ${materi}`
        ],
        'C': [
          `1. Peserta didik mampu menganalisis struktur kompleks dan nuansa makna dalam teks sastra dan informatif ${materi} ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan pesan subteksual, ironi, dan makna mendalam dalam ${materi} menggunakan pendekatan hermeneutik ${integrasi[0]}`,
          `3. Peserta didik mampu membandingkan gaya, teknik, dan pendekatan pengarang dalam berbagai karya dalam ${materi} dengan analisis kritis ${integrasi[1]}`,
          `4. Peserta didik mampu mengaitkan ${materi} dengan perkembangan sastra, sejarah, dan dinamika sosial-budaya masyarakat ${integrasi[2]}`,
          `5. Peserta didik mampu menciptakan karya tulis kreatif atau analitis yang menunjukkan pemahaman mendalam terhadap ${materi}`,
          `6. Peserta didik mampu menunjukkan sikap kritis, analitis, dan apresiatif dalam menghadapi beragam teks dan perspektif dalam ${materi}`
        ]
      },
      'default': {
        'A': [
          `1. Peserta didik mampu menyebutkan dan mengidentifikasi konsep, elemen, dan ciri-ciri dasar ${materi} dengan tepat ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan pengertian dan makna ${materi} menggunakan istilah-istilah yang sesuai dengan tingkat kemampuan ${integrasi[0]}`,
          `3. Peserta didik mampu membedakan berbagai aspek atau bentuk dalam ${materi} berdasarkan karakteristik dan sifat-sifatnya yang berbeda ${integrasi[1]}`,
          `4. Peserta didik mampu menghubungkan konsep ${materi} dengan contoh konkret dan penerapannya dalam kehidupan sehari-hari ${integrasi[2]}`,
          `5. Peserta didik mampu mempraktikkan atau mendemonstrasikan prosedur dan keterampilan terkait ${materi} dengan benar dan aman`,
          `6. Peserta didik mampu membiasakan perilaku positif dan sikap bertanggung jawab yang berkaitan dengan pembelajaran ${materi}`
        ],
        'B': [
          `1. Peserta didik mampu mengidentifikasi dan menandaskan komponen-komponen penting dalam ${materi} serta hubungan di antaranya ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan prinsip, fungsi, dan aplikasi ${materi} dengan menggunakan pengetahuan yang lebih terstruktur ${integrasi[0]}`,
          `3. Peserta didik mampu menganalisis perbedaan, persamaan, dan pola dalam ${materi} berdasarkan kriteria yang jelas dan terukur ${integrasi[1]}`,
          `4. Peserta didik mampu mengaitkan pemahaman ${materi} dengan konteks yang lebih luas dan relevansi terhadap kehidupan bermasyarakat ${integrasi[2]}`,
          `5. Peserta didik mampu mendemonstrasikan dan mengaplikasikan keterampilan ${materi} dalam situasi yang bervariasi dengan percaya diri`,
          `6. Peserta didik mampu mengembangkan sikap kolaboratif, kreatif, dan tanggung jawab dalam pembelajaran dan penerapan ${materi}`
        ],
        'C': [
          `1. Peserta didik mampu menganalisis struktur mendalam, hubungan kompleks, dan prinsip-prinsip abstrak dalam ${materi} ${integrasi[0]}`,
          `2. Peserta didik mampu menjelaskan teori, konsep lanjutan, dan implikasi dari ${materi} menggunakan argumentasi yang logis dan berdasarkan bukti ${integrasi[0]}`,
          `3. Peserta didik mampu membandingkan, mengevaluasi, dan menilai berbagai pendekatan atau perspektif terhadap ${materi} dengan kritis ${integrasi[1]}`,
          `4. Peserta didik mampu mengintegrasikan ${materi} dengan bidang ilmu lainnya dan mengidentifikasi relevansi dalam konteks global dan masa depan ${integrasi[2]}`,
          `5. Peserta didik mampu merancang solusi inovatif, melakukan penelitian, atau menciptakan karya mereka sendiri yang berkaitan dengan ${materi}`,
          `6. Peserta didik mampu menunjukkan komitmen terhadap keunggulan akademik, integritas intelektual, dan tanggung jawab sosial melalui ${materi}`
        ]
      }
    };

    // Tentukan template berdasarkan mapel dengan fallback ke default
    let templates = tpTemplates['default'][fase] || tpTemplates['default']['A'];
    
    if (isPAI && (mapel.includes('Quran') || mapel.includes('Hadits'))) {
      templates = tpTemplates['alquran'][fase] || tpTemplates['alquran']['A'];
    } else if (isMatematika) {
      templates = tpTemplates['matematika'][fase] || tpTemplates['matematika']['A'];
    } else if (isBahasaIndonesia) {
      templates = tpTemplates['bahasaindonesia'][fase] || tpTemplates['bahasaindonesia']['A'];
    }

    // Apply variation untuk regenerate
    if (variant > 0) {
      templates = templates.map((tp, idx) => {
        const alternatives: Record<number, string[]> = {
          0: ['menyebutkan', 'mengidentifikasi', 'menandaskan'],
          1: ['menjelaskan', 'menguraikan', 'menerangkan'],
          2: ['membedakan', 'membandingkan', 'menganalisis'],
          3: ['menghubungkan', 'mengaitkan', 'mengasosiasikan'],
          4: ['mempraktikkan', 'mendemonstrasikan', 'mengaplikasikan'],
          5: ['membiasakan', 'mengembangkan', 'memperkuat']
        };
        
        let modified = tp;
        const verbs = alternatives[idx % 6] || alternatives[0];
        const verb = verbs[(variant - 1) % verbs.length];
        modified = tp.replace(/mampu\s+(menyebutkan|mengidentifikasi|menandaskan|menjelaskan|menguraikan|menerangkan|membedakan|membandingkan|menganalisis|menghubungkan|mengaitkan|mengasosiasikan|mempraktikkan|mendemonstrasikan|mengaplikasikan|membiasakan|mengembangkan|memperkuat)/, `mampu ${verb}`);
        return modified;
      });
    }

    return templates;
  };

  const handleGenerateAI = () => {
    if (!formData.materi_pokok.trim() && !formData.cp.trim()) { 
      showError('Isi Materi Pokok atau CP terlebih dahulu!'); 
      return; 
    }
    setIsGenerating(true);
    setTimeout(() => {
      const baseMateri = formData.materi_pokok.trim() || formData.cp.trim();
      const cpText = formData.cp.toLowerCase();
      let detectedMateri = formData.materi_pokok.trim();

      // Deteksi materi pokok dari CP jika belum ada
      if (!detectedMateri) {
        detectedMateri = formData.elemen || "Topik Utama";
        if (cpText.includes("hijaiyah")) detectedMateri = "Huruf Hijaiyah & Harakat";
        else if (cpText.includes("surah")) detectedMateri = "Surah-surah Pendek Al-Qur'an";
        else if (cpText.includes("bilangan")) detectedMateri = "Konsep Bilangan Cacah";
        else if (cpText.includes("pancasila")) detectedMateri = "Simbol & Sila Pancasila";
        else if (cpText.includes("niat")) detectedMateri = "Hadits tentang Niat";
        else if (cpText.includes("silaturahim")) detectedMateri = "Hadits tentang Silaturahim";
        else if (cpText.includes("idgham")) detectedMateri = "Hukum Nun Sukun & Tanwin";
        else if (cpText.includes("wudhu")) detectedMateri = "Tata Cara Bersuci (Wudhu)";
        else if (cpText.includes("shalat")) detectedMateri = "Gerakan & Bacaan Shalat";
        else if (baseMateri) detectedMateri = baseMateri;
      }

      const integrasi = getIntegrationValues(formData.mata_pelajaran, cpText);
      const tpArray = generateTPBySubject(formData.mata_pelajaran, formData.fase, detectedMateri, integrasi, tpGenCount);
      const generatedTP = tpArray.join('\n');

      setFormData(prev => ({ ...prev, materi_pokok: detectedMateri, tp: generatedTP }));
      setTpGenCount(prev => prev + 1);
      setIsGenerating(false);
      const msgCount = tpGenCount + 1;
      showSuccess(`✓ TP #${msgCount} berhasil dibuat untuk ${formData.mata_pelajaran} Fase ${formData.fase}. Klik ulang untuk variasi berbeda!`);
    }, 1500);
  };

  const copyFromRef = (ref: any) => {
    setFormData({
      ...formData,
      mata_pelajaran: ref.mapel,
      fase: ref.fase,
      elemen: ref.elemen,
      cp: ref.cp
    });
    setTpGenCount(0);
    setRefDialogOpen(false);
    setDialogOpen(true);
    showSuccess('Data referensi berhasil disalin ke formulir!');
  };

  const filteredData = data.filter(item => {
    const matchSearch = item.elemen.toLowerCase().includes(searchQuery.toLowerCase()) || item.mata_pelajaran.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFase = filterFase === 'all' || item.fase === filterFase;
    return matchSearch && matchFase;
  });

  const filteredRef = refData.filter(r => 
    r.mapel.toLowerCase().includes(refSearch.toLowerCase()) || 
    r.elemen.toLowerCase().includes(refSearch.toLowerCase()) ||
    r.cp.toLowerCase().includes(refSearch.toLowerCase())
  );

  const phaseSummary = useMemo(() => {
    const summary = filteredData.reduce((acc, item) => {
      acc[item.fase] = (acc[item.fase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: filteredData.length,
      A: summary.A || 0,
      B: summary.B || 0,
      C: summary.C || 0,
    };
  }, [filteredData]);

  const groupedData = useMemo(() => {
    const phases = ['A', 'B', 'C'];
    return phases
      .map((fase) => ({ fase, items: filteredData.filter(item => item.fase === fase) }))
      .filter(group => group.items.length > 0);
  }, [filteredData]);

  return (
    <AdminLayout title="Bedah CP (KMA 450 & Umum)">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Cari elemen atau mapel..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
          </div>
          <Select value={filterFase} onValueChange={setFilterFase}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl"><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Fase</SelectItem>
              <SelectItem value="A">Fase A</SelectItem>
              <SelectItem value="B">Fase B</SelectItem>
              <SelectItem value="C">Fase C</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 text-xs text-gray-600 w-full sm:w-auto">
          <div className="font-medium">Menampilkan {phaseSummary.total} CP</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">Fase A: {phaseSummary.A}</Badge>
            <Badge variant="outline" className="text-[10px]">Fase B: {phaseSummary.B}</Badge>
            <Badge variant="outline" className="text-[10px]">Fase C: {phaseSummary.C}</Badge>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setRefDialogOpen(true)} variant="outline" className="rounded-xl border-emerald-200 text-emerald-700">
            <BookOpen className="w-4 h-4 mr-2" /> Referensi CP (Lengkap)
          </Button>
          <Button onClick={() => { setEditingItem(null); setFormData({ mata_pelajaran: 'Al-Quran Hadits', fase: 'A', elemen: '', cp: '', tp: '', materi_pokok: '', integrasi_nilai: [] }); setTpGenCount(0); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Tambah Data
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[50px] text-center font-bold">No</TableHead>
                <TableHead className="w-[80px] text-center font-bold">FASE</TableHead>
                <TableHead className="min-w-[150px] font-bold">ELEMEN</TableHead>
                <TableHead className="min-w-[250px] font-bold">CP</TableHead>
                <TableHead className="min-w-[300px] font-bold">TP</TableHead>
                <TableHead className="min-w-[150px] font-bold">MATERI POKOK</TableHead>
                <TableHead className="w-[100px] text-center font-bold">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-gray-500">Belum ada data.</TableCell></TableRow>
              ) : (
                groupedData.map((group) => (
                  <React.Fragment key={group.fase}>
                    <TableRow className="bg-emerald-100/50">
                      <TableCell colSpan={7} className="font-bold text-emerald-800">Fase {group.fase} — {group.items.length} CP</TableCell>
                    </TableRow>
                    {group.items.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                        <TableCell className="text-center"><Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold">Fase {item.fase}</Badge></TableCell>
                        <TableCell><div className="font-bold text-gray-900">{item.elemen}</div><Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">{item.mata_pelajaran}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-600 leading-relaxed">{item.cp}</TableCell>
                        <TableCell className="text-[10px] text-gray-600 whitespace-pre-line leading-relaxed py-4">{item.tp}</TableCell>
                        <TableCell><div className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-100">{item.materi_pokok}</div></TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormData({ ...item }); setTpGenCount(0); setDialogOpen(true); }} className="h-8 w-8 p-0 text-blue-600"><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 text-red-600"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setTpGenCount(0); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingItem ? 'Edit Data' : 'Tambah Data Baru'}
              <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="ml-auto text-purple-600 border-purple-200 hover:bg-purple-50 rounded-lg">
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} AI Deteksi Materi & 6 TP
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mata Pelajaran</label>
                <Select value={formData.mata_pelajaran} onValueChange={(v) => setFormData({...formData, mata_pelajaran: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Al-Quran Hadits', 'Akidah Akhlak', 'Fiqih', 'Sejarah Kebudayaan Islam', 'Bahasa Arab', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 'IPAS', 'Seni Budaya', 'PJOK', 'Bahasa Inggris', 'Muatan Lokal'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fase</label>
                <Select value={formData.fase} onValueChange={(val) => setFormData({ ...formData, fase: val })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="A">Fase A</SelectItem><SelectItem value="B">Fase B</SelectItem><SelectItem value="C">Fase C</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Elemen</label><Input placeholder="Contoh: Bilangan / Akidah" value={formData.elemen} onChange={(e) => setFormData({...formData, elemen: e.target.value})} className="rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Capaian Pembelajaran (CP)</label><Textarea placeholder="Tempel teks CP di sini..." value={formData.cp} onChange={(e) => setFormData({...formData, cp: e.target.value})} className="rounded-xl min-h-[100px]" /></div>
            <div><label className="block text-sm font-bold text-emerald-700">Materi Pokok (Topik Spesifik)</label><Input placeholder="Contoh: Penjumlahan 1-20" value={formData.materi_pokok} onChange={(e) => setFormData({...formData, materi_pokok: e.target.value})} className="rounded-xl border-emerald-200 bg-emerald-50/30" /></div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-bold text-gray-800">Tujuan Pembelajaran (TP) - 6 Domain</label>
                  {formData.tp && <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold">Variasi #{tpGenCount}</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="text-purple-600 border-purple-200 hover:bg-purple-50 rounded-lg whitespace-nowrap">
                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} Buat TP
                  </Button>
                  {formData.tp && (
                    <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-lg whitespace-nowrap">
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />} Ganti Variasi
                    </Button>
                  )}
                </div>
              </div>
              <Textarea 
                placeholder="Tulis TP atau klik 'Buat TP' untuk generate dari materi pokok..." 
                value={formData.tp} 
                onChange={(e) => setFormData({...formData, tp: e.target.value})} 
                className="rounded-xl min-h-[180px] font-mono text-xs border-2 border-gray-200 focus:border-purple-500" 
              />
              {formData.tp && (
                <p className="text-[11px] text-gray-500 mt-2 italic">
                  💡 Tip: Klik tombol "Ganti Variasi" untuk menghasilkan TP dengan operasional verb yang berbeda untuk materi yang sama
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan ke Database
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={refDialogOpen} onOpenChange={setRefDialogOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b bg-emerald-50">
            <div className="flex items-center justify-between mb-4">
              <DialogHeader>
                <DialogTitle className="text-emerald-900">Referensi CP Resmi (KMA 450 & Umum)</DialogTitle>
              </DialogHeader>
              <Button 
                onClick={handleSyncReferences} 
                disabled={isSyncing}
                size="sm" 
                className="bg-emerald-600 text-white rounded-lg"
              >
                {isSyncing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Database className="w-3 h-3 mr-2" />}
                Permanenkan ke Database
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <Input 
                placeholder="Cari Mapel (Matematika, Pancasila, Fiqih, dll)..." 
                value={refSearch} 
                onChange={(e) => setRefSearch(e.target.value)} 
                className="pl-10 rounded-xl border-emerald-200 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredRef.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic">Data referensi tidak ditemukan.</div>
            ) : (
              filteredRef.map((ref, idx) => (
                <Card key={idx} className="border-emerald-100 hover:border-emerald-300 transition-colors shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2">
                        <Badge className="bg-emerald-600 text-white border-0">Fase {ref.fase}</Badge>
                        <Badge variant="outline" className="text-emerald-700 border-emerald-200">{ref.mapel}</Badge>
                      </div>
                      <Button size="sm" onClick={() => copyFromRef(ref)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 rounded-lg h-8">
                        <Copy className="w-3 h-3 mr-1.5" /> Gunakan CP Ini
                      </Button>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Elemen: {ref.elemen}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{ref.cp}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="p-4 border-t bg-gray-50 text-center">
            <Button variant="ghost" onClick={() => setRefDialogOpen(false)} className="text-gray-500">Tutup Referensi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default BedahCP;