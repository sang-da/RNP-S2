
import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, LogOut, RefreshCw, AlertTriangle, Database, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signOut, auth, db } from '../services/firebase';
import { doc, onSnapshot, writeBatch, serverTimestamp } from 'firebase/firestore';
import { MOCK_AGENCIES, INITIAL_WEEKS } from '../constants';

export const WaitingScreen: React.FC = () => {
    const { userData, refreshProfile } = useAuth();
    const [isWorking, setIsWorking] = useState(false);

    // Écoute temps réel passive
    useEffect(() => {
        if (!userData?.uid) return;
        try {
            const unsub = onSnapshot(doc(db, "users", userData.uid), (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    if (data.role !== 'pending') {
                        window.location.reload(); 
                    }
                }
            });
            return () => unsub();
        } catch (e) { console.error(e); }
    }, [userData]);

    // Fonction manuelle pour les étudiants bloqués
    const handleForceProfileCreation = async () => {
        setIsWorking(true);
        try {
            await refreshProfile();
            // Petit hack pour recharger la page proprement après
            setTimeout(() => window.location.reload(), 1000);
        } catch (e) {
            console.error(e);
            alert("Erreur de connexion à la base de données.");
        } finally {
            setIsWorking(false);
        }
    };

    // Fonction spéciale ADMIN pour tout débloquer
    const handleAdminForceInit = async () => {
        if (!userData) return;
        if (userData.email !== 'ahme.sang@gmail.com') return;

        setIsWorking(true);
        try {
            const batch = writeBatch(db);

            // 1. Force Admin Profile
            const userRef = doc(db, "users", userData.uid);
            batch.set(userRef, {
                uid: userData.uid,
                email: userData.email,
                displayName: userData.displayName || 'Super Admin',
                photoURL: userData.photoURL,
                role: 'admin',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });

            // 2. Seed Agencies (Si DB vide)
            MOCK_AGENCIES.forEach(agency => {
                const ref = doc(db, "agencies", agency.id);
                batch.set(ref, agency);
            });

            // 3. Seed Weeks
            Object.values(INITIAL_WEEKS).forEach(week => {
                const ref = doc(db, "weeks", week.id);
                batch.set(ref, week);
            });

            await batch.commit();
            alert("Succès ! Base de données initialisée et Compte Admin restauré.");
            window.location.reload();

        } catch (e: any) {
            console.error(e);
            alert(`Erreur critique : ${e.message}`);
        } finally {
            setIsWorking(false);
        }
    };

    const isSuperAdminEmail = userData?.email === 'ahme.sang@gmail.com';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 relative animate-pulse">
                 <Loader2 size={40} className="text-indigo-600 animate-spin" />
            </div>
            
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
                Bonjour, {userData?.displayName}
            </h1>
            <p className="text-lg text-slate-500 max-w-md mb-8">
                Vous êtes en <strong className="text-slate-900">Salle d'Attente</strong>.
                <br/><span className="text-sm">Votre compte doit être validé par un enseignant.</span>
            </p>

            {/* ERROR HANDLING SECTION */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-left mb-8">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500"/>
                    Ça prend trop de temps ?
                </h3>
                
                <div className="space-y-3">
                    <button 
                        onClick={handleForceProfileCreation}
                        disabled={isWorking}
                        className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 transition-colors flex items-center justify-center gap-2"
                    >
                        {isWorking ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>}
                        Forcer la création de mon profil
                    </button>

                    {isSuperAdminEmail && (
                        <div className="pt-4 mt-4 border-t border-slate-100">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-2">Zone Super Admin</p>
                             <button 
                                onClick={handleAdminForceInit}
                                disabled={isWorking}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-2"
                            >
                                {isWorking ? <Loader2 className="animate-spin" size={18}/> : <Database size={18}/>}
                                INITIALISER DATABASE & ADMIN
                            </button>
                            <p className="text-[10px] text-slate-400 mt-2 text-center">
                                À utiliser uniquement si la base de données est vide au premier lancement.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={() => window.location.reload()}
                    className="text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-2 transition-colors px-4 py-2"
                >
                    <RefreshCw size={16} /> Actualiser
                </button>
                <button 
                    onClick={() => signOut(auth)}
                    className="text-slate-400 hover:text-red-500 font-bold flex items-center gap-2 transition-colors px-4 py-2"
                >
                    <LogOut size={16} /> Déconnexion
                </button>
            </div>
        </div>
    );
};
