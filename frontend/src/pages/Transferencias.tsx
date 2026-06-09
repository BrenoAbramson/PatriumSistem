import { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Search, Plus, X, Loader2, User, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
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

  // Close dropdown on click outside
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
        className={`w-full flex items-center justify-between px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all text-left cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-300'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#e5e4e7] rounded-xl shadow-xl z-50 overflow-hidden animate-scale-up">
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

export function Transferencias() {
  const { profile } = useAuth();
  
  // Data States
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [patrimonios, setPatrimonios] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [selectedCategoriaId, setSelectedCategoriaId] = useState('');
  const [selectedPatrimonioId, setSelectedPatrimonioId] = useState('');
  const [selectedSetorDestinoId, setSelectedSetorDestinoId] = useState('');
  const [responsavelDestino, setResponsavelDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [selectedTransferForDetails, setSelectedTransferForDetails] = useState<any | null>(null);

  const activeEmpresaId = (profile?.perfil === 'Administrador' && localStorage.getItem('impersonated_empresa_id')) || profile?.empresa_id;

  const fetchData = async () => {
    if (!activeEmpresaId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch transfers, assets, sectors, categories
      const [transfersRes, patrimoniosRes, setoresRes, categoriasRes] = await Promise.all([
        fetch(`${API_URL}/api/transferencias?empresaId=${activeEmpresaId}`),
        fetch(`${API_URL}/api/patrimonios?empresaId=${activeEmpresaId}`),
        fetch(`${API_URL}/api/setores?empresaId=${activeEmpresaId}`),
        fetch(`${API_URL}/api/categorias?empresaId=${activeEmpresaId}`)
      ]);

      if (!transfersRes.ok || !patrimoniosRes.ok || !setoresRes.ok || !categoriasRes.ok) {
        throw new Error('Erro ao carregar dados de transferências.');
      }

      const [transfersData, patrimoniosData, setoresData, categoriasData] = await Promise.all([
        transfersRes.json(),
        patrimoniosRes.json(),
        setoresRes.json(),
        categoriasRes.json()
      ]);

      setTransferencias(transfersData || []);
      setPatrimonios(patrimoniosData || []);
      setSetores(setoresData || []);
      setCategorias(categoriasData || []);
    } catch (err: any) {
      console.error('Error fetching transfers data:', err);
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeEmpresaId]);

  // Handle category change (resets asset selection)
  const handleCategoriaChange = (catId: string) => {
    setSelectedCategoriaId(catId);
    setSelectedPatrimonioId('');
  };

  // Filter patrimonios based on selected category
  const filteredPatrimonios = selectedCategoriaId
    ? patrimonios.filter(p => p.categoria_id === selectedCategoriaId)
    : [];

  // Find currently selected asset to show current location & responsible
  const selectedPatrimonio = patrimonios.find(p => p.id === selectedPatrimonioId);

  const handleOpenModal = () => {
    setSelectedCategoriaId('');
    setSelectedPatrimonioId('');
    setSelectedSetorDestinoId('');
    setResponsavelDestino('');
    setMotivo('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmpresaId || !selectedPatrimonioId || !selectedSetorDestinoId || !profile?.nome) return;

    // Validate that either sector or responsible has changed
    const isSameSector = selectedPatrimonio?.setor_atual_id === selectedSetorDestinoId;
    const isSameResponsavel = (selectedPatrimonio?.responsavel || '').trim() === responsavelDestino.trim();

    if (isSameSector && isSameResponsavel) {
      setError('O patrimônio já está alocado neste setor e sob a responsabilidade deste colaborador.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        empresa_id: activeEmpresaId,
        patrimonio_id: selectedPatrimonioId,
        setor_origem_id: selectedPatrimonio?.setor_atual_id || null,
        setor_destino_id: selectedSetorDestinoId,
        responsavel_origem: selectedPatrimonio?.responsavel || null,
        responsavel_destino: responsavelDestino.trim() || null,
        solicitante: profile.nome,
        motivo: motivo.trim() || null
      };

      const response = await fetch(`${API_URL}/api/transferencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar transferência.');
      }

      setSuccessMsg('Transferência realizada com sucesso!');
      setIsModalOpen(false);
      fetchData();

      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating transfer:', err);
      setError(err.message || 'Erro ao registrar transferência.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered transfers
  const filteredTransferencias = transferencias.filter(trf => {
    const term = searchTerm.toLowerCase();
    return (
      trf.patrimonios?.nome?.toLowerCase().includes(term) ||
      trf.patrimonios?.numero_patrimonial?.toLowerCase().includes(term) ||
      trf.setor_origem?.nome?.toLowerCase().includes(term) ||
      trf.setor_destino?.nome?.toLowerCase().includes(term) ||
      trf.solicitante?.toLowerCase().includes(term) ||
      trf.responsavel_destino?.toLowerCase().includes(term)
    );
  });

  // Map options for SearchableSelect
  const categoriaOptions = categorias.map(c => ({
    value: c.id,
    label: c.nome,
    sublabel: c.empresa_id ? 'Categoria da Empresa' : 'Categoria Global'
  }));

  const patrimonioOptions = filteredPatrimonios.map(p => ({
    value: p.id,
    label: `#${p.numero_patrimonial} - ${p.nome}`,
    sublabel: `Modelo: ${p.modelo || '—'} | Série: ${p.numero_serie || '—'}`
  }));

  const setorOptions = setores.map(s => ({
    value: s.id,
    label: s.nome,
    sublabel: s.gestor ? `Gestor: ${s.gestor}` : undefined
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Transferências de Bens</h2>
          <p className="text-sm text-gray-500">Registre e controle a movimentação de patrimônios entre setores da empresa.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-[#3B82F6] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-600 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Transferência
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center shadow-sm animate-fade-in-down">
          <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <AlertCircle className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-14rem)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#e5e4e7] flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por patrimônio, setores, solicitante..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e5e4e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-sm bg-white"
            />
          </div>
          <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
            Total: {filteredTransferencias.length} movimentações
          </div>
        </div>

        {/* Table / Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col h-full items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              <p className="text-sm font-medium">Carregando histórico...</p>
            </div>
          ) : filteredTransferencias.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center py-20 text-gray-500 gap-2">
              <ArrowRightLeft className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium">Nenhuma transferência cadastrada ou encontrada.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-[#e5e4e7] text-xs uppercase tracking-wider text-[#475569] bg-gray-50">
                  <th className="py-4 px-6 font-semibold">Cód. Patrimônio</th>
                  <th className="py-4 px-6 font-semibold">Nome do Bem</th>
                  <th className="py-4 px-6 font-semibold">Setor Origem</th>
                  <th className="py-4 px-6 font-semibold">Responsável Origem</th>
                  <th className="py-4 px-6 font-semibold">Setor Destino</th>
                  <th className="py-4 px-6 font-semibold">Responsável Destino</th>
                  <th className="py-4 px-6 font-semibold">Solicitante</th>
                  <th className="py-4 px-6 font-semibold">Data</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredTransferencias.map((trf) => (
                  <tr 
                    key={trf.id} 
                    onClick={() => setSelectedTransferForDetails(trf)}
                    className="hover:bg-blue-50/20 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-mono text-xs text-[#0F172A] font-semibold">
                      #{trf.patrimonios?.numero_patrimonial}
                    </td>
                    <td className="py-4 px-6 text-[#0F172A] font-semibold">
                      {trf.patrimonios?.nome}
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-medium">
                      {trf.setor_origem?.nome || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-medium">
                      {trf.responsavel_origem || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-4 px-6 text-[#3B82F6] font-semibold">
                      {trf.setor_destino?.nome}
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-medium">
                      {trf.responsavel_destino || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-medium">
                      {trf.solicitante}
                    </td>
                    <td className="py-4 px-6 text-gray-500 text-xs">
                      {new Date(trf.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 text-xs rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {trf.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Nova Transferência de Patrimônio</h3>
                <p className="text-xs text-gray-500">Mova o patrimônio para outro setor e designe um novo responsável.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTransfer} className="p-6 space-y-6 flex-1">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center text-sm">
                  <AlertCircle className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Categoria Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Categoria *</label>
                <SearchableSelect
                  options={categoriaOptions}
                  value={selectedCategoriaId}
                  onChange={handleCategoriaChange}
                  placeholder="Selecione a categoria"
                />
              </div>

              {/* Patrimônio Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Patrimônio *</label>
                {selectedCategoriaId ? (
                  <SearchableSelect
                    options={patrimonioOptions}
                    value={selectedPatrimonioId}
                    onChange={setSelectedPatrimonioId}
                    placeholder="Escolha o bem patrimonial"
                    disabled={filteredPatrimonios.length === 0}
                  />
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-xl font-medium">
                    Selecione uma categoria primeiro para listar os bens vinculados.
                  </div>
                )}
                {selectedCategoriaId && filteredPatrimonios.length === 0 && (
                  <div className="text-xs text-gray-500 mt-1.5 font-medium">
                    Nenhum patrimônio cadastrado sob esta categoria.
                  </div>
                )}
              </div>

              {/* Current State (ReadOnly Display) */}
              {selectedPatrimonio && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Localização e Responsável de Origem</span>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs text-gray-500">Setor de Origem:</span>
                      <span className="font-semibold text-gray-800">{selectedPatrimonio.setores?.nome || 'Não designado'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Responsável de Origem:</span>
                      <span className="font-semibold text-gray-800">{selectedPatrimonio.responsavel || 'Não designado'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Setor de Destino */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Setor de Destino *</label>
                <SearchableSelect
                  options={setorOptions}
                  value={selectedSetorDestinoId}
                  onChange={setSelectedSetorDestinoId}
                  placeholder="Selecione o setor de destino"
                  disabled={!selectedPatrimonioId}
                />
              </div>

              {/* Responsável de Destino */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Responsável de Destino</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text"
                    value={responsavelDestino}
                    onChange={(e) => setResponsavelDestino(e.target.value)}
                    disabled={!selectedPatrimonioId}
                    placeholder="Digite o nome completo do novo responsável"
                    className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Motivo da Transferência */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Motivo da Transferência</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={!selectedPatrimonioId}
                  placeholder="Descreva o motivo desta movimentação (opcional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#334155] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Registrando...
                    </>
                  ) : (
                    'Confirmar Transferência'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedTransferForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="px-2.5 py-1 text-xs rounded-full font-mono font-bold bg-blue-50 text-[#3B82F6] border border-blue-100 uppercase tracking-wider">
                  Transferência Aprovada
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] mt-1.5">Detalhes da Transferência</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedTransferForDetails(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              
              {/* Bem Patrimonial */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patrimônio</span>
                <span className="text-sm font-mono text-[#0F172A] font-semibold block">
                  #{selectedTransferForDetails.patrimonios?.numero_patrimonial}
                </span>
                <span className="text-sm font-bold text-gray-800 block">
                  {selectedTransferForDetails.patrimonios?.nome}
                </span>
              </div>

              {/* Origem vs Destino Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 space-y-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origem</span>
                  <div>
                    <span className="block text-xs text-gray-500">Setor:</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedTransferForDetails.setor_origem?.nome || <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Responsável:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {selectedTransferForDetails.responsavel_origem || <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/60 space-y-2">
                  <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-wider">Destino</span>
                  <div>
                    <span className="block text-xs text-gray-500">Setor:</span>
                    <span className="text-sm font-bold text-[#3B82F6]">
                      {selectedTransferForDetails.setor_destino?.nome}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Responsável:</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedTransferForDetails.responsavel_destino || <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Solicitante e Data Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Solicitado por</span>
                  <span className="text-sm font-semibold text-gray-800 block">
                    {selectedTransferForDetails.solicitante}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data / Hora</span>
                  <span className="text-xs font-semibold text-gray-600 block">
                    {new Date(selectedTransferForDetails.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Motivo da Transferência */}
              <div className="pt-4 border-t border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Motivo da Transferência</span>
                {selectedTransferForDetails.motivo ? (
                  <div className="bg-blue-50/20 text-sm text-[#334155] p-3.5 rounded-xl border border-blue-100/40 whitespace-pre-wrap leading-relaxed font-medium">
                    {selectedTransferForDetails.motivo}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-medium italic">Nenhum motivo informado para esta transferência.</span>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => setSelectedTransferForDetails(null)}
                className="px-5 py-2 text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer animate-scale-up"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
