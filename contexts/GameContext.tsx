import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Agency, WeekModule, WikiResource, TransactionRequest, MercatoRequest, MergerRequest, ChallengeRequest, Deliverable, GameConfig } from '../types';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { doc, updateDoc, writeBatch, setDoc, deleteDoc, db, onSnapshot, getDoc } from '../services/firebase';

// IMPORT SUB-HOOKS
import { useGameSync } from './game/useGameSync';
import { useFinanceLogic } from './game/useFinanceLogic';
import { useGameMechanics } from './game/useGameMechanics';

interface GameContextType {
  agencies: Agency[];
  weeks: { [key: string]: WeekModule };
  resources: WikiResource[];
  gameConfig: GameConfig;
  role: 'admin' | 'student';
  selectedAgencyId: string | null;
  
  setRole: (role: 'admin' | 'student') => void;
  selectAgency: (id: string | null) => void;
  updateAgency: (agency: Agency) => void;
  updateAgenciesList: (agencies: Agency[]) => void;
  deleteAgency: (agencyId: string) => Promise<void>;
  updateWeek: (weekId: string, week: WeekModule) => void;
  updateGameConfig: (config: Partial<GameConfig>) => Promise<void>;
  
  addResource: (resource: WikiResource) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;

  shuffleConstraints: (agencyId: string) => void;
  processFinance: (targetClass: 'A' | 'B' | 'ALL') => Promise<void>;
  processPerformance: (targetClass: 'A' | 'B' | 'ALL') => Promise<void>;
  resetGame: () => void;
  
  transferFunds: (sourceId: string, targetId: string, amount: number) => Promise<void>;
  tradeScoreForCash: (studentId: string, scoreAmount: number) => Promise<void>;
  injectCapital: (studentId: string, agencyId: string, amount: number) => Promise<void>;
  requestScorePurchase: (studentId: string, agencyId: string, amountPixi: number, amountScore: number) => Promise<void>;
  handleTransactionRequest: (agency: Agency, request: TransactionRequest, approved: boolean) => Promise<void>;
  submitMercatoVote: (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => Promise<void>;

  triggerBlackOp: (sourceAgencyId: string, targetAgencyId: string, type: 'AUDIT' | 'LEAK') => Promise<void>;
  performBlackOp: (studentId: string, agencyId: string, opType: 'SHORT_SELL' | 'DOXXING' | 'FAKE_CERT' | 'BUY_VOTE' | 'AUDIT_HOSTILE', payload: any) => Promise<void>;
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

const DEFAULT_CONFIG: GameConfig = {
    id: 'global',
    currentCycle: 1,
    autoPilot: true,
    lastFinanceRun: null,
    lastPerformanceRun: null
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useUI();
  const { userData } = useAuth();
  
  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  
  // FIX: Explicitly define selectAgency to satisfy the GameContext interface and use the state setter
  const selectAgency = (id: string | null) => setSelectedAgencyId(id);

  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  const { agencies, weeks, resources, seedDatabase } = useGameSync(toast);
  const finance = useFinanceLogic(agencies, toast);
  const getCurrentGameWeek = useCallback(() => {
      const unlockedWeeks = (Object.values(weeks) as WeekModule[]).filter(w => !w.locked).map(w => parseInt(w.id));
      return unlockedWeeks.length > 0 ? Math.max(...unlockedWeeks) : 1;
  }, [weeks]);
  
  const mechanics = useGameMechanics(agencies, toast, getCurrentGameWeek);

  // 0. SYNC CONFIG
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "game_state"), (snap) => {
        if (snap.exists()) setGameConfig(snap.data() as GameConfig);
        else setDoc(doc(db, "config", "game_state"), DEFAULT_CONFIG);
    });
    return unsub;
  }, []);

  // 1. AUTO-PILOT SCHEDULER
  useEffect(() => {
    if (!gameConfig.autoPilot || role !== 'admin') return;

    const checkAutomation = async () => {
        const now = new Date();
        const day = now.getDay(); // 0=Sun, 1=Mon, 5=Fri
        const hour = now.getHours();
        
        // Calculer l'identifiant de semaine unique (Année-SemaineISO)
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        const weekKey = `${now.getFullYear()}-${weekNo}`;

        // LUNDI : FINANCE (Salaires/Loyers)
        if (day === 1 && gameConfig.lastFinanceRun !== weekKey) {
            console.log(`[AUTO-PILOT] Déclenchement Finance Lundi : ${weekKey}`);
            await finance.processFinance('ALL' as any);
            await updateGameConfig({ lastFinanceRun: weekKey });
            toast('info', 'IA : Traitement financier hebdomadaire effectué (Salaires).');
        }

        // VENDREDI SOIR (dès 18h) : PERFORMANCE (Bilan)
        if (day === 5 && hour >= 18 && gameConfig.lastPerformanceRun !== weekKey) {
            console.log(`[AUTO-PILOT] Déclenchement Performance Vendredi : ${weekKey}`);
            await mechanics.processPerformance('ALL' as any);
            await updateGameConfig({ lastPerformanceRun: weekKey });
            toast('info', 'IA : Bilan de performance de fin de semaine effectué.');
        }
    };

    const interval = setInterval(checkAutomation, 60000); // Vérifier toutes les minutes
    checkAutomation(); // Check direct au login
    return () => clearInterval(interval);
  }, [gameConfig, role, finance, mechanics]);

  // --- ACTIONS ---
  const updateGameConfig = async (newConfig: Partial<GameConfig>) => {
      try {
          const ref = doc(db, "config", "game_state");
          await updateDoc(ref, newConfig);
      } catch (e) {
          toast('error', "Erreur config globale");
      }
  };

  const updateAgenciesList = async (newAgencies: Agency[]) => {
      try {
        const batch = writeBatch(db);
        newAgencies.forEach(a => {
            const ref = doc(db, "agencies", a.id);
            batch.set(ref, a, { merge: true });
        });
        await batch.commit();
      } catch(e) { console.error(e); toast('error', 'Erreur mise à jour multiple'); }
  };

  const deleteAgency = async (agencyId: string) => {
      try {
          const agencyToDelete = agencies.find(a => a.id === agencyId);
          if (!agencyToDelete) return;
          const batch = writeBatch(db);
          if (agencyToDelete.members && agencyToDelete.members.length > 0) {
              const unassignedAgency = agencies.find(a => a.id === 'unassigned');
              if (unassignedAgency) {
                  const updatedMembers = [...(unassignedAgency.members || []), ...agencyToDelete.members];
                  batch.update(doc(db, "agencies", "unassigned"), { members: updatedMembers });
              }
          }
          batch.delete(doc(db, "agencies", agencyId));
          await batch.commit();
          toast('success', `Agence supprimée.`);
      } catch (e) { toast('error', "Erreur suppression"); }
  };

  const updateWeek = async (weekId: string, updatedWeek: WeekModule) => {
    try {
        await updateDoc(doc(db, "weeks", weekId), { ...updatedWeek });
        toast('success', `Semaine ${weekId} mise à jour`);
    } catch (e) { toast('error', 'Erreur maj semaine'); }
  };

  const addResource = async (resource: WikiResource) => {
      await setDoc(doc(db, "resources", resource.id), resource);
      toast('success', "Ressource ajoutée");
  };

  const deleteResource = async (id: string) => {
      await deleteDoc(doc(db, "resources", id));
      toast('success', "Ressource supprimée");
  };

  const resetGame = async () => {
      try { await seedDatabase(); await updateGameConfig(DEFAULT_CONFIG); } catch (e) { console.error(e); }
  };

  return (
    <GameContext.Provider value={{
      agencies, weeks, resources, gameConfig, role, selectedAgencyId,
      setRole, selectAgency, updateAgency: mechanics.updateAgency, updateAgenciesList, deleteAgency, updateWeek, updateGameConfig,
      addResource, deleteResource, shuffleConstraints: mechanics.shuffleConstraints, 
      processFinance: finance.processFinance, 
      processPerformance: mechanics.processPerformance, 
      resetGame,
      transferFunds: finance.transferFunds, 
      tradeScoreForCash: async () => {}, 
      injectCapital: finance.injectCapital, 
      requestScorePurchase: finance.requestScorePurchase, 
      handleTransactionRequest: finance.handleTransactionRequest,
      submitMercatoVote: mechanics.submitMercatoVote, 
      triggerBlackOp: mechanics.triggerBlackOp,
      performBlackOp: mechanics.performBlackOp, 
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