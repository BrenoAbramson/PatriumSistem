import { useEffect, useState } from 'react';
import { Search, History, Calendar, Filter, X, Loader2, Tag, ArrowRightLeft, User, Building, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';

export function Historico() {
  const { profile } = useAuth();
  const activeEmpresaId = (profile?.perfil === 'Administrador' && localStorage.getItem('impersonated_empresa_id')) || profile?.empresa_id;

  // Data States
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    if (!activeEmpresaId || !profile) return;
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/historico?empresaId=${activeEmpresaId}&perfil=${profile.perfil}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar histórico de logs.');
      }
      const data = await response.json();
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeEmpresaId, profile]);

  const handleClearFilters = () => {
    setFilterAction('');
    setFilterEntity('');
    setFilterOperator('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setSearchTerm('');
  };

  // Helper to translate action labels
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CRIACAO':
        return <span className="px-2 py-0.5 text-xs rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Criação</span>;
      case 'EXCLUSAO':
        return <span className="px-2 py-0.5 text-xs rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">Exclusão</span>;
      case 'ALTERACAO':
        return <span className="px-2 py-0.5 text-xs rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">Alteração</span>;
      case 'TRANSFERENCIA':
        return <span className="px-2 py-0.5 text-xs rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200">Transferência</span>;
      case 'CONCLUSAO':
        return <span className="px-2 py-0.5 text-xs rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">Conclusão</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full font-semibold bg-gray-50 text-gray-700 border border-gray-200">{action}</span>;
    }
  };

  // Helper to translate entity labels
  const translateEntity = (entity: string) => {
    switch (entity) {
      case 'patrimonios':
        return 'Patrimônio';
      case 'usuarios':
        return 'Usuário';
      case 'categorias':
        return 'Categoria';
      case 'setores':
        return 'Setor';
      case 'transferencias':
        return 'Transferência';
      case 'auditorias':
        return 'Auditoria';
      default:
        return entity;
    }
  };

  // Helper to get entity icon
  const getEntityIcon = (entity: string) => {
    const className = "h-4 w-4 text-gray-500 shrink-0";
    switch (entity) {
      case 'patrimonios':
        return <Building className={className} />;
      case 'usuarios':
        return <User className={className} />;
      case 'categorias':
        return <Tag className={className} />;
      case 'setores':
        return <Building className={className} />;
      case 'transferencias':
        return <ArrowRightLeft className={className} />;
      case 'auditorias':
        return <ClipboardCheck className={className} />;
      default:
        return <History className={className} />;
    }
  };

  // Helper to generate log description dynamically based on entity, action, and JSON payload
  const getLogDescription = (log: any) => {
    const novos = log.dados_novos || {};
    const anteriores = log.dados_anteriores || {};
    
    if (log.acao === 'CRIACAO') {
      if (log.entidade_tipo === 'patrimonios') {
        return `Cadastrou o patrimônio #${novos.numero_patrimonial} - "${novos.nome}"`;
      }
      if (log.entidade_tipo === 'setores') {
        return `Criou o setor "${novos.nome}" (Gestor: ${novos.gestor || 'Não informado'})`;
      }
      if (log.entidade_tipo === 'categorias') {
        return `Criou a categoria "${novos.nome}"`;
      }
      if (log.entidade_tipo === 'usuarios') {
        return `Cadastrou o usuário "${novos.nome}" (${novos.email}) como ${novos.perfil === 'Cliente-Gerente' ? 'Gerente' : novos.perfil === 'Cliente-Colaborador' ? 'Colaborador' : novos.perfil}`;
      }
      if (log.entidade_tipo === 'auditorias') {
        return `Iniciou auditoria no setor "${novos.setor_nome || novos.setor_id || 'Não informado'}" (Auditor: ${novos.responsavel})`;
      }
    }

    if (log.acao === 'EXCLUSAO') {
      if (log.entidade_tipo === 'patrimonios') {
        return `Excluiu permanentemente o patrimônio #${anteriores.numero_patrimonial} - "${anteriores.nome}"`;
      }
      if (log.entidade_tipo === 'usuarios') {
        return `Excluiu permanentemente o usuário "${anteriores.nome}" (${anteriores.email})`;
      }
    }

    if (log.acao === 'TRANSFERENCIA') {
      if (log.entidade_tipo === 'transferencias') {
        return `Registrou transferência de patrimônio (Origem: ${log.dados_novos?.responsavel_origem || '—'} / Destino: ${log.dados_novos?.responsavel_destino || '—'})`;
      }
    }

    if (log.acao === 'ALTERACAO') {
      if (log.entidade_tipo === 'patrimonios') {
        if (novos.motivo && novos.motivo.includes('auditoria')) {
          return `Alterou status do patrimônio #${log.entidade_id.substring(0,6)}... para "${novos.estado}" durante auditoria`;
        }
        return `Alterou status do patrimônio para "${novos.estado}" (${novos.motivo || 'Ajuste direto'})`;
      }
      if (log.entidade_tipo === 'usuarios') {
        return `Alterou status do usuário "${novos.nome || ''}" para ${novos.ativo ? 'Ativo' : 'Inativo'}`;
      }
      if (log.entidade_tipo === 'auditorias') {
        const acaoAudit = novos.verificado ? 'Verificou' : 'Desmarcou verificação do';
        return `${acaoAudit} patrimônio "${novos.patrimonio_nome || '—'}" (Patrimônio #${novos.numero_patrimonial || '—'}) na auditoria`;
      }
    }

    if (log.acao === 'CONCLUSAO') {
      if (log.entidade_tipo === 'auditorias') {
        return `Concluiu a sessão de auditoria no setor "${novos.setor_nome || '—'}" (Auditor: ${novos.responsavel})`;
      }
    }

    // Default fallback descriptions
    return `Operação de ${log.acao.toLowerCase()} na entidade ${log.entidade_tipo}`;
  };

  // Filter logs locally
  const filteredLogs = logs.filter(log => {
    // Search Term
    const term = searchTerm.toLowerCase();
    const operatorName = log.usuarios?.nome || 'Sistema';
    const description = getLogDescription(log);
    const matchesSearch = 
      operatorName.toLowerCase().includes(term) ||
      description.toLowerCase().includes(term) ||
      log.entidade_tipo.toLowerCase().includes(term) ||
      log.acao.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    // Advanced Filters
    if (filterAction && log.acao !== filterAction) return false;
    if (filterEntity && log.entidade_tipo !== filterEntity) return false;
    if (filterOperator && !operatorName.toLowerCase().includes(filterOperator.toLowerCase())) return false;

    // Date Period
    if (filterDateStart) {
      const startDate = new Date(filterDateStart);
      const logDate = new Date(log.data_hora);
      if (logDate < startDate) return false;
    }
    if (filterDateEnd) {
      const endDate = new Date(filterDateEnd);
      endDate.setHours(23, 59, 59, 999); // end of day boundary
      const logDate = new Date(log.data_hora);
      if (logDate > endDate) return false;
    }

    return true;
  });

  const isAnyFilterActive = filterAction || filterEntity || filterOperator || filterDateStart || filterDateEnd;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Histórico do Sistema</h2>
          <p className="text-sm text-gray-500 font-medium">Acompanhe todos os eventos de cadastros, movimentações e auditorias realizadas no sistema.</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center shadow-xs">
          <X className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-xs overflow-hidden flex flex-col h-[calc(100vh-14rem)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#e5e4e7] flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por descrição, ação, operador..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#e5e4e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-sm bg-white"
              />
            </div>
            
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                isFiltersOpen || isAnyFilterActive
                  ? 'bg-blue-50 text-[#3B82F6] border-blue-200' 
                  : 'bg-white text-gray-600 border-[#e5e4e7] hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros Avançados
              {isAnyFilterActive ? (
                <span className="ml-2 bg-[#3B82F6] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">Ativo</span>
              ) : null}
            </button>
          </div>

          <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg shrink-0">
            Total: {filteredLogs.length} eventos registrados
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {isFiltersOpen && (
          <div className="p-4 border-b border-[#e5e4e7] bg-gray-50/20 grid grid-cols-1 md:grid-cols-5 gap-4 animate-slide-down">
            {/* Action Filter */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ação</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white cursor-pointer"
              >
                <option value="">Todas as Ações</option>
                <option value="CRIACAO">Criação</option>
                <option value="ALTERACAO">Alteração</option>
                <option value="EXCLUSAO">Exclusão</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="CONCLUSAO">Conclusão</option>
              </select>
            </div>

            {/* Entity Filter */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Entidade</label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white cursor-pointer"
              >
                <option value="">Todas as Entidades</option>
                <option value="patrimonios">Bens Patrimoniais</option>
                <option value="transferencias">Transferências</option>
                <option value="setores">Setores</option>
                <option value="categorias">Categorias</option>
                <option value="auditorias">Auditorias</option>
                {(profile?.perfil === 'Cliente-Gerente' || profile?.perfil === 'Administrador') && (
                  <option value="usuarios">Usuários</option>
                )}
              </select>
            </div>

            {/* Operator Filter */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operador / Usuário</label>
              <input
                type="text"
                placeholder="Nome do operador..."
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
              />
            </div>

            {/* Date Start */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">De (Data Início)</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                />
              </div>
            </div>

            {/* Date End */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Até (Data Fim)</label>
              <div className="relative flex items-center">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                />
                {isAnyFilterActive && (
                  <button 
                    onClick={handleClearFilters}
                    className="ml-2 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Limpar Filtros"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col h-full items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              <p className="text-sm font-medium">Carregando histórico de logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center py-20 text-gray-500 gap-2">
              <History className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium">Nenhum evento localizado com os filtros selecionados.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-[#e5e4e7] text-xs uppercase tracking-wider text-[#475569] bg-gray-50">
                  <th className="py-4 px-6 font-semibold w-40">Data/Hora</th>
                  <th className="py-4 px-6 font-semibold w-28">Ação</th>
                  <th className="py-4 px-6 font-semibold w-40">Entidade</th>
                  <th className="py-4 px-6 font-semibold">Descrição do Evento</th>
                  <th className="py-4 px-6 font-semibold w-48">Operador</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="py-4 px-6 text-gray-500 text-xs font-medium">
                      {new Date(log.data_hora).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-6">
                      {getActionBadge(log.acao)}
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-semibold">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(log.entidade_tipo)}
                        <span>{translateEntity(log.entidade_tipo)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#0F172A] font-medium leading-relaxed">
                      {getLogDescription(log)}
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-semibold">
                      {log.usuarios?.nome || <span className="text-gray-400 italic">Sistema</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
