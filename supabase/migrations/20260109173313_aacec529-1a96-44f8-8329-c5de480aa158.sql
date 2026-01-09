-- Add world_enabled column to profiles table
ALTER TABLE public.profiles ADD COLUMN world_enabled boolean DEFAULT false;