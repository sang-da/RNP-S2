
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
          // On vérifie l'email en dur pour garantir l'accès
          const isHardcodedAdmin = user.email === 'ahme.sang@gmail.com'; 

          const userRef = doc(db, 'users', user.uid);
          
          try {
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                // L'utilisateur existe déjà
                const data = userSnap.data();
                
                // --- AUTO-CORRECTION ---
                // Si c'est toi (l'email admin) mais que la base dit "pending" ou "student",
                // on force la mise à jour immédiate vers "admin".
                if (isHardcodedAdmin && data.role !== 'admin') {
                    console.log("👑 Admin reconnu mais mauvais rôle en DB. Correction forcée...");
                    await updateDoc(userRef, { role: 'admin' });
                    data.role = 'admin'; // On met à jour la variable locale pour l'affichage immédiat
                }

                setUserData({
                    uid: user.uid,
                    email: user.email,
                    displayName: data.displayName || user.displayName,
                    photoURL: data.photoURL || user.photoURL,
                    role: data.role,
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
                    // Si c'est ton email, on met direct Admin, sinon Pending
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
            console.error("Erreur lors de la récupération du profil:", err);
            // Fallback pour ne pas bloquer l'UI
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
