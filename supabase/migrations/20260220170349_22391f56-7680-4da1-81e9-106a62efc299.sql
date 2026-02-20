
-- Tabela para associar participantes (familiares/amigos) a memórias
CREATE TABLE public.memory_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_memory_participants_memory_id ON public.memory_participants(memory_id);
CREATE INDEX idx_memory_participants_user_id ON public.memory_participants(user_id);

-- RLS
ALTER TABLE public.memory_participants ENABLE ROW LEVEL SECURITY;

-- O dono da memória pode adicionar participantes
CREATE POLICY "Memory owner can add participants"
  ON public.memory_participants FOR INSERT
  WITH CHECK (
    auth.uid() = added_by AND
    EXISTS (
      SELECT 1 FROM public.memories
      WHERE memories.id = memory_participants.memory_id
        AND memories.user_id = auth.uid()
    )
  );

-- O dono da memória pode remover participantes
CREATE POLICY "Memory owner can delete participants"
  ON public.memory_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.memories
      WHERE memories.id = memory_participants.memory_id
        AND memories.user_id = auth.uid()
    )
  );

-- Participantes podem ver memórias em que foram marcados; dono também pode ver
CREATE POLICY "Participants and owner can view participants"
  ON public.memory_participants FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = added_by OR
    EXISTS (
      SELECT 1 FROM public.memories
      WHERE memories.id = memory_participants.memory_id
        AND memories.user_id = auth.uid()
    )
  );
