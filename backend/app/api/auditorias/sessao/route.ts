import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { logAuditoria } from '../../../../lib/audit';

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

// GET /api/auditorias/sessao - List audit sessions for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!isUuid(empresaId)) {
      return NextResponse.json([], { headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('auditorias_sessao')
      .select('*, setores(id, nome), auditorias_itens(verificado)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || [], { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/auditorias/sessao:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao carregar sessões de auditoria.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/auditorias/sessao - Start a new audit session and create checklist items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresa_id, setor_id, gestor, responsavel, operatorId } = body;

    if (!empresa_id || !setor_id || !responsavel) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: empresa_id, setor_id e responsavel.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Create audit session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('auditorias_sessao')
      .insert({
        empresa_id,
        setor_id,
        gestor: gestor || null,
        responsavel,
        status: 'Em Andamento'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Fetch sector name for audit log
    const { data: setorData } = await supabaseAdmin
      .from('setores')
      .select('nome')
      .eq('id', setor_id)
      .single();
    const setorNome = setorData?.nome || 'Desconhecido';

    // 2. Fetch all patrimonios currently active in that sector
    const { data: patrimonios, error: patError } = await supabaseAdmin
      .from('patrimonios')
      .select('id, estado')
      .eq('setor_atual_id', setor_id)
      .eq('empresa_id', empresa_id);

    if (patError) throw patError;

    // 3. Create items in auditorias_itens for each asset
    const itemsToInsert = (patrimonios || []).map(pat => ({
      auditoria_sessao_id: session.id,
      patrimonio_id: pat.id,
      verificado: false,
      estado_anterior: pat.estado,
      estado_novo: pat.estado,
      observacao: null
    }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('auditorias_itens')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // 4. Log audit session creation in system history log
    await logAuditoria({
      empresa_id,
      entidade_id: session.id,
      entidade_tipo: 'auditorias',
      acao: 'CRIACAO',
      alterado_por: operatorId || null,
      dados_novos: {
        id: session.id,
        setor_id: session.setor_id,
        setor_nome: setorNome,
        gestor: session.gestor,
        responsavel: session.responsavel,
        status: session.status,
        total_itens: itemsToInsert.length
      }
    });

    return NextResponse.json(session, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error in POST /api/auditorias/sessao:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao iniciar sessão de auditoria.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
