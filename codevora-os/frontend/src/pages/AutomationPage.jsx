import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Save, Plus, Trash2, Cpu, Globe, Clock, Activity, Terminal } from 'lucide-react';

const PRESETS = [
  {
    name: 'Daily News Fetch',
    steps: [
      { type: 'http_request', config: { method: 'GET', url: 'https://hacker-news.firebaseio.com/v0/topstories.json' } },
      { type: 'wait', config: { seconds: 1 } },
    ]
  },
  {
    name: 'System Health Check',
    steps: [
      { type: 'http_request', config: { method: 'GET', url: 'http://localhost:8000/health' } },
      { type: 'http_request', config: { method: 'GET', url: 'http://localhost:8000/api/system/stats' } },
    ]
  }
];

export default function AutomationPage() {
  const [name, setName]     = useState('My Workflow');
  const [steps, setSteps]   = useState([{ type: 'http_request', config: { method: 'GET', url: '' } }]);
  const [saved, setSaved]   = useState([]);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const addStep  = () => setSteps(s => [...s, { type: 'http_request', config: { method: 'GET', url: '' } }]);
  const removeStep = (i) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i, key, val) => setSteps(s => s.map((step, idx) => idx === i ? { ...step, config: { ...step.config, [key]: val } } : step));

  const saveWorkflow = async () => {
    try {
      await fetch('/api/automation/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps })
      });
      setSaved(s => [...s.filter(x => x !== name), name]);
    } catch { alert('Backend offline'); }
  };

  const runWorkflow = async (wfName = name) => {
    setRunning(true); setResults(null);
    try {
      const r = await fetch(`/api/automation/workflow/${encodeURIComponent(wfName)}/run`, { method: 'POST' });
      const d = await r.json();
      setResults(d.results);
    } catch { setResults([{ error: 'Backend offline' }]); }
    setRunning(false);
  };

  const loadPreset = (p) => { setName(p.name); setSteps(p.steps); };

  return (
    <div className="h-full relative overflow-y-auto overflow-x-hidden p-8 text-slate-200">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
             <Zap size={32} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="font-['Orbitron'] text-4xl font-black tracking-[0.2em] text-white">
              CORE <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">AUTOMATION</span>
            </h1>
            <p className="text-slate-400 mt-2 font-medium tracking-wide">Construct execution nodes and interconnect multi-stage workflows.</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ── Workflow Builder Box ── */}
          <div className="lg:col-span-8 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <input
                  type="text"
                  placeholder="Designate Workflow Label"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-transparent border-none text-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none w-full max-w-sm tracking-tight"
                />
                
                <div className="flex gap-2 shrink-0">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={saveWorkflow}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/50 transition-all font-bold flex items-center justify-center text-slate-300 shadow-lg"
                  >
                    <Save size={18} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => runWorkflow(name)} disabled={running}
                    className="px-6 py-3 bg-cyan-500 text-black border border-cyan-400 rounded-xl hover:bg-cyan-400 transition-all font-black tracking-widest text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {running ? <Activity className="animate-spin" size={18} /> : <Play fill="currentColor" size={18} />}
                    {running ? 'EXECUTING' : 'INITIALIZE'}
                  </motion.button>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-4 mb-8 relative">
                 <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-800" />
                 <AnimatePresence>
                   {steps.map((step, i) => (
                     <motion.div 
                       key={i}
                       initial={{ opacity: 0, height: 0, scale: 0.9 }}
                       animate={{ opacity: 1, height: 'auto', scale: 1 }}
                       exit={{ opacity: 0, height: 0, scale: 0.9 }}
                       className="relative z-10 pl-16 pr-2"
                     >
                       {/* Node Connector */}
                       <div className="absolute left-6 top-1/2 w-6 h-px bg-slate-700 -translate-y-1/2" />
                       <div className="absolute left-4 top-1/2 w-4 h-4 rounded-full bg-slate-800 border-2 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)] -translate-y-1/2" />

                       <div className="bg-white/5 border border-white/10  rounded-2xl p-6 group hover:border-cyan-500/30 transition-all">
                         <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-3">
                             <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-black tracking-widest uppercase">
                               NODE {i + 1}
                             </div>
                             <select
                               value={step.type}
                               onChange={e => setSteps(s => s.map((st, idx) => idx === i ? { ...st, type: e.target.value } : st))}
                               className="bg-transparent border-none text-sm font-bold text-slate-200 outline-none cursor-pointer focus:text-cyan-400"
                             >
                               <option value="http_request" className="bg-slate-900">HTTP Request</option>
                               <option value="wait" className="bg-slate-900">System Wait</option>
                             </select>
                           </div>
                           <button onClick={() => removeStep(i)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                             <Trash2 size={16} />
                           </button>
                         </div>

                         {/* Config Forms */}
                         <div className="pl-2">
                           {step.type === 'http_request' && (
                             <div className="flex gap-4">
                               <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 w-32">
                                 <Globe size={14} className="text-cyan-500 shrink-0" />
                                 <select value={step.config.method} onChange={e => updateStep(i, 'method', e.target.value)}
                                   className="bg-transparent border-none text-white text-xs font-bold w-full outline-none">
                                   {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m} className="bg-slate-900">{m}</option>)}
                                 </select>
                               </div>
                               <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 flex items-center flex-1">
                                 <input className="bg-transparent border-none text-slate-300 w-full outline-none text-sm font-mono placeholder:text-slate-600" 
                                        placeholder="https://api.codevora.network/..." 
                                        value={step.config.url} 
                                        onChange={e => updateStep(i, 'url', e.target.value)} />
                               </div>
                             </div>
                           )}
                           {step.type === 'wait' && (
                             <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 w-48">
                               <Clock size={14} className="text-amber-500 shrink-0" />
                               <input className="bg-transparent border-none text-slate-300 w-full outline-none text-sm font-mono placeholder:text-slate-600" 
                                      type="number" 
                                      placeholder="Delay (s)" 
                                      value={step.config.seconds || 1} 
                                      onChange={e => updateStep(i, 'seconds', parseInt(e.target.value))} />
                               <span className="text-xs text-slate-500 font-bold">SEC</span>
                             </div>
                           )}
                         </div>
                       </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={addStep}
                className="w-full py-4 border border-dashed border-white/20 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:bg-white/5 hover:text-white hover:border-cyan-500/50 transition-all font-bold tracking-widest text-xs uppercase"
              >
                <Plus size={16} /> Link New Node
              </motion.button>
            </motion.div>
          </div>

          {/* ── Right Panel: Logs & Presets ── */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Template Presets */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                 className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 shadow-xl"
            >
              <h3 className="flex items-center gap-2 font-['Orbitron'] font-black tracking-widest text-sm text-slate-300 mb-6">
                <Cpu size={16} className="text-violet-400" /> TEMPLATES
              </h3>
              <div className="flex flex-col gap-3">
                {PRESETS.map(p => (
                  <button key={p.name} onClick={() => loadPreset(p)}
                    className="text-left w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-300 text-sm group-hover:text-cyan-400 transition-colors">{p.name}</span>
                    <Zap size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Terminal Feed (Results) */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                 className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col min-h-[300px]"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                 <div className="flex items-center gap-2">
                   <Terminal size={14} className="text-cyan-500" />
                   <span className="font-mono text-[10px] tracking-widest text-slate-400 font-bold uppercase">Execution Log</span>
                 </div>
                 {running && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />}
              </div>
              <div className="p-5 flex-1 overflow-y-auto font-mono text-xs max-h-[500px]">
                 {!results && !running && <div className="text-slate-600 mt-4 text-center">Awaiting execution matrix...</div>}
                 {running && <div className="text-cyan-500 italic">Initiating neural handshake...</div>}
                 
                 {results && results.map((r, i) => (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                     key={i} className={`mb-4 p-3 rounded-lg border ${r.error ? 'bg-red-500/10 border-red-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}
                   >
                     <p className={`font-black tracking-widest text-[9px] mb-2 uppercase ${r.error ? 'text-red-400' : 'text-cyan-400'}`}>
                       [NODE {i + 1}] — {r.error ? 'CRITICAL FAULT' : 'OK'}
                     </p>
                     <pre className="text-slate-300 overflow-x-auto">
                       {JSON.stringify(r, null, 2)}
                     </pre>
                   </motion.div>
                 ))}
                 
                 {saved.length > 0 && !results && !running && (
                   <div className="mt-6 border-t border-white/10 pt-4">
                     <p className="font-black tracking-widest text-[9px] mb-3 uppercase text-slate-500">Local Memory Banks</p>
                     {saved.map(s => (
                        <div key={s} className="flex justify-between items-center mb-2">
                          <span className="text-slate-400 truncate">{s}</span>
                          <button onClick={() => runWorkflow(s)} className="text-cyan-500 hover:text-cyan-300 px-2 py-1 bg-white/5 rounded">RUN</button>
                        </div>
                     ))}
                   </div>
                 )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
