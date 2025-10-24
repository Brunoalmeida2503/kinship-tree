-- Políticas para upload de avatares de grupos no bucket avatars

-- Permitir que criadores de grupos façam upload de avatares de seus grupos
CREATE POLICY "Group creators can upload group avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.groups WHERE created_by = auth.uid()
  )
);

-- Permitir que criadores de grupos atualizem avatares de seus grupos
CREATE POLICY "Group creators can update group avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.groups WHERE created_by = auth.uid()
  )
);

-- Permitir que criadores de grupos deletem avatares de seus grupos
CREATE POLICY "Group creators can delete group avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.groups WHERE created_by = auth.uid()
  )
);