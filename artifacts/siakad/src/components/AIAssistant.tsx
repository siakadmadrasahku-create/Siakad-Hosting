"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, User, Loader2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  generatePDF, 
  generateSertifikat,
  downloadFile 
} from '@/utils/documentGenerator';
import { 
  generatePosterCanvas, 
  generateInfografis,
  generateLogoCanvas,
  downloadImage 
} from '@/utils/imageGenerator';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  toolCalls?: any[];
  generatedFiles?: GeneratedFile[];
}

interface GeneratedFile {
  type: 'pdf' | 'docx' | 'image' | 'png';
  name: string;
  blob: Blob;
  format: string;
}

/**
 * Fallback: Detect generation intent from user message
 * If AI didn't generate tool call, frontend will detect keywords
 */
function detectGenerationIntent(message: string): { type?: string; shouldGenerate: boolean } {
  const lowerMsg = message.toLowerCase();
  
  const intentMap: Record<string, string> = {
    'pamflet|pamlet|pengumuman|gembleng|pamplet': 'create_pamflet',
    'sertifikat|award|sertif|piagam': 'create_sertifikat',
    'surat|letter|memo': 'create_surat',
    'poster|banner|baliho': 'generate_poster',
    'infografis|statistik visual|chart|grafik': 'generate_infografis',
    'logo|lambang|simbol': 'generate_logo',
  };

  for (const [keywords, toolType] of Object.entries(intentMap)) {
    const keywordList = keywords.split('|');
    if (keywordList.some(kw => lowerMsg.includes(kw))) {
      return { type: toolType, shouldGenerate: true };
    }
  }

  // Check for action words + any document-like words
  const actionWords = ['buat', 'buatkan', 'buatin', 'generate', 'bikin', 'setup', 'rancang', 'desain', 'design'];
  const docWords = ['dokumen', 'gambar', 'visual', 'foto', 'image', 'png', 'pdf', 'file'];

  if (actionWords.some(aw => lowerMsg.includes(aw)) && docWords.some(dw => lowerMsg.includes(dw))) {
    return { shouldGenerate: true };
  }

  return { shouldGenerate: false };
}

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: 'ai', content: 'Halo! Saya asisten cerdas Si@Kad. Saya bisa membantu Anda membuat dokumen, gambar, poster, sertifikat, laporan, dan banyak lagi. Ada yang bisa saya bantu?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiConfig, setApiConfig] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { settings } = useSiteSettings();

  useEffect(() => {
    fetchApiConfig();
  }, [isOpen]);

  const fetchApiConfig = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('id', 'api_keys').maybeSingle();
      if (data?.value) setApiConfig(data.value);
    } catch (err) {
      console.error("Gagal memuat config AI:", err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, isTyping]);

  /**
   * Process tool calls and generate files
   */
  const processToolCalls = async (toolCalls: any[]): Promise<GeneratedFile[]> => {
    const generatedFiles: GeneratedFile[] = [];

    for (const toolCall of toolCalls) {
      try {
        setIsGenerating(true);
        console.log(`🔧 Processing tool: ${toolCall.type}`, toolCall.parameters);

        switch (toolCall.type) {
          case 'create_pamflet': {
            const blob = await generatePDF({
              title: toolCall.parameters.title || 'Pamflet',
              content: toolCall.parameters.content || '',
              schoolName: settings.general?.school_name,
              type: 'pamflet'
            });
            generatedFiles.push({
              type: 'pdf',
              name: `pamflet_${Date.now()}.pdf`,
              blob,
              format: 'PDF'
            });
            break;
          }

          case 'create_sertifikat': {
            const blob = await generateSertifikat(
              toolCall.parameters.nama || 'Siswa',
              toolCall.parameters.prestasi || 'Prestasi',
              toolCall.parameters.tanggal || new Date().toLocaleDateString('id-ID')
            );
            generatedFiles.push({
              type: 'pdf',
              name: `sertifikat_${Date.now()}.pdf`,
              blob,
              format: 'Certificate (PDF)'
            });
            break;
          }

          case 'create_surat': {
            const blob = await generatePDF({
              title: `Surat ${toolCall.parameters.jenis || 'Resmi'}`,
              content: toolCall.parameters.content || '',
              schoolName: settings.general?.school_name
            });
            generatedFiles.push({
              type: 'pdf',
              name: `surat_${Date.now()}.pdf`,
              blob,
              format: 'Letter (PDF)'
            });
            break;
          }

          case 'create_pengumuman': {
            const blob = await generatePDF({
              title: toolCall.parameters.judul || 'Pengumuman',
              content: toolCall.parameters.konten || '',
              schoolName: settings.general?.school_name
            });
            generatedFiles.push({
              type: 'pdf',
              name: `pengumuman_${Date.now()}.pdf`,
              blob,
              format: 'Announcement (PDF)'
            });
            break;
          }

          case 'generate_poster': {
            const details = toolCall.parameters.deskripsi?.split('\n') || [];
            const blob = await generatePosterCanvas(
              toolCall.parameters.judul || 'Poster',
              toolCall.parameters.jenis || 'Pengumuman',
              details
            );
            generatedFiles.push({
              type: 'png',
              name: `poster_${Date.now()}.png`,
              blob,
              format: 'Poster (PNG)'
            });
            break;
          }

          case 'generate_infografis': {
            const sections = toolCall.parameters.sections || [
              { label: 'Total', value: '100' }
            ];
            const blob = await generateInfografis(
              toolCall.parameters.title || 'Infografis',
              sections
            );
            generatedFiles.push({
              type: 'png',
              name: `infografis_${Date.now()}.png`,
              blob,
              format: 'Infographics (PNG)'
            });
            break;
          }

          case 'generate_logo': {
            const blob = await generateLogoCanvas(
              toolCall.parameters.school_name || settings.general?.school_name || 'Sekolah Kami',
              toolCall.parameters.tagline || settings.general?.tagline || "Sistem Informasi Akademik Madrasah"
            );
            generatedFiles.push({
              type: 'png',
              name: `logo_${Date.now()}.png`,
              blob,
              format: 'Logo (PNG)'
            });
            break;
          }

          default:
            console.warn(`Tool ${toolCall.type} not yet fully implemented`);
        }
      } catch (err) {
        console.error(`Error processing tool ${toolCall.type}:`, err);
      }
    }

    setIsGenerating(false);
    return generatedFiles;
  };

  const handleSend = async () => {
    if (!message.trim() || isTyping) return;

    const userMsg = message;
    const currentHistory = [...chat];

    setMessage('');
    setChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const schoolContext = `
        Nama Sekolah: ${settings.general?.school_name || 'Si@Kad Madrasah'}
        Alamat: ${settings.general?.address || 'Jl. Pendidikan No. 123'}
        Tahun SPMB: ${settings.tahun_pelajaran?.spmb_year || '2025/2026'}
        Tagline: ${settings.general?.tagline || ''}
      `;

      const systemPrompt = `${apiConfig?.custom_ai_prompt || 'Anda adalah asisten AI untuk Si@Kad yang sangat membantu.'} \n\nKonteks Sekolah Saat Ini:\n${schoolContext}`;

      // Call AI backend with tool support
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMsg,
          history: currentHistory.slice(-6),
          systemPrompt,
          config: apiConfig
        }
      });

      if (error) throw error;

      if (data?.error) {
        setChat(prev => [...prev, {
          role: 'ai',
          content: `⚠️ Kendala: ${data.error}. Mohon pastikan API Key sudah diatur dengan benar di Dashboard Admin.`
        }]);
      } else {
        // Check for tool calls
        const toolCalls = data.toolCalls || [];
        let textResponse = data.text || '';
        let generatedFiles: GeneratedFile[] = [];

        // Debug logging
        console.log('🤖 AI Response received:', {
          hasToolCalls: toolCalls.length > 0,
          toolCallCount: toolCalls.length,
          toolCalls: toolCalls,
          textLength: textResponse.length,
          provider: data.provider,
          rawResponse: data.text?.substring(0, 200)
        });

        if (toolCalls.length > 0) {
          console.log(`✅ ${toolCalls.length} tool call(s) detected. Processing...`);
          generatedFiles = await processToolCalls(toolCalls);
          console.log(`✅ Generated ${generatedFiles.length} file(s)`);
        } else {
          console.log('ℹ️ No tool calls in response');
          
          // Detect if AI refused to generate
          const aiRefused = textResponse.toLowerCase().includes('tidak bisa membuat') || 
                            textResponse.toLowerCase().includes('hanyalah model bahasa') ||
                            textResponse.toLowerCase().includes('sebagai model bahasa');
          
          // FALLBACK: Detect intent from user message & auto-generate
          const genIntent = detectGenerationIntent(userMsg);
          if (genIntent.shouldGenerate && (generatedFiles.length === 0 || aiRefused)) {
            console.log(`🔄 FALLBACK: Detected document request, auto-generating...`);
            setIsGenerating(true);
            
            // If AI refused, we might want to clear or update the text response
            if (aiRefused) {
              textResponse = "Tentu, saya bisa membantu membuatkan visual tersebut menggunakan sistem desain internal Si@Kad. Sedang memproses...";
            }
            
            try {
              const lowerMsg = userMsg.toLowerCase();
              const isImageRequest = lowerMsg.includes('gambar') || lowerMsg.includes('foto') || lowerMsg.includes('image') || lowerMsg.includes('png') || lowerMsg.includes('jpg');

              // Auto-generate based on detected intent
              if ((lowerMsg.includes('pamflet') || lowerMsg.includes('pamlet') || lowerMsg.includes('pengumuman')) && !isImageRequest) {
                const blob = await generatePDF({
                  title: 'Pamflet',
                  content: textResponse || userMsg,
                  schoolName: settings.general?.school_name
                });
                generatedFiles.push({
                  type: 'pdf',
                  name: `pamflet_${Date.now()}.pdf`,
                  blob,
                  format: 'Pamflet (PDF)'
                });
                console.log(`✅ Fallback: Generated pamflet PDF`);
              } else if (lowerMsg.includes('sertifikat') || lowerMsg.includes('sertif')) {
                const blob = await generateSertifikat('Penerima', 'Prestasi', new Date().toLocaleDateString('id-ID'));
                generatedFiles.push({
                  type: 'pdf',
                  name: `sertifikat_${Date.now()}.pdf`,
                  blob,
                  format: 'Certificate (PDF)'
                });
                console.log(`✅ Fallback: Generated certificate`);
              } else if (lowerMsg.includes('poster') || lowerMsg.includes('banner') || ((lowerMsg.includes('pamflet') || lowerMsg.includes('pamlet')) && isImageRequest)) {
                // If user asks for "pamflet" + "gambar", we generate a Poster PNG
                const blob = await generatePosterCanvas(
                  (lowerMsg.includes('pamflet') || lowerMsg.includes('pamlet')) ? 'Pamflet Kegiatan' : 'Poster Pengumuman', 
                  'Informasi Sekolah', 
                  textResponse ? textResponse.split('\n').slice(0, 5) : [userMsg]
                );
                generatedFiles.push({
                  type: 'png',
                  name: `poster_${Date.now()}.png`,
                  blob,
                  format: 'Poster (PNG)'
                });
                console.log(`✅ Fallback: Generated poster/pamflet PNG`);
              } else if (lowerMsg.includes('logo') || lowerMsg.includes('lambang')) {
                const blob = await generateLogoCanvas(
                  settings.general?.school_name || 'Sekolah Kami',
                  settings.general?.tagline || "Sistem Informasi Akademik Madrasah"
                );
                generatedFiles.push({
                  type: 'png',
                  name: `logo_${Date.now()}.png`,
                  blob,
                  format: 'Logo (PNG)'
                });
                console.log(`✅ Fallback: Generated logo PNG`);
              }
            } catch (err) {
              console.error('Fallback generation error:', err);
            }
            setIsGenerating(false);
          }
        }

        setChat(prev => [...prev, {
          role: 'ai',
          content: textResponse,
          toolCalls,
          generatedFiles: generatedFiles.length > 0 ? generatedFiles : undefined
        }]);
      }

    } catch (err: any) {
      console.error("Chat Error:", err);
      setChat(prev => [...prev, {
        role: 'ai',
        content: "Maaf, saya tidak dapat terhubung ke server AI. Pastikan koneksi internet stabil dan API Key sudah aktif."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-50 flex flex-col items-end pointer-events-none print:hidden">
      {isOpen && (
        <Card className="w-[calc(100vw-32px)] sm:w-[420px] h-[500px] sm:h-[600px] max-h-[calc(100dvh-140px)] mb-4 shadow-2xl border-0 rounded-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto origin-bottom-right">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Si@Kad AI Pro</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-emerald-100">Membuat dokumen & gambar</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-gray-50 min-h-0">
            {(!apiConfig?.gemini_api_key && !apiConfig?.openai_api_key && !apiConfig?.openrouter_api_key) && (
              <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-[10px] text-amber-700 shrink-0">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>AI belum dikonfigurasi. Admin perlu mengisi API Key di Dashboard.</span>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0">
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-emerald-100' : 'bg-white shadow-sm border'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-emerald-600" /> : <Bot className="w-4 h-4 text-teal-600" />}
                    </div>
                    <div className="flex-1">
                      <div className={`p-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-tr-none ml-auto w-fit max-w-[85%]'
                          : 'bg-white shadow-sm border rounded-tl-none text-gray-700'
                      }`}>
                        {msg.content}
                      </div>

                      {/* Show generated files */}
                      {msg.generatedFiles && msg.generatedFiles.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {msg.generatedFiles.map((file, idx) => (
                            <button
                              key={idx}
                              onClick={() => downloadFile(file.blob, file.name)}
                              className="w-full p-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs rounded-lg flex items-center justify-center gap-2 hover:shadow-md transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>📥 {file.format}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm border flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                    </div>
                    <div className="p-3 rounded-2xl bg-white shadow-sm border rounded-tl-none">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="flex justify-center p-2">
                  <div className="text-xs text-teal-600 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Membuat dokumen/gambar...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t shrink-0">
              <div className="relative pointer-events-auto">
                <input
                  type="text"
                  placeholder="Buat pamflet, logo, poster, sertifikat..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full pl-4 pr-12 py-3 bg-gray-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isTyping || isGenerating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 pointer-events-auto ${
          isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
      </Button>
    </div>
  );
};

export default AIAssistant;