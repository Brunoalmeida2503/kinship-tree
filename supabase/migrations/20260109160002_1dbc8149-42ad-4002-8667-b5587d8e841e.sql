-- Fix: allow conversation creator to read the conversation row immediately after INSERT
-- This prevents PostgREST insert+returning from failing before participants are inserted.

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policy if exists
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Create policy that allows creator or participant to view the conversation
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT
  TO public
  USING (created_by = auth.uid() OR public.is_conversation_participant(id, auth.uid()));