
import React, { useState } from 'react';
import { Agency, Student } from '../../types';
import { History, BarChart2, Wallet, Lock } from 'lucide-react';
import { MarketGraph } from '../MarketGraph';
import { WalletView } from './WalletView';
import { HistoryView } from './HistoryView';
import { CycleObjective } from './dashboard/CycleObjective'; 

interface MarketOverviewProps {
  agency: Agency;
  allAgencies: Agency[];
  currentUser?: Student;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ agency, allAgencies, currentUser }) => {
  // MOBILE TABS
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'WALLET' | 'HISTORY'>('GRAPH');
  const isUnassigned = agency.id === 'unassigned';

  return (
    <div className="animate-in fade-in zoom-in duration-500 w-full pb-24 md:pb-0">
        
        {/* NEW: CYCLE OBJECTIVE HEADER */}
        {/* PLUS BESOIN DE PROPS AGENCY, LE COMPOSANT EST AUTONOME */}
        {!isUnassigned && (
            <div className="mb-6">
                <CycleObjective />
            </div>
        )}

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
                        highlightAgencyId={isUnassigned ? undefined : agency.id}
                        showBlackOpsButton={false} 
                    />
                </div>
                
                <div className={`${activeTab !== 'WALLET' && 'hidden lg:block'}`}>
                    {currentUser ? (
                        <WalletView 
                            student={currentUser} 
                            agency={agency} 
                            allStudents={allAgencies.flatMap(a => a.members)}
                            onTransfer={() => {}} // Read-only props handled inside if needed, or pass dummy
                            onInjectCapital={() => {}}
                            onRequestScore={() => {}}
                            // Dans WalletView, on gère l'affichage réduit si unassigned
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
                    {isUnassigned ? (
                        <div className="text-center py-8 text-slate-400 text-xs italic">
                            <Lock size={32} className="mx-auto mb-2 opacity-20"/>
                            Rejoignez une agence pour accéder à son journal financier.
                        </div>
                    ) : (
                        <HistoryView agency={agency} />
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};
