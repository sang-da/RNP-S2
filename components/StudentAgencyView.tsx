
import React, { useState, useEffect } from 'react';
import { Agency, BrandColor, Student, GameEvent, MercatoRequest, ChallengeRequest } from '../types';
import { Target, Users, History, Wallet, TrendingUp, HelpCircle, Briefcase, Settings, Image as ImageIcon, Shield, Eye, Crown, BookOpen, Send, Repeat, ArrowUpRight, Building2, Zap, AlertTriangle, PartyPopper, Gavel, Landmark, Landmark as Bank, Check, X, Info, Rocket, Upload } from 'lucide-react';
import { MarketOverview } from './student/MarketOverview';
import { MissionsView } from './student/MissionsView';
import { TeamView } from './student/TeamView';
// HistoryView removed from direct import as it is now inside MarketOverview
import { MercatoView } from './student/MercatoView';
import { WikiView } from './student/WikiView';
import { FAQView } from './student/FAQView';
import { Modal } from './Modal';
import { GAME_RULES, BADGE_DEFINITIONS } from '../constants';
import { ref, uploadBytes, getDownloadURL, storage } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

interface StudentViewProps {
  agency: Agency;
  allAgencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

type TabType = 'MARKET' | 'MISSIONS' | 'TEAM' | 'RECRUITMENT' | 'RESOURCES' | 'HELP';

const COLOR_THEMES: Record<BrandColor, { bg: string, text: string }> = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500' },
    slate: { bg: 'bg-slate-600', text: 'text-slate-600' },
};

// LIMITE IMAGES : 2 Mo
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export const StudentAgencyView: React.FC<StudentViewProps> = ({ agency, allAgencies, onUpdateAgency }) => {
  const { toast } = useUI();
  const { currentUser } = useAuth();
  const { transferFunds, injectCapital, requestScorePurchase, getCurrentGameWeek, updateAgenciesList, submitMercatoVote, submitChallengeVote } = useGame();
  
  const [activeTab, setActiveTab] = useState<TabType>('MARKET');
  const [showVERules, setShowVERules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [unlockModal, setUnlockModal] = useState<{title: string, message: string, icon: any, confirmText: string} | null>(null);
  const [notificationEvent, setNotificationEvent] = useState<GameEvent | null>(null);

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

  useEffect(() => {
      const currentWeek = getCurrentGameWeek();
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
              return; 
          }
      }
  }, [getCurrentGameWeek, currentUser]);

  useEffect(() => {
      if (agency.eventLog.length === 0) return;
      const latestEvent = agency.eventLog[agency.eventLog.length - 1];
      const NOTIFY_TYPES = ['CRISIS', 'VE_DELTA'];
      if (NOTIFY_TYPES.includes(latestEvent.type)) {
          const seenKey = `seen_event_${currentUser?.uid}_${latestEvent.id}`;
          const hasSeen = localStorage.getItem(seenKey);
          if (!hasSeen) setNotificationEvent(latestEvent);
      }
  }, [agency.eventLog, currentUser]);

  const closeNotification = () => {
      if (notificationEvent) {
          localStorage.setItem(`seen_event_${currentUser?.uid}_${notificationEvent.id}`, 'true');
          setNotificationEvent(null);
      }
  };

  const handleColorChange = (color: BrandColor) => {
      onUpdateAgency({ ...agency, branding: { ...agency.branding, color } });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > MAX_IMAGE_SIZE) {
              toast('error', `Image trop lourde (${(file.size/1024/1024).toFixed(1)} Mo). Max 2 Mo.`);
              return;
          }
          try {
              const storageRef = ref(storage, `banners/${agency.id}_${Date.now()}`);
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              onUpdateAgency({ ...agency, branding: { ...agency.branding, bannerUrl: url } });
              toast('success', 'Bannière mise à jour');
          } catch (error) { toast('error', "Erreur d'upload"); }
      }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > MAX_IMAGE_SIZE) {
            toast('error', `Image trop lourde (${(file.size/1024/1024).toFixed(1)} Mo). Max 2 Mo.`);
            return;
        }
        try {
            const storageRef = ref(storage, `logos/${agency.id}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            onUpdateAgency({ ...agency, logoUrl: url });
            toast('success', 'Logo mis à jour');
        } catch (error) { toast('error', "Erreur d'upload du logo"); }
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
                <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 border border-white/10 z-20">
                    <Settings size={20}/>
                </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col xl:flex-row justify-between items-end xl:items-end gap-6 text-white">
                <div className="w-full xl:w-auto flex gap-4 items-end">
                    {/* AGENCY LOGO */}
                    {agency.logoUrl && (
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white p-1 shadow-2xl shrink-0 animate-in zoom-in duration-300">
                            <img src={agency.logoUrl} className="w-full h-full object-contain rounded-xl" alt="Logo" />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            {agency.id !== 'unassigned' && <span className="bg-white/20 backdrop-blur border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Rang #{myRank}</span>}
                            <span className="text-slate-300 italic text-sm truncate">"{agency.tagline}"</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight drop-shadow-lg leading-none mb-3">{agency.name}</h2>
                        <div className="flex items-center gap-1">
                            {agency.badges && agency.badges.map(b => (
                                <div key={b.id} title={b.label} className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center shadow-lg border border-yellow-200"><Shield size={12}/></div>
                            ))}
                        </div>
                    </div>
                </div>

                {agency.id !== 'unassigned' && (
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    {myMemberProfile && (
                        <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                            <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end">
                                <Wallet size={12}/> Mon Solde
                            </span>
                            <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                                <span className={`font-mono ${myMemberProfile.wallet && myMemberProfile.wallet < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{myMemberProfile.wallet || 0} PiXi</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end">
                            <Landmark size={12}/> Trésorerie Studio
                        </span>
                        <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                            <span className={`font-mono ${agency.budget_real < 0 ? 'text-red-400' : 'text-white'}`}>{agency.budget_real} PiXi</span>
                        </div>
                    </div>

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

        {/* VOTING BOOTHS (POPUP AUTOMATIQUE) */}
        {myMemberProfile && (
            <>
                <VotingBooth 
                    agency={agency} 
                    currentUser={myMemberProfile} 
                    onVote={submitMercatoVote} 
                />
                <ChallengeVotingBooth 
                    agency={agency}
                    currentUser={myMemberProfile}
                    onVote={submitChallengeVote}
                />
            </>
        )}

        {/* CONTENT */}
        <div className="flex-1 mb-24 md:mb-8">
            {activeTab === 'MARKET' && agency.id !== 'unassigned' && <MarketOverview agency={agency} allAgencies={allAgencies} currentUser={myMemberProfile} />}
            {activeTab === 'MISSIONS' && agency.id !== 'unassigned' && <MissionsView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {activeTab === 'TEAM' && agency.id !== 'unassigned' && <TeamView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {(activeTab === 'RECRUITMENT' || agency.id === 'unassigned') && (
              <MercatoView 
                agency={agency} 
                allAgencies={allAgencies} 
                onUpdateAgency={onUpdateAgency} 
                onUpdateAgencies={updateAgenciesList} 
              />
            )}
            {activeTab === 'RESOURCES' && <WikiView agency={agency} />}
            {activeTab === 'HELP' && <FAQView />}
        </div>

        {/* FOOTER NAV */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 z-50 md:relative md:bg-transparent md:border-t-0 md:p-0 md:mt-auto safe-area-bottom">
             <div className="max-w-7xl mx-auto flex md:justify-start gap-2 md:gap-4 overflow-x-auto no-scrollbar snap-x justify-between">
                {agency.id !== 'unassigned' && (
                    <>
                        <NavButton active={activeTab === 'MARKET'} onClick={() => setActiveTab('MARKET')} icon={<TrendingUp size={20} />} label="Tableau de Bord" theme={theme} />
                        <NavButton active={activeTab === 'MISSIONS'} onClick={() => setActiveTab('MISSIONS')} icon={<Target size={20} />} label="Missions" theme={theme} />
                        <NavButton active={activeTab === 'TEAM'} onClick={() => setActiveTab('TEAM')} icon={<Users size={20} />} label="Équipe" theme={theme} />
                    </>
                )}
                <NavButton active={activeTab === 'RESOURCES'} onClick={() => setActiveTab('RESOURCES')} icon={<BookOpen size={20} />} label="Wiki" theme={theme} />
                <NavButton active={activeTab === 'RECRUITMENT' || agency.id === 'unassigned'} onClick={() => setActiveTab('RECRUITMENT')} icon={<Briefcase size={20} />} label={agency.id === 'unassigned' ? "Mon Statut" : "Recrutement"} theme={theme} />
                <NavButton active={activeTab === 'HELP'} onClick={() => setActiveTab('HELP')} icon={<HelpCircle size={20} />} label="Aide" theme={theme} />
             </div>
        </div>

        {/* MODALS */}
        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Identité Visuelle du Studio">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Logo de l'Agence (Carré)</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {agency.logoUrl ? <img src={agency.logoUrl} className="w-full h-full object-contain" /> : <Landmark className="text-slate-300" size={32}/>}
                        </div>
                        <label className="flex-1 flex flex-col items-center justify-center h-20 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex flex-col items-center justify-center">
                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Changer le Logo</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                    </div>
                </div>

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
                            <p className="text-sm text-slate-500">Cliquez pour changer la bannière</p>
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
                        <br/><br/>
                        <strong>Attention :</strong> Si votre VE tombe à 0, c'est grave, mais la vraie mort est financière : <strong>-5000 PiXi = FAILLITE</strong>.
                    </p>
                </div>
            </div>
        </Modal>

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

        {notificationEvent && (
            <Modal isOpen={!!notificationEvent} onClose={closeNotification} title={notificationEvent.type === 'CRISIS' ? "ALERTE PRIORITAIRE" : "NOUVELLE IMPORTANTE"}>
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className={`p-6 rounded-full mb-2 border-4 ${
                        notificationEvent.type === 'CRISIS' || (notificationEvent.deltaVE || 0) < 0
                        ? 'bg-red-50 border-red-100 text-red-600 animate-pulse'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}>
                        {notificationEvent.type === 'CRISIS' || (notificationEvent.deltaVE || 0) < 0
                            ? <AlertTriangle size={48} strokeWidth={2.5}/>
                            : (notificationEvent.deltaVE || 0) > 5 ? <PartyPopper size={48} strokeWidth={2.5}/> : <Zap size={48} strokeWidth={2.5}/>
                        }
                    </div>

                    <div>
                        <h3 className={`text-2xl font-black uppercase mb-2 ${
                            notificationEvent.type === 'CRISIS' || (notificationEvent.deltaVE || 0) < 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                            {notificationEvent.label}
                        </h3>
                        <p className="text-slate-600 text-lg leading-relaxed font-medium">
                            {notificationEvent.description}
                        </p>
                    </div>

                    <button 
                        onClick={closeNotification}
                        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${
                            notificationEvent.type === 'CRISIS' || (notificationEvent.deltaVE || 0) < 0
                            ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                        }`}
                    >
                        {notificationEvent.type === 'CRISIS' ? "J'AI PRIS CONNAISSANCE" : "GÉNIAL !"}
                    </button>
                </div>
            </Modal>
        )}
    </div>
  );
};

// --- VOTING BOOTHS & COMPONENTS ---
const VotingBooth: React.FC<{agency: Agency, currentUser: Student, onVote: any}> = ({agency, currentUser, onVote}) => {
    const pendingVote = agency.mercatoRequests.find(req => {
        if (req.status !== 'PENDING') return false;
        if (req.votes && req.votes[currentUser.id]) return false;
        if (req.type === 'FIRE' && req.studentId === currentUser.id) return false;
        return true;
    });

    if (!pendingVote) return null;
    const isHire = pendingVote.type === 'HIRE';

    return (
        <Modal isOpen={true} onClose={() => {}} title="Session de Vote en cours">
            <div className="space-y-6">
                <div className={`p-4 rounded-xl border-l-4 ${isHire ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                    <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        {isHire ? <Users size={20}/> : <Gavel size={20}/>}
                        {isHire ? "Proposition de Recrutement" : "Proposition de Départ"}
                    </h4>
                    <p className="text-sm">Votre avis est requis pour valider cette décision d'agence.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Candidat / Cible</p>
                    <p className="text-xl font-bold text-slate-900">{pendingVote.studentName}</p>
                    
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Motivation / Motif</p>
                        <p className="text-sm italic text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            "{pendingVote.motivation || 'Aucun motif fourni.'}"
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => onVote(agency.id, pendingVote.id, currentUser.id, 'REJECT')}
                        className="py-4 bg-white border-2 border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl transition-all flex flex-col items-center gap-1"
                    >
                        <X size={24}/>
                        NON (Refuser)
                    </button>
                    <button 
                        onClick={() => onVote(agency.id, pendingVote.id, currentUser.id, 'APPROVE')}
                        className="py-4 bg-slate-900 text-white hover:bg-emerald-600 font-bold rounded-xl transition-all flex flex-col items-center gap-1 shadow-lg"
                    >
                        <Check size={24}/>
                        OUI (Accepter)
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ChallengeVotingBooth: React.FC<{agency: Agency, currentUser: Student, onVote: any}> = ({agency, currentUser, onVote}) => {
    const pendingChallenge = agency.challenges?.find(c => c.status === 'PENDING_VOTE' && (!c.votes || !c.votes[currentUser.id]));
    if (!pendingChallenge) return null;

    return (
        <Modal isOpen={true} onClose={() => {}} title="⚠️ DÉFI SPÉCIAL DÉTECTÉ">
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Rocket className="text-yellow-400 animate-pulse"/>
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Opportunité IA</span>
                        </div>
                        <h3 className="text-2xl font-black mb-4 leading-tight">{pendingChallenge.title}</h3>
                        <p className="text-sm text-indigo-100 leading-relaxed bg-white/10 p-4 rounded-xl border border-white/10">
                            {pendingChallenge.description}
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-slate-600 mb-4">
                        Si l'équipe accepte ce défi (Majorité &gt; {GAME_RULES.VOTE_THRESHOLD_CHALLENGE * 100}%), une <strong>mission spéciale</strong> sera ajoutée.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => onVote(agency.id, pendingChallenge.id, currentUser.id, 'REJECT')}
                            className="py-4 bg-white border-2 border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 font-bold rounded-xl transition-all"
                        >
                            Refuser
                        </button>
                        <button 
                            onClick={() => onVote(agency.id, pendingChallenge.id, currentUser.id, 'APPROVE')}
                            className="py-4 bg-emerald-600 text-white hover:bg-emerald-500 font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
                        >
                            Accepter le Défi
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const NavButton: React.FC<any> = ({ active, onClick, icon, label, theme }) => (
    <button onClick={onClick} className={`snap-start flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-4 rounded-xl transition-all min-w-[70px] md:min-w-[150px] justify-center md:justify-start ${active ? `${theme.bg} text-white transform scale-105 shadow-md` : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}>
        <div className={`p-1.5 rounded-full ${active ? 'bg-white/20' : ''}`}>{React.cloneElement(icon, { className: active ? 'text-white' : '' })}</div>
        <span className={`text-[10px] md:text-base font-bold`}>{label}</span>
    </button>
);
