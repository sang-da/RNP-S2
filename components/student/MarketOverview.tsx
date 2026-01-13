
import React, { useMemo, useState } from 'react';
import { Agency, Student } from '../../types';
import { TrendingUp, Skull, Zap, Eye, Landmark, Wallet, History, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MASCOTS, GAME_RULES } from '../../constants';
import { useGame } from '../../contexts/GameContext';
import { useUI } from '../../contexts/UIContext';
import { Modal } from '../Modal';
import { WalletView } from './WalletView'; // Extracted Component
import { HistoryView } from './HistoryView';

interface MarketOverviewProps {
  agency: Agency;
  allAgencies: Agency[];
  currentUser?: Student;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ agency, allAgencies, currentUser }) => {
  const { getCurrentGameWeek, triggerBlackOp, transferFunds, injectCapital, requestScorePurchase } = useGame();
  const { confirm } = useUI();
  const [showBlackOps, setShowBlackOps] = useState(false);
  
  // MOBILE TABS
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'WALLET' | 'HISTORY'>('GRAPH');

  const currentWeek = getCurrentGameWeek();
  const canAccessBlackOps = currentWeek >= GAME_RULES.UNLOCK_WEEK_BLACK_OPS;

  // --- DATA PREPARATION FOR GRAPH ---
  const comparisonData = useMemo(() => {
    const allDates = Array.from(new Set(
        allAgencies.flatMap(a => a.eventLog.map(e => e.date))
    )).sort();

    const STARTING_VE = 0;

    const initialPoint = {
        name: 'Départ',
        date: '2024-01-01',
        [agency.name]: STARTING_VE, 
        ...allAgencies.reduce((acc, a) => ({ ...acc, [a.name]: STARTING_VE }), {})
    };

    const historyPoints = allDates.map((date: unknown) => {
        const dateStr = date as string;
        const point: any = { 
            name: new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            date: dateStr
        };

        allAgencies.forEach(a => {
            const veAtDate = a.eventLog
                .filter(e => e.date <= dateStr)
                .reduce((sum, e) => sum + (e.deltaVE || 0), STARTING_VE); 
            point[a.name] = Math.max(0, veAtDate);
        });

        return point;
    });

    if (historyPoints.length === 0) return [initialPoint];
    return [initialPoint, ...historyPoints];
  }, [allAgencies, agency.name]);

  const leaderboard = [...allAgencies].filter(a => a.id !== 'unassigned').sort((a, b) => b.ve_current - a.ve_current);

  const getMascot = () => {
      if (agency.ve_current >= 60) return MASCOTS.MARKET_RICH;
      if (agency.ve_current <= 30) return MASCOTS.MARKET_POOR;
      return MASCOTS.MARKET_STABLE;
  };

  const handleBlackOp = async (targetId: string, type: 'AUDIT' | 'LEAK') => {
      const target = allAgencies.find(a => a.id === targetId);
      if(!target) return;

      const cost = type === 'AUDIT' ? GAME_RULES.COST_AUDIT : GAME_RULES.COST_LEAK;
      const message = type === 'AUDIT' 
        ? `Lancer un AUDIT OFFENSIF sur ${target.name} ?\nCoût: ${cost} PiXi.\n\nRISQUE: Si l'agence est "propre", vous perdrez 20 VE pour diffamation.`
        : `Acheter une FUITE D'INFO ?\nCoût: ${cost} PiXi.\n\nVous obtiendrez un indice sur le prochain brief.`;

      if (await confirm({ title: "Opération Spéciale", message, isDangerous: true, confirmText: "Payer & Lancer" })) {
          await triggerBlackOp(agency.id, target.id, type);
          setShowBlackOps(false);
      }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">{label}</p>
          <div className="space-y-2">
            {payload.map((p: any) => {
              const targetAgency = allAgencies.find(a => a.name === p.name);
              return (
                <div key={p.name} className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                        {targetAgency?.logoUrl ? (
                            <img src={targetAgency.logoUrl} className="w-full h-full object-contain" />
                        ) : (
                            <Landmark size={12} className="text-slate-300"/>
                        )}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{p.name}</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: p.stroke }}>{p.value} VE</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // --- SUB-COMPONENTS FOR CLEAN LAYOUT ---
  const GraphComponent = () => (
      <div className="bg-white rounded-[24px] md:rounded-[32px] p-4 md:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="absolute -right-4 -bottom-6 md:-right-6 md:-bottom-8 w-32 md:w-48 z-10 pointer-events-none opacity-90 transition-all duration-500">
                <img src={getMascot()} alt="Mascot" className="drop-shadow-2xl"/>
            </div>

            <div className="flex justify-between items-center mb-4 md:mb-6 shrink-0 z-20">
                <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="text-yellow-500" size={20} /> Tableau de Bord
                </h3>
                
                <div className="flex gap-2">
                    {canAccessBlackOps && (
                        <button 
                            onClick={() => setShowBlackOps(true)}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20"
                        >
                            <Eye size={14}/> Intel
                        </button>
                    )}
                    <div className="hidden md:flex gap-2">
                        {leaderboard.slice(0, 3).map((a, i) => (
                            <div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${a.id === agency.id ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="w-4 h-4 rounded-full bg-white overflow-hidden flex items-center justify-center border border-slate-200">
                                    {a.logoUrl ? <img src={a.logoUrl} className="w-full h-full object-contain" /> : <span className="text-[6px] font-bold text-slate-400">#</span>}
                                </div>
                                <span className={`font-bold ${a.id === agency.id ? 'text-yellow-600' : 'text-slate-700'}`}>{a.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex-1 w-full shrink-0 z-20">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} />
                        {allAgencies.map((a, index) => (
                            <Line 
                                key={a.id}
                                type="monotone" 
                                dataKey={a.name} 
                                stroke={a.id === agency.id ? '#facc15' : index % 2 === 0 ? '#6366f1' : '#10b981'} 
                                strokeWidth={a.id === agency.id ? 3 : 1.5}
                                strokeOpacity={a.id === agency.id ? 1 : 0.2}
                                dot={a.id === agency.id ? {r: 4, fill: '#facc15', strokeWidth: 2, stroke: '#fff'} : false}
                                activeDot={{ r: 6 }}
                                isAnimationActive={false} 
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
      </div>
  );

  return (
    <div className="animate-in fade-in zoom-in duration-500 w-full pb-24 md:pb-0">
        
        {/* MOBILE TABS (SUB-SLIDER) */}
        <div className="md:hidden flex gap-2 bg-slate-200 p-1 rounded-xl mb-4 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('GRAPH')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-2 ${activeTab === 'GRAPH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                <BarChart2 size={16}/> Marché
            </button>
            <button onClick={() => setActiveTab('WALLET')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-2 ${activeTab === 'WALLET' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                <Wallet size={16}/> Banque
            </button>
            <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                <History size={16}/> Journal
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN (2/3) : GRAPH + WALLET */}
            <div className={`lg:col-span-2 space-y-6 ${activeTab === 'HISTORY' ? 'hidden lg:block' : ''}`}>
                <div className={`${activeTab !== 'GRAPH' && 'hidden lg:block'}`}>
                    <GraphComponent />
                </div>
                
                <div className={`${activeTab !== 'WALLET' && 'hidden lg:block'}`}>
                    {currentUser ? (
                        <WalletView 
                            student={currentUser} 
                            agency={agency} 
                            allStudents={allAgencies.flatMap(a => a.members)}
                            onTransfer={transferFunds}
                            onInjectCapital={injectCapital}
                            onRequestScore={requestScorePurchase}
                        />
                    ) : (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                            Connectez-vous pour voir votre portefeuille.
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN (1/3) : HISTORY */}
            <div className={`lg:col-span-1 ${activeTab !== 'HISTORY' && 'hidden lg:block'}`}>
                <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm h-full max-h-[800px] overflow-y-auto custom-scrollbar sticky top-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-6">
                        <History size={20} className="text-slate-400"/> Journal des Opérations
                    </h3>
                    <HistoryView agency={agency} />
                </div>
            </div>

        </div>

        {/* BLACK OPS MODAL */}
        <Modal isOpen={showBlackOps} onClose={() => setShowBlackOps(false)} title="Intelligence Économique">
            <div className="space-y-6">
                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-sm">
                    <p className="mb-2"><strong className="text-white">Opérations Spéciales (Black Ops)</strong></p>
                    <p>Utilisez votre budget pour obtenir des avantages déloyaux. Attention aux retours de flamme.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div>
                            <h4 className="font-bold text-slate-900 flex items-center gap-2"><Zap size={16} className="text-yellow-500"/> Fuite Industrielle</h4>
                            <p className="text-xs text-slate-500">Acheter des infos sur le prochain brief.</p>
                        </div>
                        <button onClick={() => handleBlackOp(agency.id, 'LEAK')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold">-{GAME_RULES.COST_LEAK} PiXi</button>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>
                    <p className="text-xs font-bold uppercase text-slate-400">Cibler un Concurrent (Audit Hostile)</p>

                    {allAgencies.filter(a => a.id !== 'unassigned' && a.id !== agency.id).map(target => (
                        <div key={target.id} className="border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                    {target.logoUrl ? <img src={target.logoUrl} className="w-full h-full object-contain" /> : <Skull size={16} className="text-red-500"/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{target.name}</h4>
                                    <p className="text-xs text-slate-500">VE Actuelle: {target.ve_current}</p>
                                </div>
                            </div>
                            <button onClick={() => handleBlackOp(target.id, 'AUDIT')} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors">-{GAME_RULES.COST_AUDIT} PiXi</button>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    </div>
  );
};
