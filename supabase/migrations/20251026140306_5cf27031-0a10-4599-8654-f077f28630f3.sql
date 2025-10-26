-- Allow authenticated users to search all profiles for mission feature
CREATE POLICY "Authenticated users can search all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);