-- Criar função security definer para verificar se usuário é membro do grupo
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Remover política problemática
DROP POLICY IF EXISTS "Group members are viewable by other members" ON public.group_members;

-- Criar nova política usando a função
CREATE POLICY "Group members are viewable by other members"
ON public.group_members
FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));