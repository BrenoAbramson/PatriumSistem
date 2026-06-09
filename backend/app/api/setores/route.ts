import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { logAuditoria } from '../../../lib/audit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// GET /api/setores - List sectors for a company using admin client
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!isUuid(empresaId)) {
      // Retorna array vazio em vez de dar erro 500 no Postgres para IDs inválidos/indefinidos
      return NextResponse.json([], { headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('setores')
      .select('id, nome, gestor, descricao')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (error) throw error;

    return NextResponse.json(data || [], { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/setores:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao buscar setores.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/setores - Create a new sector using admin client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, gestor, descricao, empresaId, operatorId } = body;

    if (!nome || !empresaId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: nome e empresaId.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('setores')
      .insert({
        nome: nome,
        gestor: gestor || null,
        descricao: descricao || null,
        empresa_id: empresaId
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditoria({
      empresa_id: empresaId,
      entidade_id: data.id,
      entidade_tipo: 'setores',
      acao: 'CRIACAO',
      alterado_por: operatorId || null,
      dados_novos: data
    });

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in POST /api/setores:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao cadastrar setor.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
