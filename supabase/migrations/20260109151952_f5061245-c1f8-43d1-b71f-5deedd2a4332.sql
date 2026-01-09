-- Create security definer function to check if user is participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Recreate policies using the security definer function

-- Conversations policies
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (is_conversation_participant(id, auth.uid()));

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Conversation participants policies
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Messages policies
CREATE POLICY "Users can view messages"
ON public.messages FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());