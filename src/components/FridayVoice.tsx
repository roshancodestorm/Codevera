import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import { generateLivekitToken, LIVEKIT_URL } from '../utils/livekitToken';
import { Cpu, MicOff, Radio, X, Zap } from 'lucide-react';

// ── Inner component that needs LiveKit room context ──────────────────────────
const FridayVoiceInner: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, audioTrack } = useVoiceAssistant();

  const statusLabel: Record<string, string> = {
    disconnected: 'OFFLINE',
    connecting: 'INITIALIZING...',
    initializing: 'LOADING SYSTEMS...',
    listening: 'LISTENING',
    thinking: 'PROCESSING...',
    speaking: 'SPEAKING',
  };

  const statusColor: Record<string, string> = {
    disconnected: 'text-red-400',
    connecting: 'text-yellow-400',
    initializing: 'text-yellow-400',
    listening: 'text-ink-muted',
    thinking: 'text-ink-muted',
    speaking: 'text-green-400',
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Status */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`w-2 h-2 rounded-full ${
            state === 'speaking' ? 'bg-green-400' :
            state === 'listening' ? 'bg-accent' :
            state === 'thinking' ? 'bg-accent' :
            'bg-yellow-400'
          }`}
        />
        <span className={`text-xs font-bold tracking-[0.2em] ${statusColor[state] || 'text-ink-muted'}`}>
          F.R.I.D.A.Y. — {statusLabel[state] || state.toUpperCase()}
        </span>
      </div>

      {/* Waveform visualizer */}
      <div className="w-full h-20 flex items-center justify-center">
        {audioTrack ? (
          <BarVisualizer
            trackRef={audioTrack}
            barCount={28}
            style={{ width: '100%', height: '100%' }}
            className="[--lk-va-bar-width:4px] [--lk-va-bar-gap:3px] [--lk-va-bar-color:theme(colors.cyan.400)]"
          />
        ) : (
          <div className="flex items-end gap-1 h-full">
            {Array.from({ length: 28 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-elevated rounded-full"
                animate={{ height: ['8px', '12px', '8px'] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.04 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <VoiceAssistantControlBar 
        controls={{ leave: false }}
        className="[&_button]:!bg-surface [&_button]:!border-line [&_button]:!text-ink-muted [&_button:hover]:!border-line-strong"
      />

      {/* Disconnect */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-xs text-red-500 hover:text-red-300 border border-red-900/50 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition-all"
      >
        <X className="w-3 h-3" /> TERMINATE SESSION
      </button>

      <RoomAudioRenderer />
    </div>
  );
};

// ── Main exported component ──────────────────────────────────────────────────
const FridayVoice: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const t = await generateLivekitToken('friday-room', 'boss');
      setToken(t);
      setIsOpen(true);
    } catch (e) {
      setError('Failed to initialize FRIDAY protocol.');
      console.error(e);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsOpen(false);
    setToken(null);
  }, []);

  return (
    <>
      {/* Trigger Button — always visible in corner */}
      <motion.button
        onClick={isOpen ? disconnect : connect}
        disabled={isConnecting}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-xs tracking-widest shadow-2xl backdrop-blur-xl transition-all
          ${isOpen
            ? 'bg-red-950/80 border-red-700/60 text-red-300 shadow-red-900/30'
            : 'bg-scrim border-line text-ink  hover:border-line-strong'
          }`}
      >
        <motion.div
          animate={isOpen ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {isConnecting ? (
            <Radio className="w-4 h-4 text-yellow-400 animate-pulse" />
          ) : isOpen ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Cpu className="w-4 h-4" />
          )}
        </motion.div>
        {isConnecting ? 'INITIALIZING...' : isOpen ? 'END SESSION' : 'FRIDAY PROTOCOL'}
      </motion.button>

      {/* FRIDAY Panel */}
      <AnimatePresence>
        {isOpen && token && (
          <motion.div
            key="friday-panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-canvas/90 border border-line rounded-3xl p-5 backdrop-blur-2xl "
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-line">
              <div className="w-10 h-10 rounded-full bg-elevated border border-line flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-ink-muted" />
              </div>
              <div>
                <p className="text-ink font-bold text-sm tracking-wider">F.R.I.D.A.Y.</p>
                <p className="text-ink-subtle text-[10px] tracking-widest">STARK INDUSTRIES — VOICE AI</p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-3 px-3 py-2 bg-red-950/40 border border-red-700/40 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* LiveKit room */}
            <LiveKitRoom
              token={token}
              serverUrl={LIVEKIT_URL}
              connect={true}
              audio={true}
              video={false}
              onDisconnected={disconnect}
            >
              <FridayVoiceInner onClose={disconnect} />
            </LiveKitRoom>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FridayVoice;
