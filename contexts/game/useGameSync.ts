
import { doc, writeBatch, db } from '../../services/firebase';
import { MOCK_AGENCIES, INITIAL_WEEKS } from '../../constants';

// Import des sous-modules de synchronisation
import { useAgenciesSync } from './sync/useAgenciesSync';
import { useWeeksSync } from './sync/useWeeksSync';
import { useResourcesSync } from './sync/useResourcesSync';
import { useReviewsSync } from './sync/useReviewsSync';

export const useGameSync = (toast: (type: string, msg: string) => void) => {
  
  // Fonction de seed centralisée (utilisée si la DB est vide)
  const seedDatabase = async () => {
    console.log("[GAME SYNC] Seeding Database...");
    const batch = writeBatch(db);
    
    // Seed Agencies
    MOCK_AGENCIES.forEach(agency => {
      const ref = doc(db, "agencies", agency.id);
      batch.set(ref, agency);
    });
    
    // Seed Weeks
    Object.values(INITIAL_WEEKS).forEach(week => {
      const ref = doc(db, "weeks", week.id);
      batch.set(ref, week);
    });

    await batch.commit();
    console.log("[GAME SYNC] Database Seeded.");
  };

  // Appel des hooks individuels
  const { agencies, setAgencies, loadingAgencies } = useAgenciesSync(seedDatabase);
  const { weeks, loadingWeeks } = useWeeksSync();
  const { resources } = useResourcesSync();
  const { reviews } = useReviewsSync();

  return { 
      agencies, 
      weeks, 
      resources, 
      reviews, 
      seedDatabase, 
      setAgencies,
      isLoading: loadingAgencies || loadingWeeks
  };
};
