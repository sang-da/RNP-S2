
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, User, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, writeBatch } from '../services/firebase';

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

  // Helper pour normaliser les noms pour la comparaison (ex: "  Maëlys " -> "maelys")
  const normalizeName = (name: string) => {
      return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const fetchOrCreateProfile = async (user: User) => {
    const email = user.email?.toLowerCase().trim() || '';
    const isRoot = email === ROOT_ADMIN_EMAIL;
    const userRef = doc(db, 'users', user.uid);

    try {
        // 1. TENTATIVE DE LECTURE SIMPLE DU PROFIL UTILISATEUR
        const userSnap = await getDoc(userRef);
        
        // --- CAS 1 : UTILISATEUR TOTALEMENT INCONNU (Premier Login) ---
        if (!userSnap.exists()) {
            console.log("Nouvel utilisateur détecté. Création profil initial...");
            
            const newUserData: UserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Étudiant',
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                role: isRoot ? 'admin' : 'pending',
                agencyId: null 
            };

            // On crée le doc, mais on lance tout de suite la recherche de matching
            await setDoc(userRef, {
                ...newUserData,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            // Si ce n'est pas l'admin, on tente immédiatement de trouver son agence
            if (!isRoot) {
                await attemptAutoHeal(user, newUserData);
            } else {
                setUserData(newUserData);
            }
            return;
        }

        // --- CAS 2 : UTILISATEUR EXISTANT ---
        const data = userSnap.data();
        let currentRole = isRoot ? 'admin' : data.role;
        let currentAgencyId = data.agencyId || null;

        // Mise à jour du lastLogin pour montrer qu'il est vivant
        await updateDoc(userRef, { lastLogin: serverTimestamp() });

        // --- AUTO-HEALING FORCE ---
        // Si l'utilisateur est coincé en 'pending' OU s'il est 'student' mais sans agencyId valide
        if (!isRoot && (currentRole === 'pending' || (currentRole === 'student' && !currentAgencyId))) {
            const healedData = await attemptAutoHeal(user, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: currentRole,
                agencyId: currentAgencyId
            });
            
            if (healedData) {
                setUserData(healedData);
                return;
            }
        }

        // Mise à jour du state local
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
        // Fallback local pour ne pas crasher l'UI
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

  // --- FONCTION DE RÉPARATION AUTOMATIQUE ---
  const attemptAutoHeal = async (user: User, currentData: UserData): Promise<UserData | null> => {
      console.log(`[AUTH FIX] Tentative de réparation pour ${user.displayName}...`);
      
      try {
          const agenciesSnap = await getDocs(collection(db, 'agencies'));
          let foundAgencyId: string | null = null;
          let foundMemberName: string | null = null;
          let foundMemberId: string | null = null;
          let agencyDataToUpdate: any = null;

          // 1. SCAN : On cherche le membre
          // Priorité 1 : Match par ID Exact (Déjà lié)
          // Priorité 2 : Match par NOM (Google Name contient Agency Member Name)
          const googleNameNorm = normalizeName(user.displayName || "");

          for (const doc of agenciesSnap.docs) {
              const agencyData = doc.data();
              if (agencyData.id === 'unassigned') continue; // On ne cherche pas dans le chômage pour le fix

              // A. Check ID exact
              let member = agencyData.members?.find((m: any) => m.id === user.uid);
              
              // B. Check Nom (Fuzzy) si pas trouvé par ID
              if (!member) {
                  member = agencyData.members?.find((m: any) => {
                      const memberNameNorm = normalizeName(m.name);
                      // Check si le nom Google contient le nom de la liste (ex: "Marie-Trinité Lastname" contient "Marie-Trinité")
                      // Ou l'inverse pour être sûr
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
              console.log(`[AUTH FIX] Trouvé ! Agence: ${foundAgencyId}, Membre: ${foundMemberName} (Ancien ID: ${foundMemberId})`);
              
              const batch = writeBatch(db);

              // 1. Mettre à jour le document USER
              const userRef = doc(db, "users", user.uid);
              batch.update(userRef, {
                  role: 'student',
                  agencyId: foundAgencyId,
                  studentProfileName: foundMemberName,
                  linkedStudentId: foundMemberId, // On garde une trace de l'ancien ID
                  lastLogin: serverTimestamp(),
                  fixedBySystem: true,
                  fixedAt: serverTimestamp()
              });

              // 2. Mettre à jour le document AGENCE (Remplacement de l'ID Mock par le vrai ID Auth)
              // C'est CRUCIAL pour que les prochaines connexions marchent par ID direct
              if (foundMemberId !== user.uid) {
                  const agencyRef = doc(db, "agencies", foundAgencyId);
                  const updatedMembers = agencyDataToUpdate.members.map((m: any) => {
                      if (m.id === foundMemberId) {
                          return { 
                              ...m, 
                              id: user.uid, // SWAP ID
                              avatarUrl: user.photoURL || m.avatarUrl,
                              connectionStatus: 'online'
                          };
                      }
                      return m;
                  });
                  batch.update(agencyRef, { members: updatedMembers });
              }

              await batch.commit();
              console.log("[AUTH FIX] Réparation DB effectuée avec succès.");

              // Retourne la donnée mise à jour pour l'état local immédiat
              return {
                  ...currentData,
                  role: 'student',
                  agencyId: foundAgencyId
              };
          } else {
              console.log("[AUTH FIX] Aucun profil orphelin correspondant trouvé.");
          }

      } catch (scanError) {
          console.warn("[AUTH FIX ERROR]", scanError);
      }
      
      return null;
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
