import { writeBatch, doc, updateDoc, db } from '../../services/firebase';
import { Agency, GameEvent, TransactionRequest } from '../../types';
import { GAME_RULES } from '../../constants';

export const useFinanceLogic = (agencies: Agency[], toast: (type: string, msg: string) => void) => {

  const processFinance = async (targetClass: 'A' | 'B' | 'ALL') => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        let processedCount = 0;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            // Support pour 'ALL' ou match de classe spécifique
            if (targetClass !== 'ALL' && agency.classId !== targetClass) return;
            
            processedCount++;

            let currentBudget = agency.budget_real;
            let logEvents: GameEvent[] = [];
            let agencyMembers = [...(agency.members || [])];

            // 1. REVENUES
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
                currentBudget -= rent;
                logEvents.push({ id: `fin-rent-${Date.now()}-${agency.id}`, date: today, type: 'CRISIS', label: 'Loyer Agence', deltaBudgetReal: -rent, description: `Prélèvement automatique.` });
            } else {
                const paidByAgency = Math.max(0, currentBudget); 
                const deficit = rent - paidByAgency;
                currentBudget -= paidByAgency; 
                
                const membersCount = Math.max(1, agencyMembers.length);
                const sharePerStudent = Math.ceil(deficit / membersCount);

                logEvents.push({ 
                    id: `fin-rent-solidarity-${Date.now()}-${agency.id}`, 
                    date: today, 
                    type: 'CRISIS', 
                    label: 'CLAUSE SOLIDARITÉ', 
                    deltaBudgetReal: -paidByAgency, 
                    description: `Défaut de paiement. ${sharePerStudent} PiXi saisis sur chaque membre.` 
                });

                agencyMembers = agencyMembers.map(m => ({
                    ...m,
                    wallet: (m.wallet || 0) - sharePerStudent
                }));
            }

            // 3. SALARIES
            let actualDisbursed = 0;
            if (currentBudget >= 0) {
                agencyMembers = agencyMembers.map(member => {
                    const rawSalary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER; 
                    const pay = Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
                    actualDisbursed += pay;
                    return { ...member, wallet: (member.wallet || 0) + pay };
                });
                
                currentBudget -= actualDisbursed;
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires', deltaBudgetReal: -actualDisbursed, description: `Salaires versés.` });
            } else {
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires Gelés', deltaBudgetReal: 0, description: `Dette active. Pas de salaire.` });
            }

            // 4. COST OF LIVING
            agencyMembers = agencyMembers.map(member => {
                let newWallet = (member.wallet || 0) - GAME_RULES.COST_OF_LIVING;
                let newScore = member.individualScore;
                if (newWallet < 0) {
                    newScore = Math.max(0, newScore - GAME_RULES.POVERTY_SCORE_PENALTY);
                }
                return { ...member, wallet: newWallet, individualScore: newScore };
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
            toast('success', `Finance ${targetClass}: Traitement de ${processedCount} agences terminé.`);
        } else {
            toast('info', "Aucune agence à traiter pour ce filtre.");
        }
      } catch(e) { console.error(e); toast('error', "Erreur technique Finance"); }
  };

  const transferFunds = async (sourceId: string, targetId: string, amount: number) => { 
      const sourceAgency = agencies.find(a => a.members.some(m => m.id === sourceId));
      if (!sourceAgency) return;
      
      const sourceStudent = sourceAgency.members.find(m => m.id === sourceId);
      if(!sourceStudent || (sourceStudent.wallet || 0) < amount) {
          toast('error', "Fonds insuffisants.");
          return;
      }

      const targetAgency = agencies.find(a => a.members.some(m => m.id === targetId));
      if(!targetAgency) return;

      const batch = writeBatch(db);

      const updatedSourceMembers = sourceAgency.members.map(m => 
          m.id === sourceId 
          ? { ...m, wallet: (m.wallet || 0) - amount } 
          : m
      );
      batch.update(doc(db, "agencies", sourceAgency.id), { members: updatedSourceMembers });

      const updatedTargetMembers = targetAgency.members.map(m => m.id === targetId ? { ...m, wallet: (m.wallet || 0) + amount } : m);
      batch.update(doc(db, "agencies", targetAgency.id), { members: updatedTargetMembers });

      await batch.commit();
      toast('success', `Virement de ${amount} PiXi effectué.`);
  };

  const injectCapital = async (studentId: string, agencyId: string, amount: number) => { 
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if(!student || (student.wallet || 0) < amount) {
          toast('error', "Fonds insuffisants.");
          return;
      }
      
      const tax = Math.floor(amount * GAME_RULES.INJECTION_TAX);
      const netInjection = amount - tax;

      const batch = writeBatch(db);
      const updatedMembers = agency.members.map(m => 
          m.id === studentId 
          ? { ...m, wallet: (m.wallet || 0) - amount } 
          : m
      );
      
      const today = new Date().toISOString().split('T')[0];
      const newEvent: GameEvent = {
          id: `inj-${Date.now()}`,
          date: today,
          type: 'INFO',
          label: 'Injection Capital',
          deltaBudgetReal: netInjection,
          description: `${student.name} injecte ${amount} PiXi (Taxe: ${tax}).`
      };

      batch.update(doc(db, "agencies", agency.id), { 
          members: updatedMembers, 
          budget_real: agency.budget_real + netInjection,
          eventLog: [...agency.eventLog, newEvent] 
      });
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

  return { processFinance, transferFunds, injectCapital, requestScorePurchase, handleTransactionRequest };
};