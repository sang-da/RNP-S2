
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, User, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs } from '../services/firebase';

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
        let currentRole: 'admin' | 'student' | 'pending' | 'supervisor' = isRoot ? 'admin' : 'pending';
        let currentAgencyId: string | null = null;
        let exists = userSnap.exists();

        if (exists) {
            const data = userSnap.data();
            currentRole = isRoot ? 'admin' : data.role;
            currentAgencyId = data.agencyId || null;
        }

        // --- AUTO-HEALING / RÉPARATION AUTOMATIQUE ---
        // Si l'utilisateur est 'pending' (bloqué), on vérifie s'il est déjà dans une agence
        // Cela corrige le bug où les étudiants sont bloqués en salle d'attente alors qu'ils sont assignés.
        if (currentRole === 'pending') {
            try {
                // On scanne toutes les agences pour trouver l'ID de l'utilisateur
                const agenciesSnap = await getDocs(collection(db, 'agencies'));
                let foundAgencyId: string | null = null;
                let foundMemberName: string | null = null;

                agenciesSnap.forEach((doc) => {
                    const agencyData = doc.data();
                    const member = agencyData.members?.find((m: any) => m.id === user.uid);
                    if (member) {
                        foundAgencyId = agencyData.id;
                        foundMemberName = member.name;
                    }
                });

                if (foundAgencyId) {
                    console.log(`[AUTH FIX] Utilisateur ${user.uid} retrouvé dans l'agence ${foundAgencyId}. Réparation du profil...`);
                    currentRole = 'student';
                    currentAgencyId = foundAgencyId;
                    
                    // On force la mise à jour immédiate dans Firestore
                    await setDoc(userRef, {
                        role: 'student',
                        agencyId: foundAgencyId,
                        studentProfileName: foundMemberName,
                        lastLogin: serverTimestamp(),
                        fixedBySystem: true // Flag de debug
                    }, { merge: true });
                    exists = true; // On considère maintenant que le profil est valide
                }
            } catch (scanError) {
                console.error("[AUTH FIX ERROR] Impossible de scanner les agences:", scanError);
            }
        }

        if (exists) {
            // Mise à jour si c'est le root admin pour être sûr
            if (isRoot && currentRole !== 'admin') {
                await updateDoc(userRef, { role: 'admin' });
            }

            setUserData({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName, // On garde le nom Google actuel
                photoURL: user.photoURL,
                role: currentRole, 
                agencyId: currentAgencyId
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
        // Fallback en cas d'erreur critique pour ne pas crasher l'app
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
