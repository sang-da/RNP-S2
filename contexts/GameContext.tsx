
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, WikiResource, Student, TransactionRequest, MercatoRequest, StudentHistoryEntry, MergerRequest } from '../types';
import { MOCK_AGENCIES, INITIAL_WEEKS, GAME_RULES, CONSTRAINTS_POOL, calculateVECap } from '../constants';
import { useUI } from './UIContext';
import { db, collection, onSnapshot, doc, updateDoc, writeBatch, setDoc, deleteDoc } from '../services/firebase';
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
  deleteAgency: (agencyId: string) => Promise<void>; // NEW
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

  // Black Ops & Mergers
  triggerBlackOp: (sourceAgencyId: string, targetAgencyId: string, type: 'AUDIT' | 'LEAK') => Promise<void>;
  proposeMerger: (sourceAgencyId: string, targetAgencyId: string) => Promise<void>;
  finalizeMerger: (mergerId: string, targetAgencyId: string, approved: boolean) => Promise<void>;
  getCurrentGameWeek: () => number;
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
          const today = now.toISOString().split('T')[0];
          console.log(`Auto Check: ${today}`);
      };
      const interval = setInterval(checkSchedule, 60000); 
      return () => clearInterval(interval);
  }, [isAutoMode, weeks]);

  // HELPER: Get Current Week
  const getCurrentGameWeek = () => {
      const unlockedWeeks = (Object.values(weeks) as WeekModule[]).filter(w => !w.locked).map(w => parseInt(w.id));
      return unlockedWeeks.length > 0 ? Math.max(...unlockedWeeks) : 1;
  };

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
        const veCap = calculateVECap(updatedAgency);
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

          // 1. Move existing members to 'unassigned' if any
          if (agencyToDelete.members.length > 0) {
              const unassignedRef = doc(db, "agencies", "unassigned");
              const unassignedAgency = agencies.find(a => a.id === 'unassigned');
              if (unassignedAgency) {
                  const updatedMembers = [...unassignedAgency.members, ...agencyToDelete.members];
                  batch.update(unassignedRef, { members: updatedMembers });
              }
          }

          // 2. Delete the agency document
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

  // --- PROCESS: FINANCE (Rent, Solidarity, Salary, Cost of Living) ---
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
            let agencyMembers = [...agency.members];

            // 1. REVENUES (Income first)
            const revenueVE = (agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER);
            const bonuses = agency.weeklyRevenueModifier || 0;
            const totalRevenue = revenueVE + bonuses + GAME_RULES.REVENUE_BASE;
            
            currentBudget += totalRevenue;
            logEvents.push({ 
                id: `fin-rev-${Date.now()}-${agency.id}`, 
                date: today, 
                type: 'REVENUE', 
                label: 'Recettes', 
                deltaBudgetReal: totalRevenue, 
                description: `Facturation client (VE: ${agency.ve_current}).` 
            });

            // 2. RENT & SOLIDARITY CLAUSE
            const rent = GAME_RULES.AGENCY_RENT;
            if (currentBudget >= rent) {
                // Scenario A: Agency can pay
                currentBudget -= rent;
                logEvents.push({ id: `fin-rent-${Date.now()}-${agency.id}`, date: today, type: 'CRISIS', label: 'Loyer Agence', deltaBudgetReal: -rent, description: `Prélèvement automatique.` });
            } else {
                // Scenario B: Default -> Solidarity Clause
                // Agency pays what it can (goes to 0), rest is split among members
                const paidByAgency = Math.max(0, currentBudget); // If budget was already negative, it pays 0
                const deficit = rent - paidByAgency;
                const membersCount = Math.max(1, agencyMembers.length);
                const sharePerStudent = Math.ceil(deficit / membersCount);

                currentBudget = 0; // Budget reset to 0 (or stays negative if it was debt, but logic implies we drain existing funds first)
                
                // If it was already in debt, the debt remains. Here simplified: existing cash is used for rent.
                
                logEvents.push({ 
                    id: `fin-rent-solidarity-${Date.now()}-${agency.id}`, 
                    date: today, 
                    type: 'CRISIS', 
                    label: 'CLAUSE SOLIDARITÉ', 
                    deltaBudgetReal: -paidByAgency, 
                    description: `Défaut de paiement. ${sharePerStudent} PiXi saisis sur chaque membre.` 
                });

                // Deduct from students immediately
                agencyMembers = agencyMembers.map(m => ({
                    ...m,
                    wallet: (m.wallet || 0) - sharePerStudent
                }));
            }

            // 3. SALARIES (Only if budget allows, otherwise frozen)
            let actualDisbursed = 0;
            if (currentBudget >= 0) {
                agencyMembers = agencyMembers.map(member => {
                    const rawSalary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER; 
                    const pay = Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
                    actualDisbursed += pay;
                    return { ...member, wallet: (member.wallet || 0) + pay };
                });
                
                // If paying salaries puts agency in negative, it goes into debt (allowed for salaries)
                currentBudget -= actualDisbursed;
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires', deltaBudgetReal: -actualDisbursed, description: `Salaires versés.` });
            } else {
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires Gelés', deltaBudgetReal: 0, description: `Dette active. Pas de salaire.` });
            }

            // 4. COST OF LIVING & PRECARITY (The "Burn Rate")
            agencyMembers = agencyMembers.map(member => {
                // Deduct Cost of Living
                let newWallet = (member.wallet || 0) - GAME_RULES.COST_OF_LIVING;
                let newScore = member.individualScore;
                
                // Check Poverty
                if (newWallet < 0) {
                    newScore = Math.max(0, newScore - GAME_RULES.POVERTY_SCORE_PENALTY);
                }

                return { 
                    ...member, 
                    wallet: newWallet, 
                    individualScore: newScore
                };
            });

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                budget_real: currentBudget,
                members: agencyMembers,
                eventLog: [...agency.eventLog, ...logEvents]
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            toast('success', `Finance Classe ${targetClass}: Traitement Terminé.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Finance"); }
  };

  // --- PROCESS: PERFORMANCE ---
  const processPerformance = async (targetClass: 'A' | 'B') => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        let processedCount = 0;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned' || agency.classId !== targetClass) return;
            processedCount++;
            
            let logEvents: GameEvent[] = [];
            const updatedMembers = agency.members.map(member => {
                const reviews = agency.peerReviews.filter(r => r.targetId === member.id);
                if (reviews.length === 0) return member;
                const avg = reviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / reviews.length;
                let scoreDelta = 0;
                let newStreak = member.streak || 0;
                if (avg > 4.5) { scoreDelta = 2; newStreak++; if (newStreak >= 3) { scoreDelta += 10; newStreak = 0; } } 
                else if (avg >= 4.0) { scoreDelta = 1; newStreak = 0; } 
                else if (avg < 2.0) { scoreDelta = -5; newStreak = 0; } 
                else { newStreak = 0; }
                return { ...member, individualScore: Math.max(0, Math.min(100, member.individualScore + scoreDelta)), streak: newStreak };
            });

            let veAdjustment = 0;
            const budget = agency.budget_real;
            if (budget >= 2000) veAdjustment += Math.floor(budget / 2000);
            else if (budget < 0) veAdjustment -= Math.ceil(Math.abs(budget) / 1000) * 2;

            if (veAdjustment !== 0) {
                logEvents.push({ id: `perf-ve-${Date.now()}-${agency.id}`, date: today, type: veAdjustment > 0 ? 'VE_DELTA' : 'CRISIS', label: 'Ajustement VE', deltaVE: veAdjustment, description: veAdjustment > 0 ? 'Trésorerie saine.' : 'Dette.' });
            }

            const veCap = calculateVECap(agency);
            
            const finalVE = Math.min(Math.max(0, agency.ve_current + veAdjustment), veCap);

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                members: updatedMembers,
                ve_current: finalVE,
                peerReviews: [], 
                eventLog: [...agency.eventLog, ...logEvents],
                status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique'
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            toast('success', `Performance Classe ${targetClass}: Terminée.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Performance"); }
  };

  const transferFunds = async (sourceId: string, targetId: string, amount: number) => { 
      // Logic placeholder for student-to-student transfer
      const sourceAgency = agencies.find(a => a.members.some(m => m.id === sourceId));
      if (!sourceAgency) return;
      // ... implementation ...
  };
  
  const tradeScoreForCash = async (studentId: string, scoreAmount: number) => { /* Impl */ };
  
  const injectCapital = async (studentId: string, agencyId: string, amount: number) => { 
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if(!student || (student.wallet || 0) < amount) {
          toast('error', "Fonds insuffisants.");
          return;
      }
      
      // Calculate tax
      const tax = Math.floor(amount * GAME_RULES.INJECTION_TAX);
      const netInjection = amount - tax;

      const batch = writeBatch(db);
      
      const updatedMembers = agency.members.map(m => m.id === studentId ? { ...m, wallet: (m.wallet || 0) - amount } : m);
      
      const today = new Date().toISOString().split('T')[0];
      const newEvent: GameEvent = {
          id: `inj-${Date.now()}`,
          date: today,
          type: 'INFO',
          label: 'Injection Capital',
          deltaBudgetReal: netInjection,
          description: `${student.name} injecte ${amount} PiXi (Taxe: ${tax}).`
      };

      const updatedAgency = { 
          ...agency, 
          members: updatedMembers, 
          budget_real: agency.budget_real + netInjection,
          eventLog: [...agency.eventLog, newEvent] 
      };
      
      batch.set(doc(db, "agencies", agency.id), updatedAgency, { merge: true });
      await batch.commit();
      toast('success', `Injection: +${netInjection} PiXi (Taxe -${tax})`);
  };
  
  const requestScorePurchase = async (studentId: string, agencyId: string, amountPixi: number, amountScore: number) => { 
     const agency = agencies.find(a => a.id === agencyId);
     if(!agency) return;
     const newRequest: TransactionRequest = { id: `req-score-${Date.now()}`, studentId, studentName: agency.members.find(m=>m.id===studentId)?.name || '', type: 'BUY_SCORE', amountPixi, amountScore, status: 'PENDING', date: new Date().toISOString().split('T')[0] };
     await updateDoc(doc(db, "agencies", agency.id), { transactionRequests: [...(agency.transactionRequests || []), newRequest] });
     toast('success', "Demande envoyée");
  };

  const handleTransactionRequest = async (agency: Agency, request: TransactionRequest, approved: boolean) => {
      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agency.id);
      const updatedRequests = (agency.transactionRequests || []).filter(r => r.id !== request.id);
      if (!approved) { batch.update(agencyRef, { transactionRequests: updatedRequests }); await batch.commit(); return; }
      
      const updatedMembers = agency.members.map(m => m.id === request.studentId ? { ...m, wallet: (m.wallet || 0) - request.amountPixi, individualScore: Math.min(100, m.individualScore + request.amountScore) } : m);
      batch.update(agencyRef, { transactionRequests: updatedRequests, members: updatedMembers });
      await batch.commit();
      toast('success', "Transaction validée");
  };

  const submitMercatoVote = async (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const request = agency.mercatoRequests.find(r => r.id === requestId);
      if(!request) return;

      const newVotes = { ...request.votes, [voterId]: vote };
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      let totalVoters = agency.members.length;
      let threshold = 0.66;
      if (request.type === 'FIRE' && request.requesterId !== request.studentId) { totalVoters = Math.max(1, agency.members.length - 1); threshold = 0.75; }

      const batch = writeBatch(db);
      if (approvals / totalVoters > threshold) {
          const targetAgency = agencies.find(a => a.id === 'unassigned');
          if(targetAgency) {
               const student = agency.members.find(m => m.id === request.studentId);
               if(student) {
                   const updatedSource = agency.members.filter(m => m.id !== request.studentId);
                   const updatedTarget = [...targetAgency.members, { ...student, history: [] }];
                   batch.update(doc(db, "agencies", agency.id), { members: updatedSource, mercatoRequests: agency.mercatoRequests.filter(r => r.id !== requestId) });
                   batch.update(doc(db, "agencies", targetAgency.id), { members: updatedTarget });
               }
          }
      } else {
          const updatedRequests = agency.mercatoRequests.map(r => r.id === requestId ? { ...r, votes: newVotes } : r);
          batch.update(doc(db, "agencies", agency.id), { mercatoRequests: updatedRequests });
      }
      await batch.commit();
      toast('success', "Vote enregistré");
  };

  // --- BLACK OPS LOGIC ---
  const triggerBlackOp = async (sourceAgencyId: string, targetAgencyId: string, type: 'AUDIT' | 'LEAK') => {
      const week = getCurrentGameWeek();
      if (week < GAME_RULES.UNLOCK_WEEK_BLACK_OPS) {
          toast('error', `Disponible en Semaine ${GAME_RULES.UNLOCK_WEEK_BLACK_OPS} uniquement.`);
          return;
      }

      const sourceAgency = agencies.find(a => a.id === sourceAgencyId);
      const targetAgency = agencies.find(a => a.id === targetAgencyId);
      if (!sourceAgency || !targetAgency) return;

      const cost = type === 'AUDIT' ? GAME_RULES.COST_AUDIT : GAME_RULES.COST_LEAK;

      if (sourceAgency.budget_real < cost) {
          toast('error', "Fonds insuffisants pour cette opération.");
          return;
      }

      const batch = writeBatch(db);
      const today = new Date().toISOString().split('T')[0];

      // 1. Pay Cost
      const sourceRef = doc(db, "agencies", sourceAgency.id);
      batch.update(sourceRef, {
          budget_real: sourceAgency.budget_real - cost,
          eventLog: [...sourceAgency.eventLog, {
              id: `op-cost-${Date.now()}`, date: today, type: 'BLACK_OP', label: `Opération: ${type}`, deltaBudgetReal: -cost, description: `Paiement prestataire externe.`
          }]
      });

      // 2. Execute Effect
      if (type === 'LEAK') {
          toast('success', "Fuite obtenue : Le brief de la semaine prochaine contient une contrainte 'Low Tech'.");
      } else if (type === 'AUDIT') {
          const isVulnerable = targetAgency.budget_real < 0 || targetAgency.ve_current < 40;
          if (isVulnerable) {
               const targetRef = doc(db, "agencies", targetAgency.id);
               batch.update(targetRef, {
                   ve_current: Math.max(0, targetAgency.ve_current - 10),
                   eventLog: [...targetAgency.eventLog, {
                       id: `op-hit-${Date.now()}`, date: today, type: 'CRISIS', label: "Audit Externe (Sanction)", deltaVE: -10, description: "Des irrégularités ont été exposées par un audit concurrent."
                   }]
               });
               toast('success', `Audit réussi ! ${targetAgency.name} perd 10 VE.`);
          } else {
               batch.update(sourceRef, {
                   ve_current: Math.max(0, sourceAgency.ve_current - 20),
                   eventLog: [...sourceAgency.eventLog, {
                       id: `op-fail-${Date.now()}`, date: today, type: 'CRISIS', label: "Procès Diffamation", deltaVE: -20, description: "L'audit n'a rien révélé. L'agence cible porte plainte."
                   }]
               });
               toast('error', `Echec ! ${targetAgency.name} est clean. Vous perdez 20 VE pour diffamation.`);
          }
      }
      await batch.commit();
  };

  // --- MERGERS LOGIC ---
  const proposeMerger = async (sourceAgencyId: string, targetAgencyId: string) => {
      const week = getCurrentGameWeek();
      if (week < GAME_RULES.UNLOCK_WEEK_MERGERS) {
          toast('error', `Fusions disponibles en Semaine ${GAME_RULES.UNLOCK_WEEK_MERGERS}.`);
          return;
      }
      
      const targetAgency = agencies.find(a => a.id === targetAgencyId);
      if(!targetAgency) return;

      if (targetAgency.ve_current > GAME_RULES.MERGER_VE_THRESHOLD) {
           toast('error', "Cette agence est trop stable pour être rachetée (VE > 40).");
           return;
      }

      const request: MergerRequest = {
          id: `merger-${Date.now()}`,
          requesterAgencyId: sourceAgencyId,
          requesterAgencyName: agencies.find(a => a.id === sourceAgencyId)?.name || 'Inconnu',
          targetAgencyId: targetAgencyId,
          status: 'PENDING',
          date: new Date().toISOString().split('T')[0],
          offerDetails: "Rachat complet de la dette et intégration des effectifs."
      };

      const targetRef = doc(db, "agencies", targetAgencyId);
      await updateDoc(targetRef, {
          mergerRequests: [...(targetAgency.mergerRequests || []), request]
      });
      toast('success', "Proposition de rachat envoyée.");
  };

  const finalizeMerger = async (mergerId: string, targetAgencyId: string, approved: boolean) => {
      const targetAgency = agencies.find(a => a.id === targetAgencyId);
      if(!targetAgency) return;
      const request = targetAgency.mergerRequests?.find(r => r.id === mergerId);
      if(!request) return;

      const batch = writeBatch(db);
      const updatedRequests = targetAgency.mergerRequests?.filter(r => r.id !== mergerId);
      
      if (!approved) {
           batch.update(doc(db, "agencies", targetAgencyId), { mergerRequests: updatedRequests });
           await batch.commit();
           toast('info', "Fusion refusée.");
           return;
      }

      const sourceAgency = agencies.find(a => a.id === request.requesterAgencyId);
      if(!sourceAgency) return;

      if (sourceAgency.members.length + targetAgency.members.length > GAME_RULES.MERGER_MAX_MEMBERS) {
          toast('error', `Fusion impossible : La nouvelle équipe dépasserait ${GAME_RULES.MERGER_MAX_MEMBERS} membres.`);
          return;
      }

      const newMembers = [...sourceAgency.members, ...targetAgency.members];
      const newBudget = sourceAgency.budget_real + targetAgency.budget_real;
      
      batch.update(doc(db, "agencies", sourceAgency.id), {
          members: newMembers,
          budget_real: newBudget,
          eventLog: [...sourceAgency.eventLog, {
              id: `merger-win-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'MERGER', label: "Acquisition", description: `Rachat de ${targetAgency.name}. Dette absorbée.`
          }]
      });

      batch.update(doc(db, "agencies", targetAgency.id), {
          members: [],
          status: 'critique',
          name: `${targetAgency.name} (Dissoute)`,
          mergerRequests: []
      });

      await batch.commit();
      toast('success', "Fusion confirmée. Agence absorbée.");
  };

  const resetGame = async () => {
      try { await seedDatabase(); } catch (e) { console.error(e); }
  };

  return (
    <GameContext.Provider value={{
      agencies, weeks, resources, role, selectedAgencyId, isAutoMode,
      setRole, selectAgency, toggleAutoMode, updateAgency, updateAgenciesList, deleteAgency, updateWeek,
      addResource, deleteResource, shuffleConstraints, processFinance, processPerformance, resetGame,
      transferFunds, tradeScoreForCash, injectCapital, requestScorePurchase, handleTransactionRequest,
      submitMercatoVote, triggerBlackOp, proposeMerger, finalizeMerger, getCurrentGameWeek
    }}>
      {children}
    </GameContext.Provider>
  );
};
