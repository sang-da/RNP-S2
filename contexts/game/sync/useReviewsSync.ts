
import { useEffect, useState } from 'react';
import { collection, onSnapshot, db } from '../../../services/firebase';
import { PeerReview } from '../../../types';

export const useReviewsSync = () => {
  const [reviews, setReviews] = useState<PeerReview[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reviews"), 
      (snapshot) => {
        const reviewsData: PeerReview[] = [];
        snapshot.forEach((doc) => {
          reviewsData.push(doc.data() as PeerReview);
        });
        setReviews(reviewsData);
      },
      (error) => console.warn("[SYNC REVIEWS] Skipped/Error", error)
    );
    return () => unsubscribe();
  }, []);

  return { reviews };
};
