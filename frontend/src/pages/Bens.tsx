import { useEffect, useState } from 'react';
import { Search, Plus, Filter, X, Loader2, Calendar, DollarSign, Tag, CheckCircle2, User, Building2, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';

export function Bens() {
  const { profile } = useAuth();
  
  // Data States
  const [bens, setBens] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState('');
  
  // Modal Categoria States
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatNome, setNewCatNome] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Modal Setor States
  const [isAddSetorOpen, setIsAddSetorOpen] = useState(false);
  const [newSetorNome, setNewSetorNome] = useState('');
  const [newSetorGestor, setNewSetorGestor] = useState('');
  const [newSetorDescricao, setNewSetorDescricao] = useState('');
  const [setorSubmitting, setSetorSubmitting] = useState(false);
  const [setorError, setSetorError] = useState<string | null>(null);

  // Advanced Filter States
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterSetorId, setFilterSetorId] = useState('');
  const [filterCategoriaId, setFilterCategoriaId] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');

  // Item Details Modal States
  const [selectedBemForDetails, setSelectedBemForDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Details Edit States
  const [editCategoriaId, setEditCategoriaId] = useState('');
  const [editModelo, setEditModelo] = useState('');
  const [editFabricante, setEditFabricante] = useState('');
  const [editNumeroSerie, setEditNumeroSerie] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion States
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const canAddCategory = profile?.perfil === 'Administrador' || profile?.perfil === 'Cliente-Gerente' || profile?.perfil === 'Cliente-Colaborador';

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetorNome.trim() || !activeEmpresaId) return;

    setSetorSubmitting(true);
    setSetorError(null);

    try {
      const response = await fetch(`${API_URL}/api/setores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: newSetorNome.trim(),
          gestor: newSetorGestor.trim() || null,
          descricao: newSetorDescricao.trim() || null,
          empresaId: activeEmpresaId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar setor.');
      }

      setSetores(prev => [...prev, data]);
      setFormData(prev => ({
        ...prev,
        setor_atual_id: data.id
      }));
      setNewSetorNome('');
      setNewSetorGestor('');
      setNewSetorDescricao('');
      setIsAddSetorOpen(false);
    } catch (err: any) {
      console.error('Error creating sector:', err);
      setSetorError(err.message || 'Erro ao cadastrar setor.');
    } finally {
      setSetorSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNome.trim() || !activeEmpresaId) return;

    setCatSubmitting(true);
    setCatError(null);

    try {
      const response = await fetch(`${API_URL}/api/categorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: newCatNome.trim(),
          empresaId: activeEmpresaId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar categoria.');
      }

      setCategorias(prev => [...prev, data]);
      setSelectedCategoriaId(data.id);
      setNewCatNome('');
      setIsAddCatOpen(false);
    } catch (err: any) {
      console.error('Error creating category:', err);
      setCatError(err.message || 'Erro ao cadastrar categoria.');
    } finally {
      setCatSubmitting(false);
    }
  };
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    numero_patrimonial: '',
    numero_serie: '',
    modelo: '',
    fabricante: '',
    data_aquisicao: new Date().toISOString().split('T')[0],
    valor_aquisicao: '',
    vida_util_estimada: '',
    estado: 'novo',
    setor_atual_id: '',
    responsavel: '',
  });

  // Fetch all necessary data
  const activeEmpresaId = (profile?.perfil === 'Administrador' && localStorage.getItem('impersonated_empresa_id')) || profile?.empresa_id;

  const fetchData = async () => {
    if (!activeEmpresaId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch assets via backend API (bypassing public Supabase RLS)
      const bensRes = await fetch(`${API_URL}/api/patrimonios?empresaId=${activeEmpresaId}`);
      if (!bensRes.ok) {
        throw new Error('Erro ao buscar bens patrimoniais do sistema.');
      }
      const bensData = await bensRes.json();
      setBens(bensData || []);

      // Fetch sectors via backend API (bypassing public Supabase RLS)
      const setoresRes = await fetch(`${API_URL}/api/setores?empresaId=${activeEmpresaId}`);
      if (!setoresRes.ok) {
        throw new Error('Erro ao buscar setores da empresa.');
      }
      const setoresData = await setoresRes.json();
      setSetores(setoresData || []);

      // Fetch categories via backend API
      const categoriasRes = await fetch(`${API_URL}/api/categorias?empresaId=${activeEmpresaId}`);
      if (categoriasRes.ok) {
        const categoriasData = await categoriasRes.json();
        setCategorias(categoriasData || []);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeEmpresaId]);

  // Open modal and pre-fill / auto-generate code
  const handleOpenModal = () => {
    const nextNum = bens.length + 1;
    setFormData({
      nome: '',
      descricao: '',
      numero_patrimonial: nextNum.toString(),
      numero_serie: '',
      modelo: '',
      fabricante: '',
      data_aquisicao: new Date().toISOString().split('T')[0],
      valor_aquisicao: '',
      vida_util_estimada: '',
      estado: 'novo',
      setor_atual_id: setores[0]?.id || '',
      responsavel: '',
    });
    setSelectedCategoriaId('');
    setError(null);
    setIsModalOpen(true);
  };

  // Handle Form Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmpresaId) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        empresa_id: activeEmpresaId,
        nome: formData.nome,
        descricao: formData.descricao || null,
        categoria_id: selectedCategoriaId || null,
        numero_patrimonial: formData.numero_patrimonial,
        numero_serie: formData.numero_serie || null,
        modelo: formData.modelo || null,
        fabricante: formData.fabricante || null,
        data_aquisicao: formData.data_aquisicao || null,
        valor_aquisicao: formData.valor_aquisicao ? parseFloat(formData.valor_aquisicao) : null,
        vida_util_estimada: formData.vida_util_estimada ? parseInt(formData.vida_util_estimada, 10) : null,
        estado: formData.estado,
        setor_atual_id: formData.setor_atual_id || null,
        responsavel: formData.responsavel.trim() || null,
      };

      const insertRes = await fetch(`${API_URL}/api/patrimonios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!insertRes.ok) {
        const insertErr = await insertRes.json();
        throw new Error(insertErr.error || 'Erro ao salvar patrimônio no servidor.');
      }

      setSuccessMsg('Patrimônio cadastrado com sucesso!');
      setIsModalOpen(false);
      fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);

    } catch (err: any) {
      console.error('Error saving asset:', err);
      setError(err.message || 'Erro ao salvar patrimônio.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDetailsEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBemForDetails) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`${API_URL}/api/patrimonios`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedBemForDetails.id,
          categoria_id: editCategoriaId || null,
          modelo: editModelo.trim() || null,
          fabricante: editFabricante.trim() || null,
          numero_serie: editNumeroSerie.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar patrimônio.');
      }

      setSuccessMsg('Patrimônio atualizado com sucesso!');
      setIsDetailsModalOpen(false);
      setSelectedBemForDetails(null);
      fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating asset:', err);
      setEditError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePatrimonio = async () => {
    if (!selectedBemForDetails) return;

    setDeleteSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`${API_URL}/api/patrimonios?id=${selectedBemForDetails.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir patrimônio.');
      }

      setSuccessMsg('Patrimônio excluído com sucesso!');
      setIsDeleteConfirmOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedBemForDetails(null);
      fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error deleting asset:', err);
      setEditError(err.message || 'Erro ao excluir patrimônio.');
      setIsDeleteConfirmOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Filtered bens for display based on search term and advanced filters
  const filteredBens = bens.filter(bem => {
    const term = searchTerm.toLowerCase();
    const responsavelNome = bem.responsavel || '';
    
    const matchSearch = (
      bem.nome?.toLowerCase().includes(term) ||
      bem.numero_patrimonial?.toLowerCase().includes(term) ||
      bem.numero_serie?.toLowerCase().includes(term) ||
      bem.setores?.nome?.toLowerCase().includes(term) ||
      responsavelNome.toLowerCase().includes(term) ||
      bem.categorias?.nome?.toLowerCase().includes(term) ||
      bem.descricao?.toLowerCase().includes(term)
    );

    const matchSetor = !filterSetorId || bem.setor_atual_id === filterSetorId;
    const matchCategoria = !filterCategoriaId || bem.categoria_id === filterCategoriaId;
    const matchResponsavel = !filterResponsavel || responsavelNome.toLowerCase().includes(filterResponsavel.toLowerCase());

    return matchSearch && matchSetor && matchCategoria && matchResponsavel;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Cadastro de Bens</h2>
          <p className="text-sm text-gray-500">Gerencie os ativos imobilizados e patrimoniais da sua empresa.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-[#3B82F6] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-600 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Patrimônio
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center shadow-sm animate-fade-in-down">
          <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <X className="h-5 w-5 mr-2 text-rose-600" />
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
              placeholder="Buscar por nome, nº patrimonial, série, setor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e5e4e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-sm bg-white"
            />
          </div>
          <button 
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`flex items-center px-4 py-2 text-sm font-medium border rounded-xl transition-all whitespace-nowrap shadow-sm cursor-pointer ${
              isFiltersOpen 
                ? 'bg-blue-50 text-[#3B82F6] border-blue-200 ring-2 ring-[#3B82F6]/20' 
                : 'text-[#334155] bg-white border-[#e5e4e7] hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros Avançados
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {isFiltersOpen && (
          <div className="p-4 border-b border-[#e5e4e7] bg-gray-50/30 grid grid-cols-1 md:grid-cols-3 gap-4 items-end animate-scale-up">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Setor Atual</label>
              <select
                value={filterSetorId}
                onChange={(e) => setFilterSetorId(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white cursor-pointer"
              >
                <option value="">Todos os setores</option>
                {setores.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Categoria</label>
              <select
                value={filterCategoriaId}
                onChange={(e) => setFilterCategoriaId(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white cursor-pointer"
              >
                <option value="">Todas as categorias</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Colaborador Responsável</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nome do colaborador..."
                  value={filterResponsavel}
                  onChange={(e) => setFilterResponsavel(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                />
              </div>
            </div>
            {(filterSetorId || filterCategoriaId || filterResponsavel) && (
              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={() => {
                    setFilterSetorId('');
                    setFilterCategoriaId('');
                    setFilterResponsavel('');
                  }}
                  className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                >
                  <X className="h-3.5 w-3.5" /> Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table / Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col h-full items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              <p className="text-sm font-medium">Carregando patrimônios...</p>
            </div>
          ) : filteredBens.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center py-20 text-gray-500 gap-2">
              <Tag className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium">Nenhum patrimônio cadastrado ou encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-[#e5e4e7] text-xs uppercase tracking-wider text-[#475569] bg-gray-50">
                  <th className="py-4 px-6 font-semibold">Nº Patrimonial</th>
                  <th className="py-4 px-6 font-semibold">Nome do Bem</th>
                  <th className="py-4 px-6 font-semibold">Categoria</th>
                  <th className="py-4 px-6 font-semibold">Modelo / Marca</th>
                  <th className="py-4 px-6 font-semibold">Setor Atual</th>
                  <th className="py-4 px-6 font-semibold">Responsável</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredBens.map((bem) => (
                  <tr 
                    key={bem.id} 
                    onClick={() => {
                      setSelectedBemForDetails(bem);
                      setEditCategoriaId(bem.categoria_id || '');
                      setEditModelo(bem.modelo || '');
                      setEditFabricante(bem.fabricante || '');
                      setEditNumeroSerie(bem.numero_serie || '');
                      setEditError(null);
                      setIsDeleteConfirmOpen(false);
                      setIsDetailsModalOpen(true);
                    }}
                    className="hover:bg-blue-50/20 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-mono text-xs text-[#0F172A] font-semibold">{bem.numero_patrimonial}</td>
                    <td className="py-4 px-6 text-[#0F172A] font-medium">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {bem.nome}
                        </div>
                        {bem.descricao && <div className="text-xs text-gray-400 truncate max-w-[200px]">{bem.descricao}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-medium">
                      {bem.categorias?.nome ? (
                        <span className="px-2.5 py-1 text-xs rounded-full font-semibold bg-blue-50 text-[#3B82F6] border border-blue-100 uppercase tracking-wider">
                          {bem.categorias.nome}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[#334155]">
                      {bem.modelo || bem.fabricante ? (
                        <span>
                          {bem.modelo || 'Sem modelo'}
                          {bem.fabricante && <span className="text-xs text-gray-400 block">{bem.fabricante}</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[#334155]">
                      {bem.setores?.nome ? (
                        <div>
                          <div className="font-semibold text-gray-800">{bem.setores.nome}</div>
                          {bem.setores.gestor && <div className="text-[10px] text-gray-400">Gestor: {bem.setores.gestor}</div>}
                        </div>
                      ) : (
                        <span className="text-gray-400">Não designado</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[#334155] font-medium">
                      {bem.responsavel || <span className="text-gray-400">Não designado</span>}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-semibold inline-flex ${
                        bem.estado === 'novo' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        bem.estado === 'em uso' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        bem.estado === 'em manutenção' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        bem.estado === 'danificado' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {bem.estado === 'novo' ? 'Novo' :
                         bem.estado === 'em uso' ? 'Em uso' :
                         bem.estado === 'em manutenção' ? 'Em manutenção' :
                         bem.estado === 'danificado' ? 'Danificado' :
                         'Descartado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Bem */}
      {isDetailsModalOpen && selectedBemForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form 
            onSubmit={handleSaveDetailsEdit}
            className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up"
          >
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="px-2.5 py-1 text-xs rounded-full font-mono font-bold bg-gray-100 text-gray-800 border border-gray-200 uppercase tracking-wider">
                  Patrimônio #{selectedBemForDetails.numero_patrimonial}
                </span>
                <h3 className="text-xl font-bold text-[#0F172A] mt-1">{selectedBemForDetails.nome}</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedBemForDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {editError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs">
                  {editError}
                </div>
              )}
              
              {/* Descrição */}
              {selectedBemForDetails.descricao && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição / Especificações</span>
                  <p className="text-sm text-[#334155] whitespace-pre-wrap">{selectedBemForDetails.descricao}</p>
                </div>
              )}

              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoria *</label>
                  <div className="flex items-center gap-1.5 w-full">
                    <Tag className="h-4 w-4 text-[#3B82F6] shrink-0" />
                    <select
                      value={editCategoriaId}
                      onChange={(e) => setEditCategoriaId(e.target.value)}
                      required
                      className="w-full px-2 py-1 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white cursor-pointer"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estado de Conservação</span>
                  <div>
                    <span className={`px-2.5 py-1 text-xs rounded-full font-semibold inline-flex ${
                      selectedBemForDetails.estado === 'novo' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      selectedBemForDetails.estado === 'em uso' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedBemForDetails.estado === 'em manutenção' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      selectedBemForDetails.estado === 'danificado' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                      {selectedBemForDetails.estado === 'novo' ? 'Novo' :
                       selectedBemForDetails.estado === 'em uso' ? 'Em uso' :
                       selectedBemForDetails.estado === 'em manutenção' ? 'Em manutenção' :
                       selectedBemForDetails.estado === 'danificado' ? 'Danificado' :
                       'Descartado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modelo e Fabricação */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Modelo</label>
                  <input 
                    type="text"
                    value={editModelo}
                    onChange={(e) => setEditModelo(e.target.value)}
                    placeholder="Ex: Latitude"
                    className="w-full px-2 py-1.5 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fabricante</label>
                  <input 
                    type="text"
                    value={editFabricante}
                    onChange={(e) => setEditFabricante(e.target.value)}
                    placeholder="Ex: Dell"
                    className="w-full px-2 py-1.5 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nº de Série</label>
                  <input 
                    type="text"
                    value={editNumeroSerie}
                    onChange={(e) => setEditNumeroSerie(e.target.value)}
                    placeholder="Ex: SN12345"
                    className="w-full px-2 py-1.5 border border-[#e5e4e7] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                  />
                </div>
              </div>

              {/* Localização e Responsável */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Setor Atual</span>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">
                        {selectedBemForDetails.setores?.nome || 'Não designado'}
                      </span>
                      {selectedBemForDetails.setores?.gestor && (
                        <span className="text-[10px] text-gray-400 block">
                          Gestor: {selectedBemForDetails.setores.gestor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Colaborador Responsável</span>
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedBemForDetails.responsavel || 'Não designado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dados Financeiros */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data de Aquisição</span>
                  <span className="text-sm font-medium text-[#334155]">
                    {selectedBemForDetails.data_aquisicao 
                      ? new Date(selectedBemForDetails.data_aquisicao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor de Aquisição</span>
                  <span className="text-sm font-semibold text-[#0F172A]">
                    {selectedBemForDetails.valor_aquisicao != null 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBemForDetails.valor_aquisicao)
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Vida Útil Estimada</span>
                  <span className="text-sm font-medium text-[#334155]">
                    {selectedBemForDetails.vida_util_estimada 
                      ? `${selectedBemForDetails.vida_util_estimada} anos` 
                      : '—'}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer flex items-center shadow-xs"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Patrimônio
              </button>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedBemForDetails(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#334155] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || (
                    editCategoriaId === (selectedBemForDetails.categoria_id || '') &&
                    editModelo === (selectedBemForDetails.modelo || '') &&
                    editFabricante === (selectedBemForDetails.fabricante || '') &&
                    editNumeroSerie === (selectedBemForDetails.numero_serie || '')
                  )}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Novo Cadastro de Patrimônio</h3>
                <p className="text-xs text-gray-500">Insira as informações detalhadas para registrar o bem.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center text-sm">
                  <X className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Informações Básicas */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informações Básicas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Nome do Bem *</label>
                    <input 
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      required
                      placeholder="Ex: Notebook Dell Latitude"
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Nº Patrimonial (Gerado Automaticamente)</label>
                    <input 
                      type="text"
                      name="numero_patrimonial"
                      value={formData.numero_patrimonial}
                      disabled
                      placeholder="O próximo sequencial será atribuído"
                      className="w-full px-3 py-2 border border-[#e5e4e7] bg-gray-50 text-gray-500 rounded-xl text-sm focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Categoria *</label>
                    <div className="flex items-center gap-2">
                      <select
                        name="categoria"
                        value={selectedCategoriaId}
                        onChange={(e) => setSelectedCategoriaId(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                      </select>
                      
                      {canAddCategory && (
                        <button
                          type="button"
                          onClick={() => setIsAddCatOpen(true)}
                          className="bg-blue-50 text-[#3B82F6] p-2 rounded-xl hover:bg-blue-100 active:scale-95 transition-all border border-blue-200 cursor-pointer flex items-center justify-center shrink-0"
                          title="Nova Categoria"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Descrição</label>
                  <textarea 
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Detalhes adicionais, especificações técnicas..."
                    className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Modelo</label>
                    <input 
                      type="text"
                      name="modelo"
                      value={formData.modelo}
                      onChange={handleChange}
                      placeholder="Ex: E7480"
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Fabricante</label>
                    <input 
                      type="text"
                      name="fabricante"
                      value={formData.fabricante}
                      onChange={handleChange}
                      placeholder="Ex: Dell"
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Número de Série</label>
                    <input 
                      type="text"
                      name="numero_serie"
                      value={formData.numero_serie}
                      onChange={handleChange}
                      placeholder="Ex: 8XJKM22"
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              {/* Detalhes de Aquisição */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aquisição e Depreciação</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Data de Aquisição</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="date"
                        name="data_aquisicao"
                        value={formData.data_aquisicao}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Valor de Aquisição (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="number"
                        step="0.01"
                        name="valor_aquisicao"
                        value={formData.valor_aquisicao}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Vida Útil Estimada (Anos)</label>
                    <input 
                      type="number"
                      name="vida_util_estimada"
                      value={formData.vida_util_estimada}
                      onChange={handleChange}
                      placeholder="Ex: 5"
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              {/* Rastreabilidade e Localização */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Localização e Estado</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Estado do Bem</label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    >
                      <option value="novo">Novo</option>
                      <option value="em uso">Em uso</option>
                      <option value="em manutenção">Em manutenção</option>
                      <option value="danificado">Danificado</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Setor Atual *</label>
                    <div className="flex items-center gap-2">
                      <select
                        name="setor_atual_id"
                        value={formData.setor_atual_id}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                      >
                        {setores.length === 0 ? (
                          <option value="">Nenhum setor cadastrado</option>
                        ) : (
                          setores.map(sec => (
                            <option key={sec.id} value={sec.id}>{sec.nome}</option>
                          ))
                        )}
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => setIsAddSetorOpen(true)}
                        className="bg-blue-50 text-[#3B82F6] p-2 rounded-xl hover:bg-blue-100 active:scale-95 transition-all border border-blue-200 cursor-pointer flex items-center justify-center shrink-0"
                        title="Novo Setor"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Colaborador Responsável</label>
                  <input 
                    type="text"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    placeholder="Digite o nome completo do colaborador do setor que está recebendo o patrimônio"
                    className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Botões do Modal */}
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
                      Salvando...
                    </>
                  ) : (
                    'Salvar Patrimônio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Categoria */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Adicionar Nova Categoria</h3>
              <button 
                type="button"
                onClick={() => {
                  setIsAddCatOpen(false);
                  setNewCatNome('');
                  setCatError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {catError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs">
                  {catError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Nome da Categoria *</label>
                <input 
                  type="text"
                  value={newCatNome}
                  onChange={(e) => setNewCatNome(e.target.value)}
                  required
                  placeholder="Ex: Eletrodomésticos"
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCatOpen(false);
                    setNewCatNome('');
                    setCatError(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={catSubmitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {catSubmitting ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Novo Setor */}
      {isAddSetorOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Adicionar Novo Setor</h3>
              <button 
                type="button"
                onClick={() => {
                  setIsAddSetorOpen(false);
                  setNewSetorNome('');
                  setNewSetorGestor('');
                  setNewSetorDescricao('');
                  setSetorError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSector} className="space-y-4">
              {setorError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs">
                  {setorError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Nome do Setor *</label>
                <input 
                  type="text"
                  value={newSetorNome}
                  onChange={(e) => setNewSetorNome(e.target.value)}
                  required
                  placeholder="Ex: Recursos Humanos"
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Gestor Responsável</label>
                <input 
                  type="text"
                  value={newSetorGestor}
                  onChange={(e) => setNewSetorGestor(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Descrição</label>
                <textarea 
                  value={newSetorDescricao}
                  onChange={(e) => setNewSetorDescricao(e.target.value)}
                  rows={2}
                  placeholder="Descrição opcional sobre o setor..."
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSetorOpen(false);
                    setNewSetorNome('');
                    setNewSetorGestor('');
                    setNewSetorDescricao('');
                    setSetorError(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={setorSubmitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {setorSubmitting ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedBemForDetails && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-md w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Confirmar Exclusão</h3>
                <p className="text-xs text-gray-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Tem certeza que deseja excluir o patrimônio <strong className="text-gray-900">#{selectedBemForDetails.numero_patrimonial} - {selectedBemForDetails.nome}</strong>? 
              Isso removerá permanentemente o bem e todo o seu histórico de transferências associado.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[#334155] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePatrimonio}
                disabled={deleteSubmitting}
                className="px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
