import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PackageSearch, 
  ArrowRightLeft, 
  History, 
  Users, 
  Building,
  LogOut,
  User as UserIcon,
  Key,
  Building2,
  X,
  Loader2,
  ChevronDown,
  CheckCircle2,
  Tag,
  ClipboardCheck
} from 'lucide-react';
import { API_URL } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface MenuItem {
  path: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  clientOnly?: boolean;
  allowedRoles?: string[];
}

const getPerfilLabel = (perfil: string | undefined) => {
  if (!perfil) return 'Colaborador';
  if (perfil === 'Administrador') return 'Desenvolvedor';
  if (perfil === 'Cliente-Gerente') return 'Gerente';
  if (perfil === 'Cliente-Colaborador') return 'Colaborador';
  return perfil;
};

const MENU_ITEMS: MenuItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/empresas', label: 'Empresas', icon: Building, adminOnly: true },
  { path: '/bens', label: 'Cadastro de Bens', icon: PackageSearch, clientOnly: true },
  { path: '/categorias', label: 'Categorias', icon: Tag, clientOnly: true },
  { path: '/setores', label: 'Setores', icon: Building2, clientOnly: true },
  { path: '/transferencias', label: 'Transferência', icon: ArrowRightLeft, clientOnly: true },
  { path: '/historico', label: 'Histórico', icon: History, clientOnly: true },
  { path: '/auditoria', label: 'Auditoria', icon: ClipboardCheck, clientOnly: true },
  { path: '/usuarios', label: 'Usuários e Permissões', icon: Users, allowedRoles: ['Administrador', 'Cliente-Gerente'] },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  
  // Impersonation info
  const isAdmin = profile?.perfil === 'Administrador';
  const impersonatedEmpresaNome = isAdmin ? localStorage.getItem('impersonated_empresa_nome') : null;
  const currentEmpresaNome = impersonatedEmpresaNome || profile?.empresas?.nome || 'Patrium Gestão Patrimonial';

  // Dropdown & Modal States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Form Fields
  const [formNome, setFormNome] = useState('');
  const [formSenhaAtual, setFormSenhaAtual] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formConfirmSenha, setFormConfirmSenha] = useState('');
  const [formNomeEmpresa, setFormNomeEmpresa] = useState('');
  const [formCnpj, setFormCnpj] = useState('');

  // Sync profile data to form when modal opens
  useEffect(() => {
    if (profile) {
      setFormNome(profile.nome || '');
      setFormNomeEmpresa(profile.empresas?.nome || '');
      // Format CNPJ if it exists
      const rawCnpj = profile.empresas?.cnpj || '';
      const formattedCnpj = rawCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
      setFormCnpj(formattedCnpj);
    }
  }, [profile, isModalOpen]);

  const handleClearImpersonation = () => {
    localStorage.removeItem('impersonated_empresa_id');
    localStorage.removeItem('impersonated_empresa_nome');
    window.location.href = '/empresas';
  };

  const handleSignOut = async () => {
    localStorage.removeItem('impersonated_empresa_id');
    localStorage.removeItem('impersonated_empresa_nome');
    await signOut();
    navigate('/login');
  };

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    // Validate password match if typing a new password
    if (formSenha) {
      if (!formSenhaAtual) {
        setModalError('Você deve informar a senha atual para alterar a senha.');
        return;
      }
      if (formSenha.length < 8) {
        setModalError('A nova senha deve ter no mínimo 8 caracteres.');
        return;
      }
      if (formSenha !== formConfirmSenha) {
        setModalError('A confirmação de senha não coincide com a nova senha.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        userId: user?.id,
        nome: formNome,
        newPassword: formSenha || undefined,
        currentPassword: formSenhaAtual || undefined,
        nome_empresa: profile?.perfil === 'Cliente-Gerente' ? formNomeEmpresa : undefined,
        cnpj: profile?.perfil === 'Cliente-Gerente' ? formCnpj : undefined
      };

      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao atualizar os dados.');
      }

      setModalSuccess('Perfil atualizado com sucesso! Recarregando dados...');
      setFormSenha('');
      setFormConfirmSenha('');
      setFormSenhaAtual('');

      // Reload page after 1.5 seconds to refresh Auth Context data completely
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(null);
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setModalError(err.message || 'Falha ao salvar alterações.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#EAE7E7] text-[#0F172A] flex flex-col border-r border-gray-300 shadow-sm">
        <div className="p-4 flex items-center justify-center border-b border-gray-300">
          <img src="/logo-bg.png" alt="Logo" className="h-16 w-auto object-contain rounded" />
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {MENU_ITEMS.filter((item) => {
              if (item.path === '/empresas' && impersonatedEmpresaNome) {
                return false; // Hide Empresas screen link when simulating a client company
              }
              const isUserAdmin = profile?.perfil === 'Administrador';
              if (item.clientOnly && isUserAdmin && !impersonatedEmpresaNome) {
                return false; // Hide client-only screens for admin unless impersonating
              }
              if (item.allowedRoles && !item.allowedRoles.includes(profile?.perfil || '')) {
                return false; // Hide link if the user profile is not allowed
              }
              return !item.adminOnly || isUserAdmin;
            }).map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-[#3B82F6] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-[#0F172A]'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-300">
          <button 
            onClick={handleSignOut}
            className="flex w-full items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#0F172A] hover:bg-gray-200 rounded transition-colors cursor-pointer"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Impersonation Warning Banner */}
        {impersonatedEmpresaNome && (
          <div className="bg-amber-500 text-white px-4 py-2.5 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-inner z-20">
            <span>⚠️ Você está visualizando o sistema como <strong>{impersonatedEmpresaNome}</strong> (Modo Administrador).</span>
            <button 
              onClick={handleClearImpersonation}
              className="underline hover:text-amber-100 font-bold ml-1 cursor-pointer focus:outline-none"
            >
              Voltar ao Painel de Administrador
            </button>
          </div>
        )}

        {/* Header */}
        <header className="bg-white border-b border-[#e5e4e7] p-4 flex justify-between items-center relative z-10 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#3B82F6]" />
              {currentEmpresaNome}
            </h1>
            <p className="text-[10px] text-gray-500 font-medium">Gestão de Patrimônios e Ativos</p>
          </div>

          {/* User Profile Dropdown Button */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 hover:bg-gray-50 p-1.5 rounded-xl transition-colors cursor-pointer focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold uppercase shadow-sm">
                {(profile?.nome || user?.email || 'U').charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-gray-800 leading-tight">{profile?.nome || 'Usuário'}</span>
                <span className="text-[10px] text-gray-400 font-medium leading-none">{getPerfilLabel(profile?.perfil)}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-gray-200 bg-white shadow-xl z-40 py-2.5 divide-y divide-gray-100 animate-scale-up">
                  
                  {/* User Profile Summary */}
                  <div className="px-4 pb-2.5">
                    <p className="text-xs font-bold text-gray-800 truncate">{profile?.nome || 'Usuário'}</p>
                    <p className="text-[10px] text-gray-400 truncate mb-1">{user?.email}</p>
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {getPerfilLabel(profile?.perfil)}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1 px-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsModalOpen(true);
                      }}
                      className="flex w-full items-center px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                      Editar Perfil
                    </button>
                  </div>

                  <div className="pt-1 px-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleSignOut();
                      }}
                      className="flex w-full items-center px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="h-4 w-4 mr-2 text-rose-400" />
                      Sair
                    </button>
                  </div>

                </div>
              </>
            )}
          </div>
        </header>

        {/* Dynamic Page Container */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* Profile Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Editar Informações de Perfil</h3>
                <p className="text-xs text-gray-500">Configure seus dados de acesso e da empresa.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-6 flex-1">
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center text-xs">
                  <X className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center text-xs">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* User basic info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-[#3B82F6]" />
                  Dados do Usuário
                </h4>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Seu Nome *</label>
                  <input 
                    type="text"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    required
                    placeholder="Seu nome de usuário"
                    className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Password update (Optional) */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-[#3B82F6]" />
                  Alterar Senha (Opcional)
                </h4>
                
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Senha Atual {formSenha && '*'}</label>
                  <input 
                    type="password"
                    value={formSenhaAtual}
                    onChange={(e) => setFormSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual para autorizar alterações"
                    className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Nova Senha</label>
                    <input 
                      type="password"
                      value={formSenha}
                      onChange={(e) => setFormSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Confirmar Nova Senha</label>
                    <input 
                      type="password"
                      value={formConfirmSenha}
                      onChange={(e) => setFormConfirmSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              {/* Company Info (Editable only for Cliente-Gerente) */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-[#3B82F6]" />
                  Dados Corporativos
                </h4>
                
                {profile?.perfil === 'Cliente-Gerente' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#334155] mb-1">Razão Social / Nome da Empresa *</label>
                        <input 
                          type="text"
                          value={formNomeEmpresa}
                          onChange={(e) => setFormNomeEmpresa(e.target.value)}
                          required
                          placeholder="Nome da empresa"
                          className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#334155] mb-1">CNPJ *</label>
                        <input 
                          type="text"
                          value={formCnpj}
                          onChange={(e) => setFormCnpj(e.target.value)}
                          required
                          placeholder="00.000.000/0000-00"
                          className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-2">
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      💡 Apenas usuários com o perfil de **Gerente** têm permissão para editar os dados corporativos da empresa (Nome da Empresa e CNPJ).
                    </p>
                    <div className="text-xs text-gray-700 space-y-1">
                      <p><strong>Empresa:</strong> {profile?.empresas?.nome || 'Patrium'}</p>
                      <p><strong>CNPJ:</strong> {profile?.empresas?.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || 'Não informado'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
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
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
