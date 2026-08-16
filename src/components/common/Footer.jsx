import React from 'react';
import { Sparkles, Heart, MapPin, ShieldCheck, Zap } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-rose-100 bg-white py-8 px-4 sm:px-6 lg:px-8 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">GlowUp Makeup On-Demand Platform</p>
            <p className="text-slate-500 text-[11px]">Bán kính định vị GPS thời gian thực & Kết nối Thợ chuyên nghiệp</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-medium">
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-rose-600" /> OpenStreetMap & Leaflet
          </span>
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-amber-500" /> Vite + ReactJS + Redux Toolkit
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" /> Axios Interceptor & Bearer Auth
          </span>
        </div>

        <div className="text-center md:text-right text-slate-500 text-[11px]">
          &copy; 2026 GlowUp Platform. Crafted with <Heart size={10} className="inline text-rose-500 fill-rose-500" /> for Makeup Artists.
        </div>

      </div>
    </footer>
  );
};
