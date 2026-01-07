
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, User, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '../services/firebase';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'student' | 'pending' | 'supervisor';
  agencyId?: string | null; // Allow null for Firestore
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

  const ROOT_ADMIN_EMAIL = 'ahme.sang@gmail.com';

  const fetchOrCreateProfile = async (user: User) => {
    const email = user.email?.toLowerCase().trim() || '';
    const isRoot = email === ROOT_ADMIN_EMAIL;
    const userRef = doc(db, 'users', user.uid);

    try {
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            if (isRoot && data.role !== 'admin') {
                await updateDoc(userRef, { role: 'admin' });
            }

            setUserData({
                uid: user.uid,
                email: user.email,
                displayName: data.displayName || user.displayName,
                photoURL: data.photoURL || user.photoURL,
                role: isRoot ? 'admin' : data.role, 
                agencyId: data.agencyId || null
            });
        } else {
            console.log("Création de profil Firestore...");
            
            const newUserData: UserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Étudiant',
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                role: isRoot ? 'admin' : 'pending',
                agencyId: null 
            };

            setUserData(newUserData);

            await setDoc(userRef, {
                ...newUserData,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
        }
    } catch (err) {
        console.error("Erreur AuthContext:", err);
        setUserData({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: isRoot ? 'admin' : 'pending',
            agencyId: null
        });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setLoading(true);
      if (user) {
          setCurrentUser(user);
          await fetchOrCreateProfile(user);
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ 
        currentUser, 
        userData, 
        loading,
        refreshProfile: async () => {
            if(currentUser) await fetchOrCreateProfile(currentUser);
        }
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
