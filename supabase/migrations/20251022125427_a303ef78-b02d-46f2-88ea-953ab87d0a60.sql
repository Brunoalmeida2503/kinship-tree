-- Criar políticas de storage para o bucket posts
-- Permitir que usuários autenticados façam upload de suas próprias mídias

CREATE POLICY "Usuários podem fazer upload de suas próprias mídias"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem visualizar mídias públicas"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posts');

CREATE POLICY "Usuários podem deletar suas próprias mídias"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem atualizar suas próprias mídias"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);