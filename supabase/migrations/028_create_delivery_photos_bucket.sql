-- Create storage bucket for delivery photos (bilty and signature photos)
-- Note: This must be run in Supabase SQL Editor or via dashboard
-- Migrations may not support storage bucket creation directly

-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-photos',
  'delivery-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete delivery photos" ON storage.objects;

-- Set up RLS policies for the delivery-photos bucket
CREATE POLICY "Allow authenticated users to upload delivery photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery-photos');

CREATE POLICY "Allow authenticated users to read delivery photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'delivery-photos');

CREATE POLICY "Allow authenticated users to update their delivery photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'delivery-photos');

CREATE POLICY "Allow authenticated users to delete delivery photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'delivery-photos');
