import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const url = `${supabaseUrl}/rest/v1/`;
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  });
  
  const responseText = await response.text();
  console.log("Raw response length:", responseText.length);
  console.log("Response text:", responseText);
  try {
    const schema = JSON.parse(responseText);
    console.log("Tables in schema:", Object.keys(schema.paths || {}));
    
    // Print the definition of /empresas
    const empresas = schema.definitions?.empresas;
    if (empresas) {
      console.log("\nProperties of empresas:");
      console.log(JSON.stringify(empresas.properties, null, 2));
      console.log("\nRequired fields for empresas:");
      console.log(empresas.required);
    } else {
      console.log("empresas definition not found");
    }
  } catch (err) {
    console.error("Failed to parse JSON. Response:", responseText);
  }
}

main();
