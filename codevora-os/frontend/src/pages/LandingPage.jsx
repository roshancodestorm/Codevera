import React from 'react';
import { motion } from 'framer-motion';
import AIBabyAvatar from '../components/AIBabyAvatar';
import { 
  Plus, 
  Globe, 
  Mic, 
  ArrowUp, 
  Twitter, 
  Disc, 
  Zap, 
  MessageSquare, 
  Lock 
} from 'lucide-react';

export default function LandingPage({ onLogin, onStart }) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white selection:bg-blue-500/30 font-['Inter']">
      {/* ── Background: Subtle Gradient HUD ── */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.1),_transparent_70%)]" />
      </div>

      {/* ── Navigation: Minimalist ── */}
      <nav className="relative z-10 flex items-center justify-between px-12 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <span className="font-bold text-xl tracking-tight">Codevora</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onLogin} className="text-sm font-medium text-white/50 hover:text-white transition-colors">Log in</button>
          <button onClick={onStart} className="px-5 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-white/90 transition-all shadow-lg">Sign up</button>
        </div>
      </nav>

      {/* ── Hero: Precise GPT-Copy UI ── */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32 px-6">
        
        {/* The AI Baby focal point */}
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 1 }}
           className="mb-12"
        >
          <AIBabyAvatar emotion="idle" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center w-full max-w-3xl"
        >
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-16">
            Intelligence for <span className="text-white/40">everything.</span>
          </h1>
          
          {/* 🎯 PIXEL PERFECT GPT INPUT BAR COPY 🎯 */}
          <div 
            onClick={onStart}
            className="group relative w-full max-w-2xl mx-auto mb-20 cursor-text"
          >
             <div className="relative flex items-center bg-[#2f2f2f] border border-white/5 rounded-[26px] p-2 pr-3 shadow-2xl transition-all hover:bg-[#353535] group-hover:border-white/10">
                {/* Left Icons: Attachment & Web Search */}
                <div className="flex items-center gap-1 pl-2">
                   <div className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white transition-all cursor-pointer">
                      <Plus size={20} strokeWidth={2.5} />
                   </div>
                   <div className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white transition-all cursor-pointer">
                      <Globe size={18} strokeWidth={2.5} />
                   </div>
                </div>

                {/* Main Input Text Area */}
                <div className="flex-1 px-3 text-lg text-white/40 font-medium select-none text-left">
                   Ask Codevora anything...
                </div>

                {/* Right Icons: Mic & Send Up-Arrow */}
                <div className="flex items-center gap-2">
                   <div className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white transition-all cursor-pointer">
                      <Mic size={18} strokeWidth={2.5} />
                   </div>
                   <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                      <ArrowUp size={18} strokeWidth={3} />
                   </div>
                </div>
             </div>
             
             <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold text-white/20 uppercase tracking-[3px]">
                <span>System 2.4</span>
                <span className="w-1 h-1 bg-white/10 rounded-full mt-1" />
                <span>Encrypted Trace</span>
             </div>
          </div>
        </motion.div>

        {/* ── Capabilities Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
           <div className="p-8 rounded-[36px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex flex-col items-center text-center">
              <Zap className="text-blue-500 mb-6" size={26} />
              <h3 className="text-lg font-bold mb-3">Natural Reasoning</h3>
              <p className="text-sm text-white/30 leading-relaxed">Bimodal logic for hyper-realistic conversation.</p>
           </div>
           <div className="p-8 rounded-[36px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex flex-col items-center text-center">
              <MessageSquare className="text-green-500 mb-6" size={26} />
              <h3 className="text-lg font-bold mb-3">System Control</h3>
              <p className="text-sm text-white/30 leading-relaxed">Hardware-native automation via voice command.</p>
           </div>
           <div className="p-8 rounded-[36px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex flex-col items-center text-center">
              <Lock className="text-violet-500 mb-6" size={26} />
              <h3 className="text-lg font-bold mb-3">Secure Sandbox</h3>
              <p className="text-sm text-white/30 leading-relaxed">AES-256 neural memory encryption.</p>
           </div>
        </div>
      </main>

      {/* ── Improved Footer Uplinks ── */}
      <footer className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-12 flex flex-col md:flex-row items-center justify-between gap-12">
           <div className="flex items-center gap-10">
              <div className="flex gap-6 text-white/30">
                 <Twitter size={20} className="hover:text-blue-400 cursor-pointer transition-colors" />
                 <Disc size={20} className="hover:text-indigo-400 cursor-pointer transition-colors" />
              </div>
              <div className="h-4 w-px bg-white/10 hidden md:block" />
              <div className="flex gap-10 text-[11px] font-bold tracking-[2px] text-white/20 uppercase">
                 <span className="hover:text-white cursor-pointer transition-colors">Legal</span>
                 <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
              </div>
           </div>
           
           <span className="text-[10px] font-bold text-white/10 tracking-[4px] uppercase italic">Codevora Neural Systems © 2026</span>
        </div>
      </footer>
    </div>
  );
}
