-- Ensure conversations can be created by authenticated users (fix RLS insert violation)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create a conversation where they are the creator
DO $$
BEGIN
  -- Create policy only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'Users can create conversations they own'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create conversations they own" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by)';
  END IF;
END $$;
