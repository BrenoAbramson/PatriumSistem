import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { API_URL } from '../lib/api';

export function DefinirSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Form fields
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill email from query parameters
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (token.length !== 6 || !/^\d+$/.test(token)) {
      setError('O token deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    if (newPassword.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao redefinir a senha.');
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Falha de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-[#e5e4e7] animate-scale-up">
        
        {/* Header Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-bg.png" alt="Logo Patrium" className="h-20 w-auto object-contain rounded mb-4" />
          <h2 className="text-xl font-bold text-[#0F172A]">Definir Senha de Acesso</h2>
          <p className="text-xs text-gray-500 text-center mt-1">
            Insira o token de 6 dígitos que enviamos para o seu e-mail para ativar sua conta.
          </p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-[#0F172A]">Senha Definida!</h3>
              <p className="text-sm text-gray-500">
                Sua conta foi ativada com sucesso. Redirecionando para a tela de login...
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#3B82F6]" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start text-rose-700 text-xs shadow-sm">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">E-mail de Acesso *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="gerente@empresa.com"
                  required
                />
              </div>
            </div>

            {/* Token Field */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Token de Confirmação (6 dígitos) *</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  className="block w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm font-semibold tracking-wider placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="Ex: 123456"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Nova Senha *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Confirmar Nova Senha *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-[#e5e4e7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  placeholder="Repita a senha criada"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B82F6] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando senha...
                </>
              ) : (
                <>
                  Confirmar e Ativar Conta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
