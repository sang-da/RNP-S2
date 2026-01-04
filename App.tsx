
import React, { useState, useRef } from 'react';
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
import { LandingPage } from './components/LandingPage';
import { WaitingScreen } from './components/WaitingScreen';
import { GameProvider, useGame } from './contexts/GameContext';
import { UIProvider } from './contexts/UIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Menu, EyeOff } from 'lucide-react';
import { signOut, auth } from './services/firebase';

type AdminViewType = 'OVERVIEW' | 'MERCATO' | 'PROJECTS' | 'CRISIS' | 'SCHEDULE' | 'ACCESS' | 'RESOURCES' | 'SETTINGS' | 'VIEWS';

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
    processWeekFinance,
    shuffleConstraints
  } = useGame();

  const [adminView, setAdminView] = useState<AdminViewType>('OVERVIEW');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Simulation Mode State
  const [simulationMode, setSimulationMode] = useState<'NONE' | 'WAITING' | 'AGENCY'>('NONE');
  const [simulatedAgencyId, setSimulatedAgencyId] = useState<string | null>(null);

  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  // SWIPE LOGIC
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isRightSwipe && !isSidebarOpen) setIsSidebarOpen(true);
    if (isLeftSwipe && isSidebarOpen) setIsSidebarOpen(false);
    touchStart.current = 0; touchEnd.current = 0;
  };

  // 1. LOADING
  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
      );
  }

  // 2. LANDING
  if (!currentUser) {
      return <LandingPage />;
  }

  // 3. WAITING ROOM (Normal Student)
  if (userData?.role === 'pending') {
      return <WaitingScreen />;
  }

  // ------------------------------------------------------------------
  // ADMIN RENDER LOGIC
  // ------------------------------------------------------------------
  if (userData?.role === 'admin') {
      
      // --- SIMULATION MODE ---
      if (simulationMode !== 'NONE') {
          return (
              <div className="relative">
                  {/* Exit Simulation Floating Button */}
                  <div className="fixed top-4 right-4 z-50">
                      <button 
                        onClick={() => { setSimulationMode('NONE'); setSimulatedAgencyId(null); }}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold shadow-2xl shadow-red-600/40 flex items-center gap-2 animate-in slide-in-from-top-4"
                      >
                          <EyeOff size={20}/> Quitter la Simulation
                      </button>
                  </div>

                  {simulationMode === 'WAITING' ? (
                      <WaitingScreen />
                  ) : (
                      simulatedAgencyId && (
                          <Layout role="student" switchRole={() => {}}>
                              <StudentAgencyView 
                                agency={agencies.find(a => a.id === simulatedAgencyId) || agencies[0]} 
                                allAgencies={agencies} 
                                onUpdateAgency={updateAgency} 
                              />
                          </Layout>
                      )
                  )}
              </div>
          );
      }

      // --- STANDARD ADMIN DASHBOARD ---
      // Drill-down specific agency from Dashboard list
      if (selectedAgencyId) {
        const agency = agencies.find(a => a.id === selectedAgencyId);
        if (!agency) return <div>Agence introuvable</div>;
        return (
            <div className="md:ml-64 p-4 md:p-8">
                 <button 
                    onClick={() => selectAgency(null)}
                    className="mb-4 text-slate-400 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold transition-colors"
                 >
                    ← Retour à la liste
                 </button>
                 <StudentAgencyView agency={agency} allAgencies={agencies} onUpdateAgency={updateAgency} />
            </div>
        );
      }

      return (
          <>
            <AdminSidebar 
                activeView={adminView} 
                onNavigate={setAdminView} 
                onLogout={() => signOut(auth)}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div 
                className="md:ml-64 p-4 md:p-8 min-h-screen bg-slate-50/50 pt-16 md:pt-8"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-700"
                >
                    <Menu size={24} />
                </button>

                {adminView === 'OVERVIEW' && (
                    <AdminDashboard 
                        agencies={agencies} 
                        onSelectAgency={selectAgency}
                        onShuffleConstraints={shuffleConstraints}
                        onUpdateAgency={updateAgency}
                        onProcessWeek={processWeekFinance}
                    />
                )}
                {adminView === 'ACCESS' && <AdminAccess agencies={agencies} onUpdateAgencies={updateAgenciesList} />}
                {adminView === 'SCHEDULE' && <AdminSchedule weeksData={weeks} onUpdateWeek={updateWeek} />}
                {adminView === 'MERCATO' && <AdminMercato agencies={agencies} onUpdateAgencies={updateAgenciesList} />}
                {adminView === 'PROJECTS' && <AdminProjects agencies={agencies} onUpdateAgency={updateAgency} />}
                {adminView === 'CRISIS' && <AdminCrisis agencies={agencies} onUpdateAgency={updateAgency} />}
                
                {/* NEW VIEWS */}
                {adminView === 'RESOURCES' && <AdminResources agencies={agencies} />}
                {adminView === 'SETTINGS' && <AdminSettings />}
                {adminView === 'VIEWS' && (
                    <AdminViews 
                        agencies={agencies} 
                        onSimulateWaitingRoom={() => setSimulationMode('WAITING')}
                        onSimulateAgency={(id) => { setSimulatedAgencyId(id); setSimulationMode('AGENCY'); }}
                    />
                )}
            </div>
          </>
      );
  }

  // ------------------------------------------------------------------
  // STUDENT RENDER LOGIC
  // ------------------------------------------------------------------
  const myAgency = agencies.find(a => a.members.some(m => m.id === userData?.uid)) || 
                   agencies.find(a => a.id === userData?.agencyId);

  if (userData?.role === 'student' && myAgency) {
      return (
        <Layout role="student" switchRole={() => {}}>
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
