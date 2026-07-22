-- Criação do Bucket "uploads" no Supabase Storage
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Política para permitir que qualquer pessoa veja/baixe os arquivos (Public)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'uploads' );

-- Política para permitir que usuários logados enviem arquivos
create policy "Authenticated users can upload files"
on storage.objects for insert
with check (
  bucket_id = 'uploads' AND auth.role() = 'authenticated'
);

-- Política para permitir que usuários deletem seus próprios arquivos (ou admins deletem qualquer um)
-- Como é mais simples, vamos permitir que qualquer usuário autenticado delete arquivos do bucket 'uploads'
create policy "Authenticated users can delete files"
on storage.objects for delete
using (
  bucket_id = 'uploads' AND auth.role() = 'authenticated'
);
