import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { query } from './db.js';

const router = express.Router();

dotenv.config({ path: '../.env' });

const CLIENT_ID = process.env.VITE_CANVA_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:5000/api/canva/callback'; 

// Temporary storage for PKCE verifier
let tempCodeVerifier = '';

// Helper to generate PKCE challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

let canvaTokens = null;

// 1. Start Auth Flow with PKCE
router.get('/connect', (req, res) => {
  const { verifier, challenge } = generatePKCE();
  tempCodeVerifier = verifier; 

  const authUrl = `https://www.canva.com/api/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=design:content:read%20design:content:write%20design:meta:read&code_challenge=${challenge}&code_challenge_method=S256`;
  
  res.redirect(authUrl);
});

// 2. Handle Callback with PKCE Verifier
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`Canva Auth Error: ${error}`);
  }

  try {
    const response = await axios.post('https://api.canva.com/rest/v1/oauth/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code_verifier: tempCodeVerifier,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    canvaTokens = response.data;
    
    // Persist to DB
    await query('DELETE FROM canva_tokens');
    await query('INSERT INTO canva_tokens (tokens) VALUES ($1)', [JSON.stringify(canvaTokens)]);

    res.send('<h1>Connected!</h1><p>Aapka Canva account link ho gaya hai. Ab aap is tab ko band karke wapas Jarvis par ja sakte hain.</p><script>setTimeout(() => window.close(), 3000)</script>');
  } catch (error) {
    console.error('Canva Token Error:', error.response?.data || error.message);
    res.status(500).send('Failed to link Canva account.');
  }
});

router.get('/status', async (req, res) => {
  if (!canvaTokens) {
    try {
      const result = await query('SELECT tokens FROM canva_tokens ORDER BY id DESC LIMIT 1');
      if (result.rows.length > 0) {
        canvaTokens = result.rows[0].tokens;
      }
    } catch (e) {
      console.error("DB Canva Status Error:", e);
    }
  }
  res.json({ connected: !!canvaTokens });
});

router.post('/disconnect', async (req, res) => {
  canvaTokens = null;
  try {
    await query('DELETE FROM canva_tokens');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// 3. Create a New Design via AI
router.post('/create-design', async (req, res) => {
  if (!canvaTokens) {
    return res.status(401).json({ error: 'Canva not connected' });
  }

  try {
    const response = await axios.post('https://api.canva.com/rest/v1/designs', 
      {
        design_type: {
          type: 'presentation'
        },
        asset_id: req.body.assetId || null,
        title: req.body.title || 'AI Generated Presentation'
      },
      {
        headers: {
          'Authorization': `Bearer ${canvaTokens.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ success: true, design: response.data });
  } catch (error) {
    console.error('Canva Create Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create design in Canva' });
  }
});

export default router;
