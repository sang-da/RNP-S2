import { writeBatch, doc, updateDoc, db } from '../../../services/firebase';
import { Agency, MergerRequest, ChallengeRequest, Deliverable, Bet } from '../../../types';
import { GAME_RULES } from '../../../constants';

export const useOperationsLogic = (
    agencies: Agency[], 
    toast: (type: string, msg: string) => void, 
    getCurrentGameWeek: () => number
) => {

  const performBlackOp = async (
      studentId: string, 
      agencyId: string, 
      opType: 'SHORT_SELL' | 'DOXXING' | 'FAKE_CERT' | 'BUY_VOTE' | 'AUDIT_HOSTILE' | 'LEAK', 
      payload: any
  ) => {
      const studentAgency = agencies.find(a => a.id === agencyId);
      if (!studentAgency) return;
      const student = studentAgency.members.find(m => m.id === studentId);
      if (!student) return;

      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agencyId);
      const today = new Date().toISOString().split('T')[0];

      let costPixi = 0;
      let costKarma = 0;

      switch(opType) {
          case 'SHORT_SELL': costPixi = 500; costKarma = 5; break;
          case 'DOXXING': costPixi = 600; costKarma = 10; break;
          case 'FAKE_CERT': costPixi = 500; costKarma = 20; break; 
          case 'BUY_VOTE': costPixi = 200; costKarma = 15; break;
          case 'AUDIT_HOSTILE': costPixi = 500; costKarma = 10; break;
          case 'LEAK': costPixi = 300; costKarma = 5; break;
      }

      if ((student.wallet || 0) < costPixi) {
          toast('error', "Fonds insuffisants.");
          return;
      }

      const updatedMembers = studentAgency.members.map(m => 
          m.id === studentId ? { ...m, wallet: (m.wallet || 0) - costPixi, karma: (m.karma || 50) - costKarma } : m
      );
      
      if (opType === 'SHORT_SELL') {
          const targetAgency = agencies.find(a => a.id === payload.targetId);
          if (!targetAgency) return;
          const newBet: Bet = {
              id: `bet-${Date.now()}`, targetAgencyId: payload.targetId, targetAgencyName: targetAgency.name,
              amountWagered: 500, weekId: getCurrentGameWeek().toString(), status: 'ACTIVE', date: today
          };
          const memberIndex = updatedMembers.findIndex(m => m.id === studentId);
          if (memberIndex > -1) updatedMembers[memberIndex].activeBets = [...(updatedMembers[memberIndex].activeBets || []), newBet];
          batch.update(agencyRef, { members: updatedMembers });
          toast('success', "Ordre de Vente à Découvert placé.");

      } else if (opType === 'DOXXING' || opType === 'LEAK') {
          // Actions immédiates sans impact DB complexe (Géré coté UI ou Notif)
          batch.update(agencyRef, { members: updatedMembers });
      } else if (opType === 'FAKE_CERT') {
          const weekId = payload.weekId;
          const deliverableId = payload.deliverableId;
          const week = studentAgency.progress[weekId];
          if (week) {
              const updatedDeliverables = week.deliverables.map(d => {
                  if (d.id === deliverableId && d.grading) {
                      return { ...d, grading: { ...d.grading, daysLate: 0 } }; 
                  }
                  return d;
              });
              const updatedWeek = { ...week, deliverables: updatedDeliverables };
              batch.update(agencyRef, { members: updatedMembers, [`progress.${weekId}`]: updatedWeek });
              toast('success', "Certificat falsifié. Retard annulé.");
          }
      } else if (opType === 'BUY_VOTE') {
          const reqId = payload.requestId;
          const targetAgency = agencies.find(a => a.mercatoRequests.some(r => r.id === reqId));
          if (targetAgency) {
              const req = targetAgency.mercatoRequests.find(r => r.id === reqId);
              if (req) {
                  const ghostId = `ghost-${Date.now()}`;
                  const newVotes = { ...req.votes, [ghostId]: 'APPROVE' as const };
                  const updatedReqs = targetAgency.mercatoRequests.map(r => r.id === reqId ? { ...r, votes: newVotes } : r);
                  batch.update(doc(db, "agencies", targetAgency.id), { mercatoRequests: updatedReqs });
                  if (targetAgency.id === agencyId) batch.update(agencyRef, { members: updatedMembers, mercatoRequests: updatedReqs });
                  else batch.update(agencyRef, { members: updatedMembers });
                  toast('success', "Vote fantôme injecté.");
              }
          }
      } else if (opType === 'AUDIT_HOSTILE') {
          await triggerBlackOp(agencyId, payload.targetId, 'AUDIT');
          const targetAgency = agencies.find(a => a.id === payload.targetId);
          if (targetAgency) {
               const isVulnerable = targetAgency.budget_real < 0 || targetAgency.ve_current < 40;
               if (isVulnerable) {
                   batch.update(doc(db, "agencies", targetAgency.id), {
                       ve_current: Math.max(0, targetAgency.ve_current - 10),
                       eventLog: [...targetAgency.eventLog, { id: `op-hit-${Date.now()}`, date: today, type: 'CRISIS', label: "Audit Externe (Sanction)", deltaVE: -10, description: "Des irrégularités ont été exposées." }]
                   });
                   toast('success', "Cible touchée ! -10 VE.");
               } else {
                   toast('error', "Cible saine. L'audit n'a rien trouvé.");
               }
               batch.update(agencyRef, { members: updatedMembers });
          }
      }

      batch.update(agencyRef, {
          eventLog: [...studentAgency.eventLog, { id: `trace-${Date.now()}`, date: today, type: 'BLACK_OP', label: 'Activité Suspecte', deltaVE: 0, description: "Une transaction non-signée a été détectée sur le réseau." }]
      });
      await batch.commit();
  };

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
          toast('error', "Fonds insuffisants.");
          return;
      }

      const batch = writeBatch(db);
      const today = new Date().toISOString().split('T')[0];
      const sourceRef = doc(db, "agencies", sourceAgency.id);
      
      batch.update(sourceRef, {
          budget_real: sourceAgency.budget_real - cost,
          eventLog: [...sourceAgency.eventLog, { id: `op-cost-${Date.now()}`, date: today, type: 'BLACK_OP', label: `Opération: ${type}`, deltaBudgetReal: -cost, description: `Paiement prestataire externe.` }]
      });

      if (type === 'LEAK') {
          toast('success', "Fuite obtenue.");
      } else if (type === 'AUDIT') {
          const isVulnerable = targetAgency.budget_real < 0 || targetAgency.ve_current < 40;
          if (isVulnerable) {
               const targetRef = doc(db, "agencies", targetAgency.id);
               batch.update(targetRef, {
                   ve_current: Math.max(0, targetAgency.ve_current - 10),
                   eventLog: [...targetAgency.eventLog, { id: `op-hit-${Date.now()}`, date: today, type: 'CRISIS', label: "Audit Externe (Sanction)", deltaVE: -10, description: "Des irrégularités ont été exposées." }]
               });
               toast('success', `Audit réussi ! ${targetAgency.name} perd 10 VE.`);
          } else {
               batch.update(sourceRef, {
                   ve_current: Math.max(0, sourceAgency.ve_current - 20),
                   eventLog: [...sourceAgency.eventLog, { id: `op-fail-${Date.now()}`, date: today, type: 'CRISIS', label: "Procès Diffamation", deltaVE: -20, description: "L'audit n'a rien révélé. L'agence cible porte plainte." }]
               });
               toast('error', `Echec ! ${targetAgency.name} est clean. Vous perdez 20 VE.`);
          }
      }
      await batch.commit();
  };

  const proposeMerger = async (sourceAgencyId: string, targetAgencyId: string) => {
      const week = getCurrentGameWeek();
      if (week < GAME_RULES.UNLOCK_WEEK_MERGERS) {
          toast('error', `Fusions disponibles en Semaine ${GAME_RULES.UNLOCK_WEEK_MERGERS}.`);
          return;
      }
      const targetAgency = agencies.find(a => a.id === targetAgencyId);
      if(!targetAgency) return;
      if (targetAgency.ve_current > GAME_RULES.MERGER_VE_THRESHOLD) {
           toast('error', "Cette agence est trop stable (VE > 40).");
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
      await updateDoc(doc(db, "agencies", targetAgencyId), { mergerRequests: [...(targetAgency.mergerRequests || []), request] });
      toast('success', "Proposition envoyée.");
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
          toast('error', `Fusion impossible : > ${GAME_RULES.MERGER_MAX_MEMBERS} membres.`);
          return;
      }

      batch.update(doc(db, "agencies", sourceAgency.id), {
          members: [...sourceAgency.members, ...targetAgency.members],
          budget_real: sourceAgency.budget_real + targetAgency.budget_real,
          eventLog: [...sourceAgency.eventLog, { id: `merger-win-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'MERGER', label: "Acquisition", description: `Rachat de ${targetAgency.name}. Dette absorbée.` }]
      });

      batch.update(doc(db, "agencies", targetAgency.id), {
          members: [], status: 'critique', name: `${targetAgency.name} (Dissoute)`, mergerRequests: []
      });

      await batch.commit();
      toast('success', "Fusion confirmée.");
  };

  const sendChallenge = async (targetAgencyId: string, title: string, description: string) => {
      const agency = agencies.find(a => a.id === targetAgencyId);
      if (!agency) return;
      const newChallenge: ChallengeRequest = {
          id: `chal-${Date.now()}`, title, description, status: 'PENDING_VOTE',
          date: new Date().toISOString().split('T')[0], rewardVE: 10, votes: {}
      };
      await updateDoc(doc(db, "agencies", targetAgencyId), { challenges: [...(agency.challenges || []), newChallenge] });
      toast('success', "Challenge envoyé !");
  };

  const submitChallengeVote = async (agencyId: string, challengeId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;
      const challenge = agency.challenges?.find(c => c.id === challengeId);
      if (!challenge) return;

      const newVotes = { ...challenge.votes, [voterId]: vote };
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      const isAccepted = (approvals / agency.members.length) > GAME_RULES.VOTE_THRESHOLD_CHALLENGE;
      
      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agency.id);

      if (isAccepted) {
          const updatedChallenges = agency.challenges?.map(c => c.id === challengeId ? { ...c, status: 'ACCEPTED', votes: newVotes } : c);
          const currentWeekId = getCurrentGameWeek().toString();
          const weekData = agency.progress[currentWeekId];
          if (weekData) {
              const newDeliverable: Deliverable = {
                  id: `d-special-${Date.now()}`, name: `CHALLENGE: ${challenge.title}`, description: challenge.description, status: 'pending', score: 0
              };
              const updatedWeek = { ...weekData, deliverables: [...weekData.deliverables, newDeliverable] };
              batch.update(agencyRef, { challenges: updatedChallenges, [`progress.${currentWeekId}`]: updatedWeek });
              toast('success', "Challenge accepté ! Mission créée.");
          }
      } else {
          batch.update(agencyRef, { challenges: agency.challenges?.map(c => c.id === challengeId ? { ...c, votes: newVotes } : c) });
      }
      await batch.commit();
  };

  return { performBlackOp, triggerBlackOp, proposeMerger, finalizeMerger, sendChallenge, submitChallengeVote };
};