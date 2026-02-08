
import { writeBatch, doc, db } from '../../../services/firebase';
import { Agency, GameEvent, Deliverable } from '../../../types';
import { GAME_RULES } from '../../../constants';

export const useOperationsLogic = (agencies: Agency[], toast: (type: string, msg: string) => void, getCurrentGameWeek: () => number) => {

  const performBlackOp = async (studentId: string, agencyId: string, opType: string, payload: any) => {
      // Implementation of black op logic
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if (!student) return;

      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agency.id);
      
      // Deduct cost
      // (Simplified logic for brevity, assuming UI checked funds)
      let cost = 0;
      if (opType === 'SHORT_SELL') cost = 500;
      if (opType === 'DOXXING') cost = 600;
      if (opType === 'FAKE_CERT') cost = 500;
      if (opType === 'LEAK') cost = 300;
      if (opType === 'BUY_VOTE') cost = 200;
      if (opType === 'AUDIT_HOSTILE') cost = 500;

      const updatedMembers = agency.members.map(m => m.id === studentId ? { ...m, wallet: (m.wallet || 0) - cost } : m);
      
      const newEvent: GameEvent = {
          id: `op-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'BLACK_OP',
          label: `Opération: ${opType}`,
          description: `Action secrète effectuée par ${student.name}.`,
          deltaBudgetReal: 0 // Usually paid by student wallet
      };

      batch.update(agencyRef, { 
          members: updatedMembers,
          eventLog: [...agency.eventLog, newEvent]
      });

      // Handle specific effects (Simplified)
      if (opType === 'AUDIT_HOSTILE' && payload.targetId) {
          const target = agencies.find(a => a.id === payload.targetId);
          if (target) {
              const isFragile = target.ve_current < 40 || target.budget_real < 0;
              const targetRef = doc(db, "agencies", target.id);
              if (isFragile) {
                  batch.update(targetRef, { 
                      ve_current: Math.max(0, target.ve_current - 10),
                      eventLog: [...target.eventLog, {
                          id: `audit-hit-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'CRISIS',
                          label: 'Audit Hostile Subi', deltaVE: -10, description: "Des failles ont été exposées."
                      }]
                  });
              } else {
                  // Backfire on source agency
                  batch.update(agencyRef, {
                      ve_current: Math.max(0, agency.ve_current - 20),
                      eventLog: [...agency.eventLog, newEvent, {
                          id: `audit-fail-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'CRISIS',
                          label: 'Audit Abusif', deltaVE: -20, description: "Attaque ratée sur cible saine."
                      }]
                  });
              }
          }
      }

      await batch.commit();
      toast('success', `Opération ${opType} exécutée.`);
  };

  const triggerBlackOp = async (sourceAgencyId: string, targetAgencyId: string, type: 'AUDIT' | 'LEAK') => {
      // Logic for triggering black op from UI or Admin
      console.log("Trigger Black Op", sourceAgencyId, targetAgencyId, type);
  };

  const proposeMerger = async (sourceAgencyId: string, targetAgencyId: string) => {
      const source = agencies.find(a => a.id === sourceAgencyId);
      const target = agencies.find(a => a.id === targetAgencyId);
      if(!source || !target) return;

      const request = {
          id: `merger-${Date.now()}`,
          requesterAgencyId: source.id,
          requesterAgencyName: source.name,
          targetAgencyId: target.id,
          status: 'PENDING',
          date: new Date().toISOString().split('T')[0],
          offerDetails: `Absorption proposée par ${source.name}.`
      };

      await writeBatch(db).update(doc(db, "agencies", target.id), {
          mergerRequests: [...(target.mergerRequests || []), request]
      }).commit();
      
      toast('success', "Proposition de rachat envoyée.");
  };

  const finalizeMerger = async (mergerId: string, targetAgencyId: string, approved: boolean) => {
      const target = agencies.find(a => a.id === targetAgencyId);
      if(!target) return;
      const request = target.mergerRequests?.find(r => r.id === mergerId);
      if(!request) return;

      const source = agencies.find(a => a.id === request.requesterAgencyId);
      if(!source) return;

      const batch = writeBatch(db);
      
      // Update Target (Remove request)
      const newRequests = target.mergerRequests?.filter(r => r.id !== mergerId);
      
      if (!approved) {
          batch.update(doc(db, "agencies", target.id), { mergerRequests: newRequests });
          await batch.commit();
          toast('info', "Fusion refusée.");
          return;
      }

      // EXECUTE MERGER
      const combinedMembers = [...source.members, ...target.members];
      const combinedBudget = source.budget_real + target.budget_real; // Debts are summed too
      
      // Update Source
      batch.update(doc(db, "agencies", source.id), {
          members: combinedMembers,
          budget_real: combinedBudget,
          eventLog: [...source.eventLog, {
              id: `merger-success-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
              label: 'Fusion Complétée', deltaVE: 0, description: `Absorption de ${target.name}.`
          }]
      });

      // Kill Target
      batch.delete(doc(db, "agencies", target.id));

      await batch.commit();
      toast('success', "Fusion confirmée !");
  };

  const sendChallenge = async (targetAgencyId: string, title: string, description: string, rewardVE: number, rewardBudget: number) => {
      const target = agencies.find(a => a.id === targetAgencyId);
      if(!target) return;

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

      await writeBatch(db).update(doc(db, "agencies", target.id), {
          challenges: [...(target.challenges || []), challenge]
      }).commit();
      
      toast('success', "Challenge envoyé !");
  };

  const submitChallengeVote = async (agencyId: string, challengeId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      
      const challenge = agency.challenges?.find(c => c.id === challengeId);
      if(!challenge) return;

      const newVotes = { ...challenge.votes, [voterId]: vote };
      // Check threshold
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      const totalVoters = agency.members.length;
      
      const batch = writeBatch(db);
      
      if (approvals / totalVoters > GAME_RULES.VOTE_THRESHOLD_CHALLENGE) {
          // ACCEPTED -> ON CRÉE UN LIVRABLE SPÉCIAL DANS LA SEMAINE EN COURS
          const currentWeekId = getCurrentGameWeek().toString();
          const currentWeekData = agency.progress[currentWeekId];
          
          if (currentWeekData) {
              const specialDeliverable: Deliverable = {
                  id: `d_special_${Date.now()}`,
                  name: `⚡ MISSION: ${challenge.title}`,
                  description: `${challenge.description} (Récompense: +${challenge.rewardVE} VE, +${challenge.rewardBudget} PiXi)`,
                  status: 'pending',
                  type: 'FILE',
                  // On pourrait stocker les rewards dans le livrable pour l'auto-validation future, mais l'admin gèrera
              };

              const updatedWeek = {
                  ...currentWeekData,
                  deliverables: [...currentWeekData.deliverables, specialDeliverable]
              };

              batch.update(doc(db, "agencies", agency.id), {
                  challenges: agency.challenges?.filter(c => c.id !== challengeId), // Remove pending
                  [`progress.${currentWeekId}`]: updatedWeek,
                  eventLog: [...agency.eventLog, {
                      id: `chall-accept-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
                      label: 'Contrat Signé', deltaVE: 0, description: `Nouvelle mission ajoutée au planning: "${challenge.title}"`
                  }]
              });
              toast('success', "Contrat accepté ! Nouvelle mission ajoutée.");
          } else {
              toast('error', "Impossible de trouver la semaine en cours.");
              return;
          }
      } else {
          // Update votes
          const updatedChallenges = agency.challenges?.map(c => c.id === challengeId ? { ...c, votes: newVotes } : c);
          batch.update(doc(db, "agencies", agency.id), { challenges: updatedChallenges });
      }

      await batch.commit();
  };

  const purchaseIntel = async (agencyId: string, weekId: string) => {
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;

      const COST = 300; 
      if (agency.budget_real < COST) {
          toast('error', `Fonds insuffisants (${COST} PiXi requis).`);
          return;
      }

      const today = new Date().toISOString().split('T')[0];
      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agency.id);

      // On force la visibilité locale de la semaine
      batch.update(agencyRef, {
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

      await batch.commit();
      toast('success', `Semaine ${weekId} débloquée !`);
  };

  return { performBlackOp, triggerBlackOp, proposeMerger, finalizeMerger, sendChallenge, submitChallengeVote, purchaseIntel };
};