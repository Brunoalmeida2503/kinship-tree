-- Adicionar campo para compartilhamento com árvore
ALTER TABLE public.posts ADD COLUMN share_with_tree boolean DEFAULT false;

-- Criar tabela para relacionar posts com grupos
CREATE TABLE public.post_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, group_id)
);

-- Enable RLS
ALTER TABLE public.post_groups ENABLE ROW LEVEL SECURITY;

-- Atualizar política de visualização de posts
DROP POLICY IF EXISTS "Users can view all posts" ON public.posts;

CREATE POLICY "Users can view their own posts"
ON public.posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view posts shared with tree"
ON public.posts
FOR SELECT
TO authenticated
USING (
  share_with_tree = true 
  AND (
    -- Posts de conexões aceitas onde o usuário é requester
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE requester_id = auth.uid()
        AND receiver_id = posts.user_id
        AND status = 'accepted'
    )
    OR
    -- Posts de conexões aceitas onde o usuário é receiver
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE receiver_id = auth.uid()
        AND requester_id = posts.user_id
        AND status = 'accepted'
    )
  )
);

CREATE POLICY "Users can view posts from their groups"
ON public.posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.post_groups pg
    INNER JOIN public.group_members gm ON gm.group_id = pg.group_id
    WHERE pg.post_id = posts.id
      AND gm.user_id = auth.uid()
  )
);

-- Políticas para post_groups
CREATE POLICY "Users can create post_groups for their posts"
ON public.post_groups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = post_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view post_groups"
ON public.post_groups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = post_groups.group_id
      AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own post_groups"
ON public.post_groups
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = post_id AND user_id = auth.uid()
  )
);