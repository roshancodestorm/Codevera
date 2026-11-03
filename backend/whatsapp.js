import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import fs from 'fs';

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let qrCodeData   = null;
let waStatus     = 'disconnected'; // 'disconnected' | 'qr_ready' | 'connected' | 'error'
let waClient     = null;
let autoReplyOn  = false;          // toggle from dashboard
let stats        = { totalIn: 0, totalOut: 0, autoReplies: 0, connectedAt: null };

// contacts: { [number]: { name, number, messages: [] } }
const contacts   = {};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function pushMessage(number, name, body, type) {
  if (!contacts[number]) contacts[number] = { name, number, messages: [] };
  contacts[number].name = name; // update name if changed
  contacts[number].messages.unshift({
    id: Date.now().toString() + Math.random(),
    from: type === 'outgoing' ? 'You' : name,
    body,
    type,
    timestamp: new Date().toISOString(),
  });
  if (contacts[number].messages.length > 100) contacts[number].messages.pop();
}

// ═══════════════════════════════════════════
// CHANDAN'S PERSONA — System Prompt
// ═══════════════════════════════════════════
const SYSTEM_PROMPT = `You are Chandan, a 23-year-old Indian guy chatting with friends on WhatsApp.
CRITICAL RULES:
1. NEVER say you are an AI, bot, or assistant. You are Chandan.
2. Reply ONLY in short Hinglish (Hindi written in English).
3. NEVER use formal English (No "how are you", "I am doing well", "assist").
4. Keep replies extremely short (1-5 words).
5. DO NOT use exclamation marks (!) or full stops (.). Type mostly in lowercase like a real person.

CONVERSATION EXAMPLES (Copy this exact casual style):

User: "bol bhaiya kaise ho"
You: "main badhiya, tu bata"

User: "hello"
You: "ha bolo"

User: "ai ho na"
You: "pagal hai kya bhai, chandan hu"

User: "bot hai kya tu"
You: "kya foonk ke aaya hai be"

User: "kaha hai bhai"
You: "ghar pe hu"

User: "bhai 50 rs paytm kar de"
You: "nahi bhai paise nahi hai"

User: "kya kar raha hai"
You: "kuch nahi bas aise hi"

Now, reply to the user naturally as Chandan.`;

// Per-contact conversation history (last 6 messages for context)
const chatHistory = {};

async function askOllama(userNumber, text, senderName) {
  // Init history for this contact
  if (!chatHistory[userNumber]) chatHistory[userNumber] = [];
  
  // Add user message to history
  chatHistory[userNumber].push({ role: 'user', content: text });
  
  // Provide current time and sender context
  const currentDateTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const timeContext = `[SYSTEM CONTEXT: Current Date & Time is ${currentDateTime}. The person messaging you is named "${senderName}". Remember: YOUR name is Chandan.]`;

  // Keep only last 6 exchanges (12 messages) for context
  if (chatHistory[userNumber].length > 12) {
    chatHistory[userNumber] = chatHistory[userNumber].slice(-12);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'qwen2.5-coder:3b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: timeContext },
          ...chatHistory[userNumber]
        ],
        stream: false,
        options: { temperature: 0.75, num_predict: 120 },
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.error(`[WA OLLAMA] HTTP ${response.status}`);
      return null;
    }
    const data = await response.json();
    const reply = data?.message?.content?.trim();
    if (!reply) { console.error('[WA OLLAMA] Empty response'); return null; }

    // Add assistant reply to history
    chatHistory[userNumber].push({ role: 'assistant', content: reply });
    return reply;

  } catch (err) {
    clearTimeout(timer);
    console.error('[WA OLLAMA]', err.name === 'AbortError' ? '⏰ Timeout' : `❌ ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
export function initWhatsApp(app) {

  waClient = new Client({
    authStrategy: new LocalAuth({ clientId: 'jarvis-whatsapp' }),
    puppeteer: {
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
    webVersionCache: {
      type: 'none'
    }
  });

  // ─── QR ───
  waClient.on('qr', async (qr) => {
    waStatus  = 'qr_ready';
    qrCodeData = await qrcode.toDataURL(qr);
    console.log('📱 [WHATSAPP] QR Code ready — scan in dashboard');
  });

  // ─── Ready ───
  waClient.on('ready', () => {
    waStatus  = 'connected';
    qrCodeData = null;
    stats.connectedAt = new Date().toISOString();
    console.log('✅ [WHATSAPP] Connected!');
  });

  // ─── Auth failure ───
  waClient.on('auth_failure', () => {
    waStatus = 'error';
    console.error('❌ [WHATSAPP] Auth failed');
  });

  // ─── Disconnected ───
  waClient.on('disconnected', (reason) => {
    waStatus  = 'disconnected';
    qrCodeData = null;
    stats.connectedAt = null;
    console.log('❌ [WHATSAPP] Disconnected:', reason);
  });

  // ─── Incoming message → Auto-reply ───
  const processedIds = new Set(); // dedup — prevent double replies
  const handleIncoming = async (msg) => {
    if (msg.fromMe) return;                        // skip messages WE sent
    if (!msg.body)  return;                        // skip media-only
    if (processedIds.has(msg.id?.id)) return;      // skip already-processed
    processedIds.add(msg.id?.id);
    if (processedIds.size > 500) processedIds.clear(); // prevent memory leak

    const contact = await msg.getContact().catch(() => null);
    const name    = contact?.pushname || contact?.number || msg.from;
    const number  = msg.from;

    // ❌ GROUP MESSAGE — IGNORE
    if (msg.from.endsWith('@g.us')) {
      console.log(`[WA IN] Group message from ${name} — Skipping`);
      return;
    }

    stats.totalIn++;
    pushMessage(number, name, msg.body, 'incoming');
    console.log(`[WA IN] 📩 "${msg.body}" from ${name} (${number})`);

    // ── /ping test command ──
    if (msg.body.trim().toLowerCase() === '/ping') {
      await msg.reply('🤖 Neuro1 is alive! Auto-reply is ' + (autoReplyOn ? '✅ ON' : '❌ OFF'));
      return;
    }

    // Auto-reply guard
    if (!autoReplyOn) {
      console.log('[WA] Auto-reply is OFF — skipping');
      return;
    }

    console.log('[WA] 🤔 Asking Ollama...');
    const reply = await askOllama(number, msg.body, name);

    if (reply) {
      try {
        await waClient.sendMessage(msg.from, reply);
        stats.totalOut++;
        stats.autoReplies++;
        pushMessage(number, name, reply, 'outgoing');
        console.log(`[WA AUTO-REPLY ✅] "${reply.slice(0, 80)}..."`);
      } catch (sendErr) {
        console.error('[WA SEND ERROR]', sendErr.message);
      }
    } else {
      try {
        await waClient.sendMessage(msg.from, '⚠️ AI is loading, please resend in a moment!');
      } catch (_) {}
    }
  };

  // message_create catches all new messages (incoming + outgoing)
  // fromMe guard above ensures we only act on incoming
  waClient.on('message_create', handleIncoming);

  // ─── Start ───
  waClient.initialize().catch(err => {
    console.error('❌ [WHATSAPP INIT ERROR]', err.message);
    fs.appendFileSync('wa_error.log', `[${new Date().toISOString()}] INIT ERROR: ${err.message}\n`);
    waStatus = 'error';
  });

  console.log('📱 WhatsApp module loaded — waiting for QR...');

  // ════════════════════════════════════════
  // ENDPOINTS
  // ════════════════════════════════════════

  // Status + QR
  app.get('/api/whatsapp/status', (req, res) => {
    res.json({
      status: waStatus,
      qr: qrCodeData,
      autoReply: autoReplyOn,
      stats,
      contactCount: Object.keys(contacts).length,
    });
  });

  // Contacts list
  app.get('/api/whatsapp/contacts', (req, res) => {
    const list = Object.values(contacts).map(c => ({
      number: c.number,
      name: c.name,
      lastMessage: c.messages[0] || null,
      unread: c.messages.filter(m => m.type === 'incoming').length,
    }));
    res.json({ contacts: list });
  });

  // Messages for a specific contact
  app.get('/api/whatsapp/messages/:number', (req, res) => {
    const num  = decodeURIComponent(req.params.number);
    const chat = contacts[num];
    res.json({ messages: chat ? chat.messages : [] });
  });

  // All recent messages (flat list)
  app.get('/api/whatsapp/messages', (req, res) => {
    const all = Object.values(contacts)
      .flatMap(c => c.messages)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
    res.json({ messages: all });
  });

  // Send message
  app.post('/api/whatsapp/send', async (req, res) => {
    const { number, message } = req.body;
    if (waStatus !== 'connected') return res.status(400).json({ error: 'WhatsApp not connected.' });
    if (!number || !message)    return res.status(400).json({ error: 'number and message required.' });
    try {
      const chatId = number.includes('@') ? number : `${number.replace(/\D/g, '')}@c.us`;
      await waClient.sendMessage(chatId, message);
      stats.totalOut++;
      const name = contacts[chatId]?.name || chatId;
      pushMessage(chatId, name, message, 'outgoing');
      console.log(`[WA SEND] To ${chatId}: ${message}`);
      res.json({ success: true });
    } catch (err) {
      console.error('[WA SEND ERROR]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Toggle auto-reply
  app.post('/api/whatsapp/autoreply', (req, res) => {
    autoReplyOn = req.body.enabled !== undefined ? req.body.enabled : !autoReplyOn;
    console.log(`[WA] Auto-reply: ${autoReplyOn ? 'ON' : 'OFF'}`);
    res.json({ autoReply: autoReplyOn });
  });

  // Disconnect / logout
  app.post('/api/whatsapp/disconnect', async (req, res) => {
    try {
      await waClient.destroy();
      waStatus  = 'disconnected';
      qrCodeData = null;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Re-init
  app.post('/api/whatsapp/init', async (req, res) => {
    try {
      if (waClient) {
        try { await waClient.destroy(); } catch (_) {}
      }
      waStatus = 'disconnected';
      qrCodeData = null;
      
      // Re-initialize using the same logic
      waClient.initialize().catch(err => {
        console.error('❌ [WHATSAPP RE-INIT ERROR]', err.message);
        fs.appendFileSync('wa_error.log', `[${new Date().toISOString()}] RE-INIT ERROR: ${err.message}\n`);
        waStatus = 'error';
      });
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── GRACEFUL SHUTDOWN (NODEMON FIX) ───
  const cleanup = async () => {
    if (waClient) {
      console.log('🛑 [WHATSAPP] Destroying browser session...');
      try { await waClient.destroy(); } catch (_) {}
    }
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGUSR2', cleanup); // Specifically for nodemon restarts
}

// 🚀 EXPORTED HELPERS FOR DIRECT AUTOMATION
export async function sendWhatsAppMessage(number, message) {
  if (waStatus !== 'connected' || !waClient) {
    throw new Error('WhatsApp is not connected. Please scan the QR code in the dashboard first.');
  }
  
  const chatId = number.includes('@') ? number : `${number.replace(/\D/g, '')}@c.us`;
  await waClient.sendMessage(chatId, message);
  stats.totalOut++;
  const name = contacts[chatId]?.name || chatId;
  pushMessage(chatId, name, message, 'outgoing');
  console.log(`[DIRECT WA AUTO] Sent to ${chatId}`);
  return `WhatsApp message sent successfully to ${number} via built-in manager.`;
}

export function getWhatsAppStatus() {
  return waStatus;
}
