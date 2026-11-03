import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { requestWelcomeEmailDispatch } from '../../lib/welcomeEmail';
import { AuthLayout } from './AuthLayout';

const SUPPORTED_EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'email',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
];

export const AuthCallback: React.FC = () => {
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    let handled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let authSubscription: { unsubscribe: () => void } | undefined;

    const navigate = (to: string) => {
      const current = window.location.pathname.replace(/\/$/, '') || '/';
      const targetPath = to.split('?')[0].replace(/\/$/, '') || '/';
      if (current !== targetPath || window.location.search !== (to.includes('?') ? '?' + to.split('?')[1] : '')) {
        window.history.pushState({}, '', to);
      }
      window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const processAuth = async () => {
      // 1. Read URL parameters before cleaning the URL
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const error = queryParams.get('error') || hashParams.get('error');
      const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
      const tokenHash = queryParams.get('token_hash') || hashParams.get('token_hash');
      const rawType = queryParams.get('type') || hashParams.get('type');
      const code = queryParams.get('code') || hashParams.get('code');

      // Strip sensitive parameters from browser history immediately to avoid exposure or token re-use
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      // 2. Check for explicit error responses (e.g. user cancelled Google OAuth)
      if (error || errorDescription) {
        handled = true;
        const msg = errorDescription || error || 'Authentication could not be completed.';
        setErrorStatus(msg);
        timeoutId = setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(msg)}`);
        }, 1500);
        return;
      }

      // 3. Handle email confirmation via token_hash if present
      if (tokenHash) {
        const isValidType =
          typeof rawType === 'string' &&
          (SUPPORTED_EMAIL_OTP_TYPES as readonly string[]).includes(rawType);

        if (!isValidType) {
          handled = true;
          const msg = 'Invalid or unsupported verification token type.';
          setErrorStatus(msg);
          timeoutId = setTimeout(() => {
            navigate(`/login?error=${encodeURIComponent(msg)}`);
          }, 1500);
          return;
        }

        try {
          const { data, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: rawType as EmailOtpType,
          });

          if (otpError) {
            handled = true;
            setErrorStatus(otpError.message);
            timeoutId = setTimeout(() => {
              navigate(`/login?error=${encodeURIComponent(otpError.message)}`);
            }, 1500);
            return;
          }

          if (rawType === 'recovery') {
            handled = true;
            navigate('/reset-password');
            return;
          }

          if (data?.session) {
            handled = true;
            requestWelcomeEmailDispatch(data.session.access_token);
            navigate('/dashboard');
            return;
          }

          // Fallback session check if session was set in storage
          const { data: sessionCheck } = await supabase.auth.getSession();
          if (sessionCheck?.session) {
            handled = true;
            requestWelcomeEmailDispatch(sessionCheck.session.access_token);
            navigate('/dashboard');
            return;
          }

          // Email verified without immediate active session -> redirect to login with confirmation
          handled = true;
          navigate('/login?message=' + encodeURIComponent('Email verified successfully! You can now sign in.'));
          return;
        } catch (err: unknown) {
          handled = true;
          const msg = err instanceof Error ? err.message : 'Failed to verify confirmation link.';
          setErrorStatus(msg);
          timeoutId = setTimeout(() => {
            navigate(`/login?error=${encodeURIComponent(msg)}`);
          }, 1500);
          return;
        }
      }

      // 4. Exchange code if PKCE code parameter is present in query/hash (Google OAuth & PKCE email links)
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            handled = true;
            setErrorStatus(exchangeError.message);
            timeoutId = setTimeout(() => {
              navigate(`/login?error=${encodeURIComponent(exchangeError.message)}`);
            }, 1500);
            return;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error during authentication code exchange.';
          handled = true;
          setErrorStatus(msg);
          timeoutId = setTimeout(() => {
            navigate(`/login?error=${encodeURIComponent(msg)}`);
          }, 1500);
          return;
        }
      }

      // 5. Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        handled = true;
        setErrorStatus(sessionError.message);
        timeoutId = setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(sessionError.message)}`);
        }, 1500);
        return;
      }

      if (session) {
        handled = true;
        requestWelcomeEmailDispatch(session.access_token);
        navigate('/dashboard');
        return;
      }

      // 6. Fallback listener for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (handled) return;
        if (event === 'SIGNED_IN' && newSession) {
          handled = true;
          requestWelcomeEmailDispatch(newSession.access_token);
          navigate('/dashboard');
        }
      });
      authSubscription = subscription;

      // 7. Safety timeout: if nothing resolved after 6 seconds, redirect to login
      timeoutId = setTimeout(() => {
        if (!handled) {
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
          navigate('/login');
        }
      }, 6000);
    };

    processAuth();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  return (
    <AuthLayout
      title="Authenticating"
      subtitle="Finalizing your Codevora AI session..."
    >
      <div className="flex flex-col items-center justify-center py-10 text-center">
        {errorStatus ? (
          <div className="flex flex-col items-center gap-3 text-red-500">
            <AlertCircle className="w-10 h-10 animate-bounce" />
            <p className="text-sm font-medium">{errorStatus}</p>
            <p className="text-xs text-ink-subtle">Redirecting to login...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <p className="text-sm text-ink-muted">Establishing secure connection...</p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};
