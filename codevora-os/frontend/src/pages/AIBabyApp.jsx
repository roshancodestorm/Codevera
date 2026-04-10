import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Paperclip, Send, Activity } from 'lucide-react';
import AIBabyAvatar from '../components/AIBabyAvatar';

export default function AIBabyApp() {
  const [appState, setAppState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy'
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState([
    { role: 'ai', text: "Hello! I am your Codevora AI Baby. How can I assist you today?" }
  ]);

  const handleSend = () => {
    if(!inputVal.trim()) return;
    setHistory([...history, { role: 'user', text: inputVal }]);
    setInputVal("");
    setAppState('thinking');
    
    // Simulate Neural API Delay
    setTimeout(() => {
      setAppState('speaking');
      setHistory(prev => [...prev, { role: 'ai', text: "Processing your request securely over my neural matrix." }]);
      
      // Stop speaking animations after a delay
      setTimeout(() => setAppState('happy'), 2500);
      setTimeout(() => setAppState('idle'), 4000);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-[#03050a] overflow-hidden font-sans text-slate-200">
        
      {/* ══ LEFT SEC: Physical Interaction Avatar ══ */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-10"
           onDragOver={(e) => { e.preventDefault(); setAppState('excited'); }}
           onDragLeave={() => setAppState('idle')}>
        
        {/* Holographic BG */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(56,189,248,0.1),_transparent_70%)] -z-10" />

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-10 flex flex-col items-center"
        >
          <h1 className="font-black tracking-[0.4em] text-white/40 text-3xl mb-1">
            CODEVORA <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">BABY</span>
          </h1>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        </motion.div>
        
        {/* Framer Engine Baby Component */}
        <AIBabyAvatar emotion={appState} onClick={() => setAppState('happy')} />

        {/* Dynamic Status Text */}
        <div className="mt-12 flex flex-col items-center">
          <motion.p 
            key={appState}
            initial={{ opacity: 0, letterSpacing: "0.1em" }}
            animate={{ opacity: 1, letterSpacing: "0.4em" }}
            className="text-cyan-400 font-mono text-xs tracking-[0.4em] uppercase"
          >
            {appState === 'idle' ? 'System Ready' : (appState === 'thinking' ? 'Neural Processing' : appState)}
          </motion.p>
          <motion.div 
            animate={{ width: [40, 120, 40] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="h-px bg-cyan-500/30 mt-2"
          />
        </div>

        {/* Desktop Buttons */}
        <div className="absolute bottom-16 flex gap-6">
          <motion.button 
            whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(0, 245, 255, 0.4)" }} 
            whileTap={{ scale: 0.9 }}
            className={`p-6 rounded-full flex items-center justify-center shadow-lg transition-colors ${appState === 'listening' ? 'bg-red-500 text-white' : 'bg-cyan-500 text-black'}`}
            onClick={() => setAppState(appState === 'listening' ? 'idle' : 'listening')}
          >
            <Mic size={24} />
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="p-6 rounded-full bg-slate-800 border border-white/10 hover:bg-slate-700 shadow-lg text-white"
            onClick={() => setAppState('excited')}
          >
            <Paperclip size={24} />
          </motion.button>
        </div>
      </div>

      {/* ══ RIGHT SEC: Context / Terminal Box ══ */}
      <div className="w-[450px] bg-slate-900/60 backdrop-blur-3xl border-l border-white/5 flex flex-col shadow-2xl relative z-10">
         
         {/* Terminal Header */}
         <div className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <Activity className="text-cyan-400" size={18} />
             <span className="font-mono text-cyan-400 text-sm tracking-[0.2em]">NEURAL LOG</span>
           </div>
         </div>

         {/* Chat Feed */}
         <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {history.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-4 text-[13px] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-50' 
                    : 'bg-indigo-500/10 border border-indigo-500/20 text-white'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
            
            {appState === 'thinking' && (
              <div className="text-indigo-400 text-xs italic ml-2">Building neural response...</div>
            )}
         </div>

         {/* Terminal Input */}
         <div className="p-6 border-t border-white/5 bg-black/20">
           <div className="flex gap-3">
             <input 
               type="text" 
               value={inputVal}
               onChange={(e) => setInputVal(e.target.value)}
               onKeyDown={(e) => { if(e.key === 'Enter') handleSend(); }}
               placeholder="Speak or type a command..."
               className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
             />
             <button 
               onClick={handleSend}
               className="bg-cyan-500 text-black px-5 rounded-xl font-bold hover:bg-cyan-400 transition-colors flex items-center justify-center"
             >
               <Send size={18} />
             </button>
           </div>
         </div>
      </div>
      
    </div>
  );
}
