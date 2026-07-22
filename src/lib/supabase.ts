import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';

// Singleton para evitar "Multiple GoTrueClient instances" e garantir que cookies sejam usados!
let _supabase: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!_supabase) {
    _supabase = createClientComponentClient();
  }
  return _supabase;
};

export const supabase = getSupabaseClient();

// Server-side client (com service_role para cron/edge functions)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key_for_client'
);

// Helper: get session server-side
export async function getServerSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Helper: upload de mídia
export async function uploadMedia(
  bucket: 'avatars' | 'portfolio' | 'stories' | 'promotions',
  file: File,
  userId: string
): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
