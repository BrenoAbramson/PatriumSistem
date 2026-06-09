import { supabaseAdmin } from './supabase';

export interface AuditLogPayload {
  empresa_id: string | null;
  entidade_id: string;
  entidade_tipo: 'patrimonios' | 'usuarios' | 'categorias' | 'setores' | 'transferencias' | 'auditorias';
  acao: 'CRIACAO' | 'EXCLUSAO' | 'ALTERACAO' | 'TRANSFERENCIA' | 'CONCLUSAO';
  alterado_por: string | null;
  dados_anteriores?: any;
  dados_novos?: any;
}

export async function logAuditoria(log: AuditLogPayload) {
  try {
    const { error } = await supabaseAdmin
      .from('auditoria')
      .insert({
        empresa_id: log.empresa_id,
        entidade_id: log.entidade_id,
        entidade_tipo: log.entidade_tipo,
        acao: log.acao,
        alterado_por: log.alterado_por || null,
        dados_anteriores: log.dados_anteriores || null,
        dados_novos: log.dados_novos || null
      });

    if (error) {
      console.error('Error inserting audit log:', error);
    }
  } catch (err) {
    console.error('Unexpected error in logAuditoria:', err);
  }
}
