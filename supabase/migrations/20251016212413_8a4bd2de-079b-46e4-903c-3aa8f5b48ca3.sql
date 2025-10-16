-- Criar tabela para armazenar conversas com AURA
CREATE TABLE public.aura_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para armazenar perfil de personalidade da AURA por usuário
CREATE TABLE public.aura_personality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  interactions_count INTEGER NOT NULL DEFAULT 0,
  personality_traits JSONB NOT NULL DEFAULT '{
    "friendliness": 5,
    "formality": 5,
    "helpfulness": 5,
    "humor": 5,
    "empathy": 5
  }'::jsonb,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  common_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.aura_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aura_personality ENABLE ROW LEVEL SECURITY;

-- Políticas para aura_conversations
CREATE POLICY "Users can view their own conversations"
ON public.aura_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.aura_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Políticas para aura_personality
CREATE POLICY "Users can view their own personality profile"
ON public.aura_personality FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personality profile"
ON public.aura_personality FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personality profile"
ON public.aura_personality FOR UPDATE
USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX idx_aura_conversations_user_id ON public.aura_conversations(user_id);
CREATE INDEX idx_aura_conversations_created_at ON public.aura_conversations(created_at DESC);
CREATE INDEX idx_aura_personality_user_id ON public.aura_personality(user_id);