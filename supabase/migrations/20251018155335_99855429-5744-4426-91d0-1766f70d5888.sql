-- Add theme_color column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN theme_color text DEFAULT 'white' CHECK (theme_color IN ('white', 'green'));