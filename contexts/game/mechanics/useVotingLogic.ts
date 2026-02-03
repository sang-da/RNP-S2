import { writeBatch, doc, db } from '../../../services/firebase';
import { Agency, Student, GameEvent } from '../../../types';
import { GAME_RULES } from '../../../constants';

export const useVotingLogic = (agencies: Agency[], toast: (type: string, msg: string) => void) => {

  const submitMercatoVote = async (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      const agency = agencies.find(a => a.id === agencyId);
      if(!agency) return;
      const request = agency.mercatoRequests.find(r => r.id === requestId);
      if(!request) return;

      const newVotes = { ...request.votes, [voterId]: vote };
      const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
      let totalVoters = agency.members.length;
      let threshold = GAME_RULES.VOTE_THRESHOLD_HIRE; 
      
      // Si c'est un renvoi (FIRE), la personne ciblée ne vote pas
      if (request.type === 'FIRE' && request.requesterId !== request.studentId) { 
          totalVoters = Math.max(1, agency.members.length - 1); 
          threshold = GAME_RULES.VOTE_THRESHOLD_FIRE;
      }

      const batch = writeBatch(db);
      const approvalRatio = totalVoters > 0 ? approvals / totalVoters : 0;

      if (approvalRatio > threshold) {
          // --- VOTE VALIDÉ : EXÉCUTION DU MOUVEMENT ---
          
          // 1. Trouver l'étudiant et son agence actuelle (Vivier ou autre Studio)
          let student: Student | null = null;
          let sourceAgency: Agency | null = null;
          
          for (const a of agencies) {
              const s = a.members.find(m => m.id === request.studentId);
              if (s) {
                  student = s;
                  sourceAgency = a;
                  break;
              }
          }

          if (!student || !sourceAgency) {
              toast('error', "Impossible de localiser l'étudiant.");
              return;
          }

          const today = new Date().toISOString().split('T')[0];

          if (request.type === 'FIRE') {
              const unemployedAgency = agencies.find(a => a.id === 'unassigned');
              if (unemployedAgency) {
                  // Retrait de la source
                  const updatedSourceMembers = sourceAgency.members.filter(m => m.id !== request.studentId);
                  batch.update(doc(db, "agencies", sourceAgency.id), { 
                      members: updatedSourceMembers, 
                      mercatoRequests: sourceAgency.mercatoRequests.filter(r => r.id !== requestId) 
                  });
                  // Ajout au chômage
                  batch.update(doc(db, "agencies", "unassigned"), { 
                      members: [...unemployedAgency.members, { ...student, connectionStatus: 'offline' }] 
                  });
                  toast('success', `Départ de ${student.name} acté.`);
              }
          } 
          else if (request.type === 'HIRE') {
              // Retrait de la source (Pool ou ancienne agence)
              const updatedSourceMembers = sourceAgency.members.filter(m => m.id !== request.studentId);
              batch.update(doc(db, "agencies", sourceAgency.id), { 
                  members: updatedSourceMembers,
                  // Si l'étudiant postulait depuis son agence actuelle, on nettoie sa requête
                  mercatoRequests: sourceAgency.mercatoRequests.filter(r => r.studentId !== request.studentId)
              });

              // Ajout à l'agence cible (Celle qui a voté)
              const bonusVE = 2; // Bonus attractivité
              const newEvent: GameEvent = {
                  id: `hire-${Date.now()}`,
                  date: today,
                  type: 'VE_DELTA',
                  label: 'Recrutement Validé',
                  deltaVE: bonusVE,
                  description: `${student.name} rejoint le studio par vote unanime. (+${bonusVE} VE)`
              };

              batch.update(doc(db, "agencies", agency.id), { 
                  members: [...agency.members, student],
                  ve_current: Math.min(100, agency.ve_current + bonusVE),
                  eventLog: [...agency.eventLog, newEvent],
                  mercatoRequests: agency.mercatoRequests.filter(r => r.id !== requestId) 
              });
              
              toast('success', `Bienvenue à ${student.name} !`);
          }

      } else {
          // VOTE EN COURS : On met juste à jour les voix
          const updatedRequests = agency.mercatoRequests.map(r => r.id === requestId ? { ...r, votes: newVotes } : r);
          batch.update(doc(db, "agencies", agency.id), { mercatoRequests: updatedRequests });
      }
      
      try {
          await batch.commit();
          if (approvalRatio <= threshold) toast('success', "Vote enregistré");
      } catch (e) {
          console.error(e);
          toast('error', "Erreur lors de la mise à jour des votes.");
      }
  };

  return { submitMercatoVote };
};