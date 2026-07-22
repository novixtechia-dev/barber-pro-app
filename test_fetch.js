import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key) env[key] = val.join('=').replace(/"/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/profiles?select=*';
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

fetch(url, {
  headers: {
    apikey: key,
    Authorization: 'Bearer ' + key,
  }
}).then(res => res.json()).then(data => {
  console.log('Profiles returned:', data.length);
  if (data.length === 0 || data.error) console.log(data);
}).catch(console.error);
