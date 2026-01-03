
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
      setLoading(true);
      if (user) {
          setCurrentUser(user);
          
          // HARDCODED ADMIN CHECK (Remplacez par votre email réel si nécessaire pour forcer l'admin au début)
          // Vous pouvez aussi changer le rôle manuellement dans Firestore Console.
          const isHardcodedAdmin = user.email === 'ahme.sang@gmail.com'; 

          const userRef = doc(db, 'users', user.uid);
          
          try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                // User exists in DB, load data
                const data = userSnap.data();
                setUserData({
                    uid: user.uid,
                    email: user.email,
                    displayName: data.displayName || user.displayName,
                    photoURL: data.photoURL || user.photoURL,
                    role: data.role,
                    agencyId: data.agencyId
                });
            } else {
                // NEW USER: Create Document immediately
                console.log("New User detected, creating profile in Firestore...");
                
                const newUserData: UserData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email?.split('@')[0] || 'Étudiant',
                    photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                    role: isHardcodedAdmin ? 'admin' : 'pending',
                    agencyId: undefined
                };

                await setDoc(userRef, {
                    ...newUserData,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });

                setUserData(newUserData);
            }
          } catch (err) {
            console.error("Error fetching/creating user profile:", err);
            // Fallback to allow UI to render even if DB fails
            setUserData({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'pending' 
            });
          }
      } else {
        setCurrentUser(null);
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
