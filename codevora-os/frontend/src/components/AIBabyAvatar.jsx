import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const avatarVariants = {
  idle: {
    y: [0, -15, 0],
    scale: 1,
    rotate: [0, 1, -1, 0],
    transition: { 
      y: { repeat: Infinity, duration: 4, ease: "easeInOut" }, 
      rotate: { repeat: Infinity, duration: 8, ease: "easeInOut" }
    }
  },
  listening: {
    y: 0,
    scale: 1.15,
    boxShadow: "0px 0px 60px rgba(0, 245, 255, 0.4)",
    transition: { type: "spring", stiffness: 300, damping: 15 }
  },
  thinking: {
    y: -10,
    scale: 0.95,
    rotate: [1, -1, 1],
    transition: { rotate: { repeat: Infinity, duration: 2, ease: "linear" } }
  },
  speaking: {
    y: 0,
    scale: [1, 1.05, 1],
    transition: { repeat: Infinity, duration: 0.4 }
  },
  happy: {
    y: [0, -25, 0],
    scale: [1, 1.1, 1],
    transition: { duration: 0.6 }
  }
};

const eyeVariants = {
  idle: { 
    height: [24, 24, 24, 2, 24, 24, 24, 24, 2, 24], 
    width: 24, 
    borderRadius: "50%",
    transition: { repeat: Infinity, duration: 3.5, times: [0, 0.4, 0.45, 0.47, 0.5, 0.8, 0.85, 0.87, 0.9, 1] } 
  },
  listening: { 
    height: [32, 32, 2, 32], 
    width: 32, 
    borderRadius: "50%",
    transition: { repeat: Infinity, duration: 4, times: [0, 0.5, 0.52, 1] }
  },
  thinking: { height: 8, y: -5, width: 24, borderRadius: "50%" },
  speaking: { 
    height: [24, 26, 2, 24, 26, 24], 
    width: 24, 
    borderRadius: "50%", 
    transition: { repeat: Infinity, duration: 1.5, times: [0, 0.3, 0.32, 0.6, 0.9, 1] } 
  },
  happy: { height: 8, width: 32, borderRadius: "50px 50px 0 0", y: -5 }
};

// Baby-themed background floating elements
const BackgroundElement = ({ i }) => {
  const size = Math.random() * 40 + 20;
  const initialX = Math.random() * 400 - 200;
  const initialY = Math.random() * 400 - 200;
  
  return (
    <motion.div
      initial={{ x: initialX, y: initialY, opacity: 0, scale: 0 }}
      animate={{ 
        x: [initialX, initialX + (Math.random() * 100 - 50), initialX],
        y: [initialY, initialY + (Math.random() * 100 - 50), initialY],
        opacity: [0.1, 0.3, 0.1],
        scale: [1, 1.2, 1],
      }}
      transition={{ 
        duration: 5 + Math.random() * 5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className="absolute rounded-full bg-blue-400/20 blur-xl"
      style={{ width: size, height: size }}
    />
  );
};

// Mini Baby element for background animation
const MiniBaby = ({ i }) => {
  const size = 15 + Math.random() * 20;
  const initialX = Math.random() * 500 - 250;
  const initialY = Math.random() * 500 - 250;
  
  return (
    <motion.div
      initial={{ x: initialX, y: initialY, opacity: 0, scale: 0 }}
      animate={{ 
        y: [initialY, initialY - 150],
        x: initialX + Math.sin(i) * 50,
        opacity: [0, 0.4, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{ 
        duration: 8 + Math.random() * 10, 
        repeat: Infinity, 
        delay: i * 1.5,
        ease: "linear" 
      }}
      className="absolute flex flex-col items-center justify-center p-1"
    >
      <div 
        className="rounded-[40%] bg-blue-400/30 border border-white/20" 
        style={{ width: size, height: size }}
      >
        <div className="flex gap-1 justify-center mt-1">
          <div className="w-1 h-1 bg-white rounded-full opacity-60" />
          <div className="w-1 h-1 bg-white rounded-full opacity-60" />
        </div>
      </div>
    </motion.div>
  );
};

export default function AIBabyAvatar({ emotion = 'idle', onClick }) {
  return (
    <div className="relative w-96 h-96 flex items-center justify-center cursor-pointer group" onClick={onClick}>
      
      {/* ── Background Animation Aura ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-visible">
        {/* Pulsing Outer Ring */}
        <motion.div 
          animate={{ scale: [1, 1.8, 1], opacity: [0.03, 0.15, 0.03] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full border border-cyan-500/20 blur-[6px]"
        />
        
        {/* Floating Bubble-like Elements */}
        {[...Array(5)].map((_, i) => (
          <BackgroundElement key={`bubble-${i}`} i={i} />
        ))}

        {/* Floating Mini Babies (Requested: baby animation behind) */}
        {[...Array(8)].map((_, i) => (
          <MiniBaby key={`mini-${i}`} i={i} />
        ))}

        {/* Rotating Data HUD */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
          className="absolute -inset-16 rounded-full border-t border-b border-white/10 border-dashed"
        />
        
        {/* Glowing Nebula Cloud */}
        <div className="absolute inset-20 bg-cyan-600/10 rounded-full blur-[80px] animate-pulse" />
      </div>

      {/* ── Main AI Baby Body ── */}
      <motion.div
        variants={avatarVariants}
        animate={emotion}
        whileHover={{ scale: 1.05 }}
        className={`relative z-10 w-52 h-52 rounded-[42%] bg-gradient-to-tr shadow-[0_0_50px_rgba(0,100,255,0.3)] overflow-hidden flex flex-col items-center justify-center border-[4px] transition-colors duration-500
          ${emotion === 'happy' 
            ? 'from-amber-400 to-pink-500 border-white/40' 
            : 'from-blue-600 to-blue-950 border-white/20'}`}
      >
        {/* Holographic Gloss Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 pointer-events-none" />
        
        {/* Dynamic Eyes (Blinking Logic in variants) */}
        <div className="flex gap-10 mb-8 relative z-20">
          <motion.div variants={eyeVariants} animate={emotion} className="bg-white shadow-[0_0_25px_#fff] w-7" />
          <motion.div variants={eyeVariants} animate={emotion} className="bg-white shadow-[0_0_25px_#fff] w-7" />
        </div>

        {/* Dynamic Liquid Mouth */}
        <motion.div 
          animate={{ 
            height: emotion === 'speaking' ? [8, 24, 8] : (emotion === 'happy' ? 18 : 6),
            width: emotion === 'happy' ? 44 : 24,
            borderRadius: emotion === 'happy' ? '0 0 50px 50px' : '6px'
          }}
          transition={{ 
            repeat: emotion === 'speaking' ? Infinity : 0, 
            duration: 0.25,
            ease: "easeInOut"
          }}
          className="bg-white/95 relative z-20 shadow-[0_0_15px_rgba(255,255,255,0.6)]"
        />
        
        {/* Scanning Light Strip (Hologram Detail) */}
        <motion.div 
          animate={{ y: [-150, 300] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm"
        />
      </motion.div>

      {/* Interactive Sparkles on Hover */}
      <div className="absolute -inset-4 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
         <div className="absolute top-0 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" />
         <div className="absolute bottom-1/4 right-0 w-1 h-1 bg-cyan-400 rounded-full animate-ping delay-300" />
         <div className="absolute top-1/2 left-0 w-1 h-1 bg-pink-400 rounded-full animate-ping delay-700" />
      </div>
    </div>
  );
}
