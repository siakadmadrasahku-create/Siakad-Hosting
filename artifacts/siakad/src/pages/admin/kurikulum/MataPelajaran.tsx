"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Pencil, Trash2, BookOpen, LayoutGrid, Info, Save, Loader2, 
  CheckCircle2, BookMarked, GraduationCap, Star, Search, Sparkles, 
  Scale, History, Languages, ShieldCheck, Calculator, Atom, Trophy, 
  Palette, Globe, MapPin, Layers, List, BookOpenCheck, HeartHandshake, 
  FileText, Activity, Compass, Award, Copy, HelpCircle
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface MapelItem {
  id: string;
  nama: string;
  kelompok: 'A' | 'B' | 'C';
  singkatan: string;
  keterangan?: string;
}

// Function to map mapel name / code to iconic visual theme & Lucide icon
const getMapelTheme = (mapel: MapelItem) => {
  const name = mapel.nama.toLowerCase();
  const code = mapel.singkatan.toLowerCase();

  // Special NU / Aswaja / Ke-NU-an Mapping
  if (name.includes('nu') || name.includes('aswaja') || name.includes('ma\'arif') || code.includes('nu') || code.includes('asw')) {
    return {
      icon: Award,
      gradient: 'from-emerald-600 via-teal-600 to-green-700',
      bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      badgeBg: 'bg-emerald-600 text-white shadow-xs',
      accentColor: 'border-l-emerald-600',
      tag: 'Ke-NU-an / Aswaja'
    };
  }

  // Kemuhammadiyahan
  if (name.includes('muhammadiyah') || code.includes('kmd') || code.includes('muh')) {
    return {
      icon: Sparkles,
      gradient: 'from-amber-500 via-orange-600 to-amber-700',
      bgLight: 'bg-amber-50 text-amber-800 border-amber-300',
      badgeBg: 'bg-amber-600 text-white shadow-xs',
      accentColor: 'border-l-amber-600',
      tag: 'Keorganisasian'
    };
  }

  // Tahfidz / Hafiz
  if (name.includes('tahfidz') || name.includes('tahfiz') || name.includes('hafiz') || code.includes('thf')) {
    return {
      icon: Trophy,
      gradient: 'from-amber-500 via-yellow-500 to-amber-700',
      bgLight: 'bg-amber-50 text-amber-900 border-amber-300',
      badgeBg: 'bg-amber-500 text-slate-950 font-black shadow-xs',
      accentColor: 'border-l-amber-500',
      tag: 'Program Unggulan'
    };
  }

  // BTQ / Baca Tulis Al-Qur'an
  if (name.includes('btq') || name.includes('baca tulis') || code.includes('btq')) {
    return {
      icon: BookOpenCheck,
      gradient: 'from-teal-500 via-emerald-600 to-cyan-700',
      bgLight: 'bg-teal-50 text-teal-800 border-teal-300',
      badgeBg: 'bg-teal-600 text-white shadow-xs',
      accentColor: 'border-l-teal-600',
      tag: 'Keagamaan Mulok'
    };
  }

  // Al-Qur'an Hadis
  if (name.includes('qur') || code === 'qh') {
    return {
      icon: BookOpenCheck,
      gradient: 'from-emerald-500 to-teal-700',
      bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      accentColor: 'border-l-emerald-500',
      tag: 'Agama Islam (A)'
    };
  }

  // Akidah Akhlak
  if (name.includes('akidah') || code === 'aa') {
    return {
      icon: HeartHandshake,
      gradient: 'from-violet-500 to-purple-700',
      bgLight: 'bg-violet-50 text-violet-700 border-violet-200',
      badgeBg: 'bg-violet-100 text-violet-800',
      accentColor: 'border-l-violet-500',
      tag: 'Agama Islam (A)'
    };
  }

  // Fikih
  if (name.includes('fikih') || code === 'fq') {
    return {
      icon: Scale,
      gradient: 'from-purple-500 to-indigo-700',
      bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-800',
      accentColor: 'border-l-purple-500',
      tag: 'Agama Islam (A)'
    };
  }

  // Sejarah Kebudayaan Islam (SKI)
  if (name.includes('sejarah') || name.includes('ski') || code === 'ski') {
    return {
      icon: History,
      gradient: 'from-amber-500 to-orange-700',
      bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
      accentColor: 'border-l-amber-500',
      tag: 'Agama Islam (A)'
    };
  }

  // Bahasa Arab
  if (name.includes('arab') || code === 'ba') {
    return {
      icon: Languages,
      gradient: 'from-teal-500 to-cyan-700',
      bgLight: 'bg-teal-50 text-teal-700 border-teal-200',
      badgeBg: 'bg-teal-100 text-teal-800',
      accentColor: 'border-l-teal-500',
      tag: 'Agama Islam (A)'
    };
  }

  // Pendidikan Pancasila
  if (name.includes('pancasila') || name.includes('ppkn') || code === 'pp') {
    return {
      icon: ShieldCheck,
      gradient: 'from-red-500 to-rose-700',
      bgLight: 'bg-red-50 text-red-700 border-red-200',
      badgeBg: 'bg-red-100 text-red-800',
      accentColor: 'border-l-red-500',
      tag: 'Nasional (B)'
    };
  }

  // Bahasa Indonesia
  if (name.includes('indonesia') || code === 'bin') {
    return {
      icon: FileText,
      gradient: 'from-blue-500 to-indigo-700',
      bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-800',
      accentColor: 'border-l-blue-500',
      tag: 'Nasional (B)'
    };
  }

  // Matematika
  if (name.includes('matematika') || code === 'mtk') {
    return {
      icon: Calculator,
      gradient: 'from-sky-500 to-blue-700',
      bgLight: 'bg-sky-50 text-sky-700 border-sky-200',
      badgeBg: 'bg-sky-100 text-sky-800',
      accentColor: 'border-l-sky-500',
      tag: 'Nasional (B)'
    };
  }

  // IPAS
  if (name.includes('ipas') || name.includes('ipa') || code === 'ipas') {
    return {
      icon: Atom,
      gradient: 'from-cyan-500 to-teal-700',
      bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      badgeBg: 'bg-cyan-100 text-cyan-800',
      accentColor: 'border-l-cyan-500',
      tag: 'Sains & Sosial (B)'
    };
  }

  // PJOK
  if (name.includes('pjok') || name.includes('olahraga')) {
    return {
      icon: Activity,
      gradient: 'from-orange-500 to-amber-700',
      bgLight: 'bg-orange-50 text-orange-700 border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-800',
      accentColor: 'border-l-orange-500',
      tag: 'Olahraga (B)'
    };
  }

  // Seni Budaya
  if (name.includes('seni') || name.includes('budaya') || code === 'sb') {
    return {
      icon: Palette,
      gradient: 'from-pink-500 to-rose-700',
      bgLight: 'bg-pink-50 text-pink-700 border-pink-200',
      badgeBg: 'bg-pink-100 text-pink-800',
      accentColor: 'border-l-pink-500',
      tag: 'Seni (B)'
    };
  }

  // Bahasa Inggris
  if (name.includes('inggris') || code === 'big') {
    return {
      icon: Globe,
      gradient: 'from-indigo-500 to-blue-700',
      bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      accentColor: 'border-l-indigo-500',
      tag: 'Bahasa Asing (B)'
    };
  }

  // Bahasa Jawa / Daerah / Sunda
  if (name.includes('jawa') || name.includes('sunda') || name.includes('daerah')) {
    return {
      icon: Compass,
      gradient: 'from-lime-600 via-emerald-700 to-teal-800',
      bgLight: 'bg-lime-50 text-lime-900 border-lime-300',
      badgeBg: 'bg-lime-600 text-white shadow-xs',
      accentColor: 'border-l-lime-600',
      tag: 'Mulok Daerah'
    };
  }

  // General Mulok
  if (mapel.kelompok === 'C' || name.includes('lokal') || name.includes('mulok')) {
    return {
      icon: MapPin,
      gradient: 'from-amber-500 to-emerald-600',
      bgLight: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeBg: 'bg-amber-600 text-white shadow-xs',
      accentColor: 'border-l-amber-500',
      tag: 'Muatan Lokal (C)'
    };
  }

  // Fallback
  return {
    icon: BookOpen,
    gradient: mapel.kelompok === 'A' ? 'from-purple-500 to-indigo-600' : mapel.kelompok === 'B' ? 'from-blue-500 to-cyan-600' : 'from-amber-500 to-orange-600',
    bgLight: 'bg-slate-50 text-slate-700 border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800',
    accentColor: 'border-l-emerald-500',
    tag: `Kelompok ${mapel.kelompok}`
  };
};

const MataPelajaran = () => {
  const [mapels, setMapels] = useState<MapelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MapelItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('grid');
  const [formData, setFormData] = useState<Omit<MapelItem, 'id'>>({
    nama: '',
    kelompok: 'B',
    singkatan: '',
    keterangan: ''
  });

  useEffect(() => {
    fetchMapels();
  }, []);

  const fetchMapels = async () => {
    try {
      const { data: res, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'mata_pelajaran_list')
        .maybeSingle();

      if (error) throw error;
      if (res?.value && Array.isArray(res.value)) {
        setMapels(res.value as MapelItem[]);
      } else {
        const defaults: MapelItem[] = [
          { id: '1', nama: 'Al-Qur\'an Hadis', kelompok: 'A', singkatan: 'QH', keterangan: 'Pendidikan Agama Islam (PAI)' },
          { id: '2', nama: 'Akidah Akhlak', kelompok: 'A', singkatan: 'AA', keterangan: 'Pendidikan Agama Islam (PAI)' },
          { id: '3', nama: 'Fikih', kelompok: 'A', singkatan: 'FQ', keterangan: 'Pendidikan Agama Islam (PAI)' },
          { id: '4', nama: 'Sejarah Kebudayaan Islam', kelompok: 'A', singkatan: 'SKI', keterangan: 'Pendidikan Agama Islam (PAI)' },
          { id: '5', nama: 'Bahasa Arab', kelompok: 'A', singkatan: 'BA', keterangan: 'Bahasa Asing Keagamaan' },
          { id: '6', nama: 'Pendidikan Pancasila', kelompok: 'B', singkatan: 'PP', keterangan: 'Muatan Nasional' },
          { id: '7', nama: 'Bahasa Indonesia', kelompok: 'B', singkatan: 'BIN', keterangan: 'Muatan Nasional' },
          { id: '8', nama: 'Matematika', kelompok: 'B', singkatan: 'MTK', keterangan: 'Muatan Nasional' },
          { id: '9', nama: 'IPAS', kelompok: 'B', singkatan: 'IPAS', keterangan: 'Ilmu Pengetahuan Alam & Sosial' },
          { id: '10', nama: 'PJOK', kelompok: 'B', singkatan: 'PJOK', keterangan: 'Pendidikan Jasmani Olahraga & Kesehatan' },
          { id: '11', nama: 'Seni dan Budaya', kelompok: 'B', singkatan: 'SB', keterangan: 'Seni & Prakarya' },
          { id: '12', nama: 'Bahasa Inggris', kelompok: 'B', singkatan: 'BIG', keterangan: 'Bahasa Asing Umum' },
          { id: '13', nama: 'Bina Ke-NU-an (Aswaja)', kelompok: 'C', singkatan: 'NU', keterangan: 'Ke-NU-an & Keorganisasian LP Ma\'arif NU' },
          { id: '14', nama: 'Muatan Lokal Bahasa Daerah', kelompok: 'C', singkatan: 'ML', keterangan: 'Bahasa Daerah / Keunggulan Lokal' },
          { id: '15', nama: 'Tahfidz / BTQ', kelompok: 'C', singkatan: 'BTQ', keterangan: 'Program Khusus Baca Tulis Al-Qur\'an & Hafalan' },
        ];
        setMapels(defaults);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.singkatan) {
      showError('Nama dan Singkatan wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      let newList: MapelItem[];
      if (editingItem) {
        newList = mapels.map(m => m.id === editingItem.id ? { ...formData, id: m.id } : m);
      } else {
        newList = [{ ...formData, id: Date.now().toString() }, ...mapels];
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'mata_pelajaran_list', value: newList, updated_at: new Date().toISOString() });

      if (error) throw error;
      setMapels(newList);
      showSuccess('Data mata pelajaran berhasil disimpan');
      setDialogOpen(false);
    } catch (err) {
      showError('Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const newList = mapels.filter(m => m.id !== id);
      await supabase.from('site_settings').upsert({ id: 'mata_pelajaran_list', value: newList, updated_at: new Date().toISOString() });
      setMapels(newList);
      showSuccess('Mata pelajaran dihapus');
    } catch (err) {
      showError('Gagal menghapus');
    }
  };

  const stats = useMemo(() => {
    const total = mapels.length;
    const kelompokA = mapels.filter(m => m.kelompok === 'A').length;
    const kelompokB = mapels.filter(m => m.kelompok === 'B').length;
    const kelompokC = mapels.filter(m => m.kelompok === 'C').length;
    return { total, kelompokA, kelompokB, kelompokC };
  }, [mapels]);

  const renderMapelGrid = (filterKelompok: 'A' | 'B' | 'C' | 'all') => {
    let filtered = filterKelompok === 'all' 
      ? mapels 
      : mapels.filter(m => m.kelompok === filterKelompok);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.nama.toLowerCase().includes(query) || 
        m.singkatan.toLowerCase().includes(query) ||
        (m.keterangan && m.keterangan.toLowerCase().includes(query))
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="py-14 text-center bg-slate-50/80 rounded-3xl border-2 border-dashed border-slate-200">
          <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-bounce" />
          <h3 className="text-base font-bold text-slate-700 mb-1">Mata Pelajaran Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? `Tidak ada mata pelajaran matching "${searchQuery}"` : 'Belum ada mata pelajaran di kelompok ini.'}
          </p>
        </div>
      );
    }

    if (viewStyle === 'table') {
      return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-12 text-center font-bold">#</TableHead>
                <TableHead className="font-bold">Mata Pelajaran</TableHead>
                <TableHead className="font-bold">Kode / Singkatan</TableHead>
                <TableHead className="font-bold">Kelompok</TableHead>
                <TableHead className="font-bold">Keterangan</TableHead>
                <TableHead className="text-right font-bold pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => {
                const theme = getMapelTheme(item);
                const IconComp = theme.icon;
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/10`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-slate-900 text-sm leading-tight">{item.nama}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                        {item.singkatan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 font-bold ${
                        item.kelompok === 'A' ? 'bg-purple-100 text-purple-800' :
                        item.kelompok === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        Kelompok {item.kelompok}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">{item.keterangan || '-'}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({ ...item });
                            setDialogOpen(true);
                          }} 
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(item.id)} 
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
        {filtered.map((item) => {
          const theme = getMapelTheme(item);
          const IconComp = theme.icon;

          return (
            <div 
              key={item.id} 
              className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-3.5 shadow-2xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
            >
              {/* Top Accent Gradient Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />

              <div>
                {/* Header: Icon & Category Badges */}
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                    <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`font-black px-1.5 py-0.5 text-[8px] sm:text-[9px] rounded uppercase tracking-wider ${
                      item.kelompok === 'A' ? 'bg-purple-100 text-purple-900 border border-purple-200/80' : 
                      item.kelompok === 'B' ? 'bg-blue-100 text-blue-900 border border-blue-200/80' : 'bg-amber-100 text-amber-900 border border-amber-200/80'
                    }`}>
                      Kel. {item.kelompok}
                    </span>
                    {theme.tag && (
                      <span className={`text-[7.5px] sm:text-[8px] font-extrabold px-1 py-0.5 rounded truncate max-w-[85px] ${theme.badgeBg}`}>
                        {theme.tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subject Name */}
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight mb-1 group-hover:text-emerald-700 transition-colors line-clamp-2 min-h-[2rem]">
                  {item.nama}
                </h3>

                {/* Code & Keterangan */}
                <div className="flex flex-wrap items-center gap-1 mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/80">
                    {item.singkatan}
                  </span>
                  {item.keterangan && (
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate max-w-[80px] sm:max-w-[120px]">
                      {item.keterangan}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between mt-1">
                <span className="text-[8.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[60px] sm:max-w-none">
                  Akademik MI
                </span>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setFormData({ ...item });
                      setDialogOpen(true);
                    }} 
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center border border-slate-200/70 cursor-pointer active:scale-95"
                    title="Edit Mata Pelajaran"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDelete(item.id)} 
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center border border-slate-200/70 cursor-pointer active:scale-95"
                    title="Hapus Mata Pelajaran"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const strukturData = [
    { mapel: 'Al-Qur\'an Hadis', kelompok: 'A', k1: 2, k2: 2, k3: 2, k4: 2, k5: 2, k6: 2 },
    { mapel: 'Akidah Akhlak', kelompok: 'A', k1: 2, k2: 2, k3: 2, k4: 2, k5: 2, k6: 2 },
    { mapel: 'Fikih', kelompok: 'A', k1: 2, k2: 2, k3: 2, k4: 2, k5: 2, k6: 2 },
    { mapel: 'SKI', kelompok: 'A', k1: 0, k2: 0, k3: 2, k4: 2, k5: 2, k6: 2 },
    { mapel: 'Bahasa Arab', kelompok: 'A', k1: 2, k2: 2, k3: 2, k4: 2, k5: 2, k6: 2 },
    { mapel: 'Pendidikan Pancasila', kelompok: 'B', k1: 4, k2: 4, k3: 4, k4: 4, k5: 4, k6: 4 },
    { mapel: 'Bahasa Indonesia', kelompok: 'B', k1: 8, k2: 8, k3: 7, k4: 7, k5: 7, k6: 7 },
    { mapel: 'Matematika', kelompok: 'B', k1: 4, k2: 5, k3: 5, k4: 5, k5: 5, k6: 5 },
    { mapel: 'IPAS', kelompok: 'B', k1: 0, k2: 0, k3: 5, k4: 5, k5: 5, k6: 5 },
    { mapel: 'PJOK', kelompok: 'B', k1: 3, k2: 3, k3: 3, k4: 3, k5: 3, k6: 3 },
    { mapel: 'Seni dan Budaya', kelompok: 'B', k1: 3, k2: 3, k3: 3, k4: 3, k5: 3, k6: 3 },
    { mapel: 'Bahasa Inggris', kelompok: 'B', k1: 2, k2: 2, k3: 2, k4: 2, k5: 2, k6: 2 },
    { mapel: 'Muatan Lokal', kelompok: 'C', k1: 2, k2: 2, k3: 2, k4: 2, k5: 2, k6: 2 },
  ];

  return (
    <AdminLayout title="Manajemen Mata Pelajaran">
      {/* Modern Banner Hero */}
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kurikulum Madrasah KMA 450 Tahun 2024</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Pengaturan Mata Pelajaran
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
              Kelola struktur, kode, dan alokasi mata pelajaran yang diajarkan di Madrasah Ibtidaiyah secara fleksibel dan terpadu.
            </p>
          </div>

          <Button 
            onClick={() => {
              setEditingItem(null);
              setFormData({ nama: '', kelompok: 'B', singkatan: '', keterangan: '' });
              setDialogOpen(true);
            }} 
            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-2xl h-12 px-6 shadow-lg shadow-emerald-400/20 shrink-0 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5 mr-2 stroke-[3]" /> Tambah Mapel
          </Button>
        </div>

        {/* Dynamic Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Total Mapel</p>
              <p className="text-lg font-black text-white leading-none">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 text-purple-200 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">Kelompok A (Agama)</p>
              <p className="text-lg font-black text-white leading-none">{stats.kelompokA}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-blue-200 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Kelompok B (Umum)</p>
              <p className="text-lg font-black text-white leading-none">{stats.kelompokB}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/30 text-amber-200 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Kelompok C (Mulok)</p>
              <p className="text-lg font-black text-white leading-none">{stats.kelompokC}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="daftar" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <TabsList className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 h-auto">
            <TabsTrigger value="daftar" className="rounded-xl font-bold text-xs py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutGrid className="w-4 h-4 mr-2 text-emerald-600" /> Daftar Mata Pelajaran
            </TabsTrigger>
            <TabsTrigger value="struktur" className="rounded-xl font-bold text-xs py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BookOpen className="w-4 h-4 mr-2 text-indigo-600" /> Alokasi Jam (KMA 450)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="daftar" className="space-y-6 mt-0">
          {/* Controls Bar: Search & View Mode Switcher */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari mata pelajaran atau kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 text-xs sm:text-sm focus-visible:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewStyle('grid')}
                  className={`h-9 px-3 rounded-lg text-xs font-bold transition-all ${
                    viewStyle === 'grid' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 mr-1.5" /> Grid Card
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewStyle('table')}
                  className={`h-9 px-3 rounded-lg text-xs font-bold transition-all ${
                    viewStyle === 'table' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4 mr-1.5" /> Tabel
                </Button>
              </div>
            </div>
          </div>

          {/* Group Category Tabs */}
          <Tabs defaultValue="all" className="space-y-6">
            <div className="overflow-x-auto pb-1.5 -mx-1 px-1 no-scrollbar">
              <TabsList className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 inline-flex w-max min-w-full sm:w-auto gap-1.5">
                <TabsTrigger 
                  value="all" 
                  className="rounded-xl px-4 py-2 text-xs font-black whitespace-nowrap transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md cursor-pointer flex items-center"
                >
                  <Layers className="w-4 h-4 mr-1.5 text-emerald-400" /> Semua
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200/80 text-slate-800 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                    {stats.total}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="A" 
                  className="rounded-xl px-4 py-2 text-xs font-black whitespace-nowrap transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-600/25 cursor-pointer flex items-center"
                >
                  <Star className="w-4 h-4 mr-1.5 text-purple-600 fill-purple-100 data-[state=active]:text-white data-[state=active]:fill-purple-200" /> Agama (Kelompok A)
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 data-[state=active]:bg-purple-800/80 data-[state=active]:text-purple-100">
                    {stats.kelompokA}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="B" 
                  className="rounded-xl px-4 py-2 text-xs font-black whitespace-nowrap transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-600/25 cursor-pointer flex items-center"
                >
                  <GraduationCap className="w-4 h-4 mr-1.5 text-blue-600 fill-blue-100 data-[state=active]:text-white data-[state=active]:fill-blue-200" /> Umum (Kelompok B)
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 data-[state=active]:bg-blue-800/80 data-[state=active]:text-blue-100">
                    {stats.kelompokB}
                  </span>
                </TabsTrigger>
                <TabsTrigger 
                  value="C" 
                  className="rounded-xl px-4 py-2 text-xs font-black whitespace-nowrap transition-all data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-600/25 cursor-pointer flex items-center"
                >
                  <MapPin className="w-4 h-4 mr-1.5 text-amber-600 fill-amber-100 data-[state=active]:text-white data-[state=active]:fill-amber-200" /> Mulok (Kelompok C)
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 data-[state=active]:bg-amber-800/80 data-[state=active]:text-amber-100">
                    {stats.kelompokC}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-36 animate-pulse bg-slate-100 border-0 rounded-2xl" />)}
              </div>
            ) : (
              <>
                <TabsContent value="all" className="mt-0">{renderMapelGrid('all')}</TabsContent>
                <TabsContent value="A" className="mt-0">{renderMapelGrid('A')}</TabsContent>
                <TabsContent value="B" className="mt-0">{renderMapelGrid('B')}</TabsContent>
                <TabsContent value="C" className="mt-0">{renderMapelGrid('C')}</TabsContent>
              </>
            )}
          </Tabs>
        </TabsContent>

        <TabsContent value="struktur" className="mt-0">
          <Card className="border border-slate-200/80 shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-6">
              <CardTitle className="flex items-center gap-3 text-lg font-black">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">Alokasi Jam Pelajaran (KMA 450 Tahun 2024)</h3>
                  <p className="text-xs text-emerald-100 font-normal mt-0.5">Standar Alokasi JP Intrakurikuler Per Minggu untuk Madrasah Ibtidaiyah (MI)</p>
                </div>
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-extrabold text-slate-800 min-w-[220px]">Mata Pelajaran</TableHead>
                    <TableHead className="font-extrabold text-slate-800 text-center">Kelompok</TableHead>
                    <TableHead className="text-center font-extrabold text-slate-800">Kelas I</TableHead>
                    <TableHead className="text-center font-extrabold text-slate-800">Kelas II</TableHead>
                    <TableHead className="text-center font-extrabold text-slate-800">Kelas III</TableHead>
                    <TableHead className="text-center font-extrabold text-slate-800">Kelas IV</TableHead>
                    <TableHead className="text-center font-extrabold text-slate-800">Kelas V</TableHead>
                    <TableHead className="text-center font-extrabold text-slate-800">Kelas VI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strukturData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-bold text-slate-800">{row.mapel}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`border-0 font-extrabold ${
                          row.kelompok === 'A' ? 'bg-purple-100 text-purple-800' :
                          row.kelompok === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Kel. {row.kelompok}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{row.k1 ? `${row.k1} JP` : '-'}</TableCell>
                      <TableCell className="text-center font-medium">{row.k2 ? `${row.k2} JP` : '-'}</TableCell>
                      <TableCell className="text-center font-medium">{row.k3 ? `${row.k3} JP` : '-'}</TableCell>
                      <TableCell className="text-center font-medium">{row.k4 ? `${row.k4} JP` : '-'}</TableCell>
                      <TableCell className="text-center font-medium">{row.k5 ? `${row.k5} JP` : '-'}</TableCell>
                      <TableCell className="text-center font-medium">{row.k6 ? `${row.k6} JP` : '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-emerald-50/80 font-black text-slate-900 border-t-2 border-emerald-200">
                    <TableCell colSpan={2} className="text-right uppercase tracking-wider text-xs font-black">Total Alokasi JP Per Minggu</TableCell>
                    <TableCell className="text-center text-emerald-800">33 JP</TableCell>
                    <TableCell className="text-center text-emerald-800">35 JP</TableCell>
                    <TableCell className="text-center text-emerald-800">41 JP</TableCell>
                    <TableCell className="text-center text-emerald-800">41 JP</TableCell>
                    <TableCell className="text-center text-emerald-800">41 JP</TableCell>
                    <TableCell className="text-center text-emerald-800">41 JP</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <CardContent className="p-5 bg-amber-50/80 border-t border-amber-200/60">
              <div className="flex gap-3 text-xs text-amber-900 leading-relaxed font-medium">
                <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold mb-0.5">Catatan Penting Alokasi Jam:</p>
                  <p>Alokasi di atas merupakan intrakurikuler wajib per minggu. Beban JP sudah disesuaikan dengan KMA 450 Tahun 2024 termasuk asumsi 2 JP Muatan Lokal. Pada Kelas I & II, IPAS dan SKI belum diberikan.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 overflow-hidden">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <BookOpen className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              {editingItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi formulir di bawah ini untuk menambahkan atau memperbarui data mata pelajaran.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nama Mata Pelajaran <span className="text-rose-500">*</span></label>
              <Input 
                placeholder="Contoh: Al-Qur'an Hadis" 
                value={formData.nama} 
                onChange={(e) => setFormData({...formData, nama: e.target.value})}
                className="rounded-xl h-11 border-slate-200 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Singkatan / Kode <span className="text-rose-500">*</span></label>
                <Input 
                  placeholder="Contoh: QH" 
                  value={formData.singkatan} 
                  onChange={(e) => setFormData({...formData, singkatan: e.target.value.toUpperCase()})}
                  className="rounded-xl h-11 border-slate-200 text-sm font-mono font-bold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Kelompok <span className="text-rose-500">*</span></label>
                <Select 
                  value={formData.kelompok} 
                  onValueChange={(v: any) => setFormData({...formData, kelompok: v})}
                >
                  <SelectTrigger className="rounded-xl h-11 border-slate-200 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="A" className="text-xs font-bold">Kelompok A (Agama Islam)</SelectItem>
                    <SelectItem value="B" className="text-xs font-bold">Kelompok B (Muatan Umum)</SelectItem>
                    <SelectItem value="C" className="text-xs font-bold">Kelompok C (Muatan Lokal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Keterangan / Deskripsi (Opsional)</label>
              <Input 
                placeholder="Contoh: Pendidikan Agama Islam & Bahasa Arab" 
                value={formData.keterangan || ''} 
                onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                className="rounded-xl h-11 border-slate-200 text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200 hover:bg-slate-50"
              >
                Batal
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default MataPelajaran;
