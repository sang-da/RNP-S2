
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, WikiResource, Student } from '../types';
import { MOCK_AGENCIES, INITIAL_WEEKS, GAME_RULES, CONSTRAINTS_POOL } from '../constants';
import { useUI } from './UIContext';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface GameContextType {
  // State
  agencies: Agency[];
  weeks: { [key: string]: WeekModule };
  resources: WikiResource[]; // Wiki Data
  role: 'admin' | 'student';
  selectedAgencyId: string | null;
  isAutoMode: boolean;
  
  // Actions
  setRole: (role: 'admin' | 'student') => void;
  selectAgency: (id: string | null) => void;
  toggleAutoMode: () => void;
  updateAgency: (agency: Agency) => void;
  updateAgenciesList: (agencies: Agency[]) => void;
  updateWeek: (weekId: string, week: WeekModule) => void;
  
  // Wiki Actions
  addResource: (resource: WikiResource) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;

  // Game Logic
  shuffleConstraints: (agencyId: string) => void;
  processFinance: (targetClass: 'A' | 'B') => Promise<void>;
  processPerformance: (targetClass: 'A' | 'B') => Promise<void>;
  resetGame: () => void;
  
  // Student Economy
  transferFunds: (sourceId: string, targetId: string, amount: number) => Promise<void>;
  tradeScoreForCash: (studentId: string, scoreAmount: number) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast, confirm } = useUI();
  const { userData } = useAuth();
  
  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [weeks, setWeeks] = useState<{ [key: string]: WeekModule }>(INITIAL_WEEKS);
  const [resources, setResources] = useState<WikiResource[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Sync Role with Auth
  useEffect(() => {
    if (userData) {
      if (userData.role === 'admin') setRole('admin');
      else setRole('student');
    }
  }, [userData]);

  // 1. REAL-TIME SYNC: Agencies
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "agencies"), 
      (snapshot) => {
        const agenciesData: Agency[] = [];
        snapshot.forEach((doc) => {
          agenciesData.push(doc.data() as Agency);
        });
        if (agenciesData.length === 0) {
          seedDatabase().catch(console.error);
        } else {
          setAgencies(agenciesData);
        }
      },
      (error) => {
        console.error("Firestore Read Error (Agencies):", error);
        toast('info', 'Mode Hors Ligne');
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. REAL-TIME SYNC: Weeks
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "weeks"), 
      (snapshot) => {
        const weeksData: { [key: string]: WeekModule } = {};
        snapshot.forEach((doc) => {
          weeksData[doc.id] = doc.data() as WeekModule;
        });
        if (Object.keys(weeksData).length > 0) setWeeks(weeksData);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. REAL-TIME SYNC: Resources
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "resources"), 
      (snapshot) => {
        const resData: WikiResource[] = [];
        snapshot.forEach((doc) => {
          resData.push(doc.data() as WikiResource);
        });
        setResources(resData);
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. AUTO MODE SCHEDULER
  useEffect(() => {
      if (!isAutoMode) return;

      const checkSchedule = () => {
          const now = new Date();
          const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const hour = now.getHours();
          // Logique simplifiée pour la démo : On regarde si la date du jour correspond à une semaine
          // Dans une vraie app, on stockerait l'état "déjà exécuté" pour la journée.
          console.log(`Auto Check: ${today} ${hour}h`);
      };

      const interval = setInterval(checkSchedule, 60000); // Check every minute
      return () => clearInterval(interval);
  }, [isAutoMode, weeks]);

  // SEED FUNCTION
  const seedDatabase = async () => {
    const batch = writeBatch(db);
    MOCK_AGENCIES.forEach(agency => {
      const ref = doc(db, "agencies", agency.id);
      batch.set(ref, agency);
    });
    Object.values(INITIAL_WEEKS).forEach(week => {
      const ref = doc(db, "weeks", week.id);
      batch.set(ref, week);
    });
    await batch.commit();
  };

  const updateAgency = async (updatedAgency: Agency) => {
    try {
        let veCap = 100;
        const memberCount = updatedAgency.members.length;
        if (memberCount === 1) veCap = GAME_RULES.VE_CAP_1_MEMBER;
        else if (memberCount <= 3) veCap = GAME_RULES.VE_CAP_2_3_MEMBERS;
        else veCap = GAME_RULES.VE_CAP_4_PLUS_MEMBERS;

        const finalVE = Math.min(updatedAgency.ve_current, veCap);
        const agencyRef = doc(db, "agencies", updatedAgency.id);
        await updateDoc(agencyRef, { ...updatedAgency, ve_current: finalVE });
    } catch (e) {
        console.error(e);
        toast('error', 'Erreur sauvegarde');
    }
  };

  const updateAgenciesList = async (newAgencies: Agency[]) => {
      try {
        const batch = writeBatch(db);
        newAgencies.forEach(a => {
            const ref = doc(db, "agencies", a.id);
            batch.update(ref, { ...a });
        });
        await batch.commit();
      } catch(e) {
         console.error(e);
         toast('error', 'Erreur mise à jour multiple');
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

  const shuffleConstraints = async (agencyId: string) => {
    const agency = agencies.find(a => a.id === agencyId);
    if (!agency) return;
    const randomSpace = CONSTRAINTS_POOL.space[Math.floor(Math.random() * CONSTRAINTS_POOL.space.length)];
    const randomStyle = CONSTRAINTS_POOL.style[Math.floor(Math.random() * CONSTRAINTS_POOL.style.length)];
    const randomClient = CONSTRAINTS_POOL.client[Math.floor(Math.random() * CONSTRAINTS_POOL.client.length)];
    await updateAgency({
      ...agency,
      constraints: { space: randomSpace, style: randomStyle, client: randomClient }
    });
    toast('info', 'Contraintes régénérées');
  };

  // --- PROCESS: FINANCE (Rent, Salary, Revenue) ---
  const processFinance = async (targetClass: 'A' | 'B') => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        let processedCount = 0;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned' || agency.classId !== targetClass) return;
            processedCount++;

            let currentBudget = agency.budget_real;
            let logEvents: GameEvent[] = [];

            // 1. RENT
            // Rent is automatic.
            currentBudget -= GAME_RULES.AGENCY_RENT;
            logEvents.push({ id: `fin-rent-${Date.now()}-${agency.id}`, date: today, type: 'CRISIS', label: 'Loyer Agence', deltaBudgetReal: -GAME_RULES.AGENCY_RENT, description: `Prélèvement automatique.` });

            // 2. SALARIES
            let actualDisbursed = 0;
            const updatedMembers = agency.members.map(member => {
                const rawSalary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER; 
                // Agency pays up to salary cap for the student pocket
                const pay = Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
                
                // If agency is in debt, no pay.
                if (currentBudget < 0) {
                    return member; // No change to wallet
                }
                
                actualDisbursed += pay;
                return { ...member, wallet: (member.wallet || 0) + pay };
            });

            if (currentBudget >= 0) {
                currentBudget -= actualDisbursed;
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires', deltaBudgetReal: -actualDisbursed, description: `Salaires versés (${updatedMembers.length} employés).` });
            } else {
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires Gelés', deltaBudgetReal: 0, description: `Dette active. Salaires suspendus.` });
            }

            // 3. REVENUES (Performance Only)
            const revenueVE = (agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER);
            const bonuses = agency.weeklyRevenueModifier || 0;
            const totalRevenue = revenueVE + bonuses + GAME_RULES.REVENUE_BASE; // REVENUE_BASE is 0 now
            
            currentBudget += totalRevenue;
            logEvents.push({ id: `fin-rev-${Date.now()}-${agency.id}`, date: today, type: 'REVENUE', label: 'Recettes', deltaBudgetReal: totalRevenue, description: `Facturation client (VE: ${agency.ve_current}).` });

            // UPDATE
            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                budget_real: currentBudget,
                members: updatedMembers,
                eventLog: [...agency.eventLog, ...logEvents]
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            toast('success', `Finance Classe ${targetClass}: Terminée.`);
        } else {
            toast('info', `Aucune agence active en Classe ${targetClass}.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Finance"); }
  };

  // --- PROCESS: PERFORMANCE (Reviews, Scores, VE Adjustment) ---
  const processPerformance = async (targetClass: 'A' | 'B') => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        let processedCount = 0;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned' || agency.classId !== targetClass) return;
            processedCount++;
            
            let logEvents: GameEvent[] = [];

            // 1. SCORES SCALING & STREAKS
            const updatedMembers = agency.members.map(member => {
                const reviews = agency.peerReviews.filter(r => r.targetId === member.id);
                // Si pas de review, pas de changement
                if (reviews.length === 0) return member;
                
                const totalScore = reviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0);
                const avg = totalScore / reviews.length;
                
                let scoreDelta = 0;
                let newStreak = member.streak || 0;
                let bonusMessage = "";

                if (avg > 4.5) { 
                    scoreDelta = 2; // NERF: Was 10. Now just +2 normal growth.
                    newStreak++; 
                    // STREAK BONUS LOGIC
                    if (newStreak >= 3) {
                        scoreDelta += 10; // Bonus Trigger
                        bonusMessage = " (Bonus Streak x3!)";
                        newStreak = 0; // Reset streak after bonus
                    }
                } else if (avg >= 4.0) { 
                    scoreDelta = 1; 
                    // Streak maintained but no increment? Or reset? Let's keep it simple: Reset if not excellent.
                    newStreak = 0;
                } else if (avg < 2.0) { 
                    scoreDelta = -5; 
                    newStreak = 0; 
                } else {
                    newStreak = 0;
                }

                if (scoreDelta !== 0) {
                     // Logging implicit via score change displayed in UI? 
                     // Or separate event? Ideally separate but keeping it simple for now inside member data
                }
                
                const newScore = Math.max(0, Math.min(100, member.individualScore + scoreDelta));
                return { ...member, individualScore: newScore, streak: newStreak };
            });

            // 2. VE ADJUSTMENT BASED ON TREASURY (The "Company Value" check)
            let veAdjustment = 0;
            const budget = agency.budget_real;
            
            if (budget >= 2000) veAdjustment += Math.floor(budget / 2000); // +1 VE per 2000 profit
            else if (budget < 0) veAdjustment -= Math.ceil(Math.abs(budget) / 1000) * 2; // -2 VE per 1000 debt

            if (veAdjustment !== 0) {
                logEvents.push({ 
                    id: `perf-ve-${Date.now()}-${agency.id}`, 
                    date: today, 
                    type: veAdjustment > 0 ? 'VE_DELTA' : 'CRISIS', 
                    label: 'Ajustement VE', 
                    deltaVE: veAdjustment, 
                    description: veAdjustment > 0 ? 'Confiance investisseurs (Trésorerie saine).' : 'Inquiétude marché (Dette).' 
                });
            }

            // Calculate Caps
            let veCap = 100;
            if (agency.members.length === 1) veCap = GAME_RULES.VE_CAP_1_MEMBER;
            else if (agency.members.length <= 3) veCap = GAME_RULES.VE_CAP_2_3_MEMBERS;
            else veCap = GAME_RULES.VE_CAP_4_PLUS_MEMBERS;
            
            const finalVE = Math.min(Math.max(0, agency.ve_current + veAdjustment), veCap);

            // UPDATE
            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                members: updatedMembers,
                ve_current: finalVE,
                peerReviews: [], // Reset reviews for next week? Usually yes to avoid double counting
                eventLog: [...agency.eventLog, ...logEvents],
                status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique'
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            toast('success', `Performance Classe ${targetClass}: Terminée.`);
        } else {
            toast('info', `Aucune agence active en Classe ${targetClass}.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Performance"); }
  };

  // --- NEW: STUDENT ECONOMY ---
  const transferFunds = async (sourceId: string, targetId: string, amount: number) => {
      let sourceData: { agency: Agency, student: Student } | undefined;
      let targetData: { agency: Agency, student: Student } | undefined;

      agencies.forEach(a => {
          const s1 = a.members.find(m => m.id === sourceId);
          if (s1) sourceData = { agency: a, student: s1 };
          const s2 = a.members.find(m => m.id === targetId);
          if (s2) targetData = { agency: a, student: s2 };
      });

      if (!sourceData || !targetData) return;
      if ((sourceData.student.wallet || 0) < amount) {
          toast('error', "Fonds insuffisants.");
          return;
      }

      const batch = writeBatch(db);

      const updatedSourceMembers = sourceData.agency.members.map(m => 
          m.id === sourceId ? { ...m, wallet: (m.wallet || 0) - amount } : m
      );
      batch.update(doc(db, "agencies", sourceData.agency.id), { members: updatedSourceMembers });

      if (sourceData.agency.id === targetData.agency.id) {
          const finalMembers = updatedSourceMembers.map(m => 
              m.id === targetId ? { ...m, wallet: (m.wallet || 0) + amount } : m
          );
          batch.update(doc(db, "agencies", sourceData.agency.id), { members: finalMembers });
      } else {
          const updatedTargetMembers = targetData.agency.members.map(m => 
              m.id === targetId ? { ...m, wallet: (m.wallet || 0) + amount } : m
          );
          batch.update(doc(db, "agencies", targetData.agency.id), { members: updatedTargetMembers });
      }

      await batch.commit();
      toast('success', `Virement de ${amount} PiXi effectué.`);
  };

  const tradeScoreForCash = async (studentId: string, scoreAmount: number) => {
      // RATE: 1 Score Point = 50 PiXi
      const CASH_RATE = 50;
      const cashReceived = scoreAmount * CASH_RATE;

      let studentData: { agency: Agency, student: Student } | undefined;
      agencies.forEach(a => {
          const s = a.members.find(m => m.id === studentId);
          if (s) studentData = { agency: a, student: s };
      });

      if (!studentData) return;
      if (studentData.student.individualScore < scoreAmount) {
          toast('error', "Score insuffisant.");
          return;
      }

      const updatedMembers = studentData.agency.members.map(m => 
          m.id === studentId ? { 
              ...m, 
              individualScore: m.individualScore - scoreAmount,
              wallet: (m.wallet || 0) + cashReceived
          } : m
      );

      await updateDoc(doc(db, "agencies", studentData.agency.id), { members: updatedMembers });
      toast('success', `Liquidité obtenue : +${cashReceived} PiXi (Coût: -${scoreAmount} Score)`);
  };

  const resetGame = async () => {
      try { await seedDatabase(); } catch (e) { console.error(e); }
  };

  return (
    <GameContext.Provider value={{
      agencies, weeks, resources, role, selectedAgencyId, isAutoMode,
      setRole, selectAgency, toggleAutoMode, updateAgency, updateAgenciesList, updateWeek,
      addResource, deleteResource, shuffleConstraints, processFinance, processPerformance, resetGame,
      transferFunds, tradeScoreForCash
    }}>
      {children}
    </GameContext.Provider>
  );
};
