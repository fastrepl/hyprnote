INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "assets_select_owner" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'assets' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "assets_insert_authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "assets_update_owner" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assets' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "assets_delete_owner" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assets' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "assets_public_read" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'assets');
