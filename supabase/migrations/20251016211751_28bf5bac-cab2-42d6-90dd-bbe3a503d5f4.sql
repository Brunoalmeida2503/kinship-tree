-- Adicionar coluna para controlar permissões de postagem nos grupos
ALTER TABLE public.groups 
ADD COLUMN allow_member_posts boolean NOT NULL DEFAULT true;

-- Atualizar política de criação de posts para respeitar a configuração do grupo
DROP POLICY IF EXISTS "Group members can create posts" ON public.group_posts;

CREATE POLICY "Group members can create posts" 
ON public.group_posts 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Usuário é o criador do grupo
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_posts.group_id 
      AND created_by = auth.uid()
    )
    OR
    -- Grupo permite postagens de membros e usuário é membro
    EXISTS (
      SELECT 1 
      FROM public.groups g
      JOIN public.group_members gm ON gm.group_id = g.id
      WHERE g.id = group_posts.group_id 
      AND g.allow_member_posts = true
      AND gm.user_id = auth.uid()
    )
  )
);