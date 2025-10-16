-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Add is_private field to groups table
ALTER TABLE public.groups ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

-- Create group_memories table
CREATE TABLE public.group_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on group_memories
ALTER TABLE public.group_memories ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_memories
CREATE POLICY "Group members can view group memories"
  ON public.group_memories FOR SELECT
  USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can create memories"
  ON public.group_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can update their own group memories"
  ON public.group_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group memories"
  ON public.group_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Create group_memory_media table
CREATE TABLE public.group_memory_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_memory_id UUID NOT NULL REFERENCES public.group_memories(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on group_memory_media
ALTER TABLE public.group_memory_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_memory_media
CREATE POLICY "Group members can view group memory media"
  ON public.group_memory_media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_memories gm
    WHERE gm.id = group_memory_media.group_memory_id
    AND is_group_member(auth.uid(), gm.group_id)
  ));

CREATE POLICY "Users can create media for their group memories"
  ON public.group_memory_media FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_memories
    WHERE group_memories.id = group_memory_media.group_memory_id
    AND group_memories.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete media from their group memories"
  ON public.group_memory_media FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.group_memories
    WHERE group_memories.id = group_memory_media.group_memory_id
    AND group_memories.user_id = auth.uid()
  ));

-- Create function to notify users
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (_user_id, _type, _title, _message, _link)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create trigger to notify on join request approval
CREATE OR REPLACE FUNCTION public.notify_on_join_request_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_name TEXT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    SELECT name INTO group_name FROM public.groups WHERE id = NEW.group_id;
    
    PERFORM public.notify_user(
      NEW.user_id,
      'group_join_approved',
      'Solicitação Aprovada',
      'Sua solicitação para entrar no grupo "' || group_name || '" foi aprovada!',
      '/group/' || NEW.group_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_join_request_approved
  AFTER UPDATE ON public.group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_join_request_approved();

-- Create trigger to notify group admin on new join request
CREATE OR REPLACE FUNCTION public.notify_admin_on_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  group_name TEXT;
  requester_name TEXT;
BEGIN
  SELECT created_by, name INTO admin_id, group_name 
  FROM public.groups WHERE id = NEW.group_id;
  
  SELECT full_name INTO requester_name 
  FROM public.profiles WHERE id = NEW.user_id;
  
  PERFORM public.notify_user(
    admin_id,
    'group_join_request',
    'Nova Solicitação de Entrada',
    requester_name || ' solicitou entrar no grupo "' || group_name || '"',
    '/group/' || NEW.group_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_join_request
  AFTER INSERT ON public.group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_join_request();