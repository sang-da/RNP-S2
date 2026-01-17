
import { writeBatch, doc, db } from '../../../services/firebase';
import { Agency } from '../../../types';
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
      
      // Si c'est un renvoi (FIRE), la personne ciblée ne vote pas, donc on réduit le total de votants
      if (request.type === 'FIRE' && request.requesterId !== request.studentId) { 
          totalVoters = Math.max(1, agency.members.length - 1); 
          threshold = GAME_RULES.VOTE_THRESHOLD_FIRE;
      }

      const batch = writeBatch(db);
      
      // Calcul du ratio d'approbation
      const approvalRatio = approvals / totalVoters;

      if (approvalRatio > threshold) {
          // VOTE VALIDÉ : EXÉCUTION DU MOUVEMENT
          const targetAgency = agencies.find(a => a.id === 'unassigned'); // Par défaut on renvoie au chômage si c'est un FIRE
          
          if (request.type === 'FIRE' && targetAgency) {
               const student = agency.members.find(m => m.id === request.studentId);
               if(student) {
                   const updatedSource = agency.members.filter(m => m.id !== request.studentId);
                   const updatedTarget = [...targetAgency.members, { ...student, history: [] }]; // Reset history on move
                   
                   // Update Source Agency (Remove member + Remove Request)
                   batch.update(doc(db, "agencies", agency.id), { 
                       members: updatedSource, 
                       mercatoRequests: agency.mercatoRequests.filter(r => r.id !== requestId) 
                   });
                   
                   // Update Target (Unassigned)
                   batch.update(doc(db, "agencies", targetAgency.id), { 
                       members: updatedTarget 
                   });
                   
                   toast('success', "Vote validé : Départ acté.");
               }
          } else if (request.type === 'HIRE') {
              // Note: La logique HIRE complète implique souvent un transfert d'une agence source ou du vivier.
              // Ici on valide juste le vote. L'exécution finale du recrutement se fait souvent via l'admin 
              // ou via une logique automatique si le candidat est au chômage.
              // Pour simplifier ici, on marque juste la demande comme 'ACCEPTED' pour traitement admin ou auto.
              // (Dans une V2, on automatiserait le transfert ici comme pour le FIRE).
              
              // Pour l'instant, on met à jour les votes et on notifie.
              const updatedRequests = agency.mercatoRequests.map(r => r.id === requestId ? { ...r, votes: newVotes, status: 'ACCEPTED' as const } : r);
              batch.update(doc(db, "agencies", agency.id), { mercatoRequests: updatedRequests });
              toast('success', "Vote validé ! Recrutement approuvé (En attente finalisation Admin).");
          }

      } else {
          // VOTE EN COURS
          const updatedRequests = agency.mercatoRequests.map(r => r.id === requestId ? { ...r, votes: newVotes } : r);
          batch.update(doc(db, "agencies", agency.id), { mercatoRequests: updatedRequests });
          toast('success', "Vote enregistré");
      }
      
      await batch.commit();
  };

  return { submitMercatoVote };
};
