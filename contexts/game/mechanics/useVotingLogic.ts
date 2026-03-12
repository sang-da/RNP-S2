import { runTransaction, doc, db } from '../../../services/firebase';
import { Agency, Student, GameEvent } from '../../../types';
import { GAME_RULES } from '../../../constants';

export const useVotingLogic = (agencies: Agency[], toast: (type: string, msg: string) => void) => {

  const submitMercatoVote = async (agencyId: string, requestId: string, voterId: string, vote: 'APPROVE' | 'REJECT') => {
      try {
          await runTransaction(db, async (transaction) => {
              const agencyRef = doc(db, "agencies", agencyId);
              const agencyDoc = await transaction.get(agencyRef);
              if (!agencyDoc.exists()) throw new Error("Agency not found");
              const agency = agencyDoc.data() as Agency;

              const request = agency.mercatoRequests?.find(r => r.id === requestId);
              if (!request) throw new Error("Request not found");

              const newVotes = { ...request.votes, [voterId]: vote };
              const approvals = Object.values(newVotes).filter(v => v === 'APPROVE').length;
              let totalVoters = agency.members.length;
              let threshold = GAME_RULES.VOTE_THRESHOLD_HIRE; 
              
              // Si c'est un renvoi (FIRE), la personne ciblée ne vote pas
              if (request.type === 'FIRE' && request.requesterId !== request.studentId) { 
                  totalVoters = Math.max(1, agency.members.length - 1); 
                  threshold = GAME_RULES.VOTE_THRESHOLD_FIRE;
              }

              const approvalRatio = totalVoters > 0 ? approvals / totalVoters : 0;

              if (approvalRatio > threshold) {
                  // --- VOTE VALIDÉ : EXÉCUTION DU MOUVEMENT ---
                  
                  // 1. Trouver l'étudiant et son agence actuelle (Vivier ou autre Studio)
                  let student: Student | null = null;
                  let sourceAgency: Agency | null = null;
                  let sourceAgencyRef = null;
                  
                  // Need to find the source agency in the transaction to be safe, but we can search the local state first to get the ID
                  let sourceAgencyId = null;
                  for (const a of agencies) {
                      const s = a.members.find(m => m.id === request.studentId);
                      if (s) {
                          sourceAgencyId = a.id;
                          break;
                      }
                  }

                  if (!sourceAgencyId) throw new Error("Source agency not found for student");

                  sourceAgencyRef = doc(db, "agencies", sourceAgencyId);
                  const sourceAgencyDoc = await transaction.get(sourceAgencyRef);
                  if (!sourceAgencyDoc.exists()) throw new Error("Source agency document not found");
                  sourceAgency = sourceAgencyDoc.data() as Agency;
                  student = sourceAgency.members.find(m => m.id === request.studentId) || null;

                  if (!student) {
                      throw new Error("Impossible de localiser l'étudiant dans l'agence source.");
                  }

                  const today = new Date().toISOString().split('T')[0];

                  if (request.type === 'FIRE') {
                      const unemployedAgencyRef = doc(db, "agencies", "unassigned");
                      const unemployedAgencyDoc = await transaction.get(unemployedAgencyRef);
                      if (!unemployedAgencyDoc.exists()) throw new Error("Unassigned agency not found");
                      const unemployedAgency = unemployedAgencyDoc.data() as Agency;

                      // Retrait de la source
                      const updatedSourceMembers = sourceAgency.members.filter(m => m.id !== request.studentId);
                      transaction.update(sourceAgencyRef, { 
                          members: updatedSourceMembers, 
                          mercatoRequests: (sourceAgency.mercatoRequests || []).filter(r => r.id !== requestId) 
                      });
                      // Ajout au chômage
                      transaction.update(unemployedAgencyRef, { 
                          members: [...unemployedAgency.members, { ...student, connectionStatus: 'offline' }] 
                      });
                  } 
                  else if (request.type === 'HIRE') {
                      // Retrait de la source (Pool ou ancienne agence)
                      const updatedSourceMembers = sourceAgency.members.filter(m => m.id !== request.studentId);
                      transaction.update(sourceAgencyRef, { 
                          members: updatedSourceMembers,
                          // Si l'étudiant postulait depuis son agence actuelle, on nettoie sa requête
                          mercatoRequests: (sourceAgency.mercatoRequests || []).filter(r => r.studentId !== request.studentId)
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

                      transaction.update(agencyRef, { 
                          members: [...agency.members, student],
                          ve_current: Math.min(100, agency.ve_current + bonusVE),
                          eventLog: [...agency.eventLog, newEvent],
                          mercatoRequests: (agency.mercatoRequests || []).filter(r => r.id !== requestId) 
                      });
                  }

              } else {
                  // VOTE EN COURS : On met juste à jour les voix
                  const updatedRequests = (agency.mercatoRequests || []).map(r => r.id === requestId ? { ...r, votes: newVotes } : r);
                  transaction.update(agencyRef, { mercatoRequests: updatedRequests });
              }
          });
          toast('success', "Opération de vote traitée avec succès");
      } catch (e: any) {
          console.error(e);
          toast('error', e.message || "Erreur lors de la mise à jour des votes.");
      }
  };

  return { submitMercatoVote };
};