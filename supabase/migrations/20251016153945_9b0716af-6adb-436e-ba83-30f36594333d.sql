-- Adicionar campos de período e compartilhamento na tabela memories
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS share_with_tree boolean DEFAULT false;

-- Renomear event_date para start_date para melhor semântica
ALTER TABLE public.memories
RENAME COLUMN event_date TO start_date;

-- Criar tabela para compartilhamento de memórias com usuários específicos
CREATE TABLE IF NOT EXISTS public.memory_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  shared_by uuid NOT NULL,
  shared_with_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT memory_shares_check CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  )
);

-- Habilitar RLS
ALTER TABLE public.memory_shares ENABLE ROW LEVEL SECURITY;

-- Políticas para memory_shares
CREATE POLICY "Users can create shares for their memories"
ON public.memory_shares
FOR INSERT
WITH CHECK (
  auth.uid() = shared_by AND
  EXISTS (
    SELECT 1 FROM public.memories
    WHERE memories.id = memory_shares.memory_id
    AND memories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view shares they created or received"
ON public.memory_shares
FOR SELECT
USING (
  auth.uid() = shared_by OR
  auth.uid() = shared_with_user_id OR
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = memory_shares.shared_with_group_id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own shares"
ON public.memory_shares
FOR DELETE
USING (auth.uid() = shared_by);

-- Atualizar política de visualização de memórias para incluir compartilhadas
DROP POLICY IF EXISTS "Users can view all memories" ON public.memories;

CREATE POLICY "Users can view their own memories"
ON public.memories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view memories shared with tree"
ON public.memories
FOR SELECT
USING (
  share_with_tree = true AND
  (
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE (connections.requester_id = auth.uid() AND connections.receiver_id = memories.user_id AND connections.status = 'accepted')
      OR (connections.receiver_id = auth.uid() AND connections.requester_id = memories.user_id AND connections.status = 'accepted')
    )
  )
);

CREATE POLICY "Users can view memories shared with them directly"
ON public.memories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memory_shares
    WHERE memory_shares.memory_id = memories.id
    AND (
      memory_shares.shared_with_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = memory_shares.shared_with_group_id
        AND group_members.user_id = auth.uid()
      )
    )
  )
);