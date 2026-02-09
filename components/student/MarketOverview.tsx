
import React, { useState } from 'react';
import { Agency, Student, WeekModule } from '../../types';
import { MarketGraph } from '../MarketGraph';
import { WalletView } from './WalletView';
import { HistoryView } from './HistoryView';
import { CycleObjective } from './dashboard/CycleObjective';
import { BarChart2, Wallet, History, Lock, ScanEye } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { useUI } from '../../contexts/UIContext';
import { Modal } from '../Modal';
import { INITIAL_WEEKS } from '../../constants';

interface MarketOverviewProps {
    agency: Agency;
    allAgencies: Agency[];
    currentUser?: Student;
}

type TabType = 'GRAPH' | 'WALLET' | 'HISTORY';

export const MarketOverview: React.FC<MarketOverviewProps> = ({ agency, allAgencies, currentUser }) => {
    const { toast, confirm } = useUI();
    const { weeks, gameConfig, purchaseIntel } = useGame();
    const [activeTab, setActiveTab] = useState<TabType>('GRAPH');
    const [showIntelModal, setShowIntelModal] = useState(false);

    const isUnassigned = agency.id === 'unassigned';
    const currentWeekNum = gameConfig.currentWeek;

    // INTEL LOGIC
    const lockedWeeks = (Object.values(weeks || INITIAL_WEEKS) as WeekModule[])
        .filter((w: WeekModule) => {
            const weekNum = parseInt(w.id);
            const isGloballyVisible = w.isVisible;
            const isLocallyUnlocked = agency.progress && agency.progress[w.id] && agency.progress[w.id].isVisible === true;
            return weekNum > currentWeekNum && !isGloballyVisible && !isLocallyUnlocked;
        })
        .sort((a: WeekModule, b: WeekModule) => parseInt(a.id) - parseInt(b.id));

    const handleBuyIntel = async (weekId: string) => {
        const cost = 300; 
        if (agency.budget_real < cost) {
            toast('error', `Budget insuffisant (${agency.budget_real} < ${cost})`);
            return;
        }

        const confirmed = await confirm({
            title: `Débloquer Semaine ${weekId} ?`,
            message: `Cela coûtera ${cost} PiXi à l'agence.\nVous aurez accès aux missions en avant-première.`,
            confirmText: `Payer ${cost} PiXi`
        });

        if (confirmed) {
            await purchaseIntel(agency.id, weekId);
            setShowIntelModal(false);
        }
    };

    return (
        <div className="animate-in fade-in zoom-in duration-500 w-full pb-24 md:pb-0">
            
            {/* NEW: CYCLE OBJECTIVE HEADER */}
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
                            onIntelClick={isUnassigned ? undefined : () => setShowIntelModal(true)}
                        />
                    </div>
                    
                    <div className={`${activeTab !== 'WALLET' && 'hidden lg:block'}`}>
                        {currentUser ? (
                            <WalletView 
                                student={currentUser} 
                                agency={agency} 
                                allStudents={allAgencies.flatMap(a => a.members)}
                                onTransfer={useGame().transferFunds}
                                onInjectCapital={useGame().injectCapital}
                                onRequestScore={useGame().requestScorePurchase}
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

            {/* MODAL INTEL */}
            <Modal isOpen={showIntelModal} onClose={() => setShowIntelModal(false)} title="Bureau de Renseignement">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-4 items-center">
                        <div className="p-3 bg-white rounded-full shadow-sm">
                            <ScanEye size={24} className="text-indigo-600"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Débloquer le futur</h4>
                            <p className="text-xs text-slate-500 leading-tight mt-1">
                                Achetez l'accès aux briefs des semaines à venir pour prendre de l'avance sur la concurrence.
                                <br/><span className="text-indigo-600 font-bold">Coût : 300 PiXi / Semaine</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {lockedWeeks.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 italic bg-white border-2 border-dashed border-slate-100 rounded-xl">
                                Aucune semaine verrouillée disponible.
                            </div>
                        ) : (
                            lockedWeeks.map(week => (
                                <button 
                                    key={week.id}
                                    onClick={() => handleBuyIntel(week.id)}
                                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all group text-left"
                                >
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-widest">Semaine {week.id}</span>
                                        <span className="font-bold text-slate-900">{week.title}</span>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        Débloquer
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};