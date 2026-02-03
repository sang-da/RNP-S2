import { writeBatch, doc, db } from '../../../services/firebase';
import { Agency, GameEvent } from '../../../types';
import { calculateVECap, GAME_RULES } from '../../../constants';

export const usePerformanceLogic = (agencies: Agency[], toast: (type: string, msg: string) => void) => {

  const processPerformance = async (targetClass: 'A' | 'B' | 'ALL') => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const batch = writeBatch(db);
        let processedCount = 0;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            if (targetClass !== 'ALL' && agency.classId !== targetClass) return;
            
            processedCount++;
            
            let logEvents: GameEvent[] = [];
            const isSoloMode = agency.members.length === 1;

            const updatedMembers = (agency.members || []).map(member => {
                let scoreDelta = 0;
                let newStreak = member.streak || 0;

                if (isSoloMode) {
                    if (agency.ve_current >= 60) {
                        scoreDelta += 2; newStreak++;
                    } else if (agency.ve_current >= 40) {
                        scoreDelta += 1; newStreak = 0;
                    } else if (agency.ve_current < 20) {
                        scoreDelta -= 2; newStreak = 0;
                    }

                    if (agency.budget_real >= 1500 && (member.wallet || 0) >= 500) {
                        scoreDelta += 2; 
                    }
                } 
                else {
                    const reviews = agency.peerReviews.filter(r => r.targetId === member.id);
                    if (reviews.length > 0) {
                        const avg = reviews.reduce((sum, r) => sum + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / reviews.length;
                        if (avg > 4.5) { scoreDelta += 2; newStreak++; } 
                        else if (avg >= 4.0) { scoreDelta += 1; newStreak = 0; } 
                        else if (avg < 2.0) { scoreDelta -= 5; newStreak = 0; } 
                        else { newStreak = 0; }
                    }
                }

                if (newStreak >= 3) { 
                    scoreDelta += 10; 
                    newStreak = 0; 
                }

                return { ...member, individualScore: Math.max(0, Math.min(100, member.individualScore + scoreDelta)), streak: newStreak };
            });

            let veAdjustment = 0;
            const budget = agency.budget_real;
            if (budget >= 2000) veAdjustment += Math.floor(budget / 2000);
            else if (budget < 0) veAdjustment -= Math.ceil(Math.abs(budget) / 1000) * 2;

            if (veAdjustment !== 0) {
                logEvents.push({ id: `perf-ve-${Date.now()}-${agency.id}`, date: today, type: veAdjustment > 0 ? 'VE_DELTA' : 'CRISIS', label: 'Ajustement VE (Bilan)', deltaVE: veAdjustment, description: veAdjustment > 0 ? 'Trésorerie saine.' : 'Dette.' });
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
            toast('success', `Bilan ${targetClass}: ${processedCount} agences mises à jour.`);
        }
      } catch(e) { console.error(e); toast('error', "Erreur Performance"); }
  };

  return { processPerformance };
};