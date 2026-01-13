
import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, writeBatch } from '../../services/firebase';
import { db } from '../../services/firebase';
import { Agency, WeekModule, WikiResource } from '../../types';
import { MOCK_AGENCIES, INITIAL_WEEKS } from '../../constants';

export const useGameSync = (toast: (type: string, msg: string) => void) => {
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);
  const [weeks, setWeeks] = useState<{ [key: string]: WeekModule }>(INITIAL_WEEKS);
  const [resources, setResources] = useState<WikiResource[]>([]);

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
        // Landing page handles offline/mock via agencies.length check, so no toast needed here to avoid spam
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. SYNC WEEKS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "weeks"), 
      (snapshot) => {
        const weeksData: { [key: string]: WeekModule } = {};
        snapshot.forEach((doc) => {
          weeksData[doc.id] = doc.data() as WeekModule;
        });
        if (Object.keys(weeksData).length > 0) setWeeks(weeksData);
      },
      (error) => {
         // Silent fail for unauth users (Landing Page doesn't need weeks)
         console.warn("Weeks sync skipped (Unauth)");
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
         // Silent fail for unauth users
         console.warn("Resources sync skipped (Unauth)");
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
    Object.values(INITIAL_WEEKS).forEach(week => {
      const ref = doc(db, "weeks", week.id);
      batch.set(ref, week);
    });
    await batch.commit();
  };

  return { agencies, weeks, resources, seedDatabase, setAgencies };
};