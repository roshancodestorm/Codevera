import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Brain, Mic, LayoutGrid, FolderOpen, Zap, HardDrive, Cpu } from 'lucide-react';

const NAV = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'HUD' },
  { id: 'chat',       icon: Brain,           label: 'BRAIN' },
  { id: 'voice',      icon: Mic,             label: 'VOICE' },
  { id: 'apps',       icon: LayoutGrid,      label: 'APPS' },
  { id: 'files',      icon: FolderOpen,      label: 'FILES' },
  { id: 'automation', icon: Zap,             label: 'AUTO' },
  { id: 'memory',     icon: HardDrive,       label: 'MEM' },
  { id: 'aibaby',     icon: Cpu,             label: 'CORE' },
];

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <nav className="h-full bg-slate-900/80 backdrop-blur-3xl border-r border-white/10 flex flex-col items-center py-6 gap-2 relative z-50 shadow-2xl">
      {NAV.map(n => {
        const isActive = activePage === n.id;
        return (
          <motion.button
            key={n.id}
            id={`nav-${n.id}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group ${
              isActive 
                ? 'bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)] border border-cyan-500/30' 
                : 'bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10'
            }`}
            onClick={() => setActivePage(n.id)}
            title={n.label}
          >
            {isActive && (
              <motion.div 
                layoutId="activeGlow"
                className="absolute inset-0 bg-cyan-400/10 rounded-2xl blur-md"
              />
            )}
            {isActive && (
              <div className="absolute -left-px top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#22d3ee]" />
            )}
            <n.icon 
              strokeWidth={isActive ? 2.5 : 1.5} 
              size={20} 
              className={`relative z-10 transition-colors ${
                isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
              }`} 
            />
            <span className={`text-[9px] font-black tracking-widest mt-1 relative z-10 transition-colors ${
              isActive ? 'text-cyan-200' : 'text-slate-600 group-hover:text-slate-400'
            }`}>
              {n.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
