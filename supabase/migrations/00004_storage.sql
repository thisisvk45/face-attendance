-- Create storage bucket for face images
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-images', 'face-images', false);

-- Storage policies
CREATE POLICY "Admins can upload face images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'face-images' AND
    auth.uid() IN (SELECT id FROM admins)
  );

CREATE POLICY "Admins can read face images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'face-images' AND
    auth.uid() IN (SELECT id FROM admins)
  );

CREATE POLICY "Admins can delete face images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'face-images' AND
    auth.uid() IN (SELECT id FROM admins)
  );

CREATE POLICY "Anon can read face images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'face-images' AND
    auth.role() = 'anon'
  );
