-- Add created_by to conversations for secure ownership
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Backfill existing rows (if any) to a safe value; leave null allowed? We'll enforce NOT NULL after backfill.
-- For existing rows, set created_by to first participant if exists.
UPDATE public.conversations c
SET created_by = (
  SELECT cp.user_id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = c.id
  ORDER BY cp.joined_at ASC
  LIMIT 1
)
WHERE created_by IS NULL;

-- Ensure created_by is not null going forward
ALTER TABLE public.conversations
ALTER COLUMN created_by SET NOT NULL;

-- Add FK to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_created_by_fkey'
  ) THEN
    ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop previous conversations insert policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Create secure insert policy
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Allow creator to update their conversation timestamps if needed
CREATE POLICY "Conversation creator can update"
ON public.conversations FOR UPDATE
USING (created_by = auth.uid());
