
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, WikiResource, Student, TransactionRequest, MercatoRequest, StudentHistoryEntry } from '../types';
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
  
  // Student Economy & RH
  transferFunds: (sourceId: string, targetId: string, amount: number) => Promise<void>;
  tradeScoreForCash: (studentId: string, scoreAmount: number) => Promise<void>;
  injectCapital: (studentId: string, agencyId: string, amount: number) => Promise<void>;
  requestScorePurchase: (studentId: string, agencyId: string, amountPixi: number, amountScore: number) => Promise<void>;
  handleTransactionRequest: (agency: Agency, request: TransactionRequest, approved: boolean) => Promise<void>;
  submitMercatoVote: (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => Promise<void>;
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
          // Logique simplifiée pour la démo
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

  // Legacy trade function (Direct Score to Cash) - kept for compatibility if needed but replaced by request logic usually
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

  // --- NEW: INJECT CAPITAL (AUTOMATIC) ---
  const injectCapital = async (studentId: string, agencyId: string, amount: number) => {
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if(!student) return;

      if((student.wallet || 0) < amount) {
          toast('error', "Fonds insuffisants.");
          return;
      }

      const batch = writeBatch(db);
      
      // 1. Deduct from student
      const updatedMembers = agency.members.map(m => 
          m.id === studentId ? { ...m, wallet: (m.wallet || 0) - amount } : m
      );

      // 2. Add to agency budget
      const updatedAgency = {
          ...agency,
          members: updatedMembers,
          budget_real: agency.budget_real + amount,
          eventLog: [...agency.eventLog, {
              id: `inj-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'BUDGET_DELTA' as const, // Cast needed for TS
              label: "Injection Capital",
              deltaBudgetReal: amount,
              description: `Investissement personnel de ${student.name}.`
          }]
      };

      const agencyRef = doc(db, "agencies", agency.id);
      batch.update(agencyRef, updatedAgency);
      await batch.commit();
      toast('success', `Injection de ${amount} PiXi réussie.`);
  };

  // --- NEW: REQUEST SCORE PURCHASE (MANUAL VALIDATION) ---
  const requestScorePurchase = async (studentId: string, agencyId: string, amountPixi: number, amountScore: number) => {
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if(!student) return;

      // Create Request
      const newRequest: TransactionRequest = {
          id: `req-score-${Date.now()}`,
          studentId: student.id,
          studentName: student.name,
          type: 'BUY_SCORE',
          amountPixi: amountPixi,
          amountScore: amountScore,
          status: 'PENDING',
          date: new Date().toISOString().split('T')[0]
      };

      const agencyRef = doc(db, "agencies", agency.id);
      await updateDoc(agencyRef, {
          transactionRequests: [...(agency.transactionRequests || []), newRequest]
      });
      toast('success', "Demande d'achat envoyée à l'administration.");
  };

  // --- ADMIN: VALIDATE TRANSACTION ---
  const handleTransactionRequest = async (agency: Agency, request: TransactionRequest, approved: boolean) => {
      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agency.id);

      // Remove request from pending list
      const updatedRequests = (agency.transactionRequests || []).filter(r => r.id !== request.id);

      if (!approved) {
          batch.update(agencyRef, { transactionRequests: updatedRequests });
          await batch.commit();
          toast('info', "Demande rejetée.");
          return;
      }

      // Execute Transaction
      const student = agency.members.find(m => m.id === request.studentId);
      if (!student) {
          toast('error', "Étudiant introuvable.");
          return;
      }

      if ((student.wallet || 0) < request.amountPixi) {
          toast('error', "Fonds insuffisants pour valider la transaction.");
          // Still remove request or mark rejected? Let's just stop here for safety.
          return;
      }

      const updatedMembers = agency.members.map(m => 
          m.id === request.studentId 
          ? { 
              ...m, 
              wallet: (m.wallet || 0) - request.amountPixi,
              individualScore: Math.min(100, m.individualScore + request.amountScore)
            }
          : m
      );

      const logEvent: GameEvent = {
          id: `buy-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'INFO',
          label: "Achat de Score",
          description: `${request.studentName} a acheté +${request.amountScore} pts pour ${request.amountPixi} PiXi.`
      };

      batch.update(agencyRef, {
          transactionRequests: updatedRequests,
          members: updatedMembers,
          eventLog: [...agency.eventLog, logEvent]
      });

      await batch.commit();
      toast('success', "Transaction validée.");
  };

  // --- DEMOCRATIC MERCATO VOTING & AUTO-EXECUTION ---
  const submitMercatoVote = async (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const request = agency.mercatoRequests.find(r => r.id === requestId);
      if(!request) return;

      // 1. Update votes locally first
      const currentVotes = request.votes || {};
      const newVotes = { ...currentVotes, [voterId]: vote };
      
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      
      // 2. Logic Threshold
      // HIRE: All members vote. Threshold > 66% (2/3)
      // FIRE: All members EXCEPT target vote. Threshold > 75% (3/4)
      
      let totalVoters = agency.members.length;
      let threshold = 0.66;
      let isPassed = false;

      if (request.type === 'FIRE') {
          // If firing, target cannot vote (handled in UI), so total voters = members - 1
          // BUT: If the requester is also the target (Resignation), logic is different (Resignation is usually auto or Admin only)
          // Assuming here "FIRE" implies "Team firing someone".
          if (request.requesterId !== request.studentId) {
              totalVoters = Math.max(1, agency.members.length - 1);
              threshold = 0.75;
          }
      }

      const ratio = approvals / totalVoters;
      if (ratio > threshold) {
          isPassed = true;
      }

      // 3. EXECUTE OR UPDATE
      const batch = writeBatch(db);
      
      if (isPassed) {
          // AUTO EXECUTION OF TRANSFER
          // Need to find Source and Target Agencies
          // Case HIRE: Source = Unassigned, Target = agencyId
          // Case FIRE: Source = agencyId, Target = Unassigned
          
          let sourceAgency = agency;
          let targetAgency = agencies.find(a => a.id === 'unassigned');
          
          if (request.type === 'HIRE') {
              sourceAgency = agencies.find(a => a.id === 'unassigned')!; // Should act on Unassigned to remove, and Current to add
              targetAgency = agency;
          }

          if (!sourceAgency || !targetAgency) {
              toast('error', "Erreur structure agence lors du vote.");
              return;
          }

          const studentId = request.studentId;
          const student = sourceAgency.members.find(m => m.id === studentId);
          if(!student) return;

          const today = new Date().toISOString().split('T')[0];

          // A. Remove from Source
          const updatedSourceMembers = sourceAgency.members.filter(m => m.id !== studentId);
          
          // B. Add to Target (Update History)
          const newHistory = [...(student.history || [])];
          newHistory.push({
              date: today,
              agencyId: targetAgency.id,
              agencyName: targetAgency.name,
              action: request.type === 'HIRE' ? 'JOINED' : 'FIRED',
              contextVE: targetAgency.ve_current,
              contextBudget: targetAgency.budget_real,
              reason: "Décision Démocratique (Vote)"
          });
          const updatedStudent = { ...student, history: newHistory };
          const updatedTargetMembers = [...targetAgency.members, updatedStudent];

          // C. Update Docs
          // Update Source
          batch.update(doc(db, "agencies", sourceAgency.id), { 
              members: updatedSourceMembers,
              // If source is current agency, remove request
              mercatoRequests: sourceAgency.id === agency.id 
                  ? sourceAgency.mercatoRequests.filter(r => r.id !== request.id) 
                  : sourceAgency.mercatoRequests
          });

          // Update Target
          batch.update(doc(db, "agencies", targetAgency.id), { 
              members: updatedTargetMembers,
              // If target is current agency, remove request
              mercatoRequests: targetAgency.id === agency.id 
                  ? targetAgency.mercatoRequests.filter(r => r.id !== request.id) 
                  : targetAgency.mercatoRequests
          });

          // D. Log Event
          const eventLog: GameEvent = {
              id: `vote-success-${Date.now()}`,
              date: today,
              type: 'VE_DELTA',
              label: request.type === 'HIRE' ? "Recrutement Validé" : "Départ Acté",
              description: `Décision d'équipe (Vote > ${Math.round(threshold*100)}%).`,
              deltaVE: request.type === 'HIRE' ? -5 : -15 // Penalty standard for moves
          };
          
          // Add event to the active agency (the one that voted)
          const agencyRef = doc(db, "agencies", agency.id);
          // Need to merge with previous update if same doc, but batch handles it.
          // However, we need to be careful not to overwrite the member update if agency is source or target.
          // Since we might update the same doc twice in batch logic above, simpler to just append event to the correct agency object in memory before batch update?
          // Firestore batch treats multiple updates to same doc as one merge? No, last write wins or merge.
          // Let's do a specific update for the event.
          
          // To simplify: We just pushed member updates. Let's add event to the "Active" agency (The one where vote happened)
          // If HIRE: Active = Target. If FIRE: Active = Source. So 'agency' is always the one.
          // We can combine the request removal and event log.
          
          const updatedRequests = agency.mercatoRequests.filter(r => r.id !== request.id);
          // Note: Members update is already queued above. 
          // We need to be careful. Let's reconstruct the object for the active agency properly.
          
          // Let's assume the batch handles 'update' correctly by merging fields.
          batch.update(agencyRef, {
              eventLog: [...agency.eventLog, eventLog]
          });

          toast('success', "Vote validé ! Transfert exécuté automatiquement.");

      } else {
          // JUST UPDATE VOTES
          const updatedRequests = agency.mercatoRequests.map(r => 
              r.id === requestId ? { ...r, votes: newVotes } : r
          );
          batch.update(doc(db, "agencies", agency.id), { mercatoRequests: updatedRequests });
          toast('success', "Vote enregistré.");
      }

      await batch.commit();
  };

  const resetGame = async () => {
      try { await seedDatabase(); } catch (e) { console.error(e); }
  };

  return (
    <GameContext.Provider value={{
      agencies, weeks, resources, role, selectedAgencyId, isAutoMode,
      setRole, selectAgency, toggleAutoMode, updateAgency, updateAgenciesList, updateWeek,
      addResource, deleteResource, shuffleConstraints, processFinance, processPerformance, resetGame,
      transferFunds, tradeScoreForCash, injectCapital, requestScorePurchase, handleTransactionRequest,
      submitMercatoVote
    }}>
      {children}
    </GameContext.Provider>
  );
};
