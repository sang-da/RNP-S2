
import { writeBatch, doc, db, arrayUnion } from '../../../services/firebase';
import { Agency, GameEvent, PeerReview, CareerStep, WeekModule, BilanSimulation, AgencyPerformancePreview, MemberPerformancePreview } from '../../../types';
import { calculateVECap, calculateMarketVE, applyVEShield, BADGE_DEFINITIONS, HOLDING_RULES, GAME_RULES } from '../../../constants';

export const usePerformanceLogic = (agencies: Agency[], reviews: PeerReview[], weeks: { [key: string]: WeekModule }, toast: (type: string, msg: string) => void, getCurrentGameWeek: () => number) => {

  const simulatePerformance = (targetClass: 'A' | 'B' | 'ALL'): BilanSimulation => {
      const currentWeekNum = getCurrentGameWeek();
      const currentWeekId = currentWeekNum.toString();
      const currentWeekConfig = weeks[currentWeekId];
      const today = new Date().toISOString().split('T')[0];

      const simulationAgencies: AgencyPerformancePreview[] = agencies
          .filter(a => a.id !== 'unassigned' && (targetClass === 'ALL' || a.classId === targetClass))
          .map(agency => {
              const isSoloMode = agency.members.length === 1;
              let penaltyVE = 0;
              let hasMissingReviews = false;

              const memberPreviews: MemberPerformancePreview[] = (agency.members || []).map(member => {
                  let votesCast = 0;
                  let votesExpected = isSoloMode ? 0 : agency.members.length - 1;
                  let missingReviews = 0;
                  let scoreDelta = 0;

                  if (!isSoloMode) {
                      const memberReviews = reviews.filter(r => r.reviewerId === member.id && r.weekId === currentWeekId);
                      const uniqueTargets = new Set(memberReviews.map(r => r.targetId));
                      votesCast = uniqueTargets.size;
                      missingReviews = Math.max(0, votesExpected - votesCast);
                  }

                  if (missingReviews > 0) hasMissingReviews = true;

                  // Score calculation logic (simplified for preview)
                  if (currentWeekConfig?.scoring?.missingReviewPenalty?.enabled && !isSoloMode && currentWeekConfig.scoring.missingReviewPenalty.type === 'score') {
                      scoreDelta -= currentWeekConfig.scoring.missingReviewPenalty.amount * missingReviews;
                  }

                  // Team logic
                  const teamReviews = reviews.filter(r => r.targetId === member.id && r.weekId === currentWeekId && r.agencyId === agency.id);
                  if (teamReviews.length > 0) {
                      const avg = teamReviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / teamReviews.length;
                      if (avg > 4.5) scoreDelta += 2;
                      else if (avg >= 4.0) scoreDelta += 1;
                      else if (avg < 2.0) scoreDelta -= 5;
                  }

                  return {
                      id: member.id,
                      name: member.name,
                      votesCast,
                      votesExpected,
                      missingReviews,
                      scoreDelta,
                      newScore: Math.max(0, Math.min(100, (member.individualScore || 0) + scoreDelta))
                  };
              });

              // VE Adjustments
              let veAdjustment = 0;
              
              // 1. Pending Effects
              if (agency.pendingEffects) {
                  agency.pendingEffects.forEach(e => veAdjustment += e.amount);
              }

              // 2. Peer Review Penalty
              if (currentWeekConfig?.scoring?.missingReviewPenalty?.enabled && currentWeekConfig.scoring.missingReviewPenalty.type === 'VE' && !isSoloMode) {
                  const totalMissing = memberPreviews.reduce((sum, m) => sum + m.missingReviews, 0);
                  penaltyVE = totalMissing * currentWeekConfig.scoring.missingReviewPenalty.amount;
                  veAdjustment -= penaltyVE;
              }

              // 3. Budget Adjustment
              const budget = agency.budget_real;
              if (budget >= 2000) veAdjustment += Math.floor(budget / 2000);
              else if (budget < 0) veAdjustment -= Math.ceil(Math.abs(budget) / 1000) * 2;

              const veCap = calculateVECap(agency);
              const currentMarketVE = (agency.eventLog || []).reduce((sum, e) => sum + (e.deltaVE || 0), 0);
              const baseVE = isSoloMode ? 20 : 0;
              const accountingGap = agency.ve_current - (currentMarketVE + baseVE);

              const finalVE = applyVEShield(agency.ve_current, veAdjustment, currentMarketVE, veCap);
              
              // Growth and Revenue (for Holdings)
              let growth = 0;
              let predictedMultiplier = GAME_RULES.REVENUE_VE_MULTIPLIER;
              if (agency.type === 'HOLDING') {
                  const history = agency.ve_history || [];
                  const lastRecordedVE = history.length >= 1 ? history[history.length - 1].value : agency.ve_current;
                  growth = finalVE - lastRecordedVE;
                  
                  if (growth >= 10) predictedMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_PERFORMANCE;
                  else if (growth >= HOLDING_RULES.GROWTH_TARGET) predictedMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD;
                  else predictedMultiplier = 30;
              }

              // Financial Estimation (S+1)
              const predictedRevenue = (finalVE * predictedMultiplier) + (agency.weeklyRevenueModifier || 0) + (GAME_RULES.REVENUE_BASE || 0);
              
              // Expenses
              const totalSalaries = (agency.members || []).reduce((sum, m) => {
                  const score = Math.max(0, Math.min(100, (m.individualScore || 0) + (memberPreviews.find(p => p.id === m.id)?.scoreDelta || 0)));
                  return sum + (score * GAME_RULES.SALARY_MULTIPLIER);
              }, 0);
              const rent = GAME_RULES.AGENCY_RENT;
              
              let dividends = 0;
              if (agency.type === 'HOLDING') {
                  const rate = finalVE >= 80 ? HOLDING_RULES.DIVIDEND_RATE_HIGH : finalVE >= 60 ? HOLDING_RULES.DIVIDEND_RATE_MID : HOLDING_RULES.DIVIDEND_RATE_LOW;
                  dividends = predictedRevenue * rate;
              }

              const predictedExpenses = totalSalaries + rent + dividends;
              const predictedNetFlow = predictedRevenue - predictedExpenses;

              return {
                  id: agency.id,
                  name: agency.name,
                  classId: agency.classId,
                  type: agency.type || 'AGENCY',
                  currentVE: agency.ve_current,
                  veAdjustment,
                  penaltyVE,
                  finalVE,
                  deltaVE: finalVE - agency.ve_current,
                  growth,
                  predictedMultiplier,
                  predictedRevenue,
                  predictedExpenses,
                  predictedNetFlow,
                  accountingGap,
                  status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique',
                  members: memberPreviews,
                  hasMissingReviews
              };
          });

      return {
          weekId: currentWeekId,
          date: today,
          agencies: simulationAgencies
      };
  };

  const processPerformance = async (targetClass: 'A' | 'B' | 'ALL', manualAdjustments?: { [agencyId: string]: number }) => {
      const today = new Date().toISOString().split('T')[0];
      const currentWeekNum = getCurrentGameWeek();
      const currentWeekId = currentWeekNum.toString();
      const currentWeekConfig = weeks[currentWeekId];

      try {
        const batch = writeBatch(db);
        let processedCount = 0;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            if (targetClass !== 'ALL' && agency.classId !== targetClass) return;
            
            processedCount++;
            
            let logEvents: GameEvent[] = [];
            const isSoloMode = agency.members.length === 1;

            // --- HOLDING: EJECTABLE SEAT CHECK ---
            // On vérifie si les membres ont été suggérés MVP cette semaine
            const agencyDeliverables = agency.progress[currentWeekId]?.deliverables || [];
            const mvpSuggestions = agencyDeliverables.map(d => d.grading?.mvpId || d.nominatedMvpId).filter(Boolean);

            const updatedMembers = (agency.members || []).map(member => {
                let scoreDelta = 0;
                let newStreak = member.streak || 0;
                let memberBadges = [...(member.badges || [])];
                let eventsDescription = "";
                let newStatus = member.status || 'ACTIVE';
                let weeksWithoutMVP = member.weeksWithoutMVPSuggestion || 0;

                // LOGIQUE HOLDING : SIÈGE ÉJECTABLE
                if (agency.type === 'HOLDING') {
                    const isSuggestedMVP = mvpSuggestions.includes(member.id);
                    if (isSuggestedMVP) {
                        weeksWithoutMVP = 0;
                        if (newStatus === 'AT_RISK') newStatus = 'ACTIVE';
                    } else {
                        weeksWithoutMVP++;
                    }

                    if (weeksWithoutMVP >= HOLDING_RULES.WEEKS_WITHOUT_MVP_LIMIT) {
                        newStatus = 'FIRED';
                        eventsDescription += ` [LICENCIEMENT AUTOMATIQUE: Siège Éjectable]`;
                    } else if (weeksWithoutMVP === HOLDING_RULES.WEEKS_WITHOUT_MVP_LIMIT - 1) {
                        newStatus = 'AT_RISK';
                        eventsDescription += ` [ATTENTION: Siège Éjectable imminent]`;
                    }
                }

                // --- 0. PENALITE PEER REVIEW MANQUANTE ---
                // Si activé pour la semaine, on vérifie si le membre a fait sa review
                if (currentWeekConfig?.scoring?.missingReviewPenalty?.enabled && !isSoloMode) {
                    // On cherche si ce membre a soumis TOUTES ses reviews pour cette semaine
                    const memberReviews = reviews.filter(r => r.reviewerId === member.id && r.weekId === currentWeekId);
                    const uniqueTargets = new Set(memberReviews.map(r => r.targetId));
                    const expectedReviews = agency.members.length - 1;
                    const missingForThisMember = expectedReviews - uniqueTargets.size;

                    if (missingForThisMember > 0) {
                        const penalty = currentWeekConfig.scoring.missingReviewPenalty;
                        if (penalty.type === 'score') {
                            const penaltyAmount = penalty.amount * missingForThisMember;
                            scoreDelta -= penaltyAmount;
                            eventsDescription += ` [Malus Review: -${penaltyAmount}]`;
                        } else if (penalty.type === 'VE') {
                            // Le malus VE est appliqué à l'agence, pas au membre individuellement ici
                            // On le gère plus bas dans la section VE
                        }
                    }
                }

                // --- 1. CALCUL DU SCORE ---
                if (isSoloMode) {
                    // Logique Solo (basée sur VE et Budget)
                    if (agency.ve_current >= 60) {
                        scoreDelta += 2; newStreak++;
                    } else if (agency.ve_current >= 40) {
                        scoreDelta += 1; newStreak = 0;
                    } else if (agency.ve_current < 20) {
                        scoreDelta -= 2; newStreak = 0;
                    }
                    if (agency.budget_real >= 1500 && (member.wallet || 0) >= 500) {
                        scoreDelta += 2; 
                    }
                } 
                else {
                    // Logique Team : On cherche les reviews dans la collection globale
                    // Filtre : Target = Membre ET Agency = Agence ET Week = Current
                    const memberReviews = reviews.filter(r => 
                        r.targetId === member.id && 
                        r.weekId === currentWeekId &&
                        r.agencyId === agency.id // Sécurité supplémentaire
                    );

                    if (memberReviews.length > 0) {
                        const avg = memberReviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / memberReviews.length;
                        if (avg > 4.5) { 
                            scoreDelta += 2; 
                            newStreak++; 
                            
                            // BADGE AUTOMATIQUE : ESPRIT DE CORPS
                            if (!memberBadges.find(b => b.id === 'teamwork')) {
                                const badgeDef = BADGE_DEFINITIONS.find(b => b.id === 'teamwork');
                                if (badgeDef) {
                                    memberBadges.push(badgeDef);
                                    scoreDelta += 5; // Bonus unique
                                    eventsDescription += ` [Badge Esprit de Corps: +5]`;
                                }
                            }
                        } 
                        else if (avg >= 4.0) { scoreDelta += 1; newStreak = 0; } 
                        else if (avg < 2.0) { scoreDelta -= 5; newStreak = 0; } 
                        else { newStreak = 0; }
                    }
                }

                if (newStreak >= 3) { 
                    scoreDelta += 10; 
                    
                    // BADGE AUTOMATIQUE : VISIONNAIRE
                    if (!memberBadges.find(b => b.id === 'visionary')) {
                        const badgeDef = BADGE_DEFINITIONS.find(b => b.id === 'visionary');
                        if (badgeDef) {
                            memberBadges.push(badgeDef);
                            eventsDescription += ` [Badge Visionnaire: Débloqué]`;
                        }
                    }
                    newStreak = 0; 
                }

                const finalScore = Math.max(0, Math.min(100, member.individualScore + scoreDelta));

                // --- 2. HISTORISATION CARRIÈRE (DANS USER) ---
                // Si l'étudiant a un vrai compte lié (pas s-...), on met à jour son doc user
                if (!member.id.startsWith('s-') && !member.id.startsWith('agency_')) {
                    const careerStep: CareerStep = {
                        weekId: currentWeekId,
                        agencyId: agency.id,
                        agencyName: agency.name,
                        role: member.role,
                        scoreAtWeek: finalScore,
                        walletAtWeek: member.wallet || 0
                    };
                    
                    const userRef = doc(db, "users", member.id);
                    batch.update(userRef, {
                        careerPath: arrayUnion(careerStep)
                    });
                }

                return { 
                    ...member, 
                    individualScore: finalScore, 
                    streak: newStreak, 
                    badges: memberBadges,
                    weeksWithoutMVPSuggestion: weeksWithoutMVP,
                    status: newStatus
                };
            });

            // --- 3. CALCUL VE (AVEC TOLÉRANCE OVERCAP) ---
            let veAdjustment = 0;
            
            // 0. PENDING EFFECTS (ex: Pump & Dump Crash, Short Sell Payout)
            if (agency.pendingEffects && agency.pendingEffects.length > 0) {
                agency.pendingEffects.forEach(effect => {
                    if (effect.type === 'SHORT_SELL_PAYOUT') {
                        const target = agencies.find(a => a.id === effect.targetId);
                        if (target && effect.targetStartingVE && effect.studentId) {
                            if (target.ve_current < effect.targetStartingVE) {
                                // Add amount to student's wallet
                                const s = updatedMembers.find(m => m.id === effect.studentId);
                                if (s) {
                                    s.wallet = (s.wallet || 0) + effect.amount;
                                    logEvents.push({
                                        id: `shortsell-win-${Date.now()}-${agency.id}`,
                                        date: today,
                                        type: 'REVENUE',
                                        label: 'Gain Short Selling',
                                        deltaBudgetReal: 0,
                                        description: `Le pari contre ${target.name} a réussi. +${effect.amount} PiXi pour ${s.name}.`
                                    });
                                }
                            } else {
                                logEvents.push({
                                    id: `shortsell-loss-${Date.now()}-${agency.id}`,
                                    date: today,
                                    type: 'INFO',
                                    label: 'Perte Short Selling',
                                    description: `Le pari contre ${target.name} a échoué (La VE n'a pas baissé).`
                                });
                            }
                        }
                    } else {
                        veAdjustment += effect.amount;
                        logEvents.push({
                            id: `pending-eff-${Date.now()}-${agency.id}`,
                            date: today,
                            type: effect.amount > 0 ? 'VE_DELTA' : 'CRISIS',
                            label: effect.label,
                            deltaVE: effect.amount,
                            description: `Effet différé appliqué (${effect.amount > 0 ? '+' : ''}${effect.amount} VE).`
                        });
                    }
                });
            }

            // A. VE PENALTY (PEER REVIEW)
            const manualPenalty = manualAdjustments ? manualAdjustments[agency.id] : undefined;
            
            if (manualPenalty !== undefined) {
                // Si on a un ajustement manuel, on l'utilise
                if (manualPenalty !== 0) {
                    veAdjustment += manualPenalty;
                    logEvents.push({ 
                        id: `perf-penalty-manual-${Date.now()}-${agency.id}`, 
                        date: today, 
                        type: manualPenalty > 0 ? 'VE_DELTA' : 'CRISIS', 
                        label: 'Ajustement Manuel Bilan', 
                        deltaVE: manualPenalty, 
                        description: `Ajustement manuel de performance (${manualPenalty > 0 ? '+' : ''}${manualPenalty} VE).` 
                    });
                }
            } else if (currentWeekConfig?.scoring?.missingReviewPenalty?.enabled && currentWeekConfig.scoring.missingReviewPenalty.type === 'VE' && !isSoloMode) {
                 let totalMissingReviews = 0;
                 const expectedReviewsPerMember = agency.members.length - 1;
                 agency.members.forEach(member => {
                     const memberReviews = reviews.filter(r => r.reviewerId === member.id && r.weekId === currentWeekId);
                     const uniqueTargets = new Set(memberReviews.map(r => r.targetId));
                     const missingForThisMember = expectedReviewsPerMember - uniqueTargets.size;
                     if (missingForThisMember > 0) {
                         totalMissingReviews += missingForThisMember;
                     }
                 });

                 if (totalMissingReviews > 0) {
                     const penaltyAmount = currentWeekConfig.scoring.missingReviewPenalty.amount * totalMissingReviews;
                     veAdjustment -= penaltyAmount;
                     logEvents.push({ 
                        id: `perf-penalty-review-${Date.now()}-${agency.id}`, 
                        date: today, 
                        type: 'CRISIS', 
                        label: 'Malus Peer Review', 
                        deltaVE: -penaltyAmount, 
                        description: `${totalMissingReviews} review(s) manquante(s) (-${penaltyAmount} VE).` 
                     });
                 }
            }

            // B. VE BUDGET ADJUSTMENT
            const budget = agency.budget_real;
            let budgetVeAdj = 0;
            if (budget >= 2000) budgetVeAdj += Math.floor(budget / 2000);
            else if (budget < 0) budgetVeAdj -= Math.ceil(Math.abs(budget) / 1000) * 2;

            if (budgetVeAdj !== 0) {
                 veAdjustment += budgetVeAdj;
                 logEvents.push({ id: `perf-ve-${Date.now()}-${agency.id}`, date: today, type: budgetVeAdj > 0 ? 'VE_DELTA' : 'CRISIS', label: 'Ajustement VE (Bilan)', deltaVE: budgetVeAdj, description: budgetVeAdj > 0 ? 'Trésorerie saine.' : 'Dette.' });
            }

            const veCap = calculateVECap(agency);
            const currentMarketVE = calculateMarketVE(agency);
            
            // LOGIQUE BOUCLIER (SHIELD) :
            // La VE Marché sert de réserve. Tant qu'elle est au-dessus du Cap, la VE actuelle reste au Cap.
            const finalVE = applyVEShield(agency.ve_current, veAdjustment, currentMarketVE, veCap);

            // UPDATE VE HISTORY (Pour calcul croissance Holding)
            const newHistory = [...(agency.ve_history || []), { week: currentWeekId, value: finalVE }];

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                members: updatedMembers,
                ve_current: finalVE,
                ve_history: newHistory,
                // peerReviews: [], // PLUS BESOIN DE VIDER L'ARRAY LOCAL
                eventLog: [...agency.eventLog, ...logEvents],
                status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique',
                pendingEffects: [] // On vide les effets différés
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            toast('success', `Bilan ${targetClass}: ${processedCount} agences mises à jour.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Performance"); }
  };

  return { processPerformance, simulatePerformance };
};
