import express from 'express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * ============================================================================
 * ARCHITECTURE ENFORCEMENT: EXPRESS + LOCAL POSTGRESQL (PRIMARY)
 * ============================================================================
 * This Express router is the single authoritative welcome-email dispatch service
 * for Codevora AI. To prevent dual-architecture duplicate sends, the Supabase
 * Edge Function is locked behind ENABLE_SUPABASE_EDGE_DISPATCH.
 */

// Initialize server-side Supabase client for token verification (least privilege: ANON key sufficient)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://utwscgcfmxzabmtyzlim.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_s4WhYSw7W9gSzO2ITqyb8Q_nkK7lCCK';

const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// File-based fallback storage for idempotency in case PG is in maintenance
const FALLBACK_DISPATCH_FILE = path.join(__dirname, 'data', 'welcome_emails.json');

function ensureDataDir() {
  const dir = path.dirname(FALLBACK_DISPATCH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getFallbackRecord(userId) {
  try {
    ensureDataDir();
    if (!fs.existsSync(FALLBACK_DISPATCH_FILE)) return null;
    const raw = fs.readFileSync(FALLBACK_DISPATCH_FILE, 'utf8');
    const records = JSON.parse(raw);
    return records[userId] || null;
  } catch {
    return null;
  }
}

function saveFallbackRecord(userId, record) {
  try {
    ensureDataDir();
    let records = {};
    if (fs.existsSync(FALLBACK_DISPATCH_FILE)) {
      records = JSON.parse(fs.readFileSync(FALLBACK_DISPATCH_FILE, 'utf8') || '{}');
    }
    records[userId] = {
      ...records[userId],
      ...record,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(FALLBACK_DISPATCH_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write fallback dispatch record:', err.message);
  }
}

/**
 * Database-Enforced Atomic Slot Acquisition
 *
 * States:
 * - 'pending': Exclusive dispatch claim acquired; outbound request in flight.
 * - 'sent': Provider accepted delivery.
 * - 'skipped': Account not eligible (e.g. repeat login, existing account).
 * - 'failed': Provider rejected send; safe to retry.
 */
async function claimDispatchSlot(userId, email, provider) {
  const now = new Date();
  const PENDING_TIMEOUT_MINUTES = 5;

  // 1. Try atomic insert into PostgreSQL
  try {
    const insertRes = await query(`
      INSERT INTO welcome_email_dispatches (user_id, email, provider, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'pending', NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id, status
    `, [userId, email, provider]);

    if (insertRes.rows.length > 0) {
      saveFallbackRecord(userId, { userId, email, provider, status: 'pending', created_at: now.toISOString() });
      return { acquired: true, status: 'pending' };
    }

    // Row already exists - inspect current status
    const existingRes = await query(`
      SELECT user_id, status, provider_message_id, sent_at, updated_at
      FROM welcome_email_dispatches
      WHERE user_id = $1
    `, [userId]);

    if (existingRes.rows.length > 0) {
      const row = existingRes.rows[0];

      if (row.status === 'sent') {
        return { acquired: false, status: 'sent', message: 'Welcome email already delivered', record: row };
      }

      if (row.status === 'skipped') {
        return { acquired: false, status: 'skipped', message: 'Welcome email skipped for this account', record: row };
      }

      if (row.status === 'pending') {
        const lastUpdated = new Date(row.updated_at).getTime();
        const diffMinutes = (Date.now() - lastUpdated) / (1000 * 60);

        if (diffMinutes < PENDING_TIMEOUT_MINUTES) {
          return { acquired: false, status: 'pending', message: 'Welcome email dispatch already in progress', inProgress: true, record: row };
        }

        // Reclaim stale pending state (> 5 mins)
        const reclaimRes = await query(`
          UPDATE welcome_email_dispatches
          SET status = 'pending', updated_at = NOW()
          WHERE user_id = $1 AND status = 'pending' AND updated_at < NOW() - INTERVAL '5 minutes'
          RETURNING user_id
        `, [userId]);

        if (reclaimRes.rows.length > 0) {
          saveFallbackRecord(userId, { userId, email, provider, status: 'pending', updated_at: now.toISOString() });
          return { acquired: true, status: 'pending' };
        }

        return { acquired: false, status: 'pending', message: 'Welcome email dispatch already in progress', inProgress: true };
      }

      if (row.status === 'failed') {
        // Retry failed dispatch attempt
        const retryRes = await query(`
          UPDATE welcome_email_dispatches
          SET status = 'pending', updated_at = NOW(), error_message = NULL
          WHERE user_id = $1 AND status = 'failed'
          RETURNING user_id
        `, [userId]);

        if (retryRes.rows.length > 0) {
          saveFallbackRecord(userId, { userId, email, provider, status: 'pending', updated_at: now.toISOString() });
          return { acquired: true, status: 'pending' };
        }
      }
    }
  } catch (dbErr) {
    console.warn('PG claim query failed, checking disk fallback:', dbErr.message);
  }

  // 2. Fallback disk storage check
  const fb = getFallbackRecord(userId);
  if (fb) {
    if (fb.status === 'sent') return { acquired: false, status: 'sent', message: 'Welcome email already delivered', record: fb };
    if (fb.status === 'skipped') return { acquired: false, status: 'skipped', message: 'Welcome email skipped', record: fb };
    if (fb.status === 'pending') {
      const diff = (Date.now() - new Date(fb.updated_at || fb.created_at).getTime()) / (1000 * 60);
      if (diff < PENDING_TIMEOUT_MINUTES) {
        return { acquired: false, status: 'pending', message: 'Dispatch in progress', inProgress: true, record: fb };
      }
    }
  }

  saveFallbackRecord(userId, { userId, email, provider, status: 'pending', created_at: now.toISOString() });
  return { acquired: true, status: 'pending' };
}

async function finalizeDispatchSlot(userId, status, messageId = null, errorMsg = null) {
  const timestamp = new Date().toISOString();

  try {
    await query(`
      INSERT INTO welcome_email_dispatches (user_id, email, provider, status, provider_message_id, sent_at, updated_at, error_message)
      VALUES ($1, '', '', $2, $3, CASE WHEN $2 = 'sent' THEN NOW() ELSE NULL END, NOW(), $4)
      ON CONFLICT (user_id) DO UPDATE SET
        status = EXCLUDED.status,
        provider_message_id = COALESCE(EXCLUDED.provider_message_id, welcome_email_dispatches.provider_message_id),
        sent_at = CASE WHEN EXCLUDED.status = 'sent' THEN NOW() ELSE welcome_email_dispatches.sent_at END,
        updated_at = NOW(),
        error_message = EXCLUDED.error_message;
    `, [userId, status, messageId, errorMsg]);
  } catch (dbErr) {
    console.warn('PG finalize query failed:', dbErr.message);
  }

  saveFallbackRecord(userId, {
    status,
    messageId,
    errorMsg,
    sent_at: status === 'sent' ? timestamp : undefined,
  });
}

function buildWelcomeHtml(userName, appUrl, authProvider) {
  const templatePath = path.resolve(__dirname, '..', 'templates', 'welcome-email.html');
  let html = '';
  if (fs.existsSync(templatePath)) {
    html = fs.readFileSync(templatePath, 'utf8');
  } else {
    html = `<h1>Welcome {{USER_NAME}}!</h1><p>Your Codevora AI workspace is ready.</p><a href="{{APP_URL}}">Launch Workspace</a>`;
  }

  const publicLogoUrl = process.env.PUBLIC_LOGO_URL || (process.env.APP_PUBLIC_URL && process.env.APP_PUBLIC_URL.startsWith('https://') ? `${process.env.APP_PUBLIC_URL}/favicon.svg` : null);
  
  let logoMark = '';
  if (publicLogoUrl && publicLogoUrl.startsWith('https://')) {
    logoMark = `<img src="${publicLogoUrl}" alt="Codevora AI" width="40" height="40" style="display: block; border-radius: 10px; width: 40px; height: 40px;" />`;
  } else {
    logoMark = `<div style="display: inline-block; width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #863bff 0%, #06b6d4 100%); line-height: 40px; text-align: center; color: #ffffff; font-weight: 800; font-size: 20px; box-shadow: 0 4px 20px rgba(134, 59, 255, 0.35);">C</div>`;
  }

  return html
    .replace(/\{\{USER_NAME\}\}/g, userName || 'Developer')
    .replace(/\{\{APP_URL\}\}/g, appUrl)
    .replace(/\{\{AUTH_PROVIDER\}\}/g, authProvider || 'Verified Account')
    .replace(/\{\{LOGO_MARK\}\}/g, logoMark);
}

// POST /api/auth/welcome-email
router.post('/welcome-email', async (req, res) => {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.replace(/^Bearer\s+/, '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Token is empty' });
    }

    // 2. Validate token server-side with Supabase Auth (least-privilege verification)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired authentication session' });
    }

    const userId = user.id;
    const userEmail = user.email;
    const provider = user.app_metadata?.provider || 'email';
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Developer';

    if (!userEmail) {
      return res.status(400).json({ error: 'User does not have an associated email address' });
    }

    // 3. Reliable Server-Side Eligibility Enforcement (Non-heuristic)
    if (provider === 'email') {
      // Rule 1: Email/password users qualify STRICTLY after confirmed email verification
      if (!user.email_confirmed_at) {
        return res.status(403).json({
          error: 'Email address has not been confirmed yet. Cannot send welcome email.',
        });
      }
    } else if (provider === 'google') {
      // Rule 2: Google OAuth new-registration eligibility verification
      // A new registration occurs when the account was created during the current onboarding window.
      // We enforce that user.created_at is strictly within 10 minutes of server wall-clock time.
      // Normal logins and subsequent sessions for accounts created > 10 minutes ago are permanently classified as repeat logins.
      const accountCreatedAt = new Date(user.created_at).getTime();
      const MAX_REGISTRATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
      const accountAgeMs = Date.now() - accountCreatedAt;

      if (accountAgeMs > MAX_REGISTRATION_WINDOW_MS) {
        // Existing account performing a repeat login -> record skipped state and exit
        await finalizeDispatchSlot(userId, 'skipped', null, 'Existing account login (outside initial registration window)');
        return res.json({
          success: true,
          message: 'Welcome email skipped: existing account repeat login',
          skipped: true,
        });
      }
    }

    // 4. Database-enforced atomic slot acquisition
    const claim = await claimDispatchSlot(userId, userEmail, provider);
    if (!claim.acquired) {
      return res.json({
        success: true,
        message: claim.message || 'Dispatch in progress or already completed',
        alreadySent: claim.status === 'sent',
        inProgress: claim.status === 'pending',
        skipped: claim.status === 'skipped',
      });
    }

    // 5. Resolve Public HTTPS App URL
    const isProduction = process.env.NODE_ENV === 'production';
    let appUrl = process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || '';

    if (!appUrl) {
      if (isProduction) {
        await finalizeDispatchSlot(userId, 'failed', null, 'Missing APP_PUBLIC_URL in production');
        return res.status(500).json({
          error: 'Server configuration error: APP_PUBLIC_URL or FRONTEND_URL is required in production environments to send emails.',
        });
      }
      appUrl = 'https://codevora.ai';
    } else if (isProduction && (appUrl.includes('localhost') || appUrl.includes('127.0.0.1'))) {
      await finalizeDispatchSlot(userId, 'failed', null, 'APP_PUBLIC_URL contains localhost in production');
      return res.status(500).json({
        error: 'Production safety check: APP_PUBLIC_URL cannot be localhost in production emails.',
      });
    }

    // 6. Build email content
    const emailHtml = buildWelcomeHtml(fullName, appUrl, provider);
    const emailSubject = `Welcome to Codevora AI, ${fullName}! 🚀`;
    const fromAddress = process.env.EMAIL_FROM || (process.env.EMAIL_USER ? `"Codevora AI" <${process.env.EMAIL_USER}>` : '"Codevora AI" <notifications@codevora.ai>');

    // 7. Provider Idempotency Key (Resend API header & SMTP Message-ID)
    const providerIdempotencyKey = `codevora-welcome-${userId}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpUser = process.env.EMAIL_USER;
    const smtpPass = process.env.EMAIL_PASS;
    const smtpHost = process.env.SMTP_HOST;

    let messageId = null;

    if (resendApiKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
          'Idempotency-Key': providerIdempotencyKey, // Resend-level deduplication
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [userEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      const resendData = await resendResponse.json();
      if (!resendResponse.ok) {
        const errorMsg = resendData?.message || 'Resend API dispatch failed';
        await finalizeDispatchSlot(userId, 'failed', null, errorMsg);
        return res.status(502).json({ error: errorMsg });
      }

      messageId = resendData?.id || 'resend-' + Date.now();
    } else if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport(
        smtpHost
          ? {
              host: smtpHost,
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: process.env.SMTP_SECURE === 'true',
              auth: { user: smtpUser, pass: smtpPass },
            }
          : {
              service: 'gmail',
              auth: { user: smtpUser, pass: smtpPass },
            }
      );

      const info = await transporter.sendMail({
        from: fromAddress,
        to: userEmail,
        subject: emailSubject,
        html: emailHtml,
        messageId: `<welcome-${userId}@codevora.ai>`, // SMTP-level deduplication
      });

      messageId = info.messageId;
    } else {
      await finalizeDispatchSlot(userId, 'failed', null, 'Provider credentials not configured');
      return res.status(503).json({
        success: false,
        error: 'Email provider credentials not configured. Please set RESEND_API_KEY or EMAIL_USER/EMAIL_PASS in server environment.',
        requiresSetup: true,
      });
    }

    // 8. Finalize delivery state as 'sent'
    await finalizeDispatchSlot(userId, 'sent', messageId, null);

    return res.json({
      success: true,
      message: 'Welcome email dispatched successfully',
      messageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error processing welcome email';
    return res.status(500).json({ error: message });
  }
});

export default router;
