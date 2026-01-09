-- Create table for streaming watch history
CREATE TABLE public.streaming_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie', -- movie, series, episode
  tmdb_id TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  year INTEGER,
  streaming_service TEXT, -- netflix, prime, disney, etc
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  share_with_tree BOOLEAN NOT NULL DEFAULT false,
  is_recommendation BOOLEAN NOT NULL DEFAULT false,
  trakt_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.streaming_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own history"
ON public.streaming_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared history from connections"
ON public.streaming_history
FOR SELECT
USING (
  share_with_tree = true
  AND EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
    AND (
      (requester_id = auth.uid() AND receiver_id = streaming_history.user_id)
      OR (receiver_id = auth.uid() AND requester_id = streaming_history.user_id)
    )
  )
);

CREATE POLICY "Users can insert their own history"
ON public.streaming_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history"
ON public.streaming_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history"
ON public.streaming_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_streaming_history_user_id ON public.streaming_history(user_id);
CREATE INDEX idx_streaming_history_watched_at ON public.streaming_history(watched_at DESC);
CREATE INDEX idx_streaming_history_share ON public.streaming_history(share_with_tree) WHERE share_with_tree = true;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_streaming_history_updated_at
BEFORE UPDATE ON public.streaming_history
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create table for direct recommendations to specific users
CREATE TABLE public.streaming_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  history_item_id UUID NOT NULL REFERENCES public.streaming_history(id) ON DELETE CASCADE,
  message TEXT,
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for recommendations
ALTER TABLE public.streaming_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for recommendations
CREATE POLICY "Users can view recommendations sent to them"
ON public.streaming_recommendations
FOR SELECT
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can view recommendations they sent"
ON public.streaming_recommendations
FOR SELECT
USING (auth.uid() = from_user_id);

CREATE POLICY "Users can send recommendations to connections"
ON public.streaming_recommendations
FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id
  AND EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
    AND (
      (requester_id = auth.uid() AND receiver_id = to_user_id)
      OR (receiver_id = auth.uid() AND requester_id = to_user_id)
    )
  )
);

CREATE POLICY "Users can update recommendations sent to them"
ON public.streaming_recommendations
FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their sent recommendations"
ON public.streaming_recommendations
FOR DELETE
USING (auth.uid() = from_user_id);