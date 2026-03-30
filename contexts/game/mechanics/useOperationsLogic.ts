
import { doc, db, runTransaction } from '../../../services/firebase';
import { Agency, GameEvent, PeerReview, Deliverable } from '../../../types';
import { GAME_RULES, HOLDING_RULES, calculateMarketVE, calculateVECap, applyVEShield } from '../../../constants';
import { notificationService } from '../../../services/notificationService';

export const useOperationsLogic = (
    agencies: Agency[], 
    reviews: PeerReview[], 
    toast: (type: string, msg: string) => void, 
    getCurrentGameWeek: () => number,
    role: 'admin' | 'student',
    dispatchAction: (type: string, payload: any, studentId: string, agencyId: string) => Promise<void>
) => {

  const executePerformBlackOp = async (studentId: string, agencyId: string, opType: string, payload: any) => {
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;
              
              const student = agency.members.find(m => m.id === studentId);
              if (!student) throw new Error("Étudiant introuvable");

              let targetRef = null;
              let target = null;
              if (payload.targetId) {
                  targetRef = doc(db, "agencies", payload.targetId);
                  const targetDoc = await transaction.get(targetRef);
                  if (targetDoc.exists) target = targetDoc.data() as Agency;
              }

              let cost = 0;
              if (opType === 'DATA_MINER') cost = 600;
              if (opType === 'DOXXING') cost = 500;
              if (opType === 'LEAK') cost = 300;
              if (opType === 'PUMP_DUMP') cost = 800;
              if (opType === 'LAUNDERING') cost = 200; 
              if (opType === 'SHORT_SELL') cost = 500;
              if (opType === 'CORRUPTED_FILE') cost = 400;
              if (opType === 'BUY_VOTE') cost = 250;
              if (opType === 'AUDIT_HOSTILE') cost = 500;

              if ((student.wallet || 0) < cost && opType !== 'LAUNDERING') {
                  throw new Error("Fonds insuffisants");
              }

              let updatedMembers = agency.members.map(m => m.id === studentId ? { ...m, wallet: (m.wallet || 0) - cost } : m);
              let description = `Opération ${opType} effectuée par ${student.name}.`;
              let eventType: any = 'BLACK_OP';
              let eventLabel = `Opération: ${opType}`;
              
              if (opType === 'DATA_MINER' && payload.targetId) {
                  description = `Extraction de données stratégiques sur cible externe.`;
              }
              else if (opType === 'LAUNDERING') {
                  const SCORE_COST = 5; 
                  const CASH_GAIN = 500; 
                  
                  if (student.individualScore >= SCORE_COST) {
                      updatedMembers = updatedMembers.map(m => m.id === studentId ? { 
                          ...m, 
                          individualScore: m.individualScore - SCORE_COST,
                          wallet: (m.wallet || 0) + CASH_GAIN 
                      } : m);
                      description = `Consulting Fantôme : -${SCORE_COST} Score contre +${CASH_GAIN} PiXi.`;
                      eventLabel = "Blanchiment";
                  } else {
                      throw new Error("Score insuffisant pour blanchiment.");
                  }
              }
              else if (opType === 'PUMP_DUMP' && target && targetRef) {
                  const immediateEvent = {
                      id: `pump-${Date.now()}`, date: new Date().toISOString().split('T')[0], 
                      type: 'VE_DELTA', label: 'Rumeur Positive (Marché)', deltaVE: 5, 
                      description: "Hausse inexpliquée de la cotation. (Pump & Dump phase 1)"
                  };
                  
                  const targetMarketVE = calculateMarketVE(target);
                  const targetVECap = calculateVECap(target);
                  const finalVE = applyVEShield(target.ve_current, 5, targetMarketVE, targetVECap);

                  transaction.update(targetRef, {
                      ve_current: finalVE,
                      eventLog: [...target.eventLog, immediateEvent],
                      pendingEffects: [...(target.pendingEffects || []), { type: 'PUMP_DUMP_CRASH', amount: -12, label: 'Crash Boursier (Suite Pump&Dump)' }]
                  });
                  description = `Pump & Dump initié sur ${target.name}. (+5 VE)`;
              }
              else if (opType === 'CORRUPTED_FILE' && payload.weekId) {
                  const roll = Math.random();
                  const success = roll < 0.40; 
                  
                  if (success) {
                      const week = agency.progress[payload.weekId];
                      if (week) {
                          const targetDel = week.deliverables.find(d => d.status === 'pending');
                          if (targetDel) {
                              const updatedWeek = {
                                  ...week,
                                  deliverables: week.deliverables.map(d => d.id === targetDel.id ? { ...d, status: 'validated', feedback: "Fichier illisible. Délai accordé (B).", grading: { quality: 'B', daysLate: 0, constraintBroken: false, finalDelta: 4 } } : d)
                              };
                              
                              const newEvent = {
                                  id: `corrupt-win-${Date.now()}`, date: new Date().toISOString().split('T')[0],
                                  type: 'VE_DELTA', label: 'Glitch Exploité', deltaVE: 4, description: "L'administration a accepté le fichier corrompu."
                              };

                              const veCap = calculateVECap(agency);
                              const marketVE = calculateMarketVE(agency);
                              const finalVE = applyVEShield(agency.ve_current, 4, marketVE, veCap);

                              transaction.update(agencyRef, {
                                  [`progress.${payload.weekId}`]: updatedWeek,
                                  ve_current: finalVE,
                                  eventLog: [...agency.eventLog, newEvent]
                              });
                              description = "Fichier corrompu accepté. Gain de temps.";
                          } else {
                              throw new Error("Aucun livrable en attente pour corrompre.");
                          }
                      }
                  } else {
                      const failEvent = {
                          id: `corrupt-fail-${Date.now()}`, date: new Date().toISOString().split('T')[0],
                          type: 'CRISIS', label: 'Fraude Détectée', deltaVE: 0, description: "Tentative de fichier corrompu repérée. Blâme."
                      };
                      transaction.update(agencyRef, { eventLog: [...agency.eventLog, failEvent] });
                      description = "Fraude détectée. L'administration est prévenue.";
                  }
              }

              const newEvent: GameEvent = {
                  id: `op-${Date.now()}`,
                  date: new Date().toISOString().split('T')[0],
                  type: eventType,
                  label: eventLabel,
                  description: description,
                  deltaBudgetReal: 0 
              };

              if (opType !== 'CORRUPTED_FILE') { 
                  transaction.update(agencyRef, { 
                      members: updatedMembers,
                      eventLog: [...agency.eventLog, newEvent]
                  });
              }

              // Notification for the group
              const memberIds = agency.members.map(m => m.id);
              notificationService.createGroupNotification(
                  memberIds,
                  "Opération effectuée",
                  `L'opération ${opType} a été exécutée par ${student.name}.`,
                  "INFO"
              );

              if (opType === 'AUDIT_HOSTILE' && target && targetRef) {
                  const isFragile = target.ve_current < 40 || target.budget_real < 0;
                  const targetMarketVE = calculateMarketVE(target);
                  const targetVECap = calculateVECap(target);
                  const finalVE = applyVEShield(target.ve_current, -10, targetMarketVE, targetVECap);

                  if (isFragile) {
                      transaction.update(targetRef, { 
                          ve_current: finalVE,
                          eventLog: [...target.eventLog, {
                              id: `audit-hit-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'CRISIS',
                              label: 'Audit Hostile Subi', deltaVE: -10, description: "Des failles ont été exposées."
                          }]
                      });
                  } else {
                      const sourceMarketVE = calculateMarketVE(agency);
                      const sourceVECap = calculateVECap(agency);
                      const finalSourceVE = applyVEShield(agency.ve_current, -20, sourceMarketVE, sourceVECap);

                      transaction.update(agencyRef, {
                          ve_current: finalSourceVE,
                          eventLog: [...agency.eventLog, newEvent, {
                              id: `audit-fail-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'CRISIS',
                              label: 'Audit Abusif', deltaVE: -20, description: "Attaque ratée sur cible saine."
                          }]
                      });
                  }
              }
          });
          toast('success', `Opération ${opType} exécutée.`);
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const performBlackOp = async (studentId: string, agencyId: string, opType: string, payload: any) => {
      if (role === 'admin') {
          await executePerformBlackOp(studentId, agencyId, opType, payload);
      } else {
          await dispatchAction('BLACK_OP', { studentId, agencyId, opType, payload }, studentId, agencyId);
      }
  };

  const triggerBlackOp = async (sourceAgencyId: string, targetAgencyId: string, type: 'AUDIT' | 'LEAK') => {
      console.log("Trigger Black Op", sourceAgencyId, targetAgencyId, type);
  };

  const executeProposeMerger = async (sourceAgencyId: string, targetAgencyId: string) => {
      try {
          await runTransaction(db, async (transaction) => {
              const sourceRef = doc(db, "agencies", sourceAgencyId);
              const targetRef = doc(db, "agencies", targetAgencyId);
              
              const sourceDoc = await transaction.get(sourceRef);
              const targetDoc = await transaction.get(targetRef);
              
              if (!sourceDoc.exists || !targetDoc.exists) throw new Error("Agence introuvable");
              
              const source = sourceDoc.data() as Agency;
              const target = targetDoc.data() as Agency;

              if (source.members.length + target.members.length > GAME_RULES.MERGER_MAX_MEMBERS) {
                  throw new Error(`Le nombre total de membres ne peut pas dépasser ${GAME_RULES.MERGER_MAX_MEMBERS}.`);
              }

              const request = {
                  id: `merger-${Date.now()}`,
                  requesterAgencyId: source.id,
                  requesterAgencyName: source.name,
                  targetAgencyId: target.id,
                  status: 'PENDING',
                  date: new Date().toISOString().split('T')[0],
                  offerDetails: `Absorption proposée par ${source.name}.`
              };

              transaction.update(targetRef, {
                  mergerRequests: [...(target.mergerRequests || []), request]
              });

              // Notification for target agency
              const targetMemberIds = target.members.map(m => m.id);
              notificationService.createGroupNotification(
                  targetMemberIds,
                  "Proposition de rachat",
                  `L'agence ${source.name} vous a fait une proposition de rachat.`,
                  "WARNING"
              );
          });
          toast('success', "Proposition de rachat envoyée.");
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const proposeMerger = async (sourceAgencyId: string, targetAgencyId: string) => {
      await executeProposeMerger(sourceAgencyId, targetAgencyId);
  };

  const executeFinalizeMerger = async (mergerId: string, targetAgencyId: string, approved: boolean) => {
      try {
          await runTransaction(db, async (transaction) => {
              const targetRef = doc(db, "agencies", targetAgencyId);
              const targetDoc = await transaction.get(targetRef);
              if (!targetDoc.exists) throw new Error("Agence cible introuvable");
              const target = targetDoc.data() as Agency;

              const request = target.mergerRequests?.find(r => r.id === mergerId);
              if (!request) throw new Error("Requête introuvable");

              const sourceRef = doc(db, "agencies", request.requesterAgencyId);
              const sourceDoc = await transaction.get(sourceRef);
              if (!sourceDoc.exists) throw new Error("Agence source introuvable");
              const source = sourceDoc.data() as Agency;

              const newRequests = target.mergerRequests?.filter(r => r.id !== mergerId);

              if (!approved) {
                  transaction.update(targetRef, { mergerRequests: newRequests });
                  return;
              }

              if (source.members.length + target.members.length > GAME_RULES.MERGER_MAX_MEMBERS) {
                  throw new Error(`Le nombre total de membres ne peut pas dépasser ${GAME_RULES.MERGER_MAX_MEMBERS}.`);
              }

              const updatedTargetMembers = target.members.map(m => ({
                  ...m,
                  role: 'Employé'
              }));

              const combinedMembers = [...source.members, ...updatedTargetMembers];
              const combinedBudget = source.budget_real + target.budget_real; 
              
              const sourceMarketVE = calculateMarketVE(source);
              const targetMarketVE = calculateMarketVE(target);
              const combinedMarketVE = sourceMarketVE + targetMarketVE;
              
              // On recalcule le Cap pour la nouvelle taille
              const newVECap = calculateVECap({ ...source, members: combinedMembers });
              
              // On applique le bouclier sur la somme des VE actuelles
              const finalVE = applyVEShield(source.ve_current + target.ve_current, 0, combinedMarketVE, newVECap);
              
              transaction.update(sourceRef, {
                  members: combinedMembers,
                  budget_real: combinedBudget,
                  ve_current: finalVE,
                  type: 'HOLDING',
                  eventLog: [...source.eventLog, {
                      id: `merger-success-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
                      label: 'Fusion Complétée', deltaVE: targetMarketVE, description: `Absorption de ${target.name}. L'agence devient une Holding.`
                  }]
              });

              transaction.delete(targetRef);

              // Notification for source agency
              const sourceMemberIds = source.members.map(m => m.id);
              notificationService.createGroupNotification(
                  sourceMemberIds,
                  "Fusion complétée",
                  `L'agence ${target.name} a accepté votre proposition de rachat.`,
                  "SUCCESS"
              );
          });
          toast(approved ? 'success' : 'info', approved ? "Fusion confirmée !" : "Fusion refusée.");
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const finalizeMerger = async (mergerId: string, targetAgencyId: string, approved: boolean) => {
      await executeFinalizeMerger(mergerId, targetAgencyId, approved);
  };

  const executeSendChallenge = async (targetAgencyId: string, title: string, description: string, rewardVE: number, rewardBudget: number) => {
      try {
          await runTransaction(db, async (transaction) => {
              const targetRef = doc(db, "agencies", targetAgencyId);
              const targetDoc = await transaction.get(targetRef);
              if (!targetDoc.exists) throw new Error("Agence introuvable");
              const target = targetDoc.data() as Agency;

              const challenge = {
                  id: `chall-${Date.now()}`,
                  title,
                  description,
                  status: 'PENDING_VOTE',
                  date: new Date().toISOString().split('T')[0],
                  rewardVE: rewardVE || 10,
                  rewardBudget: rewardBudget || 500,
                  votes: {}
              };

              transaction.update(targetRef, {
                  challenges: [...(target.challenges || []), challenge]
              });

              // Notification for target agency
              const targetMemberIds = target.members.map(m => m.id);
              notificationService.createGroupNotification(
                  targetMemberIds,
                  "Nouveau Challenge",
                  `Un nouveau challenge a été proposé à votre agence : ${title}`,
                  "INFO"
              );
          });
          toast('success', "Challenge envoyé !");
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const sendChallenge = async (targetAgencyId: string, title: string, description: string, rewardVE: number, rewardBudget: number) => {
      if (role === 'admin') {
          await executeSendChallenge(targetAgencyId, title, description, rewardVE, rewardBudget);
      } else {
          await dispatchAction('SEND_CHALLENGE', { targetAgencyId, title, description, rewardVE, rewardBudget }, 'unknown', targetAgencyId);
      }
  };

  const executeSubmitChallengeVote = async (agencyId: string, challengeId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;
              
              const challenge = agency.challenges?.find(c => c.id === challengeId);
              if (!challenge) throw new Error("Challenge introuvable");

              const newVotes = { ...challenge.votes, [voterId]: vote };
              const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
              const totalVoters = agency.members.length;
              
              if (approvals / totalVoters > GAME_RULES.VOTE_THRESHOLD_CHALLENGE) {
                  const currentWeekId = getCurrentGameWeek().toString();
                  const currentWeekData = agency.progress[currentWeekId];
                  
                  if (currentWeekData) {
                      const specialDeliverable: Deliverable = {
                          id: `d_special_${Date.now()}`,
                          name: `⚡ MISSION: ${challenge.title}`,
                          description: `${challenge.description} (Récompense: +${challenge.rewardVE} VE, +${challenge.rewardBudget} PiXi)`,
                          status: 'pending',
                          type: 'FILE',
                      };

                      const updatedWeek = {
                          ...currentWeekData,
                          deliverables: [...currentWeekData.deliverables, specialDeliverable]
                      };

                      transaction.update(agencyRef, {
                          challenges: agency.challenges?.filter(c => c.id !== challengeId), 
                          [`progress.${currentWeekId}`]: updatedWeek,
                          eventLog: [...agency.eventLog, {
                              id: `chall-accept-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
                              label: 'Contrat Signé', deltaVE: 0, description: `Nouvelle mission ajoutée au planning: "${challenge.title}"`
                          }]
                      });

                      // Notification for the group
                      const memberIds = agency.members.map(m => m.id);
                      notificationService.createGroupNotification(
                          memberIds,
                          "Challenge accepté",
                          `Le challenge "${challenge.title}" a été accepté par l'équipe et ajouté au planning.`,
                          "SUCCESS"
                      );
                  } else {
                      throw new Error("Impossible de trouver la semaine en cours.");
                  }
              } else {
                  const rejections = Object.values(newVotes).filter(v => v === 'REJECT').length;
                  if (rejections / totalVoters >= (1 - GAME_RULES.VOTE_THRESHOLD_CHALLENGE)) {
                      // Reject the challenge completely
                      transaction.update(agencyRef, {
                          challenges: agency.challenges?.filter(c => c.id !== challengeId),
                          eventLog: [...agency.eventLog, {
                              id: `chall-reject-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
                              label: 'Contrat Refusé', deltaVE: 0, description: `La mission "${challenge.title}" a été refusée par l'équipe.`
                          }]
                      });
                  } else {
                      // Just update the votes
                      const updatedChallenges = agency.challenges?.map(c => c.id === challengeId ? { ...c, votes: newVotes } : c);
                      transaction.update(agencyRef, { challenges: updatedChallenges });
                  }
              }
          });
          toast('success', "Vote enregistré.");
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const submitChallengeVote = async (agencyId: string, challengeId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      if (role === 'admin') {
          await executeSubmitChallengeVote(agencyId, challengeId, voterId, vote);
      } else {
          await dispatchAction('SUBMIT_CHALLENGE_VOTE', { agencyId, challengeId, voterId, vote }, voterId, agencyId);
      }
  };

  const executePurchaseIntel = async (agencyId: string, weekId: string) => {
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists) throw new Error("Agence introuvable");
              const agency = agencyDoc.data() as Agency;

              const COST = 300; 
              if (agency.budget_real < COST) {
                  throw new Error(`Fonds insuffisants (${COST} PiXi requis).`);
              }

              const today = new Date().toISOString().split('T')[0];
              transaction.update(agencyRef, {
                  budget_real: agency.budget_real - COST,
                  [`progress.${weekId}.isVisible`]: true,
                  eventLog: [...agency.eventLog, {
                      id: `intel-${Date.now()}`,
                      date: today,
                      type: 'INFO',
                      label: 'Achat Renseignement',
                      deltaBudgetReal: -COST,
                      description: `Déblocage anticipé des informations de la Semaine ${weekId}.`
                  }]
              });
          });
          toast('success', `Semaine ${weekId} débloquée !`);
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const purchaseIntel = async (agencyId: string, weekId: string) => {
      if (role === 'admin') {
          await executePurchaseIntel(agencyId, weekId);
      } else {
          const agency = agencies.find(a => a.id === agencyId);
          const studentId = agency?.members[0]?.id || 'unknown';
          await dispatchAction('PURCHASE_INTEL', { agencyId, weekId }, studentId, agencyId);
      }
  };

  const executeTriggerVultureBuyout = async (sourceAgencyId: string, targetAgencyId: string) => {
      try {
          await runTransaction(db, async (transaction) => {
              const sourceRef = doc(db, "agencies", sourceAgencyId);
              const targetRef = doc(db, "agencies", targetAgencyId);
              
              const sourceDoc = await transaction.get(sourceRef);
              const targetDoc = await transaction.get(targetRef);
              
              if (!sourceDoc.exists || !targetDoc.exists) throw new Error("Agence introuvable");
              
              const source = sourceDoc.data() as Agency;
              const target = targetDoc.data() as Agency;
              
              if (source.type !== 'HOLDING') throw new Error("Seules les Holdings peuvent effectuer un rachat vautour.");
              if (target.budget_real >= HOLDING_RULES.BUYOUT_VULTURE_THRESHOLD) throw new Error("Cible non éligible (Budget > -3000).");
              
              const newMembers = [...source.members, ...target.members];
              const newBudget = source.budget_real + target.budget_real;
              
              const sourceMarketVE = calculateMarketVE(source);
              const targetMarketVE = calculateMarketVE(target);
              const combinedMarketVE = sourceMarketVE + targetMarketVE;
              
              // On recalcule le Cap pour la nouvelle taille
              const newVECap = calculateVECap({ ...source, members: newMembers });
              
              // On applique le bouclier sur la somme des VE actuelles
              const finalVE = applyVEShield(source.ve_current + target.ve_current, 0, combinedMarketVE, newVECap);
              
              const buyoutEvent: GameEvent = {
                  id: `buyout-${Date.now()}`,
                  date: new Date().toISOString().split('T')[0],
                  type: 'INFO',
                  label: 'Rachat Vautour',
                  deltaVE: targetMarketVE,
                  deltaBudgetReal: target.budget_real,
                  description: `Absorption forcée de ${target.name}.`
              };
              
              transaction.update(sourceRef, {
                  members: newMembers,
                  budget_real: newBudget,
                  ve_current: finalVE,
                  eventLog: [...source.eventLog, buyoutEvent]
              });
              
              transaction.delete(targetRef);

              // Notification for the new combined agency
              const combinedMemberIds = newMembers.map(m => m.id);
              notificationService.createGroupNotification(
                  combinedMemberIds,
                  "Rachat Vautour",
                  `L'agence ${target.name} a été absorbée par ${source.name}.`,
                  "WARNING"
              );
          });
          toast('success', `Rachat Vautour effectué !`);
      } catch (e: any) {
          toast('error', e.message);
      }
  };

  const triggerVultureBuyout = async (sourceAgencyId: string, targetAgencyId: string) => {
      if (role === 'admin') {
          await executeTriggerVultureBuyout(sourceAgencyId, targetAgencyId);
      } else {
          const source = agencies.find(a => a.id === sourceAgencyId);
          const studentId = source?.members[0]?.id || 'unknown';
          await dispatchAction('TRIGGER_VULTURE_BUYOUT', { sourceAgencyId, targetAgencyId }, studentId, sourceAgencyId);
      }
  };

  return { 
      performBlackOp, 
      triggerBlackOp, 
      proposeMerger, 
      finalizeMerger, 
      sendChallenge, 
      submitChallengeVote, 
      purchaseIntel,
      triggerVultureBuyout,
      // EXPORT EXECUTORS
      executePerformBlackOp,
      executeProposeMerger,
      executeFinalizeMerger,
      executeSendChallenge,
      executeSubmitChallengeVote,
      executePurchaseIntel,
      executeTriggerVultureBuyout
  };
};
