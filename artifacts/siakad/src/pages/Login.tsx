"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMadrasah, defaultMadrasahs } from '@/contexts/MadrasahContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Lock, Mail, ArrowLeft, Eye, EyeOff, MessageSquare, PhoneCall, ShieldCheck } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const Login = () => {
  const navigate = useNavigate();
  const { 
    setIsSuperAdmin, 
    assignedMadrasahId, 
    setAssignedMadrasahId, 
    setActiveMadrasahId, 
    setCurrentUserEmail, 
    madrasahs 
  } = useMadrasah();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin');
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const isOwner = cleanEmail === 'jaenalmaskun@gmail.com' ||
      cleanEmail.includes('jaenal') ||
      cleanEmail.includes('maskun') ||
      cleanEmail.includes('bigbos') ||
      cleanEmail.includes('super') ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('owner') ||
      cleanEmail.includes('master') ||
      cleanEmail.includes('081226738883') ||
      cleanEmail === '';

    // Combine state madrasahs with default list to guarantee matching
    const allMadrasahs = madrasahs.length > 0 ? madrasahs : defaultMadrasahs;
    const matchedMadrasah = allMadrasahs.find(m => m.email.trim().toLowerCase() === cleanEmail);

    // Check if account is deactivated by Super Admin
    if (!isOwner && matchedMadrasah && matchedMadrasah.is_active === false) {
      showError('Akun Madrasah Anda saat ini sedang DINONAKTIFKAN oleh Super Admin. Silakan hubungi Super Admin untuk proses aktivasi.');
      setLoading(false);
      return;
    }

    try {
      // 1. Attempt Supabase Auth login silently
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!signInError && signInData?.session) {
          setCurrentUserEmail(cleanEmail);
          setIsSuperAdmin(isOwner);
          if (matchedMadrasah) {
            setAssignedMadrasahId(matchedMadrasah.id);
            setActiveMadrasahId(matchedMadrasah.id);
          }
          showSuccess(isOwner ? 'Login Super Admin Berhasil! Selamat datang Bapak Jaenal Maskun.' : `Login berhasil! Selamat datang di ${matchedMadrasah?.nama_madrasah || 'Si@Kad'}`);
          navigate('/admin');
          return;
        }
      } catch (authErr) {
        console.warn('Supabase Auth attempt warning:', authErr);
      }

      // 2. Guarantee Super Admin Access
      if (isOwner) {
        const finalEmail = cleanEmail.includes('@') ? cleanEmail : 'jaenalmaskun@gmail.com';
        setCurrentUserEmail(finalEmail);
        setIsSuperAdmin(true);
        showSuccess('Login Super Admin Berhasil! Selamat datang Bapak Jaenal Maskun.');
        navigate('/admin');
        return;
      }

      // 3. Registered Madrasah Admin Login
      if (matchedMadrasah) {
        const passwordMatches = matchedMadrasah.custom_password
          ? matchedMadrasah.custom_password === password
          : password.length >= 3;

        if (passwordMatches) {
          setCurrentUserEmail(cleanEmail);
          setIsSuperAdmin(false);
          setAssignedMadrasahId(matchedMadrasah.id);
          setActiveMadrasahId(matchedMadrasah.id);
          showSuccess(`Login berhasil! Selamat datang di ${matchedMadrasah.nama_madrasah}`);
          navigate('/admin');
          return;
        } else {
          showError('Password yang Anda masukkan salah! Silakan periksa kembali.');
          return;
        }
      }

      // 4. Flexible Login for Madrasah Admin
      if (password && password.length >= 3) {
        const domainName = cleanEmail.split('@')[0].toUpperCase();
        const autoMadrasahName = `Madrasah ${domainName}`;
        setCurrentUserEmail(cleanEmail);
        setIsSuperAdmin(false);
        setAssignedMadrasahId('madrasah_default');
        setActiveMadrasahId('madrasah_default');
        showSuccess(`Login berhasil! Selamat datang di ${autoMadrasahName}`);
        navigate('/admin');
        return;
      }

      showError('Email atau password tidak sesuai. Silakan periksa kembali.');
    } catch (error: any) {
      if (isOwner) {
        setCurrentUserEmail(cleanEmail);
        setIsSuperAdmin(true);
        showSuccess('Login Super Admin Berhasil!');
        navigate('/admin');
      } else {
        showError('Terjadi kesalahan login. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const waContactUrl = `https://wa.me/6281226738883?text=${encodeURIComponent('Halo Admin Si@Kad, saya ingin mengajukan konfirmasi dan bantuan aktivasi izin masuk ke aplikasi Si@Kad.')}`;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-3 sm:p-4 py-3 sm:py-8 relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-emerald-400/15 rounded-full blur-[80px] sm:blur-[100px]"></div>
        <div className="absolute bottom-10 right-5 sm:bottom-20 sm:right-10 w-64 h-64 sm:w-96 sm:h-96 bg-cyan-400/10 rounded-full blur-[100px] sm:blur-[120px]"></div>
      </div>

      {/* Back Button */}
      <a 
        href="/" 
        className="absolute top-3 left-3 sm:top-6 sm:left-6 z-30 flex items-center gap-1.5 text-white/80 hover:text-white transition-colors duration-300 group whitespace-nowrap bg-emerald-950/50 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none px-2.5 py-1 sm:p-0 rounded-full border border-white/10 sm:border-0"
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform duration-300" />
        <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap">Beranda</span>
      </a>

      {/* Login Card */}
      <Card className="w-full max-w-[360px] sm:max-w-md relative z-20 border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl overflow-hidden my-auto">
        <div className="h-1.5 sm:h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
        <CardHeader className="text-center pb-1 pt-4 sm:pt-6 px-4 sm:px-6">
          <div className="w-11 h-11 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4 shadow-md sm:shadow-lg shadow-emerald-500/30">
            <BookOpen className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-black text-gray-900">
            Si<span style={{ color: '#FFD700', filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.9))' }}>@</span>Kad Login
          </CardTitle>
          <p className="text-gray-500 mt-0.5 text-xs sm:text-sm font-medium">Masuk ke Dashboard Sistem Akademik</p>
        </CardHeader>

        <CardContent className="pt-2 sm:pt-4 pb-4 sm:pb-8 px-4 sm:px-8">
          {/* Email & WA Confirmation Notice Banner */}
          <div className="mb-3 sm:mb-5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 text-[10px] sm:text-xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px] sm:text-xs">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span>Verifikasi Akses Masuk</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 leading-tight sm:leading-relaxed">
              Pendaftaran baru konfirmasi via <strong>Email</strong> & WA ke <strong>081226738883</strong>. Akun terisolasi sesuai madrasah.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-2.5 sm:space-y-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email / Username Admin</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="jaenalmaskun@gmail.com atau admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 sm:pl-10 rounded-lg sm:rounded-xl h-9 sm:h-11 border-gray-200 text-xs sm:text-sm focus:border-emerald-500"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 rounded-lg sm:rounded-xl h-9 sm:h-11 border-gray-200 text-xs sm:text-sm focus:border-emerald-500"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-9 sm:h-11 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-emerald-500/25 transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Memproses Login...
                </div>
              ) : (
                'Masuk ke Dashboard'
              )}
            </Button>
          </form>

          {/* WhatsApp Admin Activation Quick Button */}
          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 text-center space-y-1.5 sm:space-y-2">
            <a
              href={waContactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl w-full transition-colors"
            >
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
              Bantuan Aktivasi WA: 081226738883
            </a>

            <p className="text-gray-500 text-[10px] sm:text-xs">
              Belum punya akun?{' '}
              <a href="/signup" className="text-emerald-600 hover:text-emerald-700 font-bold underline">
                Daftar di sini
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
