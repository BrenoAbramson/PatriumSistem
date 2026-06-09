import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { logAuditoria } from '../../../../lib/audit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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

// GET /api/auditorias/itens - Get checklist items of an audit session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessaoId = searchParams.get('sessaoId');

    if (!isUuid(sessaoId)) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('auditorias_itens')
      .select('*, patrimonios(id, nome, numero_patrimonial, modelo, fabricante, numero_serie, estado, categorias(id, nome))')
      .eq('auditoria_sessao_id', sessaoId)
      .order('created_at');

    if (error) throw error;

    return NextResponse.json(data || [], { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/auditorias/itens:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao carregar itens da auditoria.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH /api/auditorias/itens - Update checklist item status, verify checkbox and update asset state
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, verificado, estado_novo, observacao, operatorId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do item é obrigatório.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch current item details and associated asset
    const { data: item, error: fetchError } = await supabaseAdmin
      .from('auditorias_itens')
      .select('*, auditorias_sessao(empresa_id), patrimonios(id, estado, nome, numero_patrimonial)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Update auditorias_itens record
    const { error: updateItemError } = await supabaseAdmin
      .from('auditorias_itens')
      .update({
        verificado,
        estado_novo,
        observacao: observacao === undefined ? null : observacao
      })
      .eq('id', id);

    if (updateItemError) throw updateItemError;

    // Log the verification status change in the system history log
    const verificationChanged = item.verificado !== verificado;
    if (verificationChanged) {
      await logAuditoria({
        empresa_id: item.auditorias_sessao.empresa_id,
        entidade_id: item.auditoria_sessao_id,
        entidade_tipo: 'auditorias',
        acao: 'ALTERACAO',
        alterado_por: operatorId || null,
        dados_anteriores: { verificado: item.verificado, patrimonio_id: item.patrimonio_id },
        dados_novos: { 
          verificado, 
          patrimonio_id: item.patrimonio_id, 
          patrimonio_nome: item.patrimonios.nome,
          numero_patrimonial: item.patrimonios.numero_patrimonial,
          observacao: observacao || null
        }
      });
    }

    // 3. If asset state has changed, update patrimonios table
    const stateHasChanged = item.patrimonios.estado !== estado_novo;
    if (stateHasChanged && estado_novo) {
      const { error: updatePatError } = await supabaseAdmin
        .from('patrimonios')
        .update({ estado: estado_novo })
        .eq('id', item.patrimonio_id);

      if (updatePatError) throw updatePatError;

      // Log the asset status change in the system history log
      await logAuditoria({
        empresa_id: item.auditorias_sessao.empresa_id,
        entidade_id: item.patrimonio_id,
        entidade_tipo: 'patrimonios',
        acao: 'ALTERACAO',
        alterado_por: operatorId || null,
        dados_anteriores: { estado: item.patrimonios.estado },
        dados_novos: { 
          estado: estado_novo, 
          motivo: 'Alterado durante auditoria', 
          auditoria_sessao_id: item.auditoria_sessao_id 
        }
      });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in PATCH /api/auditorias/itens:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar item da auditoria.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
