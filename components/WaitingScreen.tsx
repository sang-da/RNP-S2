
import React, { useEffect } from 'react';
import { Loader2, ShieldCheck, LogOut, HelpCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { signOut, auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const WaitingScreen: React.FC = () => {
    const { userData } = useAuth();

    // LISTEN TO ROLE CHANGE IN REAL-TIME
    useEffect(() => {
        if (!userData?.uid) return;
        
        // On écoute les changements, mais on gère les erreurs de permission silencieusement
        // car AuthContext gère déjà le fallback admin
        try {
            const unsub = onSnapshot(doc(db, "users", userData.uid), (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    if (data.role !== 'pending' && data.role !== userData.role) {
                        window.location.reload(); 
                    }
                }
            }, (error) => {
                console.log("WaitingScreen: Impossible d'écouter le profil (Permissions?)", error);
            });
            return () => unsub();
        } catch (e) {
            console.error(e);
        }
    }, [userData]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 relative">
                 <Loader2 size={40} className="text-indigo-600 animate-spin" />
                 <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-2 rounded-xl">
                    <ShieldCheck size={20} />
                 </div>
            </div>
            
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
                Bonjour, {userData?.displayName}
            </h1>
            <p className="text-lg text-slate-500 max-w-md mb-8">
                Votre compte est créé et actif. Vous êtes actuellement en <strong className="text-slate-900">Salle d'Attente</strong>.
            </p>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-left mb-8">
                <h3 className="font-bold text-slate-900 mb-2">Que se passe-t-il ?</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                        L'administrateur a été notifié de votre arrivée.
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                        Il va vous assigner à votre Agence et transformer votre profil "invité" en profil étudiant officiel.
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                        Cette page s'actualisera automatiquement dès que votre rôle sera validé.
                    </li>
                </ul>
                
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-2">
                        <HelpCircle size={14} />
                        <span>Compte : <strong className="text-slate-600">{userData?.email}</strong></span>
                    </div>
                    <div className="pl-6 font-mono text-[10px] opacity-50">UID: {userData?.uid}</div>
                </div>
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={() => window.location.reload()}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-indigo-50"
                >
                    <RefreshCw size={18} /> Actualiser
                </button>
                <button 
                    onClick={() => signOut(auth)}
                    className="text-slate-400 hover:text-red-500 font-bold flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-red-50"
                >
                    <LogOut size={18} /> Se déconnecter
                </button>
            </div>
        </div>
    );
};
