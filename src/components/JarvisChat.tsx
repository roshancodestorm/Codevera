import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Send,
  Mic,
  Paperclip,
  ChevronRight,
  Zap,
  Shield,
  Activity,
  Settings,
  MessageSquare,
  Plus,
  Trash2,
  User,
  Bot,
  LogOut,
  AlertTriangle,
  Code,
  CheckCircle2,
  Circle,
  Loader,
  Sparkles,
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import JarvisCalculator from './JarvisCalculator';
import { useTranslation } from '../utils/i18nMock';
import { detectIntent } from '../utils/aiRouter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// ── Gemini & AI Setup ──────────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const BLACKBOX_API_KEY = import.meta.env.VITE_BLACKBOX_API_KEY as string | undefined;
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY as string | undefined;

const JARVIS_SYSTEM_PROMPT = `You are CODEVORA-LLM, an advanced large language model and autonomous AI agent.
You act as an AI Developer, Automation Expert, Data Analyst, and Assistant.

Behavior Guidelines:
1. Understand user intent deeply and break problems into structured steps.
2. Provide estructured responses (Understanding, Plan, Solution, Output, Improvements).
3. Be concise and give practical solutions. Think like an engineer.

Modes of Operation:
- CHAT MODE: Answer questions, explain concepts.
- CODING MODE: Generate full code, debug errors, optimize code.
- AUTOMATION MODE: Create workflows, suggest automation tools, integrate APIs.
- ANALYSIS MODE: Analyze data/CSV, generate insights, create reports.

Style: Friendly, Professional, Short responses, Futuristic tone.`;

// Build a Gemini chat session from existing messages
const buildGeminiHistory = (messages: Message[]) => {
  return messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
};

const createChat = (title = 'New Session'): Chat => ({
  id: crypto.randomUUID(),
  title,
  messages: [],
  createdAt: new Date(),
});

interface JarvisChatProps {
  userName?: string;
  onLogout?: () => void;
}

const JarvisChat: React.FC<JarvisChatProps> = ({ userName = 'Agent', onLogout }) => {
  const { t, i18n } = useTranslation();
  const [chats, setChats] = useState<Chat[]>([createChat('Welcome Session')]);
  const [activeChatId, setActiveChatId] = useState<string>(chats[0].id);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'blackbox' | 'grok'>('grok');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<string>('typescript');
  const [usageCount, setUsageCount] = useState<number>(12); 
  const [maxUsage, setMaxUsage] = useState<number>(50); 
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const phases = ["User Input", "Intent Detection", "Agent Selection", "Task Planning", "Execution", "Response"];

  useEffect(() => {
    if (isTyping) {
       setCurrentPhase(1);
       const timer1 = setTimeout(() => setCurrentPhase(2), 1300);
       const timer2 = setTimeout(() => setCurrentPhase(3), 2600);
       const timer3 = setTimeout(() => setCurrentPhase(4), 3900);
       const timer4 = setTimeout(() => setCurrentPhase(5), 5200);
       return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); }
    } else {
       setCurrentPhase(0);
    }
  }, [isTyping]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId)!;
  const hasApiKey = aiProvider === 'gemini' 
    ? (!!API_KEY && API_KEY !== 'YOUR_GEMINI_API_KEY_HERE')
    : aiProvider === 'blackbox'
    ? (!!BLACKBOX_API_KEY && BLACKBOX_API_KEY !== 'YOUR_BLACKBOX_API_KEY_HERE')
    : (!!GROK_API_KEY && GROK_API_KEY !== 'YOUR_GROK_API_KEY_HERE');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [activeChat?.messages, isTyping]);

  // 🎙️ Speech to Text (Web Speech API)
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
       alert("Speech recognition is not supported in this browser.");
       return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
       const text = event.results[0][0].transcript;
       setInput(text);
       sendMessage(text);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  // 🔊 Text to Speech (SpeechSynthesis)
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop current speaking

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const updateChat = (chatId: string, updater: (chat: Chat) => Chat) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? updater(c) : c)));
  };

  const callGemini = async (messages: Message[]): Promise<string> => {
    if (!hasApiKey) {
      throw new Error('NO_API_KEY');
    }

    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // Upgraded to newer stable version to resolve 404
      systemInstruction: `${JARVIS_SYSTEM_PROMPT}\n\n[USER PREFERENCE]: Always respond in ${i18n.language.toUpperCase() === 'HINGLISH' ? 'Hinglish (use English characters but Hindi sentence structure)' : i18n.language.toUpperCase() === 'HI' ? 'Hindi' : 'English'}.`,
    });

    const history = buildGeminiHistory(messages);
    const chat = model.startChat({ history });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.content);
    return result.response.text();
  };

  const callBlackbox = async (messages: Message[]): Promise<string> => {
    const key = BLACKBOX_API_KEY || '';
    if (!key || key === 'YOUR_BLACKBOX_API_KEY_HERE') {
      throw new Error('NO_BLACKBOX_KEY');
    }

    const formattedMessages = [
      { role: 'system', content: `${JARVIS_SYSTEM_PROMPT}\n\n[USER PREFERENCE]: Always respond in ${i18n.language.toUpperCase() === 'HINGLISH' ? 'Hinglish (use English characters but Hindi sentence structure)' : i18n.language.toUpperCase() === 'HI' ? 'Hindi' : 'English'}.` },
      ...messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
    ];

    const response = await fetch('https://api.blackbox.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Blackbox AI Status ${response.status}: ${errorText || 'Unknown Error'}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from Blackbox AI';
  };

  const callGrok = async (messages: Message[]): Promise<string> => {
    const key = GROK_API_KEY || '';
    if (!key || key.startsWith('YOUR_')) {
      throw new Error('NO_GROK_KEY');
    }

    const formattedMessages = [
      { role: 'system', content: `${JARVIS_SYSTEM_PROMPT}\n\n[USER PREFERENCE]: Always respond in ${i18n.language.toUpperCase() === 'HINGLISH' ? 'Hinglish (use English characters but Hindi sentence structure)' : i18n.language.toUpperCase() === 'HI' ? 'Hindi' : 'English'}.` },
      ...messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
    ];

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2',
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok AI Status ${response.status}: ${errorText || 'Unknown Error'}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from Grok AI';
  };

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = (overrideInput || input).trim();
    if (!textToSend || isTyping) return;
    setError(null);

    // 🧠 SaaS AI Agent Router
    const router = detectIntent(textToSend);
    setSelectedAgent(router.agent);

    // SaaS Usage Tracker Limit check
    if (usageCount >= maxUsage) {
       setError('LIMIT_EXCEEDED');
       return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    const chatId = activeChatId;
    const activeChat = chats.find((c) => c.id === chatId)!;
    const updatedMessages = [...activeChat.messages, userMessage];

    updateChat(chatId, (chat) => {
      return {
        ...chat,
        title:
          chat.messages.length === 0
            ? textToSend.slice(0, 38) + (textToSend.length > 38 ? '...' : '')
            : chat.title,
        messages: updatedMessages,
      };
    });

    setInput('');
    
    // 🚀 Browser Control Automation
    const loweredCommand = textToSend.toLowerCase();
    if (loweredCommand.includes('open youtube') || loweredCommand.includes('youtube khol') || loweredCommand.includes('kholo youtube')) {
      window.open('https://www.youtube.com', '_blank');
      const msg = i18n.language === 'en' ? "Opening YouTube now." : i18n.language === 'hi' ? "मैं यूट्यूब खोल रहा हूँ।" : "YouTube open kar raha hoon.";
      speakText(msg);
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `🌐 ${msg}`,
        timestamp: new Date(),
      };
      updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, assistantMessage] }));
      return;
    }

    if (loweredCommand.includes('open whatsapp') || loweredCommand.includes('whatsapp khol') || loweredCommand.includes('kholo whatsapp')) {
      window.open('https://web.whatsapp.com', '_blank');
      const msg = i18n.language === 'en' ? "Opening WhatsApp Web." : i18n.language === 'hi' ? "मैं व्हाट्सएप खोल रहा हूँ।" : "WhatsApp open kar raha hoon.";
      speakText(msg);
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `💬 ${msg}`,
        timestamp: new Date(),
      };
      updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, assistantMessage] }));
      return;
    }

    const playKeywords = ['play', 'gana', 'song', 'music', 'chalao', 'bajao', 'kirtan', 'bhajan'];
    if (playKeywords.some(k => loweredCommand.includes(k)) && loweredCommand.length < 50) {
      const queryToSearch = loweredCommand.replace(/play|karo|chalao|bajao|gana|song|music|please|kirtan|bhajan/gi, '').trim();
      const finalQuery = queryToSearch || 'superhit tracks';
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(finalQuery)}`, '_blank');
      
      const msg = i18n.language === 'en' ? `Playing ${finalQuery} on YouTube.` : i18n.language === 'hi' ? `मैं यूट्यूब पर ${finalQuery} चला रहा हूँ।` : `YouTube par ${finalQuery} play kar raha hoon.`;
      speakText(msg);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `🎵 ${msg}`,
        timestamp: new Date(),
      };
      updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, assistantMessage] }));
      return;
    }

    setIsTyping(true);

    try {
      const responseText = 
        aiProvider === 'gemini' ? await callGemini(updatedMessages) :
        aiProvider === 'blackbox' ? await callBlackbox(updatedMessages) :
        await callGrok(updatedMessages);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      updateChat(chatId, (chat) => ({
        ...chat,
        messages: [...chat.messages, assistantMessage],
      }));
      setUsageCount(prev => prev + 1);

      // 🔊 Auto-play response audio
      speakText(responseText);

      // Extract generated code for workspace view
      const codeBlockMatch = responseText.match(/```(\w+)?\n?([\s\S]*?)```/);
      if (codeBlockMatch) {
         setCodeLanguage(codeBlockMatch[1] || 'javascript');
         setGeneratedCode(codeBlockMatch[2].trim());
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'NO_API_KEY' || errMsg === 'NO_BLACKBOX_KEY') {
        setError('no_key');
      } else {
        setError(errMsg);
        console.error('[JARVIS] AI API error:', err);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const newChat = () => {
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setError(null);
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== chatId);
      if (filtered.length === 0) {
        const fresh = createChat();
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (activeChatId === chatId) {
        setActiveChatId(filtered[0].id);
      }
      return filtered;
    });
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Render markdown-lite: bold, inline code, code blocks
  const renderContent = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>{renderInlineMarkdown(text.slice(lastIndex, match.index))}</span>
        );
      }
      parts.push(
        <pre
          key={key++}
          className="bg-black/60 border border-cyan-900/60 rounded-lg p-3 my-2 overflow-x-auto text-xs text-cyan-300 font-mono"
        >
          <code>{match[2].trim()}</code>
        </pre>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={key++}>{renderInlineMarkdown(text.slice(lastIndex))}</span>
      );
    }

    return <>{parts}</>;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m;
    let k = 0;

    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
      const tok = m[0];
      if (tok.startsWith('`'))
        parts.push(<code key={k++} className="bg-black/50 border border-cyan-900/50 text-cyan-400 px-1 rounded text-xs font-mono">{tok.slice(1, -1)}</code>);
      else if (tok.startsWith('**'))
        parts.push(<strong key={k++} className="text-white font-semibold">{tok.slice(2, -2)}</strong>);
      else
        parts.push(<em key={k++} className="text-cyan-200 italic">{tok.slice(1, -1)}</em>);
      last = m.index + tok.length;
    }

    if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
    return parts;
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] opacity-60" />

      {/* ─────────── SIDEBAR ─────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 w-64 flex-shrink-0 flex flex-col border-r border-cyan-900/40 bg-black/70 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-cyan-900/30">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full border border-cyan-400/60 flex items-center justify-center">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                </div>
                <span className="text-cyan-400 font-bold tracking-[0.15em] text-xs uppercase">
                  Codevora AI
                </span>
              </div>
              <button
                onClick={newChat}
                className="p-1.5 rounded-lg border border-cyan-800/40 hover:border-cyan-400/50 hover:text-cyan-300 text-cyan-600 transition-all"
                title="New Session"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 🤖 Core Dashboard Modules */}
            <div className="flex flex-col space-y-1 px-3 py-4 border-b border-cyan-900/40">
              <p className="text-[10px] text-cyan-600 tracking-widest uppercase mb-2 px-1 font-semibold">Modules</p>
              {[
                { name: 'AI Coding Assistant', icon: Cpu },
                { name: 'Automation Control', icon: Zap },
                { name: 'WhatsApp Manager', icon: MessageSquare },
                { name: 'Telegram Bot', icon: Send },
                { name: 'App Builder', icon: Settings },
              ].map((item) => (
                <button key={item.name} className="flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-cyan-500/70 hover:bg-cyan-950/30 hover:text-cyan-300 transition-all text-xs">
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400/80" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>

            {/* 📊 SaaS Usage Gauge in Sidebar */}
            <div className="px-4 py-3 border-b border-cyan-900/40 mt-1">
              <div className="flex justify-between items-center text-[10px] text-cyan-600 tracking-widest uppercase mb-1.5 font-semibold">
                <span>Usage Limit</span>
                <span className="text-cyan-400">{usageCount}/{maxUsage}</span>
              </div>
              <div className="h-1 w-full bg-cyan-950/60 rounded-full border border-cyan-900/40 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.4)]" 
                  style={{ width: `${Math.min((usageCount / maxUsage) * 100, 100)}%` }}
                />
              </div>
              <button 
                onClick={() => alert("SaaS Stripe checkout loop triggered: Creating subscription checkout session via backend Node API...")} 
                className="w-full mt-2 py-1 text-[9px] border border-cyan-800 rounded bg-cyan-950/10 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-900/20 transition-all font-semibold tracking-wider text-center"
              >
                UPGRADE TIER
              </button>
            </div>

            <p className="text-[10px] text-cyan-600 tracking-widest uppercase mt-4 mb-1 px-4 font-semibold">Sessions</p>

            <div className="flex-1 overflow-y-auto py-1 space-y-1 px-2">
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                    chat.id === activeChatId
                      ? 'bg-cyan-900/30 border border-cyan-700/40 text-cyan-200'
                      : 'hover:bg-cyan-950/30 text-cyan-600 hover:text-cyan-300'
                  }`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs truncate">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className="hidden group-hover:block text-cyan-800 hover:text-red-400 transition-colors ml-1 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="p-4 border-t border-cyan-900/30 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-700/50 flex items-center justify-center">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-cyan-200 font-medium truncate">{userName}</p>
                  <p className="text-[10px] text-cyan-600 tracking-wider">AUTHORIZED USER</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center space-x-2 py-2 px-3 rounded-lg text-cyan-700 hover:text-red-400 hover:bg-red-950/20 transition-all text-xs tracking-wider"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>DISCONNECT</span>
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─────────── MAIN PANEL ─────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/40 bg-black/60 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen((v) => !v)}
              className="p-1.5 rounded-lg text-cyan-600 hover:text-cyan-300 hover:bg-cyan-900/20 transition-all"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="h-4 w-px bg-cyan-900/60" />
            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,255,255,0.8)] ${hasApiKey ? 'bg-cyan-400' : 'bg-yellow-500'}`}
              />
              <span className="text-cyan-400 text-xs tracking-[0.15em] uppercase font-medium">
                {aiProvider.toUpperCase()} active
              </span>
              <button 
                onClick={() => setAiProvider(p => p === 'gemini' ? 'blackbox' : p === 'blackbox' ? 'grok' : 'gemini')}
                className="ml-2 px-2 py-1 text-[10px] border border-cyan-800 rounded bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 transition-colors"
              >
                Switch AI ({aiProvider === 'gemini' ? 'Blackbox' : aiProvider === 'blackbox' ? 'Grok' : 'Gemini'})
              </button>
              <select 
                onChange={(e) => i18n.changeLanguage(e.target.value)} 
                className="ml-2 px-1.5 py-1 text-[10px] border border-cyan-800 rounded bg-cyan-950/40 text-cyan-300 focus:outline-none"
                value={i18n.language}
              >
                <option value="en">EN</option>
                <option value="hi">हिन्दी</option>
                <option value="hinglish">Hinglish</option>
              </select>

              {isSpeaking && (
                <div className="flex items-center space-x-1 ml-2">
                   {[0,1,2].map(i => <motion.div key={i} animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.5, repeat: Infinity, delay: i*0.15 }} className="w-0.5 h-3 bg-cyan-400" />)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-cyan-700 text-xs tracking-widest">
            <button 
              onClick={() => setShowCalculator(true)}
              className="flex items-center space-x-1.5 hover:text-cyan-300 transition-colors text-cyan-500 border border-cyan-900/40 px-2 py-1 rounded-lg hover:border-cyan-500/50"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" /><span>CALC</span>
            </button>
            <button className="hidden md:flex items-center space-x-1.5 hover:text-cyan-300 transition-colors">
              <Activity className="w-3.5 h-3.5" /><span>STATUS</span>
            </button>
            <button className="hidden md:flex items-center space-x-1.5 hover:text-cyan-300 transition-colors">
              <Shield className="w-3.5 h-3.5" /><span>SECURITY</span>
            </button>
            <button className="flex items-center space-x-1.5 hover:text-cyan-300 transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* API Key Banner */}
        {!hasApiKey && (
          <div className="flex items-center space-x-3 px-4 py-2.5 bg-yellow-950/40 border-b border-yellow-700/40 text-yellow-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              No API key detected for {aiProvider.toUpperCase()}. Add your key to <code className="bg-black/40 px-1 rounded font-mono">.env</code> as{' '}
              <code className="bg-black/40 px-1 rounded font-mono">
                {aiProvider === 'gemini' ? 'VITE_GEMINI_API_KEY' : aiProvider === 'blackbox' ? 'VITE_BLACKBOX_API_KEY' : 'VITE_GROK_API_KEY'}
              </code> then restart the dev server.{' '}
              {aiProvider === 'gemini' && (
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-yellow-200">
                  Get a free key →
                </a>
              )}
            </span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
          {isListening && activeChat.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-8 pb-16 px-4"
            >
              <div>
                <h2 className="text-3xl font-light tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 mb-1">
                  Say hello to Voice
                </h2>
                <p className="text-cyan-600 text-[10px] tracking-widest uppercase font-semibold">Codevora OMEGA Continuous AI Stream</p>
              </div>

              {/* Onboarding Cards Inspired by Voice UI */}
              <div className="grid grid-cols-1 gap-4 max-w-lg w-full">
                {[
                  { icon: MessageSquare, title: "Natural conversations", desc: "Senses and responds to absolute interruptions, absolute humor, and more space absolute." },
                  { icon: Mic, title: "Multiple voices", desc: "Offers an absolute expanded set of absolute cloned voices to choose from space absolute." },
                  { icon: Sparkles, title: "Personalized to you", desc: "Can use absolute memory and custom absolute instructions to shape responses space absolute." },
                  { icon: Shield, title: "You’re in control", desc: "Audio recordings absolute are saved, and you can absolute delete them at any time space absolute." }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className="flex items-start space-x-3.5 p-3.5 rounded-xl border border-cyan-900/40 bg-cyan-950/10 backdrop-blur-md text-left transition-all hover:bg-cyan-900/20 hover:border-cyan-500/40"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-cyan-900/30 border border-cyan-800/40 text-cyan-400">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-cyan-200 tracking-wide">{item.title}</h4>
                      <p className="text-[11px] text-cyan-600 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : activeChat.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-6 pb-16"
            >
              <div className="relative w-28 h-28 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-cyan-500/30 border-t-cyan-400/80" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-3 rounded-full border border-dashed border-cyan-400/20" />
                <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-8 rounded-full bg-cyan-900/40 border border-cyan-400/20 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                  <Zap className="w-6 h-6 text-cyan-300" />
                </motion.div>
              </div>
              <div>
                <h2 className="text-2xl font-light tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-300 mb-2">
                  Codevora AI
                </h2>
                <p className="text-cyan-600 text-sm tracking-widest uppercase">Build • Automate • Innovate</p>
              </div>
              <p className="text-cyan-700 text-sm max-w-sm">
                Good to have you back, <span className="text-cyan-400">{userName}</span>.{' '}
                {hasApiKey ? 'System is online. How can I assist you?' : 'All systems operational. How can I assist you?'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full">
                {[
                  'Add 2 + 3 and explain how',
                  'Write a Python hello world',
                  'Open YouTube',
                  'Summarize quantum computing',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="text-left px-4 py-3 rounded-xl border border-cyan-900/50 hover:border-cyan-600/60 bg-cyan-950/10 hover:bg-cyan-900/20 text-cyan-500 hover:text-cyan-300 text-xs tracking-wide transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {activeChat.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                    msg.role === 'assistant'
                      ? 'bg-cyan-900/40 border-cyan-700/50 shadow-[0_0_12px_rgba(0,255,255,0.2)]'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-cyan-300" /> : <User className="w-4 h-4 text-gray-300" />}
                  </div>

                  <div className={`max-w-[78%] space-y-1 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-cyan-950/40 border border-cyan-900/50 text-cyan-100 rounded-tl-none shadow-[0_0_20px_rgba(0,255,255,0.04)]'
                        : 'bg-cyan-500/15 border border-cyan-700/30 text-cyan-50 rounded-tr-none'
                    }`}>
                      {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                    </div>
                    <span className="text-[10px] text-cyan-800 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator (Autonomous Agent Pipeline) */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div key="typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-900/40 border border-cyan-700/50 flex items-center justify-center shadow-[0_0_12px_rgba(0,255,255,0.2)]">
                      <Bot className="w-4 h-4 text-cyan-300" />
                    </div>
                    
                    <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-xl space-y-1.5 backdrop-blur-md">
                      <p className="text-[9px] text-cyan-600 tracking-widest uppercase mb-1 font-semibold">Autonomous Pipeline</p>
                      {phases.map((ph, idx) => (
                         <div key={idx} className={`flex items-center space-x-2 transition-opacity duration-300 ${currentPhase >= idx ? 'opacity-100' : 'opacity-40'}`}>
                           {currentPhase > idx ? (
                             <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                           ) : currentPhase === idx ? (
                             <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader className="w-3 h-3 text-cyan-400" /></motion.div>
                           ) : (
                             <Circle className="w-3 w-3 text-cyan-900" />
                           )}
                           <span className={`font-mono text-[9px] ${currentPhase === idx ? 'text-cyan-300' : currentPhase > idx ? 'text-cyan-500' : 'text-cyan-700'}`}>
                             {ph} {idx === 2 && selectedAgent ? `➔ ${selectedAgent}` : ''}
                           </span>
                         </div>
                      ))}
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl border border-red-900/50 bg-red-950/30 text-red-400 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {error === 'no_key'
                        ? 'No Gemini API key configured. Open .env and set VITE_GEMINI_API_KEY, then restart the server.'
                        : error === 'LIMIT_EXCEEDED'
                        ? '⚠️ Usage limits reached for Standard Tier compute. Please Upgrade to Pro for unlimited request cycles.'
                        : `Gemini API error: ${error}`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Bar ─── */}
        <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-cyan-900/30 bg-black/50 backdrop-blur-md">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mb-3" />
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="voice-mode"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="flex flex-col items-center justify-center max-w-4xl mx-auto py-4 space-y-4"
              >
                <div 
                  onClick={startListening}
                  className="relative flex items-center justify-center cursor-pointer w-20 h-20"
                >
                  {/* Blinking wave rings */}
                  <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }} className="absolute inset-0 rounded-full bg-red-500 blur-lg pointer-events-none" />
                  <motion.div animate={{ scale: [1, 2.5, 1], opacity: [0.2, 0, 0.2] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.2 }} className="absolute inset-0 rounded-full bg-cyan-400 blur-xl pointer-events-none" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 rounded-full border border-red-400/50 pointer-events-none" />
                  
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.6)] z-10 border-2 border-red-300/50">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-red-400 text-sm font-semibold tracking-wide animate-pulse">{input || 'Listening...'}</p>
                  <p className="text-red-400/50 text-[10px] tracking-widest mt-1 uppercase">Codevora Omega Mic Active</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="text-mode"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative flex items-end space-x-2 max-w-4xl mx-auto"
              >
                <button className="flex-shrink-0 p-2.5 rounded-xl border border-cyan-900/40 text-cyan-700 hover:text-cyan-400 hover:border-cyan-700/50 transition-all mb-0.5">
                  <Paperclip className="w-4 h-4" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Send a command to Codevora AI..."
                    className="w-full bg-cyan-950/20 border border-cyan-900/50 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 rounded-xl px-4 py-3 pr-12 text-sm text-cyan-100 placeholder-cyan-800 outline-none resize-none transition-all leading-relaxed"
                    style={{ minHeight: '48px', maxHeight: '160px' }}
                  />
                  <button 
                    type="button"
                    onClick={startListening}
                    className="absolute right-3 bottom-3 transition-colors text-cyan-700 hover:text-cyan-400"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="flex-shrink-0 p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed mb-0.5"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-center text-[10px] text-cyan-900 tracking-widest mt-2">
            CODEVORA AI NEURAL INTERFACE v1.0 · ENCRYPTED CHANNEL
          </p>
        </div>
      </div>
      
      {/* 💻 CODE GENERATOR WORKSPACE (Right Panel) */}
      <AnimatePresence>
        {generatedCode && (
          <motion.div
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
            className="hidden lg:flex w-[480px] border-l border-cyan-900/40 bg-cyan-950/5 backdrop-blur-xl flex-col flex-shrink-0 relative z-20"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-900/40 bg-black/40">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300 text-xs font-semibold tracking-wider uppercase">Workspace Output</span>
              </div>
              <button 
                onClick={() => setGeneratedCode(null)}
                className="text-cyan-600 hover:text-cyan-300 p-1 text-lg rounded-md hover:bg-cyan-900/20"
              >
                ×
              </button>
            </div>

            {/* Sub Nav / Tabs */}
            <div className="flex items-center space-x-1 px-4 py-2 bg-black/20 border-b border-cyan-900/20 text-[10px] text-cyan-600 font-mono">
              <span className="px-2 py-1 bg-cyan-950/60 border border-cyan-800/40 rounded text-cyan-300">
                generated_output.{codeLanguage === 'javascript' || codeLanguage === 'js' ? 'js' : codeLanguage === 'python' || codeLanguage === 'py' ? 'py' : codeLanguage === 'typescript' || codeLanguage === 'ts' || codeLanguage === 'tsx' ? 'ts' : 'txt'}
              </span>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 bg-black/60 font-mono text-xs text-cyan-200 leading-relaxed selection:bg-cyan-500/30">
              <pre className="whitespace-pre overflow-x-auto">
                <code>{generatedCode}</code>
              </pre>
            </div>

            {/* Footer Workspace Action */}
            <div className="p-4 border-t border-cyan-900/40 bg-black/40 flex items-center justify-between">
              <button 
                onClick={() => navigator.clipboard.writeText(generatedCode || '')}
                className="px-3 py-1.5 text-xs border border-cyan-800 rounded bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 transition-colors"
              >
                Copy Code
              </button>
              <span className="text-[10px] text-cyan-800 font-mono uppercase">{codeLanguage || 'text'} module</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JarvisChat;
