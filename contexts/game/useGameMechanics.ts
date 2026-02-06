
import { doc, updateDoc, db } from '../../services/firebase';
import { Agency, PeerReview } from '../../types';
import { calculateVECap, CONSTRAINTS_POOL } from '../../constants';
import { usePerformanceLogic } from './mechanics/usePerformanceLogic';
import { useOperationsLogic } from './mechanics/useOperationsLogic';
import { useVotingLogic } from './mechanics/useVotingLogic';
import { sanitizeForFirestore } from '../../utils/firestore';

// On reçoit maintenant 'reviews' dans le hook
export const useGameMechanics = (agencies: Agency[], reviews: PeerReview[], toast: (type: string, msg: string) => void, getCurrentGameWeek: () => number) => {

  // On passe les reviews à la logique de performance
  const { processPerformance } = usePerformanceLogic(agencies, reviews, toast, getCurrentGameWeek);
  const operations = useOperationsLogic(agencies, toast, getCurrentGameWeek);
  const { submitMercatoVote } = useVotingLogic(agencies, toast);

  const updateAgency = async (updatedAgency: Agency) => {
    try {
        const veCap = calculateVECap(updatedAgency);
        const finalVE = Math.min(updatedAgency.ve_current, veCap);
        
        const agencyRef = doc(db, "agencies", updatedAgency.id);
        const cleanPayload = sanitizeForFirestore({ ...updatedAgency, ve_current: finalVE });
        
        await updateDoc(agencyRef, cleanPayload);
    } catch (e: any) {
        console.error("Update Agency Failed:", e);
        toast('error', `Erreur sauvegarde: ${e.message}`);
    }
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

  return { 
      updateAgency, 
      processPerformance, 
      shuffleConstraints, 
      submitMercatoVote,
      ...operations 
  };
};
