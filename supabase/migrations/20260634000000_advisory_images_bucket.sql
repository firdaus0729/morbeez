-- Farmer crop photos for agronomist case review (WhatsApp / Crop Doctor).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'advisory-images',
  'advisory-images',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY advisory_images_select ON storage.objects
  FOR SELECT USING (bucket_id = 'advisory-images');

CREATE POLICY advisory_images_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'advisory-images');

CREATE POLICY advisory_images_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'advisory-images');

CREATE POLICY advisory_images_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'advisory-images');
