import { useEffect, useState } from 'react';
import { Search, Plus, X, Loader2, Tag, CheckCircle2, Package, Building2, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';

export function Categorias() {
  const { profile } = 
    useAuth();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [bens, setBens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Creation Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatNome, setNewCatNome] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bens Details Modal States
  const [selectedCatForBens, setSelectedCatForBens] = useState<any | null>(null);
  const [isBensModalOpen, setIsBensModalOpen] = useState(false);

  const isManagerOrAdmin = profile?.perfil === 'Administrador' || profile?.perfil === 'Cliente-Gerente' || profile?.perfil === 'Cliente-Colaborador';
  const activeEmpresaId = (profile?.perfil === 'Administrador' && localStorage.getItem('impersonated_empresa_id')) || profile?.empresa_id;

  const fetchData = async () => {
    if (!activeEmpresaId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      const [catRes, bensRes] = await Promise.all([
        fetch(`${API_URL}/api/categorias?empresaId=${activeEmpresaId}`),
        fetch(`${API_URL}/api/patrimonios?empresaId=${activeEmpresaId}`)
      ]);

      if (!catRes.ok || !bensRes.ok) {
        throw new Error('Erro ao carregar dados do sistema.');
      }

      const [catData, bensData] = await Promise.all([
        catRes.json(),
        bensRes.json()
      ]);

      setCategorias(catData || []);
      setBens(bensData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Erro ao carregar categorias e bens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeEmpresaId]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNome.trim() || !activeEmpresaId) return;

    setSubmitting(true);
    setError(null);

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
      setNewCatNome('');
      setIsModalOpen(false);
      setSuccessMsg('Categoria criada com sucesso!');
      
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating category:', err);
      setError(err.message || 'Erro ao cadastrar categoria.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBensCount = (catId: string) => {
    return bens.filter(b => b.categoria_id === catId).length;
  };

  const getBensOfCategory = (catId: string) => {
    return bens.filter(b => b.categoria_id === catId);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getEstadoBadge = (estado: string) => {
    const configs: Record<string, { bg: string, text: string, label: string }> = {
      novo: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Novo', text: 'text-emerald-700' },
      bom: { bg: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Bom', text: 'text-blue-700' },
      regular: { bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Regular', text: 'text-amber-700' },
      ruim: { bg: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Ruim', text: 'text-rose-700' }
    };
    const config = configs[estado.toLowerCase()] || { bg: 'bg-gray-50 text-gray-700 border-gray-100', label: estado, text: 'text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  const filteredCategorias = categorias.filter(cat => 
    cat.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenBensModal = (cat: any) => {
    setSelectedCatForBens(cat);
    setIsBensModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Categorias de Patrimônio</h2>
          <p className="text-sm text-gray-500">Gerencie e visualize os bens associados a cada categoria.</p>
        </div>
        
        {isManagerOrAdmin && (
          <button
            onClick={() => {
              setError(null);
              setIsModalOpen(true);
            }}
            className="bg-[#3B82F6] hover:bg-blue-600 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nova Categoria
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center text-sm animate-fade-in shadow-xs">
          <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Stats */}
      <div className="bg-white rounded-2xl border border-[#e5e4e7] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input 
            type="text"
            placeholder="Buscar por nome da categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-gray-50/50"
          />
        </div>
        
        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg self-start md:self-auto">
          Total: {filteredCategorias.length} categorias
        </div>
      </div>

      {/* Main Grid/List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#e5e4e7]">
          <Loader2 className="h-8 w-8 text-[#3B82F6] animate-spin mb-3" />
          <p className="text-sm text-gray-500 font-medium">Carregando categorias...</p>
        </div>
      ) : filteredCategorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#e5e4e7] text-center p-6">
          <div className="bg-blue-50 p-4 rounded-full mb-4 border border-blue-100">
            <Tag className="h-8 w-8 text-[#3B82F6]" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Nenhuma categoria encontrada</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {searchTerm ? 'Nenhuma categoria corresponde ao termo pesquisado.' : 'Cadastre categorias de patrimônio para organizar o controle de bens da empresa.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e5e4e7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nome da Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bens Vinculados</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data de Criação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategorias.map((cat) => {
                  const bensCount = getBensCount(cat.id);
                  return (
                    <tr 
                      key={cat.id} 
                      onClick={() => handleOpenBensModal(cat)}
                      className="hover:bg-blue-50/20 active:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-[#3B82F6]/75 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-semibold text-gray-800 group-hover:text-[#3B82F6] transition-colors">{cat.nome}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cat.empresa_id ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#3B82F6] border border-blue-100">
                            Empresa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100">
                            Global
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                          bensCount > 0 
                            ? 'bg-blue-50 text-[#3B82F6] border-blue-200 shadow-2xs' 
                            : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                          {bensCount} {bensCount === 1 ? 'bem' : 'bens'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(cat.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Adicionar Nova Categoria</h3>
                <p className="text-xs text-gray-500">Crie uma nova classificação para organizar seus patrimônios.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs flex items-center">
                  <X className="h-4 w-4 mr-2 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Nome da Categoria *</label>
                <input 
                  type="text"
                  value={newCatNome}
                  onChange={(e) => setNewCatNome(e.target.value)}
                  required
                  placeholder="Ex: Notebooks, Servidores, Cadeiras"
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#334155] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Salvando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bens Details Modal */}
      {isBensModalOpen && selectedCatForBens && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 text-[#3B82F6] p-2.5 rounded-xl border border-blue-100">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Bens na Categoria: {selectedCatForBens.nome}</h3>
                  <p className="text-xs text-gray-500">Visualizando todos os patrimônios vinculados a esta classificação.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsBensModalOpen(false);
                  setSelectedCatForBens(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {getBensOfCategory(selectedCatForBens.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-gray-50 p-4 rounded-full border border-gray-100 mb-3 text-gray-400">
                    <Package className="h-8 w-8" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">Nenhum bem vinculado</h4>
                  <p className="text-xs text-gray-400 max-w-xs mt-1">
                    Não existem bens patrimoniais cadastrados sob esta categoria atualmente.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                        <th className="px-4 py-3">Nº Pat.</th>
                        <th className="px-4 py-3">Nome do Patrimônio</th>
                        <th className="px-4 py-3">Setor Atual</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Valor de Aquisição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {getBensOfCategory(selectedCatForBens.id).map((bem) => (
                        <tr key={bem.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200/50">
                              #{bem.numero_patrimonial}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-gray-800">
                            {bem.nome}
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{bem.setores?.nome || 'Não definido'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {getEstadoBadge(bem.estado)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-gray-700">
                            {formatCurrency(bem.valor_aquisicao)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsBensModalOpen(false);
                  setSelectedCatForBens(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-xs cursor-pointer"
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
