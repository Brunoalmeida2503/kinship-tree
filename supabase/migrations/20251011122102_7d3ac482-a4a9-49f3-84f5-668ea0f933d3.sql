-- Add latitude and longitude to profiles table for map visualization
ALTER TABLE public.profiles
ADD COLUMN latitude decimal(10, 8),
ADD COLUMN longitude decimal(11, 8);

-- Add index for location queries
CREATE INDEX idx_profiles_location ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;