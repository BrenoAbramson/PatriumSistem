import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

// CORS Headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight options request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET /api/get-profile - Fetch profile by userId bypassing RLS
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Parâmetro userId obrigatório.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('usuarios')
      .select('*, empresas(*)')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error(`Error fetching profile for user ${userId}:`, fetchError);
      return NextResponse.json(
        { error: 'Perfil não encontrado.' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(profile, { headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in GET /api/get-profile:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno ao carregar perfil.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
