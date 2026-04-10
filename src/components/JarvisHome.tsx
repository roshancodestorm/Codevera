import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Cpu, Activity, Settings, ChevronRight, Zap, Code, Terminal, Bot } from 'lucide-react';
import { useTranslation } from '../utils/i18nMock';

interface JarvisHomeProps {
  onStart: () => void;
}

const JarvisHome: React.FC<JarvisHomeProps> = ({ onStart }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Background Deep Grid / Tech lines effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-60"></div>
      
      {/* Glow ambient background sphere */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-5 px-8 lg:px-12 border-b border-cyan-900/40 bg-black/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full border border-cyan-400/60 flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.4)]">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-cyan-400 font-bold tracking-[0.2em] text-sm uppercase">Codevora AI</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8 text-xs tracking-widest text-cyan-600 font-semibold">
          <button 
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="hover:text-cyan-300 transition-colors duration-300 flex items-center space-x-2"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{t('features')}</span>
          </button>
          <button 
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="hover:text-cyan-300 transition-colors duration-300 flex items-center space-x-2"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t('pricing')}</span>
          </button>
          <button 
            onClick={() => document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' })}
            className="hover:text-cyan-300 transition-colors duration-300 flex items-center space-x-2"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>DOCS</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <select 
            onChange={(e) => i18n.changeLanguage(e.target.value)} 
            className="px-2 py-1 bg-cyan-950/40 border border-cyan-800 rounded text-cyan-300 text-xs font-semibold focus:outline-none"
            value={i18n.language}
          >
            <option value="en">EN</option>
            <option value="hi">हिन्दी</option>
            <option value="hinglish">Hinglish</option>
          </select>
          <button 
            onClick={onStart}
            className="px-5 py-2 text-xs border border-cyan-500/50 rounded-lg text-cyan-300 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all font-semibold tracking-widest"
          >
            {t('login')}
          </button>
        </div>
      </nav>

      {/* Main Hero Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center pb-24">
        
        {/* Core Animation Area */}
        <div className="relative w-56 h-56 md:w-80 md:h-80 mb-10 mt-16 flex items-center justify-center">
          {/* Outer glowing ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-cyan-500/20 border-t-cyan-400/80 shadow-[0_0_40px_rgba(0,255,255,0.1)]"
          />
          
          {/* Middle dashed ring */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border-[2px] border-dashed border-cyan-400/30"
          />
          
          {/* Inner solid ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-10 rounded-full border border-cyan-300/40 flex items-center justify-center"
          >
            {/* Center Core element */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-900/40 to-cyan-400/5 backdrop-blur-sm flex items-center justify-center border border-cyan-500/20"
            >
              <div className="w-14 h-14 rounded-full bg-cyan-400/20 shadow-[0_0_30px_rgba(0,255,255,0.5)] flex items-center justify-center">
                 <div className="w-6 h-6 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(255,255,255,0.9)]"></div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Text Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.1em] mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-300" style={{ textShadow: '0 0 30px rgba(0, 255, 255, 0.2)' }}>
            {t('codevora_ai')}
          </h1>
          <div className="mb-10" />
          
          {/* CTA Button */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="group relative px-8 py-4 bg-transparent border border-cyan-500/50 rounded-xl flex items-center justify-center mx-auto space-x-3 overflow-hidden transition-all hover:bg-cyan-950/20 hover:border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.1)]"
          >
            <div className="absolute inset-0 bg-cyan-400/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative z-10 text-cyan-300 font-semibold tracking-widest text-xs uppercase">{t('get_started')}</span>
            <ChevronRight className="relative z-10 w-4 h-4 text-cyan-300 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>

        {/* Features Preview grid */}
        <div id="features" className="scroll-mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-24 px-4">
          {[
            { icon: Code, title: 'AI Code Generator', desc: 'Generate complete modules, components, and clean node backends inside isolated sandboxes.' },
            { icon: Zap, title: 'Node Automation', desc: 'Deploy workflow pipelines addressing WhatsApp messaging, triggers, routing hooks in real-time.' },
            { icon: Bot, title: 'Multi-Core Compute', desc: 'Failsafe stream switches addressing Gemini, Blackbox AI, and Grok with cycle rotation backups.' }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
              className="p-6 rounded-2xl bg-cyan-950/10 border border-cyan-900/40 backdrop-blur-md text-left flex flex-col items-start hover:border-cyan-500/40 group transition-all"
            >
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 mb-4 group-hover:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all">
                <item.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-cyan-200 text-sm uppercase tracking-wider font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Pricing Tiers teaser */}
        <div id="pricing" className="scroll-mt-24 mt-28 w-full max-w-4xl px-4 text-center">
            <h2 className="text-2xl font-light tracking-widest text-cyan-200 mb-2 uppercase">Subscription Tiers</h2>
            <p className="text-gray-500 text-xs mb-10">Access specialized dashboard capabilities without hardware boundaries.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-cyan-950/5 border border-cyan-900/30 flex flex-col items-center">
                <h3 className="text-gray-300 text-xs tracking-widest uppercase mb-1">Standard Node</h3>
                <p className="text-3xl font-light text-cyan-300 mb-4">$0 <span className="text-xs text-gray-500">Tier 1</span></p>
                <div className="h-px w-24 bg-cyan-900/40 mb-4"></div>
                <ul className="text-xs text-gray-400 space-y-2 mb-8 text-left max-w-xs">
                  <li>• Gemini 2.5 Flash stream queries</li>
                  <li>• Shared compute instance buffers</li>
                  <li>• Dashboard core UI Access</li>
                </ul>
                <button onClick={onStart} className="w-full py-2.5 text-xs text-center border border-cyan-900 rounded-lg text-cyan-400 hover:border-cyan-500 transition-colors">Start Standard</button>
              </div>
              <div className="p-8 rounded-2xl bg-cyan-950/20 border border-cyan-500/40 flex flex-col items-center shadow-[0_0_30px_rgba(0,255,255,0.05)] relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500 text-black text-[9px] font-bold tracking-wider rounded uppercase">Popular</div>
                <h3 className="text-cyan-300 text-xs tracking-widest uppercase mb-1">Advanced AI (Pro)</h3>
                <p className="text-3xl font-light text-white mb-4">$29 <span className="text-xs text-cyan-700">/ mo</span></p>
                <div className="h-px w-24 bg-cyan-500/20 mb-4"></div>
                <ul className="text-xs text-cyan-100/80 space-y-2 mb-8 text-left max-w-xs">
                  <li>• API direct cycles for Grok & DeepSeek</li>
                  <li>• Dedicated buffer bandwidth streams</li>
                  <li>• Full automation control workspaces</li>
                  <li>• Failsafe priority stream rotations</li>
                </ul>
                <button onClick={onStart} className="w-full py-2.5 text-xs text-center bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors">Upgrade to Pro</button>
              </div>
            </div>
        </div>

        {/* DOCS Section */}
        <div id="docs" className="scroll-mt-24 mt-28 w-full max-w-4xl px-4 text-left border-t border-cyan-900/20 pt-28">
            <h2 className="text-2xl font-light tracking-widest text-cyan-200 mb-6 uppercase border-b border-cyan-900/40 pb-2 flex items-center space-x-3">
              <Settings className="w-5 h-5 text-cyan-500" />
              <span>Documentation Delineate</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                whileHover={{ x: 10 }}
                className="p-6 rounded-xl bg-cyan-950/20 border border-cyan-900/40 cursor-pointer"
              >
                <h3 className="text-cyan-400 text-sm font-semibold mb-2 uppercase tracking-tighter">Getting Started</h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                  Learn how to initialize your first Node instance and connect to the Codevora network architecture.
                </p>
                <ul className="text-[10px] text-cyan-600 space-y-2 uppercase font-bold">
                  <li className="flex items-center space-x-2"><ChevronRight className="w-3 h-3"/> <span>Quickstart Guide</span></li>
                  <li className="flex items-center space-x-2"><ChevronRight className="w-3 h-3"/> <span>Architecture Overview</span></li>
                  <li className="flex items-center space-x-2"><ChevronRight className="w-3 h-3"/> <span>Environment Setup</span></li>
                </ul>
              </motion.div>
              <motion.div 
                whileHover={{ x: 10 }}
                className="p-6 rounded-xl bg-cyan-950/20 border border-cyan-900/40 cursor-pointer"
              >
                <h3 className="text-cyan-400 text-sm font-semibold mb-2 uppercase tracking-tighter">API Reference</h3>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                  Explore our comprehensive API documentation for integrating Gemini, Grok, and custom neural tools.
                </p>
                <ul className="text-[10px] text-cyan-600 space-y-2 uppercase font-bold">
                  <li className="flex items-center space-x-2"><ChevronRight className="w-3 h-3"/> <span>Request/Response Schemas</span></li>
                  <li className="flex items-center space-x-2"><ChevronRight className="w-3 h-3"/> <span>Authentication Hooks</span></li>
                  <li className="flex items-center space-x-2"><ChevronRight className="w-3 h-3"/> <span>Stream Rotation Logic</span></li>
                </ul>
              </motion.div>
            </div>
        </div>

      </main>
      
      {/* Decorative corner brackets */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-cyan-800/40 pointer-events-none"></div>
      <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-cyan-800/40 pointer-events-none"></div>
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-cyan-800/40 pointer-events-none"></div>
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-cyan-800/40 pointer-events-none"></div>
    </div>
  );
};

export default JarvisHome;
