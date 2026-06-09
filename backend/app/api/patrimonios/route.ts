import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { logAuditoria } from '../../../lib/audit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

// GET /api/patrimonios - List assets for a company using admin client
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!isUuid(empresaId)) {
      // Retorna array vazio em vez de dar erro 500 no Postgres para IDs inválidos/indefinidos
      return NextResponse.json([], { headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('patrimonios')
      .select('*, setores(id, nome), categorias(id, nome)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || [], { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/patrimonios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao buscar patrimônios.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/patrimonios - Create a new asset using admin client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresa_id } = body;

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'empresa_id é obrigatório.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { operatorId, ...patrimonioData } = body;

    // Calculate next sequential asset number for this company
    const { count, error: countError } = await supabaseAdmin
      .from('patrimonios')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresa_id);

    if (countError) throw countError;

    const nextNumber = (count || 0) + 1;
    patrimonioData.numero_patrimonial = nextNumber.toString();

    const { data: insertedPat, error } = await supabaseAdmin
      .from('patrimonios')
      .insert(patrimonioData)
      .select()
      .single();

    if (error) throw error;

    await logAuditoria({
      empresa_id: insertedPat.empresa_id,
      entidade_id: insertedPat.id,
      entidade_tipo: 'patrimonios',
      acao: 'CRIACAO',
      alterado_por: operatorId || null,
      dados_novos: insertedPat
    });

    return NextResponse.json({ success: true, numero_patrimonial: insertedPat.numero_patrimonial }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in POST /api/patrimonios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao salvar patrimônio.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH /api/patrimonios - Update an existing asset
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, categoria_id, modelo, fabricante, numero_serie } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id do patrimônio é obrigatório para atualização.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updateData: any = {};
    if (categoria_id !== undefined) updateData.categoria_id = categoria_id || null;
    if (modelo !== undefined) updateData.modelo = modelo || null;
    if (fabricante !== undefined) updateData.fabricante = fabricante || null;
    if (numero_serie !== undefined) updateData.numero_serie = numero_serie || null;

    const { error } = await supabaseAdmin
      .from('patrimonios')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in PATCH /api/patrimonios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar patrimônio.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/patrimonios - Delete an existing asset
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const operatorId = searchParams.get('operatorId');

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { error: 'ID inválido ou ausente para exclusão.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch old asset details before deleting for audit log
    const { data: oldPat, error: fetchError } = await supabaseAdmin
      .from('patrimonios')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabaseAdmin
      .from('patrimonios')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditoria({
      empresa_id: oldPat.empresa_id,
      entidade_id: id,
      entidade_tipo: 'patrimonios',
      acao: 'EXCLUSAO',
      alterado_por: operatorId || null,
      dados_anteriores: oldPat
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in DELETE /api/patrimonios:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao excluir patrimônio.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
