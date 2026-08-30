-- =============================================
-- FIX: Add missing receiver_id column to chat_messages
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Add the missing receiver_id column (safe — does nothing if it already exists)
DO $$ BEGIN
  ALTER TABLE public.chat_messages ADD COLUMN receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Step 2: Drop and recreate the RLS policy that references receiver_id
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;

CREATE POLICY "Users can view own chat messages" ON public.chat_messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Step 3: Drop and recreate the insert policy
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.chat_messages;

CREATE POLICY "Authenticated users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Done! You should see "Success. No rows returned"
