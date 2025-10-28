-- Add DELETE policy for missions table
CREATE POLICY "Users can delete their own missions"
ON missions
FOR DELETE
USING (auth.uid() = user_id);

-- Check if mission_actions foreign key exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'mission_actions_target_user_id_fkey'
    ) THEN
        ALTER TABLE mission_actions 
        ADD CONSTRAINT mission_actions_target_user_id_fkey 
        FOREIGN KEY (target_user_id) 
        REFERENCES profiles(id) 
        ON DELETE CASCADE;
    END IF;
END $$;