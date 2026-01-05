
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
  
  // Actions
  setRole: (role: 'admin' | 'student') => void;
  selectAgency: (id: string | null) => void;
  updateAgency: (agency: Agency) => void;
  updateAgenciesList: (agencies: Agency[]) => void;
  updateWeek: (weekId: string, week: WeekModule) => void;
  
  // Wiki Actions
  addResource: (resource: WikiResource) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;

  // Game Logic
  shuffleConstraints: (agencyId: string) => void;
  processWeekFinance: () => void;
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

  const processWeekFinance = async () => {
      const confirmed = await confirm({
          title: "Clôture Hebdomadaire & Paie",
          message: "Actions déclenchées :\n1. Prélèvement Loyer\n2. Calcul auto des notes (Scaling Agressif)\n3. Paiement Salaires\n\nIrréversible.",
          confirmText: "Exécuter la Paye",
          isDangerous: false
      });

      if (!confirmed) return;
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            let currentBudget = agency.budget_real;
            let logEvents: GameEvent[] = [];

            // 1. RENT
            currentBudget -= GAME_RULES.AGENCY_RENT;
            logEvents.push({ id: `fin-rent-${Date.now()}-${agency.id}`, date: today, type: 'CRISIS', label: 'Loyer Agence', deltaBudgetReal: -GAME_RULES.AGENCY_RENT, description: `Charges fixes.` });

            // 2. SCORES SCALING (AGRESSIF)
            const updatedMembers = agency.members.map(member => {
                const reviews = agency.peerReviews.filter(r => r.targetId === member.id);
                if (reviews.length === 0) return member;
                const totalScore = reviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0);
                const avg = totalScore / reviews.length;
                
                // SCALING LOGIC: HIGH RISK / HIGH REWARD
                let scoreDelta = 0;
                let newStreak = member.streak || 0;

                if (avg > 4.5) { 
                    scoreDelta = 10; // Excellence absolue
                    newStreak++; 
                } else if (avg >= 4.0) { 
                    scoreDelta = 5; // Très bon travail
                    newStreak++; 
                } else if (avg < 1.5) { 
                    scoreDelta = -10; // Toxicité / Absentéisme grave
                    newStreak = 0; 
                } else if (avg <= 2.5) { 
                    scoreDelta = -2; // Insuffisant
                    newStreak = 0; 
                } else { 
                    scoreDelta = 2; // Standard (2.5 à 4.0)
                    newStreak = 0; 
                }

                if (scoreDelta !== 0) {
                     const newScore = Math.max(0, Math.min(100, member.individualScore + scoreDelta));
                     return { ...member, individualScore: newScore, streak: newStreak };
                }
                return { ...member, streak: newStreak };
            });
            
            // 3. SALARIES
            let totalSalaryCost = 0;
            const membersAfterPay = updatedMembers.map(member => {
                const salary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER;
                totalSalaryCost += salary;
                let payment = salary;
                let walletDelta = salary;
                if (currentBudget < 0) {
                     const debtShare = Math.abs(currentBudget) / updatedMembers.length;
                     walletDelta = -debtShare; 
                     payment = 0;
                }
                return { ...member, wallet: (member.wallet || 0) + walletDelta };
            });

            if (currentBudget >= 0) currentBudget -= totalSalaryCost;

            logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: currentBudget < 0 ? 'Défaut de Paiement' : 'Salaires Versés', deltaBudgetReal: currentBudget < 0 ? 0 : -totalSalaryCost, description: currentBudget < 0 ? `Agence en dette. Prélèvement solidaire.` : `Salaires versés.` });

            // 4. REVENUES
            const revenueVE = (agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER);
            const bonuses = agency.weeklyRevenueModifier || 0;
            const revenue = GAME_RULES.REVENUE_BASE + revenueVE + bonuses;
            currentBudget += revenue;
            logEvents.push({ id: `fin-rev-${Date.now()}-${agency.id}-2`, date: today, type: 'REVENUE', label: 'Rentrée Subvention', deltaBudgetReal: revenue, description: `Base + VE + Bonus.` });

            // 5. ADJUSTMENTS
            let veAdjustment = 0;
            if (currentBudget >= 1000) veAdjustment += Math.floor(currentBudget / 1000) * 2;
            else if (currentBudget < 0) veAdjustment -= Math.ceil(Math.abs(currentBudget) / 1000) * 5;

            logEvents.push({ id: `fin-audit-${Date.now()}-${agency.id}`, date: today, type: veAdjustment > 0 ? 'VE_DELTA' : 'CRISIS', label: 'Audit Trésorerie', deltaVE: veAdjustment, description: `Ajustement VE selon solde.` });

            let veCap = 100;
            if (agency.members.length === 1) veCap = GAME_RULES.VE_CAP_1_MEMBER;
            else if (agency.members.length <= 3) veCap = GAME_RULES.VE_CAP_2_3_MEMBERS;
            else veCap = GAME_RULES.VE_CAP_4_PLUS_MEMBERS;
            
            const finalVE = Math.min(Math.max(0, agency.ve_current + veAdjustment), veCap);

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                budget_real: currentBudget,
                eventLog: [...agency.eventLog, ...logEvents],
                ve_current: finalVE,
                members: membersAfterPay,
                status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique'
            });
        });
        await batch.commit();
        toast('success', 'Clôture effectuée.');
      } catch(e) { console.error(e); toast('error', "Erreur clôture"); }
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
      agencies, weeks, resources, role, selectedAgencyId,
      setRole, selectAgency, updateAgency, updateAgenciesList, updateWeek,
      addResource, deleteResource, shuffleConstraints, processWeekFinance, resetGame,
      transferFunds, tradeScoreForCash
    }}>
      {children}
    </GameContext.Provider>
  );
};
