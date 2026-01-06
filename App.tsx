
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
import { Menu, EyeOff, ChevronRight, Home, Eye } from 'lucide-react';
import { signOut, auth } from './services/firebase';
import { NewsTicker } from './components/NewsTicker';

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
  // ADMIN & SUPERVISOR RENDER LOGIC
  // ------------------------------------------------------------------
  if (userData?.role === 'admin' || userData?.role === 'supervisor') {
      
      const isReadOnly = userData.role === 'supervisor';

      // --- SIMULATION MODE ---
      if (simulationMode !== 'NONE') {
          return (
              <div className="flex flex-col min-h-screen bg-slate-50">
                  {/* SIMULATION HEADER BAR - High Z-Index to stay on top */}
                  <div className="bg-red-600 text-white px-4 py-3 shadow-md z-[100] flex justify-between items-center sticky top-0">
                      <div className="flex items-center gap-2">
                          <EyeOff size={20}/>
                          <span className="font-bold text-sm uppercase tracking-wide">Mode Simulation Étudiant</span>
                      </div>
                      <button 
                        onClick={() => { setSimulationMode('NONE'); setSimulatedAgencyId(null); }}
                        className="bg-white text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-lg font-bold text-xs uppercase transition-colors shadow-sm"
                      >
                          Quitter
                      </button>
                  </div>

                  <div className="flex-1 relative">
                    {simulationMode === 'WAITING' ? (
                        <WaitingScreen />
                    ) : (
                        simulatedAgencyId && (
                            <Layout role="student" switchRole={() => {}}>
                                <StudentAgencyView 
                                    agency={agencies.find(a => a.id === simulatedAgencyId) || agencies[0]} 
                                    allAgencies={agencies} 
                                    onUpdateAgency={updateAgency} // Still passed but might need protection inside if deep editing allowed
                                />
                            </Layout>
                        )
                    )}
                  </div>
              </div>
          );
      }

      // --- STANDARD ADMIN DASHBOARD ---
      // Drill-down specific agency from Dashboard list
      if (selectedAgencyId) {
        const agency = agencies.find(a => a.id === selectedAgencyId);
        if (!agency) return <div>Agence introuvable</div>;
        return (
            <div className="md:ml-64 bg-slate-50 min-h-screen flex flex-col">
                 <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center gap-2 shadow-sm">
                    <button onClick={() => selectAgency(null)} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-sm font-medium transition-colors">
                        <Home size={16}/> Dashboard
                    </button>
                    <ChevronRight size={14} className="text-slate-300"/>
                    <span className="text-slate-400 text-sm font-medium">Agences</span>
                    <ChevronRight size={14} className="text-slate-300"/>
                    <span className="text-indigo-700 text-sm font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{agency.name}</span>
                 </div>
                 
                 <div className="p-4 md:p-8">
                     <StudentAgencyView agency={agency} allAgencies={agencies} onUpdateAgency={isReadOnly ? () => {} : updateAgency} />
                 </div>
            </div>
        );
      }

      return (
          <>
            <AdminSidebar 
                activeView={adminView} 
                onNavigate={(view) => setAdminView(view as AdminViewType)}
                onLogout={() => signOut(auth)}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div 
                className="md:ml-64 min-h-screen bg-slate-50/50 flex flex-col"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <NewsTicker />
                
                {/* SUPERVISOR BANNER */}
                {isReadOnly && (
                    <div className="bg-purple-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-center shadow-sm z-40 flex items-center justify-center gap-2">
                        <Eye size={14}/> Mode Superviseur (Lecture Seule)
                    </div>
                )}

                <div className="p-4 md:p-8 pt-16 md:pt-8 flex-1">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden fixed top-14 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-700"
                    >
                        <Menu size={24} />
                    </button>

                    {adminView === 'OVERVIEW' && (
                        <AdminDashboard 
                            agencies={agencies} 
                            onSelectAgency={selectAgency}
                            onShuffleConstraints={shuffleConstraints}
                            onUpdateAgency={updateAgency}
                            onProcessWeek={() => {}}
                            onNavigate={(view: string) => setAdminView(view as AdminViewType)}
                            readOnly={isReadOnly}
                        />
                    )}
                    {adminView === 'ACCESS' && <AdminAccess agencies={agencies} onUpdateAgencies={updateAgenciesList} readOnly={isReadOnly} />}
                    {adminView === 'SCHEDULE' && <AdminSchedule weeksData={weeks} onUpdateWeek={updateWeek} readOnly={isReadOnly} />}
                    {adminView === 'MERCATO' && <AdminMercato agencies={agencies} onUpdateAgencies={updateAgenciesList} readOnly={isReadOnly} />}
                    {adminView === 'PROJECTS' && <AdminProjects agencies={agencies} onUpdateAgency={updateAgency} readOnly={isReadOnly} />}
                    {adminView === 'CRISIS' && <AdminCrisis agencies={agencies} onUpdateAgency={updateAgency} readOnly={isReadOnly} />}
                    
                    {/* NEW VIEWS */}
                    {adminView === 'RESOURCES' && <AdminResources agencies={agencies} readOnly={isReadOnly} />}
                    {adminView === 'SETTINGS' && <AdminSettings readOnly={isReadOnly} />}
                    {adminView === 'VIEWS' && (
                        <AdminViews 
                            agencies={agencies} 
                            onSimulateWaitingRoom={() => setSimulationMode('WAITING')}
                            onSimulateAgency={(id) => { setSimulatedAgencyId(id); setSimulationMode('AGENCY'); }}
                        />
                    )}
                </div>
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