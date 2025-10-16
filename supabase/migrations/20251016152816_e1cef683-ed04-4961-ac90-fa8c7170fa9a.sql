-- Add foreign key relationships for profile joins (only for tables that don't have them yet)
DO $$
BEGIN
  -- post_comments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'post_comments_user_id_fkey'
  ) THEN
    ALTER TABLE public.post_comments
    ADD CONSTRAINT post_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- group_posts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_posts_user_id_fkey'
  ) THEN
    ALTER TABLE public.group_posts
    ADD CONSTRAINT group_posts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- group_comments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_comments_user_id_fkey'
  ) THEN
    ALTER TABLE public.group_comments
    ADD CONSTRAINT group_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- group_join_requests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_join_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.group_join_requests
    ADD CONSTRAINT group_join_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- post_media
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'post_media_post_id_fkey'
  ) THEN
    ALTER TABLE public.post_media
    ADD CONSTRAINT post_media_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
  END IF;

  -- memory_media
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'memory_media_memory_id_fkey'
  ) THEN
    ALTER TABLE public.memory_media
    ADD CONSTRAINT memory_media_memory_id_fkey
    FOREIGN KEY (memory_id) REFERENCES public.memories(id) ON DELETE CASCADE;
  END IF;

  -- group_post_media
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_post_media_group_post_id_fkey'
  ) THEN
    ALTER TABLE public.group_post_media
    ADD CONSTRAINT group_post_media_group_post_id_fkey
    FOREIGN KEY (group_post_id) REFERENCES public.group_posts(id) ON DELETE CASCADE;
  END IF;
END $$;