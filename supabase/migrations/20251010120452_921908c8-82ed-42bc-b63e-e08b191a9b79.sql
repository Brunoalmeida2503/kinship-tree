-- Fix: Restrict profile visibility to authenticated users only
-- Drop the existing public policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Optional: Add a more restrictive policy for connection-based visibility (commented out for now)
-- This can be enabled later if stricter privacy is needed
-- CREATE POLICY "Users can view connected profiles"
-- ON public.profiles
-- FOR SELECT
-- TO authenticated
-- USING (
--   auth.uid() = id OR
--   EXISTS (
--     SELECT 1 FROM public.connections
--     WHERE status = 'accepted'
--     AND ((requester_id = auth.uid() AND receiver_id = profiles.id)
--       OR (receiver_id = auth.uid() AND requester_id = profiles.id))
--   )
-- );