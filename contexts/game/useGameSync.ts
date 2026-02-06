
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, writeBatch } from '../../services/firebase';
import { db } from '../../services/firebase';
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
          agenciesData.push(doc.data() as Agency);
        });
        if (agenciesData.length === 0) {
          seedDatabase().catch(console.error);
        } else {
          setAgencies(agenciesData);
        }
      },
      (error) => {
        console.error("Firestore Read Error (Agencies):", error);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. SYNC WEEKS (Avec Auto-Repair)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "weeks"), 
      (snapshot) => {
        const weeksData: { [key: string]: WeekModule } = {};
        snapshot.forEach((doc) => {
          weeksData[doc.id] = doc.data() as WeekModule;
        });
        
        // SÉCURITÉ : Si la collection est vide, on la remplit avec les données par défaut
        if (Object.keys(weeksData).length === 0) {
             console.log("Collection 'weeks' vide ou inaccessible. Tentative de réparation...");
             const batch = writeBatch(db);
             Object.values(INITIAL_WEEKS).forEach(week => {
                const ref = doc(db, "weeks", week.id);
                batch.set(ref, week);
             });
             batch.commit().then(() => console.log("Weeks auto-seeded.")).catch(e => console.warn("Seed failed (rights?)", e));
             // On garde les données locales en attendant
             setWeeks(INITIAL_WEEKS);
        } else {
            setWeeks(weeksData);
        }
      },
      (error) => {
         console.warn("Weeks sync skipped (Unauth or Error)", error);
         // En cas d'erreur, on garde les semaines par défaut pour ne pas casser l'UI
         setWeeks(INITIAL_WEEKS);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. SYNC RESOURCES
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "resources"), 
      (snapshot) => {
        const resData: WikiResource[] = [];
        snapshot.forEach((doc) => {
          resData.push(doc.data() as WikiResource);
        });
        setResources(resData);
      },
      (error) => {
         console.warn("Resources sync skipped (Unauth)");
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. SYNC REVIEWS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reviews"), 
      (snapshot) => {
        const reviewsData: PeerReview[] = [];
        snapshot.forEach((doc) => {
          reviewsData.push(doc.data() as PeerReview);
        });
        setReviews(reviewsData);
      },
      (error) => {
         console.warn("Reviews sync skipped (Unauth)");
      }
    );
    return () => unsubscribe();
  }, []);

  const seedDatabase = async () => {
    const batch = writeBatch(db);
    MOCK_AGENCIES.forEach(agency => {
      const ref = doc(db, "agencies", agency.id);
      batch.set(ref, agency);
    });
    // On force aussi l'écriture des semaines lors du seed initial
    Object.values(INITIAL_WEEKS).forEach(week => {
      const ref = doc(db, "weeks", week.id);
      batch.set(ref, week);
    });
    await batch.commit();
  };

  return { agencies, weeks, resources, reviews, seedDatabase, setAgencies };
};
