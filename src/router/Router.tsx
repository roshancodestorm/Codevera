import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import JarvisHome from '../components/JarvisHome';
import { SignupPage } from '../components/auth/SignupPage';
import { LoginPage } from '../components/auth/LoginPage';
import { AuthCallback } from '../components/auth/AuthCallback';
import { VerifyEmailPage } from '../components/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '../components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../components/auth/ResetPasswordPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { DashboardPage } from '../components/dashboard/DashboardPage';

export function normalizePath(): string {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return p === '' ? '/' : p;
}

export const Router: React.FC = () => {
  const { session } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(normalizePath);

  const navigate = useCallback((to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
    }
    setCurrentPath(to);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route resolution according to PRD section 3
  switch (currentPath) {
    case '/signup':
      return <SignupPage />;

    case '/login':
      return <LoginPage />;

    case '/auth/callback':
      return <AuthCallback />;

    case '/verify-email':
      return <VerifyEmailPage />;

    case '/forgot-password':
      return <ForgotPasswordPage />;

    case '/reset-password':
      return <ResetPasswordPage />;

    case '/dashboard':
      return (
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      );

    case '/':
    default:
      return (
        <JarvisHome
          onStart={() => {
            navigate(session ? '/dashboard' : '/login');
          }}
        />
      );
  }
};
