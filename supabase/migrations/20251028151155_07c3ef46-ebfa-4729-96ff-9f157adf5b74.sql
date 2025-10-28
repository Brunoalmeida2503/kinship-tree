-- Create post_shares table to allow sharing posts with specific connections
CREATE TABLE public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Users can create shares for their posts
CREATE POLICY "Users can create shares for their posts"
ON public.post_shares
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = shared_by 
  AND EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_shares.post_id
    AND posts.user_id = auth.uid()
  )
);

-- Users can view shares they created or received
CREATE POLICY "Users can view shares they created or received"
ON public.post_shares
FOR SELECT
TO authenticated
USING (
  auth.uid() = shared_by 
  OR auth.uid() = shared_with_user_id
);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.post_shares
FOR DELETE
TO authenticated
USING (auth.uid() = shared_by);

-- Update posts RLS to allow viewing posts shared with specific users
CREATE POLICY "Users can view posts shared with them directly"
ON public.posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.post_shares
    WHERE post_shares.post_id = posts.id
    AND post_shares.shared_with_user_id = auth.uid()
  )
);