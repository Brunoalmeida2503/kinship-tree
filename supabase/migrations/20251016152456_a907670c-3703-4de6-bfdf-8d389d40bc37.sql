-- Create post_media table for multiple media files per post
CREATE TABLE public.post_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory_media table for multiple media files per memory
CREATE TABLE public.memory_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_comments table
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_shares table
CREATE TABLE public.calendar_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL,
  shared_by UUID NOT NULL,
  shared_with_user_id UUID,
  shared_with_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  )
);

-- Create group_posts table
CREATE TABLE public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_post_media table
CREATE TABLE public.group_post_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_post_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_comments table
CREATE TABLE public.group_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_join_requests table
CREATE TABLE public.group_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_media
CREATE POLICY "Users can view media from posts they can see"
ON public.post_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_media.post_id
    AND (
      posts.user_id = auth.uid() OR
      posts.share_with_tree = true OR
      EXISTS (
        SELECT 1 FROM post_groups pg
        JOIN group_members gm ON gm.group_id = pg.group_id
        WHERE pg.post_id = posts.id AND gm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create media for their posts"
ON public.post_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete media from their posts"
ON public.post_media FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid()
  )
);

-- RLS policies for memory_media
CREATE POLICY "Users can view media from shared memories"
ON public.memory_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memories
    WHERE memories.id = memory_media.memory_id
    AND (
      memories.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM calendar_shares
        WHERE calendar_shares.memory_id = memories.id
        AND (
          calendar_shares.shared_with_user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = calendar_shares.shared_with_group_id
            AND group_members.user_id = auth.uid()
          )
        )
      )
    )
  )
);

CREATE POLICY "Users can create media for their memories"
ON public.memory_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memories
    WHERE memories.id = memory_media.memory_id AND memories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete media from their memories"
ON public.memory_media FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM memories
    WHERE memories.id = memory_media.memory_id AND memories.user_id = auth.uid()
  )
);

-- RLS policies for post_comments
CREATE POLICY "Users can view comments on posts they can see"
ON public.post_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_comments.post_id
    AND (
      posts.user_id = auth.uid() OR
      posts.share_with_tree = true OR
      EXISTS (
        SELECT 1 FROM post_groups pg
        JOIN group_members gm ON gm.group_id = pg.group_id
        WHERE pg.post_id = posts.id AND gm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create comments on posts they can see"
ON public.post_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_comments.post_id
    AND (
      posts.share_with_tree = true OR
      EXISTS (
        SELECT 1 FROM post_groups pg
        JOIN group_members gm ON gm.group_id = pg.group_id
        WHERE pg.post_id = posts.id AND gm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.post_comments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.post_comments FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for calendar_shares
CREATE POLICY "Users can view shares they created or received"
ON public.calendar_shares FOR SELECT
USING (
  auth.uid() = shared_by OR
  auth.uid() = shared_with_user_id OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = calendar_shares.shared_with_group_id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create shares for their memories"
ON public.calendar_shares FOR INSERT
WITH CHECK (
  auth.uid() = shared_by AND
  EXISTS (
    SELECT 1 FROM memories
    WHERE memories.id = calendar_shares.memory_id AND memories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own shares"
ON public.calendar_shares FOR DELETE
USING (auth.uid() = shared_by);

-- RLS policies for group_posts
CREATE POLICY "Group members can view group posts"
ON public.group_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_posts.group_id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can create posts"
ON public.group_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_posts.group_id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own group posts"
ON public.group_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group posts"
ON public.group_posts FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for group_post_media
CREATE POLICY "Group members can view group post media"
ON public.group_post_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_posts gp
    JOIN group_members gm ON gm.group_id = gp.group_id
    WHERE gp.id = group_post_media.group_post_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create media for their group posts"
ON public.group_post_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_posts
    WHERE group_posts.id = group_post_media.group_post_id
    AND group_posts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete media from their group posts"
ON public.group_post_media FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM group_posts
    WHERE group_posts.id = group_post_media.group_post_id
    AND group_posts.user_id = auth.uid()
  )
);

-- RLS policies for group_comments
CREATE POLICY "Group members can view comments"
ON public.group_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_posts gp
    JOIN group_members gm ON gm.group_id = gp.group_id
    WHERE gp.id = group_comments.group_post_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can create comments"
ON public.group_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM group_posts gp
    JOIN group_members gm ON gm.group_id = gp.group_id
    WHERE gp.id = group_comments.group_post_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own group comments"
ON public.group_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group comments"
ON public.group_comments FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for group_join_requests
CREATE POLICY "Users can view their own join requests"
ON public.group_join_requests FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_join_requests.group_id
    AND groups.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create their own join requests"
ON public.group_join_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group creators can update join requests"
ON public.group_join_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_join_requests.group_id
    AND groups.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete their own join requests"
ON public.group_join_requests FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_group_posts_updated_at
BEFORE UPDATE ON public.group_posts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_group_comments_updated_at
BEFORE UPDATE ON public.group_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_group_join_requests_updated_at
BEFORE UPDATE ON public.group_join_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();