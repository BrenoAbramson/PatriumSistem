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
  try {
    // Get the empresa
    const { data: empresa, error: empError } = await supabase
      .from('empresas')
      .select('id')
      .eq('cnpj', '00000000000000')
      .single();
      
    if (empError) throw empError;
    
    const sectors = [
      { nome: 'Tecnologia da Informação', descricao: 'Departamento de TI, infraestrutura e suporte' },
      { nome: 'Administração', descricao: 'Escritório administrativo central' },
      { nome: 'Financeiro', descricao: 'Contabilidade e gestão financeira' },
      { nome: 'Recursos Humanos', descricao: 'Gestão de pessoas e talentos' },
      { nome: 'Logística', descricao: 'Depósito e transporte' }
    ];
    
    console.log(`Seeding sectors for Empresa ID: ${empresa.id}...`);
    for (const sec of sectors) {
      // Check if it already exists
      const { data: existing, error: findError } = await supabase
        .from('setores')
        .select('id')
        .eq('empresa_id', empresa.id)
        .eq('nome', sec.nome)
        .maybeSingle();
        
      if (findError) throw findError;
      
      if (!existing) {
        const { error: insertError } = await supabase
          .from('setores')
          .insert({
            empresa_id: empresa.id,
            nome: sec.nome,
            descricao: sec.descricao
          });
        if (insertError) throw insertError;
        console.log(`Sector '${sec.nome}' seeded.`);
      } else {
        console.log(`Sector '${sec.nome}' already exists.`);
      }
    }
    console.log("Seeding complete!");
  } catch (err) {
    console.error("Error seeding sectors:", err);
  }
}

main();
