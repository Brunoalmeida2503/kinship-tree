-- Add connection_type to differentiate family and friends
ALTER TABLE public.connections 
ADD COLUMN connection_type text NOT NULL DEFAULT 'family';

-- Add check constraint to ensure valid connection types
ALTER TABLE public.connections
ADD CONSTRAINT valid_connection_type CHECK (connection_type IN ('family', 'friend'));