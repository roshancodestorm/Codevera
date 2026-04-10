import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Zap, Crown, Rocket, Shield, 
  Clock, Cpu, Mic, LayoutDashboard, 
  Infinity as InfinityIcon, Terminal, Server, 
  Settings, Code, Sparkles, MessageSquare 
} from 'lucide-react';

const PLANS = [
  {
    name: 'Free Trial',
    price: '0',
    icon: Rocket,
    color: 'from-slate-400 to-slate-600',
    border: 'border-slate-800',
    bg: 'bg-slate-900/50',
    features: [
      { text: '7 Days Access', icon: Clock }, 
      { text: '100 AI Credits', icon: Cpu }, 
      { text: 'Basic Voice Support', icon: Mic }, 
      { text: 'Dashboard Access', icon: LayoutDashboard }
    ],
    btn: 'Start Training',
    popular: false
  },
  {
    name: 'Neural Pro',
    price: '29',
    icon: Zap,
    color: 'from-cyan-400 to-blue-600',
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-950/30',
    features: [
      { text: 'Unlimited Commands', icon: InfinityIcon }, 
      { text: '5,000 AI Credits/mo', icon: Cpu }, 
      { text: 'ElevenLabs Voice Engine', icon: Sparkles }, 
      { text: 'Advanced Automation', icon: Settings }, 
      { text: 'WhatsApp Integration', icon: MessageSquare }
    ],
    btn: 'Upgrade Core',
    popular: true
  },
  {
    name: 'Digital Ultimate',
    price: '99',
    icon: Crown,
    color: 'from-violet-400 to-purple-600',
    border: 'border-purple-500/30',
    bg: 'bg-purple-950/20',
    features: [
      { text: 'Dedicated GPU Cluster', icon: Server }, 
      { text: 'Infinity AI Credits', icon: InfinityIcon }, 
      { text: 'Full OS Control', icon: Terminal }, 
      { text: 'API Access', icon: Code }, 
      { text: 'Custom AI Personality', icon: Crown }
    ],
    btn: 'Assume Control',
    popular: false
  }
];

export default function PricingPage({ onBack }) {
  const [hoveredPlan, setHoveredPlan] = useState(null);

  return (
    <div className="min-h-screen bg-[#020408] py-24 px-6 relative overflow-hidden font-sans text-slate-300">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-cyan-600/10 rounded-full blur-[150px] mix-blend-screen" 
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.2, 1] }} 
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-violet-600/10 rounded-full blur-[150px] mix-blend-screen" 
        />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-20" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-[0.2em] uppercase mb-8 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          >
            <Shield size={14} className="animate-pulse" /> System Upgrades
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6"
          >
            TRANSACTION <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">NODES</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed"
          >
            Select the energy tier required for your AI's expansion. All plans include neural sandbox protection and zero-latency interconnects.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.1 + i * 0.15, type: "spring", stiffness: 100 }}
              onHoverStart={() => setHoveredPlan(i)}
              onHoverEnd={() => setHoveredPlan(null)}
              className={`relative rounded-[32px] p-8 lg:p-10 transition-all duration-500 flex flex-col h-full z-10 group overflow-hidden ${
                plan.popular 
                  ? 'lg:-translate-y-4 lg:scale-105 border-[2px] border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.15)] bg-gradient-to-b from-slate-900 via-[#0a1122] to-slate-900 z-20' 
                  : `border border-slate-800 ${plan.bg} hover:border-slate-700 hover:shadow-2xl`
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-5 inset-x-0 flex justify-center z-30">
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black tracking-[0.2em] py-2 px-6 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.6)] uppercase flex items-center gap-2"
                  >
                    <Zap size={14} className="fill-black" />
                    Recommended Node
                  </motion.div>
                </div>
              )}

              {/* Shine effect on hover */}
              <AnimatePresence>
                {hoveredPlan === i && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none rounded-[30px]"
                  />
                )}
              </AnimatePresence>

              <div className="mb-8 relative z-20">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${plan.color} shadow-lg shadow-black/50 text-white`}
                >
                   <plan.icon size={32} strokeWidth={1.5} />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">{plan.name}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-mono font-semibold">Power Tier {i + 1}</p>
              </div>

              <div className="mb-8 relative pb-6 border-b border-white/10 z-20">
                <div className="flex items-baseline">
                  <span className="text-6xl font-black text-white tracking-tighter">${plan.price}</span>
                  <span className="text-slate-500 ml-2 font-medium text-lg">/ month</span>
                </div>
              </div>

              <ul className="space-y-5 mb-10 flex-1 z-20">
                {plan.features.map((f, fi) => (
                  <motion.li 
                    key={fi} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + (i * 0.1) + (fi * 0.1) }}
                    className="flex items-center gap-4 group/item cursor-default"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                        plan.popular 
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover/item:bg-cyan-400 group-hover/item:text-black group-hover/item:shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                          : 'bg-white/5 border border-white/10 text-slate-400 group-hover/item:bg-white/20 group-hover/item:text-white'
                      }`}
                    >
                      <f.icon size={14} strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-slate-300 font-medium group-hover/item:text-white group-hover/item:translate-x-1 transition-all duration-300">
                      {f.text}
                    </span>
                  </motion.li>
                ))}
              </ul>

              <button className={`w-full py-4 rounded-xl font-bold tracking-[0.1em] text-sm uppercase transition-all duration-300 relative overflow-hidden group/btn z-20 ${
                plan.popular 
                  ? 'bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:bg-cyan-300 hover:scale-[1.02]' 
                  : 'bg-slate-800 text-white hover:bg-slate-700 hover:scale-[1.02]'
              }`}>
                {/* Button shine sweep */}
                <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {plan.btn} <Zap size={14} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </span>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center relative z-20">
           <button 
             onClick={onBack} 
             className="group flex items-center justify-center gap-2 mx-auto text-slate-500 hover:text-cyan-400 transition-colors uppercase font-bold tracking-[0.2em] text-xs"
           >
             <span className="transition-transform group-hover:-translate-x-1">←</span>
             Collapse Pricing Modules
           </button>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
