import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key) env[key] = val.join('=').replace(/"/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, avatar_url, created_at')
      .order('created_at', { ascending: false });
  console.log('profiles', profiles.length);
  
  let targetProfiles = profiles;
  const enriched = await Promise.all(targetProfiles.map(async (p) => {
      if (p.role === 'client') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('barber_id, barber:barbers(id, display_name)')
          .eq('client_id', p.id)
          .in('status', ['completed', 'confirmed']);

        const uniqueBarbers = {};
        (bookings || []).forEach((b) => {
          if (b.barber_id && b.barber) {
            uniqueBarbers[b.barber_id] = b.barber;
          }
        });

        return {
          ...p,
          barbers: Object.values(uniqueBarbers),
          total_cuts: bookings?.filter(b => b.barber_id).length || 0,
        };
      }
      return { ...p, barbers: [], total_cuts: 0 };
    }));
    console.log('Enriched:', enriched.length);
}
main();
