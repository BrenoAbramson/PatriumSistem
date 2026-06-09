import { useEffect, useState } from 'react';
import { Search, Plus, Users, Mail, Building2, X, Loader2, CheckCircle2, ShieldAlert, UserCheck, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';

export function Usuarios() {
  const { profile } = useAuth();
  
  // Impersonation & Profile Logic
  const isAdmin = profile?.perfil === 'Administrador';
  const impersonatedEmpresaId = isAdmin ? localStorage.getItem('impersonated_empresa_id') : null;
  const activeEmpresaId = (isAdmin && impersonatedEmpresaId) || profile?.empresa_id;
  const isUserAdmin = isAdmin && !impersonatedEmpresaId;

  // Data States
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);

  // User Detail States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailAtivo, setDetailAtivo] = useState(true);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    perfil: 'Cliente-Colaborador',
    empresa_id: '',
  });

  const canEditUsers = profile?.perfil === 'Administrador' || profile?.perfil === 'Cliente-Gerente';

  useEffect(() => {
    if (selectedUser) {
      setDetailAtivo(selectedUser.ativo);
    }
  }, [selectedUser]);

  const handleSaveUserStatus = async () => {
    if (!selectedUser) return;
    
    setDetailSubmitting(true);
    setDetailError(null);

    try {
      const payload = {
        userId: selectedUser.id,
        ativo: detailAtivo
      };

      const response = await fetch(`${API_URL}/api/usuarios`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao atualizar o status do usuário.');
      }

      setSuccessMsg(`Status do usuário "${selectedUser.nome}" atualizado para ${detailAtivo ? 'Ativo' : 'Inativo'}!`);
      setIsDetailModalOpen(false);
      setSelectedUser(null);
      fetchUsuarios();

      // Clear success alert after 10 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 10000);

    } catch (err: any) {
      console.error('Error saving user status:', err);
      setDetailError(err.message || 'Erro ao atualizar status do usuário.');
    } finally {
      setDetailSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !profile) return;
    
    setDeleteSubmitting(true);
    setDetailError(null);

    try {
      const response = await fetch(`${API_URL}/api/usuarios?userId=${selectedUser.id}&operatorId=${profile.id}`, {
        method: 'DELETE',
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao excluir usuário.');
      }

      setSuccessMsg(`Usuário "${selectedUser.nome}" excluído com sucesso!`);
      setIsDeleteConfirmOpen(false);
      setIsDetailModalOpen(false);
      setSelectedUser(null);
      fetchUsuarios();

      // Clear success alert after 10 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 10000);

    } catch (err: any) {
      console.error('Error deleting user:', err);
      setDetailError(err.message || 'Erro ao excluir usuário.');
      setIsDeleteConfirmOpen(false);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = activeEmpresaId 
        ? `${API_URL}/api/usuarios?empresaId=${activeEmpresaId}`
        : `${API_URL}/api/usuarios`;

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao carregar usuários.');
      }
      const data = await res.json();
      setUsuarios(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    if (!isUserAdmin) return;
    try {
      const res = await fetch(`${API_URL}/api/empresas`);
      if (res.ok) {
        const data = await res.json();
        setEmpresas(data || []);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, empresa_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching companies for dropdown:', err);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchEmpresas();
  }, [activeEmpresaId]);

  const handleOpenModal = () => {
    setFormData({
      nome: '',
      email: '',
      perfil: 'Cliente-Colaborador',
      empresa_id: activeEmpresaId || (empresas[0]?.id || ''),
    });
    setError(null);
    setEmailPreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // If profile is set to Administrador, clear the company_id since admins don't belong to tenants
      if (name === 'perfil' && value === 'Administrador') {
        updated.empresa_id = '';
      } else if (name === 'perfil' && prev.perfil === 'Administrador' && value !== 'Administrador') {
        // If changing away from Administrador, pre-fill with a valid company
        updated.empresa_id = activeEmpresaId || (empresas[0]?.id || '');
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailPreviewUrl(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('E-mail incorreto. Por favor, insira um formato de e-mail válido.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        nome: formData.nome,
        email: formData.email,
        perfil: formData.perfil,
        empresa_id: formData.perfil === 'Administrador' ? null : (formData.empresa_id || null)
      };

      const response = await fetch(`${API_URL}/api/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao criar o usuário.');
      }

      setSuccessMsg(`Usuário "${formData.nome}" cadastrado com sucesso!`);
      if (resData.email_preview) {
        setEmailPreviewUrl(resData.email_preview);
      }
      setIsModalOpen(false);
      fetchUsuarios();

      // Clear success alert after 10 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 10000);

    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPerfilBadgeClass = (perfil: string) => {
    switch (perfil) {
      case 'Administrador':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Cliente-Gerente':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const translatePerfil = (perfil: string) => {
    if (perfil === 'Administrador') return 'Desenvolvedor / Admin';
    if (perfil === 'Cliente-Gerente') return 'Gerente';
    if (perfil === 'Cliente-Colaborador') return 'Colaborador';
    return perfil;
  };

  const filteredUsuarios = usuarios.filter(user => {
    const term = searchTerm.toLowerCase();
    return (
      user.nome?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.perfil?.toLowerCase().includes(term) ||
      user.empresas?.nome?.toLowerCase().includes(term)
    );
  });

  if (profile && !canEditUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4 bg-white rounded-2xl border border-[#e5e4e7] p-8 shadow-sm">
        <ShieldAlert className="h-16 w-16 text-rose-500" />
        <h3 className="text-xl font-bold text-[#0F172A]">Acesso Negado</h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Você não possui permissão para acessar esta página. Apenas administradores e gerentes podem gerenciar usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Usuários e Permissões</h2>
          <p className="text-sm text-gray-500">Cadastre e acompanhe os usuários do sistema e suas permissões de acesso.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-[#3B82F6] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-600 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Usuário
        </button>
      </div>

      {/* Success notification with email preview link if exists */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-4 rounded-xl flex flex-col gap-2 shadow-sm animate-fade-in-down">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{successMsg}</span>
          </div>
          {emailPreviewUrl && (
            <p className="text-xs text-emerald-700 pl-7">
              📬 O e-mail de ativação foi enviado. 
              <a 
                href={emailPreviewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline ml-1 font-bold text-emerald-800 hover:text-emerald-950"
              >
                Clique aqui para visualizar a caixa de entrada de teste (Ethereal)
              </a>
            </p>
          )}
        </div>
      )}

      {error && !isModalOpen && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <ShieldAlert className="h-5 w-5 mr-2 text-rose-600" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-sm overflow-hidden flex flex-col">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-[#e5e4e7] flex items-center bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, perfil ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-sm bg-white"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              <p className="text-sm font-medium">Carregando usuários...</p>
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
              <Users className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e5e4e7] text-xs uppercase tracking-wider text-[#475569]">
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">E-mail</th>
                  <th className="p-4 font-semibold">Perfil</th>
                  <th className="p-4 font-semibold">Empresa</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Data de Criação</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredUsuarios.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => {
                      if (canEditUsers) {
                        setSelectedUser(user);
                        setIsDeleteConfirmOpen(false);
                        setIsDetailModalOpen(true);
                      }
                    }}
                    className={`transition-colors ${
                      canEditUsers 
                        ? 'cursor-pointer hover:bg-gray-50/80' 
                        : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <td className="p-4 text-[#0F172A] font-semibold flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center mr-3 font-bold uppercase border border-blue-100">
                        {user.nome.charAt(0)}
                      </div>
                      {user.nome}
                    </td>
                    <td className="p-4 text-[#334155] font-mono text-xs">{user.email}</td>
                    <td className="p-4 text-[#334155]">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-semibold inline-flex ${getPerfilBadgeClass(user.perfil)}`}>
                        {translatePerfil(user.perfil)}
                      </span>
                    </td>
                    <td className="p-4 text-[#334155] font-medium">
                      {user.perfil === 'Administrador' ? (
                        <span className="text-gray-400 italic">Administração do Sistema</span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {user.empresas?.nome || 'Empresa não vinculada'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-[#334155]">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-semibold inline-flex ${
                        user.ativo
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-[#334155] text-xs font-medium">
                      {new Date(user.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Adicionar Novo Usuário</h3>
                <p className="text-xs text-gray-500">Cadastre uma nova credencial e envie o convite de ativação.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center text-xs">
                  <ShieldAlert className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[#3B82F6]" />
                  Dados Cadastrais
                </h4>
                
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Nome Completo *</label>
                  <input 
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    placeholder="Nome do usuário"
                    className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">E-mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="usuario@empresa.com"
                      className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Perfil / Permissão *</label>
                    <select
                      name="perfil"
                      value={formData.perfil}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                    >
                      {isUserAdmin && <option value="Administrador">Desenvolvedor / Admin</option>}
                      <option value="Cliente-Gerente">Gerente</option>
                      <option value="Cliente-Colaborador">Colaborador</option>
                    </select>
                  </div>

                  {/* Company Dropdown or Info depending on logged in profile */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Empresa Vinculada *</label>
                    {isUserAdmin ? (
                      <select
                        name="empresa_id"
                        value={formData.empresa_id}
                        onChange={handleChange}
                        disabled={formData.perfil === 'Administrador'}
                        required={formData.perfil !== 'Administrador'}
                        className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {formData.perfil === 'Administrador' ? (
                          <option value="">Não se aplica (Administrador do Sistema)</option>
                        ) : empresas.length === 0 ? (
                          <option value="">Carregando empresas...</option>
                        ) : (
                          empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.nome}</option>
                          ))
                        )}
                      </select>
                    ) : (
                      <div className="px-3 py-2 border border-[#e5e4e7] bg-gray-50 rounded-xl text-sm text-[#475569] font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="truncate">Empresa já definida</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
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
                      Cadastrando...
                    </>
                  ) : (
                    'Criar e Enviar Convite'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Detalhes do Usuário</h3>
                <p className="text-xs text-gray-500">Visualize e altere o status de ativação da conta.</p>
              </div>
              <button 
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedUser(null);
                  setDetailError(null);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1">
              {detailError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center text-xs">
                  <ShieldAlert className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
                  <span>{detailError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nome Completo</span>
                  <div className="text-sm font-medium text-[#0F172A] bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
                    {selectedUser.nome}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">E-mail</span>
                  <div className="text-sm font-mono text-[#334155] bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100 overflow-x-auto">
                    {selectedUser.email}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Perfil / Permissão</span>
                    <div className="inline-flex mt-1">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${getPerfilBadgeClass(selectedUser.perfil)}`}>
                        {translatePerfil(selectedUser.perfil)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Empresa Vinculada</span>
                    <div className="text-sm font-medium text-[#334155] mt-1.5 flex items-center gap-1.5">
                      {selectedUser.perfil === 'Administrador' ? (
                        <span className="text-gray-400 italic">Administração do Sistema</span>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="truncate">{selectedUser.empresas?.nome || 'Empresa não vinculada'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <span className="block text-sm font-semibold text-[#0F172A]">Status da Conta</span>
                      <span className="text-xs text-gray-500 block max-w-[280px]">
                        {selectedUser.id === profile?.id 
                          ? 'Você não pode inativar seu próprio usuário.' 
                          : 'Usuários inativos são impedidos de fazer login no sistema.'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${detailAtivo ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {detailAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => selectedUser.id !== profile?.id && setDetailAtivo(!detailAtivo)}
                        disabled={selectedUser.id === profile?.id || detailSubmitting}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          detailAtivo ? 'bg-emerald-500' : 'bg-gray-200'
                        } ${(selectedUser.id === profile?.id || detailSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            detailAtivo ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 px-6 py-4 rounded-b-2xl">
                {selectedUser.id !== profile?.id ? (
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer flex items-center shadow-xs"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Usuário
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setSelectedUser(null);
                      setDetailError(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-[#334155] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  
                  {selectedUser.id !== profile?.id && (
                    <button
                      type="button"
                      onClick={handleSaveUserStatus}
                      disabled={detailSubmitting || detailAtivo === selectedUser.ativo}
                      className="px-5 py-2 text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {detailSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-md w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Confirmar Exclusão</h3>
                <p className="text-xs text-gray-500">Esta ação excluirá permanentemente o usuário.</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Tem certeza que deseja excluir o usuário <strong className="text-gray-900">{selectedUser.nome} ({selectedUser.email})</strong>? 
              Isso removerá definitivamente sua conta de acesso e seus dados de perfil no sistema.
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
                onClick={handleDeleteUser}
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
