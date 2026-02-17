
import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { ADMIN_MENU_STRUCTURE } from '../../../config/adminMenu';
import { Eye, EyeOff, PenTool, Lock, Save, Loader2, ShieldCheck } from 'lucide-react';
import { SupervisorPermissions as IPermissions } from '../../../types';
import { useUI } from '../../../contexts/UIContext';

export const SupervisorPermissions: React.FC = () => {
    const { gameConfig, updateGameConfig } = useGame();
    const { toast } = useUI();
    const [localPerms, setLocalPerms] = useState<IPermissions>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (gameConfig.supervisorPermissions) {
            setLocalPerms(gameConfig.supervisorPermissions);
        } else {
            // Init default
            const defaults: IPermissions = {};
            ADMIN_MENU_STRUCTURE.forEach(group => {
                group.items.forEach(item => {
                    // Par défaut tout visible mais readonly, sauf les trucs critiques
                    const isSensitive = ['SETTINGS', 'ACCESS', 'BLACK_MARKET'].includes(item.id);
                    defaults[item.id] = {
                        visible: !isSensitive,
                        canWrite: false
                    };
                });
            });
            setLocalPerms(defaults);
        }
    }, [gameConfig]);

    const togglePerm = (viewId: string, type: 'visible' | 'canWrite') => {
        setLocalPerms(prev => {
            const current = prev[viewId] || { visible: false, canWrite: false };
            const updated = { ...current, [type]: !current[type] };
            
            // Logique de cohérence : Si on donne Write access, on force Visible
            if (type === 'canWrite' && updated.canWrite) updated.visible = true;
            // Si on cache, on enlève Write access
            if (type === 'visible' && !updated.visible) updated.canWrite = false;

            return { ...prev, [viewId]: updated };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateGameConfig({ supervisorPermissions: localPerms });
            toast('success', "Permissions superviseurs mises à jour.");
        } catch (e) {
            toast('error', "Erreur sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-purple-600"/> Droits & Accès Superviseurs
            </h3>
            <p className="text-sm text-slate-500 mb-6">
                Définissez quelles zones sont accessibles aux comptes "Superviseur". 
                <br/><strong>Note :</strong> L'accès "Écriture" permet de modifier les données (noter, valider, virer). Soyez prudent.
            </p>

            <div className="space-y-6">
                {ADMIN_MENU_STRUCTURE.map((group, idx) => (
                    <div key={idx} className="border rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-500 uppercase tracking-widest">
                            {group.title}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {group.items.map(item => {
                                const perm = localPerms[item.id] || { visible: false, canWrite: false };
                                return (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${perm.visible ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <item.icon size={18}/>
                                            </div>
                                            <span className={`text-sm font-bold ${perm.visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{item.label}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {/* VISIBILITY TOGGLE */}
                                            <button 
                                                onClick={() => togglePerm(item.id, 'visible')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border ${
                                                    perm.visible 
                                                    ? 'bg-white border-slate-300 text-slate-700 hover:border-slate-400' 
                                                    : 'bg-slate-100 border-slate-200 text-slate-400'
                                                }`}
                                            >
                                                {perm.visible ? <Eye size={14}/> : <EyeOff size={14}/>}
                                                {perm.visible ? 'Visible' : 'Caché'}
                                            </button>

                                            {/* WRITE TOGGLE */}
                                            <button 
                                                onClick={() => togglePerm(item.id, 'canWrite')}
                                                disabled={!perm.visible}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all border ${
                                                    !perm.visible ? 'opacity-30 cursor-not-allowed bg-slate-100' :
                                                    perm.canWrite 
                                                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                                                    : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'
                                                }`}
                                            >
                                                {perm.canWrite ? <PenTool size={14}/> : <Lock size={14}/>}
                                                {perm.canWrite ? 'Écriture' : 'Lecture Seule'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                    Enregistrer la configuration
                </button>
            </div>
        </div>
    );
};
