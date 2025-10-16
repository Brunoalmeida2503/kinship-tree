-- Add language preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN language TEXT DEFAULT 'pt-BR';

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.language IS 'User preferred language (pt-BR, en, es, fr, etc.)';