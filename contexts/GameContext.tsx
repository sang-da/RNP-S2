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
    currentWeek: 1,
    autoPilot: true,
    lastFinanceRun: null,
    lastPerformanceRun: null
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useUI();
  
  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  const { agencies, weeks, resources, seedDatabase } = useGameSync(toast);
  const finance = useFinanceLogic(agencies, toast);
  
  const getCurrentGameWeek = useCallback(() => {
      return gameConfig.currentWeek || 1;
  }, [gameConfig.currentWeek]);
  
  const mechanics = useGameMechanics(agencies, toast, getCurrentGameWeek);

  // 0. SYNC CONFIG (Correction : .exists est une propriété en compat v8)
  useEffect(() => {
    const configRef = doc(db, "config", "game_state");
    const unsub = onSnapshot(configRef, (snap) => {
        // En mode compat/v8, snap.exists est une propriété booléenne
        const exists = (typeof snap.exists === 'function') ? snap.exists() : snap.exists;
        
        if (exists) {
            setGameConfig(snap.data() as GameConfig);
        } else {
            // Création initiale si le doc n'existe pas du tout
            setDoc(configRef, DEFAULT_CONFIG).catch(e => console.error("Init config failed", e));
        }
    }, (err) => {
        console.warn("Config sync error (check rules):", err);
    });
    return unsub;
  }, []);

  // 1. AUTO-PILOT SCHEDULER (Lundi Paye / Vendredi Bilan)
  useEffect(() => {
    if (!gameConfig.autoPilot || role !== 'admin') return;

    const checkAutomation = async () => {
        const now = new Date();
        const day = now.getDay(); 
        const hour = now.getHours();
        
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        const weekKey = `${now.getFullYear()}-${weekNo}`;

        if (day === 1 && gameConfig.lastFinanceRun !== weekKey) {
            await finance.processFinance('ALL' as any);
            await updateGameConfig({ lastFinanceRun: weekKey });
            toast('info', 'IA : Salaires hebdomadaires versés.');
        }

        if (day === 5 && hour >= 18 && gameConfig.lastPerformanceRun !== weekKey) {
            await mechanics.processPerformance('ALL' as any);
            await updateGameConfig({ lastPerformanceRun: weekKey });
            toast('info', 'IA : Bilan de performance de fin de semaine effectué.');
        }
    };

    const interval = setInterval(checkAutomation, 60000); 
    checkAutomation(); 
    return () => clearInterval(interval);
  }, [gameConfig, role, finance, mechanics]);

  // --- ACTIONS ---
  const updateGameConfig = async (newConfig: Partial<GameConfig>) => {
      try {
          const ref = doc(db, "config", "game_state");
          // FIX: Utiliser setDoc avec merge: true au lieu de updateDoc pour éviter "Erreur config globale" si le doc est manquant
          await setDoc(ref, newConfig, { merge: true });
          toast('success', "Configuration mise à jour");
      } catch (e) {
          console.error("Update config failed:", e);
          toast('error', "Échec de la mise à jour de la config globale");
      }
  };

  const selectAgency = (id: string | null) => setSelectedAgencyId(id);

  const updateAgenciesList = async (newAgencies: Agency[]) => {
      try {
        const batch = writeBatch(db);
        newAgencies.forEach(a => {
            const ref = doc(db, "agencies", a.id);
            batch.set(ref, a, { merge: true });
        });
        await batch.commit();
      } catch(e) { toast('error', 'Erreur mise à jour multiple'); }
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
        await setDoc(doc(db, "weeks", weekId), { ...updatedWeek }, { merge: true });
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
      setRole, selectAgency, updateAgency: mechanics.updateAgency,