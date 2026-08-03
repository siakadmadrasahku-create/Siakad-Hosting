"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Building, Lock, Mail, ArrowLeft, Eye, EyeOff, User, Phone, 
  CheckCircle2, ShieldAlert, MessageSquare, ExternalLink, School, Send, AlertCircle
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const Signup = () => {
  const navigate = useNavigate();
  const { addMadrasah, setIsSuperAdmin, setAssignedMadrasahId, setActiveMadrasahId } = useMadrasah();

  const [namaPendaftar, setNamaPendaftar] = useState('Jaenal Maskun');
  const [namaMadrasah, setNamaMadrasah] = useState('Si@Kad Madrasah');
  const [jenjang, setJenjang] = useState('MI');
  const [telepon, setTelepon] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Success Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [registeredMadrasahName, setRegisteredMadrasahName] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!namaPendaftar.trim() || !namaMadrasah.trim()) {
      showError('Nama pendaftar dan nama madrasah wajib diisi!');
      return;
    }

    if (password !== confirmPassword) {
      showError('Password tidak cocok!');
      return;
    }

    if (password.length < 6) {
      showError('Password minimal 6 karakter!');
      return;
    }

    setLoading(true);

    try {
      // 1. Supabase Auth signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: namaPendaftar,
            madrasah_name: namaMadrasah,
            phone: telepon,
          }
        }
      });

      if (error && !error.message.includes('already registered')) {
        showError(error.message);
        setLoading(false);
        return;
      }

      // 2. Automatically create isolated Madrasah for this registrant
      const newMadrasahId = await addMadrasah({
        nama_madrasah: namaMadrasah,
        nsm: `311${Math.floor(10000000 + Math.random() * 90000000)}`,
        npsn: `${Math.floor(10000000 + Math.random() * 90000000)}`,
        nama_pimpinan: namaPendaftar,
        nip_pimpinan: '-',
        alamat: 'Alamat Pendaftaran Baru',
        telepon: telepon || '081226738883',
        email: email,
        jenjang_pendidikan: jenjang,
        status: 'Swasta',
        logo_url: '/icon.png',
      });

      if (newMadrasahId) {
        // Enforce Non-Super Admin mode for users registered via /signup
        // so that they NEVER see other madrasahs in the app
        setIsSuperAdmin(false);
        setAssignedMadrasahId(newMadrasahId);
        setActiveMadrasahId(newMadrasahId);

        // Store registration confirmation metadata
        localStorage.setItem('siakad_registration_status', JSON.stringify({
          email,
          namaPendaftar,
          namaMadrasah,
          telepon,
          status: 'pending_confirmation',
          created_at: new Date().toISOString()
        }));

        setRegisteredMadrasahName(namaMadrasah);
        showSuccess('Pendaftaran berhasil! Silakan lakukan konfirmasi izin masuk.');
        setShowConfirmModal(true);
      } else {
        showError('Gagal mendaftarkan madrasah baru.');
      }
    } catch (error: any) {
      showError('Terjadi kesalahan pendaftaran: ' + (error.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const getWaMessage = () => {
    const text = `Halo Admin Si@Kad,\nSaya baru saja mendaftar akun aplikasi:\n\n👤 *Nama Pendaftar*: ${namaPendaftar || '-'}\n🏫 *Nama Madrasah*: ${namaMadrasah || '-'}\n📧 *Email*: ${email}\n📱 *No WhatsApp*: ${telepon || '-'}\n\nMohon konfirmasi dan berikan *Izin Akses Masuk* ke dalam aplikasi. Terima kasih!`;
    return `https://wa.me/6281226738883?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-4 relative overflow-y-auto py-10">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/15 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Back Button */}
      <a 
        href="/" 
        className="absolute top-6 left-4 sm:left-6 z-20 flex items-center gap-1.5 text-white/70 hover:text-white transition-colors duration-300 group whitespace-nowrap"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
        <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap">Kembali ke Beranda</span>
      </a>

      {/* Signup Card */}
      <Card className="w-full max-w-lg relative z-10 border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden my-auto">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
        
        <CardHeader className="text-center pb-2 pt-8 px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <School className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Si<span className="text-[#FFD700] drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]">@</span>Kad Registration
          </CardTitle>
          <p className="text-gray-500 mt-1 text-sm font-medium">Pendaftaran Akun Admin Madrasah Mandiri</p>
          
          <div className="mt-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong>Isolasi Multi-Tenant Aman:</strong> Akun yang didaftarkan hanya dapat mengelola data madrasah milik sendiri dan tidak menampilkan daftar madrasah lain.
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-8 px-6 md:px-8">
          <form onSubmit={handleSignup} className="space-y-4">
            
            {/* Nama Pendaftar */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nama Lengkap Pendaftar</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Contoh: H. Ahmad Supriyadi, S.Pd.I"
                  value={namaPendaftar}
                  onChange={(e) => setNamaPendaftar(e.target.value)}
                  className="pl-10 rounded-xl h-11 border-gray-200 text-sm focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Nama Madrasah & Jenjang */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nama Madrasah / Sekolah</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Contoh: MTs Al-Hidayah"
                    value={namaMadrasah}
                    onChange={(e) => setNamaMadrasah(e.target.value)}
                    className="pl-10 rounded-xl h-11 border-gray-200 text-sm focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Jenjang</label>
                <Select value={jenjang} onValueChange={setJenjang}>
                  <SelectTrigger className="h-11 rounded-xl text-sm border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MI">MI</SelectItem>
                    <SelectItem value="MTs">MTs</SelectItem>
                    <SelectItem value="MA">MA</SelectItem>
                    <SelectItem value="MAK">MAK</SelectItem>
                    <SelectItem value="Ponpes">Ponpes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nomor WA & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">No. WhatsApp / HP</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="08123456789"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    className="pl-10 rounded-xl h-11 border-gray-200 text-sm focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Login</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="admin@madrasah.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rounded-xl h-11 border-gray-200 text-sm focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 rounded-xl h-11 border-gray-200 text-sm focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Konfirmasi Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 rounded-xl h-11 border-gray-200 text-sm focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-12 rounded-xl text-base font-bold shadow-lg shadow-emerald-500/25 transition-all duration-300 mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Memproses Pendaftaran...
                </div>
              ) : (
                'Daftar Akun Madrasah Saya'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center border-t border-gray-100 pt-4">
            <p className="text-gray-500 text-xs">
              Sudah memiliki akun terverifikasi?{' '}
              <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-bold underline">
                Login di sini
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation & Email/WA Verification Dialog */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-0 shadow-2xl">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900">
              Pendaftaran Berhasil!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1 leading-relaxed">
              Akun untuk <strong className="text-emerald-700">{registeredMadrasahName}</strong> telah berhasil dibuat secara terisolasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Konfirmasi & Izin Akses Masuk Aplikasi</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Untuk keamanan data multi-tenant, izin masuk ke aplikasi mewajibkan konfirmasi melalui <strong>EMAIL</strong> dan <strong>WHATSAPP OFFICIAL</strong> ke nomor <strong>081226738883</strong>.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">1. Cek Email Masuk</span>
                  <span className="text-slate-500 text-[11px]">Cek kotak masuk atau folder spam email <strong className="text-slate-700">{email}</strong> untuk instruksi verifikasi.</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">2. Konfirmasi WhatsApp Admin (081226738883)</span>
                  <span className="text-slate-500 text-[11px]">Kirimkan pesan pendaftaran ke WhatsApp pengelola di <strong className="text-emerald-700">081226738883</strong> untuk aktivasi izin masuk.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <a
              href={getWaMessage()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-900/20 transition-all"
            >
              <Send className="w-4 h-4" />
              Kirim Konfirmasi WA (081226738883)
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full h-11 rounded-xl font-bold text-slate-700 border-slate-300 hover:bg-slate-50 text-xs"
            >
              Lanjut ke Halaman Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Signup;
