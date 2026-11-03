import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isVerified: boolean;
  userName: string;
  avatarUrl: string | null;
  isDemoMode: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; requiresVerification?: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; unverified?: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
}

function isValidHttpsUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys for demo mode
const DEMO_USERS_KEY = 'codevora_demo_users';
const DEMO_SESSION_KEY = 'codevora_demo_session';

interface DemoUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  provider: string;
  avatarUrl?: string;
  createdAt: string;
}

function getDemoUsers(): DemoUserRecord[] {
  try {
    const raw = localStorage.getItem(DEMO_USERS_KEY);
    if (!raw) {
      // Seed initial demo user
      const initial: DemoUserRecord[] = [
        {
          id: 'demo-user-1',
          name: 'Demo Developer',
          email: 'demo@codevora.ai',
          passwordHash: 'Password123!',
          isVerified: true,
          provider: 'email',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'demo-unverified-1',
          name: 'Unverified User',
          email: 'unverified@codevora.ai',
          passwordHash: 'Password123!',
          isVerified: false,
          provider: 'email',
          createdAt: new Date().toISOString(),
        }
      ];
      localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDemoUsers(users: DemoUserRecord[]) {
  try {
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save demo users:', e);
  }
}

function createMockSupabaseUser(demo: DemoUserRecord): User {
  return {
    id: demo.id,
    app_metadata: { provider: demo.provider },
    user_metadata: {
      full_name: demo.name,
      name: demo.name,
      ...(demo.avatarUrl ? { avatar_url: demo.avatarUrl, picture: demo.avatarUrl } : {}),
    },
    identities: [
      {
        identity_id: demo.id,
        id: demo.id,
        user_id: demo.id,
        identity_data: {
          name: demo.name,
          ...(demo.avatarUrl ? { avatar_url: demo.avatarUrl, picture: demo.avatarUrl } : {}),
        },
        provider: demo.provider,
        last_sign_in_at: new Date().toISOString(),
        created_at: demo.createdAt,
        updated_at: demo.createdAt,
      } as unknown,
    ],
    aud: 'authenticated',
    confirmation_sent_at: demo.createdAt,
    confirmed_at: demo.isVerified ? demo.createdAt : undefined,
    email_confirmed_at: demo.isVerified ? demo.createdAt : undefined,
    created_at: demo.createdAt,
    email: demo.email,
    phone: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as unknown as User;
}

function createMockSession(user: User): Session {
  return {
    access_token: 'demo-access-token-' + Date.now(),
    refresh_token: 'demo-refresh-token-' + Date.now(),
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = useMemo(() => isSupabaseConfigured(), []);
  const isDemoMode = !isConfigured;

  useEffect(() => {
    let mounted = true;

    if (!isConfigured) {
      // Restore persistent demo session
      try {
        const stored = localStorage.getItem(DEMO_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Session;
          setSession(parsed);
          setUser(parsed.user);
        }
      } catch (e) {
        console.warn('Could not restore demo session:', e);
      }
      setLoading(false);
      return;
    }

    // Resolve initial live Supabase session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn('[Supabase Auth] Session fetch error:', error.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      if (mounted) {
        console.warn('[Supabase Auth] Session catch error:', err);
        setLoading(false);
      }
    });

    // Listen to ongoing auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const isVerified = useMemo(() => {
    if (!user) return false;
    const u = user as unknown as { email_confirmed_at?: string; confirmed_at?: string };
    const isGoogle =
      user.app_metadata?.provider === 'google' ||
      (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes('google')) ||
      (Array.isArray(user.identities) && user.identities.some((id) => (id as { provider?: string }).provider === 'google'));
    return Boolean(u.email_confirmed_at || u.confirmed_at || isGoogle);
  }, [user]);

  const userName = useMemo(() => {
    if (!user) return 'Agent';
    const metadata = user.user_metadata || {};
    return metadata.full_name || metadata.name || metadata.user_name || user.email?.split('@')[0] || 'Agent';
  }, [user]);

  const avatarUrl = useMemo<string | null>(() => {
    if (!user) return null;
    const meta = user.user_metadata || {};
    const identityData = user.identities?.[0]?.identity_data || {};

    const candidates = [
      meta.avatar_url,
      meta.picture,
      identityData.avatar_url,
      identityData.picture,
    ];

    for (const candidate of candidates) {
      if (isValidHttpsUrl(candidate)) {
        return candidate.trim();
      }
    }

    return null;
  }, [user]);

  // Sign Up
  const signUp = async (name: string, email: string, password: string) => {
    if (isDemoMode) {
      const users = getDemoUsers();
      const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        return {
          success: false,
          error: 'An account with this email already exists. Please log in instead.',
        };
      }

      const newDemoUser: DemoUserRecord = {
        id: 'demo-usr-' + Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        email: email.trim(),
        passwordHash: password,
        isVerified: false,
        provider: 'email',
        createdAt: new Date().toISOString(),
      };

      users.push(newDemoUser);
      saveDemoUsers(users);

      return {
        success: true,
        requiresVerification: true,
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            name: name.trim(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          return { success: false, error: 'An account with this email already exists. Please log in instead.' };
        }
        return { success: false, error: error.message };
      }

      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email already exists. Please log in instead.',
        };
      }

      const requiresVerification = !data.session;
      return { success: true, requiresVerification };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during signup.';
      return { success: false, error: msg };
    }
  };

  // Sign In
  const signIn = async (email: string, password: string) => {
    if (isDemoMode) {
      const users = getDemoUsers();
      const match = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

      if (!match || match.passwordHash !== password) {
        return {
          success: false,
          error: 'Invalid email or password. Please verify your credentials and try again.',
        };
      }

      if (!match.isVerified) {
        return {
          success: false,
          unverified: true,
          error: 'Your email address has not been verified yet. Please check your inbox or resend the verification email.',
        };
      }

      const mockUser = createMockSupabaseUser(match);
      const mockSession = createMockSession(mockUser);
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(mockSession));
      setSession(mockSession);
      setUser(mockUser);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('email not confirmed')) {
          return {
            success: false,
            unverified: true,
            error: 'Your email address has not been verified yet. Please check your inbox or resend the verification email.',
          };
        }
        if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
          return {
            success: false,
            error: 'Invalid email or password. Please verify your credentials and try again.',
          };
        }
        return { success: false, error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      return { success: false, error: msg };
    }
  };

  // Google OAuth
  const signInWithGoogle = async () => {
    if (isDemoMode) {
      // Simulate Google OAuth login
      const googleDemoUser: DemoUserRecord = {
        id: 'google-usr-' + Math.random().toString(36).substring(2, 7),
        name: 'Google User',
        email: 'developer@codevora.ai',
        passwordHash: '',
        isVerified: true,
        provider: 'google',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        createdAt: new Date().toISOString(),
      };

      const mockUser = createMockSupabaseUser(googleDemoUser);
      const mockSession = createMockSession(mockUser);
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(mockSession));
      setSession(mockSession);
      setUser(mockUser);

      // Navigate to callback or directly to dashboard
      window.history.pushState({}, '', '/auth/callback');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return {};
    }

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not initialize Google authentication.';
      return { error: msg };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setSession(null);
      return {};
    }

    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error signing out.';
      setUser(null);
      setSession(null);
      return { error: msg };
    }
  };

  // Reset Password Request
  const resetPassword = async (email: string) => {
    if (isDemoMode) {
      // Always succeed with safe confirmation message
      return { success: true };
    }

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending password reset email.';
      return { success: false, error: msg };
    }
  };

  // Update Password
  const updatePassword = async (newPassword: string) => {
    if (isDemoMode) {
      if (user?.email) {
        const users = getDemoUsers();
        const target = users.find((u) => u.email === user.email);
        if (target) {
          target.passwordHash = newPassword;
          saveDemoUsers(users);
        }
      }
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password.';
      return { success: false, error: msg };
    }
  };

  // Resend Verification
  const resendVerification = async (email: string) => {
    if (isDemoMode) {
      const users = getDemoUsers();
      const match = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (match) {
        // Automatically mark verified on resend in demo mode so user can immediately sign in!
        match.isVerified = true;
        saveDemoUsers(users);
      }
      return { success: true };
    }

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resending verification email.';
      return { success: false, error: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        isVerified,
        userName,
        avatarUrl,
        isDemoMode,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
