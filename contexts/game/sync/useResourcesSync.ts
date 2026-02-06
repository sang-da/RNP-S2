
import { useEffect, useState } from 'react';
import { collection, onSnapshot, db } from '../../../services/firebase';
import { WikiResource } from '../../../types';

export const useResourcesSync = () => {
  const [resources, setResources] = useState<WikiResource[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "resources"), 
      (snapshot) => {
        const resData: WikiResource[] = [];
        snapshot.forEach((doc) => {
          resData.push(doc.data() as WikiResource);
        });
        setResources(resData);
      },
      (error) => console.warn("[SYNC RESOURCES] Skipped/Error", error)
    );
    return () => unsubscribe();
  }, []);

  return { resources };
};
