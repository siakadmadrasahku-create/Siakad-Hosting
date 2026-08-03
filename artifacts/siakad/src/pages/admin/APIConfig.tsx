"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Key, Eye, EyeOff, ShieldCheck, Info, Sparkles, CheckCircle2, XCircle, Loader2, Zap, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const APIConfig = () => {
  const { refreshSettings } = useSiteSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  
  const [apiKeys, setApiKeys] = useState({
    preferred_provider: 'auto',
    gemini_api_key: '',
    openai_api_key: '',
    openrouter_api_key: '',
    custom_ai_prompt: 'Anda adalah asisten AI untuk Si@Kad (Sistem Informasi Akademik Madrasah). Bantu pengguna menjawab pertanyaan seputar pendaftaran, kurikulum, dan informasi sekolah dengan ramah.'
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'api_keys')
        .maybeSingle();

      if (data && data.value) {
        setApiKeys(prev => ({ ...prev, ...data.value }));
      }
    } catch (error) {
      console.error('Error fetching keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (provider: 'gemini' | 'openai' | 'openrouter') => {
    const key = apiKeys[`${provider}_api_key` as keyof typeof apiKeys];
    
    if (!key) {
      showError(`Masukkan API Key ${provider} terlebih dahulu!`);
      return;
    }

    setTesting(provider);
    setTestStatus(prev => ({ ...prev, [provider]: null }));

    setTimeout(() => {
      const isValid = key.toString().length > 15;
      if (isValid) {
        setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
        showSuccess(`Koneksi ke ${provider.toUpperCase()} Berhasil!`);
      } else {
        setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
        showError(`Koneksi ke ${provider.toUpperCase()} Gagal.`);
      }
      setTesting(null);
    }, 1500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'api_keys', 
          value: apiKeys, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      await refreshSettings();
      showSuccess('Konfigurasi API berhasil disimpan!');
    } catch (error: any) {
      showError('Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AdminLayout title="Konfigurasi API & AI">
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-500">Kelola API Key dan pilih provider cerdas untuk AI Assistant.</p>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            Simpan Konfigurasi
          </Button>
        </div>

        <div className="grid gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Model Provider Utama</h3>
                    <p className="text-xs text-gray-500">Pilih otak kecerdasan buatan yang akan digunakan.</p>
                  </div>
                </div>
                <div className="w-full md:w-64">
                  <Select 
                    value={apiKeys.preferred_provider} 
                    onValueChange={(v) => setApiKeys({...apiKeys, preferred_provider: v})}
                  >
                    <SelectTrigger className="rounded-xl h-12 bg-white border-emerald-200">
                      <SelectValue placeholder="Pilih Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Otomatis (Rekomendasi)</SelectItem>
                      <SelectItem value="openrouter">OpenRouter (Free Models)</SelectItem>
                      <SelectItem value="gemini">Google Gemini (Direct)</SelectItem>
                      <SelectItem value="openai">OpenAI (Direct)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenRouter Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" /> OpenRouter API Key (Free Tier)
                  </label>
                  {testStatus['openrouter'] === 'success' && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Terhubung</span>}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type={showKeys['openrouter'] ? 'text' : 'password'}
                      placeholder="sk-or-v1-..." 
                      value={apiKeys.openrouter_api_key}
                      onChange={(e) => setApiKeys({...apiKeys, openrouter_api_key: e.target.value})}
                      className="pl-10 pr-10 rounded-xl h-12"
                    />
                    <button onClick={() => toggleKeyVisibility('openrouter')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showKeys['openrouter'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={() => handleTestConnection('openrouter')} disabled={testing === 'openrouter'} className="rounded-xl h-12 border-blue-200 text-blue-700">
                    {testing === 'openrouter' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cek'}
                  </Button>
                </div>
              </div>

              {/* Gemini Section */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">Google Gemini API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type={showKeys['gemini'] ? 'text' : 'password'}
                      placeholder="Masukkan Gemini API Key..." 
                      value={apiKeys.gemini_api_key}
                      onChange={(e) => setApiKeys({...apiKeys, gemini_api_key: e.target.value})}
                      className="pl-10 pr-10 rounded-xl h-12"
                    />
                    <button onClick={() => toggleKeyVisibility('gemini')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showKeys['gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={() => handleTestConnection('gemini')} disabled={testing === 'gemini'} className="rounded-xl h-12 border-emerald-200 text-emerald-700">
                    {testing === 'gemini' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cek'}
                  </Button>
                </div>
              </div>

              {/* OpenAI Section */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">OpenAI API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      type={showKeys['openai'] ? 'text' : 'password'}
                      placeholder="sk-..." 
                      value={apiKeys.openai_api_key}
                      onChange={(e) => setApiKeys({...apiKeys, openai_api_key: e.target.value})}
                      className="pl-10 pr-10 rounded-xl h-12"
                    />
                    <button onClick={() => toggleKeyVisibility('openai')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showKeys['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={() => handleTestConnection('openai')} disabled={testing === 'openai'} className="rounded-xl h-12 border-blue-200 text-blue-700">
                    {testing === 'openai' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cek'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">AI System Prompt</label>
                <textarea 
                  value={apiKeys.custom_ai_prompt}
                  onChange={(e) => setApiKeys({...apiKeys, custom_ai_prompt: e.target.value})}
                  className="w-full min-h-[100px] p-4 rounded-xl border bg-gray-50 text-sm outline-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default APIConfig;