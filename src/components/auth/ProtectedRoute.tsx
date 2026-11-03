import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading, user, isVerified } = useAuth();

  useEffect(() => {
    if (loading) return;

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

    if (!session || !user) {
      if (currentPath !== '/login') {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }

    if (!isVerified) {
      const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const target = `/verify-email${emailParam}`;
      if (currentPath !== '/verify-email') {
        window.history.pushState({}, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }, [session, loading, user, isVerified]);

  // FR-05: Prevent content flash while checking/restoring persistent session
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-fg text-lg font-bold shadow-lg shadow-black/10 animate-pulse">
              C
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-accent absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold tracking-tight text-ink">Codevora AI</p>
            <p className="text-xs text-ink-subtle mt-0.5">Authenticating session...</p>
          </div>
        </div>
      </div>
    );
  }

  // FR-06: Unauthenticated or unverified user blocked from protected routes
  if (!session || !user || !isVerified) {
    return null;
  }

  return <>{children}</>;
};
