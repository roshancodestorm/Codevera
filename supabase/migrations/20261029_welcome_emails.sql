-- Migration: Welcome Email Delivery Tracking and Atomic Idempotency
-- Target Database: Hosted Supabase PostgreSQL (run in Supabase SQL Editor)
-- Purpose: Provides database-enforced atomic slot acquisition (pending -> sent/failed/skipped)
-- to prevent duplicate welcome emails across concurrent requests, retries, and repeat logins.

CREATE TABLE IF NOT EXISTS public.welcome_email_dispatches (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'email' | 'google'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  provider_message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.welcome_email_dispatches ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (for Edge Functions and backend processes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'welcome_email_dispatches' AND policyname = 'Service role full access on welcome_email_dispatches'
  ) THEN
    CREATE POLICY "Service role full access on welcome_email_dispatches"
      ON public.welcome_email_dispatches
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow authenticated users to view only their own dispatch status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'welcome_email_dispatches' AND policyname = 'Users can read own welcome email status'
  ) THEN
    CREATE POLICY "Users can read own welcome email status"
      ON public.welcome_email_dispatches
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes for status checks and timestamps
CREATE INDEX IF NOT EXISTS idx_welcome_email_dispatches_status
  ON public.welcome_email_dispatches(status);

CREATE INDEX IF NOT EXISTS idx_welcome_email_dispatches_sent_at
  ON public.welcome_email_dispatches(sent_at);

CREATE INDEX IF NOT EXISTS idx_welcome_email_dispatches_updated_at
  ON public.welcome_email_dispatches(updated_at);
