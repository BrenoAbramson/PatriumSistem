import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';

// Load variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    fetch: fetch
  },
  realtime: {
    transport: ws
  }
});

async function main() {
  const email = 'adm@patrium.com';
  const newPassword = 'Patrium@123'; // Senha nova simplificada
  
  try {
    console.log(`Buscando usuário ${email}...`);
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    
    const existingUser = users.find(u => u.email === email);
    if (!existingUser) {
      console.error(`Usuário ${email} não encontrado.`);
      return;
    }
    
    console.log(`Usuário encontrado. Redefinindo senha para: ${newPassword}...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: newPassword }
    );
    
    if (updateError) throw updateError;
    console.log("\nSenha redefinida com sucesso!");
    console.log(`E-mail: ${email}`);
    console.log(`Nova Senha: ${newPassword}`);
  } catch (err) {
    console.error("Erro ao redefinir senha:", err);
  }
}

main();
