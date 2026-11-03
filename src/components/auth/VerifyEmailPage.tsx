import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Loader2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

export const VerifyEmailPage: React.FC = () => {
  const { resendVerification, user } = useAuth();

  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email')?.trim();
    if (emailParam) {
      setEmail(emailParam);
    } else if (user?.email?.trim()) {
      setEmail(user.email.trim());
    }
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    const targetEmail = email.trim();
    if (!targetEmail || countdown > 0) return;
    setErrorMessage(null);
    setMessage(null);
    setIsResending(true);

    const result = await resendVerification(targetEmail);
    setIsResending(false);

    if (result.success) {
      setMessage('A fresh verification link has been sent to your email.');
      setCountdown(60);
    } else {
      setErrorMessage(result.error || 'Failed to resend verification email.');
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Check your inbox to activate your Codevora AI account"
    >
      <div className="flex flex-col items-center text-center">
        {/* Animated Mail Icon */}
        <div className="w-16 h-16 rounded-full bg-accent/10 border border-line flex items-center justify-center mb-6 text-accent">
          <Mail className="w-8 h-8" />
        </div>

        <p className="text-sm text-ink-muted leading-relaxed mb-4">
          We have sent a confirmation link to:
        </p>

        <div className="w-full px-4 py-2.5 rounded-xl border border-line bg-canvas font-medium text-ink text-sm mb-6 break-all">
          {email || 'your registered email address'}
        </div>

        {/* Feedback message */}
        {message && (
          <div className="w-full mb-5 p-3.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {errorMessage && (
          <div className="w-full mb-5 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || countdown > 0 || !email.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-line bg-canvas hover:bg-hover text-ink text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className={`w-4 h-4 ${countdown > 0 ? '' : 'text-accent'}`} />
            )}
            <span>
              {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend verification email'}
            </span>
          </button>

          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/login');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <p className="mt-6 text-[11px] text-ink-subtle">
          Can't find the email? Be sure to check your spam or junk folder.
        </p>
      </div>
    </AuthLayout>
  );
};
