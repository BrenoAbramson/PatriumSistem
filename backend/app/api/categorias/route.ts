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

// GET /api/categorias - List categories for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    // Query categories that are global (empresa_id is null) or match the current company
    let query = supabaseAdmin
      .from('categorias')
      .select('*');

    if (isUuid(empresaId)) {
      query = query.or(`empresa_id.is.null,empresa_id.eq.${empresaId}`);
    } else {
      query = query.is('empresa_id', null);
    }

    const { data, error } = await query.order('nome');

    if (error) throw error;

    return NextResponse.json(data || [], { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/categorias:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao buscar categorias.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/categorias - Add new category for a company
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, empresaId, operatorId } = body;

    if (!nome || !empresaId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: nome e empresaId.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Insert into Supabase database using admin key
    const { data, error } = await supabaseAdmin
      .from('categorias')
      .insert({
        nome: nome,
        empresa_id: empresaId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // constraint unique_empresa_categoria
        return NextResponse.json(
          { error: 'Esta categoria já está cadastrada para esta empresa.' },
          { status: 400, headers: corsHeaders }
        );
      }
      throw error;
    }

    await logAuditoria({
      empresa_id: empresaId,
      entidade_id: data.id,
      entidade_tipo: 'categorias',
      acao: 'CRIACAO',
      alterado_por: operatorId || null,
      dados_novos: data
    });

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in POST /api/categorias:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao criar categoria.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
