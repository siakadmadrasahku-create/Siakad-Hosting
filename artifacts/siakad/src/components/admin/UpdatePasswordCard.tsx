"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, Loader2, Mail, School } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useMadrasah } from '@/contexts/MadrasahContext';

export const UpdatePasswordCard = () => {
  const { activeMadrasah, currentUserEmail } = useMadrasah();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (currentUserEmail) {
        setEmail(currentUserEmail);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
      } else {
        setEmail(activeMadrasah.email || 'admin@madrasah.sch.id');
      }
    };
    fetchUserEmail();
  }, [currentUserEmail, activeMadrasah]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      showError('Password baru wajib diisi!');
      return;
    }

    if (newPassword.length < 6) {
      showError('Password minimal 6 karakter!');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Konfirmasi password baru tidak cocok!');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        showError(`Gagal memperbarui password: ${error.message}`);
      } else {
        showSuccess('Password akun madrasah berhasil diperbarui!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showError('Terjadi kesalahan saat memperbarui password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
      <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Update Password Akun Madrasah
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Ubah password login untuk akun {activeMadrasah.nama_madrasah} demi keamanan data sistem akademik.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-4 space-y-6">
        {/* Info Box Akun Aktif */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-sm">
              <Mail className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Akun Terautentikasi</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{email || 'admin@madrasah.sch.id'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{activeMadrasah.nama_madrasah}</span>
          </div>
        </div>

        {/* Form Update Password */}
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password Baru *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password baru (min 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10 rounded-xl h-11 border-slate-200 text-sm focus:border-emerald-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Konfirmasi Password Baru *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ketik ulang password baru Anda"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 rounded-xl h-11 border-slate-200 text-sm focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl shadow-md shadow-emerald-900/10 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memperbarui Password...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Password Baru
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UpdatePasswordCard;
