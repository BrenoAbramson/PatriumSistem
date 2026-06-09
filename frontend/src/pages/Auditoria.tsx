import { useState, useEffect, useRef } from 'react';
import { 
  Search, Loader2, CheckCircle, Calendar, User, Plus, 
  ArrowLeft, AlertCircle, ClipboardCheck, X, Check, Settings, ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

function SearchableSelect({ options, value, onChange, placeholder, disabled }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative w-full text-slate-800" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch('');
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-2.5 border border-[#e5e4e7] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all text-left cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#e5e4e7] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center bg-gray-50/50">
            <Search className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm bg-transparent outline-none py-1 text-gray-800 focus:outline-none"
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1 divide-y divide-gray-50 text-sm">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-gray-400 text-xs text-center font-medium">
                Nenhum resultado encontrado
              </li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-4 py-2 hover:bg-blue-50/50 hover:text-[#3B82F6] transition-colors cursor-pointer text-left ${
                    value === opt.value ? 'bg-blue-50 text-[#3B82F6] font-semibold' : 'text-gray-700'
                  }`}
                >
                  <div className="truncate font-medium">{opt.label}</div>
                  {opt.sublabel && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{opt.sublabel}</div>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Auditoria() {
  const { profile } = useAuth();
  const activeEmpresaId = (profile?.perfil === 'Administrador' && localStorage.getItem('impersonated_empresa_id')) || profile?.empresa_id;

  // List States
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [patrimonios, setPatrimonios] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  // Loading & Error States
  const [loadingSessoes, setLoadingSessoes] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedSessao, setSelectedSessao] = useState<any | null>(null);
  const [itens, setItens] = useState<any[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);

  // New Session Form State
  const [newSessaoSetorId, setNewSessaoSetorId] = useState('');
  const [newSessaoGestor, setNewSessaoGestor] = useState('');
  const [newSessaoResponsavel, setNewSessaoResponsavel] = useState('');
  const [savingSessao, setSavingSessao] = useState(false);

  // Individual Update Form State
  const [individualSearch, setIndividualSearch] = useState('');
  const [selectedIndividualPat, setSelectedIndividualPat] = useState<any | null>(null);
  const [individualEstado, setIndividualEstado] = useState('');
  const [individualDeadline, setIndividualDeadline] = useState('');
  const [savingIndividual, setSavingIndividual] = useState(false);

  // Custom Alert Modals State
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  // Custom Confirm Conclude Modal State
  const [isConfirmConcludeOpen, setIsConfirmConcludeOpen] = useState(false);

  // Custom Success Conclude Modal State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Custom Deadline Prompt Modal State
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [deadlineItemData, setDeadlineItemData] = useState<any | null>(null);
  const [deadlineValue, setDeadlineValue] = useState('');
  const [deadlineType, setDeadlineType] = useState<'em_manutencao' | 'baixado'>('em_manutencao');

  // Checklist Filter States
  const [searchChecklistTerm, setSearchChecklistTerm] = useState('');
  const [filterChecklistStatus, setFilterChecklistStatus] = useState('');
  const [filterChecklistVerified, setFilterChecklistVerified] = useState('');

  // Global Session Search State
  const [searchSessaoTerm, setSearchSessaoTerm] = useState('');

  // Action Lock State
  const [concludingSessao, setConcludingSessao] = useState(false);

  // Load Initial Session List and Setors
  const fetchSessoes = async (selectSessaoIdAfterLoad?: string) => {
    if (!activeEmpresaId) return;
    try {
      setLoadingSessoes(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/auditorias/sessao?empresaId=${activeEmpresaId}`);
      if (!res.ok) throw new Error('Erro ao buscar sessões de auditoria.');
      const data = await res.json();
      setSessoes(data || []);

      if (selectSessaoIdAfterLoad) {
        const matchingSessao = data.find((s: any) => s.id === selectSessaoIdAfterLoad);
        if (matchingSessao) {
          setSelectedSessao(matchingSessao);
          fetchItens(selectSessaoIdAfterLoad);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoadingSessoes(false);
    }
  };

  const fetchSetores = async () => {
    if (!activeEmpresaId) return;
    try {
      const res = await fetch(`${API_URL}/api/setores?empresaId=${activeEmpresaId}`);
      if (res.ok) {
        const data = await res.json();
        setSetores(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar setores:', err);
    }
  };

  const fetchPatrimonios = async () => {
    if (!activeEmpresaId) return;
    try {
      const res = await fetch(`${API_URL}/api/patrimonios?empresaId=${activeEmpresaId}`);
      if (res.ok) {
        const data = await res.json();
        setPatrimonios(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar patrimônios:', err);
    }
  };

  const fetchUsuarios = async () => {
    if (!activeEmpresaId) return;
    try {
      const res = await fetch(`${API_URL}/api/usuarios?empresaId=${activeEmpresaId}`);
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const fetchItens = async (sessaoId: string) => {
    try {
      setLoadingItens(true);
      const res = await fetch(`${API_URL}/api/auditorias/itens?sessaoId=${sessaoId}`);
      if (!res.ok) throw new Error('Erro ao buscar itens da auditoria.');
      const data = await res.json();
      setItens(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar itens da auditoria.');
    } finally {
      setLoadingItens(false);
    }
  };

  useEffect(() => {
    fetchSessoes();
    fetchSetores();
    fetchPatrimonios();
    fetchUsuarios();
  }, [activeEmpresaId]);

  // Handle Sector Select Change in Session Creation Modal
  const handleSectorChange = (sectorId: string) => {
    setNewSessaoSetorId(sectorId);
    const chosen = setores.find(s => s.id === sectorId);
    setNewSessaoGestor(chosen?.gestor || 'Não informado');
  };

  // Start New Audit Session
  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmpresaId || !newSessaoSetorId || !newSessaoResponsavel) return;

    try {
      setSavingSessao(true);
      const res = await fetch(`${API_URL}/api/auditorias/sessao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: activeEmpresaId,
          setor_id: newSessaoSetorId,
          gestor: newSessaoGestor === 'Não informado' ? null : newSessaoGestor,
          responsavel: newSessaoResponsavel,
          operatorId: profile?.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao criar sessão de auditoria.');
      }

      const newSession = await res.json();
      setIsCreateModalOpen(false);
      // Reset form
      setNewSessaoSetorId('');
      setNewSessaoGestor('');
      setNewSessaoResponsavel('');

      // Reload and directly select new session
      await fetchSessoes(newSession.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar auditoria.');
    } finally {
      setSavingSessao(false);
    }
  };

  // Update Item (Check status and/or asset state)
  const handleUpdateItem = async (itemId: string, verificado: boolean, estado_novo: string, observacao: string | null) => {
    try {
      const res = await fetch(`${API_URL}/api/auditorias/itens`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          verificado,
          estado_novo,
          observacao,
          operatorId: profile?.id
        })
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar modificação do item.');
      }

      // Update local checklist state
      setItens(prevItens => 
        prevItens.map(item => 
          item.id === itemId 
            ? { ...item, verificado, estado_novo, observacao } 
            : item
        )
      );

      // Silently refresh sessions in background to update progress bars on card screen
      const sessaoRes = await fetch(`${API_URL}/api/auditorias/sessao?empresaId=${activeEmpresaId}`);
      if (sessaoRes.ok) {
        const sessaoData = await sessaoRes.json();
        setSessoes(sessaoData || []);
        // Update current selected session progress indicator
        if (selectedSessao) {
          const updated = sessaoData.find((s: any) => s.id === selectedSessao.id);
          if (updated) setSelectedSessao(updated);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar item.');
    }
  };

  // Conclude Audit Session
  // Conclude Audit Session
  const handleConcludeAudit = async () => {
    if (!selectedSessao) return;

    // Validate that all items have been verified
    const pendentes = itens.filter(i => !i.verificado);
    if (pendentes.length > 0) {
      setPendingItems(pendentes);
      setIsPendingModalOpen(true);
      return;
    }

    setIsConfirmConcludeOpen(true);
  };

  // Execute Conclude Audit (called from custom confirm modal)
  const executeConcludeAudit = async () => {
    try {
      setConcludingSessao(true);
      setIsConfirmConcludeOpen(false);
      const res = await fetch(`${API_URL}/api/auditorias/concluir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSessao.id,
          operatorId: profile?.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao concluir auditoria.');
      }

      setIsSuccessModalOpen(true);

      // Reload everything
      await fetchSessoes(selectedSessao.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao concluir auditoria.');
    } finally {
      setConcludingSessao(false);
    }
  };

  // Individual Status Adjust
  const handleIndividualStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndividualPat || !individualEstado) return;

    let customMotivo = 'Alteração individual direta';
    if (individualEstado === 'em_manutencao' || individualEstado === 'baixado') {
      if (individualDeadline) {
        const formattedDate = individualDeadline.split('-').reverse().join('/');
        customMotivo = `Ajuste rápido - Prazo: ${formattedDate}`;
      }
    }

    try {
      setSavingIndividual(true);
      const res = await fetch(`${API_URL}/api/patrimonios/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedIndividualPat.id,
          estado_novo: individualEstado,
          operatorId: profile?.id,
          motivo: customMotivo
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao atualizar status do bem.');
      }

      setIsIndividualModalOpen(false);
      setSelectedIndividualPat(null);
      setIndividualEstado('');
      setIndividualDeadline('');
      setIndividualSearch('');

      // Refresh data
      fetchPatrimonios();
      if (selectedSessao) {
        fetchItens(selectedSessao.id);
      }
      fetchSessoes();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status.');
    } finally {
      setSavingIndividual(false);
    }
  };

  const confirmDeadlineModal = async () => {
    if (!deadlineItemData) return;
    
    let obs = deadlineItemData.observacao || '';
    if (deadlineValue) {
      const formattedDate = deadlineValue.split('-').reverse().join('/'); // YYYY-MM-DD to DD/MM/YYYY
      obs = `[Prazo: ${formattedDate}]${obs ? ' - ' + obs : ''}`;
    }
    
    await handleUpdateItem(
      deadlineItemData.id, 
      deadlineItemData.verificado, 
      deadlineType, 
      obs
    );
    
    setIsDeadlineModalOpen(false);
    setDeadlineItemData(null);
    setDeadlineValue('');
  };

  const cancelDeadlineModal = () => {
    setIsDeadlineModalOpen(false);
    setDeadlineItemData(null);
    setDeadlineValue('');
    // Restore locally by reloading
    if (selectedSessao) fetchItens(selectedSessao.id);
  };

  // Filter individual assets in modal search
  const filteredIndividualPatrimonios = patrimonios.filter(pat => {
    const term = individualSearch.toLowerCase();
    return (
      pat.nome.toLowerCase().includes(term) ||
      pat.numero_patrimonial.toLowerCase().includes(term) ||
      (pat.numero_serie && pat.numero_serie.toLowerCase().includes(term))
    );
  }).slice(0, 5); // limit output results for better layout

  // Filter global audit sessions list
  const filteredSessoes = sessoes.filter(s => {
    const term = searchSessaoTerm.toLowerCase();
    const sectorName = s.setores?.nome || '';
    const gestorName = s.gestor || '';
    const respName = s.responsavel || '';
    return (
      sectorName.toLowerCase().includes(term) ||
      gestorName.toLowerCase().includes(term) ||
      respName.toLowerCase().includes(term) ||
      s.status.toLowerCase().includes(term)
    );
  });

  // Filter checklist items
  const filteredItens = itens.filter(i => {
    // Search text
    const search = searchChecklistTerm.toLowerCase();
    const patName = i.patrimonios?.nome || '';
    const patNum = i.patrimonios?.numero_patrimonial || '';
    const patModel = i.patrimonios?.modelo || '';
    const patSerial = i.patrimonios?.numero_serie || '';
    const matchesSearch = 
      patName.toLowerCase().includes(search) ||
      patNum.toLowerCase().includes(search) ||
      patModel.toLowerCase().includes(search) ||
      patSerial.toLowerCase().includes(search);

    if (!matchesSearch) return false;

    // Status filter
    if (filterChecklistStatus && i.estado_novo !== filterChecklistStatus) return false;

    // Verification filter
    if (filterChecklistVerified === 'verified' && !i.verificado) return false;
    if (filterChecklistVerified === 'pending' && i.verificado) return false;

    return true;
  });

  // Helper for computing session items count & progress percentages
  const getProgressStats = (sessao: any) => {
    const list = sessao?.auditorias_itens || [];
    const total = list.length;
    const verified = list.filter((item: any) => item.verificado).length;
    const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { total, verified, pct };
  };

  const getActiveSessionProgressStats = () => {
    const total = itens.length;
    const verified = itens.filter(i => i.verificado).length;
    const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { total, verified, pct };
  };

  // Map company users to searchable options
  const auditorOptions = usuarios
    .filter(u => u.ativo)
    .map(u => ({
      value: u.nome,
      label: u.nome,
      sublabel: `${u.perfil === 'Cliente-Gerente' ? 'Gerente' : u.perfil === 'Cliente-Colaborador' ? 'Colaborador' : u.perfil} | ${u.email}`
    }));

  return (
    <div className="space-y-6">
      {/* Top Banner Error Display */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center shadow-xs">
          <AlertCircle className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!selectedSessao ? (
        /* ==================== SCREEN 1: AUDIT SESSIONS DASHBOARD ==================== */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#0F172A]">Auditoria de Bens</h2>
              <p className="text-sm text-gray-500 font-medium">Realize verificações de inventário físico e verifique o estado de conservação de patrimônios por setor.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsIndividualModalOpen(true)}
                className="flex-1 md:flex-initial bg-white text-gray-700 border border-[#e5e4e7] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-xs flex items-center justify-center cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-2 text-gray-500" />
                Alteração Rápida
              </button>

              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 md:flex-initial bg-[#3B82F6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Nova Auditoria
              </button>
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5e4e7] shadow-xs flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Filtrar por setor, auditor ou status..." 
                value={searchSessaoTerm}
                onChange={(e) => setSearchSessaoTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#e5e4e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-sm bg-white"
              />
            </div>
            <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              Total: {filteredSessoes.length} auditorias
            </div>
          </div>

          {/* Audit Grid */}
          {loadingSessoes ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              <p className="text-sm font-medium">Carregando sessões de auditoria...</p>
            </div>
          ) : filteredSessoes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e5e4e7] p-12 text-center flex flex-col items-center justify-center gap-3">
              <ClipboardCheck className="h-12 w-12 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700">Nenhuma sessão de auditoria encontrada</h3>
              <p className="text-sm text-gray-500 max-w-sm">Inicie uma nova auditoria por setor para gerenciar a verificação física dos bens.</p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 bg-blue-50 text-[#3B82F6] border border-blue-200 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-all cursor-pointer"
              >
                Nova Auditoria Setorial
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessoes.map((sessao) => {
                const { total, verified, pct } = getProgressStats(sessao);
                const isConcluida = sessao.status === 'Concluída';

                return (
                  <div 
                    key={sessao.id}
                    onClick={() => {
                      setSelectedSessao(sessao);
                      fetchItens(sessao.id);
                    }}
                    className="group bg-white rounded-2xl border border-[#e5e4e7] hover:border-blue-300 hover:shadow-md transition-all cursor-pointer p-5 flex flex-col justify-between h-56 relative overflow-hidden"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <h4 className="font-bold text-gray-800 text-base leading-snug group-hover:text-blue-600 transition-colors">
                          {sessao.setores?.nome || 'Setor Desconhecido'}
                        </h4>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 border ${
                          isConcluida 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {sessao.status}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-gray-600 mb-4 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>Auditor: <strong className="text-gray-700">{sessao.responsavel}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>Gestor: <strong className="text-gray-700">{sessao.gestor || 'Não informado'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>Início: {new Date(sessao.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5 w-full">
                      <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                        <span>Progresso</span>
                        <span className={pct === 100 ? "text-emerald-600 font-bold" : "text-gray-700"}>{pct}% ({verified}/{total} itens)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isConcluida ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==================== SCREEN 2: AUDIT CHECKLIST DETAIL ==================== */
        <div className="space-y-6 animate-fade-in">
          {/* Header & Meta */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 pb-4 border-b border-[#e5e4e7]">
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setSelectedSessao(null);
                  setItens([]);
                  setSearchChecklistTerm('');
                  setFilterChecklistStatus('');
                  setFilterChecklistVerified('');
                  fetchSessoes();
                }}
                className="flex items-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors bg-white px-3 py-1.5 border border-[#e5e4e7] rounded-lg cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Voltar para o Painel
              </button>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                  Auditoria: {selectedSessao.setores?.nome || 'Setor'}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    Auditor: <strong className="text-gray-700">{selectedSessao.responsavel}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    Gestor: <strong className="text-gray-700">{selectedSessao.gestor || 'Não informado'}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    Criado em: {new Date(selectedSessao.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
              {/* Progress Summary Card */}
              <div className="bg-white border border-[#e5e4e7] px-4 py-3 rounded-2xl shadow-xs flex items-center gap-3 flex-1 min-w-[200px]">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs text-gray-500 font-semibold mb-1">
                    <span>Auditado</span>
                    <span>{getActiveSessionProgressStats().pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedSessao.status === 'Concluída' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${getActiveSessionProgressStats().pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">
                    {getActiveSessionProgressStats().verified} de {getActiveSessionProgressStats().total} itens verificados
                  </p>
                </div>
              </div>

              {/* Conclude Button */}
              {selectedSessao.status === 'Em Andamento' && (
                <button
                  onClick={handleConcludeAudit}
                  disabled={concludingSessao}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400 px-6 py-3 rounded-2xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                >
                  {concludingSessao ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Concluindo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir Auditoria
                    </>
                  )}
                </button>
              )}
              {selectedSessao.status === 'Concluída' && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-center text-sm font-semibold shrink-0 gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Auditoria Concluída
                </div>
              )}
            </div>
          </div>

          {/* Search & Filter Toolbar for Checklist */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5e4e7] shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar patrimônio, número, série..." 
                value={searchChecklistTerm}
                onChange={(e) => setSearchChecklistTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#e5e4e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-xs bg-white"
              />
            </div>

            <div>
              <select
                value={filterChecklistStatus}
                onChange={(e) => setFilterChecklistStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white cursor-pointer"
              >
                <option value="">Todos os Status de Conservação</option>
                <option value="novo">Novo</option>
                <option value="bom">Bom</option>
                <option value="em_uso">Em Uso</option>
                <option value="em_manutencao">Em Manutenção</option>
                <option value="danificado">Danificado</option>
                <option value="baixado">Baixado / Inservível</option>
              </select>
            </div>

            <div>
              <select
                value={filterChecklistVerified}
                onChange={(e) => setFilterChecklistVerified(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white cursor-pointer"
              >
                <option value="">Filtro de Verificação</option>
                <option value="verified">Apenas Auditados / Verificados</option>
                <option value="pending">Apenas Pendentes</option>
              </select>
            </div>
          </div>

          {/* Checklist Table */}
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-xs overflow-hidden">
            {loadingItens ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
                <p className="text-sm font-medium">Carregando patrimônios do setor...</p>
              </div>
            ) : filteredItens.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-gray-500">
                <Search className="h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium">Nenhum patrimônio corresponde aos filtros de pesquisa.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-[#e5e4e7] text-xs uppercase tracking-wider text-[#475569] bg-gray-50/50">
                      <th className="py-4 px-6 font-semibold w-16 text-center">Auditado</th>
                      <th className="py-4 px-6 font-semibold w-32">Nº Patrimônio</th>
                      <th className="py-4 px-6 font-semibold">Nome do Bem</th>
                      <th className="py-4 px-6 font-semibold w-40">Marca / Modelo</th>
                      <th className="py-4 px-6 font-semibold w-40">Status Conservação</th>
                      <th className="py-4 px-6 font-semibold">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {filteredItens.map((item) => {
                      const isSessaoConcluida = selectedSessao.status === 'Concluída';
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-gray-50/30 transition-colors ${
                            item.verificado ? 'bg-emerald-50/10' : ''
                          }`}
                        >
                          <td className="py-4 px-6 text-center">
                            <input 
                              type="checkbox"
                              checked={item.verificado}
                              disabled={isSessaoConcluida}
                              onChange={(e) => {
                                handleUpdateItem(item.id, e.target.checked, item.estado_novo, item.observacao);
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-4 px-6 text-[#334155] font-semibold">
                            #{item.patrimonios?.numero_patrimonial || '—'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-gray-900">{item.patrimonios?.nome || '—'}</div>
                            <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                              Cat: {item.patrimonios?.categorias?.nome || '—'} 
                              {item.patrimonios?.numero_serie && ` | S/N: ${item.patrimonios.numero_serie}`}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-600 font-medium">
                            {item.patrimonios?.fabricante || '—'} / {item.patrimonios?.modelo || '—'}
                          </td>
                          <td className="py-4 px-6">
                            <select
                              value={item.estado_novo}
                              disabled={isSessaoConcluida}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'em_manutencao' || val === 'baixado') {
                                  setDeadlineType(val as 'em_manutencao' | 'baixado');
                                  setDeadlineItemData(item);
                                  setDeadlineValue('');
                                  setIsDeadlineModalOpen(true);
                                } else {
                                  handleUpdateItem(item.id, item.verificado, val, item.observacao);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 border border-[#e5e4e7] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium text-gray-700 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <option value="novo">Novo</option>
                              <option value="bom">Bom</option>
                              <option value="em_uso">Em Uso</option>
                              <option value="em_manutencao">Em Manutenção</option>
                              <option value="danificado">Danificado</option>
                              <option value="baixado">Baixado / Inservível</option>
                            </select>
                          </td>
                          <td className="py-4 px-6">
                            <input 
                              type="text" 
                              placeholder={isSessaoConcluida ? "—" : "Digitar observações..."}
                              value={item.observacao || ''}
                              disabled={isSessaoConcluida}
                              onChange={(e) => {
                                // Update local checklist state first to keep input fluid
                                setItens(prev => prev.map(i => i.id === item.id ? { ...i, observacao: e.target.value } : i));
                              }}
                              onBlur={(e) => {
                                handleUpdateItem(item.id, item.verificado, item.estado_novo, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-full px-3 py-1.5 border border-[#e5e4e7] focus:border-blue-500 rounded-xl text-xs focus:outline-none bg-white text-gray-700 disabled:bg-gray-50 disabled:border-transparent disabled:text-gray-400"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: START NEW AUDIT SESSION ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          
          {/* Modal Container */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Nova Auditoria Setorial</h3>
            <p className="text-xs text-gray-500 font-medium mb-5">
              Crie uma sessão de auditoria para fazer a verificação e checklist físico de bens de um setor.
            </p>

            <form onSubmit={handleStartAudit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Setor a ser auditado</label>
                <select
                  required
                  value={newSessaoSetorId}
                  onChange={(e) => handleSectorChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  <option value="">Selecione um setor...</option>
                  {setores.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gestor do Setor</label>
                <input 
                  type="text" 
                  disabled
                  value={newSessaoGestor}
                  placeholder="Selecione o setor para carregar o gestor..."
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Auditor / Responsável</label>
                <SearchableSelect 
                  options={auditorOptions}
                  value={newSessaoResponsavel}
                  onChange={setNewSessaoResponsavel}
                  placeholder="Selecione o auditor..."
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-[#e5e4e7] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={savingSessao || !newSessaoSetorId || !newSessaoResponsavel}
                  className="flex-1 bg-[#3B82F6] hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer"
                >
                  {savingSessao ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Iniciando...
                    </>
                  ) : (
                    'Iniciar Auditoria'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: INDIVIDUAL STATUS ADJUST ==================== */}
      {isIndividualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setIsIndividualModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          
          {/* Modal Container */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
            <button 
              onClick={() => {
                setIsIndividualModalOpen(false);
                setSelectedIndividualPat(null);
                setIndividualEstado('');
                setIndividualSearch('');
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Ajuste Rápido de Status</h3>
            <p className="text-xs text-gray-500 font-medium mb-5">
              Altere o status de conservação de um patrimônio de forma individual e direta.
            </p>

            <form onSubmit={handleIndividualStatusUpdate} className="space-y-4">
              {/* Search Asset Input */}
              {!selectedIndividualPat ? (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Patrimônio</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Pesquise por nome, número ou série..."
                      value={individualSearch}
                      onChange={(e) => setIndividualSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  {/* Search Results list */}
                  {individualSearch && (
                    <div className="mt-2 border border-[#e5e4e7] rounded-xl divide-y divide-gray-100 overflow-hidden bg-white max-h-52 overflow-y-auto">
                      {filteredIndividualPatrimonios.length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 font-medium text-center">Nenhum patrimônio correspondente.</div>
                      ) : (
                        filteredIndividualPatrimonios.map(pat => (
                          <div 
                            key={pat.id}
                            onClick={() => {
                              setSelectedIndividualPat(pat);
                              setIndividualEstado(pat.estado);
                              setIndividualSearch('');
                            }}
                            className="p-3 text-xs text-gray-700 hover:bg-blue-50 hover:text-[#3B82F6] cursor-pointer transition-colors flex flex-col font-medium"
                          >
                            <span className="font-bold text-gray-800">#{pat.numero_patrimonial} - {pat.nome}</span>
                            <span className="text-[10px] text-gray-400 font-bold mt-0.5">
                              Status atual: {pat.estado} | Setor: {pat.setores?.nome || '—'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Asset Info Box */
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl relative">
                  <button 
                    type="button"
                    onClick={() => setSelectedIndividualPat(null)}
                    className="absolute right-3 top-3 text-[10px] font-bold text-blue-600 bg-blue-100/50 px-2 py-1 rounded-md hover:bg-blue-100"
                  >
                    Alterar Bem
                  </button>
                  <h4 className="text-xs font-bold text-blue-700 uppercase mb-1">Patrimônio Selecionado</h4>
                  <p className="text-sm font-bold text-gray-800 leading-tight">#{selectedIndividualPat.numero_patrimonial} - {selectedIndividualPat.nome}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Setor Atual: <strong className="text-gray-700">{selectedIndividualPat.setores?.nome || '—'}</strong></p>
                  <p className="text-xs text-gray-500 font-medium">Estado Atual: <strong className="text-gray-700 uppercase">{selectedIndividualPat.estado}</strong></p>
                </div>
              )}

              {/* Status Select Box */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Novo Status de Conservação</label>
                  <select
                    required
                    disabled={!selectedIndividualPat}
                    value={individualEstado}
                    onChange={(e) => {
                      setIndividualEstado(e.target.value);
                      setIndividualDeadline('');
                    }}
                    className="w-full px-3 py-2.5 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione o novo status...</option>
                    <option value="novo">Novo</option>
                    <option value="bom">Bom</option>
                    <option value="em_uso">Em Uso</option>
                    <option value="em_manutencao">Em Manutenção</option>
                    <option value="danificado">Danificado</option>
                    <option value="baixado">Baixado / Inservível</option>
                  </select>
                </div>

                {(individualEstado === 'em_manutencao' || individualEstado === 'baixado') && (
                  <div className="animate-slide-down">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      {individualEstado === 'em_manutencao' 
                        ? 'Prazo para Devolução *' 
                        : 'Data / Prazo de Baixa *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={individualDeadline}
                      onChange={(e) => setIndividualDeadline(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsIndividualModalOpen(false);
                    setSelectedIndividualPat(null);
                    setIndividualEstado('');
                    setIndividualDeadline('');
                    setIndividualSearch('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-[#e5e4e7] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={savingIndividual || !selectedIndividualPat || !individualEstado}
                  className="flex-1 bg-[#3B82F6] hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer"
                >
                  {savingIndividual ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Status'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: DEADLINE PROMPT ==================== */}
      {isDeadlineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={cancelDeadlineModal} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
            <button 
              onClick={cancelDeadlineModal}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Definir Prazo</h3>
                <p className="text-xs text-gray-500 font-medium">#{deadlineItemData?.patrimonios?.numero_patrimonial} - {deadlineItemData?.patrimonios?.nome}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4 font-medium leading-relaxed">
              {deadlineType === 'em_manutencao'
                ? 'Informe o prazo estimado para a devolução do patrimônio em manutenção.'
                : 'Informe a data ou prazo limite para a baixa do patrimônio.'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prazo / Data Limite</label>
                <input
                  type="date"
                  required
                  value={deadlineValue}
                  onChange={(e) => setDeadlineValue(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={cancelDeadlineModal}
                  className="flex-1 px-4 py-2.5 border border-[#e5e4e7] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={confirmDeadlineModal}
                  disabled={!deadlineValue}
                  className="flex-1 bg-[#3B82F6] hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer"
                >
                  Confirmar Prazo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: PENDING AUDIT ITEMS ALERT ==================== */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsPendingModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg p-6 relative z-10 animate-slide-up">
            <button 
              onClick={() => setIsPendingModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Não é possível concluir a auditoria</h3>
                <p className="text-xs text-gray-500 font-medium">Existem patrimônios pendentes de verificação</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4 font-medium leading-relaxed">
              Você precisa realizar a auditoria de todos os patrimônios cadastrados para este setor antes de poder finalizar o processo. Veja abaixo os itens restantes:
            </p>

            {/* List of Pending Items */}
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 mb-5 bg-gray-50/50">
              {pendingItems.map((item) => (
                <div key={item.id} className="p-3 text-xs flex items-center justify-between font-medium">
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="font-bold text-gray-800 truncate text-slate-800">{item.patrimonios?.nome || '—'}</span>
                    <span className="text-[10px] text-gray-400 font-bold mt-0.5">
                      Cat: {item.patrimonios?.categorias?.nome || '—'} 
                      {item.patrimonios?.modelo && ` | Mod: ${item.patrimonios.modelo}`}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#475569] bg-white border border-[#e5e4e7] px-2.5 py-1 rounded-lg shrink-0 shadow-xs">
                    #{item.patrimonios?.numero_patrimonial || '—'}
                  </span>
                </div>
              ))}
            </div>

            <button 
              type="button"
              onClick={() => setIsPendingModalOpen(false)}
              className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer shadow-xs"
            >
              Voltar ao Checklist e Resolver
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL 5: CONFIRM CONCLUDE AUDIT ==================== */}
      {isConfirmConcludeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsConfirmConcludeOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
            <button 
              onClick={() => setIsConfirmConcludeOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Concluir Auditoria?</h3>
                <p className="text-xs text-gray-500 font-medium">{selectedSessao?.setores?.nome}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
              Todos os patrimônios deste setor foram verificados com sucesso. Deseja finalizar esta auditoria? Após a conclusão, o relatório será gravado e o checklist não poderá ser mais alterado.
            </p>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setIsConfirmConcludeOpen(false)}
                className="flex-1 px-4 py-2.5 border border-[#e5e4e7] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer text-center"
              >
                Voltar
              </button>
              <button 
                type="button"
                onClick={executeConcludeAudit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer shadow-xs"
              >
                Sim, Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 6: SUCCESS AUDIT CONCLUDED ==================== */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsSuccessModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-sm p-6 text-center relative z-10 animate-scale-up">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Auditoria Concluída!</h3>
            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
              A auditoria do setor foi finalizada com sucesso e registrada no histórico da empresa.
            </p>

            <button 
              type="button"
              onClick={() => {
                setIsSuccessModalOpen(false);
                setSelectedSessao(null);
                setItens([]);
                fetchSessoes();
              }}
              className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer shadow-sm"
            >
              Voltar ao Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
