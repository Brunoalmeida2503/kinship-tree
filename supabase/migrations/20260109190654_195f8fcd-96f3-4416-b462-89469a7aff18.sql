-- Add new relationship types for in-laws
ALTER TYPE public.relationship_type ADD VALUE IF NOT EXISTS 'sogro';
ALTER TYPE public.relationship_type ADD VALUE IF NOT EXISTS 'sogra';
ALTER TYPE public.relationship_type ADD VALUE IF NOT EXISTS 'cunhado';
ALTER TYPE public.relationship_type ADD VALUE IF NOT EXISTS 'cunhada';