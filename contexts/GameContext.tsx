
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Agency, WeekModule, WikiResource, TransactionRequest, MercatoRequest, MergerRequest, ChallengeRequest, Deliverable } from '../types';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { doc, updateDoc, writeBatch, setDoc, deleteDoc, db } from '../services/firebase';

// IMPORT SUB-HOOKS
import { useGameSync } from './game/useGameSync';
import { useFinanceLogic } from './game/useFinanceLogic';
import { useGameMechanics } from './game/useGameMechanics';

interface GameContextType {
  // State
  agencies: Agency[];
  weeks: { [key: string]: WeekModule };
  resources: WikiResource[];
  role: 'admin' | 'student';
  selectedAgencyId: string | null;
  isAutoMode: boolean;
  
  // Actions
  setRole: (role: 'admin' | 'student') => void;
  selectAgency: (id: string | null) => void;
  toggleAutoMode: () => void;
  updateAgency: (agency: Agency) => void;
  updateAgenciesList: (agencies: Agency[]) => void;
  deleteAgency: (agencyId: string) => Promise<void>;
  updateWeek: (weekId: string, week: WeekModule) => void;
  
  // Wiki Actions
  addResource: (resource: WikiResource) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;

  // Game Logic
  shuffleConstraints: (agencyId: string) => void;
  processFinance: (targetClass: 'A' | 'B') => Promise<void>;
  processPerformance: (targetClass: 'A' | 'B') => Promise<void>;
  resetGame: () => void;
  
  // Student Economy & RH
  transferFunds: (sourceId: string, targetId: string, amount: number) => Promise<void>;
  tradeScoreForCash: (studentId: string, scoreAmount: number) => Promise<void>;
  injectCapital: (studentId: string, agencyId: string, amount: number) => Promise<void>;
  requestScorePurchase: (studentId: string, agencyId: string, amountPixi: number, amountScore: number) => Promise<void>;
  handleTransactionRequest: (agency: Agency, request: TransactionRequest, approved: boolean) => Promise<void>;
  submitMercatoVote: (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => Promise<void>;

  // Black Ops & Mergers & Challenges
  triggerBlackOp: (sourceAgencyId: string, targetAgencyId: string, type: 'AUDIT' | 'LEAK') => Promise<void>;
  proposeMerger: (sourceAgencyId: string, targetAgencyId: string) => Promise<void>;
  finalizeMerger: (mergerId: string, targetAgencyId: string, approved: boolean) => Promise<void>;
  
  sendChallenge: (targetAgencyId: string, title: string, description: string) => Promise<void>;
  submitChallengeVote: (agencyId: string, challengeId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => Promise<void>;

  getCurrentGameWeek: () => number;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useUI();
  const { userData } = useAuth();
  
  // MAIN STATE
  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // 1. SYNC HOOK (Data Layer)
  const { agencies, weeks, resources, seedDatabase, setAgencies } = useGameSync(toast);

  // HELPER
  const getCurrentGameWeek = () => {
      const unlockedWeeks = (Object.values(weeks) as WeekModule[]).filter(w => !w.locked).map(w => parseInt(w.id));
      return unlockedWeeks.length > 0 ? Math.max(...unlockedWeeks) : 1;
  };

  // 2. LOGIC HOOKS
  const finance = useFinanceLogic(agencies, toast);
  const mechanics = useGameMechanics(agencies, toast, getCurrentGameWeek);

  // Sync Role with Auth
  useEffect(() => {
    if (userData) {
      if (userData.role === 'admin') setRole('admin');
      else setRole('student');
    }
  }, [userData]);

  // AUTO MODE SCHEDULER
  useEffect(() => {
      if (!isAutoMode) return;
      const checkSchedule = () => {
          const now = new Date();
          const today = now.toISOString().split('T')[0];
          console.log(`Auto Check: ${today}`);
      };
      const interval = setInterval(checkSchedule, 60000); 
      return () => clearInterval(interval);
  }, [isAutoMode, weeks]);

  // --- GENERIC ACTIONS (CRUD) ---
  
  const updateAgenciesList = async (newAgencies: Agency[]) => {
      try {
        const batch = writeBatch(db);
        newAgencies.forEach(a => {
            const ref = doc(db, "agencies", a.id);
            batch.set(ref, a, { merge: true });
        });
        await batch.commit();
      } catch(e) {
         console.error(e);
         toast('error', 'Erreur mise à jour multiple');
      }
  };

  const deleteAgency = async (agencyId: string) => {
      try {
          const agencyToDelete = agencies.find(a => a.id === agencyId);
          if (!agencyToDelete) return;

          const batch = writeBatch(db);

          if (agencyToDelete.members && agencyToDelete.members.length > 0) {
              const unassignedRef = doc(db, "agencies", "unassigned");
              const unassignedAgency = agencies.find(a => a.id === 'unassigned');
              if (unassignedAgency) {
                  const updatedMembers = [...(unassignedAgency.members || []), ...agencyToDelete.members];
                  batch.update(unassignedRef, { members: updatedMembers });
              }
          }

          const agencyRef = doc(db, "agencies", agencyId);
          batch.delete(agencyRef);

          await batch.commit();
          toast('success', `Agence supprimée. Membres transférés au vivier.`);
      } catch (e) {
          console.error(e);
          toast('error', "Erreur lors de la suppression");
      }
  };

  const updateWeek = async (weekId: string, updatedWeek: WeekModule) => {
    try {
        const weekRef = doc(db, "weeks", weekId);
        await updateDoc(weekRef, { ...updatedWeek });
        toast('success', `Semaine ${weekId} mise à jour`);
    } catch (e) {
        console.error(e);
        toast('error', 'Erreur maj semaine');
    }
  };

  const addResource = async (resource: WikiResource) => {
      await setDoc(doc(db, "resources", resource.id), resource);
      toast('success', "Ressource ajoutée");
  };

  const deleteResource = async (id: string) => {
      await deleteDoc(doc(db, "resources", id));
      toast('success', "Ressource supprimée");
  };

  const selectAgency = (id: string | null) => setSelectedAgencyId(id);
  const toggleAutoMode = () => setIsAutoMode(!isAutoMode);

  const resetGame = async () => {
      try { await seedDatabase(); } catch (e) { console.error(e); }
  };

  const tradeScoreForCash = async (studentId: string, scoreAmount: number) => { /* Impl future */ };

  return (
    <GameContext.Provider value={{
      agencies, weeks, resources, role, selectedAgencyId, isAutoMode,
      setRole, selectAgency, toggleAutoMode, updateAgency: mechanics.updateAgency, updateAgenciesList, deleteAgency, updateWeek,
      addResource, deleteResource, shuffleConstraints: mechanics.shuffleConstraints, 
      processFinance: finance.processFinance, 
      processPerformance: mechanics.processPerformance, 
      resetGame,
      transferFunds: finance.transferFunds, 
      tradeScoreForCash, 
      injectCapital: finance.injectCapital, 
      requestScorePurchase: finance.requestScorePurchase, 
      handleTransactionRequest: finance.handleTransactionRequest,
      submitMercatoVote: mechanics.submitMercatoVote, 
      triggerBlackOp: mechanics.triggerBlackOp, 
      proposeMerger: mechanics.proposeMerger, 
      finalizeMerger: mechanics.finalizeMerger, 
      getCurrentGameWeek,
      sendChallenge: mechanics.sendChallenge, 
      submitChallengeVote: mechanics.submitChallengeVote
    }}>
      {children}
    </GameContext.Provider>
  );
};
