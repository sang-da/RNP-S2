
import React, { useMemo, useState } from 'react';
import { Agency, Student } from '../../types';
import { TrendingUp, Skull, Zap, Eye, Landmark, Wallet, History, BarChart2, AlertCircle } from 'lucide-react';
import { MASCOTS, GAME_RULES } from '../../constants';
import { useGame } from '../../contexts/GameContext';
import { useUI } from '../../contexts/UIContext';
import { Modal } from '../Modal';
import { WalletView } from './WalletView';
import { HistoryView } from './HistoryView';
import { MarketGraph } from '../MarketGraph';

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* LEFT COLUMN (2/3) : GRAPH + WALLET */}
            <div className={`lg:col-span-2 space-y-6 ${activeTab === 'HISTORY' ? 'hidden lg:block' : ''}`}>
                <div className={`${activeTab !== 'GRAPH' && 'hidden lg:block'}`}>
                    <MarketGraph 
                        agencies={allAgencies}
                        highlightAgencyId={agency.id}
                        onToggleBlackOps={() => setShowBlackOps(true)}
                        showBlackOpsButton={canAccessBlackOps}
                    />
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
                <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm h-auto max-h-[400px] lg:max-h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar sticky top-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide sticky top-0 bg-white z-10 py-2 border-b border-slate-50">
                        <History size={18} className="text-slate-400"/> Journal des Opérations
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