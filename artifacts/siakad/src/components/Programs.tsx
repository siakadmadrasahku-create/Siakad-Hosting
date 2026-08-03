"use client";

import React from 'react';
import { BookOpen, Palette, Music, Globe, Calculator, Heart, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

const iconMap: Record<string, any> = { BookOpen, Palette, Music, Globe, Calculator, Heart };

const Programs = () => {
  const { settings } = useSiteSettings();
  const programs = settings.programs?.list || [
    { icon: 'BookOpen', title: 'Tahfidz Al-Quran', description: 'Menghafal Al-Quran dengan metode efektif.', color: 'text-emerald-600' },
    { icon: 'Calculator', title: 'Matematika Islam', description: 'Integrasi ilmu hisab dalam Islam.', color: 'text-blue-600' },
    { icon: 'Globe', title: 'Persiapan Global', description: 'Penguasaan bahasa asing sejak dini.', color: 'text-purple-600' }
  ];

  return (
    <section id="programs" className="py-16 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-xl md:text-3xl font-black text-slate-900 flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-emerald-600 rounded-sm rotate-12 flex-shrink-0"></div>
            <span>
              Kurikulum <span className="text-emerald-600 font-serif-premium italic">Unggulan</span>
            </span>
          </h2>
          <p className="text-slate-500 text-xs font-medium">Program pendidikan unggulan untuk melahirkan pemimpin masa depan.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {programs.map((p: any, i: number) => {
            const Icon = iconMap[p.icon] || BookOpen;
            return (
              <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white group">
                <CardContent className="p-6 space-y-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <Icon className={`w-5 h-5 ${p.color || 'text-emerald-600'} group-hover:text-white`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{p.title}</h3>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{p.description}</p>
                  </div>
                  <div className="flex items-center text-emerald-600 font-bold text-[10px] uppercase tracking-widest cursor-pointer pt-2">
                    Detail <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Programs;