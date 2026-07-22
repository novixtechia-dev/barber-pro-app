-- 1. Remove a permissão de admin de todos que atualmente são admin, voltando-os para cliente
UPDATE profiles
SET role = 'client'
WHERE role = 'admin';

-- 2. Concede a permissão de admin APENAS para admin@gmail.com
UPDATE profiles
SET role = 'admin'
FROM auth.users
WHERE auth.users.id = profiles.id
AND auth.users.email = 'admin@gmail.com';

-- 3. Adiciona a coluna email na tabela profiles caso não exista
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 4. Preenche a coluna email com os emails da tabela auth.users
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE auth.users.id = profiles.id;
