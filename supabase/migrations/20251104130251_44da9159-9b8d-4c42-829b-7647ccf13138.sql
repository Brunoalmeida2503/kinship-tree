-- Enable realtime for profiles table to sync language changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;