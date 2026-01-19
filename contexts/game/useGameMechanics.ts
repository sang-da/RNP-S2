
import { doc, updateDoc, db } from '../../services/firebase';
import { Agency } from '../../types';
import { calculateVECap, CONSTRAINTS_POOL } from '../../constants';
import { usePerformanceLogic } from './mechanics/usePerformanceLogic';
import { useOperationsLogic } from './mechanics/useOperationsLogic';
import { useVotingLogic } from './mechanics/useVotingLogic';
import { sanitizeForFirestore } from '../../utils/firestore';

export const useGameMechanics = (agencies: Agency[], toast: (type: string, msg: string) => void, getCurrentGameWeek: () => number) => {

  // --- SUB-HOOKS ---
  const { processPerformance } = usePerformanceLogic(agencies, toast);
  const operations = useOperationsLogic(agencies, toast, getCurrentGameWeek);
  const { submitMercatoVote } = useVotingLogic(agencies, toast);

  // --- CORE UTILS (CRUD) ---
  const updateAgency = async (updatedAgency: Agency) => {
    try {
        const veCap = calculateVECap(updatedAgency);
        const finalVE = Math.min(updatedAgency.ve_current, veCap);
        
        // --- NETTOYAGE CRITIQUE ---
        // On s'assure que l'objet est une "plain JS Object" et qu'il n'a pas de undefined
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
