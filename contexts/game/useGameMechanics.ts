
import { writeBatch, doc, updateDoc } from '../../services/firebase';
import { db } from '../../services/firebase';
import { Agency, GameEvent, MergerRequest, ChallengeRequest, Deliverable, Student, Bet, MercatoRequest } from '../../types';
import { calculateVECap, GAME_RULES, CONSTRAINTS_POOL } from '../../constants';

export const useGameMechanics = (agencies: Agency[], toast: (type: string, msg: string) => void, getCurrentGameWeek: () => number) => {

  const updateAgency = async (updatedAgency: Agency) => {
    try {
        const veCap = calculateVECap(updatedAgency);
        const finalVE = Math.min(updatedAgency.ve_current, veCap);
        const agencyRef = doc(db, "agencies", updatedAgency.id);
        await updateDoc(agencyRef, { ...updatedAgency, ve_current: finalVE });
    } catch (e) {
        console.error(e);
        toast('error', 'Erreur sauvegarde');
    }
  };

  const processPerformance = async (targetClass: 'A' | 'B') => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        let processedCount = 0;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned' || agency.classId !== targetClass) return;
            processedCount++;
            
            let logEvents: GameEvent[] = [];
            const updatedMembers = (agency.members || []).map(member => {
                const reviews = agency.peerReviews.filter(r => r.targetId === member.id);
                if (reviews.length === 0) return member;
                const avg = reviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / reviews.length;
                let scoreDelta = 0;
                let newStreak = member.streak || 0;
                if (avg > 4.5) { scoreDelta = 2; newStreak++; if (newStreak >= 3) { scoreDelta += 10; newStreak = 0; } } 
                else if (avg >= 4.0) { scoreDelta = 1; newStreak = 0; } 
                else if (avg < 2.0) { scoreDelta = -5; newStreak = 0; } 
                else { newStreak = 0; }
                return { ...member, individualScore: Math.max(0, Math.min(100, member.individualScore + scoreDelta)), streak: newStreak };
            });

            let veAdjustment = 0;
            const budget = agency.budget_real;
            if (budget >= 2000) veAdjustment += Math.floor(budget / 2000);
            else if (budget < 0) veAdjustment -= Math.ceil(Math.abs(budget) / 1000) * 2;

            if (veAdjustment !== 0) {
                logEvents.push({ id: `perf-ve-${Date.now()}-${agency.id}`, date: today, type: veAdjustment > 0 ? 'VE_DELTA' : 'CRISIS', label: 'Ajustement VE', deltaVE: veAdjustment, description: veAdjustment > 0 ? 'Trésorerie saine.' : 'Dette.' });
            }

            const veCap = calculateVECap(agency);
            const finalVE = Math.min(Math.max(0, agency.ve_current + veAdjustment), veCap);

            const ref = doc(db, "agencies", agency.id);
            batch.update(ref, {
                members: updatedMembers,
                ve_current: finalVE,
                peerReviews: [], 
                eventLog: [...agency.eventLog, ...logEvents],
                status: finalVE >= 60 ? 'stable' : finalVE >= 40 ? 'fragile' : 'critique'
            });
        });

        if (processedCount > 0) {
            await batch.commit();
            toast('success', `Performance Classe ${targetClass}: Terminée.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Performance"); }
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

  const performBlackOp = async (
      studentId: string, 
      agencyId: string, 
      opType: 'SHORT_SELL' | 'DOXXING' | 'FAKE_CERT' | 'BUY_VOTE' | 'AUDIT_HOSTILE', 
      payload: any
  ) => {
      const studentAgency = agencies.find(a => a.id === agencyId);
      if (!studentAgency) return;
      const student = studentAgency.members.find(m => m.id === studentId);
      if (!student) return;

      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agencyId);
      const today = new Date().toISOString().split('T')[0];

      // COÛTS & KARMA
      let costPixi = 0;
      let costKarma = 0;

      switch(opType) {
          case 'SHORT_SELL': costPixi = 500; costKarma = 5; break;
          case 'DOXXING': costPixi = 600; costKarma = 10; break;
          case 'FAKE_CERT': costPixi = 500; costKarma = 20; break; // Risqué
          case 'BUY_VOTE': costPixi = 200; costKarma = 15; break;
          case 'AUDIT_HOSTILE': costPixi = 500; costKarma = 10; break;
      }

      if ((student.wallet || 0) < costPixi) {
          toast('error', "Fonds insuffisants.");
          return;
      }

      // 1. DEDUCT COST FROM STUDENT
      const updatedMembers = studentAgency.members.map(m => 
          m.id === studentId ? { ...m, wallet: (m.wallet || 0) - costPixi, karma: (m.karma || 50) - costKarma } : m
      );
      
      // LOGIC PER OP TYPE
      if (opType === 'SHORT_SELL') {
          // Add Bet to Student
          const targetAgency = agencies.find(a => a.id === payload.targetId);
          if (!targetAgency) return;
          
          const newBet: Bet = {
              id: `bet-${Date.now()}`,
              targetAgencyId: payload.targetId,
              targetAgencyName: targetAgency.name,
              amountWagered: 500,
              weekId: getCurrentGameWeek().toString(),
              status: 'ACTIVE',
              date: today
          };

          const memberIndex = updatedMembers.findIndex(m => m.id === studentId);
          if (memberIndex > -1) {
              updatedMembers[memberIndex].activeBets = [...(updatedMembers[memberIndex].activeBets || []), newBet];
          }
          
          batch.update(agencyRef, { members: updatedMembers });
          toast('success', "Ordre de Vente à Découvert placé.");

      } else if (opType === 'DOXXING') {
          // Just deduct money, UI handles the reveal
          batch.update(agencyRef, { members: updatedMembers });
          // No visual toast needed, the UI will show the data immediately
      } else if (opType === 'FAKE_CERT') {
          // Find week and deliverable
          const weekId = payload.weekId;
          const deliverableId = payload.deliverableId;
          const week = studentAgency.progress[weekId];
          
          if (week) {
              const updatedDeliverables = week.deliverables.map(d => {
                  if (d.id === deliverableId && d.grading) {
                      return { ...d, grading: { ...d.grading, daysLate: 0 } }; // ERASE DELAY
                  }
                  return d;
              });
              const updatedWeek = { ...week, deliverables: updatedDeliverables };
              batch.update(agencyRef, { 
                  members: updatedMembers, 
                  [`progress.${weekId}`]: updatedWeek 
              });
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
                  
                  // If paying student is in same agency, update members there. If different, update source agency.
                  if (targetAgency.id === agencyId) {
                      batch.update(agencyRef, { members: updatedMembers, mercatoRequests: updatedReqs });
                  } else {
                      batch.update(agencyRef, { members: updatedMembers });
                  }
                  toast('success', "Vote fantôme injecté.");
              }
          }

      } else if (opType === 'AUDIT_HOSTILE') {
          await triggerBlackOp(agencyId, payload.targetId, 'AUDIT');
          // Update wallet separately because triggerBlackOp usually uses Agency Budget, here we use Personal Wallet
          // But wait, triggerBlackOp is agency vs agency. Here prompt says "Move it here".
          // Let's assume student pays for it personally in the Backdoor version.
          const targetAgency = agencies.find(a => a.id === payload.targetId);
          if (targetAgency) {
               const isVulnerable = targetAgency.budget_real < 0 || targetAgency.ve_current < 40;
               if (isVulnerable) {
                   batch.update(doc(db, "agencies", targetAgency.id), {
                       ve_current: Math.max(0, targetAgency.ve_current - 10),
                       eventLog: [...targetAgency.eventLog, {
                           id: `op-hit-${Date.now()}`, date: today, type: 'CRISIS', label: "Audit Externe (Sanction)", deltaVE: -10, description: "Des irrégularités ont été exposées."
                       }]
                   });
                   toast('success', "Cible touchée ! -10 VE.");
               } else {
                   // Risk: Admin sees suspicion. No automatic penalty here to keep "Trace" logic separate.
                   toast('error', "Cible saine. L'audit n'a rien trouvé.");
               }
               batch.update(agencyRef, { members: updatedMembers });
          }
      }

      // GLOBAL TRACE (For Admin)
      // We add a 'BLACK_OP' event to the source agency to track activity, but without description to keep it vague for admin unless they dig
      // Or we append to a global log. For now, let's append to agency log but marked as hidden/system or just "Activite Suspecte"
      batch.update(agencyRef, {
          eventLog: [...studentAgency.eventLog, {
              id: `trace-${Date.now()}`,
              date: today,
              type: 'BLACK_OP',
              label: 'Activité Suspecte',
              deltaVE: 0,
              description: "Une transaction non-signée a été détectée sur le réseau."
          }]
      });

      await batch.commit();
  };

  const triggerBlackOp = async (sourceAgencyId: string, targetAgencyId: string, type: 'AUDIT' | 'LEAK') => {
      // LEGACY AGENCY-FUNDED BLACK OPS (KEPT FOR COMPATIBILITY OR IF CALLED FROM MARKET VIEW)
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
          toast('error', "Fonds insuffisants pour cette opération.");
          return;
      }

      const batch = writeBatch(db);
      const today = new Date().toISOString().split('T')[0];

      // 1. Pay Cost
      const sourceRef = doc(db, "agencies", sourceAgency.id);
      batch.update(sourceRef, {
          budget_real: sourceAgency.budget_real - cost,
          eventLog: [...sourceAgency.eventLog, {
              id: `op-cost-${Date.now()}`, date: today, type: 'BLACK_OP', label: `Opération: ${type}`, deltaBudgetReal: -cost, description: `Paiement prestataire externe.`
          }]
      });

      // 2. Execute Effect
      if (type === 'LEAK') {
          toast('success', "Fuite obtenue : Le brief de la semaine prochaine contient une contrainte 'Low Tech'.");
      } else if (type === 'AUDIT') {
          const isVulnerable = targetAgency.budget_real < 0 || targetAgency.ve_current < 40;
          if (isVulnerable) {
               const targetRef = doc(db, "agencies", targetAgency.id);
               batch.update(targetRef, {
                   ve_current: Math.max(0, targetAgency.ve_current - 10),
                   eventLog: [...targetAgency.eventLog, {
                       id: `op-hit-${Date.now()}`, date: today, type: 'CRISIS', label: "Audit Externe (Sanction)", deltaVE: -10, description: "Des irrégularités ont été exposées par un audit concurrent."
                   }]
               });
               toast('success', `Audit réussi ! ${targetAgency.name} perd 10 VE.`);
          } else {
               batch.update(sourceRef, {
                   ve_current: Math.max(0, sourceAgency.ve_current - 20),
                   eventLog: [...sourceAgency.eventLog, {
                       id: `op-fail-${Date.now()}`, date: today, type: 'CRISIS', label: "Procès Diffamation", deltaVE: -20, description: "L'audit n'a rien révélé. L'agence cible porte plainte."
                   }]
               });
               toast('error', `Echec ! ${targetAgency.name} est clean. Vous perdez 20 VE pour diffamation.`);
          }
      }
      await batch.commit();
  };

  const submitMercatoVote = async (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const request = agency.mercatoRequests.find(r => r.id === requestId);
      if(!request) return;

      const newVotes = { ...request.votes, [voterId]: vote };
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      let totalVoters = agency.members.length;
      let threshold = GAME_RULES.VOTE_THRESHOLD_HIRE; 
      
      if (request.type === 'FIRE' && request.requesterId !== request.studentId) { 
          totalVoters = Math.max(1, agency.members.length - 1); 
          threshold = GAME_RULES.VOTE_THRESHOLD_FIRE;
      }

      const batch = writeBatch(db);
      if (approvals / totalVoters > threshold) {
          const targetAgency = agencies.find(a => a.id === 'unassigned');
          if(targetAgency) {
               const student = agency.members.find(m => m.id === request.studentId);
               if(student) {
                   const updatedSource = agency.members.filter(m => m.id !== request.studentId);
                   const updatedTarget = [...targetAgency.members, { ...student, history: [] }];
                   batch.update(doc(db, "agencies", agency.id), { members: updatedSource, mercatoRequests: agency.mercatoRequests.filter(r => r.id !== requestId) });
                   batch.update(doc(db, "agencies", targetAgency.id), { members: updatedTarget });
               }
          }
      } else {
          const updatedRequests = agency.mercatoRequests.map(r => r.id === requestId ? { ...r, votes: newVotes } : r);
          batch.update(doc(db, "agencies", agency.id), { mercatoRequests: updatedRequests });
      }
      await batch.commit();
      toast('success', "Vote enregistré");
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
           toast('error', "Cette agence est trop stable pour être rachetée (VE > 40).");
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

      const targetRef = doc(db, "agencies", targetAgencyId);
      await updateDoc(targetRef, {
          mergerRequests: [...(targetAgency.mergerRequests || []), request]
      });
      toast('success', "Proposition de rachat envoyée.");
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
          toast('error', `Fusion impossible : La nouvelle équipe dépasserait ${GAME_RULES.MERGER_MAX_MEMBERS} membres.`);
          return;
      }

      const newMembers = [...sourceAgency.members, ...targetAgency.members];
      const newBudget = sourceAgency.budget_real + targetAgency.budget_real;
      
      batch.update(doc(db, "agencies", sourceAgency.id), {
          members: newMembers,
          budget_real: newBudget,
          eventLog: [...sourceAgency.eventLog, {
              id: `merger-win-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'MERGER', label: "Acquisition", description: `Rachat de ${targetAgency.name}. Dette absorbée.`
          }]
      });

      batch.update(doc(db, "agencies", targetAgency.id), {
          members: [],
          status: 'critique',
          name: `${targetAgency.name} (Dissoute)`,
          mergerRequests: []
      });

      await batch.commit();
      toast('success', "Fusion confirmée. Agence absorbée.");
  };

  const sendChallenge = async (targetAgencyId: string, title: string, description: string) => {
      const agency = agencies.find(a => a.id === targetAgencyId);
      if (!agency) return;

      const newChallenge: ChallengeRequest = {
          id: `chal-${Date.now()}`,
          title,
          description,
          status: 'PENDING_VOTE',
          date: new Date().toISOString().split('T')[0],
          rewardVE: 10,
          votes: {}
      };

      const agencyRef = doc(db, "agencies", targetAgencyId);
      await updateDoc(agencyRef, {
          challenges: [...(agency.challenges || []), newChallenge]
      });
      toast('success', "Challenge envoyé au vote !");
  };

  const submitChallengeVote = async (agencyId: string, challengeId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;
      const challenge = agency.challenges?.find(c => c.id === challengeId);
      if (!challenge) return;

      const newVotes = { ...challenge.votes, [voterId]: vote };
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      const totalVoters = agency.members.length;
      
      const isAccepted = (approvals / totalVoters) > GAME_RULES.VOTE_THRESHOLD_CHALLENGE;
      
      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agency.id);

      if (isAccepted) {
          const updatedChallenges = agency.challenges?.map(c => 
              c.id === challengeId ? { ...c, status: 'ACCEPTED', votes: newVotes } : c
          );
          
          const currentWeekId = getCurrentGameWeek().toString();
          const weekData = agency.progress[currentWeekId];
          if (weekData) {
              const newDeliverable: Deliverable = {
                  id: `d-special-${Date.now()}`,
                  name: `CHALLENGE: ${challenge.title}`,
                  description: challenge.description,
                  status: 'pending',
                  score: 0
              };
              
              const updatedWeek = {
                  ...weekData,
                  deliverables: [...weekData.deliverables, newDeliverable]
              };

              batch.update(agencyRef, {
                  challenges: updatedChallenges,
                  [`progress.${currentWeekId}`]: updatedWeek,
                  eventLog: [...agency.eventLog, {
                      id: `chal-acc-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
                      label: "Challenge Accepté", description: "L'équipe a accepté le défi spécial. Mission ajoutée."
                  }]
              });
              toast('success', "Challenge accepté ! Mission créée.");
          }
      } else {
          const updatedChallenges = agency.challenges?.map(c => 
              c.id === challengeId ? { ...c, votes: newVotes } : c
          );
          batch.update(agencyRef, { challenges: updatedChallenges });
      }

      await batch.commit();
  };

  return { updateAgency, processPerformance, shuffleConstraints, triggerBlackOp, performBlackOp, submitMercatoVote, proposeMerger, finalizeMerger, sendChallenge, submitChallengeVote };
};
