import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { logAuditoria } from '../../../../lib/audit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// POST /api/auditorias/concluir - Concluir uma sessão de auditoria
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, operatorId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da sessão é obrigatório.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: session, error: updateError } = await supabaseAdmin
      .from('auditorias_sessao')
      .update({ status: 'Concluída' })
      .eq('id', id)
      .select('*, setores(nome)')
      .single();

    if (updateError) throw updateError;

    // Log the audit session completion in system history
    await logAuditoria({
      empresa_id: session.empresa_id,
      entidade_id: session.id,
      entidade_tipo: 'auditorias',
      acao: 'CONCLUSAO',
      alterado_por: operatorId || null,
      dados_novos: {
        id: session.id,
        setor_id: session.setor_id,
        setor_nome: session.setores?.nome || 'Desconhecido',
        gestor: session.gestor,
        responsavel: session.responsavel,
        status: session.status
      }
    });

    return NextResponse.json({ success: true, session }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in POST /api/auditorias/concluir:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao concluir auditoria.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
