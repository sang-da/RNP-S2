
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
        const agencyRef = doc(db, "agencies", updatedAgency.id);
        await updateDoc(agencyRef, { ...updatedAgency });
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
          title: "Clôture Hebdomadaire",
          message: "Vous allez déclencher la paye des salaires et le versement des subventions pour TOUTES les agences.\n\nCette action est irréversible.",
          confirmText: "Déclencher la Paye",
          isDangerous: false
      });

      if (!confirmed) return;

      const today = new Date().toISOString().split('T')[0];
      
      try {
        const batch = writeBatch(db);

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;

            // 1. Salaires Brut
            const rawSalary = agency.members.reduce((acc, member) => {
                return acc + (member.individualScore * GAME_RULES.SALARY_MULTIPLIER);
            }, 0);

            // 2. Charges Hebdo (Taxes)
            const taxAmount = rawSalary * (agency.weeklyTax || 0);
            const totalPayroll = rawSalary + taxAmount;
            
            const payrollEvent: GameEvent = {
                id: `fin-pay-${Date.now()}-${agency.id}`,
                date: today,
                type: 'PAYROLL',
                label: 'Salaires + Charges',
                deltaBudgetReal: -totalPayroll,
                description: `Salaires (${rawSalary}) + Charges ${(agency.weeklyTax || 0)*100}% (${taxAmount})`
            };

            // 3. Revenus
            const revenue = GAME_RULES.REVENUE_BASE + (agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER);
            const revenueEvent: GameEvent = {
                id: `fin-rev-${Date.now()}-${agency.id}-2`,
                date: today,
                type: 'REVENUE',
                label: 'Rentrée Subvention Hebdo',
                deltaBudgetReal: revenue,
                description: `Fin de session : Subvention (${GAME_RULES.REVENUE_BASE}) + Prime (${agency.ve_current} VE).`
            };

            // 4. Calcul Budget
            let newBudget = agency.budget_real - totalPayroll + revenue;

            // 5. Audit & Ajustement VE
            let veAdjustment = 0;
            let auditLabel = "Audit Trésorerie Neutre";

            if (newBudget >= 1000) {
                const bonus = Math.floor(newBudget / 1000) * 2;
                veAdjustment = bonus;
                auditLabel = `Bonus Trésorerie (+${bonus} VE)`;
            } else if (newBudget < 0) {
                const debt = Math.abs(newBudget);
                const malus = Math.ceil(debt / 1000) * 5;
                veAdjustment = -malus;
                auditLabel = `Dette Critique (-${malus} VE)`;
            }

            const auditEvent: GameEvent = {
                 id: `fin-audit-${Date.now()}-${agency.id}`,
                 date: today,
                 type: veAdjustment > 0 ? 'VE_DELTA' : 'CRISIS',
                 label: auditLabel,
                 deltaVE: veAdjustment,
                 description: `Ajustement VE basé sur le solde de ${newBudget} PiXi.`
            };

            const newEvents = [...agency.eventLog, payrollEvent, revenueEvent, auditEvent];
            const newVE = Math.max(0, agency.ve_current + veAdjustment);

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                budget_real: newBudget,
                eventLog: newEvents,
                ve_current: newVE
            });
        });

        await batch.commit();
        toast('success', 'Comptabilité hebdomadaire effectuée avec succès.');
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
