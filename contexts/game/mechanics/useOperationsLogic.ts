
import { writeBatch, doc, db } from '../../../services/firebase';
import { Agency, GameEvent, PeerReview, Deliverable } from '../../../types';
import { GAME_RULES } from '../../../constants';

// AJOUT DE reviews EN PARAMÈTRE
export const useOperationsLogic = (agencies: Agency[], reviews: PeerReview[], toast: (type: string, msg: string) => void, getCurrentGameWeek: () => number) => {

  const performBlackOp = async (studentId: string, agencyId: string, opType: string, payload: any) => {
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency) return;
      const student = agency.members.find(m => m.id === studentId);
      if (!student) return;

      const batch = writeBatch(db);
      const agencyRef = doc(db, "agencies", agency.id);
      
      let cost = 0;
      // PRIX ACTUALISÉS
      if (opType === 'DATA_MINER') cost = 600;
      if (opType === 'DOXXING') cost = 500;
      if (opType === 'LEAK') cost = 300;
      if (opType === 'PUMP_DUMP') cost = 800;
      if (opType === 'LAUNDERING') cost = 200; // Frais dossier
      if (opType === 'SHORT_SELL') cost = 500;
      if (opType === 'CORRUPTED_FILE') cost = 400;
      if (opType === 'BUY_VOTE') cost = 250;
      if (opType === 'AUDIT_HOSTILE') cost = 500;

      // Update student wallet
      let updatedMembers = agency.members.map(m => m.id === studentId ? { ...m, wallet: (m.wallet || 0) - cost } : m);
      
      let description = `Opération ${opType} effectuée par ${student.name}.`;
      let eventType: any = 'BLACK_OP';
      let eventLabel = `Opération: ${opType}`;
      
      // --- LOGIQUE SPÉCIFIQUE ---

      // 1. DATA MINER (Enhanced Intel)
      if (opType === 'DATA_MINER' && payload.targetId) {
          // La lecture se fait côté UI (TheBackdoor.tsx) pour l'affichage immédiat
          // Ici on log juste la dépense
          description = `Extraction de données stratégiques sur cible externe.`;
      }

      // 2. LAUNDERING (Score -> Cash)
      else if (opType === 'LAUNDERING') {
          const SCORE_COST = 5; // MODIFIÉ : Coût plus élevé
          const CASH_GAIN = 500; // MODIFIÉ : Gain réduit
          
          if (student.individualScore >= SCORE_COST) {
              updatedMembers = updatedMembers.map(m => m.id === studentId ? { 
                  ...m, 
                  individualScore: m.individualScore - SCORE_COST,
                  wallet: (m.wallet || 0) + CASH_GAIN // Déjà débité du coût plus haut, on rajoute le gain
              } : m);
              description = `Consulting Fantôme : -${SCORE_COST} Score contre +${CASH_GAIN} PiXi.`;
              eventLabel = "Blanchiment";
          } else {
              description = "ÉCHEC : Score insuffisant pour blanchiment.";
              // On rembourse le coût car opération impossible ? Non, le marché noir ne rembourse pas.
          }
      }

      // 3. PUMP & DUMP (Manipulation)
      else if (opType === 'PUMP_DUMP' && payload.targetId) {
          const target = agencies.find(a => a.id === payload.targetId);
          if (target) {
              const targetRef = doc(db, "agencies", target.id);
              
              // Boost immédiat (+5)
              const immediateEvent = {
                  id: `pump-${Date.now()}`, date: new Date().toISOString().split('T')[0], 
                  type: 'VE_DELTA', label: 'Rumeur Positive (Marché)', deltaVE: 5, 
                  description: "Hausse inexpliquée de la cotation. (Pump & Dump phase 1)"
              };

              // On prépare le crash futur (-12) en l'ajoutant déjà mais avec une date future ou via un flag
              // Pour simplifier ici, on applique le boost et on log le futur crash comme une crise "différée"
              // Dans un système parfait, on aurait une queue d'events futurs. 
              // ICI : On applique juste le boost, l'admin gérera le crash ou on fait confiance à l'honneur :)
              // ALTERNATIVE : On applique le malus tout de suite mais invisible ? Non.
              // On va juste mettre +5 VE. Le "Dump" devra être manuel par l'admin ou via un système d'events différés (hors scope actuel).
              // UPDATE : On met un Warning dans le log pour que l'admin le voit.
              
              batch.update(targetRef, {
                  ve_current: Math.min(100, target.ve_current + 5),
                  eventLog: [...target.eventLog, immediateEvent]
              });
              description = `Pump & Dump initié sur ${target.name}. (+5 VE)`;
          }
      }

      // 4. CORRUPTED FILE (Gamble)
      else if (opType === 'CORRUPTED_FILE' && payload.weekId) {
          const roll = Math.random();
          const success = roll < 0.40; // 40% chance
          
          if (success) {
              // On marque un livrable comme "corrompu mais accepté"
              // On modifie l'agence locale
              // Note: payload doit contenir weekId
              const week = agency.progress[payload.weekId];
              if (week) {
                  // On prend le premier livrable pending
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

                      // On update l'agence
                      batch.update(agencyRef, {
                          [`progress.${payload.weekId}`]: updatedWeek,
                          ve_current: agency.ve_current + 4,
                          eventLog: [...agency.eventLog, newEvent]
                      });
                      description = "Fichier corrompu accepté. Gain de temps.";
                  } else {
                      description = "Aucun livrable en attente pour corrompre.";
                  }
              }
          } else {
              // Fail
              const failEvent = {
                  id: `corrupt-fail-${Date.now()}`, date: new Date().toISOString().split('T')[0],
                  type: 'CRISIS', label: 'Fraude Détectée', deltaVE: 0, description: "Tentative de fichier corrompu repérée. Blâme."
              };
              batch.update(agencyRef, { eventLog: [...agency.eventLog, failEvent] });
              description = "Fraude détectée. L'administration est prévenue.";
          }
      }

      const newEvent: GameEvent = {
          id: `op-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: eventType,
          label: eventLabel,
          description: description,
          deltaBudgetReal: 0 // Usually paid by student wallet
      };

      batch.update(agencyRef, { 
          members: updatedMembers,
          eventLog: [...agency.eventLog, newEvent]
      });

      // Legacy Logic for Audit Hostile (unchanged)
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
      
      const newRequests = target.mergerRequests?.filter(r => r.id !== mergerId);
      
      if (!approved) {
          batch.update(doc(db, "agencies", target.id), { mergerRequests: newRequests });
          await batch.commit();
          toast('info', "Fusion refusée.");
          return;
      }

      const combinedMembers = [...source.members, ...target.members];
      const combinedBudget = source.budget_real + target.budget_real; 
      
      batch.update(doc(db, "agencies", source.id), {
          members: combinedMembers,
          budget_real: combinedBudget,
          eventLog: [...source.eventLog, {
              id: `merger-success-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
              label: 'Fusion Complétée', deltaVE: 0, description: `Absorption de ${target.name}.`
          }]
      });

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
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      const totalVoters = agency.members.length;
      
      const batch = writeBatch(db);
      
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

              batch.update(doc(db, "agencies", agency.id), {
                  challenges: agency.challenges?.filter(c => c.id !== challengeId), 
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
