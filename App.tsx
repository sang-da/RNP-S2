
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
import { LandingPage } from './components/LandingPage';
import { WaitingScreen } from './components/WaitingScreen';
import { GameProvider, useGame } from './contexts/GameContext';
import { UIProvider } from './contexts/UIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Menu } from 'lucide-react';
import { signOut, auth } from './services/firebase';

type AdminViewType = 'OVERVIEW' | 'MERCATO' | 'PROJECTS' | 'CRISIS' | 'SCHEDULE' | 'ACCESS';

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

    if (isRightSwipe && !isSidebarOpen) {
        setIsSidebarOpen(true);
    }
    if (isLeftSwipe && isSidebarOpen) {
        setIsSidebarOpen(false);
    }
    // Reset
    touchStart.current = 0;
    touchEnd.current = 0;
  };

  // 1. LOADING STATE
  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
      );
  }

  // 2. NOT LOGGED IN -> LANDING PAGE
  if (!currentUser) {
      return <LandingPage />;
  }

  // 3. WAITING ROOM (Logged in but no role/agency)
  // If role is pending OR (role is student but no agency assigned yet)
  // Note: We need to check if user is actually mapped to an agency in the `agencies` list or `userData`
  // For now, we rely on userData.role. Admin sets role to 'student' ONLY when assigned.
  if (userData?.role === 'pending') {
      return <WaitingScreen />;
  }

  // ------------------------------------------------------------------
  // ADMIN RENDER LOGIC
  // ------------------------------------------------------------------
  if (userData?.role === 'admin') {
      // Admin Drill-down
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
                {adminView === 'ACCESS' && (
                    <AdminAccess 
                        agencies={agencies} 
                        onUpdateAgencies={updateAgenciesList}
                    />
                )}
                {adminView === 'SCHEDULE' && (
                    <AdminSchedule 
                        weeksData={weeks} 
                        onUpdateWeek={updateWeek}
                    />
                )}
                {adminView === 'MERCATO' && (
                    <AdminMercato 
                        agencies={agencies} 
                        onUpdateAgencies={updateAgenciesList} 
                    />
                )}
                {adminView === 'PROJECTS' && (
                    <AdminProjects 
                        agencies={agencies}
                        onUpdateAgency={updateAgency}
                    />
                )}
                {adminView === 'CRISIS' && (
                    <AdminCrisis 
                        agencies={agencies} 
                        onUpdateAgency={updateAgency} 
                    />
                )}
            </div>
          </>
      );
  }

  // ------------------------------------------------------------------
  // STUDENT RENDER LOGIC
  // ------------------------------------------------------------------
  // Find the agency where the student is a member
  // We match by name or by ID if we stored it in userData.
  // Ideally, AdminAccess updates userData.agencyId in Firestore.
  // Fallback: search in agencies members list by name/email comparison could be brittle, 
  // so we rely on userData.agencyId if set, or just show Waiting Screen if not found.
  
  // NOTE: In the current mock data structure, students are objects inside Agency.members array.
  // The AdminAccess component in this app assigns connectionStatus. 
  // For this integration, we should assume the Admin has mapped the UID to the student in the agency.
  
  // Simple matching for now:
  const myAgency = agencies.find(a => a.members.some(m => m.id === userData?.uid)) || 
                   agencies.find(a => a.id === userData?.agencyId);

  if (userData?.role === 'student' && myAgency) {
      return (
        <Layout role="student" switchRole={() => { /* No-op for students */ }}>
          <StudentAgencyView agency={myAgency} allAgencies={agencies} onUpdateAgency={updateAgency} />
        </Layout>
      );
  }

  // Fallback if role is student but agency not found
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
