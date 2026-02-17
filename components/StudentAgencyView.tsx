
import React, { useState, useEffect } from 'react';
import { Agency, BrandColor, GameEvent } from '../types';
import { Eye, AlertTriangle, PartyPopper, Zap } from 'lucide-react';
import { MarketOverview } from './student/MarketOverview';
import { MissionsView } from './student/MissionsView';
import { TeamView } from './student/TeamView';
import { MercatoView } from './student/MercatoView';
import { WikiView } from './student/WikiView';
import { FAQView } from './student/FAQView';
import { TheBackdoor } from './student/TheBackdoor';
import { Modal } from './Modal';
import { GAME_RULES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

// IMPORT SUB-COMPONENTS
import { AgencyHeader } from './student/layout/AgencyHeader';
import { AgencyNav } from './student/layout/AgencyNav';
import { BackdoorTrigger } from './student/features/BackdoorTrigger';
import { VotingSystem } from './student/features/VotingSystem';
import { AgencySettingsModal } from './student/modals/AgencySettingsModal';

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

export const StudentAgencyView: React.FC<StudentViewProps> = ({ agency, allAgencies, onUpdateAgency }) => {
  const { currentUser } = useAuth();
  const { getCurrentGameWeek, updateAgenciesList, submitMercatoVote, submitChallengeVote } = useGame();
  
  // Si l'étudiant est "unassigned", on démarre sur RECRUITMENT, sinon MARKET
  const [activeTab, setActiveTab] = useState<TabType>(agency.id === 'unassigned' ? 'RECRUITMENT' : 'MARKET');
  const [showVERules, setShowVERules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBackdoor, setShowBackdoor] = useState(false);
  
  const [unlockModal, setUnlockModal] = useState<{title: string, message: string, icon: any, confirmText: string} | null>(null);
  const [notificationEvent, setNotificationEvent] = useState<GameEvent | null>(null);

  const brandColor = agency.branding?.color || 'indigo';
  const theme = COLOR_THEMES[brandColor];
  const leaderboard = [...allAgencies].filter(a => a.id !== 'unassigned').sort((a, b) => b.ve_current - a.ve_current);
  const myRank = leaderboard.findIndex(a => a.id === agency.id) + 1;
  const myMemberProfile = agency.members.find(m => m.id === currentUser?.uid);

  // --- UNLOCKS & NOTIFICATIONS LOGIC ---
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

  if (showBackdoor && myMemberProfile) {
      return <TheBackdoor agency={agency} allAgencies={allAgencies} currentUser={myMemberProfile} onClose={() => setShowBackdoor(false)} />;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] font-sans relative">
        
        {/* BACKDOOR TRIGGER */}
        <BackdoorTrigger onTrigger={() => setShowBackdoor(true)} />

        {/* HEADER */}
        <AgencyHeader 
            agency={agency}
            myRank={myRank}
            theme={theme}
            myMemberProfile={myMemberProfile}
            onOpenSettings={() => setShowSettings(true)}
            onOpenVERules={() => setShowVERules(true)}
        />

        {/* VOTING BOOTHS */}
        {myMemberProfile && (
            <VotingSystem 
                agency={agency}
                currentUser={myMemberProfile}
                onVoteMercato={submitMercatoVote}
                onVoteChallenge={submitChallengeVote}
            />
        )}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 mb-24 md:mb-8">
            {/* Market désormais accessible à tous (pour voir le graphe) */}
            {activeTab === 'MARKET' && (
                <MarketOverview 
                    agency={agency} 
                    allAgencies={allAgencies} 
                    currentUser={myMemberProfile} 
                    onUpdateAgency={onUpdateAgency}
                />
            )}
            
            {activeTab === 'MISSIONS' && agency.id !== 'unassigned' && <MissionsView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {activeTab === 'TEAM' && agency.id !== 'unassigned' && <TeamView agency={agency} onUpdateAgency={onUpdateAgency} />}
            
            {/* Mercato accessible à tous (pour recruter ou postuler) */}
            {activeTab === 'RECRUITMENT' && (
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
        <AgencyNav 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            agency={agency}
            theme={theme}
        />

        {/* SETTINGS MODAL */}
        <AgencySettingsModal 
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            agency={agency}
            onUpdateAgency={onUpdateAgency}
        />
        
        {/* HELP MODALS */}
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
