
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, User, doc, onSnapshot } from '../services/firebase';
import { fetchOrCreateProfile, attemptAutoHeal, safeSnapshotExists, ROOT_ADMIN_EMAIL } from './auth/authLogic';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'student' | 'pending' | 'supervisor';
  agencyId?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
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
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
      setLoading(true);
      
      if (user) {
          setCurrentUser(user);
          
          unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
              if (safeSnapshotExists(docSnap)) {
                  const data = docSnap.data();
                  const isRoot = user.email?.toLowerCase() === ROOT_ADMIN_EMAIL;
                  
                  setUserData({
                      uid: user.uid,
                      email: user.email,
                      displayName: data.displayName || user.displayName,
                      photoURL: data.photoURL || user.photoURL,
                      role: isRoot ? 'admin' : data.role,
                      agencyId: data.agencyId
                  });
                  setLoading(false);
              } else {
                  await fetchOrCreateProfile(user);
              }
          }, (error) => {
              console.error("Profile Snapshot Error:", error);
              setLoading(false);
          });

      } else {
        setCurrentUser(null);
        setUserData(null);
        if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
        currentUser, 
        userData, 
        loading,
        refreshProfile: async () => {
            if(currentUser && userData) await attemptAutoHeal(currentUser, userData);
        }
    }}>
      {children}
    </AuthContext.Provider>
  );
};
