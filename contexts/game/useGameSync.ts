
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, writeBatch, query, where, db } from '../../services/firebase';
import { Agency, WeekModule, WikiResource, PeerReview } from '../../types';
import { MOCK_AGENCIES, INITIAL_WEEKS } from '../../constants';

export const useGameSync = (toast: (type: string, msg: string) => void) => {
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [weeks, setWeeks] = useState<{ [key: string]: WeekModule }>(INITIAL_WEEKS);
  const [resources, setResources] = useState<WikiResource[]>([]);
  const [reviews, setReviews] = useState<PeerReview[]>([]);

  // 1. SYNC AGENCIES
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "agencies"), 
      (snapshot) => {
        const agenciesData: Agency[] = [];
        snapshot.forEach((doc) => {
          // On nettoie les anciennes propriétés 'peerReviews' si elles existent encore dans le doc
          const data = doc.data() as Agency;
          // @ts-ignore
          delete data.peerReviews; 
          agenciesData.push(data);
        });
        if (agenciesData.length === 0) {
          seedDatabase().catch(console.error);
        } else {
          setAgencies(agenciesData);
        }
      },
      (error) => console.error("Firestore Read Error (Agencies):", error)
    );
    return () => unsubscribe();
  }, []);

  // 2. SYNC WEEKS (Avec suppression de 'locked')
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "weeks"), 
      (snapshot) => {
        const weeksData: { [key: string]: WeekModule } = {};
        snapshot.forEach((doc) => {
          const w = doc.data() as WeekModule;
          // @ts-ignore
          if (w.locked !== undefined) delete w.locked; // Cleanup à la volée
          weeksData[doc.id] = w;
        });
        
        if (Object.keys(weeksData).length === 0) {
             console.log("Collection 'weeks' vide. Seed...");
             const batch = writeBatch(db);
             Object.values(INITIAL_WEEKS).forEach(week => {
                const { ...cleanWeek } = week;
                // @ts-ignore
                delete cleanWeek.locked;
                const ref = doc(db, "weeks", week.id);
                batch.set(ref, cleanWeek);
             });
             batch.commit();
             setWeeks(INITIAL_WEEKS);
        } else {
            setWeeks(weeksData);
        }
      },
      (error) => console.warn("Weeks sync skipped:", error)
    );
    return () => unsubscribe();
  }, []);

  // 3. SYNC RESOURCES
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "resources"), 
      (snapshot) => {
        const resData: WikiResource[] = [];
        snapshot.forEach((doc) => resData.push(doc.data() as WikiResource));
        setResources(resData);
      },
      (error) => console.warn("Resources sync skipped")
    );
    return () => unsubscribe();
  }, []);

  // 4. SYNC REVIEWS (NOUVEAU)
  useEffect(() => {
    // On écoute toute la collection car l'admin en a besoin.
    // Optimisation possible : ne charger que les X dernières semaines.
    const q = query(collection(db, "reviews"));
    const unsubscribe = onSnapshot(q,
        (snapshot) => {
            const revData: PeerReview[] = [];
            snapshot.forEach(doc => revData.push(doc.data() as PeerReview));
            setReviews(revData);
        },
        (error) => console.warn("Reviews sync error:", error)
    );
    return () => unsubscribe();
  }, []);

  const seedDatabase = async () => {
    const batch = writeBatch(db);
    MOCK_AGENCIES.forEach(agency => {
      // @ts-ignore
      const { peerReviews, ...cleanAgency } = agency; // On retire les reviews du seed Agence
      const ref = doc(db, "agencies", agency.id);
      batch.set(ref, cleanAgency);
    });
    
    Object.values(INITIAL_WEEKS).forEach(week => {
      const { ...cleanWeek } = week;
      // @ts-ignore
      delete cleanWeek.locked;
      const ref = doc(db, "weeks", week.id);
      batch.set(ref, cleanWeek);
    });
    await batch.commit();
  };

  return { agencies, weeks, resources, reviews, seedDatabase, setAgencies };
};
