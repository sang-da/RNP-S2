
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, WikiResource } from '../types';
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
  // START WITH MOCKS TO AVOID EMPTY SCREEN
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
          console.log("Firestore empty. Attempting auto-seed...");
          seedDatabase().catch(err => {
             console.error("Auto-seed failed (likely permissions). Using Local Mocks.", err);
             // On garde les MOCK_AGENCIES par défaut
          });
        } else {
          setAgencies(agenciesData);
        }
      },
      (error) => {
        console.error("Firestore Read Error (Agencies):", error);
        // Fallback silently to Mocks, app remains usable
        toast('info', 'Mode Hors Ligne (Lecture DB impossible)');
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
        if (Object.keys(weeksData).length > 0) {
          setWeeks(weeksData);
        }
      },
      (error) => {
        console.error("Firestore Read Error (Weeks):", error);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. REAL-TIME SYNC: Resources (Wiki)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "resources"), 
      (snapshot) => {
        const resData: WikiResource[] = [];
        snapshot.forEach((doc) => {
          resData.push(doc.data() as WikiResource);
        });
        setResources(resData);
      },
      (error) => console.error("Firestore Read Error (Resources):", error)
    );
    return () => unsubscribe();
  }, []);

  // SEED FUNCTION
  const seedDatabase = async () => {
    console.log("Seeding Database...");
    const batch = writeBatch(db);
    
    // Seed Agencies
    MOCK_AGENCIES.forEach(agency => {
      const ref = doc(db, "agencies", agency.id);
      batch.set(ref, agency);
    });

    // Seed Weeks
    Object.values(INITIAL_WEEKS).forEach(week => {
      const ref = doc(db, "weeks", week.id);
      batch.set(ref, week);
    });

    await batch.commit();
    console.log("Database Seeded Successfully.");
    toast('success', 'Base de données initialisée !');
  };

  const updateAgency = async (updatedAgency: Agency) => {
    try {
        // Enforce VE Caps logic here as well
        let veCap = 100;
        const memberCount = updatedAgency.members.length;
        if (memberCount === 1) veCap = GAME_RULES.VE_CAP_1_MEMBER;
        else if (memberCount <= 3) veCap = GAME_RULES.VE_CAP_2_3_MEMBERS;
        else veCap = GAME_RULES.VE_CAP_4_PLUS_MEMBERS;

        const finalVE = Math.min(updatedAgency.ve_current, veCap);

        const agencyRef = doc(db, "agencies", updatedAgency.id);
        await updateDoc(agencyRef, { ...updatedAgency, ve_current: finalVE });
    } catch (e) {
        console.error("Error updating agency", e);
        toast('error', 'Erreur de sauvegarde (Droits insuffisants ?)');
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
      try {
          await setDoc(doc(db, "resources", resource.id), resource);
          toast('success', "Ressource ajoutée au Wiki");
      } catch (e) {
          console.error(e);
          toast('error', "Erreur ajout ressource");
      }
  };

  const deleteResource = async (id: string) => {
      try {
          await deleteDoc(doc(db, "resources", id));
          toast('success', "Ressource supprimée");
      } catch (e) {
          console.error(e);
          toast('error', "Erreur suppression ressource");
      }
  };

  const selectAgency = (id: string | null) => {
      setSelectedAgencyId(id);
  };

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
          message: "Actions déclenchées :\n1. Prélèvement Loyer (500 PiXi)\n2. Calcul auto des notes (Scaling Agressif)\n3. Paiement Salaires -> Portefeuilles\n4. Versement Subventions\n\nIrréversible.",
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

            // 1. DÉDUCTION LOYER FIXE (RENT)
            currentBudget -= GAME_RULES.AGENCY_RENT;
            logEvents.push({
                id: `fin-rent-${Date.now()}-${agency.id}`,
                date: today,
                type: 'CRISIS', // Technical crisis for negative flow
                label: 'Loyer Agence',
                deltaBudgetReal: -GAME_RULES.AGENCY_RENT,
                description: `Charges fixes hebdomadaires (-${GAME_RULES.AGENCY_RENT} PiXi).`
            });

            // 2. MISE À JOUR DES NOTES INDIVIDUELLES (PEER REVIEW) + STREAK
            const updatedMembers = agency.members.map(member => {
                const reviews = agency.peerReviews.filter(r => r.targetId === member.id);
                if (reviews.length === 0) return member;

                const totalScore = reviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0);
                const avg = totalScore / reviews.length;
                
                let scoreDelta = 0;
                let newStreak = member.streak || 0;

                // NOUVELLE LOGIQUE DE SCALING (AGRESSIVE)
                // > 4.5 : +10 (Win Streak)
                // >= 4.0 : +5
                // < 1.5 : -10 (Lose Streak)
                // Standard : +2 / -2

                if (avg > 4.5) {
                    scoreDelta = 10;
                    newStreak++; 
                } else if (avg >= 4.0) {
                    scoreDelta = 5;
                    newStreak++;
                } else if (avg < 1.5) {
                    scoreDelta = -10;
                    newStreak = 0; // Reset positive streak
                } else if (avg <= 2.5) {
                    scoreDelta = -2;
                    newStreak = 0;
                } else {
                    // Moyenne standard (2.5 à 4.0)
                    scoreDelta = 2;
                    newStreak = 0; // On ne casse pas la série, mais on ne l'incrémente pas pour le "Bonus Streak"
                }

                if (scoreDelta !== 0) {
                     const newScore = Math.max(0, Math.min(100, member.individualScore + scoreDelta));
                     return { ...member, individualScore: newScore, streak: newStreak };
                }
                return { ...member, streak: newStreak };
            });
            
            // 3. PAIEMENT DES SALAIRES
            let totalSalaryCost = 0;
            
            const membersAfterPay = updatedMembers.map(member => {
                const salary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER;
                totalSalaryCost += salary;
                
                let payment = salary;
                let walletDelta = salary;

                // Si l'agence est à sec (après loyer), on ne paie pas le salaire complet
                if (currentBudget < 0) {
                     // La dette de loyer est partagée
                     const debtShare = Math.abs(currentBudget) / updatedMembers.length;
                     // Le salaire est annulé et on prélève la dette
                     walletDelta = -debtShare; 
                     payment = 0; // Pas de sortie de cash agence pour salaire
                }

                // Update Personal Wallet
                return { ...member, wallet: (member.wallet || 0) + walletDelta };
            });

            if (currentBudget >= 0) {
                currentBudget -= totalSalaryCost;
            }

            logEvents.push({
                id: `fin-pay-${Date.now()}-${agency.id}`,
                date: today,
                type: 'PAYROLL',
                label: currentBudget < 0 ? 'Défaut de Paiement' : 'Salaires Versés',
                deltaBudgetReal: currentBudget < 0 ? 0 : -totalSalaryCost,
                description: currentBudget < 0 
                    ? `Agence en dette. Salaires suspendus et contribution solidaire prélevée sur wallets.`
                    : `Salaires versés aux membres (${totalSalaryCost} PiXi).`
            });

            // 4. REVENUS (Subvention + VE)
            const revenueVE = (agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER);
            const bonuses = agency.weeklyRevenueModifier || 0;
            const revenue = GAME_RULES.REVENUE_BASE + revenueVE + bonuses;
            
            currentBudget += revenue;

            logEvents.push({
                id: `fin-rev-${Date.now()}-${agency.id}-2`,
                date: today,
                type: 'REVENUE',
                label: 'Rentrée Subvention Hebdo',
                deltaBudgetReal: revenue,
                description: `Base (${GAME_RULES.REVENUE_BASE}) + VE (${revenueVE}) + Bonus (${bonuses}).`
            });

            // 5. SUCCESS PRIME & VE ADJUSTMENT
            let veAdjustment = 0;
            let successBonus = false;

            if (agency.ve_current >= 60 && agency.status !== 'stable') {
                successBonus = true; 
                logEvents.push({
                    id: `bonus-stable-${Date.now()}`,
                    date: today,
                    type: 'VE_DELTA',
                    label: 'Passage Statut Stable',
                    deltaVE: 0,
                    description: "L'agence devient pérenne. Bonus +2 Score pour tous."
                });
            }

            // Audit Tréso pour VE
            if (currentBudget >= 1000) {
                const bonus = Math.floor(currentBudget / 1000) * 2;
                veAdjustment += bonus;
            } else if (currentBudget < 0) {
                const debt = Math.abs(currentBudget);
                const malus = Math.ceil(debt / 1000) * 5;
                veAdjustment -= malus;
            }

            logEvents.push({
                 id: `fin-audit-${Date.now()}-${agency.id}`,
                 date: today,
                 type: veAdjustment > 0 ? 'VE_DELTA' : 'CRISIS',
                 label: 'Audit Trésorerie',
                 deltaVE: veAdjustment,
                 description: `Ajustement VE basé sur le solde de ${currentBudget} PiXi.`
            });

            const finalMembers = membersAfterPay.map(m => {
                if (successBonus) return { ...m, individualScore: Math.min(100, m.individualScore + 2) };
                return m;
            });

            // 6. VE CAPS (Plafond de Verre)
            let rawVE = Math.max(0, agency.ve_current + veAdjustment);
            let veCap = 100;
            const memberCount = agency.members.length;
            if (memberCount === 1) veCap = GAME_RULES.VE_CAP_1_MEMBER;
            else if (memberCount <= 3) veCap = GAME_RULES.VE_CAP_2_3_MEMBERS;
            else veCap = GAME_RULES.VE_CAP_4_PLUS_MEMBERS;
            
            const finalVE = Math.min(rawVE, veCap);

            // Update Doc
            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                budget_real: currentBudget,
                eventLog: [...agency.eventLog, ...logEvents],
                ve_current: finalVE,
                members: finalMembers,
                status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique'
            });
        });

        await batch.commit();
        toast('success', 'Clôture hebdomadaire et paie effectuées.');
      } catch(e) {
          console.error(e);
          toast('error', "Erreur lors de la clôture (Droits ?)");
      }
  };

  const resetGame = async () => {
      try {
        await seedDatabase();
      } catch (e) {
        console.error(e);
        toast('error', "Impossible de réinitialiser la DB.");
      }
  };

  return (
    <GameContext.Provider value={{
      agencies,
      weeks,
      resources,
      role,
      selectedAgencyId,
      setRole,
      selectAgency,
      updateAgency,
      updateAgenciesList,
      updateWeek,
      addResource,
      deleteResource,
      shuffleConstraints,
      processWeekFinance,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
};
