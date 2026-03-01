
import { writeBatch, doc, db } from '../../../services/firebase';
import { Agency, GameEvent, PeerReview, CareerStep, Badge, WeekModule } from '../../../types';
import { calculateVECap, BADGE_DEFINITIONS } from '../../../constants';

export const usePerformanceLogic = (agencies: Agency[], reviews: PeerReview[], weeks: { [key: string]: WeekModule }, toast: (type: string, msg: string) => void, getCurrentGameWeek: () => number) => {

  const processPerformance = async (targetClass: 'A' | 'B' | 'ALL') => {
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

            const updatedMembers = (agency.members || []).map(member => {
                let scoreDelta = 0;
                let newStreak = member.streak || 0;
                let memberBadges = [...(member.badges || [])];
                let eventsDescription = "";

                // --- 0. PENALITE PEER REVIEW MANQUANTE ---
                // Si activé pour la semaine, on vérifie si le membre a fait sa review
                if (currentWeekConfig?.scoring?.missingReviewPenalty?.enabled && !isSoloMode) {
                    // On cherche si ce membre a soumis une review pour cette semaine
                    // Note: reviews contient TOUTES les reviews. On doit filtrer par reviewerId et weekId.
                    const hasReviewed = reviews.some(r => 
                        r.reviewerId === member.id && 
                        r.weekId === currentWeekId
                    );

                    if (!hasReviewed) {
                        const penalty = currentWeekConfig.scoring.missingReviewPenalty;
                        if (penalty.type === 'score') {
                            scoreDelta -= penalty.amount;
                            eventsDescription += ` [Malus Review: -${penalty.amount}]`;
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
                    // On ignore l'écriture user dans ce batch pour la stabilité si limite batch atteinte
                }

                return { ...member, individualScore: finalScore, streak: newStreak, badges: memberBadges };
            });

            // --- 3. CALCUL VE (AVEC TOLÉRANCE OVERCAP) ---
            let veAdjustment = 0;
            
            // A. VE PENALTY (PEER REVIEW)
            if (currentWeekConfig?.scoring?.missingReviewPenalty?.enabled && currentWeekConfig.scoring.missingReviewPenalty.type === 'VE' && !isSoloMode) {
                 let missingReviewCount = 0;
                 agency.members.forEach(member => {
                     const hasReviewed = reviews.some(r => r.reviewerId === member.id && r.weekId === currentWeekId);
                     if (!hasReviewed) missingReviewCount++;
                 });

                 if (missingReviewCount > 0) {
                     const penaltyAmount = currentWeekConfig.scoring.missingReviewPenalty.amount * missingReviewCount;
                     veAdjustment -= penaltyAmount;
                     logEvents.push({ 
                        id: `perf-penalty-review-${Date.now()}-${agency.id}`, 
                        date: today, 
                        type: 'CRISIS', 
                        label: 'Malus Peer Review', 
                        deltaVE: -penaltyAmount, 
                        description: `${missingReviewCount} membre(s) n'ont pas voté (-${penaltyAmount} VE).` 
                     });
                 }
            }

            // B. VE BUDGET ADJUSTMENT
            const budget = agency.budget_real;
            if (budget >= 2000) veAdjustment += Math.floor(budget / 2000);
            else if (budget < 0) veAdjustment -= Math.ceil(Math.abs(budget) / 1000) * 2;

            if (veAdjustment !== 0 && !logEvents.find(e => e.label === 'Malus Peer Review')) { // Avoid double logging if only penalty
                // Only log budget adjustment if it's not just the penalty (or log separately? The penalty is already logged above)
                // Actually, let's log budget adjustment separately if it exists.
            }
            
            // Re-calculate budget part for logging to be clear
            let budgetVeAdj = 0;
            if (budget >= 2000) budgetVeAdj += Math.floor(budget / 2000);
            else if (budget < 0) budgetVeAdj -= Math.ceil(Math.abs(budget) / 1000) * 2;
            
            if (budgetVeAdj !== 0) {
                 logEvents.push({ id: `perf-ve-${Date.now()}-${agency.id}`, date: today, type: budgetVeAdj > 0 ? 'VE_DELTA' : 'CRISIS', label: 'Ajustement VE (Bilan)', deltaVE: budgetVeAdj, description: budgetVeAdj > 0 ? 'Trésorerie saine.' : 'Dette.' });
            }

            const veCap = calculateVECap(agency);
            
            // LOGIQUE OVERCAP :
            // 1. On calcule la VE potentielle
            let potentialVE = agency.ve_current + veAdjustment;
            let finalVE = potentialVE;

            // 2. Si on est en dessous du Cap, on applique le Cap (croissance organique bloquée)
            if (agency.ve_current < veCap) {
                finalVE = Math.min(potentialVE, veCap);
            } 
            // 3. Si on est DÉJÀ au dessus du Cap (grâce à des dividendes/bonus)
            else {
                // Si l'ajustement est positif (gain organique), on ne l'ajoute pas (le plafond bloque la croissance purement financière)
                // MAIS on ne rabote pas le surplus existant.
                if (veAdjustment > 0) {
                    finalVE = agency.ve_current; // On garde le surplus, mais on ne monte pas plus via le budget
                } 
                // Si l'ajustement est négatif (dette), on perd de la VE normalement (le buffer sert à ça !)
                else {
                    finalVE = Math.max(0, potentialVE); 
                }
            }

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                members: updatedMembers,
                ve_current: finalVE,
                // peerReviews: [], // PLUS BESOIN DE VIDER L'ARRAY LOCAL
                eventLog: [...agency.eventLog, ...logEvents],
                status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique'
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            toast('success', `Bilan ${targetClass}: ${processedCount} agences mises à jour.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Performance"); }
  };

  return { processPerformance };
};
