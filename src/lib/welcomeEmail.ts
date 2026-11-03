/**
 * Codevora AI - Welcome Email Dispatcher Client Helper
 *
 * Sends an authenticated dispatch request to the server whenever a new user
 * completes email verification or first-time Google OAuth onboarding.
 * Server validates the Supabase session token and guarantees idempotency.
 */
import { isDemoModeEnabled } from './supabase';

export async function requestWelcomeEmailDispatch(accessToken?: string | null): Promise<void> {
  if (!accessToken || isDemoModeEnabled()) {
    return;
  }

  try {
    // Fire-and-forget call with standard timeout so UI navigation is never delayed
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch('/api/auth/welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timeout);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.debug('Welcome email check response:', res.status, body);
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.debug('Welcome email dispatch ping bypassed:', err.message);
      });
  } catch {
    // Non-blocking
  }
}
