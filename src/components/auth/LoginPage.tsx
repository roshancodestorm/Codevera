import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, ShieldAlert, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

export const LoginPage: React.FC = () => {
  const { signIn, signInWithGoogle, resendVerification } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);

  // Read URL query params on mount for messages/errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    const msg = params.get('message');
    if (err) setErrorMessage(err);
    if (msg) setInfoMessage(msg);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsUnverified(false);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    const result = await signIn(email, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to sign in.');
      if (result.unverified) {
        setIsUnverified(true);
      }
      return;
    }

    // Redirect to dashboard
    window.history.pushState({}, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleGoogleClick = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsGoogleLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setIsGoogleLoading(false);
      setErrorMessage(result.error);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    const res = await resendVerification(email);
    setIsResending(false);
    if (res.success) {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 8000);
    } else {
      setErrorMessage(res.error || 'Failed to resend verification email.');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Codevora AI workspace"
    >
      {/* Informational Banner */}
      {infoMessage && (
        <div className="mb-5 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{infoMessage}</div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            {errorMessage}
            {isUnverified && (
              <div className="mt-2.5 pt-2.5 border-t border-red-500/20 flex items-center justify-between">
                <span>Didn't get the email?</span>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="font-semibold underline hover:no-underline inline-flex items-center gap-1"
                >
                  {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                  Resend Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resend success notice */}
      {resendSuccess && (
        <div className="mb-5 p-3.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Verification email resent! Please check your inbox.</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={isGoogleLoading || isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-line bg-canvas hover:bg-hover text-ink text-sm font-medium transition-colors disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>Sign in with Google</span>
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface px-3 text-ink-subtle">Or continue with email</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1">Email address</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-ink">Password</label>
            <a
              href="/forgot-password"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/forgot-password');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-xs font-medium text-ink-muted hover:text-ink hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Signup */}
      <div className="mt-6 text-center text-xs text-ink-muted">
        Don't have an account?{' '}
        <a
          href="/signup"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/signup');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="font-semibold text-ink hover:underline"
        >
          Sign up
        </a>
      </div>
    </AuthLayout>
  );
};
