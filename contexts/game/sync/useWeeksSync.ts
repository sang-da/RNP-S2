
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, writeBatch } from '../../../services/firebase';
import { db } from '../../../services/firebase';
import { WeekModule } from '../../../types';
import { INITIAL_WEEKS } from '../../../constants';

export const useWeeksSync = () => {
  const [weeks, setWeeks] = useState<{ [key: string]: WeekModule }>(INITIAL_WEEKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "weeks"), 
      (snapshot) => {
        const weeksData: { [key: string]: WeekModule } = {};
        
        snapshot.forEach((doc) => {
          weeksData[doc.id] = doc.data() as WeekModule;
        });
        
        // AUTO-REPAIR : Si la collection est vide ou incomplète, on réinjecte les données par défaut
        if (Object.keys(weeksData).length === 0) {
             console.warn("[SYNC WEEKS] Collection vide. Tentative de réparation (Auto-Seed)...");
             const batch = writeBatch(db);
             Object.values(INITIAL_WEEKS).forEach(week => {
                const ref = doc(db, "weeks", week.id);
                // On force isVisible à false par sécurité lors d'un seed, sauf la semaine 1
                const safeWeek = { ...week, isVisible: week.id === '1' };
                batch.set(ref, safeWeek);
             });
             batch.commit()
                .then(() => console.log("[SYNC WEEKS] Réparation terminée."))
                .catch(e => console.error("[SYNC WEEKS] Échec réparation (Droits insuffisants ?)", e));
             
             setWeeks(INITIAL_WEEKS);
        } else {
            setWeeks(weeksData);
        }
        setLoading(false);
      },
      (error) => {
         console.error("[SYNC WEEKS] Erreur de lecture :", error);
         // Fallback sur les données locales en cas d'erreur réseau/droits
         setWeeks(INITIAL_WEEKS);
         setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { weeks, loadingWeeks: loading };
};
