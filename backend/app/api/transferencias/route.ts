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

// GET /api/transferencias - List transfer records for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!isUuid(empresaId)) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('transferencias')
      .select('*, patrimonios(id, nome, numero_patrimonial), setor_origem:setores!setor_origem_id(id, nome), setor_destino:setores!setor_destino_id(id, nome)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || [], { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/transferencias:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao buscar transferências.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/transferencias - Create a transfer and update asset's sector/responsible
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      empresa_id, 
      patrimonio_id, 
      setor_origem_id, 
      setor_destino_id, 
      responsavel_origem, 
      responsavel_destino, 
      solicitante,
      motivo,
      operatorId
    } = body;

    if (!empresa_id || !patrimonio_id || !setor_destino_id || !solicitante) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes para transferência.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Insert transfer log
    const { data: transferData, error: transferError } = await supabaseAdmin
      .from('transferencias')
      .insert({
        empresa_id,
        patrimonio_id,
        setor_origem_id: setor_origem_id || null,
        setor_destino_id,
        responsavel_origem: responsavel_origem || null,
        responsavel_destino: responsavel_destino || null,
        solicitante,
        status: 'Aprovada',
        motivo: motivo || null
      })
      .select()
      .single();

    if (transferError) throw transferError;

    // 2. Update patrimonio details
    const { error: updateError } = await supabaseAdmin
      .from('patrimonios')
      .update({
        setor_atual_id: setor_destino_id,
        responsavel: responsavel_destino || null
      })
      .eq('id', patrimonio_id);

    if (updateError) throw updateError;

    await logAuditoria({
      empresa_id: empresa_id,
      entidade_id: transferData.id,
      entidade_tipo: 'transferencias',
      acao: 'TRANSFERENCIA',
      alterado_por: operatorId || null,
      dados_novos: transferData
    });

    return NextResponse.json(transferData, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in POST /api/transferencias:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao realizar transferência.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
