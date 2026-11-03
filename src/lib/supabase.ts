import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from Vite environment variables or localStorage for dynamic runtime config
const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('codevora_supabase_url') || '' : '';
const storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem('codevora_supabase_anon_key') || '' : '';

export const SUPABASE_URL = (envUrl && envUrl.trim() !== '' && !envUrl.includes('your-project'))
  ? envUrl.trim()
  : (storedUrl.trim() || 'https://demo-placeholder.supabase.co');

export const SUPABASE_ANON_KEY = (envAnonKey && envAnonKey.trim() !== '' && !envAnonKey.includes('your-anon-key'))
  ? envAnonKey.trim()
  : (storedAnonKey.trim() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder');

export function isSupabaseConfigured(): boolean {
  const url = (envUrl && !envUrl.includes('your-project') ? envUrl : storedUrl) || '';
  const key = (envAnonKey && !envAnonKey.includes('your-anon-key') ? envAnonKey : storedAnonKey) || '';
  return Boolean(url && key && url.startsWith('http') && key.length > 20);
}

export function isDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('codevora_auth_demo_mode') === 'true' || !isSupabaseConfigured();
}

export function setDemoModeEnabled(enabled: boolean) {
  if (typeof window !== 'undefined') {
    if (enabled) {
      localStorage.setItem('codevora_auth_demo_mode', 'true');
    } else {
      localStorage.removeItem('codevora_auth_demo_mode');
    }
    window.location.reload();
  }
}

export function saveRuntimeSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('codevora_supabase_url', url.trim());
    localStorage.setItem('codevora_supabase_anon_key', anonKey.trim());
    localStorage.removeItem('codevora_auth_demo_mode');
    window.location.reload();
  }
}

export function clearRuntimeSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('codevora_supabase_url');
    localStorage.removeItem('codevora_supabase_anon_key');
    window.location.reload();
  }
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
