import React from 'react';
import { motion } from 'framer-motion';
import { X, Moon, Sun, Volume2, Globe, User, Bell, Shield } from 'lucide-react';

export default function SettingsPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900/90 border border-cyan-500/30 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyan-500/5 to-transparent">
          <div>
            <h2 className="text-2xl font-['Orbitron'] font-black tracking-widest text-white">SYSTEM <span className="text-cyan-400">CONFIG</span></h2>
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] mt-1">Adjust core operational parameters</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left Col */}
          <div className="space-y-8">
            <section>
              <h3 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                <Sun size={14} className="text-amber-400" /> Visual Interface
              </h3>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm font-semibold">Luminous Theme</span>
                <button className="w-12 h-6 bg-cyan-500 rounded-full relative p-1 transition-all">
                   <div className="w-4 h-4 bg-black rounded-full shadow-sm absolute right-1" />
                </button>
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                <Volume2 size={14} className="text-cyan-400" /> Neural Voice Output
              </h3>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all">
                <option>Josh (Deep Synthetic)</option>
                <option>Eve (Neural Humanoid)</option>
                <option>Jarvis (Military Grade)</option>
                <option>Baby (Liquid AI)</option>
              </select>
            </section>
          </div>

          {/* Right Col */}
          <div className="space-y-8">
            <section>
              <h3 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                <Globe size={14} className="text-violet-400" /> Language Matrix
              </h3>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all">
                <option>English (Global)</option>
                <option>Hindi (Localized)</option>
                <option>Spanish (European)</option>
                <option>Japanese (Tech)</option>
              </select>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                <Shield size={14} className="text-green-400" /> Security Level
              </h3>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                 <p className="text-[10px] text-green-400 font-bold mb-1 uppercase tracking-tighter">Hyper-Secure Mode Active</p>
                 <p className="text-[12px] text-slate-400 italic">Face ID & Neural Signature required for file deletion.</p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/40 border-t border-white/5 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-cyan-500 text-black font-black text-xs tracking-widest rounded-2xl shadow-lg hover:bg-cyan-400">SAVE PROTOCOLS</button>
          <button onClick={onClose} className="px-8 py-4 bg-white/5 text-slate-400 font-bold text-xs tracking-widest rounded-2xl hover:bg-white/10">DISCARD</button>
        </div>
      </motion.div>
    </div>
  );
}
