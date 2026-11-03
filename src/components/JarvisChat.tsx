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
  Database,
  Globe,
  Lock,
  ExternalLink,
  Power,
  ShieldCheck,
  X,
  Loader2,
  FileText,
  Upload,
  Monitor,
  Gamepad2,
  Wrench,
  Sun,
  Moon
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pptxgen from 'pptxgenjs';
import { useTheme } from '../utils/theme';
import JSZip from 'jszip';
import NeuralPptStudio from './ppt/NeuralPptStudio';
import Orb from './Orb';
import AICodingIDE from './ide/AICodingIDE';
import ModelHub from './ide/ModelHub';
import type { PptData } from '../types/ppt';
import { useTranslation } from '../utils/i18nMock';
import { detectIntent } from '../utils/aiRouter';
import { uuid } from '../utils/uuid';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface CustomModel {
  id: string;
  provider: string;
  modelId: string;
  displayName: string;
  apiKey: string;
  protocol: string;
  baseUrl: string;
  isActive: boolean;
  isTested: boolean;
}

interface ExternalPlatform {
  name: string;
  url: string;
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
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) || 'qwen2.5-coder:1.5b';

const CHAT_SYSTEM_PROMPT = `You are Codevora AI, a high-performance coding and productivity assistant.
When the user asks for code, a dashboard, or an app, you MUST provide the FULL, COMPLETE, and RUNNABLE code. 
NEVER omit any part of the code. NEVER use placeholders like "// ... rest of the code".
Always include all necessary HTML structure, CSS styling (inside <style> tags), and JavaScript logic.
Prioritize completeness and visual excellence. Ensure the code is syntactically valid and ready to run.`;

const isSimpleGreeting = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  return /^(hi|hii|hello|hey|namaste|namaskar|helo|hy|hola|good morning|good afternoon|good evening)$/.test(normalized);
};

const greetingReply = (language: string) => {
  if (language === 'hi') return 'Namaste! Main aapki kaise madad kar sakta hoon?';
  if (language === 'hinglish') return 'Hello! Main aapki kaise help kar sakta hoon?';
  return 'Hello! How can I help you today?';
};


// Build a Gemini chat session from existing messages
const buildGeminiHistory = (messages: Message[]) => {
  return messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
};

const createChat = (title = 'New Session'): Chat => ({
  id: uuid(),
  title,
  messages: [],
  createdAt: new Date(),
});

const BUILD_TOOLS = [
  { name: 'WhatsApp Manager', icon: MessageSquare },
  { name: 'Telegram Bot', icon: Send },
  { name: 'App Builder', icon: Settings },
  { name: 'PPT Generator', icon: FileText },
  { name: 'Model Hub', icon: Database },
  { name: 'Model and API', icon: Globe },
  { name: 'Studio', icon: Monitor },
  { name: 'gamebuilder', icon: Gamepad2 },
];

const USER_MENU: { section: string; items: { label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  { section: 'Account', items: [
    { label: 'Profile', icon: User },
    { label: 'Security', icon: Shield },
    { label: 'Memory', icon: Cpu },
  ] },
  { section: 'Billing', items: [
    { label: 'Subscription', icon: Sparkles },
    { label: 'Billing', icon: FileText },
    { label: 'Usage', icon: Activity },
  ] },
  { section: 'Integrations', items: [
    { label: 'Connectors', icon: Globe },
    { label: 'MCP (Beta)', icon: Code },
    { label: 'Custom Tools', icon: Wrench },
  ] },
  { section: 'Privacy', items: [
    { label: 'File retention', icon: Lock },
    { label: 'Delete account', icon: Trash2 },
  ] },
];

const COLOR_MODES: { value: 'light' | 'system' | 'dark'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
];

interface JarvisChatProps {
  userName?: string;
  userAvatar?: string | null;
  onLogout?: () => void;
}

const JarvisChat: React.FC<JarvisChatProps> = ({ userName = 'Agent', userAvatar, onLogout }) => {
  const { t, i18n } = useTranslation();
  const [chats, setChats] = useState<Chat[]>([createChat('Welcome Session')]);
  const [activeChatId, setActiveChatId] = useState<string>(chats[0].id);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'blackbox' | 'grok' | 'ollama' | 'coding'>('coding');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<string>('typescript');
  const [usageCount, setUsageCount] = useState<number>(12); 
  const [maxUsage, setMaxUsage] = useState<number>(50); 
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showModelManager, setShowModelManager] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customModels, setCustomModels] = useState<CustomModel[]>([
    {
      id: '14c4fda1-379a-4a72-ab63-b0b8b22a2cdf',
      provider: 'Custom',
      modelId: 'moonshotai/kimi-k2.5',
      displayName: 'kimi-k2.5',
      apiKey: '',
      protocol: 'OpenAI',
      baseUrl: 'https://api.aicredits.in/v1',
      isActive: false,
      isTested: true
    },
    {
      id: 'ollama-qwen2-5-coder-3b',
      provider: 'Ollama',
      modelId: 'qwen2.5-coder:3b',
      displayName: 'Ollama: qwen2.5-coder:3b',
      apiKey: '',
      protocol: 'OpenAI',
      baseUrl: 'http://localhost:11434/v1',
      isActive: false,
      isTested: true
    }
  ]);
  const [newModel, setNewModel] = useState<Partial<CustomModel>>({
    provider: 'Ollama',
    modelId: '',
    displayName: '',
    apiKey: '',
    protocol: 'OpenAI',
    baseUrl: 'http://localhost:11434/v1',
  });

  const [localModels, setLocalModels] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const [externalPlatform, setExternalPlatform] = useState<ExternalPlatform | null>(null);
  const [showPptStudio, setShowPptStudio] = useState(false);
  const [pptStudioData, setPptStudioData] = useState<PptData | null>(null);

  const scanLocalModels = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('http://localhost:5000/api/models/sync-ollama', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // Fetch all models to update the dropdown
        const modelsRes = await fetch('http://localhost:5000/api/models');
        const models = await modelsRes.json();
        const ollamaModels = models.filter((m: any) => m.provider === 'Ollama').map((m: any) => m.model_id);
        setLocalModels(ollamaModels);
        alert(`Successfully synced ${data.total} models!`);
      }
    } catch (err) {
      alert("Failed to sync local models. Make sure Ollama is running.");
    } finally {
      setIsScanning(false);
    }
  };

  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showAppBuilder, setShowAppBuilder] = useState(false);
  const [showTelegramBot, setShowTelegramBot] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramAdminId, setTelegramAdminId] = useState('');
  const [telegramModelId, setTelegramModelId] = useState('default');
  const [isTelegramBotRunning, setIsTelegramBotRunning] = useState(false);
  const [appBuilderCode, setAppBuilderCode] = useState<string>('');
  const [appBuilderPrompt, setAppBuilderPrompt] = useState<string>('');
  const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);
  const [showAutomationControl, setShowAutomationControl] = useState(false);
  const [showPptGenerator, setShowPptGenerator] = useState(false);
  const [showAICodingIDE, setShowAICodingIDE] = useState(false);
  const [showModelHub, setShowModelHub] = useState(false);
  const [showBuildPage, setShowBuildPage] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [storedUser] = useState<{ name?: string; email?: string } | null>(() => {
    try {
      const raw = localStorage.getItem('neural-ide-auth');
      if (raw) return JSON.parse(raw)?.user ?? null;
    } catch {
      /* ignore */
    }
    return null;
  });
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [userAvatar]);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useTheme();

  const [showSecurity, setShowSecurity] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleUpdatePassword = () => {
    if (!newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Please fill in both password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    setPasswordMsg({ type: 'ok', text: 'Password updated successfully.' });
    setNewPassword('');
    setConfirmPassword('');
  };
  const [pptTopic, setPptTopic] = useState('');
  const [pptSlideCount, setPptSlideCount] = useState('5');
  const [isGeneratingPpt, setIsGeneratingPpt] = useState(false);
  const [isReviewingPpt, setIsReviewingPpt] = useState(false);
  const [pptReviewData, setPptReviewData] = useState<string | null>(null);
  const [isCanvaConnected, setIsCanvaConnected] = useState(false);
  const [canvaApi, setCanvaApi] = useState<any>(null);
  const canvaLoadedRef = useRef(false);
  const [automationChannel, setAutomationChannel] = useState('Email');
  const [automationTarget, setAutomationTarget] = useState('');
  const [automationContent, setAutomationContent] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [whatsappQrCode, setWhatsappQrCode] = useState<string | null>(null);
  const [isWhatsappConnected, setIsWhatsappConnected] = useState(false);
  const [whatsappContacts, setWhatsappContacts] = useState<any[]>([]);
  const [selectedWhatsappNumber, setSelectedWhatsappNumber] = useState<string | null>(null);
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [whatsappSearch, setWhatsappSearch] = useState('');
  const [isAutoReplyEnabled, setIsAutoReplyEnabled] = useState(false);
  const [isForging, setIsForging] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔄 Persistence: Fetch models from PostgreSQL on Load
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/models');
        if (response.ok) {
          const data = await response.json();
          const mappedModels: CustomModel[] = data.map((m: any) => ({
            id: m.id,
            displayName: m.name,
            provider: m.provider,
            modelId: m.model_id,
            baseUrl: m.base_url,
            apiKey: m.api_key,
            protocol: m.api_protocol,
            isActive: m.is_active,
            isTested: true
          }));
          setCustomModels(mappedModels);
        }
      } catch (err) {
        console.error('Failed to fetch models from DB:', err);
      }
    };
    fetchModels();
  }, []);

  // 🔄 Check Canva Connection Status
  useEffect(() => {
    const checkCanva = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/canva/status');
        if (res.ok) {
          const data = await res.json();
          setIsCanvaConnected(data.connected);
        }
      } catch (e) {
        console.error("Canva status check failed:", e);
      }
    };

    if (showPptGenerator) {
      checkCanva();
      
      // Re-check when window gains focus (user comes back from OAuth tab)
      const handleFocus = () => {
        console.log("Window focused, checking Canva status...");
        checkCanva();
      };
      window.addEventListener('focus', handleFocus);
      
      // Also poll every 4 seconds while in PPT generator and NOT connected
      const interval = setInterval(() => {
        if (!isCanvaConnected) checkCanva();
      }, 4000);

      return () => {
        window.removeEventListener('focus', handleFocus);
        clearInterval(interval);
      };
    }
  }, [showPptGenerator, isCanvaConnected]);

  // 🔄 Persistence: Fetch App Projects from PostgreSQL on Load
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (err) {
        console.error('Failed to fetch projects from DB:', err);
      }
    };
    fetchProjects();
  }, []);

  // 🔄 Persistence: Fetch Chats from PostgreSQL on Load
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/chats');
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const mappedChats: Chat[] = data.map((c: any) => ({
              id: c.id,
              title: c.title,
              messages: [], // Will load on select
              createdAt: new Date(c.created_at)
            }));
            setChats(mappedChats);
            setActiveChatId(mappedChats[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chats:', err);
      }
    };
    fetchChats();
  }, []);

  // 🔄 Persistence: Fetch Messages for Active Chat
  useEffect(() => {
    if (!activeChatId) return;
    const fetchMessages = async () => {
      const currentChat = chats.find(c => c.id === activeChatId);
      if (currentChat && currentChat.messages.length > 0) return; // Already loaded

      try {
        const response = await fetch(`http://localhost:5000/api/chats/${activeChatId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const mappedMsgs: Message[] = data.map((m: any) => ({
            id: m.id.toString(),
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp)
          }));
          
          setChats(prev => prev.map(c => 
            c.id === activeChatId ? { ...c, messages: mappedMsgs } : c
          ));
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };
    fetchMessages();
  }, [activeChatId]);

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
    : aiProvider === 'grok'
    ? (!!GROK_API_KEY && GROK_API_KEY !== 'YOUR_GROK_API_KEY_HERE')
    : true;

  const activeModel = customModels.find(m => m.isActive);

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
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
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

    const formattedMessages = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

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

    const formattedMessages = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

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

  const callOllama = async (messages: Message[]): Promise<string> => {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || 'No response from Ollama';
    } catch {
      throw new Error('OLLAMA_OFFLINE');
    }
  };

  const callViteModelProxy = async (
    model: CustomModel,
    messages: Array<{ role: string; content: string }>,
    maxTokens = 8192
  ): Promise<string> => {
    const response = await fetch('/api/model-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: {
          baseUrl: model.baseUrl,
          apiKey: model.apiKey,
          modelId: model.modelId,
        },
        messages,
        maxTokens,
      }),
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {}

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || text || `Vite model proxy error: ${response.status}`);
    }

    return data.content || '';
  };

  const callCustomModel = async (model: CustomModel, messages: Message[], onChunk?: (chunk: string) => void): Promise<string> => {
    try {
      // 🚀 Use Neural Proxy to bypass CORS and resolve network connectivity issues
      const modelMessages = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ];

      let response: Response;
      try {
        response = await fetch('http://localhost:5000/api/proxy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: model.baseUrl,
          apiKey: model.apiKey,
          modelId: model.modelId,
          messages: modelMessages,
          stream: true,
          max_tokens: 16384,
          temperature: 0.2,
        })
        });
      } catch {
        const content = await callViteModelProxy(model, modelMessages, 8192);
        if (content && onChunk) onChunk(content);
        return content || 'No response from custom model';
      }

      if (!response.ok) {
        const errorText = await response.text();
        let message = errorText || 'Unknown Error';

        try {
          const parsed = JSON.parse(errorText);
          message = parsed.error || parsed.message || message;
        } catch {}

        throw new Error(`Neural Proxy Error (${response.status}): ${message}`);
      }

      if (onChunk) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/event-stream')) {
          const responseText = await response.text();
          let content = responseText;

          try {
            const json = JSON.parse(responseText);
            content =
              json.choices?.[0]?.message?.content ??
              json.choices?.[0]?.delta?.content ??
              json.message?.content ??
              json.response ??
              responseText;
          } catch {}

          if (content) onChunk(content);
          return content;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No reader');
        
        let fullText = '';
        let buffer = '';
        let streamDone = false;

        const parseStreamLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) return;

          const data = trimmed.slice(5).trim();
          if (!data) return;
          if (data === '[DONE]') {
            streamDone = true;
            return;
          }

          try {
            const json = JSON.parse(data);
            const content =
              json.choices?.[0]?.delta?.content ??
              json.choices?.[0]?.message?.content ??
              json.message?.content ??
              '';

            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {}
        };

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          for (const line of lines) parseStreamLine(line);
          if (done || streamDone) break;
        }

        if (buffer.trim()) parseStreamLine(buffer);
        return fullText;
      } else {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No response from custom model';
      }
    } catch (err) {
      console.error('Custom model error:', err);
      throw new Error(`Custom model failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const callCodingAssistant = async (messages: Message[], onChunk: (chunk: string) => void): Promise<void> => {
    if (activeModel) {
      await callCustomModel(activeModel, messages, onChunk);
      return;
    }

    throw new Error('NO_ACTIVE_MODEL');
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
      id: uuid(),
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

    // 💾 Save User Message to DB
    fetch('http://localhost:5000/api/messages', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ chatId, role: 'user', content: textToSend })
    });

    setInput('');

    if (isSimpleGreeting(textToSend)) {
      const reply = greetingReply(i18n.language);
      const assistantMessage: Message = {
        id: uuid(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, assistantMessage] }));
      setUsageCount((prev) => prev + 1);
      speakText(reply);

      fetch('http://localhost:5000/api/messages', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ chatId, role: 'assistant', content: reply })
      });
      return;
    }
    
    // 🚀 Browser Control Automation
    const loweredCommand = textToSend.toLowerCase();
    if (loweredCommand.includes('open youtube') || loweredCommand.includes('youtube khol') || loweredCommand.includes('kholo youtube')) {
      window.open('https://www.youtube.com', '_blank');
      const msg = i18n.language === 'en' ? "Opening YouTube now." : i18n.language === 'hi' ? "मैं यूट्यूब खोल रहा हूँ।" : "YouTube open kar raha hoon.";
      speakText(msg);
      
      const assistantMessage: Message = {
        id: uuid(),
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
        id: uuid(),
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
        id: uuid(),
        role: 'assistant',
        content: `🎵 ${msg}`,
        timestamp: new Date(),
      };
      updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, assistantMessage] }));
      return;
    }

    // 🎨 Canva AI PPT Generation (Claude-style)
    const hasPptKeyword = loweredCommand.includes('ppt') || loweredCommand.includes('presentation') || loweredCommand.includes('slides');
    const hasCreateKeyword = loweredCommand.includes('make') || loweredCommand.includes('create') || loweredCommand.includes('generate') || loweredCommand.includes('build');
    const hasCanvaKeyword = loweredCommand.includes('canva');

    if (isCanvaConnected && hasCanvaKeyword && (hasPptKeyword || hasCreateKeyword)) {
      setIsTyping(true);
      const title = loweredCommand.replace(/make|create|generate|build|a|ppt|on|canva|presentation|in|slides/gi, '').trim() || 'Neural Presentation';
      
      const design = await createCanvaPresentation(title);
      setIsTyping(false);

      if (design) {
        const msg = i18n.language === 'en' ? `I've initialized your Canva presentation: "${title}". Click the button below to start designing!` : `Maine aapki Canva presentation "${title}" taiyar kar di hai. Niche diye button par click karke design shuru karein!`;
        const assistantMessage: Message = {
          id: uuid(),
          role: 'assistant',
          content: `🎨 **Canva Studio Integrated**\n\n${msg}\n\n[OPEN_CANVA_DESIGN:${design.url}]`,
          timestamp: new Date(),
        };
        updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, assistantMessage] }));
        speakText(msg);
        return;
      }
    }

    setIsTyping(true);

    try {
      if (aiProvider === 'coding') {
        const assistantMsgId = uuid();
        const assistantMessage: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };

        updateChat(chatId, (chat) => ({
          ...chat,
          messages: [...chat.messages, assistantMessage],
        }));

        let fullResponse = '';
        await callCodingAssistant(updatedMessages, (chunk) => {
          fullResponse += chunk;
          updateChat(chatId, (chat) => ({
            ...chat,
            messages: chat.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: fullResponse } : m
            ),
          }));
        });

        setUsageCount((prev) => prev + 1);
        speakText(fullResponse);

        // 💾 Save Assistant Message to DB
        fetch('http://localhost:5000/api/messages', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ chatId, role: 'assistant', content: fullResponse })
        });

        const codeBlockMatch = fullResponse.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (codeBlockMatch) {
          setCodeLanguage(codeBlockMatch[1] || 'javascript');
          setGeneratedCode(codeBlockMatch[2].trim());
        }
      } else {
        const responseText = 
          aiProvider === 'gemini' ? await callGemini(updatedMessages) :
          aiProvider === 'blackbox' ? await callBlackbox(updatedMessages) :
          aiProvider === 'grok' ? await callGrok(updatedMessages) :
          await callOllama(updatedMessages);

        const assistantMessage: Message = {
          id: uuid(),
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
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'NO_API_KEY' || errMsg === 'NO_BLACKBOX_KEY' || errMsg === 'NO_GROK_KEY') {
        setError('no_key');
      } else if (errMsg === 'OLLAMA_OFFLINE') {
        setError('ollama_offline');
      } else if (errMsg === 'NO_ACTIVE_MODEL') {
        setError('no_active_model');
      } else if (errMsg === 'CODING_ASSISTANT_OFFLINE') {
        setError('coding_assistant_offline');
      } else {
        setError(errMsg);
        console.error('[JARVIS] AI API error:', err);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const continueResponse = async (lastCodeSnippet: string) => {
    if (isTyping || !activeChatId) return;
    setIsTyping(true);
    setError(null);

    const chatId = activeChatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    // Optimized prompt for seamless continuation
    const prompt = `CRITICAL: You stopped writing code halfway. Continue writing the code EXACTLY from the next character. 
DO NOT repeat any previous code. 
DO NOT use markdown code blocks (like \`\`\`). 
Just provide the raw code continuation.
The last few lines were:
${lastCodeSnippet}`;

    try {
      await callCodingAssistant([...chat.messages, { role: 'user', id: uuid(), content: prompt, timestamp: new Date() }], (chunk) => {
        setChats(prev => prev.map(c => {
          if (c.id === chatId) {
            const msgs = [...c.messages];
            const lastAssistantIdx = msgs.findLastIndex(m => m.role === 'assistant');
            if (lastAssistantIdx !== -1) {
              msgs[lastAssistantIdx] = {
                ...msgs[lastAssistantIdx],
                content: msgs[lastAssistantIdx].content + chunk
              };
            }
            return { ...c, messages: msgs };
          }
          return c;
        }));
      });
    } catch (err) {
      setError(String(err));
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



  const newChat = async () => {
    const chat = createChat();
    try {
      await fetch('http://localhost:5000/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chat.id, title: chat.title })
      });
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat.id);
      setError(null);
    } catch (err) {
      console.error("Failed to create chat in DB:", err);
      // Fallback for UI if backend is down
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat.id);
    }
  };

  useEffect(() => {
    if (canvaLoadedRef.current) return;
    
    const script = document.createElement('script');
    script.src = 'https://sdk.canva.com/designbutton/v2/api.js';
    script.async = true;
    script.onload = () => {
      const clientId = import.meta.env.VITE_CANVA_CLIENT_ID;
      if ((window as any).Canva && (window as any).Canva.DesignButton && clientId) {
        const api = (window as any).Canva.DesignButton;
        api.initialize({
          apiKey: clientId,
          onDesignPublish: (exportUrl: string) => {
            console.log("Canva Design Published:", exportUrl);
            alert("Design published! URL: " + exportUrl);
          },
        }).then((initializedApi: any) => {
          setCanvaApi(initializedApi);
          canvaLoadedRef.current = true;
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const createCanvaPresentation = async (title: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/canva/create-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (data.success) return data.design;
    } catch (e) {
      console.error("Canva AI Error:", e);
    }
    return null;
  };

  const handleCanvaDesign = async () => {
    if (!isCanvaConnected) {
      window.open('http://localhost:5000/api/canva/connect', '_blank');
      console.log("Canva connection initiated...");
      return;
    }
    
    // If already connected, we can offer to disconnect or open Canva
    const action = confirm("Canva is connected. Would you like to open Canva Templates?\n\n(Click Cancel to Disconnect instead)");
    if (action) {
      const canvaUrl = "https://www.canva.com/presentations/templates/";
      window.open(canvaUrl, '_blank');
    } else {
      if (confirm("Are you sure you want to disconnect Canva?")) {
        try {
          await fetch('http://localhost:5000/api/canva/disconnect', { method: 'POST' });
          setIsCanvaConnected(false);
          alert("Canva disconnected.");
        } catch (e) {
          alert("Failed to disconnect.");
        }
      }
    }
  };

  // 📱 WhatsApp Data Polling
  useEffect(() => {
    let interval: any;
    if (showWhatsAppManager && isWhatsappConnected) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:5000/api/whatsapp/contacts');
          if (res.ok) {
            const data = await res.json();
            setWhatsappContacts(data.contacts);
          }
        } catch (e) {
          console.error("WhatsApp Contacts Poll Error:", e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [showWhatsAppManager, isWhatsappConnected]);

  useEffect(() => {
    let interval: any;
    if (showWhatsAppManager && isWhatsappConnected && selectedWhatsappNumber) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/whatsapp/messages/${encodeURIComponent(selectedWhatsappNumber)}`);
          if (res.ok) {
            const data = await res.json();
            setWhatsappMessages(data.messages);
          }
        } catch (e) {
          console.error("WhatsApp Messages Poll Error:", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showWhatsAppManager, isWhatsappConnected, selectedWhatsappNumber]);

  // 📱 WhatsApp Status Polling
  useEffect(() => {
    if (!showWhatsAppManager) return;

    // Auto-start WhatsApp when manager opens (so QR generates immediately)
    fetch('http://localhost:5000/api/whatsapp/start', { method: 'POST' }).catch(() => {});

    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5000/api/whatsapp/status');
        if (res.ok) {
          const data = await res.json();
          setWhatsappQrCode(data.qr ?? null);
          setIsWhatsappConnected(!!data.connected);
          setIsAutoReplyEnabled(!!data.autoReply);
          // Trigger contact sync once connected
          if (data.connected) {
            fetch('http://localhost:5000/api/whatsapp/sync', { method: 'POST' }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("WhatsApp Status Poll Error:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [showWhatsAppManager]);

  const handleModuleClick = (moduleName: string) => {
    setShowPptStudio(false);
    setPptStudioData(null);
    setShowAICodingIDE(false);
    setShowModelHub(false);
    setShowBuildPage(false);

    if (moduleName === 'Build') {
      setShowBuildPage(true);
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setShowPptGenerator(false);
      setExternalPlatform(null);
      setSelectedAgent('Build');
      return;
    }
    if (moduleName === 'IDE') {
      setAiProvider('coding');
      setSelectedAgent('IDE');
      setError(null);
      setShowAICodingIDE(true);
      setShowModelHub(false);
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setShowPptGenerator(false);
      setExternalPlatform(null);
      return;
    }
    if (moduleName === 'AI Coding Assistant') {
      setAiProvider('coding');
      setSelectedAgent(`AI Coding Assistant ${activeModel ? `(${activeModel.displayName})` : `(${OLLAMA_MODEL})`}`);
      setError(null);
      setShowAICodingIDE(false);
      setShowModelHub(false);
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setShowPptGenerator(false);
      setExternalPlatform(null);
      return;
    }
    if (moduleName === 'Model Hub') {
      setShowModelHub(true);
      setShowAICodingIDE(false);
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setShowPptGenerator(false);
      setExternalPlatform(null);
      setSelectedAgent('Model Hub');
      return;
    }
    if (moduleName === 'Automation Control') {
      setShowAutomationControl(true);
      setShowWhatsAppManager(false);
      setShowTelegramBot(false);
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowPptGenerator(false);
      setExternalPlatform(null);
      setSelectedAgent('Neural Automation Controller');
      return;
    }
    if (moduleName === 'WhatsApp Manager') {
      setShowWhatsAppManager(true);
      setShowTelegramBot(false);
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowPptGenerator(false);
      setShowAutomationControl(false);
      setExternalPlatform(null);
      setSelectedAgent('WhatsApp Matrix Manager');
      return;
    }
    if (moduleName === 'Telegram Bot') {
      setShowTelegramBot(true);
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowPptGenerator(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setExternalPlatform(null);
      setSelectedAgent('Telegram Bot Manager');
      return;
    }
    if (moduleName === 'Model and API') {
      setShowModelManager(true);
      setShowAppBuilder(false);
      setShowPptGenerator(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setExternalPlatform(null);
      setSelectedAgent('Model and API Management');
      return;
    }
    if (moduleName === 'App Builder') {
      setShowAppBuilder(true);
      setShowModelManager(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setShowPptGenerator(false);
      setExternalPlatform(null);
      setSelectedAgent('Neural Forge App Builder');
      return;
    }
    if (moduleName === 'PPT Generator') {
      setShowPptGenerator(true);
      setShowAppBuilder(false);
      setShowModelManager(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setExternalPlatform(null);
      setSelectedAgent('Neural PPT Generator');
      return;
    }
    if (moduleName === 'Studio') {
      setExternalPlatform({ name: 'Studio', url: '/Studio/index.html' });
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowPptGenerator(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setSelectedAgent('Studio');
      return;
    }
    if (moduleName === 'gamebuilder') {
      setExternalPlatform({ name: 'gamebuilder', url: '/gamebuilder/' });
      setShowModelManager(false);
      setShowAppBuilder(false);
      setShowPptGenerator(false);
      setShowTelegramBot(false);
      setShowWhatsAppManager(false);
      setShowAutomationControl(false);
      setSelectedAgent('gamebuilder');
      return;
    }
    setShowModelManager(false);
    setShowAppBuilder(false);
    setShowTelegramBot(false);
    setShowWhatsAppManager(false);
    setShowAutomationControl(false);
    setShowPptGenerator(false);
    setExternalPlatform(null);
  };

  const generatePpt = async () => {
    if (!pptTopic.trim()) {
      alert("Please enter a topic first.");
      return;
    }

    setIsGeneratingPpt(true);
    try {
      const getBase64Image = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error("Image fetch failed:", url, e);
          return null;
        }
      };

      const canvaUrl = (document.getElementById('canva-sync-url') as HTMLInputElement)?.value || '';
      

      const prompt = `Create a 5-slide professional presentation JSON about: "${pptTopic}".
      
      JSON Schema (Strictly follow):
      {
        "theme": { "primary": "#06b6d4", "secondary": "#a855f7", "accent": "#ffffff", "font": "Outfit", "background": "#020617" },
        "slides": [
          { "id": "1", "type": "title", "title": "MAIN TITLE", "subtitle": "SUBTITLE" },
          { "id": "2", "type": "bullet", "title": "SECTION TITLE", "content": ["Point 1", "Point 2", "Point 3"], "imageQuery": "relevant search term" }
        ]
      }
      
      Rules:
      1. Return ONLY the JSON object. No other text.
      2. Use double quotes for all keys and values.
      3. Ensure "content" is always an array of strings.`;

      const updatedMessages: Message[] = [{
        id: uuid(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      }];

      // Use the active AI provider logic
      const aiContent = 
        aiProvider === 'gemini' ? await callGemini(updatedMessages) :
        aiProvider === 'blackbox' ? await callBlackbox(updatedMessages) :
        aiProvider === 'grok' ? await callGrok(updatedMessages) :
        aiProvider === 'coding' ? await (async () => {
          let full = '';
          await callCodingAssistant(updatedMessages, (chunk) => full += chunk);
          return full;
        })() :
        await callOllama(updatedMessages);

      if (!aiContent) throw new Error("AI returned an empty response.");

      console.log("[JARVIS PPT] Raw AI Content:", aiContent);

      // --- NEURAL STUDIO ENGINE (Robust Parsing & Repair) ---
      try {
        let cleanJson = aiContent.trim();
        
        // 1. Extract from markdown block if present
        if (cleanJson.includes('```')) {
          const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match && match[1]) {
            cleanJson = match[1].trim();
          } else {
            cleanJson = cleanJson.replace(/```json|```/g, '').trim();
          }
        }
        
        // 2. Find first { and last } to strip any leading/trailing text
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }

        // 3. Robust JSON Repair Utility
        const repairJson = (str: string) => {
          let r = str;
          // Fix raw newlines inside string literals (common AI mistake)
          r = r.replace(/(?<=[:\s,])"([^"]*?)"(?=[\s,}]|$)/gs, (match, p1) => {
            return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, ' ') + '"';
          });
          // Fix missing opening quotes for property names
          r = r.replace(/(?<=[{,]\s*)([a-z0-9_]+)(?=\s*:)/gi, '"$1"');
          // Fix missing colons
          r = r.replace(/(?<="[a-z0-9_]+")\s+(")/gi, ': $1');
          // Fix missing commas between properties or array elements
          r = r.replace(/(?<=")(?:\s*)(?="[a-z0-9_]+":)/gi, ',');
          // Fix trailing commas before closing braces/brackets
          r = r.replace(/,\s*([}\]])/g, '$1');
          return r;
        };

        let studioData;
        try {
          studioData = JSON.parse(cleanJson);
        } catch (e) {
          console.warn("Initial parse failed, attempting repair...");
          const repaired = repairJson(cleanJson);
          console.log("[JARVIS PPT] Repaired JSON:", repaired);
          studioData = JSON.parse(repaired);
        }

        setPptStudioData(studioData);
        setShowPptStudio(true);
      } catch (err) {
        console.error("Final JSON Parse Error:", err);
        alert("AI returned a malformed response. Please try again with a simpler topic.");
      }
    } catch (err) {
      console.error("PPT Pro Generation Error:", err);
      alert("Failed to generate Pro PPT: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingPpt(false);
    }
  };

  const exportPpt = async (data: PptData) => {
    try {
      const pres = new pptxgen();
      const theme = data.theme;

      for (const slide of data.slides) {
        const s = pres.addSlide();
        s.background = { color: theme.background };

        if (slide.type === 'title') {
          s.addText(slide.title.toUpperCase(), {
            x: 1, y: 2, w: 8, h: 1.5,
            fontSize: 44, bold: true, color: theme.primary,
            fontFace: theme.font, align: 'center'
          });
          s.addText(slide.subtitle?.toUpperCase() || '', {
            x: 1, y: 3.5, w: 8, h: 0.5,
            fontSize: 18, color: theme.secondary,
            fontFace: theme.font, align: 'center', transparency: 30
          });
        } else {
          s.addText(slide.title, {
            x: 0.5, y: 0.3, w: 9, h: 0.8,
            fontSize: 28, bold: true, color: theme.primary,
            fontFace: theme.font
          });

          slide.content?.forEach((point, pIdx) => {
             s.addText("●", { x: 0.5, y: 1.5 + (pIdx * 0.8), w: 0.3, h: 0.3, fontSize: 14, color: theme.primary });
             s.addText(point, {
               x: 0.8, y: 1.5 + (pIdx * 0.8), w: 5, h: 0.8,
               fontSize: 16, color: theme.accent,
               fontFace: theme.font
             });
          });

          if (slide.imageQuery) {
            const imgUrl = `https://loremflickr.com/800/600/${encodeURIComponent(slide.imageQuery)}`;
            s.addImage({ path: imgUrl, x: 6, y: 1.2, w: 3.5, h: 4, sizing: { type: 'cover', w: 3.5, h: 4 } });
          }
        }
      }

      await pres.writeFile({ fileName: `Jarvis_Presentation.pptx` });
      alert("Success! Your professional presentation has been exported.");
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to export PPTX.");
    }
  };

  const reviewPpt = async (file: File) => {
    setIsReviewingPpt(true);
    setPptReviewData(null);
    try {
      const zip = await JSZip.loadAsync(file);
      let extractedText = "";

      // Look through all slides in the ppt/slides/ folder
      const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
      
      for (const slideFile of slideFiles) {
        const content = await zip.files[slideFile].async('string');
        // Simple regex to extract text content from PPT XML
        const matches = content.match(/<a:t>([^<]+)<\/a:t>/g);
        if (matches) {
          extractedText += `\n[Slide ${slideFile.match(/\d+/)}]: ` + matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ');
        }
      }

      if (!extractedText.trim()) {
        throw new Error("No readable text found in this PPT.");
      }

      // Send to AI for review
      const reviewPrompt = `You are a professional presentation consultant. Review the following content extracted from a PPT file. 
      Analyze the flow, content quality, and suggest improvements for design and impact.
      
      CONTENT:
      ${extractedText.substring(0, 5000)}... (truncated if too long)`;

      let reviewResult = '';
      await callCodingAssistant([{ role: 'user', content: reviewPrompt }], (chunk) => {
        reviewResult += chunk;
        setPptReviewData(reviewResult);
      });

    } catch (err) {
      console.error("PPT Review Error:", err);
      alert("Failed to review PPT: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsReviewingPpt(false);
    }
  };

  const handleAddModel = async () => {
    if (!newModel.modelId || !newModel.displayName) {
      alert("Please enter both Model ID and Display Name.");
      return;
    }

    const isApiKeyRequired = newModel.provider !== 'Ollama' && newModel.provider !== 'Custom';
    if (isApiKeyRequired && !newModel.apiKey) {
      alert(`API Key is required for ${newModel.provider}.`);
      return;
    }



    setIsSaving(true);
    const modelData = {
      id: editingModelId || uuid(),
      name: newModel.displayName,
      provider: newModel.provider || 'Custom',
      model_id: newModel.modelId,
      base_url: newModel.baseUrl || '',
      api_key: newModel.apiKey || '',
      api_protocol: newModel.protocol || 'OpenAI',
      is_active: false
    };
    try {
      const url = editingModelId 
        ? `http://localhost:5000/api/models/${editingModelId}` 
        : 'http://localhost:5000/api/models';
      const method = editingModelId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData)
      });

      if (response.ok) {
        const fullModel: CustomModel = {
          id: modelData.id,
          displayName: modelData.name,
          provider: modelData.provider,
          modelId: modelData.model_id,
          baseUrl: modelData.base_url,
          apiKey: modelData.api_key,
          protocol: modelData.api_protocol,
          isActive: editingModelId ? (customModels.find(m => m.id === editingModelId)?.isActive || false) : false,
          isTested: true
        };

        if (editingModelId) {
          setCustomModels(prev => prev.map(m => m.id === editingModelId ? fullModel : m));
        } else {
          setCustomModels(prev => [...prev, fullModel]);
        }
        setShowAddModal(false);
        setEditingModelId(null);
        setNewModel({ provider: 'Z.ai', protocol: 'OpenAI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' });
        setTestResult(null);
      } else {
        const errorData = await response.json();
        alert(`Server error: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Persistence failed:', err);
      alert('Failed to save model to database. Please check if your backend is running.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditModel = (model: CustomModel) => {
    setNewModel(model);
    setEditingModelId(model.id);
    setShowAddModal(true);
    setTestResult(null);
  };

  const handleTestConnectivity = async () => {
    if (!newModel.baseUrl || !newModel.modelId) {
      alert("Please provide at least Base URL and Model ID");
      return;
    }

    const isApiKeyRequired = newModel.provider !== 'Ollama' && newModel.provider !== 'Custom';
    if (isApiKeyRequired && !newModel.apiKey) {
      alert(`API Key is required for ${newModel.provider} connectivity test.`);
      return;
    }


    setIsTesting(true);
    setTestResult(null);
    
    try {
      const testMessages = [
        { role: 'system', content: 'Reply with ok only.' },
        { role: 'user', content: 'test' }
      ];
      const testModel: CustomModel = {
        id: editingModelId || 'connectivity-test',
        provider: newModel.provider || 'Custom',
        modelId: newModel.modelId || '',
        displayName: newModel.displayName || newModel.modelId || 'Test Model',
        apiKey: newModel.apiKey || '',
        protocol: newModel.protocol || 'OpenAI',
        baseUrl: newModel.baseUrl || '',
        isActive: false,
        isTested: false,
      };

      let response: Response;
      try {
        response = await fetch('http://localhost:5000/api/proxy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: newModel.baseUrl,
          apiKey: newModel.apiKey || '',
          modelId: newModel.modelId,
          messages: testMessages,
          stream: false,
          max_tokens: 8
        })
        });
      } catch {
        await callViteModelProxy(testModel, testMessages, 8);
        setTestResult('success');
        return;
      }

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch (err) {
      setTestResult('error');
      console.error("Connectivity test failed:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleModelActivation = async (id: string) => {
    try {
      const target = customModels.find(m => m.id === id);
      if (!target) {
        setError('Model not found. Refresh the model list and try again.');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/models/${id}/activate`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setCustomModels(prev => prev.map(m => 
          m.id === id ? { ...m, isActive: Boolean(data.active) } : { ...m, isActive: false }
        ));
      }
    } catch (err) {
      console.error('Activation failed:', err);
    }
  };

  const formatTime = (d?: Date) =>
    (d ?? new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Render markdown-lite: bold, inline code, code blocks (handles streaming/unclosed blocks)
  const renderContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    const segments = text.split('```');
    
    segments.forEach((segment, index) => {
      if (index % 2 === 0) {
        // Regular text
        if (segment) {
          parts.push(<span key={index}>{renderInlineMarkdown(segment)}</span>);
        }
      } else {
        // Code block
        const lines = segment.split('\n');
        const firstLine = lines[0].trim();
        const lang = /^\w+$/.test(firstLine) ? firstLine : '';
        const code = lang ? lines.slice(1).join('\n') : segment;

        const isUnclosed = index === segments.length - 1;

        parts.push(
          <div key={index} className="relative group my-4">
            {/* Header buttons */}
            <div className="absolute top-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button 
                onClick={() => {
                   setAppBuilderCode(code.trim());
                   setShowAppBuilder(true);
                   setShowModelManager(false);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-elevated hover:bg-elevated border border-line-strong rounded-lg text-[10px] text-ink transition-all "
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="font-semibold tracking-wider uppercase">Run in App Builder</span>
              </button>
            </div>

            <pre className="scrollbar-none max-w-full bg-surface border border-line rounded-xl p-4 overflow-x-auto text-xs text-ink font-mono ">
              {lang && <div className="text-[10px] text-ink-subtle mb-2 uppercase tracking-widest font-bold border-b border-line pb-1">{lang}</div>}
              <code>{code.trim()}</code>
            </pre>

            {/* Bottom button for incomplete code */}
            {isUnclosed && (
               <button 
                 onClick={() => {
                   const codeLines = code.trim().split('\n');
                   const lastLines = codeLines.slice(-5).join('\n');
                   continueResponse(lastLines);
                 }}
                 className="mt-2 flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-all text-[11px] font-bold tracking-widest uppercase bg-orange-950/10 px-3 py-1.5 rounded-lg border border-orange-900/30 hover:border-orange-500/50"
               >
                 <Plus className="w-3.5 h-3.5" />
                 <span>Write code from last line</span>
               </button>
            )}
          </div>
        );
      }
    });

    return <>{parts}</>;
  };

  const renderInlineMarkdown = (text: string) => {
    // 🎨 Canva Design Button Detection
    if (text.includes('[OPEN_CANVA_DESIGN:')) {
      const parts = text.split(/(\[OPEN_CANVA_DESIGN:[^\]]+\])/g);
      return parts.map((part, i) => {
        if (part.startsWith('[OPEN_CANVA_DESIGN:')) {
          const url = part.match(/:(.*)\]/)?.[1];
          return (
            <div key={i} className="my-6 flex justify-center">
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.open(url, '_blank')}
                className="group relative flex items-center space-x-3 px-6 py-3.5 rounded-xl bg-accent text-accent-fg transition-opacity hover:opacity-90"
              >
                <div className="w-8 h-8 bg-hover rounded-lg flex items-center justify-center p-1.5 group-hover:rotate-12 transition-transform">
                  <img src="https://www.canva.com/favicon.ico" alt="Canva" className="w-full h-full object-contain" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-accent-fg/70 font-semibold tracking-[0.15em] uppercase leading-none mb-1">Canva</div>
                  <div className="text-sm font-semibold tracking-wide">Open in Canva Studio</div>
                </div>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </motion.button>
            </div>
          );
        }
        return renderSimpleFormatting(part);
      });
    }
    return renderSimpleFormatting(text);
  };

  const renderSimpleFormatting = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m;
    let k = 0;

    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
      const tok = m[0];
      if (tok.startsWith('`'))
        parts.push(<code key={k++} className="bg-surface border border-line text-ink-muted px-1 rounded text-xs font-mono">{tok.slice(1, -1)}</code>);
      else if (tok.startsWith('**'))
        parts.push(<strong key={k++} className="text-ink font-semibold">{tok.slice(2, -2)}</strong>);
      else
        parts.push(<em key={k++} className="text-ink italic">{tok.slice(1, -1)}</em>);
      last = m.index + tok.length;
    }

    if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
    return parts;
  };

  const userDisplayName = storedUser?.name || userName || 'Agent';
  const userDisplayEmail = storedUser?.email || 'Not signed in';
  const userInitials = (userDisplayName.trim().slice(0, 1) || 'A').toUpperCase();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className="flex h-screen bg-canvas text-ink font-sans overflow-hidden">

      <AnimatePresence>
        {externalPlatform && (
          <motion.div
            key="external-platform"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-canvas"
          >
            <button
              onClick={() => setExternalPlatform(null)}
              aria-label="Back to main platform"
              title="Back to main platform"
              className={`absolute z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-scrim text-ink  transition-all hover:border-line-strong hover:text-ink ${
                externalPlatform.name === 'gamebuilder'
                  ? 'right-40 top-4'
                  : 'left-1/2 top-1.5 -translate-x-1/2'
              }`}
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <iframe
              key={externalPlatform.url}
              title={externalPlatform.name}
              src={externalPlatform.url}
              className="h-full w-full border-none bg-surface"
              allow="fullscreen; clipboard-read; clipboard-write"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────── SIDEBAR ─────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 w-64 flex-shrink-0 flex flex-col border-r border-line bg-surface"
          >
            <div className="flex items-center justify-between p-4 border-b border-line">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full border border-line-strong flex items-center justify-center">
                  <Cpu className="w-3 h-3 text-ink-muted" />
                </div>
                <span className="text-ink-muted font-bold tracking-[0.15em] text-xs uppercase">
                  Codevora AI
                </span>
              </div>
              <button
                onClick={newChat}
                className="p-1.5 rounded-lg border border-line hover:border-line-strong hover:text-ink text-ink-subtle transition-all"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 🤖 Core Dashboard Modules */}
            <div className="flex flex-col space-y-1 px-3 py-4 border-b border-line">
              <button
                onClick={newChat}
                className="flex items-center space-x-2.5 px-2.5 py-2 mb-2 rounded-xl bg-elevated border border-line-strong text-ink hover:bg-elevated hover:border-line-strong transition-all text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5 flex-shrink-0 text-ink" />
                <span className="truncate">New Chat</span>
              </button>
              <p className="text-[10px] text-ink-subtle tracking-widest uppercase mb-2 px-1 font-semibold">Modules</p>
              {[
                { name: 'AI Coding Assistant', icon: Cpu },
                { name: 'IDE', icon: Code },
                { name: 'Automation Control', icon: Zap },
                { name: 'Build', icon: Wrench },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleModuleClick(item.name)}
                  className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-xl transition-all text-xs ${
                    item.name === selectedAgent || (!externalPlatform && item.name === 'AI Coding Assistant' && aiProvider === 'coding')
                      ? 'bg-elevated border border-line text-ink'
                      : 'text-ink-muted/70 hover:bg-surface hover:text-ink'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0 text-ink-muted/80" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <div className="p-3 border-t border-line">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                aria-expanded={showUserMenu}
                className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-surface transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-elevated border border-line flex items-center justify-center flex-shrink-0 text-ink text-xs font-semibold overflow-hidden">
                  {userAvatar && !avatarError ? (
                    <img
                      src={userAvatar}
                      alt={userDisplayName}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink font-medium truncate">{userDisplayName}</p>
                  <p className="text-[10px] text-ink-subtle tracking-wider truncate">{userDisplayEmail}</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-line bg-surface text-ink tracking-wider shrink-0">Free Plan</span>
                <ChevronRight className={`w-3.5 h-3.5 text-ink-subtle transition-transform shrink-0 ${showUserMenu ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {showUserMenu && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-xl border border-line bg-surface p-1.5">
                      {USER_MENU.map((group) => (
                        <div key={group.section} className="mb-0.5">
                          <p className="px-2 pt-2 pb-1 text-[9px] tracking-widest text-ink-subtle/80 uppercase font-semibold">{group.section}</p>
                          {group.items.map((item) => (
                            <button
                              key={item.label}
                              onClick={() => {
                                setShowUserMenu(false);
                                if (item.label === 'Security') setShowSecurity(true);
                                else if (item.label === 'Subscription') setShowSubscription(true);
                                else if (group.section === 'Billing') setShowSettings(true);
                              }}
                              className="w-full flex items-center space-x-2.5 px-2 py-1.5 rounded-lg text-ink-muted/80 hover:bg-elevated hover:text-ink transition-all text-xs"
                            >
                              <item.icon className="w-3.5 h-3.5 text-ink-muted/80" />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                      {onLogout && (
                        <button
                          onClick={() => { setShowUserMenu(false); onLogout(); }}
                          className="w-full flex items-center space-x-2.5 px-2 py-2 mt-1 rounded-lg border-t border-line text-ink-subtle hover:text-red-400 hover:bg-red-950/20 transition-all text-xs"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign out</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─────────── MAIN PANEL ─────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen((v) => !v)}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-elevated transition-all"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="h-4 w-px bg-elevated" />
            <div className="flex items-center space-x-2">
              {isSpeaking && (
                <div className="flex items-center space-x-1 ml-2">
                   {[0,1,2].map(i => <motion.div key={i} animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.5, repeat: Infinity, delay: i*0.15 }} className="w-0.5 h-3 bg-accent" />)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-ink-subtle text-xs tracking-widest">
            <button onClick={toggleTheme} aria-label="Toggle light and dark theme" title="Toggle theme" className="flex items-center hover:text-ink transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowSettings(true)} aria-label="Open settings" className="flex items-center space-x-1.5 hover:text-ink transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* API Key Banner */}
        {!hasApiKey && (
          <div className="flex items-center space-x-3 px-4 py-2.5 bg-yellow-950/40 border-b border-yellow-700/40 text-yellow-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              No API key detected for {aiProvider.toUpperCase()}. Add your key to <code className="bg-surface px-1 rounded font-mono">.env</code> as{' '}
              <code className="bg-surface px-1 rounded font-mono">
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
        <div className={showAICodingIDE || showModelHub ? 'flex-1 min-h-0 overflow-hidden' : 'scrollbar-none flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 space-y-6 scroll-smooth'}>
          {showBuildPage ? (
            <div className="h-full flex flex-col p-4 max-w-5xl mx-auto w-full">
              <div className="mb-6">
                <h2 className="text-xl font-light text-ink tracking-wider">Build</h2>
                <p className="text-xs text-ink-subtle/80 tracking-wider mt-1">Build, automate and ship — all your tooling in one place.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BUILD_TOOLS.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => { setShowBuildPage(false); handleModuleClick(tool.name); }}
                    className="flex items-start gap-3 text-left p-4 rounded-2xl border border-line bg-surface hover:bg-elevated hover:border-line transition-all"
                  >
                    <tool.icon className="w-5 h-5 text-ink-muted mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-ink tracking-wide">{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : showAICodingIDE ? (
            <AICodingIDE onBack={() => { setShowAICodingIDE(false); setSelectedAgent(null); inputRef.current?.focus(); }} />
          ) : showModelHub ? (
            <ModelHub
              onBack={() => { setShowModelHub(false); setSelectedAgent(null); inputRef.current?.focus(); }}
              onUseInChat={(text) => { setInput(text); setShowModelHub(false); setSelectedAgent(null); inputRef.current?.focus(); }}
            />
          ) : showPptStudio && pptStudioData ? (
             <NeuralPptStudio 
               data={pptStudioData} 
               onClose={() => { setShowPptStudio(false); setPptStudioData(null); }} 
               onExport={exportPpt}
             />
          ) : showPptGenerator ? (
            <div className="h-full flex flex-col items-center justify-center p-4 relative w-full">
               <div className="max-w-2xl w-full bg-surface border border-line rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <FileText className="w-48 h-48 text-ink-muted -mr-10 -mt-10" />
                  </div>
                  
                  <div className="flex items-center space-x-3 mb-8 border-b border-line pb-4 relative z-10">
                     <FileText className="w-5 h-5 text-ink-muted" />
                     <h2 className="text-lg font-black tracking-widest text-ink uppercase">Neural PPT Generator</h2>
                  </div>

                  <div className="space-y-6 relative z-10">
                     <div className="space-y-2">
                        <label className="text-[10px] text-ink-subtle font-black tracking-widest uppercase ml-1">Presentation Topic</label>
                        <input 
                          type="text"
                          value={pptTopic}
                          onChange={(e) => setPptTopic(e.target.value)}
                          placeholder="e.g. Sustainable Organic Farming"
                          className="w-full bg-surface border border-line rounded-xl px-4 py-4 text-sm text-ink focus:ring-1 focus:ring-line-strong outline-none transition-all placeholder-ink-subtle "
                        />
                     </div>

                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] text-ink-muted font-black tracking-widest uppercase ml-1">Neural Style Sync (Canva URL)</label>
                           <span className="text-[8px] text-ink-subtle font-semibold uppercase tracking-tighter">Syncs Colors &amp; Vibe</span>
                        </div>
                        <input 
                          id="canva-sync-url"
                          type="text"
                          placeholder="Paste Canva Template URL to sync style..."
                          className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-xs text-ink focus:ring-1 focus:ring-line-strong outline-none transition-all placeholder-ink-subtle"
                        />
                     </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] text-ink-subtle font-black tracking-widest uppercase ml-1">Slide Count</label>
                         <select 
                           value={pptSlideCount}
                           onChange={(e) => setPptSlideCount(e.target.value)}
                           className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink focus:ring-1 focus:ring-line-strong outline-none appearance-none cursor-pointer"
                         >
                            <option value="5">5 Slides</option>
                            <option value="10">10 Slides</option>
                            <option value="15">15 Slides</option>
                         </select>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <button 
                        onClick={generatePpt}
                        disabled={isGeneratingPpt}
                        className="flex-1 py-5 bg-elevated text-ink border border-line-strong rounded-2xl font-semibold tracking-[0.2em] uppercase text-xs hover:opacity-90 transition-all flex items-center justify-center space-x-3 group disabled:opacity-50"
                      >
                         <Zap className={`w-4 h-4 ${isGeneratingPpt ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
                         <span>{isGeneratingPpt ? 'Generating Matrix...' : 'Generate Matrix PPT'}</span>
                      </button>

                      <button 
                        onClick={handleCanvaDesign}
                        className={`px-6 py-5 rounded-2xl text-[10px] font-semibold tracking-[0.2em] uppercase transition-colors flex items-center space-x-2 border ${isCanvaConnected ? 'border-green-600 bg-green-600/10 text-green-500' : 'border-line bg-surface text-ink-muted hover:text-ink hover:border-line-strong'}`}
                        title={isCanvaConnected ? "Connected to Canva" : "Connect your Canva Account"}
                      >
                         <div className="w-5 h-5 bg-surface rounded-full flex items-center justify-center p-1 group-hover:rotate-12 transition-transform">
                            <img src="https://www.canva.com/favicon.ico" alt="Canva" className="w-full h-full" />
                         </div>
                         <span>{isCanvaConnected ? 'Canva Connected' : 'Connect Canva'}</span>
                         {isCanvaConnected && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                      </button>
                    </div>

                    <div className="pt-4 border-t border-line">
                       <div className="flex items-center space-x-3 text-ink-subtle">
                          <Activity className={`w-4 h-4 ${isGeneratingPpt ? 'animate-pulse' : ''}`} />
                          <p className="text-[9px] uppercase tracking-widest font-bold">
                            {isGeneratingPpt ? 'Neural Engine: Synthesizing Slides...' : 'Neural Engine Ready: Awaiting Parameters'}
                          </p>
                       </div>
                    </div>
                  </div>

                  {/* 📂 Upload & Review Section */}
                  <div className="mt-8 pt-8 border-t border-line">
                    <div className="flex items-center space-x-3 mb-4">
                       <Upload className="w-4 h-4 text-ink-muted" />
                       <h3 className="text-xs font-black tracking-widest text-ink uppercase">Neural PPT Reviewer</h3>
                    </div>

                    {!pptReviewData ? (
                      <div 
                        onClick={() => document.getElementById('ppt-upload-input')?.click()}
                        className="group relative cursor-pointer"
                      >
                        <div className="relative p-10 border border-dashed border-line-strong/30 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:border-line-strong/50 transition-all bg-surface">
                           <Upload className={`w-10 h-10 text-ink-muted/40 group-hover:text-ink-muted transition-all ${isReviewingPpt ? 'animate-bounce' : ''}`} />
                           <div className="text-center">
                              <p className="text-sm font-bold text-ink uppercase tracking-widest">{isReviewingPpt ? 'Analyzing Neural Data...' : 'Upload Matrix PPT'}</p>
                              <p className="text-[10px] text-ink-muted font-bold uppercase mt-1 tracking-widest">Supports .pptx files for deep analysis</p>
                           </div>
                           <input 
                             id="ppt-upload-input" 
                             type="file" 
                             accept=".pptx" 
                             className="hidden" 
                             onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) reviewPpt(file);
                             }}
                           />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-6 bg-surface border border-line rounded-2xl max-h-[400px] overflow-y-auto custom-scrollbar relative">
                           <div className="absolute top-4 right-4 flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-[8px] text-ink-muted font-semibold uppercase tracking-widest">AI Feedback Active</span>
                           </div>
                           <div className="text-xs text-ink leading-relaxed prose prose-invert max-w-none">
                              {renderContent(pptReviewData)}
                           </div>
                        </div>
                        <button 
                          onClick={() => setPptReviewData(null)}
                          className="text-[10px] text-ink-muted hover:text-ink font-black uppercase tracking-widest flex items-center space-x-2"
                        >
                           <X className="w-3 h-3" />
                           <span>Discard Review</span>
                        </button>
                      </div>
                    )}
                  </div>
               </div>
            </div>

          ) : showAppBuilder ? (
            <div className="flex-1 flex flex-col h-[85vh] bg-surface border border-line rounded-2xl overflow-hidden my-4 relative ">
              {/* Cinematic TV Header */}
              <div className="h-20 bg-surface border-b border-line px-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-accent  animate-pulse" />
                  <div>
                    <h1 className="text-xl font-black text-ink tracking-[0.3em] uppercase">Neural Forge</h1>
                    <p className="text-[9px] text-ink-subtle font-bold tracking-[0.2em] uppercase">Matrix Workspace V4.2</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => {
                      const blob = new Blob([appBuilderCode], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'forge-app.html';
                      a.click();
                    }}
                    className="flex items-center space-x-2 px-6 py-2 bg-elevated border border-line-strong rounded-full text-ink-muted text-[10px] font-black tracking-widest uppercase hover:bg-elevated transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button 
                    onClick={() => setShowAppBuilder(false)} 
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-ink transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Compact Sidebar */}
                <div className="w-[300px] border-r border-line p-6 flex flex-col space-y-6 bg-surface overflow-y-auto">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2 text-ink-muted mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-black tracking-widest uppercase">Neural Input</span>
                    </div>
                    <textarea 
                      value={appBuilderPrompt}
                      onChange={(e) => setAppBuilderPrompt(e.target.value)}
                      placeholder="Describe app..."
                      className="w-full h-32 bg-surface border border-line rounded-xl p-4 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-line-strong transition-all resize-none font-light"
                    />
                  </div>

                  <button 
                    onClick={async () => {
                      if (!appBuilderPrompt.trim() || isForging) return;
                      setIsForging(true);
                      setAppBuilderCode('');
                      try {
                        await callCodingAssistant([{ role: 'user', content: `Create a single-file HTML/CSS/JS application for: ${appBuilderPrompt}. Output ONLY the code, no explanation.` }], (chunk) => {
                          setAppBuilderCode(prev => prev + chunk);
                        });
                      } catch (err) {
                        console.error('Forge failed:', err);
                      } finally {
                        setIsForging(false);
                      }
                    }}
                    disabled={isForging || !appBuilderPrompt.trim()}
                    className={`w-full group relative overflow-hidden rounded-xl border border-line-strong p-4 transition-all ${isForging ? 'opacity-50' : 'hover:bg-elevated'}`}
                  >
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="flex items-center space-x-2 text-ink font-black tracking-widest uppercase text-[10px]">
                        <Cpu className={`w-4 h-4 ${isForging ? 'animate-spin' : ''}`} />
                        <span>{isForging ? 'Forging...' : 'Forge App'}</span>
                      </div>
                    </div>
                  </button>

                  <div className="mt-auto pt-6 border-t border-line">
                    <div className="flex items-start space-x-3 text-ink-subtle">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-[8px] leading-relaxed tracking-widest uppercase font-bold">
                        Secure Neural Sandbox Active
                      </p>
                    </div>
                  </div>

                  {/* 📂 Saved Projects Gallery */}
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex items-center space-x-2 text-ink-subtle mb-3 px-1">
                      <Database className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black tracking-widest uppercase">Saved Forge Logs</span>
                    </div>
                    <div className="space-y-2">
                      {projects.map((p) => (
                        <button 
                          key={p.id}
                          onClick={() => {
                             setAppBuilderCode(p.code);
                             setAppBuilderPrompt(p.prompt || '');
                          }}
                          className="w-full text-left p-3 rounded-xl bg-surface border border-line hover:border-line-strong transition-all group relative overflow-hidden"
                        >
                           <div className="absolute inset-y-0 left-0 w-1 bg-elevated group-hover:bg-accent transition-colors" />
                           <p className="text-[11px] text-ink truncate font-bold mb-1 ml-1">{p.name || 'Untitled Matrix'}</p>
                           <div className="flex items-center justify-between ml-1">
                              <p className="text-[8px] text-ink-subtle font-bold tracking-tighter uppercase">{new Date(p.updated_at).toLocaleDateString()}</p>
                              <ChevronRight className="w-3 h-3 text-ink-subtle group-hover:text-ink-muted transition-colors" />
                           </div>
                        </button>
                      ))}
                      {projects.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-line rounded-2xl">
                          <p className="text-[9px] text-ink-subtle font-bold uppercase tracking-widest">No Projects Found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Preview Display */}
                <div className="flex-1 bg-surface relative">
                  <iframe 
                    title="Neural Forge Preview"
                    srcDoc={appBuilderCode || `
                      <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#0b0b0d;color:#a1a1aa;font-family:sans-serif;text-align:center;padding:20px">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom:20px opacity:0.4">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        <h2 style="font-weight:900;letter-spacing:6px;margin-bottom:10px;text-transform:uppercase;font-size:14px">Neural Matrix Offline</h2>
                        <p style="font-size:9px;letter-spacing:2px;text-transform:uppercase;opacity:0.5">Awaiting neural input</p>
                      </div>
                    `}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                  />
                  {isForging && (
                    <div className="absolute inset-0 bg-scrim flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 border-2 border-line-strong border-t-ink rounded-full animate-spin" />
                      <p className="text-ink-muted text-[10px] font-black tracking-[0.3em] uppercase animate-pulse">Forging...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : showAutomationControl ? (
            <div className="h-full flex flex-col items-center justify-center p-4 relative w-full">
               <div className="max-w-2xl w-full bg-surface border border-line rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-center space-x-3 mb-8 border-b border-line pb-4">
                     <Zap className="w-5 h-5 text-ink-muted" />
                     <h2 className="text-lg font-black tracking-widest text-ink uppercase">Execute Automation</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] text-ink-subtle font-black tracking-widest uppercase ml-1">Channel</label>
                       <div className="relative">
                         <select 
                           value={automationChannel}
                           onChange={(e) => setAutomationChannel(e.target.value)}
                           className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink focus:ring-1 focus:ring-line-strong outline-none appearance-none cursor-pointer"
                         >
                           <option value="Email">Email</option>
                           <option value="LinkedIn">LinkedIn</option>
                           <option value="Telegram">Telegram</option>
                           <option value="WhatsApp">WhatsApp</option>
                           <option value="Discord">Discord</option>
                         </select>
                         <ChevronRight className="w-4 h-4 text-ink-subtle absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] text-ink-subtle font-black tracking-widest uppercase ml-1">Target (e.g. @username or +1555555)</label>
                       <input 
                         type="text"
                         value={automationTarget}
                         onChange={(e) => setAutomationTarget(e.target.value)}
                         placeholder="john@gmail.com"
                         className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink focus:ring-1 focus:ring-line-strong outline-none transition-all placeholder-ink-subtle"
                       />
                    </div>

                    <div className="space-y-2 relative">
                       <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-ink-subtle font-black tracking-widest uppercase ml-1">Message Content</label>
                          <button 
                            onClick={async () => {
                              setIsDrafting(true);
                              try {
                                const res = await fetch('http://localhost:5000/api/automation/draft', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    channel: automationChannel,
                                    target: automationTarget,
                                    hint: automationContent
                                  })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  setAutomationContent(data.draft);
                                } else {
                                  alert(data.error || "Neural core failed to generate draft.");
                                }
                              } catch (e) {
                                alert("Link to Neural Core severed.");
                              } finally {
                                setIsDrafting(false);
                              }
                            }}
                            disabled={isDrafting}
                            className="flex items-center space-x-1.5 px-2.5 py-1 bg-elevated border border-line-strong rounded-lg text-[9px] text-ink font-black tracking-tighter hover:bg-elevated transition-all disabled:opacity-50"
                          >
                             {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                             <span>{isDrafting ? 'DRAFTING...' : 'AI DRAFT'}</span>
                          </button>
                       </div>
                       <textarea 
                         rows={4}
                         value={automationContent}
                         onChange={(e) => setAutomationContent(e.target.value)}
                         placeholder="What would you like to say?"
                         className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink focus:ring-1 focus:ring-line-strong outline-none resize-none transition-all placeholder-ink-subtle"
                       />
                    </div>

                    <button 
                      onClick={async () => {
                        if (!automationTarget || !automationContent) {
                          alert("Please provide both target and content.");
                          return;
                        }

                        setIsDispatching(true);
                        try {
                          const res = await fetch('http://localhost:5000/api/automation/dispatch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              channel: automationChannel,
                              target: automationTarget,
                              content: automationContent
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert("Agent Dispatched Successfully!");
                            setAutomationTarget('');
                            setAutomationContent('');
                          } else {
                            alert(`Dispatch Failed: ${data.error}`);
                          }
                        } catch (e) {
                          alert("Backend connection failed.");
                        } finally {
                          setIsDispatching(false);
                        }
                      }}
                      disabled={isDispatching}
                      className={`w-full py-4 mt-4 bg-elevated border border-line-strong rounded-xl text-ink-muted font-semibold tracking-[0.2em] uppercase text-xs hover:opacity-90 transition-all flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                       {isDispatching ? (
                         <div className="w-4 h-4 border-2 border-line-strong border-t-ink rounded-full animate-spin" />
                       ) : (
                         <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       )}
                       <span>{isDispatching ? 'Dispatching...' : 'Dispatch Agent'}</span>
                    </button>
                  </div>
               </div>
            </div>
          ) : showWhatsAppManager ? (
            <div className="h-full flex flex-col items-center justify-center p-4 relative w-full overflow-hidden">
              {!isWhatsappConnected ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl w-full bg-surface border border-line rounded-2xl p-8 relative overflow-hidden"
                >
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-shrink-0">
                      <div className="relative w-72 h-72 bg-surface border border-line rounded-2xl p-6 flex items-center justify-center transition-colors hover:border-line-strong">
                        {whatsappQrCode ? (
                          <div className="p-3 bg-surface rounded-2xl">
                             <img src={whatsappQrCode} alt="WhatsApp QR" className="w-full h-full rounded-lg" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-6 text-ink-subtle">
                            <div className="relative">
                               <div className="w-20 h-20 rounded-full border-2 border-dashed border-line flex items-center justify-center animate-[spin_8s_linear_infinite]">
                                  <Loader2 className="w-10 h-10 opacity-20" />
                               </div>
                               <div className="absolute inset-0 flex items-center justify-center">
                                  <Zap className="w-6 h-6 text-ink-muted/40 animate-pulse" />
                               </div>
                            </div>
                            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-ink-muted/50">Connecting</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-8 text-center md:text-left">
                      <div className="space-y-4">
                        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-elevated border border-line-strong rounded-full">
                          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-ink-muted tracking-[0.2em] uppercase">Security Protocol Active</span>
                        </div>
                        <h2 className="text-3xl font-semibold text-ink tracking-tight leading-tight">Connect WhatsApp</h2>
                        <p className="text-base text-ink-subtle leading-relaxed max-w-sm">
                          Synchronize your encrypted communications with the Codevora Neural Core. Scan the code to begin secure orchestration.
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <button 
                          onClick={async () => {
                            try {
                              await fetch(`http://localhost:5000/api/whatsapp/start`, { method: 'POST' });
                            } catch (e) {
                              alert('Connection failed.');
                            }
                          }}
                          className="w-full py-3.5 rounded-xl text-xs font-semibold tracking-[0.2em] uppercase transition-opacity bg-accent text-accent-fg hover:opacity-90"
                        >
                          Establish Signal
                        </button>
                        <p className="text-[10px] text-ink-subtle text-center">Connection is handled locally on this device.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full h-full max-w-7xl bg-surface border border-line rounded-2xl flex overflow-hidden"
                >
                  {/* Sidebar */}
                  <div className="w-[400px] border-r border-line flex flex-col bg-surface">
                    <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xl font-bold text-ink tracking-tight">Messages</h3>
                         <div className="flex items-center space-x-2">
                           <button 
                             onClick={async (e) => {
                               e.stopPropagation();
                               try {
                                 const res = await fetch('http://localhost:5000/api/whatsapp/toggle-autoreply', { method: 'POST' });
                                 if (res.ok) {
                                   const data = await res.json();
                                   setIsAutoReplyEnabled(data.autoReply);
                                 }
                               } catch (e) {}
                             }}
                             className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 transition-all ${
                               isAutoReplyEnabled 
                                 ? 'bg-elevated border-line-strong text-ink-muted' 
                                 : 'bg-hover border-line text-ink-muted hover:bg-hover'
                             }`}
                             title="Toggle Neural Auto-Reply"
                           >
                              <Zap className={`w-3.5 h-3.5 ${isAutoReplyEnabled ? 'text-ink-muted' : 'text-ink-muted'}`} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Auto-Reply</span>
                           </button>

                           <button 
                             onClick={async () => {
                               try {
                                 await fetch('http://localhost:5000/api/whatsapp/sync', { method: 'POST' });
                                 const res = await fetch('http://localhost:5000/api/whatsapp/contacts');
                                 if (res.ok) {
                                   const data = await res.json();
                                   setWhatsappContacts(data.contacts);
                                 }
                               } catch (e) {
                                 alert("Sync failed.");
                               }
                             }}
                             className="p-2 bg-hover rounded-xl hover:bg-hover hover:text-ink-muted cursor-pointer transition-all flex items-center space-x-2 border border-line"
                             title="Force Sync Matrix"
                           >
                              <Sparkles className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest px-1">Sync</span>
                           </button>
                         </div>
                      </div>
                      
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Globe className="w-4 h-4 text-ink-muted group-focus-within:text-ink-muted transition-colors" />
                         </div>
                         <input 
                           type="text"
                           placeholder="Search signals..."
                           value={whatsappSearch}
                           onChange={(e) => setWhatsappSearch(e.target.value)}
                           className="w-full bg-hover border border-line rounded-2xl py-3.5 pl-11 pr-4 text-sm text-ink placeholder-ink-subtle outline-none focus:border-line-strong transition-all focus:bg-surface/[0.08]"
                         />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-1">
                      {whatsappContacts
                        .filter(c => c.name.toLowerCase().includes(whatsappSearch.toLowerCase()))
                        .map((contact) => (
                        <button
                          key={contact.number}
                          onClick={() => setSelectedWhatsappNumber(contact.number)}
                          className={`w-full text-left p-4 rounded-2xl transition-all flex items-center space-x-4 group relative ${
                            selectedWhatsappNumber === contact.number
                              ? 'bg-hover shadow-lg'
                              : 'hover:bg-hover'
                          }`}
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shadow-inner ${
                            selectedWhatsappNumber === contact.number ? 'bg-accent text-accent-fg' : 'bg-hover text-ink-subtle'
                          }`}>
                            {contact.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                               <p className="text-sm font-bold text-ink truncate pr-2">{contact.name}</p>
                               <span className="text-[10px] text-ink-muted font-medium">
                                 {contact.lastMessage ? new Date(contact.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                               </span>
                            </div>
                            <p className="text-xs text-ink-muted truncate group-hover:text-ink-subtle transition-colors">
                              {contact.lastMessage?.body || 'No messages yet'}
                            </p>
                          </div>
                          {selectedWhatsappNumber === contact.number && (
                            <motion.div layoutId="active-indicator" className="absolute left-0 w-1 h-8 bg-accent rounded-full" />
                          )}
                        </button>
                      ))}
                      
                      {whatsappContacts.length === 0 && (
                        <div className="text-center py-20 opacity-20">
                           <MessageSquare className="w-12 h-12 text-ink-muted mx-auto mb-4" />
                           <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">Scanning frequency...</p>
                        </div>
                      )}
                    </div>

                    <div className="p-8 border-t border-line">
                       <button 
                         onClick={async () => {
                           try {
                             await fetch('http://localhost:5000/api/whatsapp/stop', { method: 'POST' });
                             setIsWhatsappConnected(false);
                             setSelectedWhatsappNumber(null);
                           } catch (e) {}
                         }}
                         className="w-full py-4 bg-red-500/5 text-red-500 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-500/10 transition-all flex items-center justify-center space-x-2"
                       >
                          <Power className="w-3 h-3" />
                          <span>Kill Matrix</span>
                       </button>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col bg-surface relative">
                    {!selectedWhatsappNumber ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                        <div className="relative mb-8">
                           <div className="w-32 h-32 bg-elevated rounded-2xl flex items-center justify-center animate-pulse">
                              <ShieldCheck className="w-16 h-16 text-ink-muted/20" />
                           </div>
                           <div className="absolute -top-4 -right-4 w-12 h-12 bg-elevated rounded-2xl flex items-center justify-center">
                              <Zap className="w-5 h-5 text-ink-muted/40" />
                           </div>
                        </div>
                        <h4 className="text-2xl font-light text-ink tracking-tight">Select a Neural Signal</h4>
                        <p className="text-ink-muted mt-3 max-w-sm text-sm leading-relaxed">
                          Secure end-to-end encrypted channel awaiting selection. All data remains within your local neural core.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="p-8 border-b border-line flex items-center justify-between bg-surface">
                          <div className="flex items-center space-x-5">
                            <div className="w-14 h-14 rounded-2xl bg-elevated border border-line-strong flex items-center justify-center text-ink-muted text-xl font-bold">
                               {whatsappContacts.find(c => c.number === selectedWhatsappNumber)?.name[0]}
                            </div>
                            <div>
                               <h4 className="text-lg font-bold text-ink tracking-tight">
                                 {whatsappContacts.find(c => c.number === selectedWhatsappNumber)?.name}
                               </h4>
                               <div className="flex items-center space-x-2 mt-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 " />
                                  <span className="text-[10px] text-ink-muted font-bold uppercase tracking-widest">Active Connection</span>
                               </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                             <div className="p-3 bg-hover rounded-2xl text-ink-subtle hover:text-ink cursor-pointer transition-all">
                                <Settings className="w-5 h-5" />
                             </div>
                             <div className="p-3 bg-hover rounded-2xl text-ink-subtle hover:text-ink cursor-pointer transition-all">
                                <Trash2 className="w-5 h-5" />
                             </div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6 relative">
                          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#00ffff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                          
                          {whatsappMessages.map((msg, i) => (
                            <motion.div 
                              key={msg.id || i} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[65%] p-5 rounded-2xl shadow-xl relative ${
                                msg.type === 'outgoing'
                                  ? 'bg-accent text-accent-fg rounded-tr-none'
                                  : 'bg-surface border border-line text-ink rounded-tl-none'
                              }`}>
                                <p className="text-[13px] leading-relaxed font-medium">{msg.body}</p>
                                <div className={`flex items-center space-x-2 mt-2 opacity-50 text-[9px] font-bold ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                                   <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                   {msg.type === 'outgoing' && <CheckCircle2 className="w-3 h-3" />}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>

                        <div className="p-8 border-t border-line bg-surface">
                           <div className="relative">
                              <input 
                                type="text" 
                                placeholder="Transmit data..."
                                className="w-full bg-hover border border-line rounded-2xl py-4 pl-6 pr-32 text-sm text-ink placeholder-ink-subtle outline-none focus:border-line-strong transition-all focus:bg-surface/[0.08]"
                                disabled
                              />
                              <div className="absolute right-3 inset-y-0 flex items-center space-x-2">
                                 <div className="p-2 bg-hover rounded-xl text-ink-muted cursor-not-allowed">
                                    <Mic className="w-4 h-4" />
                                 </div>
                                 <button className="px-5 py-2 bg-elevated text-ink-muted rounded-xl text-[10px] font-bold uppercase tracking-widest border border-line-strong opacity-50 cursor-not-allowed">
                                    Send
                                 </button>
                              </div>
                           </div>
                           <p className="text-[8px] text-ink-muted text-center mt-4 uppercase tracking-[0.2em]">Neural Dispatcher Offline in Monitor Mode</p>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          ) : showTelegramBot ? (
            <div className="h-full flex flex-col items-center justify-center p-4 relative w-full">
              <div className="max-w-md w-full bg-surface border border-line rounded-2xl p-8  relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Send className="w-48 h-48 text-ink-muted -mr-10 -mt-10" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-elevated border border-line-strong flex items-center justify-center  rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                    <Send className="w-8 h-8 text-ink-muted -ml-1 mt-1" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-light text-ink tracking-wider">Telegram Agent</h2>
                    <p className="text-[10px] text-ink-subtle tracking-[0.2em] uppercase mt-2 font-semibold">Deploy Codevora to Telegram</p>
                  </div>
                  
                  <div className="w-full space-y-4 text-left mt-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-ink-muted tracking-widest uppercase font-semibold pl-1">Bot Token</label>
                      <input 
                        type="password"
                        placeholder="1234567890:AAH_XXXXXXXXXXXXXXX"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink focus:ring-1 focus:ring-line-strong focus:border-line-strong outline-none transition-all placeholder-ink-subtle "
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-ink-muted tracking-widest uppercase font-semibold pl-1 flex items-center justify-between">
                        <span>Owner Chat ID</span>
                        <span className="text-ink-subtle text-[8px]">REQUIRED FOR SECURITY</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. 123456789"
                        value={telegramAdminId}
                        onChange={(e) => setTelegramAdminId(e.target.value)}
                        className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink focus:ring-1 focus:ring-line-strong focus:border-line-strong outline-none transition-all placeholder-ink-subtle "
                      />
                    </div>
                    
                    <div className="space-y-1.5 relative">
                      <label className="text-[10px] text-ink-muted tracking-widest uppercase font-semibold pl-1">Neural Core</label>
                      <select 
                        value={telegramModelId}
                        onChange={(e) => setTelegramModelId(e.target.value)}
                        className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm text-ink focus:ring-1 focus:ring-line-strong focus:border-line-strong outline-none appearance-none cursor-pointer"
                      >
                        <option value="default">{activeModel ? activeModel.displayName : 'System Default AI'}</option>
                        {customModels.filter(m => m.isActive).map(m => (
                          <option key={m.id} value={m.id}>{m.displayName}</option>
                        ))}
                      </select>
                      <ChevronRight className="w-4 h-4 text-ink-subtle absolute right-4 top-[38px] rotate-90 pointer-events-none" />
                    </div>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      if (!telegramBotToken || !telegramAdminId) {
                        alert("Please provide both Bot Token and Owner ID.");
                        return;
                      }

                      const endpoint = isTelegramBotRunning ? 'stop' : 'start';
                      const body = isTelegramBotRunning 
                        ? { token: telegramBotToken }
                        : { token: telegramBotToken, adminId: telegramAdminId, modelId: telegramModelId };

                      try {
                        const res = await fetch(`http://localhost:5000/api/telegram/${endpoint}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(body)
                        });

                        if (res.ok) {
                          setIsTelegramBotRunning(!isTelegramBotRunning);
                        } else {
                          const err = await res.json();
                          alert(`Telegram API Error: ${err.error}`);
                        }
                      } catch (e) {
                        alert("Backend connection failed. Is the server running?");
                      }
                    }}
                    className={`w-full py-3.5 rounded-xl font-bold tracking-widest uppercase text-xs transition-all flex items-center justify-center space-x-2 relative overflow-hidden group ${
                      isTelegramBotRunning 
                        ? 'bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/40'
                        : 'bg-accent text-accent-fg border border-transparent hover:opacity-90'
                    }`}
                  >
                    {isTelegramBotRunning ? (
                      <>
                        <Power className="w-4 h-4" />
                        <span>Terminate Bot</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Deploy Agent</span>
                      </>
                    )}
                  </button>
                  
                  {isTelegramBotRunning && (
                     <div className="flex items-center space-x-2 text-[10px] text-ink-muted font-mono bg-surface px-4 py-2 rounded-full border border-line ">
                        <div className="relative flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-accent animate-ping absolute" />
                          <div className="w-1.5 h-1.5 rounded-full bg-accent relative" />
                        </div>
                        <span className="tracking-wider">POLLING TELEGRAM API</span>
                     </div>
                  )}
                </div>
              </div>
            </div>
          ) : showModelManager ? (
            <div className="h-full flex flex-col p-4 max-w-4xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-light text-ink tracking-wider">Custom Models</h2>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Add Custom Model
                </button>
              </div>

              <div className="space-y-4">
                {customModels.map(model => (
                  <div 
                    key={model.id}
                    className="p-6 rounded-2xl border border-line bg-surface flex justify-between items-center transition-colors hover:bg-elevated"
                  >
                    <div className="flex items-center space-x-4">
                      <Database className="w-5 h-5 text-ink-muted" />
                      <span className="text-sm text-ink tracking-wide font-light">{model.displayName}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      {model.isActive ? (
                        <button 
                          onClick={() => toggleModelActivation(model.id)}
                          className="px-3 py-1 rounded-full bg-elevated text-green-400 text-[10px] font-medium border border-green-900/40 tracking-wider hover:bg-green-900/50 flex items-center space-x-1.5"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Deactivate</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleModelActivation(model.id)}
                          className="px-3 py-1 rounded-full bg-surface text-ink-muted text-[10px] font-medium border border-line tracking-wider hover:bg-elevated flex items-center space-x-1.5"
                        >
                          <Power className="w-3 h-3" />
                          <span>Activate</span>
                        </button>
                      )}
                      <button 
                        onClick={() => handleEditModel(model)}
                        className="text-orange-400 text-[10px] hover:text-orange-300 transition-colors font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch(`http://localhost:5000/api/models/${model.id}`, { method: 'DELETE' });
                            if (response.ok) {
                              setCustomModels(prev => prev.filter(m => m.id !== model.id));
                            }
                          } catch (err) {
                            console.error('Delete failed:', err);
                          }
                        }}
                        className="text-red-400 text-[10px] hover:text-red-300 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isListening && activeChat.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-8 pb-16 px-4"
            >
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-ink mb-1">
                  Say hello to Voice
                </h2>
                <p className="text-ink-subtle text-[10px] tracking-widest uppercase font-semibold">Codevora OMEGA Continuous AI Stream</p>
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
                    className="flex items-start space-x-3.5 p-3.5 rounded-xl border border-line bg-surface text-left transition-all hover:bg-elevated hover:border-line-strong"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-elevated border border-line text-ink-muted">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-ink tracking-wide">{item.title}</h4>
                      <p className="text-[11px] text-ink-subtle mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : activeChat.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-6 pb-16"
            >
              <Orb size={56} />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">Codevora AI</h2>
                <p className="text-sm text-ink-muted max-w-md">
                  Good to have you back, <span className="font-medium text-ink">{userName}</span>.{' '}
                  {hasApiKey ? 'System is online. How can I assist you?' : 'All systems operational. How can I assist you?'}
                </p>
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
                  className={`flex w-full min-w-0 items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                    msg.role === 'assistant'
                      ? 'bg-elevated border-line '
                      : 'bg-hover border-line'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-ink" /> : <User className="w-4 h-4 text-ink-subtle" />}
                  </div>

                  <div className={`min-w-0 max-w-[78%] space-y-1 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-full min-w-0 overflow-hidden break-words px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-surface border border-line text-ink rounded-tl-none '
                        : 'bg-elevated border border-line text-ink rounded-tr-none'
                    }`}>
                      {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                    </div>
                    <span className="text-[10px] text-ink-subtle px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator (Autonomous Agent Pipeline) */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div key="typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start space-x-3">
                    <Orb size={32} thinking />
                    
                    <div className="p-3 bg-surface border border-line rounded-xl space-y-1.5">
                      <p className="text-[9px] text-ink-subtle tracking-widest uppercase mb-1 font-semibold">Autonomous Pipeline</p>
                      {phases.map((ph, idx) => (
                         <div key={idx} className={`flex items-center space-x-2 transition-opacity duration-300 ${currentPhase >= idx ? 'opacity-100' : 'opacity-40'}`}>
                           {currentPhase > idx ? (
                             <CheckCircle2 className="w-3.5 h-3.5 text-ink-muted" />
                           ) : currentPhase === idx ? (
                             <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader className="w-3 h-3 text-ink-muted" /></motion.div>
                           ) : (
                             <Circle className="w-3 w-3 text-ink-subtle" />
                           )}
                           <span className={`font-mono text-[9px] ${currentPhase === idx ? 'text-ink' : currentPhase > idx ? 'text-ink-muted' : 'text-ink-subtle'}`}>
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
                        ? 'No API key configured. Please check your .env file or model settings.'
                        : error === 'LIMIT_EXCEEDED'
                        ? '⚠️ Usage limits reached. Please Upgrade to Pro for unlimited request cycles.'
                        : error === 'no_active_model'
                        ? 'No model is active. Activate one model before sending a request.'
                        : error.includes('401')
                        ? `Authentication Failed: Your API Key for ${activeModel?.displayName || 'the active model'} is incorrect or expired. Please edit the model and update the key.`
                        : error.startsWith('Custom model failed')
                        ? error
                        : `API Error: ${error}`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Bar ─── */}
        {!showBuildPage && !showAICodingIDE && !showModelHub && !showModelManager && !showAppBuilder && !showTelegramBot && !showWhatsAppManager && !showAutomationControl && !externalPlatform && (
          <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-line bg-surface">
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
                    <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }} className="absolute inset-0 rounded-full bg-red-500/40 pointer-events-none" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 rounded-full border border-red-500/50 pointer-events-none" />
                    <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 border border-red-500">
                      <Mic className="w-8 h-8 text-ink" />
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
                  <button className="flex-shrink-0 p-2.5 rounded-xl border border-line text-ink-subtle hover:text-ink-muted hover:border-line transition-all mb-0.5">
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
                      placeholder="Kuch bhi poochho, ya batao kya banana hai..."
                      className="w-full bg-surface border border-line focus:border-line-strong focus:ring-1 focus:ring-line-strong rounded-xl px-4 py-3 pr-12 text-sm text-ink placeholder-ink-subtle outline-none resize-none transition-all leading-relaxed"
                      style={{ minHeight: '48px', maxHeight: '160px' }}
                    />
                    <button 
                      type="button"
                      onClick={startListening}
                      className="absolute right-3 bottom-3 transition-colors text-ink-subtle hover:text-ink-muted"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isTyping}
                    className="flex-shrink-0 p-2.5 rounded-xl bg-accent text-accent-fg hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed mb-0.5"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="text-center text-[11px] text-ink-subtle mt-2">
              Codevora AI can make mistakes. Verify important information.
            </p>
          </div>
        )}
      </div>
      
      {/* ➕ ADD CUSTOM MODEL MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-scrim backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-surface rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                <h3 className="text-lg font-semibold text-ink">{editingModelId ? 'Edit Model' : 'Add Model'}</h3>
                <button onClick={() => { setShowAddModal(false); setEditingModelId(null); }} className="text-ink-subtle hover:text-ink-muted p-1 text-xl">×</button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Warning Banner */}
                <div className="flex items-center space-x-3 p-3 bg-elevated border border-line rounded-xl text-ink-muted text-xs">
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-ink font-bold">!</div>
                  <p>By adding an external model, you acknowledge and agree to use it at your own risk.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Provider */}
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-ink-muted flex items-center">
                      <span className="text-red-500 mr-1">*</span>Provider
                    </label>
                      <div className="relative">
                        <select 
                          value={newModel.provider}
                          onChange={(e) => {
                            const p = e.target.value;
                            setNewModel({
                              ...newModel, 
                              provider: p,
                              baseUrl: p === 'Ollama' ? 'http://localhost:11434/v1' : newModel.baseUrl,
                              protocol: 'OpenAI'
                            });
                          }}
                          className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:ring-2 focus:ring-line-strong focus:border-line-strong outline-none appearance-none"
                        >
                          <option value="Ollama">Ollama (Local)</option>
                          <option value="Z.ai">Z.ai</option>
                          <option value="OpenAI">OpenAI</option>
                          <option value="Anthropic">Anthropic</option>
                          <option value="DeepSeek">DeepSeek</option>
                          <option value="MiniMax">MiniMax</option>
                          <option value="Kimi (Moonshot)">Kimi (Moonshot)</option>
                          <option value="Custom">Custom</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle rotate-90" />
                      </div>
                  </div>

                  {/* Model ID */}
                  <div className={newModel.provider === 'Ollama' ? 'col-span-2 space-y-1.5' : 'space-y-1.5'}>
                    <label className="text-xs font-semibold text-ink-muted flex items-center justify-between">
                      <span><span className="text-red-500 mr-1">*</span>Model ID</span>
                      {newModel.provider === 'Ollama' && (
                        <button 
                          onClick={scanLocalModels}
                          disabled={isScanning}
                          className="text-[10px] text-ink-subtle hover:text-ink-subtle font-bold uppercase tracking-wider flex items-center space-x-1"
                        >
                          {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                          <span>Scan Local Models</span>
                        </button>
                      )}
                    </label>
                    <input 
                      type="text"
                      placeholder={newModel.provider === 'Ollama' ? "e.g. qwen2.5-coder:3b" : "Please enter a model ID"}
                      value={newModel.modelId}
                      onChange={(e) => setNewModel({...newModel, modelId: e.target.value, displayName: newModel.displayName || e.target.value})}
                      className="w-full bg-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:ring-2 focus:ring-line-strong focus:border-line-strong outline-none"
                    />
                  </div>

                  {/* Display Name */}
                  {newModel.provider !== 'Ollama' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-muted">Display Name</label>
                      <input 
                        type="text"
                        placeholder="Please enter a display name"
                        value={newModel.displayName}
                        onChange={(e) => setNewModel({...newModel, displayName: e.target.value})}
                        className="w-full bg-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:ring-2 focus:ring-line-strong focus:border-line-strong outline-none"
                      />
                    </div>
                  )}

                  {/* API Key & Protocol - Only for Cloud */}
                  {newModel.provider !== 'Ollama' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-ink-muted flex items-center">
                          {newModel.provider !== 'Custom' && <span className="text-red-500 mr-1">*</span>}
                          {newModel.provider} API Key
                        </label>
                        <div className="relative">
                          <input 
                            type="password"
                            placeholder={newModel.provider === 'Custom' ? "Please enter API Key (optional)" : `Please enter your ${newModel.provider} API Key`}
                            value={newModel.apiKey}
                            onChange={(e) => setNewModel({...newModel, apiKey: e.target.value})}
                            className="w-full bg-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:ring-2 focus:ring-line-strong focus:border-line-strong outline-none pr-10"
                          />
                          <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-ink-muted">API Protocol</label>
                        <div className="relative">
                          <select 
                            value={newModel.protocol}
                            onChange={(e) => setNewModel({...newModel, protocol: e.target.value})}
                            className="w-full bg-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:ring-2 focus:ring-line-strong focus:border-line-strong outline-none appearance-none"
                          >
                            <option value="OpenAI">OpenAI</option>
                            <option value="Anthropic">Anthropic</option>
                          </select>
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle rotate-90" />
                        </div>
                      </div>

                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-ink-muted">Base URL</label>
                        <input 
                          type="text"
                          placeholder="https://open.bigmodel.cn/api/paas/v4"
                          value={newModel.baseUrl}
                          onChange={(e) => setNewModel({...newModel, baseUrl: e.target.value})}
                          className="w-full bg-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:ring-2 focus:ring-line-strong focus:border-line-strong outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Connectivity Test */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                  testResult === 'success' ? 'bg-elevated border-green-900/50' : 
                  testResult === 'error' ? 'bg-red-950/30 border-red-900/50' : 'bg-elevated border-line'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      isTesting ? 'bg-orange-400 animate-pulse' :
                      testResult === 'success' ? 'bg-green-500' : 
                      testResult === 'error' ? 'bg-red-500' : 'bg-line-strong'
                    }`} />
                    <div>
                      <p className={`text-xs font-semibold ${
                        testResult === 'success' ? 'text-green-400' : 
                        testResult === 'error' ? 'text-red-400' : 'text-ink'
                      }`}>
                        {isTesting ? 'Testing...' : 
                         testResult === 'success' ? 'Connection Successful' : 
                         testResult === 'error' ? 'Connection Failed' : 'Not tested yet'}
                      </p>
                      <p className="text-[10px] text-ink-subtle">
                        {testResult === 'error' ? 'Check your API Key and Base URL' : 'Sends a real request using the current config to verify the endpoint.'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleTestConnectivity}
                    disabled={isTesting}
                    className="px-4 py-1.5 border border-line rounded-lg text-xs font-medium text-ink-muted hover:bg-surface transition-all disabled:opacity-50"
                  >
                    {isTesting ? 'Testing...' : 'Connectivity Test'}
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-elevated border-t border-line">
                <button 
                  onClick={() => { setShowAddModal(false); setEditingModelId(null); }}
                  className="px-6 py-2 text-sm font-medium text-ink-muted hover:text-ink transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddModel}
                  disabled={isSaving}
                  className={`px-8 py-2 bg-accent text-accent-fg text-sm font-medium rounded-xl transition-opacity flex items-center space-x-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  {isSaving && <div className="w-3 h-3 border-2 border-line border-t-white rounded-full animate-spin" />}
                  <span>{editingModelId ? (isSaving ? 'Updating...' : 'Update') : (isSaving ? 'Adding...' : 'Add')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 💻 CODE GENERATOR WORKSPACE (Right Panel) */}
      <AnimatePresence>
        {generatedCode && (
          <motion.div
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
            className="hidden lg:flex w-[480px] border-l border-line bg-surface flex-col flex-shrink-0 relative z-20"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-line bg-surface">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-ink-muted" />
                <span className="text-ink text-xs font-semibold tracking-wider uppercase">Workspace Output</span>
              </div>
              <button 
                onClick={() => setGeneratedCode(null)}
                className="text-ink-subtle hover:text-ink p-1 text-lg rounded-md hover:bg-elevated"
              >
                ×
              </button>
            </div>

            {/* Sub Nav / Tabs */}
            <div className="flex items-center space-x-1 px-4 py-2 bg-surface border-b border-line text-[10px] text-ink-subtle font-mono">
              <span className="px-2 py-1 bg-surface border border-line rounded text-ink">
                generated_output.{codeLanguage === 'javascript' || codeLanguage === 'js' ? 'js' : codeLanguage === 'python' || codeLanguage === 'py' ? 'py' : codeLanguage === 'typescript' || codeLanguage === 'ts' || codeLanguage === 'tsx' ? 'ts' : 'txt'}
              </span>
            </div>

            {/* Code Content */}
            <div className="scrollbar-none flex-1 overflow-auto p-4 bg-surface font-mono text-xs text-ink leading-relaxed selection:bg-elevated">
              <pre className="scrollbar-none whitespace-pre overflow-x-auto">
                <code>{generatedCode}</code>
              </pre>
            </div>

            {/* Footer Workspace Action */}
            <div className="p-4 border-t border-line bg-surface flex items-center justify-between">
              <button 
                onClick={() => navigator.clipboard.writeText(generatedCode || '')}
                className="px-3 py-1.5 text-xs border border-line rounded bg-surface text-ink hover:border-line-strong transition-colors"
              >
                Copy Code
              </button>
              <span className="text-[10px] text-ink-subtle font-mono uppercase">{codeLanguage || 'text'} module</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚙️ SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div className="absolute inset-0 bg-scrim backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-ink-muted" />
                  <h3 className="text-ink text-sm font-semibold tracking-wider uppercase">Settings</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-ink-muted" />
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">Appearance</p>
                </div>
                <p className="text-[11px] text-ink-subtle mb-3">Choose your color mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_MODES.map((mode) => {
                    const active = theme === mode.value;
                    return (
                      <button
                        key={mode.value}
                        onClick={() => setTheme(mode.value)}
                        aria-pressed={active}
                        className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border text-[11px] font-medium tracking-wide transition-all ${
                          active
                            ? 'border-line-strong bg-elevated text-ink '
                            : 'border-line text-ink-subtle hover:border-line hover:text-ink'
                        }`}
                      >
                        <mode.icon className="w-4 h-4" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4 mt-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-ink-muted" />
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">Usage & Billing</p>
                </div>
                <div className="flex justify-between items-center text-[10px] text-ink-subtle tracking-widest uppercase mb-1.5 font-semibold">
                  <span>Usage Limit</span>
                  <span className="text-ink-muted">{usageCount}/{maxUsage}</span>
                </div>
                <div className="h-1.5 w-full bg-surface rounded-full border border-line overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.min((usageCount / maxUsage) * 100, 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => alert("SaaS Stripe checkout loop triggered: Creating subscription checkout session via backend Node API...")}
                  className="w-full mt-3 py-1.5 text-[10px] border border-line rounded-lg bg-surface text-ink-muted hover:border-line-strong hover:bg-elevated transition-all font-semibold tracking-wider text-center"
                >
                  UPGRADE TIER
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔐 SECURITY MODAL */}
      <AnimatePresence>
        {showSecurity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSecurity(false)}>
            <div className="absolute inset-0 bg-scrim backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60 p-6 max-h-[85vh] overflow-y-auto scrollbar-none"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] text-ink-subtle tracking-widest uppercase font-semibold mb-1">Account <span className="text-ink-subtle">/</span> Security</p>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-ink-muted" />
                    <h3 className="text-ink text-sm font-semibold tracking-wider uppercase">Security</h3>
                  </div>
                </div>
                <button onClick={() => setShowSecurity(false)} className="p-1 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-ink-subtle mb-4">Manage your password &amp; account security.</p>

              <div className="rounded-xl border border-line bg-surface p-4 mb-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Lock className="w-3.5 h-3.5 text-ink-muted" />
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">Change password</p>
                </div>
                <p className="text-[11px] text-ink-subtle mb-3">Use a strong password to keep your Ashna AI account secure.</p>
                <label className="block text-[10px] text-ink-subtle tracking-wider uppercase mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-subtle outline-none focus:border-line-strong transition-all mb-3"
                />
                <label className="block text-[10px] text-ink-subtle tracking-wider uppercase mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-subtle outline-none focus:border-line-strong transition-all mb-3"
                />
                {passwordMsg && (
                  <p className={`text-[11px] mb-3 ${passwordMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{passwordMsg.text}</p>
                )}
                <button
                  onClick={handleUpdatePassword}
                  className="w-full py-2 text-xs rounded-lg bg-elevated border border-line-strong text-ink hover:bg-elevated transition-all font-semibold tracking-wider"
                >
                  Update password
                </button>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <Power className="w-3.5 h-3.5 text-ink-muted" />
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">Account access</p>
                </div>
                <p className="text-[11px] text-ink-subtle mb-3">Sign out securely from this device.</p>
                <button
                  onClick={() => { setShowSecurity(false); onLogout?.(); }}
                  className="w-full py-2 text-xs rounded-lg border border-line text-ink-muted/80 hover:text-red-400 hover:border-red-500/40 hover:bg-red-950/20 transition-all font-semibold tracking-wider"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 💳 SUBSCRIPTION MODAL */}
      <AnimatePresence>
        {showSubscription && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSubscription(false)}>
            <div className="absolute inset-0 bg-scrim backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60 p-6 max-h-[85vh] overflow-y-auto scrollbar-none"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] text-ink-subtle tracking-widest uppercase font-semibold mb-1">Account <span className="text-ink-subtle">/</span> Subscription</p>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-ink-muted" />
                    <h3 className="text-ink text-sm font-semibold tracking-wider uppercase">Subscription</h3>
                  </div>
                </div>
                <button onClick={() => setShowSubscription(false)} className="p-1 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 tracking-wider">Live</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-line bg-surface text-ink-subtle tracking-wider">Not started</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-line-strong bg-elevated text-ink tracking-wider">Included</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 tracking-wider">Auto-pay</span>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-ink-muted" />
                    <p className="text-xs font-semibold text-ink uppercase tracking-wider">Free Plan</p>
                  </div>
                  <button
                    onClick={() => alert("Opening plan upgrade...")}
                    className="px-3 py-1.5 text-[10px] rounded-lg bg-elevated border border-line-strong text-ink hover:bg-elevated transition-all font-semibold tracking-wider"
                  >
                    Upgrade plan
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4 mb-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-ink-muted" />
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">Ongoing Access</p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-ink-subtle tracking-wider uppercase">Credits left</span>
                  <span className="text-sm font-semibold text-ink">0.727</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 tracking-wider">Active</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-line-strong bg-elevated text-ink tracking-wider">Free tier</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-line bg-surface text-ink-subtle tracking-wider">No expiry</span>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center space-x-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-ink-muted" />
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">Need Invoices?</p>
                </div>
                <p className="text-[11px] text-ink-subtle mb-3">View official GST tax invoices, past transactions, and payment history.</p>
                <button
                  onClick={() => alert("Opening invoice history...")}
                  className="w-full py-2 text-xs rounded-lg bg-elevated border border-line-strong text-ink hover:bg-elevated transition-all font-semibold tracking-wider"
                >
                  View Invoices
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JarvisChat;
