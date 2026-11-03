import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Chrome, Github, Phone, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage({ onBack, onLoginSuccess }) {
  const [method, setMethod] = useState(null); // 'google' | 'github' | 'phone'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: input, 2: otp

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if(step === 1) setStep(2);
    else onLoginSuccess({ name: 'User', method: 'phone' });
  };

  return (
    <div className="min-h-screen bg-[#02050a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[150px]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,245,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 shadow-2xl overflow-hidden group">
          {/* Inner Glow Pulse */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700" />
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-['Orbitron'] font-black tracking-widest text-white mb-2">ACCESS <span className="text-cyan-400">CORE</span></h1>
            <p className="text-slate-400 text-sm italic">Synchronize your neural profile</p>
          </div>

          {!method ? (
            <div className="space-y-4">
              <button 
                onClick={() => onLoginSuccess({ name: 'Explorer', method: 'google' })}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-4 hover:bg-white/10 hover:border-cyan-500/50 transition-all group"
              >
                <Chrome className="text-slate-200 w-5 h-5 group-hover:text-cyan-400" />
                <span className="font-bold">Continue with Google</span>
              </button>
              
              <button 
                onClick={() => onLoginSuccess({ name: 'Coder', method: 'github' })}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-4 hover:bg-white/10 hover:border-violet-500/50 transition-all group"
              >
                <Github className="text-slate-200 w-5 h-5 group-hover:text-violet-400" />
                <span className="font-bold">Continue with GitHub</span>
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">or use cellular</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <button 
                onClick={() => setMethod('phone')}
                className="w-full py-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center gap-4 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all text-cyan-400"
              >
                <Phone className="w-5 h-5" />
                <span className="font-bold">Mobile OTP Access</span>
              </button>
            </div>
          ) : (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handlePhoneSubmit}
              className="space-y-6"
            >
              {step === 1 ? (
                 <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2 block">Phone Number</label>
                    <input 
                      autoFocus
                      type="tel" 
                      placeholder="+1 234 567 8900"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                 </div>
              ) : (
                <div>
                   <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2 block">Neural Key (OTP)</label>
                   <input 
                     autoFocus
                     type="text" 
                     placeholder="000000"
                     value={otp}
                     onChange={(e) => setOtp(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[1em] focus:outline-none focus:border-cyan-400 transition-colors"
                   />
                   <p className="text-center text-[10px] text-slate-500 mt-4">Code sent to head unit ending in **{phoneNumber.slice(-2)}</p>
                </div>
              )}

              <button className="w-full py-4 bg-cyan-500 text-black rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(0,245,255,0.3)] flex items-center justify-center gap-3">
                {step === 1 ? 'GET OTP' : 'VERIFY & SYNC'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <button 
                type="button"
                onClick={() => { setMethod(null); setStep(1); }}
                className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors uppercase font-bold tracking-widest"
              >
                ← Back to core selection
              </button>
            </motion.form>
          )}

          <div className="mt-10 pt-10 border-t border-white/5 flex items-center justify-center gap-2 text-slate-600">
            <ShieldCheck size={14} />
            <span className="text-[9px] uppercase tracking-tighter">Encrypted by Codevora Guardian Protocols</span>
          </div>
        </div>
        
        <button 
          onClick={onBack}
          className="mt-8 mx-auto block text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
        >
          Return to surface
        </button>
      </motion.div>
    </div>
  );
}
