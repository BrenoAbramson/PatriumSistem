import { useEffect, useState } from 'react';
import { Search, Plus, Building2, User, Mail, MapPin, X, Loader2, ArrowRightLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { API_URL } from '../lib/api';

// CNPJ Validation Helper Function
function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj === '') return false;
  if (cnpj.length !== 14) return false;

  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Valida DGs
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

export function Empresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // CNPJ Fetch Status
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjFeedback, setCnpjFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // General Notification States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);

  // Modal and Filter States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    nome_empresa: '',
    cnpj: '',
    endereco: '',
    nome_gerente: '',
    email_gerente: '',
  });

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/empresas`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao buscar empresas.');
      }
      const data = await res.json();
      setEmpresas(data || []);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError(err.message || 'Não foi possível carregar as empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  // Handle CNPJ lookup with BrasilAPI
  const handleCnpjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/[^\d]/g, '');
    
    // Auto-formatting (XX.XXX.XXX/XXXX-XX)
    let formatted = cleanVal;
    if (cleanVal.length > 2) formatted = `${cleanVal.substring(0, 2)}.${cleanVal.substring(2)}`;
    if (cleanVal.length > 5) formatted = `${formatted.substring(0, 6)}.${cleanVal.substring(5)}`;
    if (cleanVal.length > 8) formatted = `${formatted.substring(0, 10)}/${cleanVal.substring(8)}`;
    if (cleanVal.length > 12) formatted = `${formatted.substring(0, 15)}-${cleanVal.substring(12, 14)}`;

    setFormData(prev => ({ ...prev, cnpj: formatted }));
    setCnpjFeedback(null);

    // If fully typed, run validations
    if (cleanVal.length === 14) {
      if (!validarCNPJ(cleanVal)) {
        setCnpjFeedback({ type: 'error', message: 'CNPJ inválido (verificação de dígitos falhou).' });
        return;
      }
      
      // Valid local check, try querying BrasilAPI
      try {
        setCnpjLoading(true);
        setCnpjFeedback(null);
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanVal}`);
        if (res.ok) {
          const data = await res.json();
          setCnpjFeedback({ type: 'success', message: 'CNPJ Válido e cadastrado na Receita Federal!' });
          
          // Auto-fill form values
          const addressParts = [
            data.logradouro ? `${data.logradouro}, ${data.numero}` : '',
            data.complemento ? `(${data.complemento})` : '',
            data.bairro || '',
            data.municipio ? `${data.municipio}-${data.uf}` : '',
            data.cep ? `CEP: ${data.cep}` : ''
          ].filter(Boolean).join(', ');

          setFormData(prev => ({
            ...prev,
            nome_empresa: data.razao_social || data.nome_fantasia || prev.nome_empresa,
            endereco: addressParts || prev.endereco
          }));
        } else {
          setCnpjFeedback({ type: 'success', message: 'CNPJ estruturalmente válido, mas não localizado na Receita.' });
        }
      } catch (err) {
        console.warn('BrasilAPI request error:', err);
      } finally {
        setCnpjLoading(false);
      }
    }
  };

  // Open modal and clear fields
  const handleOpenModal = () => {
    setFormData({
      nome_empresa: '',
      cnpj: '',
      endereco: '',
      nome_gerente: '',
      email_gerente: '',
    });
    setError(null);
    setCnpjFeedback(null);
    setEmailPreviewUrl(null);
    setIsModalOpen(true);
  };

  // Handle Form field change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Company Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailPreviewUrl(null);

    const cleanCnpj = formData.cnpj.replace(/[^\d]/g, '');
    if (!validarCNPJ(cleanCnpj)) {
      setError('Por favor, insira um CNPJ válido.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_gerente)) {
      setError('E-mail incorreto. Por favor, insira um formato de e-mail válido (ex: gerente@empresa.com).');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/empresas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_empresa: formData.nome_empresa,
          cnpj: cleanCnpj,
          endereco: formData.endereco,
          nome_gerente: formData.nome_gerente,
          email_gerente: formData.email_gerente,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao criar a empresa.');
      }

      setSuccessMsg(`Empresa "${formData.nome_empresa}" cadastrada com sucesso!`);
      if (resData.email_preview) {
        setEmailPreviewUrl(resData.email_preview);
      }
      setIsModalOpen(false);
      fetchEmpresas();

      // Clear success notification after 10 seconds
      setTimeout(() => {
        setSuccessMsg(null);
      }, 10000);

    } catch (err: any) {
      console.error('Error creating company:', err);
      setError(err.message || 'Erro ao cadastrar empresa.');
    } finally {
      setSubmitting(false);
    }
  };

  // Impersonate / Access Tenant System
  const handleImpersonate = (emp: any) => {
    localStorage.setItem('impersonated_empresa_id', emp.id);
    localStorage.setItem('impersonated_empresa_nome', emp.nome);
    // Redirect to Dashboard under the impersonated role view
    window.location.href = '/dashboard';
  };

  const filteredEmpresas = empresas.filter(emp => {
    const term = searchTerm.toLowerCase();
    return (
      emp.nome?.toLowerCase().includes(term) ||
      emp.cnpj?.toLowerCase().includes(term) ||
      emp.gerente_nome?.toLowerCase().includes(term) ||
      emp.gerente_email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Gerenciamento de Empresas</h2>
          <p className="text-sm text-gray-500">Cadastre e acompanhe os tenants/empresas do sistema.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-[#3B82F6] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-600 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Empresa
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
              placeholder="Buscar por nome, CNPJ, gerente ou e-mail..."
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
              <p className="text-sm font-medium">Carregando empresas...</p>
            </div>
          ) : filteredEmpresas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
              <Building2 className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium">Nenhuma empresa encontrada.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e5e4e7] text-xs uppercase tracking-wider text-[#475569]">
                  <th className="p-4 font-semibold">Nome da Empresa</th>
                  <th className="p-4 font-semibold">CNPJ</th>
                  <th className="p-4 font-semibold">Gerente</th>
                  <th className="p-4 font-semibold">E-mail do Gerente</th>
                  <th className="p-4 font-semibold text-center">Usuários</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {filteredEmpresas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-[#0F172A] font-semibold flex items-center">
                      <Building2 className="h-5 w-5 mr-3 text-[#3B82F6] shrink-0" />
                      {emp.nome}
                    </td>
                    <td className="p-4 text-[#334155] font-mono text-xs">{emp.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</td>
                    <td className="p-4 text-[#334155]">{emp.gerente_nome}</td>
                    <td className="p-4 text-[#334155]">{emp.gerente_email}</td>
                    <td className="p-4 text-[#334155] text-center font-medium">{emp.qtd_usuarios}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleImpersonate(emp)}
                        className="text-[#3B82F6] hover:bg-blue-50 border border-blue-100 hover:border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                        Acessar Sistema
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Register Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Cadastrar Nova Empresa (Tenant)</h3>
                <p className="text-xs text-gray-500">Crie o ambiente da empresa e configure o gerente responsável.</p>
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

              {/* CNPJ & Company Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dados Corporativos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-[#334155] mb-1">CNPJ *</label>
                    <div className="relative">
                      <input 
                        type="text"
                        name="cnpj"
                        maxLength={18}
                        value={formData.cnpj}
                        onChange={handleCnpjChange}
                        required
                        placeholder="00.000.000/0000-00"
                        className="w-full px-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                      {cnpjLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#3B82F6]" />
                        </div>
                      )}
                    </div>
                    {cnpjFeedback && (
                      <p className={`text-[10px] mt-1 font-medium ${
                        cnpjFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {cnpjFeedback.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Razão Social / Nome da Empresa *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="text"
                        name="nome_empresa"
                        value={formData.nome_empresa}
                        onChange={handleChange}
                        required
                        placeholder="Nome fantasia ou Razão social"
                        className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Endereço da Empresa</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleChange}
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              {/* Manager configuration */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestor Responsável (Gerente)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Nome Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="text"
                        name="nome_gerente"
                        value={formData.nome_gerente}
                        onChange={handleChange}
                        required
                        placeholder="Nome do gerente administrador"
                        className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">E-mail Corporativo *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="email"
                        name="email_gerente"
                        value={formData.email_gerente}
                        onChange={handleChange}
                        required
                        placeholder="gerente@empresa.com"
                        className="w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                      />
                    </div>
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
                    'Finalizar Cadastro'
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
