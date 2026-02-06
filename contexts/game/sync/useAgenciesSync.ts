
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, writeBatch } from '../../../services/firebase';
import { db } from '../../../services/firebase';
import { Agency } from '../../../types';
import { MOCK_AGENCIES } from '../../../constants';

export const useAgenciesSync = (seedDatabase: () => Promise<void>) => {
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "agencies"), 
      (snapshot) => {
        const agenciesData: Agency[] = [];
        snapshot.forEach((doc) => {
          agenciesData.push(doc.data() as Agency);
        });

        // Si aucune agence n'existe, on lance le seed initial (via la fonction passée en prop ou interne)
        if (agenciesData.length === 0) {
          console.warn("[SYNC AGENCIES] Aucune agence trouvée. Seed nécessaire.");
          seedDatabase().catch(console.error);
        } else {
          setAgencies(agenciesData);
        }
        setLoading(false);
      },
      (error) => {
        console.error("[SYNC AGENCIES] Erreur :", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { agencies, setAgencies, loadingAgencies: loading };
};
