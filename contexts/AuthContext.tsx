
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'student' | 'pending';
  agencyId?: string; // If student
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // HARDCODED ADMIN CHECK
        const isHardcodedAdmin = user.email === 'ahme.sang@gmail.com';
        
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        let finalRole: 'admin' | 'student' | 'pending' = 'pending';
        let agencyId: string | undefined = undefined;

        if (userSnap.exists()) {
          const data = userSnap.data();
          finalRole = data.role;
          agencyId = data.agencyId;
        }

        // FORCE OVERRIDE: Si c'est toi, tu es admin. Point final.
        if (isHardcodedAdmin) {
            finalRole = 'admin';
        }

        const newUserData: UserData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            role: finalRole,
            agencyId: agencyId
        };

        // 1. Mise à jour de l'état local (Immédiat pour l'UI)
        setUserData(newUserData);

        // 2. Mise à jour de la DB (Si nécessaire)
        if (isHardcodedAdmin && (!userSnap.exists() || userSnap.data()?.role !== 'admin')) {
             await setDoc(userRef, { ...newUserData, role: 'admin' }, { merge: true });
        } else if (!userSnap.exists()) {
             await setDoc(userRef, newUserData);
        }

      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
