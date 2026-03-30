
import { writeBatch, doc, db, runTransaction, updateDoc } from '../../services/firebase';
import { Agency, GameEvent, TransactionRequest } from '../../types';
import { GAME_RULES, BADGE_DEFINITIONS, HOLDING_RULES } from '../../constants';

export const useFinanceLogic = (
    agencies: Agency[], 
    toast: (type: string, msg: string) => void,
    role: 'admin' | 'student',
    dispatchAction: (type: string, payload: any, studentId: string, agencyId: string) => Promise<void>
) => {

  const processFinance = async (targetClass: 'A' | 'B' | 'ALL') => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        let processedCount = 0;
        let totalGarnishedForCentralBank = 0;

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
            let multiplier = GAME_RULES.REVENUE_VE_MULTIPLIER;
            
            // LOGIQUE HOLDING : MULTIPLICATEUR DYNAMIQUE
            if (agency.type === 'HOLDING') {
                const history = agency.ve_history || [];
                // On regarde la croissance sur la dernière semaine enregistrée
                // Si pas assez d'historique, on applique le standard
                if (history.length >= 2) {
                    const lastVE = history[history.length - 1].value;
                    const prevVE = history[history.length - 2].value;
                    const growth = lastVE - prevVE;

                    if (growth >= 10) {
                        multiplier = HOLDING_RULES.REVENUE_MULTIPLIER_PERFORMANCE; // 70
                    } else if (growth >= HOLDING_RULES.GROWTH_TARGET) {
                        multiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD; // 50
                    } else {
                        multiplier = 30; // Pénalité si croissance < 5
                        logEvents.push({ 
                            id: `hold-pen-${Date.now()}-${agency.id}`, 
                            date: today, 
                            type: 'CRISIS', 
                            label: 'Croissance Insuffisante', 
                            deltaBudgetReal: 0, 
                            description: `Objectif +5 VE raté (${growth > 0 ? '+' : ''}${growth.toFixed(1)} VE). Revenus sanctionnés.` 
                        });
                    }
                } else {
                    multiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD;
                }
            }

            const revenueVE = (agency.ve_current * multiplier);
            const bonuses = agency.weeklyRevenueModifier || 0;
            const totalRevenue = Math.round(revenueVE + bonuses + GAME_RULES.REVENUE_BASE);
            
            currentBudget = Math.round(currentBudget + totalRevenue);
            logEvents.push({ 
                id: `fin-rev-${Date.now()}-${agency.id}`, 
                date: today, 
                type: 'REVENUE', 
                label: 'Recettes', 
                deltaBudgetReal: totalRevenue, 
                description: `Facturation client (VE: ${agency.ve_current.toFixed(1)} x ${multiplier}).` 
            });

            // 1.5 HOLDING DIVIDENDS (SENIOR PARTNERS)
            if (agency.type === 'HOLDING' && agency.seniorityMap) {
                const seniorMembers = agencyMembers.filter(m => agency.seniorityMap?.[m.id] === 'SENIOR');
                
                if (seniorMembers.length > 0) {
                    let dividendRate = HOLDING_RULES.DIVIDEND_RATE_LOW;
                    if (agency.ve_current >= 80) dividendRate = HOLDING_RULES.DIVIDEND_RATE_HIGH;
                    else if (agency.ve_current >= 60) dividendRate = HOLDING_RULES.DIVIDEND_RATE_MID;

                    const totalDividends = Math.floor(totalRevenue * dividendRate);
                    const perSenior = Math.floor(totalDividends / seniorMembers.length);

                    if (totalDividends > 0) {
                        currentBudget = Math.round(currentBudget - totalDividends);
                        agencyMembers = agencyMembers.map(m => {
                            if (agency.seniorityMap?.[m.id] === 'SENIOR') {
                                return { ...m, wallet: Math.round((m.wallet || 0) + perSenior) };
                            }
                            return m;
                        });

                        logEvents.push({ 
                            id: `div-pay-${Date.now()}-${agency.id}`, 
                            date: today, 
                            type: 'REVENUE', 
                            label: 'Dividendes Seniors', 
                            deltaBudgetReal: -totalDividends, 
                            description: `Distribution de ${(dividendRate * 100).toFixed(0)}% du CA aux Seniors (+${perSenior} PiXi/pers).` 
                        });
                    }
                }
            }

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
                    wallet: Math.round((m.wallet || 0) - sharePerStudent)
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
                    const rawSalary = Math.round(member.individualScore * GAME_RULES.SALARY_MULTIPLIER); 
                    const grossSalary = Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
                    
                    // C. Saisie sur salaire pour Dette (Garnishment)
                    let netSalary = Math.round(grossSalary);
                    let currentDebt = Math.round(member.loanDebt || 0);
                    let debtRepayment = 0;

                    if (currentDebt > 0) {
                        // On saisit tout le salaire jusqu'à remboursement total
                        const seizure = Math.min(netSalary, currentDebt);
                        currentDebt = Math.round(currentDebt - seizure);
                        netSalary = Math.round(netSalary - seizure);
                        debtRepayment = Math.round(seizure);
                        totalGarnishedForCentralBank = Math.round(totalGarnishedForCentralBank + seizure);
                    }

                    // D. Calculate Surplus Score for VE Conversion
                    if (member.individualScore > SCORE_THRESHOLD_FOR_VE) {
                        const surplus = member.individualScore - SCORE_THRESHOLD_FOR_VE;
                        const veGain = surplus / VE_CONVERSION_RATE;
                        totalVeBonusFromTalent += veGain;
                    }

                    actualDisbursed = Math.round(actualDisbursed + grossSalary); // L'agence paie le brut, peu importe si l'étudiant rembourse sa dette perso
                    
                    return { 
                        ...member, 
                        wallet: Math.round((member.wallet || 0) + netSalary),
                        savings: Math.round(currentSavings),
                        loanDebt: Math.round(currentDebt)
                    };
                });
                
                currentBudget = Math.round(currentBudget - actualDisbursed);
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
                let newWallet = Math.round((member.wallet || 0) - GAME_RULES.COST_OF_LIVING);
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

            // 6. CHECK BANKRUPTCY (HOLDING vs AGENCY)
            const bankruptcyLimit = agency.type === 'HOLDING' 
                ? GAME_RULES.BANKRUPTCY_THRESHOLD_HOLDING 
                : GAME_RULES.BANKRUPTCY_THRESHOLD;

            let finalStatus = agency.status;
            if (currentBudget < bankruptcyLimit) {
                finalStatus = 'critique';
                logEvents.push({
                    id: `bankrupt-${Date.now()}-${agency.id}`,
                    date: today,
                    type: 'CRISIS',
                    label: 'FAILLITE IMMINENTE',
                    deltaBudgetReal: 0,
                    description: `Seuil critique (${bankruptcyLimit} PiXi) dépassé. Risque de dissolution.`
                });
            }

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                budget_real: currentBudget,
                ve_current: finalVe,
                members: agencyMembers,
                eventLog: [...agency.eventLog, ...logEvents],
                status: finalStatus
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            
            if (totalGarnishedForCentralBank > 0) {
                // Update central bank in a separate transaction to avoid mixing batch and transaction
                await runTransaction(db, async (transaction) => {
                    const cbRef = doc(db, "globals", "central_bank");
                    const cbDoc = await transaction.get(cbRef);
                    const currentTreasury = cbDoc.exists ? cbDoc.data().treasury || 0 : 0;
                    transaction.set(cbRef, { treasury: currentTreasury + totalGarnishedForCentralBank }, { merge: true });
                });
            }

            toast('success', `Finance ${targetClass}: Traitement de ${processedCount} agences terminé.`);
        } else {
            toast('info', "Aucune agence à traiter pour ce filtre.");
        }
      } catch(e) { console.error(e); toast('error', "Erreur technique Finance"); }
  };

  const executeTransferFunds = async (sourceId: string, targetId: string, amount: number) => { 
      try {
        await runTransaction(db, async (transaction) => {
            // 1. READ LATEST DATA
            // We need to find which agency the students belong to. 
            // Since we don't know the agency IDs upfront easily without the stale 'agencies' prop, 
            // we might need to rely on the passed 'agencies' prop just to find the IDs, 
            // but then READ the docs within transaction to get fresh data.
            
            const sourceAgencyInfo = agencies.find(a => a.members.some(m => m.id === sourceId));
            const targetAgencyInfo = agencies.find(a => a.members.some(m => m.id === targetId));

            if (!sourceAgencyInfo || !targetAgencyInfo) throw new Error("Agence introuvable");

            const sourceAgencyRef = doc(db, "agencies", sourceAgencyInfo.id);
            const targetAgencyRef = doc(db, "agencies", targetAgencyInfo.id);

            const sourceDoc = await transaction.get(sourceAgencyRef);
            const targetDoc = (sourceAgencyInfo.id === targetAgencyInfo.id) ? sourceDoc : await transaction.get(targetAgencyRef);

            if (!sourceDoc.exists) throw new Error("Agence source n'existe plus");
            if (!targetDoc.exists) throw new Error("Agence cible n'existe plus");

            const sourceData = sourceDoc.data() as Agency;
            const targetData = (sourceAgencyInfo.id === targetAgencyInfo.id) ? sourceData : targetDoc.data() as Agency;

            const sourceStudent = sourceData.members.find(m => m.id === sourceId);
            const targetStudent = targetData.members.find(m => m.id === targetId);

            if (!sourceStudent) throw new Error("Étudiant source introuvable");
            if (!targetStudent) throw new Error("Étudiant cible introuvable");

            if ((sourceStudent.wallet || 0) < amount) throw new Error("Fonds insuffisants");

            // 2. PERFORM UPDATES
            // Update Source
            const updatedSourceMembers = sourceData.members.map(m => 
                m.id === sourceId 
                ? { ...m, wallet: (m.wallet || 0) - amount } 
                : m
            );

            const transferLog: GameEvent = {
                id: `tx-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'INFO',
                label: 'Virement P2P (Sortant)',
                deltaBudgetReal: 0,
                description: `${sourceStudent.name} -> ${targetStudent.name} : -${amount} PiXi`
            };

            // Update Target
            let finalSourceMembers = updatedSourceMembers;
            let finalTargetMembers = targetData.members;
            let finalSourceLog = [...sourceData.eventLog, transferLog];
            let finalTargetLog = targetData.eventLog;

            if (sourceAgencyInfo.id === targetAgencyInfo.id) {
                // Same Agency
                finalSourceMembers = finalSourceMembers.map(m => 
                    m.id === targetId 
                    ? { ...m, wallet: (m.wallet || 0) + amount } 
                    : m
                );
                // No need to update targetData separately
            } else {
                // Different Agencies
                finalTargetMembers = targetData.members.map(m => 
                    m.id === targetId 
                    ? { ...m, wallet: (m.wallet || 0) + amount } 
                    : m
                );

                const receiptLog: GameEvent = {
                    id: `tx-rx-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    type: 'INFO',
                    label: 'Virement P2P (Reçu)',
                    deltaBudgetReal: 0,
                    description: `${targetStudent.name} <- ${sourceStudent.name} : +${amount} PiXi`
                };
                finalTargetLog = [...targetData.eventLog, receiptLog];
            }

            // 3. WRITE BACK
            transaction.update(sourceAgencyRef, { 
                members: finalSourceMembers,
                eventLog: finalSourceLog
            });

            if (sourceAgencyInfo.id !== targetAgencyInfo.id) {
                transaction.update(targetAgencyRef, {
                    members: finalTargetMembers,
                    eventLog: finalTargetLog
                });
            }
        });
        toast('success', `Virement de ${amount} PiXi effectué.`);
      } catch (e: any) {
          console.error("Transfer Error:", e);
          toast('error', `Erreur virement: ${e.message}`);
      }
  };

  const transferFunds = async (sourceId: string, targetId: string, amount: number) => {
      // Exécution directe pour les étudiants
      await executeTransferFunds(sourceId, targetId, amount);
  };

  const executeInjectCapital = async (studentId: string, agencyId: string, amount: number) => { 
      try {
        await runTransaction(db, async (transaction) => {
            const agencyRef = doc(db, "agencies", agencyId);
            const agencyDoc = await transaction.get(agencyRef);
            
            if (!agencyDoc.exists) throw new Error("Agence introuvable");
            
            const agencyData = agencyDoc.data() as Agency;
            const student = agencyData.members.find(m => m.id === studentId);
            
            if (!student) throw new Error("Étudiant introuvable dans cette agence");
            if ((student.wallet || 0) < amount) throw new Error("Fonds insuffisants");

            // LOGIQUE TAXE CUMULATIVE
            const previousInjection = student.cumulativeInjection || 0;
            const newTotalInjection = previousInjection + amount;
            
            const totalTaxDue = Math.floor(newTotalInjection * GAME_RULES.INJECTION_TAX);
            const previousTaxPaid = Math.floor(previousInjection * GAME_RULES.INJECTION_TAX);
            
            const currentTax = Math.round(totalTaxDue - previousTaxPaid);
            const netInjection = Math.round(amount - currentTax);

            const updatedMembers = agencyData.members.map(m => 
                m.id === studentId 
                ? { 
                    ...m, 
                    wallet: Math.round((m.wallet || 0) - amount),
                    cumulativeInjection: newTotalInjection
                  } 
                : m
            );
            
            const today = new Date().toISOString().split('T')[0];
            const newEvent: GameEvent = {
                id: `inj-${Date.now()}`,
                date: today,
                type: 'INFO',
                label: 'Injection Capital (Taxe Cumulative)',
                deltaBudgetReal: Math.round(netInjection),
                description: `${student.name} injecte ${amount} PiXi (Taxe ajustée: ${currentTax}).`
            };

            transaction.update(agencyRef, { 
                members: updatedMembers, 
                budget_real: Math.round(agencyData.budget_real + netInjection),
                eventLog: [...agencyData.eventLog, newEvent] 
            });
        });
        // Note: We can't easily get netInjection out of transaction to toast exact amount without refactoring, 
        // but we can approximate or just say success.
        toast('success', `Injection de capital effectuée.`);
      } catch (e: any) {
          console.error("Injection Error:", e);
          toast('error', `Erreur injection: ${e.message}`);
      }
  };

  const injectCapital = async (studentId: string, agencyId: string, amount: number) => {
      // Exécution directe pour que les étudiants n'aient pas à attendre que l'admin soit en ligne
      await executeInjectCapital(studentId, agencyId, amount);
  };

  const executeRequestScorePurchase = async (studentId: string, agencyId: string, amountPixi: number, amountScore: number) => { 
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;

              const student = agency.members.find(m => m.id === studentId);
              if (!student) throw new Error("Étudiant introuvable");

              const newRequest: TransactionRequest = { 
                  id: `req-score-${Date.now()}`, 
                  studentId, 
                  studentName: student.name, 
                  type: 'BUY_SCORE', 
                  amountPixi, 
                  amountScore, 
                  status: 'PENDING', 
                  date: new Date().toISOString().split('T')[0] 
              };

              transaction.update(agencyRef, { 
                  transactionRequests: [...(agency.transactionRequests || []), newRequest] 
              });
          });
          toast('success', "Demande envoyée");
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const requestScorePurchase = async (studentId: string, agencyId: string, amountPixi: number, amountScore: number) => {
      // Exécution directe pour que la demande apparaisse immédiatement
      await executeRequestScorePurchase(studentId, agencyId, amountPixi, amountScore);
  };

  const handleTransactionRequest = async (agencyId: string, request: TransactionRequest, approved: boolean) => {
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;

              const updatedRequests = (agency.transactionRequests || []).filter(r => r.id !== request.id);
              
              if (!approved) { 
                  transaction.update(agencyRef, { transactionRequests: updatedRequests }); 
                  return; 
              }
              
              const updatedMembers = agency.members.map(m => 
                  m.id === request.studentId ? { 
                      ...m, 
                      wallet: (m.wallet || 0) - request.amountPixi, 
                      individualScore: Math.min(100, m.individualScore + request.amountScore) 
                  } : m
              );
              
              transaction.update(agencyRef, { 
                  transactionRequests: updatedRequests, 
                  members: updatedMembers 
              });
          });
          toast('success', "Transaction traitée");
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const executeManageSavings = async (studentId: string, agencyId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW') => {
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;
              
              const student = agency.members.find(m => m.id === studentId);
              if (!student) throw new Error("Étudiant introuvable");

              const wallet = student.wallet || 0;
              const savings = student.savings || 0;

              let newWallet = wallet;
              let newSavings = savings;

              if (type === 'DEPOSIT') {
                  if (amount > wallet) throw new Error('Fonds insuffisants');
                  newWallet -= amount;
                  newSavings += amount;
              } else {
                  if (amount > savings) throw new Error('Épargne insuffisante');
                  newWallet += amount;
                  newSavings -= amount;
              }

              const updatedMembers = agency.members.map(m => 
                  m.id === studentId ? { ...m, wallet: newWallet, savings: newSavings } : m
              );

              transaction.update(agencyRef, { members: updatedMembers });
          });
          toast('success', type === 'DEPOSIT' ? `Placé : ${amount} PiXi` : `Retiré : ${amount} PiXi`);
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const manageSavings = async (studentId: string, agencyId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAW') => {
      // Exécution directe pour les étudiants
      await executeManageSavings(studentId, agencyId, amount, type);
  };

  const executeManageLoan = async (studentId: string, agencyId: string, amount: number, type: 'TAKE' | 'REPAY') => {
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;
              
              const student = agency.members.find(m => m.id === studentId);
              if (!student) throw new Error("Étudiant introuvable");

              const cbRef = doc(db, "globals", "central_bank");
              const cbDoc = await transaction.get(cbRef);
              let cbTreasury = cbDoc.exists ? cbDoc.data().treasury || 0 : 0;

              const wallet = student.wallet || 0;
              const debt = student.loanDebt || 0;
              
              let newWallet = wallet;
              let newDebt = debt;
              let logEvent: GameEvent | null = null;

              if (type === 'TAKE') {
                  const maxCapacity = (student.individualScore * 30) - debt;
                  if (amount > maxCapacity) throw new Error(`Capacité dépassée (Max: ${maxCapacity})`);
                  
                  newWallet += amount;
                  newDebt += Math.floor(amount * 1.5);
                  cbTreasury -= amount;

                  logEvent = {
                      id: `loan-take-${Date.now()}`,
                      date: new Date().toISOString().split('T')[0],
                      type: 'INFO', 
                      label: 'Prêt Étudiant Accordé',
                      deltaBudgetReal: 0,
                      description: `${student.name} emprunte ${amount} PiXi. Dette totale: ${newDebt}.`
                  };

              } else {
                  const repaymentAmount = Math.min(amount, debt); 
                  if (repaymentAmount > wallet) throw new Error('Fonds insuffisants pour rembourser');
                  
                  newWallet -= repaymentAmount;
                  newDebt -= repaymentAmount;
                  cbTreasury += repaymentAmount;

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

              transaction.update(agencyRef, { 
                  members: updatedMembers,
                  eventLog: logEvent ? [...agency.eventLog, logEvent] : agency.eventLog
              });

              transaction.set(cbRef, { treasury: cbTreasury }, { merge: true });
          });
          toast('success', type === 'TAKE' ? `Crédit accepté (+${amount} cash)` : `Dette remboursée (-${amount})`);
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const manageLoan = async (studentId: string, agencyId: string, amount: number, type: 'TAKE' | 'REPAY') => {
      // Exécution directe pour les étudiants
      await executeManageLoan(studentId, agencyId, amount, type);
  };

  // NOUVEAU : FONCTION D'AMNISTIE
  const wipeDebt = async (studentId: string, agencyId: string) => {
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if (!student) return;

      const debt = student.loanDebt || 0;
      if (debt <= 0) {
          toast('info', "Aucune dette à effacer.");
          return;
      }

      const updatedMembers = agency.members.map(m => 
          m.id === studentId ? { ...m, loanDebt: 0 } : m
      );

      const logEvent: GameEvent = {
          id: `debt-wipe-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'INFO',
          label: 'Amnistie Bancaire',
          deltaBudgetReal: 0,
          description: `La dette de ${student.name} (${debt} PiXi) a été annulée par l'administration.`
      };

      await updateDoc(doc(db, "agencies", agencyId), {
          members: updatedMembers,
          eventLog: [...agency.eventLog, logEvent]
      });

      toast('success', `Dette de ${student.name} effacée.`);
  };

  const executeSubmitQuiz = async (payload: any) => {
      const { quizId, studentId, score, maxScore, answers, audioUrls, aiAnalysis, type, rewardsEarned } = payload;
      
      try {
          await runTransaction(db, async (transaction) => {
              const agency = agencies.find(a => a.members.some(m => m.id === studentId));
              if (!agency) throw new Error("Agence introuvable");

              const agencyRef = doc(db, "agencies", agency.id);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");

              const agencyData = agencyDoc.data() as Agency;
              const updatedMembers = agencyData.members.map((m: any) => {
                  if (m.id === studentId) {
                      return {
                          ...m,
                          individualScore: Math.min(100, (m.individualScore || 0) + (rewardsEarned?.points || 0)),
                          wallet: (m.wallet || 0) + (rewardsEarned?.pixi || 0)
                      };
                  }
                  return m;
              });

              // Sauvegarde de la tentative complète
              let attemptId = `${quizId}_${studentId}`;
              // Si c'est un sondage hebdo ou autre, on peut vouloir plusieurs tentatives, 
              // mais par défaut on écrase ou on génère un ID unique.
              // Ici on suit la logique de QuizModal : si WEEKLY on ajoute un timestamp
              // Mais l'action processor reçoit un payload déjà préparé.
              
              const attemptRef = doc(db, "quiz_attempts", payload.attemptId || `${quizId}_${studentId}_${Date.now()}`);
              transaction.set(attemptRef, {
                  quizId,
                  studentId,
                  score,
                  maxScore,
                  date: payload.date || new Date().toISOString(),
                  rewardsEarned: rewardsEarned || { points: 0, pixi: 0 },
                  answers,
                  audioUrls,
                  aiAnalysis,
                  type: type || 'QUIZ'
              });

              transaction.update(agencyRef, { members: updatedMembers });
          });
      } catch (e) {
          console.error("Error in executeSubmitQuiz:", e);
          throw e;
      }
  };

  const executeBuyShopItem = async (studentId: string, agencyId: string, itemId: string) => {
      try {
          await runTransaction(db, async (transaction) => {
              const itemRef = doc(db, "shop_items", itemId);
              const itemDoc = await transaction.get(itemRef);
              if (!itemDoc.exists) throw new Error("Objet introuvable");
              const item = itemDoc.data() as any;

              if (item.type !== 'FIXED') throw new Error("Cet objet n'est pas à prix fixe");
              if (!item.isVisible) throw new Error("Cet objet n'est plus disponible");
              if (item.stock !== undefined && item.stock <= 0) throw new Error("Rupture de stock");

              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;

              if (agency.budget_real < (item.price || 0)) throw new Error("Budget agence insuffisant");

              // Deduct price from agency budget
              transaction.update(agencyRef, {
                  budget_real: agency.budget_real - (item.price || 0),
                  eventLog: [...agency.eventLog, {
                      id: `shop-buy-${Date.now()}`,
                      date: new Date().toISOString().split('T')[0],
                      type: 'INFO',
                      label: 'Achat Boutique',
                      deltaBudgetReal: -(item.price || 0),
                      description: `Achat de : ${item.title}`
                  }]
              });

              // Update item stock and purchases
              const newPurchase = {
                  agencyId,
                  agencyName: agency.name,
                  timestamp: new Date().toISOString()
              };
              
              const updateData: any = {
                  purchases: [...(item.purchases || []), newPurchase]
              };
              if (item.stock !== undefined) {
                  updateData.stock = item.stock - 1;
              }
              
              transaction.update(itemRef, updateData);
          });
          toast('success', "Achat réussi !");
      } catch (e: any) {
          console.error("Buy Shop Item Error:", e);
          toast('error', `Erreur achat: ${e.message}`);
      }
  };

  const executePlaceBid = async (studentId: string, agencyId: string, itemId: string, bidAmount: number) => {
      try {
          await runTransaction(db, async (transaction) => {
              const itemRef = doc(db, "shop_items", itemId);
              const itemDoc = await transaction.get(itemRef);
              if (!itemDoc.exists) throw new Error("Enchère introuvable");
              const item = itemDoc.data() as any;

              if (item.type !== 'AUCTION') throw new Error("Cet objet n'est pas une enchère");
              if (!item.isVisible || item.isClosed) throw new Error("Cette enchère est fermée");
              
              const minBid = (item.currentPrice || item.startingPrice || 0) + 10; // Minimum increment of 10
              if (bidAmount < minBid) throw new Error(`L'enchère minimum est de ${minBid} PiXi`);

              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;

              if (agency.budget_real < bidAmount) throw new Error("Budget agence insuffisant");

              // If there's a previous highest bidder, refund them
              if (item.highestBidderId && item.highestBidderId !== agencyId) {
                  const prevBidderRef = doc(db, "agencies", item.highestBidderId);
                  const prevBidderDoc = await transaction.get(prevBidderRef);
                  if (prevBidderDoc.exists) {
                      const prevBidder = prevBidderDoc.data() as Agency;
                      transaction.update(prevBidderRef, {
                          budget_real: prevBidder.budget_real + (item.currentPrice || 0),
                          eventLog: [...prevBidder.eventLog, {
                              id: `shop-refund-${Date.now()}`,
                              date: new Date().toISOString().split('T')[0],
                              type: 'INFO',
                              label: 'Remboursement Enchère',
                              deltaBudgetReal: (item.currentPrice || 0),
                              description: `Vous avez été surenchéri sur : ${item.title}`
                          }]
                      });
                  }
              }

              // Deduct bid from current agency
              transaction.update(agencyRef, {
                  budget_real: agency.budget_real - bidAmount,
                  eventLog: [...agency.eventLog, {
                      id: `shop-bid-${Date.now()}`,
                      date: new Date().toISOString().split('T')[0],
                      type: 'INFO',
                      label: 'Enchère Placée',
                      deltaBudgetReal: -bidAmount,
                      description: `Enchère de ${bidAmount} PiXi sur : ${item.title}`
                  }]
              });

              // Update item with new highest bid
              const newBid = {
                  agencyId,
                  agencyName: agency.name,
                  amount: bidAmount,
                  timestamp: new Date().toISOString()
              };
              
              transaction.update(itemRef, {
                  currentPrice: bidAmount,
                  highestBidderId: agencyId,
                  highestBidderName: agency.name,
                  bidsHistory: [...(item.bidsHistory || []), newBid]
              });
          });
          toast('success', "Enchère placée avec succès !");
      } catch (e: any) {
          console.error("Place Bid Error:", e);
          toast('error', `Erreur enchère: ${e.message}`);
      }
  };

  return { 
      processFinance, 
      transferFunds, 
      injectCapital, 
      requestScorePurchase, 
      handleTransactionRequest, 
      manageSavings, 
      manageLoan, 
      wipeDebt,
      submitQuiz: async (payload: any) => {
          // Exécution directe pour que les réponses soient enregistrées immédiatement
          await executeSubmitQuiz(payload);
      },
      executeTransferFunds,
      executeInjectCapital,
      executeRequestScorePurchase,
      executeManageSavings,
      executeManageLoan,
      executeSubmitQuiz,
      executeBuyShopItem,
      executePlaceBid
  };
};
