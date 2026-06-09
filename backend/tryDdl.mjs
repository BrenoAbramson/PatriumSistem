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
  // Try common SQL execution RPC names
  const queries = [
    { name: 'exec_sql', params: { query: 'SELECT 1' } },
    { name: 'exec_sql', params: { sql: 'SELECT 1' } },
    { name: 'run_sql', params: { query: 'SELECT 1' } },
    { name: 'run_sql', params: { sql: 'SELECT 1' } },
    { name: 'execute_sql', params: { query: 'SELECT 1' } }
  ];

  for (const q of queries) {
    try {
      console.log(`Trying RPC '${q.name}' with params:`, q.params);
      const { data, error } = await supabase.rpc(q.name, q.params);
      if (error) {
        console.log(`-> RPC '${q.name}' failed: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`-> RPC '${q.name}' SUCCESS! Data:`, data);
        return;
      }
    } catch (e) {
      console.log(`-> RPC '${q.name}' threw exception:`, e.message);
    }
  }

  console.log("No default SQL execution RPC found.");
}

main();
