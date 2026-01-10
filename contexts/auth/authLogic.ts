
import { User, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, writeBatch, db } from '../../services/firebase';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'student' | 'pending' | 'supervisor';
  agencyId?: string | null;
}

export const ROOT_ADMIN_EMAIL = 'ahme.sang@gmail.com';

// --- HELPER CRITIQUE : SAFE EXISTS CHECK ---
export const safeSnapshotExists = (snap: any): boolean => {
    if (!snap) return false;
    if (typeof snap.exists === 'function') {
        return snap.exists();
    }
    return !!snap.exists;
};

// Helper pour normaliser les noms
const normalizeName = (name: string) => {
    return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// --- FONCTION DE RÉPARATION AUTOMATIQUE ---
export const attemptAutoHeal = async (user: User, currentData: UserData): Promise<void> => {
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

            // Safety check for members array
            const members = agencyData.members || [];

            let member = members.find((m: any) => m.id === user.uid);
            
            if (!member) {
                member = members.find((m: any) => {
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
                const updatedMembers = (agencyDataToUpdate.members || []).map((m: any) => {
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

export const fetchOrCreateProfile = async (user: User) => {
    const email = user.email?.toLowerCase().trim() || '';
    const isRoot = email === ROOT_ADMIN_EMAIL;
    const userRef = doc(db, 'users', user.uid);

    try {
        const userSnap = await getDoc(userRef);
        
        if (!safeSnapshotExists(userSnap)) {
            console.log("Nouvel utilisateur détecté. Création profil initial...");
            
            const newUserData: UserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Étudiant',
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                role: isRoot ? 'admin' : 'pending',
                agencyId: null 
            };

            await setDoc(userRef, {
                ...newUserData,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            if (!isRoot) {
                await attemptAutoHeal(user, newUserData);
            }
        } else {
            await updateDoc(userRef, { lastLogin: serverTimestamp() });
        }
    } catch (err) {
        console.error("ERREUR AUTH LOGIC:", err);
    }
};
