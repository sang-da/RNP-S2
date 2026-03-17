
import { useEffect, useState } from 'react';
import { collection, onSnapshot, db } from '../../../services/firebase';
import { WikiResource } from '../../../types';
import { useAuth } from '../../AuthContext';

export const useResourcesSync = () => {
  const [resources, setResources] = useState<WikiResource[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setResources([]);
      return;
    }

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
  }, [currentUser]);

  return { resources };
};
