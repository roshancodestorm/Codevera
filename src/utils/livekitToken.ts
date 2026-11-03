/**
 * Minimal LiveKit JWT token generator (no server needed).
 * Uses the Web Crypto API — works in all modern browsers.
 */

const API_KEY = import.meta.env.VITE_LIVEKIT_API_KEY || 'APIoTfFBdTH2Zzx';
const API_SECRET = import.meta.env.VITE_LIVEKIT_API_SECRET || 'bnBeNfy14eomrzlWmEcKXE6M6MYyeDQf1ehdeLo4eeZJA';
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://tonystark-0uveb3t9.livekit.cloud';

function base64url(data: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }
  let str = '';
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function generateLivekitToken(
  room: string,
  identity: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: API_KEY,
      sub: identity,
      iat: now,
      exp,
      nbf: now,
      video: {
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
      },
    })
  );

  const signingData = `${header}.${payload}`;
  const secretBytes = new TextEncoder().encode(API_SECRET);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signingData)
  );

  return `${signingData}.${base64url(signature)}`;
}
