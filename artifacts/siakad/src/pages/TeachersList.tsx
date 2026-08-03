"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Search, ShieldCheck, GraduationCap, School, 
  Printer, ArrowLeft, Mail, Phone, CheckCircle, Clock, BookOpen, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { Teacher } from '@/pages/admin/TeachersAdmin';

const defaultTeachersPublic: Teacher[] = [
  {
    id: 'g-1',
    nama: 'Ahmad Syafii, S.Pd.I, M.Pd',
    nip: '198501152010011001',
    nik: '3302151501850001',
    pendidikan: 'S2 Pendidikan Agama Islam',
    sertifikasi: 'Sudah Sertifikasi',
    jabatan: 'Kepala Madrasah & Guru PAI',
    mapel_diampu: 'Akidah Akhlak',
    gender: 'Laki-laki',
    telepon: '081234567890',
    email: 'ahmad.syafii@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-2',
    nama: 'Siti Nurjanah, S.Pd',
    nip: '199003202015022002',
    nik: '3302156003900002',
    pendidikan: 'S1 PGMI / PGSD',
    sertifikasi: 'Sudah Sertifikasi',
    jabatan: 'Guru Kelas I',
    mapel_diampu: 'Guru Kelas / Tematik',
    gender: 'Perempuan',
    telepon: '082198765432',
    email: 'siti.nurjanah@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-3',
    nama: 'M. Ridwan Kurniawan, S.Pd',
    nip: '199307122019031003',
    nik: '3302151207930003',
    pendidikan: 'S1 Pendidikan Bahasa Arab',
    sertifikasi: 'Dalam Proses',
    jabatan: 'Guru Mapel Bahasa Arab',
    mapel_diampu: 'Bahasa Arab & Al-Qur\'an Hadis',
    gender: 'Laki-laki',
    telepon: '085712345678',
    email: 'ridwan.kurniawan@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-4',
    nama: 'Dewi Rahmawati, S.Kom',
    nip: '-',
    nik: '3302154508950004',
    pendidikan: 'S1 Teknik Informatika',
    sertifikasi: 'Belum Sertifikasi',
    jabatan: 'Guru TIK & Operator EMIS',
    mapel_diampu: 'Informatika / TIK',
    gender: 'Perempuan',
    telepon: '088812349999',
    email: 'dewi.rahmawati@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-5',
    nama: 'Bambang Subagyo, S.Pd',
    nip: '198811022014011005',
    nik: '3302150211880005',
    pendidikan: 'S1 Pendidikan Jasmani (PJOK)',
    sertifikasi: 'Sudah Sertifikasi',
    jabatan: 'Guru PJOK & Pembina Pramuka',
    mapel_diampu: 'PJOK',
    gender: 'Laki-laki',
    telepon: '081398761234',
    email: 'bambang.subagyo@mimaarif.sch.id',
    status_keaktifan: 'Aktif',
    created_at: new Date().toISOString(),
  }
];

const TeachersList = () => {
  const navigate = useNavigate();
  const { activeMadrasah, getScopedKey } = useMadrasah();
  const [teachers, setTeachers] = useState<Teacher[]>(defaultTeachersPublic);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSertifikasi, setFilterSertifikasi] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    fetchTeachers();

    const channel = supabase
      .channel('public:site_settings:teachers_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload?.new && payload.new.id?.includes('guru')) {
          fetchTeachers();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMadrasah]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const ALL_GURU_KEYS = Array.from(new Set([
        getScopedKey('data_guru'),
        `data_guru_${activeMadrasah?.id || 'madrasah_default'}`,
        'data_guru_madrasah_default',
        'data_guru',
        'siakad_data_guru'
      ]));

      const { data } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', ALL_GURU_KEYS);

      let loaded: Teacher[] = [];
      if (data && data.length > 0) {
        for (const k of ALL_GURU_KEYS) {
          const row = data.find(d => d.id === k);
          if (row?.value && Array.isArray(row.value) && row.value.length > 0) {
            loaded = row.value;
            break;
          }
        }
      }

      if (loaded.length === 0 && settings.data_guru && Array.isArray(settings.data_guru) && settings.data_guru.length > 0) {
        loaded = settings.data_guru;
      }

      if (loaded.length > 0) {
        setTeachers(loaded);
      } else {
        setTeachers(defaultTeachersPublic);
      }
    } catch (err) {
      console.error('Error fetching public teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = 
        t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.jabatan.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSertifikasi = 
        filterSertifikasi === 'all' || t.sertifikasi === filterSertifikasi;

      return matchesSearch && matchesSertifikasi;
    });
  }, [teachers, searchQuery, filterSertifikasi]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Printable Area */}
      <div className="hidden print:block font-serif text-black p-6 space-y-4">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h2 className="text-lg font-bold uppercase">DAFTAR GURU & TENAGA KEPENDIDIKAN (GTK)</h2>
          <h1 className="text-xl font-black uppercase text-emerald-950">{activeMadrasah.nama_madrasah || "MADRASAH IBTIDAIYAH"}</h1>
          <p className="text-xs italic mt-0.5">
            NSM: {activeMadrasah.nsm || '-'} | NPSN: {activeMadrasah.npsn || '-'}
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-200 text-center font-bold">
              <th className="border border-black p-2 w-10">NO</th>
              <th className="border border-black p-2 text-left">NAMA LENGKAP & GELAR</th>
              <th className="border border-black p-2">NIP / NPK</th>
              <th className="border border-black p-2">NIK</th>
              <th className="border border-black p-2">PENDIDIKAN</th>
              <th className="border border-black p-2">SERTIFIKASI</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((t, idx) => (
              <tr key={t.id} className="text-center">
                <td className="border border-black p-2 font-bold">{idx + 1}</td>
                <td className="border border-black p-2 text-left font-bold">{t.nama}</td>
                <td className="border border-black p-2 font-mono">{t.nip || '-'}</td>
                <td className="border border-black p-2 font-mono">{t.nik || '-'}</td>
                <td className="border border-black p-2">{t.pendidikan}</td>
                <td className="border border-black p-2 font-bold">{t.sertifikasi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Main Public Screen */}
      <div className="print:hidden">
        {/* Header Hero */}
        <div className="bg-gradient-to-b from-emerald-900 via-teal-900 to-slate-900 text-white py-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="text-emerald-200 hover:text-white hover:bg-white/10 rounded-2xl gap-2 text-xs font-bold -ml-2"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-400 text-emerald-950 font-black uppercase text-[10px] px-2.5 py-0.5 rounded-full">
                    Tenaga Pendidik Profesional
                  </Badge>
                  <Badge variant="outline" className="text-emerald-200 border-emerald-400/30 text-[10px]">
                    Total {teachers.length} Orang
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mt-2 text-white">
                  Daftar Guru & Tenaga Kependidikan (GTK)
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
                  Profil dewan guru dan tenaga kependidikan {activeMadrasah.nama_madrasah || 'Madrasah'}, beserta kualifikasi pendidikan dan status sertifikasi resmi.
                </p>
              </div>

              <Button
                onClick={handlePrint}
                className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-2xl gap-2 shadow-lg px-5 text-xs self-start md:self-auto"
              >
                <Printer className="w-4 h-4" /> Cetak Daftar Guru
              </Button>
            </div>

            {/* Main Mode Toggle Tabs - Horizontal Iconic Menu */}
            <div className="flex items-center justify-center mt-6">
              <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-emerald-500/30 shadow-2xl flex flex-row items-center gap-2 overflow-x-auto max-w-full scrollbar-none">
                <button
                  onClick={() => setFilterSertifikasi('all')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 shrink-0 ${
                    filterSertifikasi === 'all' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 ring-2 ring-emerald-300' 
                      : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${filterSertifikasi === 'all' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <span>Daftar Guru & GTK ({teachers.length})</span>
                </button>

                <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block shrink-0" />

                <button
                  onClick={() => setFilterSertifikasi('Sudah Sertifikasi')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 shrink-0 ${
                    filterSertifikasi === 'Sudah Sertifikasi' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 ring-2 ring-emerald-300' 
                      : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${filterSertifikasi === 'Sudah Sertifikasi' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span>Sudah Sertifikasi ({teachers.filter(t => t.sertifikasi === 'Sudah Sertifikasi').length})</span>
                </button>

                <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block shrink-0" />

                <button
                  onClick={() => setFilterSertifikasi('Dalam Proses')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 shrink-0 ${
                    filterSertifikasi === 'Dalam Proses' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 ring-2 ring-emerald-300' 
                      : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${filterSertifikasi === 'Dalam Proses' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span>Proses PPG ({teachers.filter(t => t.sertifikasi === 'Dalam Proses').length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white mb-6">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari nama guru, NIP, NIK, atau mata pelajaran..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-2xl text-xs font-medium border-slate-200"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Select value={filterSertifikasi} onValueChange={setFilterSertifikasi}>
                    <SelectTrigger className="w-[180px] rounded-2xl text-xs font-bold border-slate-200">
                      <SelectValue placeholder="Status Sertifikasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Sertifikasi</SelectItem>
                      <SelectItem value="Sudah Sertifikasi">Sudah Sertifikasi</SelectItem>
                      <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                      <SelectItem value="Belum Sertifikasi">Belum Sertifikasi</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('table')}
                      className={`h-8 text-xs font-bold rounded-xl px-3 ${viewMode === 'table' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
                    >
                      Tabel
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('cards')}
                      className={`h-8 text-xs font-bold rounded-xl px-3 ${viewMode === 'cards' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
                    >
                      Kartu
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table View */}
          {viewMode === 'table' ? (
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      <th className="p-3.5 text-center w-12 border-r border-slate-800">NO</th>
                      <th className="p-3.5 border-r border-slate-800">NAMA LENGKAP & GELAR</th>
                      <th className="p-3.5 border-r border-slate-800">NIP / NPK</th>
                      <th className="p-3.5 border-r border-slate-800">NIK (16 DIGIT)</th>
                      <th className="p-3.5 border-r border-slate-800">PENDIDIKAN TERAKHIR</th>
                      <th className="p-3.5 text-center">STATUS SERTIFIKASI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeachers.length > 0 ? (
                      filteredTeachers.map((teacher, index) => (
                        <tr key={teacher.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-800 border-r border-slate-100 font-mono">
                            {index + 1}
                          </td>
                          <td className="p-3.5 border-r border-slate-100">
                            <div className="flex items-center gap-3">
                              {teacher.foto_url ? (
                                <img src={teacher.foto_url} alt={teacher.nama} className="w-10 h-10 rounded-full object-cover border border-emerald-300 shadow-sm shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-200">
                                  {teacher.nama.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-extrabold text-slate-900 text-sm">{teacher.nama}</div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  <span className="text-emerald-700 font-bold">{teacher.jabatan}</span>
                                  {teacher.mapel_diampu && <span> • {teacher.mapel_diampu}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-mono text-slate-800 font-bold">
                            {teacher.nip || '-'}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-mono text-slate-700 font-medium">
                            {teacher.nik || '-'}
                          </td>
                          <td className="p-3.5 border-r border-slate-100 font-bold text-slate-800">
                            {teacher.pendidikan}
                          </td>
                          <td className="p-3.5 text-center">
                            {teacher.sertifikasi === 'Sudah Sertifikasi' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-300">
                                <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Sudah Sertifikasi
                              </Badge>
                            ) : teacher.sertifikasi === 'Dalam Proses' ? (
                              <Badge className="bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-300">
                                <Clock className="w-3 h-3 mr-1 text-amber-700" /> Dalam Proses
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold px-2.5 py-1 rounded-full text-[10px]">
                                Belum Sertifikasi
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                          Tidak ditemukan data guru sesuai pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((teacher, index) => (
                <Card key={teacher.id} className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white hover:shadow-xl transition-shadow p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {teacher.foto_url ? (
                      <img src={teacher.foto_url} alt={teacher.nama} className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-200 shadow-sm shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center font-black text-xl shrink-0 border border-emerald-200">
                        {teacher.nama.charAt(0)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h3 className="font-black text-slate-900 text-sm truncate">{teacher.nama}</h3>
                      <p className="text-xs font-bold text-emerald-700 truncate">{teacher.jabatan}</p>
                      {teacher.mapel_diampu && <p className="text-[11px] text-slate-500 truncate">{teacher.mapel_diampu}</p>}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">NIP / NPK:</span>
                      <span className="font-mono font-bold text-slate-800">{teacher.nip || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">NIK:</span>
                      <span className="font-mono font-medium text-slate-700">{teacher.nik || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Pendidikan:</span>
                      <span className="font-bold text-slate-800">{teacher.pendidikan}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Sertifikasi:</span>
                    {teacher.sertifikasi === 'Sudah Sertifikasi' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Sudah Sertifikasi
                      </Badge>
                    ) : teacher.sertifikasi === 'Dalam Proses' ? (
                      <Badge className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Dalam Proses
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                        Belum Sertifikasi
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeachersList;
