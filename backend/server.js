import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { initDb, query } from './db.js';
import TelegramBot from 'node-telegram-bot-api';
import nodemailer from 'nodemailer';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import canvaRouter from './canva_oauth.js';
import ideRouter from './ide.js';
import modelHubRouter from './modelhub.js';

const activeBots = new Map();
let whatsappClient = null;
let whatsappInitializing = false;
let whatsappQr = null;
let whatsappConnected = false;
let whatsappAutoReply = false;
let whatsappStatus = 'disconnected';
let whatsappError = null;
const whatsappContacts = {};
const whatsappProcessedMessageIds = new Set();
const whatsappChatProfiles = {};
const whatsappAvatarCache = {};
let whatsappSyncInFlight = null;

const WHATSAPP_PERSONAL_REPLY_PROMPT = `You are writing ONE WhatsApp reply that will be sent from the account owner's phone.

Identity and tone:
- Never reveal or imply AI, bot, assistant, automation, Jarvis, system, matrix, dashboard, or manager.
- No prefixes like "[Jarvis AI]", "AI:", "Bot:", "Assistant:", "Auto reply".
- Write as a normal Indian person texting casually in Hinglish.
- Keep it short: usually 2 to 8 words. Maximum 1 sentence.
- Use lowercase mostly. Avoid perfect grammar, formal English, and customer-support language.
- Do not overuse emojis. Only use an emoji if the other person used one and it naturally fits.
- Do not repeat previous outgoing replies.
- Do not give the same reaction to every sender. React to the exact incoming message and this specific chat.
- If two people send the same greeting, vary the wording naturally between chats.

Reaction rules:
- Greeting: reply like "ha bolo", "haan bol", "bol bhai", "kaise ho".
- "kaise ho": reply like "badhiya hu", "theek hu tu bata".
- "kya kar rahe": reply like "kuch nahi", "aise hi", "tu bata".
- Confusing message: ask "kya matlab", "samjha nahi", or "kya bol raha".
- Money/payment/favor: do not promise. Reply like "abhi nahi ho payega" or "dekh ke batata hu".
- Plans/meeting: do not commit unless clearly already agreed. Reply like "dekhte hai" or "baad me batata hu".
- Insult/teasing: keep it light, not abusive unless the chat already has that style.
- Question needing real info: do not invent. Reply "pata karke batata hu" or ask a follow-up.

Output only the exact WhatsApp message text.`;

function normalizeChatBaseUrl(rawBaseUrl = '') {
  let baseUrl = String(rawBaseUrl || '').trim();
  if (!baseUrl) return '';

  if (baseUrl.includes('localhost:11434') && !baseUrl.includes('/v1') && !baseUrl.includes('/api/')) {
    baseUrl = baseUrl.endsWith('/') ? baseUrl + 'v1' : baseUrl + '/v1';
  }

  return baseUrl.replace(/\/+$/, '');
}

function extractProviderError(status, rawText) {
  if (!rawText) return `Provider returned HTTP ${status}.`;

  try {
    const parsed = JSON.parse(rawText);
    const message = parsed?.error?.message || parsed?.error || parsed?.message;
    if (message) return typeof message === 'string' ? message : JSON.stringify(message);
  } catch {}

  const withoutScripts = rawText
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const text = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.toLowerCase().includes('bad gateway') || status === 502) {
    return 'Provider gateway returned 502 Bad Gateway. The selected model host is down or temporarily unreachable.';
  }

  return text.slice(0, 500) || `Provider returned HTTP ${status}.`;
}

function pushWhatsappMessage(number, name, body, type) {
  if (!whatsappContacts[number]) {
    whatsappContacts[number] = { name, number, messages: [] };
  }
  whatsappContacts[number].name = name;
  whatsappContacts[number].messages.unshift({
    id: Date.now().toString() + Math.random(),
    from: type === 'outgoing' ? 'You' : name,
    body,
    type,
    timestamp: new Date().toISOString(),
  });
  if (whatsappContacts[number].messages.length > 100) {
    whatsappContacts[number].messages.pop();
  }
}

function mapWhatsappMessage(msg, fallbackName = 'Contact') {
  return {
    id: msg.id?._serialized || msg.id?.id || Date.now().toString() + Math.random(),
    from: msg.fromMe ? 'You' : fallbackName,
    body: msg.body || '',
    type: msg.fromMe ? 'outgoing' : 'incoming',
    timestamp: msg.timestamp
      ? new Date(msg.timestamp * 1000).toISOString()
      : new Date().toISOString(),
  };
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isZombieError(err) {
  const msg = String(err?.message || '');
  return msg.includes('detached Frame')
    || msg.includes('Execution context was destroyed')
    || msg.includes('Target closed')
    || msg.includes('Session closed')
    || msg.includes('Protocol error');
}

async function handleZombieSession(err) {
  console.error('💀 [WHATSAPP] Zombie session detected:', err.message);
  console.log('🔄 [WHATSAPP] Auto-resetting WhatsApp state...');
  await resetWhatsappRuntime('Session expired — browser frame detached. Please restart WhatsApp.');
}

function patchWhatsappClient(client) {
  if (!client || client.__jarvisPatched) return client;
  client.__jarvisPatched = true;

  if (typeof client.inject === 'function') {
    const originalInject = client.inject.bind(client);
    client.inject = async (...args) => {
      try {
        return await originalInject(...args);
      } catch (err) {
        if (isZombieError(err)) {
          await handleZombieSession(err);
          return null;
        }
        throw err;
      }
    };
  }

  client.on('error', async (err) => {
    if (isZombieError(err)) {
      await handleZombieSession(err);
      return;
    }
    console.error("WhatsApp Client Error:", err);
    whatsappStatus = 'error';
    whatsappError = err?.message || String(err);
  });

  return client;
}

async function syncWhatsappChats() {
  if (!whatsappClient || !whatsappConnected) return [];

  try {
    const chats = await withTimeout(whatsappClient.getChats(), 8000, 'WhatsApp chat sync');
    const recentChats = chats
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 80);

    for (const chat of recentChats) {
      const number = chat.id?._serialized;
      if (!number) continue;

      const name = chat.name || chat.id?.user || number;
      if (!whatsappContacts[number]) {
        whatsappContacts[number] = { name, number, messages: [] };
      }

      whatsappContacts[number].name = name;
      whatsappContacts[number].isGroup = !!chat.isGroup;
      whatsappContacts[number].timestamp = chat.timestamp || 0;
      whatsappContacts[number].unread = chat.unreadCount || 0;
      whatsappContacts[number].avatar = whatsappAvatarCache[number] || '';

      if (chat.lastMessage?.body) {
        const lastMessage = mapWhatsappMessage(chat.lastMessage, name);
        const exists = whatsappContacts[number].messages.some((m) => m.id === lastMessage.id);
        if (!exists) {
          whatsappContacts[number].messages.unshift(lastMessage);
        }
      }
    }

    return Object.values(whatsappContacts)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    if (isZombieError(err)) {
      await handleZombieSession(err);
      return [];
    }
    throw err;
  }
}

function listCachedWhatsappContacts() {
  return Object.values(whatsappContacts).map(c => ({
    number: c.number,
    name: c.name,
    lastMessage: c.messages[0] || null,
    unread: c.unread || 0,
    isGroup: !!c.isGroup,
    avatar: c.avatar || '',
    timestamp: c.timestamp || 0,
  })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function refreshWhatsappChats() {
  if (!whatsappClient || !whatsappConnected) return Promise.resolve([]);
  if (whatsappSyncInFlight) return whatsappSyncInFlight;

  whatsappSyncInFlight = syncWhatsappChats()
    .catch((err) => {
      console.error("WhatsApp background sync error:", err.message);
      return listCachedWhatsappContacts();
    })
    .finally(() => {
      whatsappSyncInFlight = null;
    });

  return whatsappSyncInFlight;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isForbiddenAutoReply(text) {
  return /\b(jarvis|ai|assistant|bot|automation|auto[-\s]?reply|matrix|dashboard|manager|system)\b/i.test(text)
    || /currently managing/i.test(text)
    || /^\s*\[.*\]\s*:/.test(text);
}

function normalizeReplyForCompare(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function recentOutgoingReplies(number) {
  return (whatsappContacts[number]?.messages || [])
    .filter((m) => m.type === 'outgoing')
    .slice(0, 8)
    .map((m) => normalizeReplyForCompare(m.body));
}

function isRepeatedReply(number, reply) {
  const normalized = normalizeReplyForCompare(reply);
  if (!normalized) return true;
  return recentOutgoingReplies(number).includes(normalized);
}

function shouldUseMessageInContext(messageBody) {
  const text = String(messageBody || '');
  return text.trim() && !isForbiddenAutoReply(text);
}

function cleanAutoReply(text) {
  const cleaned = String(text || '')
    .replace(/^\s*(\[?jarvis ai\]?|ai|assistant|bot)\s*[:\-]\s*/i, '')
    .replace(/["â€œâ€]/g, '')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .slice(0, 350)
    .trim();

  if (!cleaned || isForbiddenAutoReply(cleaned)) return '';
  return cleaned;
}

function getChatReactionPrompt(number, senderName) {
  const profile = whatsappChatProfiles[number];
  if (profile?.prompt?.trim()) {
    return `Special behavior for this chat with ${senderName}:\n${profile.prompt.trim()}`;
  }

  return `Special behavior for this chat with ${senderName}:
- Mirror their language and energy.
- If they are a close friend, sound casual and brief.
- If they are formal or unknown, be polite but still short.
- Do not say anything you are not sure the account owner would say.`;
}

function buildWhatsappContext(number, incomingText, senderName) {
  const stored = whatsappContacts[number]?.messages || [];
  const recent = [...stored]
    .reverse()
    .slice(-12)
    .filter((m) => shouldUseMessageInContext(m.body))
    .map((m) => ({
      role: m.type === 'outgoing' ? 'assistant' : 'user',
      content: String(m.body || '').slice(0, 500),
    }));

  if (recent.length === 0 || recent[recent.length - 1]?.content !== incomingText) {
    recent.push({ role: 'user', content: incomingText });
  }

  const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return [
    { role: 'system', content: WHATSAPP_PERSONAL_REPLY_PROMPT },
    { role: 'system', content: `Current time: ${currentTime}. Sender name: ${senderName}.` },
    { role: 'system', content: getChatReactionPrompt(number, senderName) },
    ...recent,
  ];
}

async function callOpenAICompatibleModel(modelInfo, messages) {
  const baseUrl = normalizeChatBaseUrl(modelInfo.base_url);
  const endpoint = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelInfo.api_key || ''}`,
      },
      body: JSON.stringify({
        model: modelInfo.model_id,
        messages,
        temperature: 0.85,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(extractProviderError(response.status, text));
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
  } finally {
    clearTimeout(timer);
  }
}

async function callOllamaAutoReply(messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.WHATSAPP_REPLY_MODEL || 'qwen2.5-coder:3b',
        messages,
        stream: false,
        options: { temperature: 0.85, num_predict: 80 },
      }),
    });

    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
    const data = await response.json();
    return data?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

function pickFallback(options, number, incomingText) {
  const recent = new Set(recentOutgoingReplies(number));
  const start = hashText(`${number}:${incomingText}:${Date.now()}`) % options.length;

  for (let i = 0; i < options.length; i += 1) {
    const candidate = options[(start + i) % options.length];
    if (!recent.has(normalizeReplyForCompare(candidate))) {
      return candidate;
    }
  }

  return options[start];
}

function fallbackAutoReply(incomingText, number = '') {
  const text = incomingText.toLowerCase();
  if (/^(hi|hello|hey|hii|helo|hy)\b/.test(text.trim())) {
    return pickFallback(['ha bolo', 'haan bol', 'bol bhai', 'kaise ho', 'haan ji bolo', 'kya haal'], number, incomingText);
  }
  if (/kaise|kesa|kaisa|how are/.test(text)) {
    return pickFallback(['badhiya hu', 'theek hu tu bata', 'mast hu', 'sahi hu', 'main thik hu'], number, incomingText);
  }
  if (/kya kar|kya kr|what.*doing/.test(text)) {
    return pickFallback(['kuch nahi', 'aise hi', 'bas aise hi', 'tu bata', 'kaam chal raha'], number, incomingText);
  }
  if (/paise|payment|paytm|gpay|phonepe|bhej|send money|loan/.test(text)) {
    return pickFallback(['abhi nahi ho payega', 'dekh ke batata hu', 'abhi tight hai', 'thoda ruk ja'], number, incomingText);
  }
  if (text.includes('?')) {
    return pickFallback(['pata karke batata hu', 'ek min dekh ke bolta hu', 'abhi clear nahi hai', 'confirm karke bolta hu'], number, incomingText);
  }
  return pickFallback(['achha', 'hmm', 'sahi hai', 'theek hai', 'ok', 'samjha'], number, incomingText);
}

async function generateWhatsappAutoReply(number, senderName, incomingText) {
  const messages = buildWhatsappContext(number, incomingText, senderName);

  try {
    const result = await query('SELECT * FROM models WHERE is_active = true LIMIT 1');
    const activeModel = result.rows[0];
    const rawReply = activeModel
      ? await callOpenAICompatibleModel(activeModel, messages)
      : await callOllamaAutoReply(messages);

    const reply = cleanAutoReply(rawReply);
    if (!reply || isRepeatedReply(number, reply)) {
      return fallbackAutoReply(incomingText, number);
    }
    return reply;
  } catch (err) {
    console.error("âŒ WhatsApp Auto-Reply Model Error:", err.message);
    return fallbackAutoReply(incomingText, number);
  }
}

process.on('uncaughtException', async (err) => {
  if (isZombieError(err)) {
    await handleZombieSession(err);
    return;
  }
  console.error("[GLOBAL UNCAUGHT EXCEPTION]:", err);
});

process.on('unhandledRejection', async (reason) => {
  if (isZombieError(reason)) {
    await handleZombieSession(reason);
    return;
  }
  console.error("[GLOBAL UNHANDLED REJECTION]:", reason);
});

console.log("ðŸš€ Codevora Backend: Starting initialization...");
dotenv.config();
console.log("âœ… DOTENV Config Loaded.");
initDb().then(() => {
  restoreAgents();
});
console.log("ðŸ—„ï¸ PostgreSQL Initialization triggered.");
console.log("Stripe Key Present:", !!process.env.STRIPE_SECRET_KEY);

// ðŸ¤– Helper: Start Telegram Bot
async function startTelegramBot(token, adminId, modelId) {
  const bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== adminId) {
      bot.sendMessage(chatId, "âš ï¸ Unauthorized user. This bot is private.");
      return;
    }

    const text = msg.text;
    if (!text) return;

    const thinkingMsg = await bot.sendMessage(chatId, "â³ Processing request...");

    try {
      let modelInfo = null;
      if (modelId === 'default' || !modelId) {
        const result = await query('SELECT * FROM models WHERE is_active = true LIMIT 1');
        modelInfo = result.rows[0];
      } else {
        const result = await query('SELECT * FROM models WHERE id = $1', [modelId]);
        modelInfo = result.rows[0];
      }

      if (!modelInfo) {
        bot.editMessageText("âŒ Error: Selected model not found in Neural Core.", { chat_id: chatId, message_id: thinkingMsg.message_id });
        return;
      }

      const endpoint = modelInfo.base_url.endsWith('/') ? modelInfo.base_url + 'chat/completions' : modelInfo.base_url + '/chat/completions';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelInfo.api_key || ''}`
        },
        body: JSON.stringify({
          model: modelInfo.model_id,
          messages: [{ role: 'user', content: text }],
        })
      });

      if (!response.ok) {
        bot.editMessageText(`âŒ API Error: Connection to ${modelInfo.name} failed.`, { chat_id: chatId, message_id: thinkingMsg.message_id });
        return;
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'No response generated.';

      if (reply.length > 4000) {
        bot.editMessageText(reply.substring(0, 4000) + '... [Response Truncated]', { chat_id: chatId, message_id: thinkingMsg.message_id, parse_mode: 'Markdown' });
      } else {
        bot.editMessageText(reply, { chat_id: chatId, message_id: thinkingMsg.message_id, parse_mode: 'Markdown' });
      }

    } catch (err) {
      console.error("Telegram Bot AI Error:", err);
      bot.editMessageText("âŒ Error processing request in Neural Core.", { chat_id: chatId, message_id: thinkingMsg.message_id });
    }
  });

  activeBots.set(token, bot);
  return bot;
}

// ðŸ“¦ Restore Agents from DB
async function restoreAgents() {
  console.log("ðŸ¤– Neural Core: Restoring persistent agents...");
  try {
    const result = await query('SELECT * FROM agent_configs');
    for (const row of result.rows) {
      if (row.agent_id === 'telegram_bot') {
        const { token, adminId, modelId } = row.config_json;
        if (token && adminId) {
          await startTelegramBot(token, adminId, modelId);
          console.log(`âœ… Restored Telegram Bot Agent.`);
        }
      }
    }
  } catch (err) {
    console.error("Failed to restore agents:", err);
  }
}

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log("âœ… Stripe Client Initialized.");

// Webhook handling must be BEFORE express.json() for Stripe signatures!
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription update events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const priceId = session.line_items?.data[0]?.price?.id;

    console.log(`[STRIPE] Checkout completed for User: ${userId}, Price: ${priceId}`);
    // UPDATE Firestore DB to subscriptionStatus = 'active'
    // ... insert Firestore Admin SDK logic
  }

  res.json({ received: true });
});

// Regular Middleware
app.use(cors());
app.use(express.json());
app.use('/api/canva', canvaRouter);
app.use('/api/ide', ideRouter);
app.use('/api', modelHubRouter);

// ðŸ’° Checkout Session Route
app.post('/api/stripe/create-checkout', async (req, res) => {
  const { priceId, userId, successUrl, cancelUrl } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId, // Tied back to auth.currentUser.uid in Webhook!
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ðŸ¤– Model Management API
app.get('/api/models', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM models ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/models', async (req, res) => {
  const { id, name, provider, model_id, base_url, api_key, api_protocol, is_active } = req.body;
  try {
    await query(`
      INSERT INTO models (id, name, provider, model_id, base_url, api_key, api_protocol, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, name, provider, model_id, base_url, api_key, api_protocol || 'OpenAI', is_active || false]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/models/:id', async (req, res) => {
  const { id } = req.params;
  const { name, provider, model_id, base_url, api_key, api_protocol } = req.body;
  try {
    await query(`
      UPDATE models 
      SET name=$1, provider=$2, model_id=$3, base_url=$4, api_key=$5, api_protocol=$6
      WHERE id=$7
    `, [name, provider, model_id, base_url, api_key, api_protocol, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/models/:id', async (req, res) => {
  try {
    await query('DELETE FROM models WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ðŸ”„ Sync Ollama Models automatically
app.post('/api/models/sync-ollama', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) throw new Error('Ollama not running or accessible at localhost:11434');
    
    const data = await response.json();
    const ollamaModels = data.models || [];
    let addedCount = 0;

    for (const m of ollamaModels) {
      const modelId = m.name;
      const displayName = `Ollama: ${modelId}`;
      const id = `ollama-${modelId.replace(/[^a-z0-9]/gi, '-')}`;
      
      // Check if already exists to avoid duplicates
      const exists = await query('SELECT id FROM models WHERE id = $1', [id]);
      if (exists.rows.length === 0) {
        await query(`
          INSERT INTO models (id, name, provider, model_id, base_url, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, displayName, 'Ollama', modelId, 'http://localhost:11434/v1', false]);
        addedCount++;
      }
    }
    res.json({ success: true, count: addedCount, total: ollamaModels.length });
  } catch (err) {
    console.error('Ollama Sync Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/models/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const target = await query('SELECT * FROM models WHERE id = $1', [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found.' });
    }

    const shouldDeactivate = target.rows[0].is_active === true;
    await query('BEGIN');
    await query('UPDATE models SET is_active = false');
    if (!shouldDeactivate) {
      await query('UPDATE models SET is_active = true WHERE id = $1', [id]);
    }
    await query('COMMIT');
    res.json({ success: true, active: !shouldDeactivate });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ðŸŒ AI Proxy to bypass CORS issues
app.post('/api/proxy/chat', async (req, res) => {
  const { baseUrl: rawBaseUrl, apiKey, modelId, messages } = req.body;
  const shouldStream = req.body.stream !== false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const baseUrl = normalizeChatBaseUrl(rawBaseUrl);
    if (!baseUrl || !modelId) {
      return res.status(400).json({ error: 'Missing Base URL or Model ID.' });
    }
    const endpoint = `${baseUrl}/chat/completions`;

    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || ''}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        stream: shouldStream,
        temperature: req.body.temperature ?? 0.2,
        max_tokens: req.body.max_tokens ?? 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: extractProviderError(response.status, errorText),
        status: response.status,
        provider: baseUrl
      });
    }

    if (!shouldStream) {
      const responseText = await response.text();
      res
        .status(response.status)
        .type(response.headers.get('content-type') || 'application/json')
        .send(responseText);
      return;
    }

    // Proxy the stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!response.body) {
      throw new Error('Proxy response did not include a readable stream.');
    }

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) {
        await new Promise((resolve) => res.once('drain', resolve));
      }
    }
    if (!res.writableEnded) res.end();

  } catch (err) {
    const code = err?.cause?.code || err?.code;
    if (code === 'UND_ERR_SOCKET' || err?.name === 'AbortError') {
      console.error('[PROXY STREAM CLOSED]', err.message);
    } else {
      console.error('[PROXY ERROR]', err);
    }
    if (!res.headersSent) {
      const message = err?.name === 'AbortError'
        ? 'Model request timed out or was cancelled before the provider returned a response.'
        : err.message;
      res.status(500).json({ error: message });
      return;
    }
    if (!res.writableEnded) {
      res.write(`\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  } finally {
    clearTimeout(timeout);
  }
});

// ðŸ“Š Admin Usage Tracker (Credits/Limits aggregation placeholder)
app.get('/api/admin/metrics', (req, res) => {
  res.json({
    totalUsers: 142,
    activeSubscribers: 45,
    todayQueries: 1204,
    monthlyRevenue: 1305.00
  });
});

// ðŸ¤– Telegram Bot Control Endpoints
app.post('/api/telegram/start', async (req, res) => {
  const { token, adminId, modelId } = req.body;
  if (!token || !adminId) {
    return res.status(400).json({ error: 'Token and Admin ID are required' });
  }

  if (activeBots.has(token)) {
    return res.status(400).json({ error: 'Bot is already running' });
  }

  try {
    await startTelegramBot(token, adminId, modelId);

    // Save Config to DB for persistence
    await query(`
      INSERT INTO agent_configs (agent_id, config_json)
      VALUES ($1, $2)
      ON CONFLICT (agent_id) DO UPDATE SET config_json = $2, updated_at = CURRENT_TIMESTAMP
    `, ['telegram_bot', JSON.stringify({ token, adminId, modelId })]);

    res.json({ success: true, message: 'Bot started successfully' });
  } catch (err) {
    console.error("Telegram Start Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/telegram/stop', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const bot = activeBots.get(token);
  if (bot) {
    bot.stopPolling();
    activeBots.delete(token);
    res.json({ success: true, message: 'Bot stopped successfully' });
  } else {
    res.status(404).json({ error: 'Bot is not running' });
  }
});

// ðŸ“± WhatsApp Matrix Control Endpoints
app.get('/api/whatsapp/status', async (req, res) => {
  // Health-check: if we think we're connected, verify the browser is alive
  if (whatsappConnected && whatsappClient) {
    try {
      await whatsappClient.getState();
    } catch (err) {
      if (isZombieError(err)) {
        console.error('💀 [WHATSAPP STATUS] Zombie detected during health check');
        await handleZombieSession(err);
      }
    }
  }

  res.json({
    connected: whatsappConnected,
    qr: whatsappQr,
    autoReply: whatsappAutoReply,
    status: whatsappStatus,
    error: whatsappError,
  });
});

app.post('/api/whatsapp/toggle-autoreply', (req, res) => {
  if (typeof req.body?.enabled === 'boolean') {
    whatsappAutoReply = req.body.enabled;
  } else {
    whatsappAutoReply = !whatsappAutoReply;
  }
  console.log(`ðŸ¤– WhatsApp: Auto-Reply is now ${whatsappAutoReply ? 'ENABLED' : 'DISABLED'}`);
  res.json({ success: true, autoReply: whatsappAutoReply });
});

app.get('/api/whatsapp/chat-profile/:number', (req, res) => {
  const number = decodeURIComponent(req.params.number);
  res.json({
    number,
    prompt: whatsappChatProfiles[number]?.prompt || '',
  });
});

app.post('/api/whatsapp/chat-profile/:number', (req, res) => {
  const number = decodeURIComponent(req.params.number);
  const prompt = String(req.body?.prompt || '').trim().slice(0, 2000);

  whatsappChatProfiles[number] = { prompt };
  res.json({ success: true, number, prompt });
});

async function resetWhatsappRuntime(errorMessage = null) {
  const client = whatsappClient;
  whatsappClient = null;
  whatsappInitializing = false;
  whatsappConnected = false;
  whatsappQr = null;
  whatsappStatus = errorMessage ? 'error' : 'disconnected';
  whatsappError = errorMessage;

  if (client) {
    try {
      await client.destroy();
    } catch {}
  }
}

app.post('/api/whatsapp/start', async (req, res) => {
  if (whatsappClient || whatsappInitializing) {
    return res.json({
      success: true,
      message: "WhatsApp Matrix is already initializing or active.",
      status: whatsappStatus,
    });
  }

  console.log("ðŸ“± Initializing WhatsApp Matrix...");
  try {
    whatsappInitializing = true;
    whatsappStatus = 'initializing';
    whatsappError = null;
    whatsappQr = null;
    whatsappConnected = false;

    whatsappClient = patchWhatsappClient(new Client({
      authStrategy: new LocalAuth({
        clientId: 'jarvis-whatsapp',
        dataPath: './.wwebjs_auth',
      }),
      authTimeoutMs: 90000,
      qrMaxRetries: 8,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-features=Translate,BackForwardCache,AcceptCHFrame',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      },
    }));

    whatsappClient.on('qr', async (qr) => {
      console.log("ðŸ“± WhatsApp QR Received");
      whatsappQr = await qrcode.toDataURL(qr);
      whatsappConnected = false;
      whatsappInitializing = false;
      whatsappStatus = 'qr_ready';
      whatsappError = null;
    });

    whatsappClient.on('ready', () => {
      console.log("âœ… WhatsApp Matrix Linked & Ready");
      whatsappConnected = true;
      whatsappInitializing = false;
      whatsappQr = null;
      whatsappStatus = 'connected';
      whatsappError = null;
    });

    whatsappClient.on('disconnected', (reason) => {
      console.log("âŒ WhatsApp Matrix Disconnected:", reason);
      whatsappConnected = false;
      whatsappQr = null;
      whatsappClient = null;
      whatsappInitializing = false;
      whatsappStatus = 'disconnected';
      whatsappError = reason || null;
    });

    whatsappClient.on('auth_failure', (msg) => {
      console.error("âŒ WhatsApp Auth Failure:", msg);
      whatsappConnected = false;
      whatsappQr = null;
      whatsappClient = null;
      whatsappInitializing = false;
      whatsappStatus = 'error';
      whatsappError = msg || 'WhatsApp authentication failed.';
    });

    whatsappClient.on('message', async (msg) => {
      if (!msg.body) return;
      if (msg.fromMe) return;
      const messageId = msg.id?._serialized || msg.id?.id;
      if (messageId) {
        if (whatsappProcessedMessageIds.has(messageId)) return;
        whatsappProcessedMessageIds.add(messageId);
        if (whatsappProcessedMessageIds.size > 1000) {
          whatsappProcessedMessageIds.clear();
        }
      }

      const contact = await msg.getContact().catch(() => null);
      const name = contact?.pushname || contact?.number || msg.from;
      const number = msg.from;

      if (number.endsWith('@g.us')) {
        console.log(`WhatsApp auto-reply skipped group message from ${name}.`);
        pushWhatsappMessage(number, name, msg.body, 'incoming');
        return;
      }

      pushWhatsappMessage(number, name, msg.body, 'incoming');

      if (!whatsappAutoReply) {
        console.log(`WhatsApp message received from ${name}, auto-reply disabled.`);
        return;
      }

      console.log(`WhatsApp auto-reply generating for ${name}: "${msg.body.slice(0, 80)}"`);
      try {
        const chat = await msg.getChat().catch(() => null);
        await chat?.sendStateTyping?.();
        await delay(1200 + Math.floor(Math.random() * 2800));

        const reply = await generateWhatsappAutoReply(number, name, msg.body);
        await chat?.clearState?.();

        if (!reply) {
          console.log(`WhatsApp auto-reply empty for ${name}; nothing sent.`);
          return;
        }
        await whatsappClient.sendMessage(number, reply);
        pushWhatsappMessage(number, name, reply, 'outgoing');
        console.log(`WhatsApp auto-reply sent to ${name}: "${reply}"`);
      } catch (err) {
        try {
          const chat = await msg.getChat().catch(() => null);
          await chat?.clearState?.();
        } catch {}
        console.error("WhatsApp auto-reply send error:", err);
      }
    });

    whatsappClient.on('message_create', async (msg) => {
      if (!msg.body) return;
      if (msg.fromMe) return;
      const messageId = msg.id?._serialized || msg.id?.id;
      if (messageId) {
        if (whatsappProcessedMessageIds.has(messageId)) return;
        whatsappProcessedMessageIds.add(messageId);
        if (whatsappProcessedMessageIds.size > 1000) {
          whatsappProcessedMessageIds.clear();
        }
      }

      const contact = await msg.getContact().catch(() => null);
      const name = contact?.pushname || contact?.number || msg.from;
      const number = msg.from;

      if (number.endsWith('@g.us')) {
        pushWhatsappMessage(number, name, msg.body, 'incoming');
        return;
      }

      pushWhatsappMessage(number, name, msg.body, 'incoming');

      if (whatsappAutoReply) {
        console.log(`ðŸ¤– Generating WhatsApp auto-reply for ${name}...`);
        try {
          const chat = await msg.getChat().catch(() => null);
          await chat?.sendStateTyping?.();
          await delay(1200 + Math.floor(Math.random() * 2800));

          const reply = await generateWhatsappAutoReply(number, name, msg.body);
          await chat?.clearState?.();

          if (!reply) return;
          console.log(`[WA AUTO-REPLY] ${name}: "${msg.body.slice(0, 80)}" -> "${reply}"`);
          await whatsappClient.sendMessage(number, reply);
          pushWhatsappMessage(number, name, reply, 'outgoing');
        } catch (err) {
          try {
            const chat = await msg.getChat().catch(() => null);
            await chat?.clearState?.();
          } catch {}
          console.error("âŒ Auto-Reply Error:", err);
        }
      }
    });

    whatsappClient.initialize().catch(async (err) => {
      console.error("WhatsApp Init Error:", err);
      await resetWhatsappRuntime(err.message);
    });

    res.json({ success: true, message: "WhatsApp Matrix initialization started." });

  } catch (err) {
    console.error("WhatsApp Init Error:", err);
    await resetWhatsappRuntime(err.message);
    res.status(500).json({ error: "Failed to initialize WhatsApp: " + err.message });
  }
});

app.post('/api/whatsapp/sync', async (req, res) => {
  if (!whatsappClient || !whatsappConnected) {
    return res.json({ success: false, contacts: listCachedWhatsappContacts(), status: whatsappStatus });
  }

  try {
    const contacts = await refreshWhatsappChats();
    res.json({ success: true, contacts, status: whatsappStatus });
  } catch (err) {
    console.error("âŒ WhatsApp Sync Error:", err);
    res.json({ success: false, contacts: listCachedWhatsappContacts(), status: whatsappStatus, error: err.message });
  }
});

app.post('/api/whatsapp/stop', async (req, res) => {
  if (whatsappClient) {
    const client = whatsappClient;
    whatsappClient = null;
    whatsappInitializing = false;
    whatsappConnected = false;
    whatsappQr = null;
    whatsappStatus = 'disconnected';
    whatsappError = null;
    res.json({ success: true, message: 'WhatsApp Matrix terminated' });
    client.destroy().catch((err) => console.warn("WhatsApp destroy warning:", err.message));
  } else {
    whatsappInitializing = false;
    whatsappConnected = false;
    whatsappQr = null;
    whatsappStatus = 'disconnected';
    whatsappError = null;
    res.json({ success: true, message: 'WhatsApp Matrix already stopped' });
  }
});

app.get('/api/whatsapp/contacts', async (req, res) => {
  try {
    if (whatsappClient && whatsappConnected) {
      refreshWhatsappChats();
    }

    res.json({ contacts: listCachedWhatsappContacts(), status: whatsappStatus });
  } catch (err) {
    console.error("WhatsApp Contacts Error:", err);
    if (isZombieError(err)) {
      await handleZombieSession(err);
      return res.json({ contacts: [], error: 'Session expired. Please restart WhatsApp.' });
    }
    res.json({ contacts: listCachedWhatsappContacts(), status: whatsappStatus, error: err.message });
  }
});

// Quick restart endpoint
app.post('/api/whatsapp/restart', async (req, res) => {
  console.log('[WHATSAPP] Restart requested...');
  await resetWhatsappRuntime();
  res.json({ success: true, message: 'WhatsApp session reset. Click Establish Signal to reconnect.' });
});

app.get('/api/whatsapp/messages/:number', async (req, res) => {
  const num = decodeURIComponent(req.params.number);
  try {
    if (whatsappClient && whatsappConnected) {
      const waChat = await whatsappClient.getChatById(num).catch((e) => { if (isZombieError(e)) throw e; return null; });
      if (waChat) {
        const name = waChat.name || waChat.id?.user || num;
        const fetchedMessages = await waChat.fetchMessages({ limit: 50 });
        const messages = fetchedMessages
          .filter((msg) => msg.body)
          .map((msg) => mapWhatsappMessage(msg, name))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        whatsappContacts[num] = {
          ...whatsappContacts[num],
          name,
          number: num,
          isGroup: !!waChat.isGroup,
          unread: waChat.unreadCount || 0,
          timestamp: waChat.timestamp || 0,
          messages: [...messages].reverse(),
        };

        return res.json({ messages });
      }
    }

    const chat = whatsappContacts[num];
    res.json({ messages: chat ? [...chat.messages].reverse() : [] });
  } catch (err) {
    console.error("WhatsApp Messages Error:", err);
    if (isZombieError(err)) {
      await handleZombieSession(err);
      const chat = whatsappContacts[num];
      return res.json({ messages: chat ? [...chat.messages].reverse() : [], error: 'Session expired.' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { number, message } = req.body;
  if (!whatsappClient || !whatsappConnected) {
    return res.status(400).json({ error: 'WhatsApp is not connected.' });
  }
  if (!number || !message?.trim()) {
    return res.status(400).json({ error: 'number and message are required.' });
  }

  try {
    await whatsappClient.sendMessage(number, message.trim());
    const name = whatsappContacts[number]?.name || number;
    pushWhatsappMessage(number, name, message.trim(), 'outgoing');
    res.json({ success: true });
  } catch (err) {
    console.error("âŒ WhatsApp Send Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// âš¡ Automation Dispatch Endpoint
app.post('/api/automation/dispatch', async (req, res) => {
  const { channel, target, content } = req.body;
  console.log(`ðŸš€ Automation: Dispatching to ${channel} -> ${target}`);

  try {
    if (channel === 'Email') {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.status(400).json({ error: 'Email credentials not configured in .env' });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: `"Codevora AI" <${process.env.EMAIL_USER}>`,
        to: target,
        subject: 'Neural Signal: Automated Message from Codevora AI',
        text: content,
        html: `
          <div style="font-family: sans-serif; background: #020617; color: #fff; padding: 40px; border-radius: 20px;">
            <h2 style="color: #22d3ee; border-bottom: 1px solid #083344; padding-bottom: 10px;">Neural Dispatch Received</h2>
            <p style="font-size: 16px; line-height: 1.6;">${content}</p>
            <div style="margin-top: 30px; font-size: 12px; color: #475569;">
              Sent via Codevora AI Autonomous Pipeline
            </div>
          </div>
        `
      });

      // Log to DB
      await query(`
        INSERT INTO automation_logs (channel, target, content)
        VALUES ($1, $2, $3)
      `, ['Email', target, content]);

      return res.json({ success: true, message: 'Email dispatched successfully' });
    }

    if (channel === 'WhatsApp') {
      if (!whatsappConnected || !whatsappClient) {
        return res.status(400).json({ error: 'WhatsApp Matrix not connected. Please link your device first.' });
      }

      // Format number: remove +, spaces, and add @c.us
      const cleanNumber = target.replace(/\D/g, '');
      const chatId = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;

      await whatsappClient.sendMessage(chatId, content);

      // Log to DB
      await query(`
         INSERT INTO automation_logs (channel, target, content)
         VALUES ($1, $2, $3)
       `, ['WhatsApp', target, content]);

      return res.json({ success: true, message: 'WhatsApp message dispatched' });
    }

    // Placeholder for other channels
    res.status(501).json({ error: `${channel} automation is currently in neural development.` });

  } catch (err) {
    console.error('Automation Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// âœ¨ AI Automation Draft Endpoint
app.post('/api/automation/draft', async (req, res) => {
  const { channel, target, hint } = req.body;
  console.log(`âœ¨ AI Draft: Generating for ${channel} to ${target}`);

  try {
    // Fetch active model
    const result = await query('SELECT * FROM models WHERE is_active = true LIMIT 1');
    const modelInfo = result.rows[0];

    if (!modelInfo) {
      return res.status(400).json({ error: 'No active AI model found to generate draft.' });
    }

    const systemPrompt = `You are an AI Communications Specialist. Generate a professional and concise message for the following:
    Channel: ${channel}
    Target: ${target}
    Context/Hint: ${hint || 'Write a professional introductory message.'}
    
    Format the output as plain text suitable for the channel. If it's Email, include a Subject line at the top.`;

    let baseUrl = modelInfo.base_url;
    if (modelInfo.provider.toLowerCase() === 'ollama' && !baseUrl.includes('/v1') && !baseUrl.includes('/api/')) {
      baseUrl = baseUrl.endsWith('/') ? baseUrl + 'v1' : baseUrl + '/v1';
    }
    const endpoint = baseUrl.endsWith('/') ? baseUrl + 'chat/completions' : baseUrl + '/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelInfo.api_key || ''}`
      },
      body: JSON.stringify({
        model: modelInfo.model_id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the draft now.' }
        ],
      })
    });

    if (response.ok) {
      const data = await response.json();
      const draft = data.choices?.[0]?.message?.content || 'Neural Core failed to generate draft.';
      res.json({ success: true, draft });
    } else {
      const errData = await response.json();
      res.status(response.status).json({ error: errData.error || 'Failed to communicate with AI Model' });
    }
  } catch (err) {
    console.error("Draft Generation Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ðŸ’¬ Chat History Endpoints
app.get('/api/chats', async (req, res) => {
  try {
    const result = await query('SELECT * FROM chats ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats', async (req, res) => {
  const { id, title } = req.body;
  try {
    await query('INSERT INTO chats (id, title) VALUES ($1, $2)', [id, title]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM chats WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  try {
    const result = await query('SELECT * FROM chat_history WHERE chat_id = $1 ORDER BY timestamp ASC', [chatId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  const { chatId, role, content } = req.body;
  try {
    // Verify chat exists
    const chatCheck = await query('SELECT id FROM chats WHERE id = $1', [chatId]);
    if (chatCheck.rows.length === 0) {
      await query('INSERT INTO chats (id, title) VALUES ($1, $2)', [chatId, 'Auto-Created Session']);
    }

    await query('INSERT INTO chat_history (chat_id, role, content) VALUES ($1, $2, $3)', [chatId, role, content]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ðŸ—ï¸ App Builder Persistence Endpoints
app.get('/api/projects', async (req, res) => {
  try {
    const result = await query('SELECT * FROM app_projects ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  const { id, name, code, prompt } = req.body;
  try {
    const projectId = id || `project_${Date.now()}`;
    await query(`
      INSERT INTO app_projects (id, name, code, prompt)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        code = EXCLUDED.code, 
        prompt = EXCLUDED.prompt, 
        updated_at = CURRENT_TIMESTAMP
    `, [projectId, name || 'Neural Creation', code, prompt]);
    res.json({ success: true, id: projectId });
  } catch (err) {
    console.error("Project Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ðŸš€ Codevora AI Backend running on port ${PORT}`);
});

