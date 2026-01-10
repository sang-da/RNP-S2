
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, User, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, writeBatch, onSnapshot } from '../services/firebase';

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

  // Helper pour normaliser les noms pour la comparaison
  const normalizeName = (name: string) => {
      return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const fetchOrCreateProfile = async (user: User) => {
    const email = user.email?.toLowerCase().trim() || '';
    const isRoot = email === ROOT_ADMIN_EMAIL;
    const userRef = doc(db, 'users', user.uid);

    try {
        const userSnap = await getDoc(userRef);
        
        // --- CRÉATION PROFIL SI INEXISTANT ---
        // FIX: userSnap.exists est une propriété en SDK Compat, pas une fonction
        if (!userSnap.exists) {
            console.log("Nouvel utilisateur détecté. Création profil initial...");
            
            const newUserData: UserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Étudiant',
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                role: isRoot ? 'admin' : 'pending',
                agencyId: null 
            };

            // Création du doc. Cela déclenchera le snapshot listener automatiquement.
            await setDoc(userRef, {
                ...newUserData,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            // Tentative d'auto-heal immédiate pour les non-admins
            if (!isRoot) {
                await attemptAutoHeal(user, newUserData);
            }
        } else {
            // Mise à jour lastLogin si existe déjà
            await updateDoc(userRef, { lastLogin: serverTimestamp() });
        }
    } catch (err) {
        console.error("ERREUR AUTHCONTEXT:", err);
    }
  };

  // --- FONCTION DE RÉPARATION AUTOMATIQUE ---
  const attemptAutoHeal = async (user: User, currentData: UserData): Promise<void> => {
      console.log(`[AUTH FIX] Tentative de réparation pour ${user.displayName}...`);
      
      try {
          const agenciesSnap = await getDocs(collection(db, 'agencies'));
          let foundAgencyId: string | null = null;
          let foundMemberName: string | null = null;
          let foundMemberId: string | null = null;
          let agencyDataToUpdate: any = null;

          const googleNameNorm = normalizeName(user.displayName || "");

          for (const doc of agenciesSnap.docs) {
              const agencyData = doc.data();
              if (agencyData.id === 'unassigned') continue; 

              let member = agencyData.members?.find((m: any) => m.id === user.uid);
              
              if (!member) {
                  member = agencyData.members?.find((m: any) => {
                      const memberNameNorm = normalizeName(m.name);
                      return googleNameNorm.includes(memberNameNorm) || memberNameNorm.includes(googleNameNorm);
                  });
              }

              if (member) {
                  foundAgencyId = agencyData.id;
                  foundMemberName = member.name;
                  foundMemberId = member.id;
                  agencyDataToUpdate = agencyData;
                  break; 
              }
          }

          if (foundAgencyId && agencyDataToUpdate && foundMemberId) {
              const batch = writeBatch(db);

              // 1. Mettre à jour le document USER
              const userRef = doc(db, "users", user.uid);
              batch.update(userRef, {
                  role: 'student',
                  agencyId: foundAgencyId,
                  studentProfileName: foundMemberName,
                  linkedStudentId: foundMemberId,
                  lastLogin: serverTimestamp(),
                  fixedBySystem: true,
                  fixedAt: serverTimestamp()
              });

              // 2. Mettre à jour le document AGENCE (SWAP ID)
              if (foundMemberId !== user.uid) {
                  const agencyRef = doc(db, "agencies", foundAgencyId);
                  const updatedMembers = agencyDataToUpdate.members.map((m: any) => {
                      if (m.id === foundMemberId) {
                          return { 
                              ...m, 
                              id: user.uid,
                              avatarUrl: user.photoURL || m.avatarUrl,
                              connectionStatus: 'online'
                          };
                      }
                      return m;
                  });
                  batch.update(agencyRef, { members: updatedMembers });
              }

              await batch.commit();
              console.log("[AUTH FIX] Réparation DB effectuée.");
          } 
      } catch (scanError) {
          console.warn("[AUTH FIX ERROR]", scanError);
      }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
      setLoading(true);
      
      if (user) {
          setCurrentUser(user);
          
          // CRITIQUE : Écoute temps réel du profil pour réaction immédiate aux changements de rôle (Admin/Pending -> Student)
          unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
              // FIX: docSnap.exists est une propriété en SDK Compat
              if (docSnap.exists) {
                  const data = docSnap.data();
                  const isRoot = user.email?.toLowerCase() === ROOT_ADMIN_EMAIL;
                  
                  // Mise à jour de l'état local avec les données fraîches de la DB
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
                  // Le doc n'existe pas encore, on le crée (cela déclenchera un nouveau snapshot)
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
            // Optionnel : Force une tentative de réparation si besoin
            if(currentUser && userData) await attemptAutoHeal(currentUser, userData);
        }
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
