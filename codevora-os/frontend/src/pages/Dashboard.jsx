import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Image, MessageSquare, Video, FileText, Layers, Plus } from 'lucide-react';
import AIBabyAvatar from '../components/AIBabyAvatar';

const AI_TOOLS = [
  { id: 'slides', icon: Layers, label: 'Slides', color: 'text-amber-400' },
  { id: 'docs', icon: FileText, label: 'Docs', color: 'text-cyan-400' },
  { id: 'image', icon: Image, label: 'Image', color: 'text-violet-400' },
  { id: 'chat', icon: MessageSquare, label: 'Chat', color: 'text-green-400' },
  { id: 'video', icon: Video, label: 'Video', color: 'text-red-400' },
];

export default function Dashboard() {
  const [appState, setAppState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setAppState('thinking');
    setTimeout(() => {
      setAppState('speaking');
      setTimeout(() => setAppState('idle'), 3000);
    }, 2000);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col items-center justify-between relative overflow-hidden pt-12">
      {/* ── Background Grid & Glow ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[linear-gradient(rgba(0,245,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* ── Central AI Baby ─────────────────────────────────────────── */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10"
      >
        <AIBabyAvatar emotion={appState} onClick={() => setAppState('happy')} />
        <div className="mt-8 text-center">
           <h2 className="text-sm font-['Orbitron'] font-black tracking-[0.4em] text-cyan-400 uppercase italic">
             {appState === 'idle' ? 'Core Syncing...' : `${appState}...`}
           </h2>
        </div>
      </motion.div>

      {/* ── Bottom Section: Input & Tools ────────────────────────────── */}
      <div className="w-full max-w-4xl relative z-10 pb-8 flex flex-col items-center gap-8 px-4">
        
        {/* Interaction Input Bar */}
        <div className="w-full bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-full p-2 flex items-center shadow-2xl">
          <button className="p-4 mr-2 bg-white/5 rounded-full hover:bg-cyan-500/20 hover:text-cyan-400 transition-all">
            <Plus size={20} />
          </button>
          
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Codevora anything..."
            className="flex-1 bg-transparent border-none outline-none text-white px-4 font-medium placeholder:text-slate-600"
          />

          <div className="flex items-center gap-2 pr-2">
            <button 
              onClick={() => setAppState(appState === 'listening' ? 'idle' : 'listening')}
              className={`p-4 rounded-full transition-all ${appState === 'listening' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
            >
              <Mic size={20} />
            </button>
            <button 
              onClick={handleSend}
              className="p-4 bg-cyan-500 text-black rounded-full shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:shadow-[0_0_30px_rgba(0,242,255,0.6)] hover:scale-105 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* AI Tools Navbar */}
        <div className="flex gap-4 p-2 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md">
           {AI_TOOLS.map((tool) => (
             <button
               key={tool.id}
               className="flex flex-col items-center gap-2 py-3 px-6 rounded-2xl hover:bg-white/5 transition-all group"
             >
                <tool.icon className={`${tool.color} w-6 h-6 group-hover:scale-110 transition-transform`} />
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 group-hover:text-white transition-colors">{tool.label}</span>
             </button>
           ))}
        </div>
      </div>

    </div>
  );
}
