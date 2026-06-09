import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: fetch },
  realtime: { transport: ws }
});

async function main() {
  const { data: users, error: uError } = await supabase.from('usuarios').select('*, empresas(*)');
  console.log("Users in database:");
  console.log(JSON.stringify(users, null, 2));
}

main();
