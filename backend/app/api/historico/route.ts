import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

const isUuid = (val: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

// GET /api/historico - List audit/history logs for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const userPerfil = searchParams.get('perfil'); // profile of the requesting user

    if (!isUuid(empresaId)) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('auditoria')
      .select('*, usuarios:usuarios!alterado_por(id, nome)')
      .eq('empresa_id', empresaId)
      .order('data_hora', { ascending: false });

    if (error) throw error;

    let logs = data || [];

    // Security check: Only administrators and company managers ('Cliente-Gerente') can see user logs
    const isManagerOrAdmin = userPerfil === 'Cliente-Gerente' || userPerfil === 'Administrador';
    if (!isManagerOrAdmin) {
      // Filter out user-related logs
      logs = logs.filter(log => log.entidade_tipo !== 'usuarios');
    }

    return NextResponse.json(logs, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/historico:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao carregar histórico.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
