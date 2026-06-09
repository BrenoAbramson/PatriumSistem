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
  const { data: policies, error } = await supabase.rpc('get_policies'); // may not exist
  if (error) {
    // Let's query pg_policies using RPC if we can, or let's run a query by checking if pg_policies is exposed or if we can run a direct SQL check.
    // Wait, since we don't have direct SQL, let's see if we can do something else, like inserting/reading as anon.
    console.log("Error querying policies:", error.message);
  }
  
  // Let's do a select pg_catalog check
  const { data: pgData, error: pgError } = await supabase
    .from('usuarios')
    .select('id')
    .limit(1);
    
  console.log("Direct read check as admin on usuarios:", { pgData, pgError });
}

main();
