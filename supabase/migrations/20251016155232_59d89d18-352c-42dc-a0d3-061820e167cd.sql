-- Adicionar campos de período e compartilhamento na tabela memories
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS share_with_tree boolean DEFAULT false;