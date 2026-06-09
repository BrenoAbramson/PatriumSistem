import { useEffect, useState } from 'react';
import { Search, Plus, X, Loader2, Building2, User, FileText, CheckCircle2, Tag, Package, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';

export function Setores() {
  const { profile } = useAuth();
  const [setores, setSetores] = useState<any[]>([]);
  const [bens, setBens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Creation Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSetorNome, setNewSetorNome] = useState('');
  const [newSetorGestor, setNewSetorGestor] = useState('');
  const [newSetorDescricao, setNewSetorDescricao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sector Details Modal States
  const [selectedSetorForDetails, setSelectedSetorForDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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

      const [setoresRes, bensRes] = await Promise.all([
        fetch(`${API_URL}/api/setores?empresaId=${activeEmpresaId}`),
        fetch(`${API_URL}/api/patrimonios?empresaId=${activeEmpresaId}`)
      ]);

      if (!setoresRes.ok || !bensRes.ok) {
        throw new Error('Erro ao carregar dados do sistema.');
      }

      const [setoresData, bensData] = await Promise.all([
        setoresRes.json(),
        bensRes.json()
      ]);

      setSetores(setoresData || []);
      setBens(bensData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Erro ao carregar setores e patrimônios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeEmpresaId]);

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetorNome.trim() || !activeEmpresaId) return;

    setSubmitting(true);
    setError(null);

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
      setNewSetorNome('');
      setNewSetorGestor('');
      setNewSetorDescricao('');
      setIsModalOpen(false);
      setSuccessMsg('Setor cadastrado com sucesso!');
      
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating sector:', err);
      setError(err.message || 'Erro ao cadastrar setor.');
    } finally {
      setSubmitting(false);
    }
  };

  const getBensCountInSector = (setorId: string) => {
    return bens.filter(b => b.setor_atual_id === setorId).length;
  };

  const getBensGroupedByCategory = (setorId: string) => {
    const bensDoSetor = bens.filter(b => b.setor_atual_id === setorId);
    const groups: Record<string, { id: string, nome: string, bens: any[] }> = {};

    bensDoSetor.forEach(b => {
      const catId = b.categoria_id || 'sem-categoria';
      const catNome = b.categorias?.nome || 'Sem Categoria';

      if (!groups[catId]) {
        groups[catId] = {
          id: catId,
          nome: catNome,
          bens: []
        };
      }
      groups[catId].bens.push(b);
    });

    return Object.values(groups).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const handleOpenDetailsModal = (setor: any) => {
    setSelectedSetorForDetails(setor);
    setIsDetailsModalOpen(true);
  };

  const filteredSetores = setores.filter(setor => {
    const term = searchTerm.toLowerCase();
    return (
      setor.nome?.toLowerCase().includes(term) ||
      setor.gestor?.toLowerCase().includes(term) ||
      setor.descricao?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Setores da Empresa</h2>
          <p className="text-sm text-gray-500">Gerencie e visualize a alocação de bens em cada setor.</p>
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
            Novo Setor
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
            placeholder="Buscar por nome do setor, gestor ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-gray-50/50"
          />
        </div>
        
        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg self-start md:self-auto">
          Total: {filteredSetores.length} setores
        </div>
      </div>

      {/* Main Grid/List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#e5e4e7]">
          <Loader2 className="h-8 w-8 text-[#3B82F6] animate-spin mb-3" />
          <p className="text-sm text-gray-500 font-medium">Carregando setores...</p>
        </div>
      ) : filteredSetores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#e5e4e7] text-center p-6">
          <div className="bg-blue-50 p-4 rounded-full mb-4 border border-blue-100">
            <Building2 className="h-8 w-8 text-[#3B82F6]" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Nenhum setor encontrado</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {searchTerm ? 'Nenhum setor corresponde ao termo pesquisado.' : 'Cadastre os setores da sua empresa para organizar a atribuição de patrimônios.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSetores.map((setor) => {
            const totalBens = getBensCountInSector(setor.id);
            return (
              <div 
                key={setor.id} 
                onClick={() => handleOpenDetailsModal(setor)}
                className="bg-white rounded-2xl border border-[#e5e4e7] p-5 shadow-xs hover:shadow-md hover:border-blue-200 active:scale-[0.99] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="bg-blue-50 text-[#3B82F6] p-2 rounded-xl group-hover:bg-[#3B82F6] group-hover:text-white transition-all border border-blue-100 shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-[#0F172A] text-base truncate group-hover:text-[#3B82F6] transition-colors">{setor.nome}</h3>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 transition-all ${
                      totalBens > 0 
                        ? 'bg-blue-50 text-[#3B82F6] border-blue-200' 
                        : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>
                      {totalBens} {totalBens === 1 ? 'bem' : 'bens'}
                    </span>
                  </div>

                  {/* Gestor */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {setor.gestor ? `Gestor: ${setor.gestor}` : 'Gestor: Não definido'}
                    </span>
                  </div>

                  {/* Descrição */}
                  {setor.descricao && (
                    <div className="text-xs text-gray-500 flex items-start gap-1.5 pt-1">
                      <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <p className="line-clamp-2 leading-relaxed">{setor.descricao}</p>
                    </div>
                  )}
                </div>
                
                {/* Visual indicator */}
                <div className="flex items-center justify-end text-[10px] font-bold text-gray-400 group-hover:text-[#3B82F6] transition-colors gap-0.5 pt-3 border-t border-gray-50 mt-3">
                  <span>Ver detalhes</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Adicionar Novo Setor</h3>
                <p className="text-xs text-gray-500">Cadastre um departamento para alocação física de patrimônios.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSector} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs flex items-center">
                  <X className="h-4 w-4 mr-2 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Nome do Setor *</label>
                <input 
                  type="text"
                  value={newSetorNome}
                  onChange={(e) => setNewSetorNome(e.target.value)}
                  required
                  placeholder="Ex: Recursos Humanos, Tecnologia"
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Gestor Responsável</label>
                <input 
                  type="text"
                  value={newSetorGestor}
                  onChange={(e) => setNewSetorGestor(e.target.value)}
                  placeholder="Nome do gestor do setor (Ex: Carlos Silva)"
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Descrição</label>
                <textarea 
                  value={newSetorDescricao}
                  onChange={(e) => setNewSetorDescricao(e.target.value)}
                  placeholder="Descreva o propósito ou localização do setor"
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
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

      {/* Sector Details Modal */}
      {isDetailsModalOpen && selectedSetorForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 text-[#3B82F6] p-2.5 rounded-xl border border-blue-100">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Setor: {selectedSetorForDetails.nome}</h3>
                  <p className="text-xs text-gray-500">Detalhes do setor e distribuição de patrimônios por categorias.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedSetorForDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* General Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gestor Responsável</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{selectedSetorForDetails.gestor || 'Nenhum gestor cadastrado'}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Descrição</span>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{selectedSetorForDetails.descricao || 'Sem descrição cadastrada'}</span>
                  </div>
                </div>
              </div>

              {/* Bens Separados por Categorias */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#3B82F6]" />
                  <span>Patrimônios por Categoria ({getBensCountInSector(selectedSetorForDetails.id)} no total)</span>
                </h4>

                {getBensCountInSector(selectedSetorForDetails.id) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <Package className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500 font-medium">Nenhum patrimônio vinculado a este setor.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getBensGroupedByCategory(selectedSetorForDetails.id).map((group) => (
                      <div 
                        key={group.id} 
                        className="border border-[#e5e4e7] rounded-xl overflow-hidden shadow-2xs"
                      >
                        {/* Group Header */}
                        <div className="bg-gray-50/75 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-xs font-bold text-gray-700">{group.nome}</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#3B82F6] border border-blue-100">
                            {group.bens.length} {group.bens.length === 1 ? 'bem' : 'bens'}
                          </span>
                        </div>

                        {/* Group Bens List */}
                        <div className="divide-y divide-gray-100">
                          {group.bens.map((bem) => (
                            <div 
                              key={bem.id}
                              className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/40 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-bold text-gray-400 shrink-0">#{bem.numero_patrimonial}</span>
                                <span className="font-semibold text-gray-700 truncate">{bem.nome}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                                bem.estado.toLowerCase() === 'novo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                bem.estado.toLowerCase() === 'bom' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                bem.estado.toLowerCase() === 'regular' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {bem.estado.charAt(0).toUpperCase() + bem.estado.slice(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedSetorForDetails(null);
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
