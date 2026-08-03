import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, ArrowRightLeft, Loader2, Copy, Check, Sparkles, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const Translator = () => {
  const { settings } = useSiteSettings();
  const apiConfig = settings.api_keys;
  const [inputText, setInputText] = useState('');
  const [translatedEnglish, setTranslatedEnglish] = useState('');
  const [translatedArabic, setTranslatedArabic] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      showError('Masukkan teks terlebih dahulu.');
      return;
    }

    setIsTranslating(true);
    try {
      const systemPrompt = `
        Anda adalah pakar penerjemah profesional untuk Bahasa Indonesia, Inggris, dan Arab.
        Tugas Anda: Terjemahkan teks Bahasa Indonesia yang diberikan secara AKURAT ke dalam Bahasa Inggris dan Bahasa Arab.
        
        Aturan:
        1. Berikan terjemahan yang natural, kontekstual, dan formal/sopan (disesuaikan dengan konteks).
        2. WAJIB: Untuk Bahasa Arab, berikan teks LENGKAP DENGAN HARAKAT (vokalisasi penuh) agar mudah dibaca oleh non-native speaker.
        3. Format output harus berupa JSON murni tanpa markdown:
           {
             "english": "hasil terjemahan inggris",
             "arabic": "hasil terjemahan arab berharakat"
           }
      `;

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: inputText, 
          systemPrompt,
          config: apiConfig,
          history: [] 
        }
      });

      if (error) throw error;
      
      if (data?.text) {
        const cleanJson = data.text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanJson);
        setTranslatedEnglish(result.english);
        setTranslatedArabic(result.arabic);
        showSuccess('Terjemahan berhasil!');
      } else {
        throw new Error('Respons AI tidak valid.');
      }
    } catch (err) {
      console.error('Translation error:', err);
      showError('Gagal menerjemahkan. Pastikan API Key sudah dikonfigurasi.');
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    showSuccess(`${type === 'en' ? 'Bahasa Inggris' : 'Bahasa Arab'} berhasil disalin!`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            AI Multi-Language Translator
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Konversi Bahasa <span className="text-emerald-600">Akurat</span>
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base font-medium">
            Terjemahkan teks Bahasa Indonesia Anda ke dalam Bahasa Inggris dan Bahasa Arab secara instan menggunakan kecerdasan buatan tingkat lanjut.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 font-bold text-slate-700 uppercase text-xs tracking-widest">
                <Languages className="w-4 h-4 text-emerald-600" />
                Bahasa Indonesia
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setInputText('')}
                className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 hover:text-red-500"
              >
                Hapus
              </Button>
            </div>
            
            <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <Textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Masukkan teks dalam Bahasa Indonesia di sini..."
                  className="min-h-[300px] p-6 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none font-medium text-slate-700 placeholder:text-slate-300"
                />
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <Button 
                    onClick={handleTranslate} 
                    disabled={isTranslating || !inputText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-8 py-6 font-black text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        MENERJEMAHKAN...
                      </>
                    ) : (
                      <>
                        TERJEMAHKAN SEKARANG
                        <ArrowRightLeft className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between px-2 mb-4">
                <TabsList className="bg-slate-200/50 p-1 rounded-2xl h-auto">
                  <TabsTrigger value="all" className="rounded-xl px-4 py-2 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Semua</TabsTrigger>
                  <TabsTrigger value="en" className="rounded-xl px-4 py-2 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">English</TabsTrigger>
                  <TabsTrigger value="ar" className="rounded-xl px-4 py-2 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">العربية</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="space-y-6 mt-0 outline-none">
                {/* English Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 font-bold text-blue-700 uppercase text-xs tracking-widest">
                      <Globe className="w-4 h-4" />
                      English (UK/US)
                    </div>
                    {translatedEnglish && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(translatedEnglish, 'en')}
                        className="h-8 px-3 rounded-lg hover:bg-blue-50 text-blue-600"
                      >
                        {copied === 'en' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                  <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/30 min-h-[140px] flex items-center justify-center">
                    <CardContent className="p-6 w-full text-center">
                      {translatedEnglish ? (
                        <p className="text-blue-900 text-lg font-semibold text-left italic">"{translatedEnglish}"</p>
                      ) : (
                        <p className="text-slate-300 text-sm font-bold uppercase tracking-widest">Hasil Terjemahan Inggris</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Arabic Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 font-bold text-teal-700 uppercase text-xs tracking-widest">
                      <Globe className="w-4 h-4" />
                      Arabic (العربية)
                    </div>
                    {translatedArabic && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(translatedArabic, 'ar')}
                        className="h-8 px-3 rounded-lg hover:bg-teal-50 text-teal-600"
                      >
                        {copied === 'ar' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                  <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50/30 min-h-[140px] flex items-center justify-center">
                    <CardContent className="p-6 w-full text-center">
                      {translatedArabic ? (
                        <p className="text-teal-900 text-3xl font-bold text-right leading-relaxed" dir="rtl">{translatedArabic}</p>
                      ) : (
                        <p className="text-slate-300 text-sm font-bold uppercase tracking-widest">Hasil Terjemahan Arab</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="en" className="mt-0 outline-none">
                 <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white min-h-[300px]">
                  <CardContent className="p-6 relative">
                    {translatedEnglish && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(translatedEnglish, 'en')}
                        className="absolute top-4 right-4 h-10 w-10 p-0 rounded-xl hover:bg-blue-50 text-blue-600 border border-blue-100 shadow-sm"
                      >
                        {copied === 'en' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                    <div className="pt-8">
                      {translatedEnglish ? (
                        <p className="text-slate-800 text-2xl font-bold leading-relaxed">{translatedEnglish}</p>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-4">
                          <Globe className="w-12 h-12 opacity-20" />
                          <p className="text-xs font-black uppercase tracking-widest">Belum ada terjemahan</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ar" className="mt-0 outline-none">
                 <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white min-h-[300px]">
                  <CardContent className="p-6 relative">
                    {translatedArabic && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(translatedArabic, 'ar')}
                        className="absolute top-4 left-4 h-10 w-10 p-0 rounded-xl hover:bg-teal-50 text-teal-600 border border-teal-100 shadow-sm"
                      >
                        {copied === 'ar' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                    <div className="pt-8">
                      {translatedArabic ? (
                        <p className="text-slate-800 text-4xl font-bold leading-loose text-right" dir="rtl">{translatedArabic}</p>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-4">
                          <Globe className="w-12 h-12 opacity-20" />
                          <p className="text-xs font-black uppercase tracking-widest">Belum ada terjemahan</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Translator;
