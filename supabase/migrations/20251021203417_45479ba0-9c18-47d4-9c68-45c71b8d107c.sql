-- Fix: Profiles Exposed to All Authenticated Users
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can view profiles of accepted connections only
CREATE POLICY "Connected users can view profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND receiver_id = profiles.id)
         OR (receiver_id = auth.uid() AND requester_id = profiles.id))
  )
);