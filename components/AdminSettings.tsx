
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useUI } from '../contexts/UIContext';
import { updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Settings, Save, Database, AlertTriangle, LogOut, User, Loader2 } from 'lucide-react';

interface AdminSettingsProps {
    readOnly?: boolean;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ readOnly }) => {
    const { userData, currentUser } = useAuth();
    const { resetGame } = useGame();
    const { confirm, toast } = useUI();
    
    const [displayName, setDisplayName] = useState(userData?.displayName || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleUpdateProfile = async () => {
        if(readOnly) return;
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await updateProfile(currentUser, { displayName });
            toast('success', "Profil mis à jour (nécessite rechargement pour voir l'effet partout)");
        } catch (error) {
            toast('error', "Erreur lors de la mise à jour");
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetDB = async () => {
        if(readOnly) return;
        const confirmed = await confirm({
            title: "Zone de Danger : Réinitialisation",
            message: "Êtes-vous ABSOLUMENT sûr de vouloir réinitialiser toute la base de données ?\n\nToutes les agences, notes, et budgets seront écrasés par les valeurs par défaut.",
            confirmText: "OUI, TOUT EFFACER",
            cancelText: "Annuler",
            isDangerous: true
        });

        if (confirmed) {
            setIsResetting(true);
            try {
                await resetGame();
            } finally {
                setIsResetting(false);
            }
        }
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-200 rounded-xl text-slate-700"><Settings size={32}/></div>
                    Paramètres
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gérez votre profil enseignant et les configurations système.</p>
            </div>

            <div className="space-y-8 max-w-3xl">
                
                {/* PROFILE CARD */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <User size={20} className="text-indigo-500"/> Mon Profil Enseignant
                    </h3>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                         <div className="shrink-0">
                            <img src={userData?.photoURL || ''} className="w-24 h-24 rounded-full border-4 border-slate-50 bg-slate-100" />
                         </div>
                         <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Non modifiable)</label>
                                <input disabled value={userData?.email || ''} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono text-sm cursor-not-allowed"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom d'affichage</label>
                                <input 
                                    value={displayName} 
                                    onChange={e => setDisplayName(e.target.value)}
                                    disabled={readOnly}
                                    className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            {!readOnly && (
                            <button 
                                onClick={handleUpdateProfile}
                                disabled={isSaving}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                Enregistrer
                            </button>
                            )}
                         </div>
                    </div>
                </div>

                {/* DANGER ZONE */}
                {!readOnly && (
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={20}/> Zone Super Admin
                    </h3>
                    <p className="text-sm text-red-600/80 mb-6 max-w-xl">
                        Ces actions sont irréversibles. Ne les utilisez qu'en cas de problème majeur (base de données corrompue ou démarrage d'un nouveau semestre).
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            onClick={handleResetDB}
                            disabled={isResetting}
                            className="px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                        >
                            {isResetting ? <Loader2 className="animate-spin" size={18}/> : <Database size={18}/>}
                            Réinitialiser la Base de Données
                        </button>
                    </div>
                </div>
                )}

                {/* LOGOUT */}
                <div className="pt-8 border-t border-slate-200">
                     <button 
                        onClick={() => auth.signOut()}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold transition-colors"
                     >
                        <LogOut size={18}/> Se déconnecter
                     </button>
                </div>
            </div>
        </div>
    );
};
