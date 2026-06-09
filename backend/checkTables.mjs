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
  const tables = ['empresas', 'usuarios', 'patrimonios', 'movimentacoes', 'auditorias', 'setores'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}': ERROR: ${error.message} (code: ${error.code})`);
    } else {
      console.log(`Table '${table}': SUCCESS (found ${data.length} records)`);
    }
  }
}

main();
