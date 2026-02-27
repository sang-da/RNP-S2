
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentAgencyView } from './components/StudentAgencyView';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminMercato } from './components/AdminMercato';
import { AdminProjects } from './components/AdminProjects';
import { AdminCrisis } from './components/AdminCrisis';
import { AdminSchedule } from './components/AdminSchedule';
import { AdminAccess } from './components/AdminAccess';
import { AdminResources } from './components/AdminResources';
import { AdminSettings } from './components/AdminSettings';
import { AdminViews } from './components/AdminViews';
import { AdminAIAssistant } from './components/AdminAIAssistant';
import { AdminMarket } from './components/AdminMarket';
import { AdminAnalytics } from './components/AdminAnalytics';
import { AdminPeerReviews } from './components/admin/AdminPeerReviews';
import { AdminBank } from './components/AdminBank'; 
import { AdminBlackMarket } from './components/AdminBlackMarket';
import { AdminStudentTracker } from './components/AdminStudentTracker'; 
import { AdminBadges } from './components/AdminBadges'; 
import { LandingPage } from './components/LandingPage';
import { WaitingScreen } from './components/WaitingScreen';
import { TheBackdoor } from './components/student/TheBackdoor'; 
import { StudentSpecialSimulation } from './components/admin/StudentSpecialSimulation';
import { GameProvider, useGame } from './contexts/GameContext';
import { UIProvider } from './contexts/UIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Menu, EyeOff, ChevronRight, Home, Eye, Unplug, RefreshCw, LogOut, Terminal } from 'lucide-react';
import { signOut, auth } from './services/firebase';
import { NewsTicker } from './components/NewsTicker';

// NOTE: Le type AdminViewType doit correspondre aux IDs dans adminMenu.ts
type AdminViewType = 'OVERVIEW' | 'ANALYTICS' | 'BANK' | 'PEER_REVIEWS' | 'MARKET' | 'MERCATO' | 'PROJECTS' | 'CRISIS' | 'SCHEDULE' | 'ACCESS' | 'RESOURCES' | 'SETTINGS' | 'VIEWS' | 'AI_ASSISTANT' | 'BLACK_MARKET' | 'STUDENT_TRACKER' | 'BADGES';

const GameContainer: React.FC = () => {
  const { currentUser, userData, loading } = useAuth();
  const { 
    agencies, 
    selectedAgencyId, 
    selectAgency, 
    updateAgency,
    weeks,
    updateWeek,
    updateAgenciesList,
    shuffleConstraints,
    gameConfig // Config pour les permissions
  } = useGame();

  const [adminView, setAdminView] = useState<AdminViewType>('OVERVIEW');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [simulationMode, setSimulationMode] = useState<'NONE' | 'WAITING' | 'AGENCY' | 'BACKDOOR' | 'STUDENT_SPECIAL'>('NONE');
  const [simulatedAgencyId, setSimulatedAgencyId] = useState<string | null>(null);

  // Redirection initiale pour les superviseurs (car OVERVIEW peut être caché)
  useEffect(() => {
    if (userData?.role === 'supervisor' && adminView === 'OVERVIEW') {
      // On cherche la première vue visible dans la config
      // Simplification : on redirige vers MARKET qui est souvent safe
      setAdminView('MARKET');
    }
  }, [userData]);

  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.targetTouches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEnd.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance < -50 && !isSidebarOpen) setIsSidebarOpen(true);
    if (distance > 50 && isSidebarOpen) setIsSidebarOpen(false);
    touchStart.current = 0; touchEnd.current = 0;
  };

  const handleLogout = async () => {
      await signOut(auth);
      window.location.reload();
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
      );
  }

  if (!currentUser) return <LandingPage />;

  // CAS 1 : ADMIN OU SUPERVISEUR
  if (userData?.role === 'admin' || userData?.role === 'supervisor') {
      const isSupervisor = userData.role === 'supervisor';
      
      // Determine effective ReadOnly status based on View Config
      // Par défaut ReadOnly si superviseur, sauf si la config dit "canWrite: true" pour cette vue
      const viewPermission = gameConfig.supervisorPermissions?.[adminView];
      const hasWriteAccess = !isSupervisor || (viewPermission?.canWrite === true);
      const isViewReadOnly = !hasWriteAccess;

      if (simulationMode !== 'NONE') {
          const exitSimulation = () => { setSimulationMode('NONE'); setSimulatedAgencyId(null); };

          return (
              <div className="flex flex-col min-h-screen bg-slate-50">
                  <div className="bg-red-600 text-white px-4 py-3 shadow-md z-[100] flex justify-between items-center sticky top-0">
                      <div className="flex items-center gap-2">
                        <EyeOff size={20}/>
                        <span className="font-bold text-sm uppercase tracking-wide">
                            {simulationMode === 'BACKDOOR' ? 'Aperçu Isolé : The Backdoor (22-04)' : 
                             simulationMode === 'STUDENT_SPECIAL' ? 'Simulateur d\'Interfaces Spéciales' :
                             'Mode Simulation Étudiant'}
                        </span>
                      </div>
                      <button onClick={exitSimulation} className="bg-white text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-lg font-bold text-xs uppercase transition-colors shadow-sm">Quitter</button>
                  </div>
                  <div className="flex-1 relative">
                    {simulationMode === 'WAITING' && <WaitingScreen />}
                    
                    {simulationMode === 'AGENCY' && simulatedAgencyId && (
                        <Layout role="student" switchRole={() => {}} onLogout={handleLogout}>
                            <StudentAgencyView agency={agencies.find(a => a.id === simulatedAgencyId) || agencies[0]} allAgencies={agencies} onUpdateAgency={updateAgency} />
                        </Layout>
                    )}

                    {simulationMode === 'BACKDOOR' && (
                        <div className="bg-black min-h-screen">
                             <TheBackdoor 
                                agency={agencies.find(a => a.id !== 'unassigned') || agencies[0]} 
                                allAgencies={agencies} 
                                currentUser={agencies.find(a => a.id !== 'unassigned')?.members[0] || agencies[0].members[0]} 
                                onClose={exitSimulation} 
                             />
                        </div>
                    )}

                    {simulationMode === 'STUDENT_SPECIAL' && (
                        <StudentSpecialSimulation 
                            onClose={exitSimulation}
                        />
                    )}
                  </div>
              </div>
          );
      }

      if (selectedAgencyId) {
        const agency = agencies.find(a => a.id === selectedAgencyId);
        if (!agency) return <div>Agence introuvable</div>;
        return (
            <div className="md:ml-64 bg-slate-50 min-h-screen flex flex-col">
                 <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center gap-2 shadow-sm">
                    <button onClick={() => selectAgency(null)} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-sm font-medium transition-colors"><Home size={16}/> Dashboard</button>
                    <ChevronRight size={14} className="text-slate-300"/><span className="text-slate-400 text-sm font-medium">Agences</span><ChevronRight size={14} className="text-slate-300"/><span className="text-indigo-700 text-sm font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{agency.name}</span>
                 </div>
                 <div className="p-4 md:p-8">
                    <StudentAgencyView agency={agency} allAgencies={agencies} onUpdateAgency={isViewReadOnly ? () => {} : updateAgency} />
                 </div>
            </div>
        );
      }

      return (
          <>
            <AdminSidebar 
              activeView={adminView} 
              onNavigate={(view) => setAdminView(view as AdminViewType)} 
              onLogout={handleLogout} 
              isOpen={isSidebarOpen} 
              onClose={() => setIsSidebarOpen(false)} 
              role={userData.role}
            />
            <div className="md:ml-64 min-h-screen bg-slate-50/50 flex flex-col" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <NewsTicker />
                {isSupervisor && (
                    <div className={`px-4 py-2 text-xs font-bold uppercase tracking-widest text-center shadow-sm z-40 flex items-center justify-center gap-2 ${hasWriteAccess ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'}`}>
                        {hasWriteAccess ? <EyeOff size={14}/> : <Eye size={14}/>} 
                        {hasWriteAccess ? 'Mode Superviseur (Écriture Autorisée)' : 'Mode Superviseur (Lecture Seule)'}
                    </div>
                )}
                <div className="p-4 md:p-8 pt-16 md:pt-8 flex-1">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden fixed top-14 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-700"><Menu size={24} /></button>
                    
                    {/* ROUTING DES VUES AVEC INJECTION DU STATUT READONLY */}
                    {adminView === 'MARKET' && <AdminMarket agencies={agencies} />}
                    {adminView === 'BANK' && <AdminBank agencies={agencies} />}
                    {adminView === 'STUDENT_TRACKER' && <AdminStudentTracker agencies={agencies} />}
                    {adminView === 'PEER_REVIEWS' && <AdminPeerReviews agencies={agencies} />}
                    {adminView === 'PROJECTS' && <AdminProjects agencies={agencies} onUpdateAgency={updateAgency} readOnly={isViewReadOnly} />}
                    {adminView === 'VIEWS' && (
                        <AdminViews 
                            agencies={agencies} 
                            onSimulateWaitingRoom={() => setSimulationMode('WAITING')} 
                            onSimulateAgency={(id) => { setSimulatedAgencyId(id); setSimulationMode('AGENCY'); }} 
                            onSimulateBackdoor={() => setSimulationMode('BACKDOOR')} 
                            onSimulateSpecial={() => setSimulationMode('STUDENT_SPECIAL')}
                        />
                    )}
                    {adminView === 'SETTINGS' && <AdminSettings readOnly={isViewReadOnly} />}
                    {adminView === 'BADGES' && <AdminBadges agencies={agencies} />}
                    {adminView === 'OVERVIEW' && <AdminDashboard agencies={agencies} onSelectAgency={selectAgency} onShuffleConstraints={shuffleConstraints} onUpdateAgency={updateAgency} onProcessWeek={() => {}} onNavigate={(view: string) => setAdminView(view as AdminViewType)} readOnly={isViewReadOnly} />}
                    {adminView === 'ANALYTICS' && <AdminAnalytics agencies={agencies} />}
                    {adminView === 'AI_ASSISTANT' && <AdminAIAssistant agencies={agencies} />}
                    {adminView === 'BLACK_MARKET' && <AdminBlackMarket />}
                    {adminView === 'ACCESS' && <AdminAccess agencies={agencies} onUpdateAgencies={updateAgenciesList} readOnly={isViewReadOnly} />}
                    {adminView === 'SCHEDULE' && <AdminSchedule weeksData={weeks} onUpdateWeek={updateWeek} readOnly={isViewReadOnly} />}
                    {adminView === 'MERCATO' && <AdminMercato agencies={agencies} onUpdateAgencies={updateAgenciesList} readOnly={isViewReadOnly} />}
                    {adminView === 'CRISIS' && <AdminCrisis agencies={agencies} onUpdateAgency={updateAgency} readOnly={isViewReadOnly} />}
                    {adminView === 'RESOURCES' && <AdminResources agencies={agencies} readOnly={isViewReadOnly} />}
                </div>
            </div>
          </>
      );
  }

  // CAS 2 : ÉTUDIANT SANS AGENCE (Bloqué)
  const myAgency = agencies.find(a => a.members.some(m => m.id === userData?.uid));
  
  if (userData?.role === 'student' && !myAgency) {
      return (
          <div className="min-screen bg-slate-900 flex items-center justify-center p-6 text-center text-white">
              <div className="max-w-md space-y-6">
                  <div className="flex justify-center"><div className="p-6 bg-red-500/20 rounded-full border-2 border-red-500/50 text-red-500 animate-pulse"><Unplug size={64}/></div></div>
                  <h2 className="text-3xl font-display font-bold">Session Incorrecte</h2>
                  <p className="text-slate-400 leading-relaxed">Votre compte est actuellement identifié comme <strong>Étudiant</strong> mais n'est lié à aucune agence active.</p>
                  <div className="space-y-3">
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                        <RefreshCw size={20}/> Réessayer
                    </button>
                    <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-700 transition-colors">
                        <LogOut size={20}/> Déconnexion Forcée (Sortir)
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Contactez l'administrateur pour réinitialiser votre rôle.</p>
              </div>
          </div>
      );
  }

  // CAS 3 : ÉTUDIANT VALIDE
  if (userData?.role === 'student' && myAgency) {
      return (
        <Layout role="student" switchRole={() => {}} onLogout={handleLogout}>
          <NewsTicker />
          <StudentAgencyView agency={myAgency} allAgencies={agencies} onUpdateAgency={updateAgency} />
        </Layout>
      );
  }

  return <WaitingScreen />;
};

const App: React.FC = () => {
  return (
    <UIProvider>
        <AuthProvider>
            <GameProvider>
                <GameContainer />
            </GameProvider>
        </AuthProvider>
    </UIProvider>
  );
};

export default App;
