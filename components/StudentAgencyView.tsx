
import React, { useState, useEffect } from 'react';
import { Agency, BrandColor, Student } from '../types';
import { Target, Users, History, Wallet, TrendingUp, HelpCircle, Briefcase, Settings, Image as ImageIcon, Shield, Eye, Crown, BookOpen, Send, Repeat, ArrowUpRight, Building2, Zap } from 'lucide-react';
import { MarketOverview } from './student/MarketOverview';
import { MissionsView } from './student/MissionsView';
import { TeamView } from './student/TeamView';
import { HistoryView } from './student/HistoryView';
import { MercatoView } from './student/MercatoView';
import { WikiView } from './student/WikiView';
import { Modal } from './Modal';
import { GAME_RULES, BADGE_DEFINITIONS } from '../constants';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

interface StudentViewProps {
  agency: Agency;
  allAgencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

type TabType = 'MARKET' | 'MISSIONS' | 'TEAM' | 'RECRUITMENT' | 'HISTORY' | 'RESOURCES' | 'WALLET';

const COLOR_THEMES: Record<BrandColor, { bg: string, text: string }> = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500' },
    slate: { bg: 'bg-slate-600', text: 'text-slate-600' },
};

export const StudentAgencyView: React.FC<StudentViewProps> = ({ agency, allAgencies, onUpdateAgency }) => {
  const { toast } = useUI();
  const { currentUser } = useAuth();
  const { transferFunds, injectCapital, requestScorePurchase, getCurrentGameWeek } = useGame();
  
  const [activeTab, setActiveTab] = useState<TabType>('MARKET');
  const [showVERules, setShowVERules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // State for Unlock Modals
  const [unlockModal, setUnlockModal] = useState<{title: string, message: string, icon: any, confirmText: string} | null>(null);

  const brandColor = agency.branding?.color || 'indigo';
  const theme = COLOR_THEMES[brandColor];
  const leaderboard = [...allAgencies].filter(a => a.id !== 'unassigned').sort((a, b) => b.ve_current - a.ve_current);
  const myRank = leaderboard.findIndex(a => a.id === agency.id) + 1;
  const rawSalary = agency.members.reduce((acc, member) => acc + (member.individualScore * GAME_RULES.SALARY_MULTIPLIER), 0);
  const weeklyCharges = rawSalary * (1 + (agency.weeklyTax || 0)) + GAME_RULES.AGENCY_RENT;
  const veRevenue = agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER;
  const weeklyRevenue = GAME_RULES.REVENUE_BASE + veRevenue + (agency.weeklyRevenueModifier || 0);
  const netWeekly = weeklyRevenue - weeklyCharges;
  const myMemberProfile = agency.members.find(m => m.id === currentUser?.uid);

  // --- FEATURE UNLOCK CHECKER ---
  useEffect(() => {
      const currentWeek = getCurrentGameWeek();
      
      // CHECK WEEK 3: BLACK OPS
      if (currentWeek >= GAME_RULES.UNLOCK_WEEK_BLACK_OPS) {
          const hasSeenBlackOps = localStorage.getItem(`seen_unlock_blackops_${currentUser?.uid}`);
          if (!hasSeenBlackOps) {
              setUnlockModal({
                  title: "Intelligence Économique Activée",
                  message: "Le marché se durcit. Vous avez désormais accès aux outils de veille stratégique.\n\nNouveauté : Audits concurrentiels et achat d'informations disponibles dans l'onglet 'Marché'.",
                  icon: <Eye size={32} className="text-yellow-500"/>,
                  confirmText: "Compris, je reste vigilant"
              });
              localStorage.setItem(`seen_unlock_blackops_${currentUser?.uid}`, 'true');
              return; // Show only one at a time
          }
      }

      // CHECK WEEK 6: MERGERS
      if (currentWeek >= GAME_RULES.UNLOCK_WEEK_MERGERS) {
          const hasSeenMergers = localStorage.getItem(`seen_unlock_mergers_${currentUser?.uid}`);
          if (!hasSeenMergers) {
              setUnlockModal({
                  title: "Fusions & Acquisitions (M&A)",
                  message: "La consolidation du secteur commence. \n\nNouveauté : Il est désormais possible de racheter une agence en faillite (VE < 40) pour absorber ses talents et sa dette.",
                  icon: <Building2 size={32} className="text-indigo-500"/>,
                  confirmText: "Voir les opportunités"
              });
              localStorage.setItem(`seen_unlock_mergers_${currentUser?.uid}`, 'true');
          }
      }
  }, [getCurrentGameWeek, currentUser]);

  const handleColorChange = (color: BrandColor) => {
      onUpdateAgency({ ...agency, branding: { ...agency.branding, color } });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const storageRef = ref(storage, `banners/${agency.id}_${Date.now()}`);
              await uploadBytes(storageRef, e.target.files[0]);
              const url = await getDownloadURL(storageRef);
              onUpdateAgency({ ...agency, branding: { ...agency.branding, bannerUrl: url } });
              toast('success', 'Bannière mise à jour');
          } catch (error) { toast('error', "Erreur d'upload"); }
      }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] font-sans">
        {/* HEADER */}
        <div className="relative mb-8 rounded-b-3xl md:rounded-3xl overflow-hidden bg-slate-100 min-h-[200px] md:min-h-[240px] shadow-md group">
            {agency.branding?.bannerUrl ? (
                <img src={agency.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
            ) : (
                <div className={`absolute inset-0 opacity-10 ${theme.bg}`} style={{backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
            {agency.id !== 'unassigned' && (
                <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 border border-white/10">
                    <Settings size={20}/>
                </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col xl:flex-row justify-between items-end xl:items-end gap-6 text-white">
                <div className="w-full xl:w-auto">
                    <div className="flex items-center gap-3 mb-1">
                        {agency.id !== 'unassigned' && <span className="bg-white/20 backdrop-blur border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Rang #{myRank}</span>}
                        <span className="text-slate-300 italic text-sm truncate">"{agency.tagline}"</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight drop-shadow-lg leading-none mb-3">{agency.name}</h2>
                    {/* Badges */}
                    <div className="flex items-center gap-1">
                        {BADGE_DEFINITIONS.map(def => {
                            if(Math.random() > 0.8) return <div key={def.id} className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center shadow-lg border border-yellow-200"><Shield size={12}/></div>;
                            return null;
                        })}
                    </div>
                </div>

                {agency.id !== 'unassigned' && (
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    {/* Personal Wallet Button - Now Redirects to Tab */}
                    {myMemberProfile && (
                        <div onClick={() => setActiveTab('WALLET')} className="flex-1 md:text-right md:border-r border-white/20 md:pr-4 cursor-pointer group hover:bg-white/10 rounded-lg p-1 transition-colors">
                            <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest block mb-1 group-hover:underline flex items-center gap-1 md:justify-end">
                                <Wallet size={12}/> Mon Solde
                            </span>
                            <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                                <span className="text-yellow-400 font-mono">{myMemberProfile.wallet || 0} PiXi</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between md:justify-start gap-6 pl-2">
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Flux Net</span>
                            <div className={`text-xl font-bold ${netWeekly >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netWeekly > 0 ? '+' : ''}{netWeekly.toFixed(0)}</div>
                        </div>
                        <div className="text-center">
                            <div 
                                onClick={() => setShowVERules(true)}
                                className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-1 justify-center cursor-pointer hover:text-white"
                            >
                                VE <HelpCircle size={10}/>
                            </div>
                            <div className={`text-3xl font-display font-bold leading-none ${agency.ve_current >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>{agency.ve_current}</div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 mb-24 md:mb-8">
            {activeTab === 'MARKET' && agency.id !== 'unassigned' && <MarketOverview agency={agency} allAgencies={allAgencies} />}
            {activeTab === 'MISSIONS' && agency.id !== 'unassigned' && <MissionsView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {activeTab === 'TEAM' && agency.id !== 'unassigned' && <TeamView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {activeTab === 'WALLET' && myMemberProfile && agency.id !== 'unassigned' && (
                <WalletView 
                    student={myMemberProfile} 
                    agency={agency} 
                    allStudents={allAgencies.flatMap(a => a.members)}
                    onTransfer={transferFunds}
                    onInjectCapital={injectCapital}
                    onRequestScore={requestScorePurchase}
                />
            )}
            {(activeTab === 'RECRUITMENT' || agency.id === 'unassigned') && <MercatoView agency={agency} allAgencies={allAgencies} onUpdateAgency={onUpdateAgency} onUpdateAgencies={() => {}} />}
            {activeTab === 'RESOURCES' && <WikiView agency={agency} />}
            {activeTab === 'HISTORY' && <HistoryView agency={agency} />}
        </div>

        {/* FOOTER NAV */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 z-50 md:relative md:bg-transparent md:border-t-0 md:p-0 md:mt-auto safe-area-bottom">
             <div className="max-w-7xl mx-auto flex md:justify-start gap-2 md:gap-4 overflow-x-auto no-scrollbar snap-x justify-between">
                {agency.id !== 'unassigned' && (
                    <>
                        <NavButton active={activeTab === 'MARKET'} onClick={() => setActiveTab('MARKET')} icon={<TrendingUp size={20} />} label="Marché" theme={theme} />
                        <NavButton active={activeTab === 'MISSIONS'} onClick={() => setActiveTab('MISSIONS')} icon={<Target size={20} />} label="Missions" theme={theme} />
                        <NavButton active={activeTab === 'TEAM'} onClick={() => setActiveTab('TEAM')} icon={<Users size={20} />} label="Équipe" theme={theme} />
                        <NavButton active={activeTab === 'WALLET'} onClick={() => setActiveTab('WALLET')} icon={<Wallet size={20} />} label="Banque" theme={theme} />
                    </>
                )}
                <NavButton active={activeTab === 'RESOURCES'} onClick={() => setActiveTab('RESOURCES')} icon={<BookOpen size={20} />} label="Wiki" theme={theme} />
                <NavButton active={activeTab === 'RECRUITMENT' || agency.id === 'unassigned'} onClick={() => setActiveTab('RECRUITMENT')} icon={<Briefcase size={20} />} label={agency.id === 'unassigned' ? "Mon Statut" : "Recrutement"} theme={theme} />
                <NavButton active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<History size={20} />} label="Journal" theme={theme} />
             </div>
        </div>

        {/* SETTINGS & HELP MODALS */}
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Personnalisation Agence">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Couleur de Marque</label>
                    <div className="flex gap-3">
                        {(['indigo', 'emerald', 'rose', 'amber', 'cyan'] as BrandColor[]).map(c => (
                            <button key={c} onClick={() => handleColorChange(c)} className={`w-10 h-10 rounded-full border-2 ${COLOR_THEMES[c].bg} ${brandColor === c ? 'ring-4 ring-offset-2 ring-slate-200 border-white' : 'border-transparent opacity-60 hover:opacity-100'}`} />
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bannière (Cover)</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Cliquez pour changer</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                    </label>
                </div>
            </div>
        </Modal>
        
        <Modal isOpen={showVERules} onClose={() => setShowVERules(false)} title="Comprendre la VE">
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">
                        La <strong>Valeur d'Entreprise (VE)</strong> est votre "note de groupe" dynamique (/100). 
                        <br/>Elle fluctue selon vos rendus, vos choix et les événements.
                    </p>
                    <div className="flex gap-2 mt-4">
                        <div className="flex-1 bg-white p-2 rounded border text-center">
                            <div className="text-xs font-bold text-emerald-600 uppercase">Impact Revenus</div>
                            <div className="text-sm font-bold">1 Point VE = {GAME_RULES.REVENUE_VE_MULTIPLIER} PiXi/sem</div>
                        </div>
                        <div className="flex-1 bg-white p-2 rounded border text-center">
                            <div className="text-xs font-bold text-indigo-600 uppercase">Note Finale</div>
                            <div className="text-sm font-bold">Compte pour 40%</div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-2">Derniers Mouvements</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {agency.eventLog.filter(e => e.deltaVE).map(e => (
                            <div key={e.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                <span className="text-slate-600 text-xs">{e.label}</span>
                                <span className={`font-mono font-bold text-xs ${(e.deltaVE || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{(e.deltaVE || 0) > 0 ? '+' : ''}{e.deltaVE}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>

        {/* ANNOUNCEMENT MODAL (UNLOCKS) */}
        {unlockModal && (
            <Modal isOpen={!!unlockModal} onClose={() => setUnlockModal(null)} title={unlockModal.title}>
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-6 rounded-full bg-slate-100 mb-2">
                        {unlockModal.icon}
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line">
                        {unlockModal.message}
                    </p>
                    <button 
                        onClick={() => setUnlockModal(null)}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg"
                    >
                        {unlockModal.confirmText}
                    </button>
                </div>
            </Modal>
        )}
    </div>
  );
};

// --- WALLET VIEW COMPONENT ---
const WalletView: React.FC<{student: Student, agency: Agency, allStudents: Student[], onTransfer: any, onInjectCapital: any, onRequestScore: any}> = ({student, agency, allStudents, onTransfer, onInjectCapital, onRequestScore}) => {
    const [targetId, setTargetId] = useState('');
    const [amount, setAmount] = useState(0);
    const [scoreToBuy, setScoreToBuy] = useState(0);

    const handleTransfer = async () => {
        if(!targetId || amount <= 0) return;
        await onTransfer(student.id, targetId, amount);
        setAmount(0);
    };

    const handleInject = async () => {
        if(amount <= 0) return;
        await onInjectCapital(student.id, agency.id, amount);
        setAmount(0);
    };

    const handleBuyScore = async () => {
        if(scoreToBuy <= 0) return;
        const cost = scoreToBuy * 200;
        await onRequestScore(student.id, agency.id, cost, scoreToBuy);
        setScoreToBuy(0);
    };

    return (
        <div className="animate-in fade-in space-y-6">
            {/* SOLDE CARD */}
            <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-20 bg-white/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                <div className="relative z-10 text-center md:text-left mb-4 md:mb-0">
                    <p className="text-indigo-300 text-sm font-bold uppercase mb-1 tracking-widest">Solde Disponible</p>
                    <p className="text-5xl font-display font-bold text-yellow-400">{student?.wallet || 0} <span className="text-2xl text-yellow-200">PiXi</span></p>
                </div>
                <div className="relative z-10 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                    <p className="text-xs text-indigo-200 mb-1">Salaire Hebdo</p>
                    <p className="font-bold text-white text-lg">+{student.individualScore * GAME_RULES.SALARY_MULTIPLIER} PiXi</p>
                </div>
            </div>

            {/* ACTIONS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. INVESTIR AGENCE */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                            <ArrowUpRight size={24}/>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Investir dans mon Agence</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Injectez votre argent personnel pour sauver la trésorerie ou payer le loyer.
                        </p>
                    </div>
                    <div className="mt-auto space-y-3">
                        <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Montant" onChange={e => setAmount(Number(e.target.value))} />
                        <button onClick={handleInject} disabled={amount <= 0 || amount > (student.wallet || 0)} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                            Confirmer l'injection
                        </button>
                    </div>
                </div>

                {/* 2. SOUTIEN EXTERNE (PRÊT ENTREPRISE) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                            <Send size={24}/>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Soutien & Prêt Inter-Agences</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Envoyez des fonds à un collègue d'une autre agence pour les aider.
                            <br/><span className="text-xs text-indigo-600 font-bold">Conseil : Négociez un gain de VE en retour !</span>
                        </p>
                    </div>
                    <div className="mt-auto space-y-3">
                        <select className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm" onChange={e => setTargetId(e.target.value)} value={targetId}>
                            <option value="">-- Bénéficiaire --</option>
                            {allStudents.filter(s => s.id !== student.id).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Montant" onChange={e => setAmount(Number(e.target.value))} />
                        <button onClick={handleTransfer} disabled={amount <= 0 || amount > (student.wallet || 0)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                            Envoyer les fonds
                        </button>
                    </div>
                </div>

                {/* 3. ACHAT SCORE */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3">
                            <TrendingUp size={24}/>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Formation (Achat Score)</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Convertissez votre argent en compétence. 
                            <br/><strong>200 PiXi = 1 Point Score</strong>.
                        </p>
                    </div>
                    <div className="mt-auto space-y-3">
                        <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Points voulus" onChange={e => setScoreToBuy(Number(e.target.value))} />
                        <div className="text-right text-xs font-bold text-slate-400">Coût: {scoreToBuy * 200} PiXi</div>
                        <button onClick={handleBuyScore} disabled={scoreToBuy <= 0 || (scoreToBuy * 200) > (student.wallet || 0)} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                            Demander la validation
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

const NavButton: React.FC<any> = ({ active, onClick, icon, label, theme }) => (
    <button onClick={onClick} className={`snap-start flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-4 rounded-xl transition-all min-w-[70px] md:min-w-[150px] justify-center md:justify-start ${active ? `${theme.bg} text-white transform scale-105 shadow-md` : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}>
        <div className={`p-1.5 rounded-full ${active ? 'bg-white/20' : ''}`}>{React.cloneElement(icon, { className: active ? 'text-white' : '' })}</div>
        <span className={`text-[10px] md:text-base font-bold`}>{label}</span>
    </button>
);
