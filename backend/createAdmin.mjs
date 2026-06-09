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
  const password = 'bZ0){&73+£Wq';
  
  try {
    // 1. Create/Get Empresa (Tenant)
    console.log("Creating/Fetching Empresa...");
    let empresa;
    const { data: insertedEmpresa, error: empresaError } = await supabase
      .from('empresas')
      .insert({ nome: 'Patrium Admin', cnpj: '00000000000000' })
      .select()
      .maybeSingle();
      
    if (empresaError) {
      if (empresaError.code === '23505') { // Duplicate CNPJ
        console.log("Empresa already exists, fetching existing...");
        const { data: existingEmpresa, error: fetchError } = await supabase
          .from('empresas')
          .select()
          .eq('cnpj', '00000000000000')
          .single();
        if (fetchError) throw fetchError;
        empresa = existingEmpresa;
      } else {
        throw empresaError;
      }
    } else {
      empresa = insertedEmpresa;
    }
    
    if (!empresa) {
      // If insert succeeded but single() didn't return, retrieve it
      const { data: existingEmpresa, error: fetchError } = await supabase
        .from('empresas')
        .select()
        .eq('cnpj', '00000000000000')
        .single();
      if (fetchError) throw fetchError;
      empresa = existingEmpresa;
    }
    
    console.log("Empresa ID: ", empresa.id);

    // 2. Create Auth User in Supabase
    console.log("Creating Auth User...");
    let userId;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });
    
    if (authError) {
      if (
        authError.message.includes('already exists') || 
        authError.message.includes('already been registered') ||
        authError.code === '23505' ||
        authError.code === 'email_exists'
      ) {
        console.log("User already exists in Auth. Fetching existing user...");
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = users.find(u => u.email === email);
        if (!existingUser) throw new Error("User exists but could not find it in the list.");
        userId = existingUser.id;
      } else {
        throw authError;
      }
    } else {
      userId = authUser?.user?.id;
    }
    
    if (!userId) {
      throw new Error("Could not get User ID.");
    }
    console.log("Auth user ID: ", userId);

    // 3. Insert into usuarios table
    console.log("Creating user profile...");
    const { error: profileError } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        empresa_id: empresa.id,
        nome: 'Administrador Patrium',
        email: email,
        perfil: 'Administrador'
      });
      
    if (profileError) {
      if (profileError.code === '23505') {
        console.log("Profile already exists in usuarios table.");
      } else {
        throw profileError;
      }
    } else {
      console.log("Profile created successfully!");
    }
    
    console.log(`\nSuccess! Admin ready.\nEmail: ${email}\nPassword: ${password}\nTenant ID: ${empresa.id}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
