
import { writeBatch, doc, updateDoc, db } from '../../services/firebase';
import { Agency, GameEvent, TransactionRequest } from '../../types';
import { GAME_RULES, BADGE_DEFINITIONS } from '../../constants';

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
            let totalVeBonusFromTalent = 0;

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
                description: `Facturation client (VE: ${agency.ve_current.toFixed(1)}).` 
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

            // 3. RNP BANK : SAVINGS INTERESTS & SALARIES & GARNISHMENT
            let actualDisbursed = 0;
            const SCORE_THRESHOLD_FOR_VE = 80;
            const VE_CONVERSION_RATE = 10; // 10 points over 80 = 1 VE

            if (currentBudget >= 0) {
                agencyMembers = agencyMembers.map(member => {
                    // A. Intérêts Épargne (10%)
                    let currentSavings = member.savings || 0;
                    if (currentSavings > 0) {
                        const interest = Math.floor(currentSavings * 0.10);
                        currentSavings += interest;
                    }

                    // B. Calcul Salaire
                    const rawSalary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER; 
                    const grossSalary = Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
                    
                    // C. Saisie sur salaire pour Dette (Garnishment)
                    let netSalary = grossSalary;
                    let currentDebt = member.loanDebt || 0;
                    let debtRepayment = 0;

                    if (currentDebt > 0) {
                        // On saisit tout le salaire jusqu'à remboursement total
                        const seizure = Math.min(netSalary, currentDebt);
                        currentDebt -= seizure;
                        netSalary -= seizure;
                        debtRepayment = seizure;
                    }

                    // D. Calculate Surplus Score for VE Conversion
                    if (member.individualScore > SCORE_THRESHOLD_FOR_VE) {
                        const surplus = member.individualScore - SCORE_THRESHOLD_FOR_VE;
                        const veGain = surplus / VE_CONVERSION_RATE;
                        totalVeBonusFromTalent += veGain;
                    }

                    actualDisbursed += grossSalary; // L'agence paie le brut, peu importe si l'étudiant rembourse sa dette perso
                    
                    return { 
                        ...member, 
                        wallet: (member.wallet || 0) + netSalary,
                        savings: currentSavings,
                        loanDebt: currentDebt
                    };
                });
                
                currentBudget -= actualDisbursed;
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires & Banque', deltaBudgetReal: -actualDisbursed, description: `Salaires versés. Intérêts épargne crédités. Saisies sur dettes effectuées.` });
            } else {
                logEvents.push({ id: `fin-pay-${Date.now()}-${agency.id}`, date: today, type: 'PAYROLL', label: 'Salaires Gelés', deltaBudgetReal: 0, description: `Dette active. Pas de salaire.` });
            }

            // 4. APPLY TALENT VE BONUS
            let finalVe = agency.ve_current;
            if (totalVeBonusFromTalent > 0) {
                finalVe += totalVeBonusFromTalent;
                logEvents.push({
                    id: `fin-talent-${Date.now()}-${agency.id}`,
                    date: today,
                    type: 'VE_DELTA',
                    label: 'Dividende Talents',
                    deltaVE: parseFloat(totalVeBonusFromTalent.toFixed(2)),
                    description: `Conversion des scores > 80 en VE (${totalVeBonusFromTalent.toFixed(2)} pts).`
                });
            }

            // 5. COST OF LIVING & UNICORN BADGE
            let unicornAwarded = false;
            agencyMembers = agencyMembers.map(member => {
                let newWallet = (member.wallet || 0) - GAME_RULES.COST_OF_LIVING;
                let newScore = member.individualScore;
                let memberBadges = [...(member.badges || [])];

                // Check Poverty
                if (newWallet < 0) {
                    newScore = Math.max(0, newScore - GAME_RULES.POVERTY_SCORE_PENALTY);
                }

                // Check Unicorn (Wealthy) Badge
                // Seuil 20k dans la trésorerie Agence
                if (currentBudget > 20000 && !memberBadges.find(b => b.id === 'wealthy')) {
                    const badgeDef = BADGE_DEFINITIONS.find(b => b.id === 'wealthy');
                    if (badgeDef) {
                        memberBadges.push(badgeDef);
                        newScore = Math.min(100, newScore + 5); // +5 Score Bonus
                        unicornAwarded = true;
                    }
                }

                return { ...member, wallet: newWallet, individualScore: newScore, badges: memberBadges };
            });

            if (unicornAwarded) {
                logEvents.push({
                    id: `badge-unicorn-${Date.now()}-${agency.id}`,
                    date: today,
                    type: 'INFO',
                    label: 'Statut Licorne Atteint',
                    deltaVE: 0,
                    description: `Trésorerie > 20k. Badge Licorne + Bonus Score distribués.`
                });
            }

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                budget_real: currentBudget,
                ve_current: finalVe,
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
      const targetStudent = targetAgency.members.find(m => m.id === targetId);

      const batch = writeBatch(db);

      const updatedSourceMembers = sourceAgency.members.map(m => 
          m.id === sourceId 
          ? { ...m, wallet: (m.wallet || 0) - amount } 
          : m
      );
      
      // LOG THE TRANSFER IN SOURCE AGENCY HISTORY TO TRACK IT
      const transferLog: GameEvent = {
          id: `tx-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'INFO',
          label: 'Virement P2P (Sortant)',
          deltaBudgetReal: 0,
          description: `${sourceStudent.name} -> ${targetStudent?.name} : -${amount} PiXi`
      };
      
      batch.update(doc(db, "agencies", sourceAgency.id), { 
          members: updatedSourceMembers,
          eventLog: [...sourceAgency.eventLog, transferLog]
      });

      const updatedTargetMembers = targetAgency.members.map(m => m.id === targetId ? { ...m, wallet: (m.wallet || 0) + amount } : m);
      
      // IF TARGET AGENCY IS DIFFERENT, LOG RECEIPT TOO
      if (sourceAgency.id !== targetAgency.id) {
          const receiptLog: GameEvent = {
              id: `tx-rx-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'INFO',
              label: 'Virement P2P (Reçu)',
              deltaBudgetReal: 0,
              description: `${targetStudent?.name} <- ${sourceStudent.name} : +${amount} PiXi`
          };
          batch.update(doc(db, "agencies", targetAgency.id), { 
              members: updatedTargetMembers,
              eventLog: [...targetAgency.eventLog, receiptLog]
          });
      } else {
          const finalMembers = updatedSourceMembers.map(m => m.id === targetId ? { ...m, wallet: (m.wallet || 0) + amount } : m);
          batch.update(doc(db, "agencies", sourceAgency.id), { members: finalMembers });
      }

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

  const manageSavings = async (studentId: string, agencyId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW') => {
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if (!student) return;

      const wallet = student.wallet || 0;
      const savings = student.savings || 0;

      let newWallet = wallet;
      let newSavings = savings;

      if (type === 'DEPOSIT') {
          if (amount > wallet) { toast('error', 'Fonds insuffisants'); return; }
          newWallet -= amount;
          newSavings += amount;
      } else {
          if (amount > savings) { toast('error', 'Épargne insuffisante'); return; }
          newWallet += amount;
          newSavings -= amount;
      }

      const updatedMembers = agency.members.map(m => 
          m.id === studentId ? { ...m, wallet: newWallet, savings: newSavings } : m
      );

      await updateDoc(doc(db, "agencies", agencyId), { members: updatedMembers });
      toast('success', type === 'DEPOSIT' ? `Placé : ${amount} PiXi` : `Retiré : ${amount} PiXi`);
  };

  const manageLoan = async (studentId: string, agencyId: string, amount: number, type: 'TAKE' | 'REPAY') => {
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if (!student) return;

      const wallet = student.wallet || 0;
      const debt = student.loanDebt || 0;
      
      let newWallet = wallet;
      let newDebt = debt;
      let logEvent: GameEvent | null = null;

      if (type === 'TAKE') {
          // Capacité d'emprunt = (Score * 30) - Dette Actuelle
          const maxCapacity = (student.individualScore * 30) - debt;
          if (amount > maxCapacity) { toast('error', `Capacité dépassée (Max: ${maxCapacity})`); return; }
          
          // Cout du prêt = 50% d'intérêts immédiats
          // Emprunte 1000 -> Reçoit 1000, Dette monte de 1500
          newWallet += amount;
          newDebt += Math.floor(amount * 1.5);

          logEvent = {
              id: `loan-take-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'INFO', // On utilise INFO pour ne pas polluer les crises, mais c'est un event majeur
              label: 'Prêt Étudiant Accordé',
              deltaBudgetReal: 0,
              description: `${student.name} emprunte ${amount} PiXi. Dette totale: ${newDebt}.`
          };

      } else {
          // Repayment
          const repaymentAmount = Math.min(amount, debt); // On ne peut pas rembourser plus que la dette
          if (repaymentAmount > wallet) { toast('error', 'Fonds insuffisants pour rembourser'); return; }
          
          newWallet -= repaymentAmount;
          newDebt -= repaymentAmount;

          logEvent = {
              id: `loan-repay-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'INFO',
              label: 'Remboursement Anticipé',
              deltaBudgetReal: 0,
              description: `${student.name} rembourse ${repaymentAmount} PiXi. Reste dû: ${newDebt}.`
          };
      }

      const updatedMembers = agency.members.map(m => 
          m.id === studentId ? { ...m, wallet: newWallet, loanDebt: newDebt } : m
      );

      // On update les membres ET on ajoute un log pour l'admin
      await updateDoc(doc(db, "agencies", agencyId), { 
          members: updatedMembers,
          eventLog: logEvent ? [...agency.eventLog, logEvent] : agency.eventLog
      });
      
      toast('success', type === 'TAKE' ? `Crédit accepté (+${amount} cash)` : `Dette remboursée (-${amount})`);
  };

  return { processFinance, transferFunds, injectCapital, requestScorePurchase, handleTransactionRequest, manageSavings, manageLoan };
};
