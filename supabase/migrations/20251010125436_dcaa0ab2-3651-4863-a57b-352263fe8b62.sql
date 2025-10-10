-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add is_ancestor field to connections table
ALTER TABLE connections
ADD COLUMN is_ancestor BOOLEAN DEFAULT false;

-- Add requires_confirmation field for ancestor relationships
ALTER TABLE connections
ADD COLUMN ancestor_confirmed_by TEXT[] DEFAULT '{}';

-- Add comment explaining the ancestor confirmation logic
COMMENT ON COLUMN connections.ancestor_confirmed_by IS 'Array of user IDs who have confirmed this ancestor relationship. All direct connections must confirm before ancestor is fully validated.';