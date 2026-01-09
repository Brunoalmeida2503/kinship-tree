-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;

-- Create proper policies for conversations
CREATE POLICY "Users can create conversations as participant"
ON public.conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  )
);

-- Alternative: Allow authenticated users to create conversations (they must add themselves after)
DROP POLICY IF EXISTS "Users can create conversations as participant" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create proper policies for conversation participants
CREATE POLICY "Users can add themselves or be added to conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id 
    AND cp.user_id = auth.uid()
  )
);

-- Add policy to allow users to add connected users to conversations
DROP POLICY IF EXISTS "Users can add themselves or be added to conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE status = 'accepted' AND
      ((requester_id = auth.uid() AND receiver_id = conversation_participants.user_id) OR
       (receiver_id = auth.uid() AND requester_id = conversation_participants.user_id))
    )
  )
);