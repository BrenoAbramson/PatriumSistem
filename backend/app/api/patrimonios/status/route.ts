import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { logAuditoria } from '../../../../lib/audit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// PATCH /api/patrimonios/status - Direct update of single asset status/estado
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, estado_novo, operatorId, motivo } = body;

    if (!id || !estado_novo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: id e estado_novo.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch current patrimonio
    const { data: pat, error: fetchError } = await supabaseAdmin
      .from('patrimonios')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Update state in database
    const { error: updateError } = await supabaseAdmin
      .from('patrimonios')
      .update({ estado: estado_novo })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Log event in audit table
    await logAuditoria({
      empresa_id: pat.empresa_id,
      entidade_id: id,
      entidade_tipo: 'patrimonios',
      acao: 'ALTERACAO',
      alterado_por: operatorId || null,
      dados_anteriores: { estado: pat.estado },
      dados_novos: { estado: estado_novo, motivo: motivo || 'Alteração individual direta' }
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in PATCH /api/patrimonios/status:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao atualizar status do bem.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
