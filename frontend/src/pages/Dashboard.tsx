import { useEffect, useState } from 'react';
import { Package, ArrowRightLeft, AlertTriangle, Building2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../lib/api';

export function Dashboard() {
  const { profile } = useAuth();
  const activeEmpresaId = (profile?.perfil === 'Administrador' && localStorage.getItem('impersonated_empresa_id')) || profile?.empresa_id;

  // Data States
  const [loading, setLoading] = useState(true);
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [emManutencao, setEmManutencao] = useState(0);
  const [setoresAtivos, setSetoresAtivos] = useState(0);
  const [movimentacoesMes, setMovimentacoesMes] = useState(0);
  const [recentes, setRecentes] = useState<any[]>([]);
  const [itensEmManutencao, setItensEmManutencao] = useState<any[]>([]);

  useEffect(() => {
    if (!activeEmpresaId) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch Patrimonios
        const patRes = await fetch(`${API_URL}/api/patrimonios?empresaId=${activeEmpresaId}`);
        const patData = patRes.ok ? await patRes.json() : [];

        // Fetch Setores
        const setRes = await fetch(`${API_URL}/api/setores?empresaId=${activeEmpresaId}`);
        const setData = setRes.ok ? await setRes.json() : [];

        // Fetch Transferencias
        const transRes = await fetch(`${API_URL}/api/transferencias?empresaId=${activeEmpresaId}`);
        const transData = transRes.ok ? await transRes.json() : [];

        // 1. Calculate stats from assets
        setTotalAtivos(patData.length);
        
        const manutencaoList = patData.filter((p: any) => 
          p.estado === 'em_manutencao' || 
          p.estado === 'em manutenção'
        );
        setEmManutencao(manutencaoList.length);
        setItensEmManutencao(manutencaoList.slice(0, 4));

        // 2. Active Sectors count
        setSetoresAtivos(setData.length);

        // 3. Monthly transfers (current month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const transThisMonth = transData.filter((t: any) => {
          const tDate = new Date(t.created_at);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        });
        setMovimentacoesMes(transThisMonth.length);

        // 4. Slice recent movements
        setRecentes(transData.slice(0, 5));

      } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeEmpresaId]);

  const stats = [
    { label: 'Total de Ativos', value: totalAtivos.toString(), icon: Package, color: 'text-blue-500', bg: 'bg-blue-100' },
    { label: 'Movimentações no Mês', value: movimentacoesMes.toString(), icon: ArrowRightLeft, color: 'text-green-500', bg: 'bg-green-100' },
    { label: 'Em Manutenção', value: emManutencao.toString(), icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100' },
    { label: 'Setores Ativos', value: setoresAtivos.toString(), icon: Building2, color: 'text-purple-500', bg: 'bg-purple-100' },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-400 gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
        <p className="text-sm font-medium">Carregando painel de visão geral...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-[#0F172A]">Visão Geral</h2>
          <p className="text-sm text-gray-500 font-medium">Acompanhe as estatísticas, movimentações recentes e alertas da sua empresa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-[#e5e4e7] shadow-xs flex items-center space-x-4">
            <div className={`p-4 rounded-full ${stat.bg} ${stat.color} shrink-0`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-[#334155] font-semibold">{stat.label}</p>
              <p className="text-2xl font-bold text-[#0F172A] mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transfers table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e5e4e7] shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">Movimentações Recentes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#e5e4e7] text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-3 font-semibold">Patrimônio</th>
                    <th className="pb-3 font-semibold">Origem</th>
                    <th className="pb-3 font-semibold">Destino</th>
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                  {recentes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 font-medium">
                        Nenhuma movimentação recente encontrada.
                      </td>
                    </tr>
                  ) : (
                    recentes.map((trans) => (
                      <tr key={trans.id} className="hover:bg-gray-50/20">
                        <td className="py-3.5 font-bold text-[#0F172A]">
                          #{trans.patrimonios?.numero_patrimonial} - {trans.patrimonios?.nome}
                        </td>
                        <td className="py-3.5 text-gray-600 font-medium">
                          {trans.setor_origem?.nome || '—'}
                        </td>
                        <td className="py-3.5 text-gray-600 font-medium">
                          {trans.setor_destino?.nome || '—'}
                        </td>
                        <td className="py-3.5 text-xs text-gray-400 font-medium">
                          {new Date(trans.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Realizada
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Warnings / Alerts Box */}
        <div className="bg-white rounded-2xl border border-[#e5e4e7] shadow-xs p-6 flex flex-col">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Alertas</h3>
          <div className="space-y-4 flex-1">
            {itensEmManutencao.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12 font-medium">
                Nenhum alerta no momento. Todos os bens estão operacionais.
              </p>
            ) : (
              <div className="space-y-3.5">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2 font-medium">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Patrimônios Inoperantes</strong>
                    Temos {emManutencao} item(ns) atualmente em manutenção ou inativos que necessitam de acompanhamento.
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {itensEmManutencao.map(pat => (
                    <div key={pat.id} className="py-2.5 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-[#0F172A]">#{pat.numero_patrimonial} - {pat.nome}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-100 text-amber-800">
                          Manutenção
                        </span>
                      </div>
                      <p className="text-gray-400 mt-1 font-semibold">Setor: {pat.setores?.nome || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
