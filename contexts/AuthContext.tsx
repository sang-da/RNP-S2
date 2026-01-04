
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

  // SEUL AHME EST ROOT PAR DÉFAUT
  const ROOT_ADMIN_EMAIL = 'ahme.sang@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
          setCurrentUser(user);
          
          const email = user.email?.toLowerCase().trim() || '';
          const isRoot = email === ROOT_ADMIN_EMAIL;
          const userRef = doc(db, 'users', user.uid);
          
          try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                // --- UTILISATEUR EXISTANT ---
                const data = userSnap.data();
                
                // Sécurité : Si c'est Ahme et qu'il n'est pas noté admin dans la DB, on force la mise à jour
                if (isRoot && data.role !== 'admin') {
                    updateDoc(userRef, { role: 'admin' }).catch(console.error);
                }

                setUserData({
                    uid: user.uid,
                    email: user.email,
                    displayName: data.displayName || user.displayName,
                    photoURL: data.photoURL || user.photoURL,
                    role: isRoot ? 'admin' : data.role, 
                    agencyId: data.agencyId
                });
            } else {
                // --- NOUVEL UTILISATEUR (INSCRIPTION) ---
                console.log("Création du profil utilisateur...");
                
                const newUserData: UserData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email?.split('@')[0] || 'Étudiant',
                    photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                    role: isRoot ? 'admin' : 'pending', // Tout le monde est 'pending' sauf Ahme
                    agencyId: undefined
                };

                // On écrit dans la DB. Grâce aux nouvelles règles, l'utilisateur a le droit d'écrire SA PROPRE fiche.
                await setDoc(userRef, {
                    ...newUserData,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });

                setUserData(newUserData);
            }
          } catch (err) {
            console.error("Erreur AuthContext:", err);
            // Fallback UI si la DB plante, mais on garde le role par défaut
            setUserData({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: isRoot ? 'admin' : 'pending' 
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
