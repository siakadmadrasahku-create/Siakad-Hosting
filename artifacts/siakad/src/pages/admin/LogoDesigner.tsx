import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Palette, Download, Sparkles, BookOpen,
  GraduationCap, Lightbulb, Globe, Shield,
  Zap, Layout, Copy, Check, RefreshCw, Loader2
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const LogoDesigner = () => {
  const { settings } = useSiteSettings();
  const [schoolName, setSchoolName] = useState('Madrasah Aliyah');
  const [primaryColor, setPrimaryColor] = useState('#059669'); // Emerald 600
  const [secondaryColor, setSecondaryColor] = useState('#1e293b'); // Slate 800
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    const apiKey = settings.api_keys?.openrouter_api_key || settings.api_keys?.openai_api_key;
    
    if (!apiKey) {
      showError('API Key (OpenRouter/OpenAI) belum dikonfigurasi di menu Pengaturan API!');
      return;
    }

    if (!prompt) {
      showError('Masukkan deskripsi logo yang diinginkan!');
      return;
    }

    setIsGenerating(true);
    try {
      // Using OpenRouter or OpenAI API for image generation
      const isOpenRouter = apiKey.startsWith('sk-or-');
      const endpoint = isOpenRouter
        ? 'https://openrouter.ai/api/v1/images/generations'
        : 'https://api.openai.com/v1/images/generations';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(isOpenRouter && { 'HTTP-Referer': window.location.origin, 'X-Title': 'Si@Kad Madrasah' })
        },
        body: JSON.stringify({
          model: isOpenRouter ? 'openai/dall-e-3' : 'dall-e-3',
          prompt: `Modern and creative school logo for "${schoolName}". Description: ${prompt}. High quality, professional, vector style, clean background.`,
          n: 1,
          size: '1024x1024'
        })
      });

      const data = await response.json();
      if (data.data?.[0]?.url) {
        setGeneratedImage(data.data[0].url);
        showSuccess('Logo AI berhasil dibuat!');
      } else {
        throw new Error(data.error?.message || 'Gagal membuat gambar');
      }
    } catch (err: any) {
      showError(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySvg = (id: string) => {
    const svg = document.getElementById(id);
    if (svg) {
      navigator.clipboard.writeText(svg.outerHTML);
      setCopied(true);
      showSuccess('Kode SVG berhasil disalin!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const LogoTemplate = ({ id, children, title, description }: { id: string, children: React.ReactNode, title: string, description: string }) => (
    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all group">
      <div className="h-48 bg-slate-50 flex items-center justify-center p-8 group-hover:bg-white transition-colors">
        <div className="w-32 h-32 flex items-center justify-center">
          {children}
        </div>
      </div>
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-bold">{title}</CardTitle>
        <CardDescription className="text-[10px]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8" onClick={() => handleCopySvg(id)}>
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} Copy SVG
        </Button>
        <Button variant="default" size="sm" className="flex-1 text-[10px] h-8 bg-emerald-600 hover:bg-emerald-700">
          <Download className="w-3 h-3 mr-1" /> Download
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="AI Logo & Branding Designer">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Controls */}
          <Card className="lg:col-span-1 border-0 shadow-xl h-fit sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Palette className="w-5 h-5" />
                Kustomisasi Logo
              </CardTitle>
              <CardDescription>Sesuaikan identitas madrasah Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="schoolName">Nama Madrasah</Label>
                <Input 
                  id="schoolName" 
                  value={schoolName} 
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: MA Al-Ikhlas"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Warna Utama</Label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                    />
                    <span className="text-xs font-mono uppercase">{primaryColor}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Warna Sekunder</Label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={secondaryColor} 
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                    />
                    <span className="text-xs font-mono uppercase">{secondaryColor}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 font-bold shadow-lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Variasi Baru
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-2">Desain Logo Modern</h2>
                <p className="text-emerald-50 opacity-90 max-w-md">
                  Pilih template logo kreatif berbasis kode (SVG) yang bisa disesuaikan secara instan tanpa pecah.
                </p>
              </div>
              <Sparkles className="absolute -right-4 -bottom-4 w-48 h-48 text-white/10 rotate-12" />
            </div>

            <Tabs defaultValue="modern" className="w-full">
              <TabsList className="bg-white border p-1 rounded-xl mb-6 w-full sm:w-auto">
                <TabsTrigger value="modern" className="rounded-lg px-6">Modern Minimalis</TabsTrigger>
                <TabsTrigger value="classic" className="rounded-lg px-6">Klasik Islami</TabsTrigger>
                <TabsTrigger value="abstract" className="rounded-lg px-6">Abstrak Kreatif</TabsTrigger>
              </TabsList>

              <TabsContent value="modern" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Template 1: The Open Book Shield */}
                <LogoTemplate 
                  id="logo-1" 
                  title="The Knowledge Shield" 
                  description="Perisai pelindung dengan simbol buku terbuka di tengah."
                >
                  <svg id="logo-1" viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: primaryColor, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: secondaryColor, stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <path d="M50 5 L15 20 V50 C15 75 50 95 50 95 C50 95 85 75 85 50 V20 L50 5 Z" fill="url(#grad1)" />
                    <path d="M30 40 Q50 35 70 40 V60 Q50 55 30 60 Z" fill="white" />
                    <line x1="50" y1="40" x2="50" y2="60" stroke={primaryColor} strokeWidth="2" />
                    <circle cx="50" cy="25" r="5" fill="white" opacity="0.8" />
                  </svg>
                </LogoTemplate>

                {/* Template 2: Geometric Graduation */}
                <LogoTemplate 
                  id="logo-2" 
                  title="Geometric Scholar" 
                  description="Topi toga abstrak dengan garis-garis dinamis."
                >
                  <svg id="logo-2" viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="20" y="40" width="60" height="10" fill={primaryColor} transform="rotate(-15 50 45)" />
                    <path d="M20 45 L50 60 L80 45 L50 30 Z" fill={secondaryColor} />
                    <path d="M50 60 V80" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" />
                    <circle cx="50" cy="85" r="4" fill={primaryColor} />
                    <path d="M30 70 Q50 75 70 70" fill="none" stroke={primaryColor} strokeWidth="2" strokeDasharray="4 2" />
                  </svg>
                </LogoTemplate>

                {/* Template 3: Global Education */}
                <LogoTemplate 
                  id="logo-3" 
                  title="Global Vision" 
                  description="Simbol dunia yang dikelilingi oleh orbit ilmu pengetahuan."
                >
                  <svg id="logo-3" viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="35" fill="none" stroke={secondaryColor} strokeWidth="1" />
                    <circle cx="50" cy="50" r="25" fill={primaryColor} />
                    <path d="M50 25 A25 25 0 0 1 50 75" fill="white" opacity="0.3" />
                    <path d="M20 50 Q50 20 80 50" fill="none" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" />
                    <path d="M20 50 Q50 80 80 50" fill="none" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" />
                    <rect x="48" y="40" width="4" height="20" fill="white" rx="2" />
                    <rect x="40" y="48" width="20" height="4" fill="white" rx="2" />
                  </svg>
                </LogoTemplate>

                {/* Template 4: The Rising Sun Lamp */}
                <LogoTemplate 
                  id="logo-4" 
                  title="Enlightenment" 
                  description="Lampu minyak tradisional yang memancarkan cahaya matahari."
                >
                  <svg id="logo-4" viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M30 70 H70 L65 80 H35 Z" fill={secondaryColor} />
                    <path d="M50 30 C35 30 25 45 25 60 H75 C75 45 65 30 50 30 Z" fill={primaryColor} />
                    <circle cx="50" cy="20" r="8" fill={primaryColor} />
                    <g stroke={primaryColor} strokeWidth="2" strokeLinecap="round">
                      <line x1="50" y1="5" x2="50" y2="10" />
                      <line x1="35" y1="10" x2="40" y2="15" />
                      <line x1="65" y1="10" x2="60" y2="15" />
                    </g>
                  </svg>
                </LogoTemplate>
              </TabsContent>

              <TabsContent value="classic" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                  <RefreshCw className="w-12 h-12 text-gray-200 mx-auto mb-3 animate-spin-slow" />
                  <p className="text-gray-400 font-medium">Template Klasik sedang disiapkan...</p>
                </div>
              </TabsContent>
            </Tabs>

            <Card className="border-0 shadow-lg bg-slate-900 text-white overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-6">
                  <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      AI Image Generator (DALL-E 3)
                    </div>
                    <h3 className="text-2xl font-bold">Buat Logo Unik dengan AI</h3>
                    <p className="text-slate-400 text-sm">
                      Gunakan kekuatan AI untuk membuat logo dari deskripsi teks. Pastikan API Key OpenRouter/OpenAI sudah terpasang di menu Pengaturan API.
                    </p>
                  </div>
                  <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                    {isGenerating ? (
                      <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                    ) : generatedImage ? (
                      <img src={generatedImage} className="w-full h-full rounded-full object-cover" alt="AI Generated" />
                    ) : (
                      <Zap className="w-16 h-16 text-emerald-500 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Deskripsi Logo (Prompt)</Label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Contoh: Logo madrasah dengan simbol pena bulu dan kubah masjid modern, warna hijau emas..."
                      className="w-full min-h-[80px] p-4 rounded-xl bg-slate-800 border-slate-700 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <Button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-12"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate Logo dengan AI
                  </Button>
                  {generatedImage && (
                    <Button
                      variant="outline"
                      className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl"
                      onClick={() => window.open(generatedImage, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Hasil AI
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LogoDesigner;