-- Add column to control if post can be reshared by others
ALTER TABLE public.posts 
ADD COLUMN allow_reshare boolean NOT NULL DEFAULT true;