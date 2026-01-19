
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
    // SÉCURITÉ : On n'auto-répare que si l'utilisateur est STRICTEMENT en attente (pending)
    // et qu'il n'est pas déjà admin/superviseur
    if (currentData.role !== 'pending') return;

    console.log(`[AUTH FIX] Tentative de réparation sécurisée pour ${user.displayName}...`);
    
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

            const members = agencyData.members || [];
            
            // On ne cherche que des membres qui ont encore un ID temporaire (ex: s-...)
            const member = members.find((m: any) => {
                if (!m.id.startsWith('s-') && !m.id.startsWith('agency_')) return false;
                const memberNameNorm = normalizeName(m.name);
                return googleNameNorm === memberNameNorm; // Match exact uniquement pour l'auto-heal par sécurité
            });

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

            // On ne tente l'auto-heal que pour les non-admins
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
