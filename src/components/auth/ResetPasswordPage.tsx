import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Loader2, Check, X, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { AuthLayout } from './AuthLayout';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword, session } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLinkValid, setIsLinkValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is in password recovery mode
    // Supabase sets session on recovery link click or emits PASSWORD_RECOVERY event
    const hash = window.location.hash;
    const isRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token=');

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession || isRecoveryHash) {
        setIsLinkValid(true);
      } else {
        // Wait briefly for onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === 'PASSWORD_RECOVERY' || newSession) {
            setIsLinkValid(true);
          }
        });

        // If not authenticated within 3 seconds and no hash, link might be expired/invalid
        const timer = setTimeout(() => {
          if (!session && !isRecoveryHash) {
            setIsLinkValid(false);
          }
        }, 3000);

        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      }
    });
  }, [session]);

  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      matches: Boolean(password && confirmPassword && password === confirmPassword),
    };
  }, [password, confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.length) score += 1;
    if (passwordChecks.hasUpper) score += 1;
    if (passwordChecks.hasNumber) score += 1;
    if (passwordChecks.hasSpecial) score += 1;
    return score;
  }, [passwordChecks]);

  const strengthColor = useMemo(() => {
    if (strengthScore <= 1) return 'bg-red-500';
    if (strengthScore === 2) return 'bg-amber-500';
    if (strengthScore === 3) return 'bg-blue-500';
    return 'bg-emerald-500';
  }, [strengthScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to update password.');
      return;
    }

    setIsSuccess(true);
  };

  // State: Expired / Invalid link
  if (isLinkValid === false) {
    return (
      <AuthLayout
        title="Invalid or Expired Link"
        subtitle="This password recovery link is no longer valid or has expired"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-5">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <p className="text-xs text-ink-muted leading-relaxed mb-6">
            For security reasons, password reset links expire after a short period. Please request a new recovery link.
          </p>

          <a
            href="/forgot-password"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/forgot-password');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span>Request New Reset Link</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </AuthLayout>
    );
  }

  // State: Password Updated Successfully
  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Updated"
        subtitle="Your Codevora AI password has been changed successfully"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <p className="text-xs text-ink-muted leading-relaxed mb-6">
            You can now proceed directly to your workspace dashboard.
          </p>

          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/dashboard');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create new password"
      subtitle="Choose a secure password for your Codevora AI account"
    >
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 w-full bg-line rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 1 ? strengthColor : 'bg-transparent'}`} />
                <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 2 ? strengthColor : 'bg-transparent'}`} />
                <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 3 ? strengthColor : 'bg-transparent'}`} />
                <div className={`h-full flex-1 transition-all duration-300 ${strengthScore >= 4 ? strengthColor : 'bg-transparent'}`} />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink p-1"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && (
            <p className={`text-[11px] mt-1 flex items-center gap-1 ${passwordChecks.matches ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {passwordChecks.matches ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {passwordChecks.matches ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !passwordChecks.matches || password.length < 8}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};
