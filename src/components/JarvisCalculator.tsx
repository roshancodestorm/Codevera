import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, MoveRight, HelpCircle, Activity, Zap } from 'lucide-react';

interface JarvisCalculatorProps {
  onClose: () => void;
}

const JarvisCalculator: React.FC<JarvisCalculatorProps> = ({ onClose }) => {
  const [numA, setNumA] = useState<string>('0');
  const [numB, setNumB] = useState<string>('0');
  const [operation, setOperation] = useState<'add' | 'sub' | 'mul' | 'div' | 'mod' | 'pow' | 'sqrt'>('add');
  const [result, setResult] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculate = () => {
    setIsCalculating(true);
    setResult(null);

    setTimeout(() => {
      const a = parseFloat(numA) || 0;
      const b = parseFloat(numB) || 0;
      let res = 0;

      switch (operation) {
        case 'add': res = a + b; break;
        case 'sub': res = a - b; break;
        case 'mul': res = a * b; break;
        case 'div': res = b !== 0 ? a / b : 0; break;
        case 'mod': res = a % b; break;
        case 'pow': res = Math.pow(a, b); break;
        case 'sqrt': res = Math.sqrt(a); break;
      }

      setResult(res);
      setIsCalculating(false);
    }, 1000); // simulated holographic render time
  };

  const opSymbols = { add: '+', sub: '-', mul: '×', div: '÷', mod: '%', pow: '^', sqrt: '√' };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(12px)' }}
      exit={{ opacity: 0, scale: 0.95, backdropFilter: 'blur(0px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
    >
      {/* Glow Backing */}
      <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />

      <motion.div 
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="relative w-full max-w-md bg-cyan-950/20 border border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,255,255,0.15)] flex flex-col space-y-5 overflow-hidden backdrop-blur-md"
      >
        {/* Decorative corner lines */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/60 rounded-br-xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-bold tracking-[.25em] text-xs uppercase">Arithmetic Engine</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full border border-cyan-800/40 hover:border-cyan-400/60 text-cyan-600 hover:text-cyan-400 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Banner */}
        <div className="bg-black/60 border border-cyan-900/60 rounded-xl p-4 flex flex-col items-end justify-center h-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)]" />
          <AnimatePresence mode="wait">
            {isCalculating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-cyan-600 text-xs tracking-widest font-mono animate-pulse"
              >
                COMPUTING NEURAL VECTORS...
              </motion.div>
            ) : result !== null ? (
              <motion.div 
                key="result"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-end"
              >
                <div className="text-cyan-700 text-[10px] font-mono tracking-wider mb-1">
                  {numA} {opSymbols[operation]} {numB} =
                </div>
                <div className="text-3xl font-light text-cyan-300 tracking-wider shadow-inner" style={{ textShadow: '0 0 15px rgba(0,255,255,0.5)' }}>
                  {result}
                </div>
              </motion.div>
            ) : (
              <motion.div key="idle" className="text-cyan-800 text-xs font-mono">READY</motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-cyan-700 font-mono tracking-widest uppercase">INPUT A</label>
              <input 
                type="number" 
                value={numA} 
                onChange={(e) => setNumA(e.target.value)}
                className="w-full bg-cyan-950/40 border border-cyan-900/60 rounded-lg px-3 py-2 text-sm text-cyan-200 focus:border-cyan-500/40 outline-none text-right font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-cyan-700 font-mono tracking-widest uppercase">INPUT B</label>
              <input 
                type="number" 
                value={numB} 
                onChange={(e) => setNumB(e.target.value)}
                className="w-full bg-cyan-950/40 border border-cyan-900/60 rounded-lg px-3 py-2 text-sm text-cyan-200 focus:border-cyan-500/40 outline-none text-right font-mono"
              />
            </div>
          </div>

          {/* Operation Selector */}
          <div className="grid grid-cols-4 gap-2 border-y border-cyan-900/30 py-3">
            {[
              { type: 'add', icon: <Plus className="w-4 h-4" /> },
              { type: 'sub', icon: <Minus className="w-4 h-4" /> },
              { type: 'mul', icon: <span className="text-sm font-bold">×</span> },
              { type: 'div', icon: <span className="text-sm font-bold">÷</span> },
              { type: 'mod', icon: <span className="text-xs font-mono">%</span> },
              { type: 'pow', icon: <span className="text-xs font-mono">X<sup>Y</sup></span> },
              { type: 'sqrt', icon: <span className="text-sm font-mono">√</span> }
            ].map((op) => (
              <button
                key={op.type}
                onClick={() => setOperation(op.type as any)}
                className={`h-10 rounded-lg flex items-center justify-center border transition-all ${
                  operation === op.type 
                    ? 'border-cyan-400 bg-cyan-900/50 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.4)]' 
                    : 'border-cyan-900 hover:border-cyan-700 text-cyan-600'
                }`}
              >
                {op.icon}
              </button>
            ))}
          </div>

          {/* Compute Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={calculate}
            disabled={isCalculating}
            className="w-full py-3 mt-1 bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center space-x-2 text-cyan-300 hover:from-cyan-600/50 hover:to-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all font-semibold text-xs tracking-[0.2em] uppercase disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Computing...' : 'Initialize Computation'}</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default JarvisCalculator;
