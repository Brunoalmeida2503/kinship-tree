-- Add video_url column to posts table
ALTER TABLE public.posts ADD COLUMN video_url text;

-- Create storage bucket for posts (photos and videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true);

-- RLS policies for posts bucket
CREATE POLICY "Users can view all posts media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'posts');

CREATE POLICY "Users can upload their own posts media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own posts media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own posts media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);