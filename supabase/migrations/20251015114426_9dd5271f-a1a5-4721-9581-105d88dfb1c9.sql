-- Create missions table
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  current_degree integer NOT NULL DEFAULT 0,
  path jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT different_users CHECK (user_id != target_id)
);

-- Create mission_actions table
CREATE TABLE public.mission_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('message', 'invite', 'reaction', 'connection')),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  degree integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create mission_suggestions table
CREATE TABLE public.mission_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  suggested_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  degree integer NOT NULL,
  connection_strength integer DEFAULT 1,
  common_connections integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missions
CREATE POLICY "Users can view their own missions"
ON public.missions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own missions"
ON public.missions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own missions"
ON public.missions FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for mission_actions
CREATE POLICY "Users can view actions for their missions"
ON public.mission_actions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.missions
  WHERE missions.id = mission_actions.mission_id
  AND missions.user_id = auth.uid()
));

CREATE POLICY "Users can create actions for their missions"
ON public.mission_actions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.missions
  WHERE missions.id = mission_actions.mission_id
  AND missions.user_id = auth.uid()
));

-- RLS Policies for mission_suggestions
CREATE POLICY "Users can view suggestions for their missions"
ON public.mission_suggestions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.missions
  WHERE missions.id = mission_suggestions.mission_id
  AND missions.user_id = auth.uid()
));

CREATE POLICY "Users can create suggestions for their missions"
ON public.mission_suggestions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.missions
  WHERE missions.id = mission_suggestions.mission_id
  AND missions.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_missions_user_id ON public.missions(user_id);
CREATE INDEX idx_missions_status ON public.missions(status);
CREATE INDEX idx_mission_actions_mission_id ON public.mission_actions(mission_id);
CREATE INDEX idx_mission_suggestions_mission_id ON public.mission_suggestions(mission_id);