
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
          setCurrentUser(user);
          
          // --- SÉCURITÉ ADMIN ---
          // Normalisation de l'email pour éviter les soucis de casse ou d'espaces
          const email = user.email?.toLowerCase().trim() || '';
          const isHardcodedAdmin = email === 'ahme.sang@gmail.com'; 

          const userRef = doc(db, 'users', user.uid);
          
          try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                // L'utilisateur existe déjà
                const data = userSnap.data();
                let finalRole = data.role;

                // --- AUTO-CORRECTION ROBUSTE ---
                // On force le rôle localement d'abord pour ne pas bloquer l'UI
                if (isHardcodedAdmin) {
                    finalRole = 'admin';
                    
                    // On tente la mise à jour DB en arrière-plan sans attendre (fire & forget)
                    if (data.role !== 'admin') {
                        updateDoc(userRef, { role: 'admin' }).catch(err => 
                            console.warn("La mise à jour Admin en DB a échoué (sans gravité pour l'accès local):", err)
                        );
                    }
                }

                setUserData({
                    uid: user.uid,
                    email: user.email,
                    displayName: data.displayName || user.displayName,
                    photoURL: data.photoURL || user.photoURL,
                    role: finalRole, // Utilise la valeur forcée
                    agencyId: data.agencyId
                });
            } else {
                // NOUVEL UTILISATEUR
                console.log("Nouvel utilisateur détecté, création du profil...");
                
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
            console.error("Erreur critique AuthContext:", err);
            
            // --- FALLBACK DE SECURITÉ ---
            // Même si Firestore plante complètement, si c'est toi, tu passes.
            setUserData({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: isHardcodedAdmin ? 'admin' : 'pending' // <--- LE FIX EST ICI
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
