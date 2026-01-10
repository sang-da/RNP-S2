
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
        // 1. TENTATIVE DE LECTURE SIMPLE
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            // --- CAS 1 : NOUVEL UTILISATEUR (LAMBDA) ---
            // On crée le profil IMMÉDIATEMENT pour qu'il apparaisse chez l'admin.
            // On ne fait AUCUNE autre vérification avant ça.
            console.log("Nouvel utilisateur détecté. Création profil immédiate...");
            
            const newUserData: UserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Étudiant',
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                role: isRoot ? 'admin' : 'pending',
                agencyId: null 
            };

            // Écriture DB Prioritaire
            await setDoc(userRef, {
                ...newUserData,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            setUserData(newUserData);
            return; // Fin du traitement pour le nouveau, on attendra que l'admin le valide ou le refresh.
        }

        // --- CAS 2 : UTILISATEUR EXISTANT ---
        const data = userSnap.data();
        let currentRole = isRoot ? 'admin' : data.role;
        let currentAgencyId = data.agencyId || null;

        // --- AUTO-HEALING (Uniquement si le profil existe déjà mais est bloqué 'pending') ---
        if (currentRole === 'pending' && !isRoot) {
            try {
                console.log("Utilisateur existant en attente. Tentative auto-guérison...");
                // On scanne toutes les agences pour trouver l'ID de l'utilisateur
                const agenciesSnap = await getDocs(collection(db, 'agencies'));
                let foundAgencyId: string | null = null;
                let foundMemberName: string | null = null;

                agenciesSnap.forEach((doc: any) => {
                    const agencyData = doc.data();
                    const member = agencyData.members?.find((m: any) => m.id === user.uid);
                    if (member) {
                        foundAgencyId = agencyData.id;
                        foundMemberName = member.name;
                    }
                });

                if (foundAgencyId) {
                    console.log(`[AUTH FIX] Utilisateur ${user.uid} retrouvé dans l'agence ${foundAgencyId}. Réparation...`);
                    currentRole = 'student';
                    currentAgencyId = foundAgencyId;
                    
                    // Mise à jour DB
                    await updateDoc(userRef, {
                        role: 'student',
                        agencyId: foundAgencyId,
                        studentProfileName: foundMemberName,
                        lastLogin: serverTimestamp(),
                        fixedBySystem: true
                    });
                }
            } catch (scanError) {
                console.warn("[AUTH FIX WARNING] L'auto-guérison a échoué, mais l'utilisateur reste connecté.", scanError);
                // On ne bloque pas l'app, on continue avec le rôle 'pending' actuel
            }
        }

        // Mise à jour finale du state local
        setUserData({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: currentRole, 
            agencyId: currentAgencyId
        });

    } catch (err) {
        console.error("ERREUR CRITIQUE AUTHCONTEXT:", err);
        // Fallback local pour ne pas crasher l'UI, mais c'est le signe que la DB est inaccessible
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
