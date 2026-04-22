import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useUI } from '../../../contexts/UIContext';
import { Gavel } from 'lucide-react';

export const JuryFundsConfig: React.FC = () => {
    const { toast } = useUI();
    const [juryUsers, setJuryUsers] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "jury"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users: any[] = [];
            snapshot.forEach((doc) => {
                users.push({ uid: doc.id, ...doc.data() });
            });
            setJuryUsers(users);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateJuryWallet = async (uid: string, newAmount: number) => {
        try {
            await updateDoc(doc(db, "users", uid), { juryWallet: newAmount });
            toast('success', "Portefeuille d'investissement mis à jour.");
        } catch(e) {
            toast('error', "Échec de la mise à jour.");
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                        <Gavel size={20}/> Investisseurs & Fonds Jury
                    </h3>
                    <p className="text-sm text-emerald-600/80 mt-1">Gérez le portefeuille d'investissement de chaque membre du jury.</p>
                </div>
                <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm font-bold">
                    {juryUsers.length} Membres du Jury
                </div>
            </div>
            {juryUsers.length === 0 ? (
                <div className="text-center py-16 text-slate-400 italic">
                    <Gavel size={48} className="mx-auto mb-4 text-emerald-200"/>
                    Aucun membre du jury configuré dans les Accès.
                </div>
            ) : (
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {juryUsers.map(user => (
                            <div key={user.uid} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full shadow-sm border-2 border-white" />
                                    <div>
                                        <h4 className="font-bold text-slate-900">{user.displayName}</h4>
                                        <p className="text-[10px] uppercase text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded inline-block mt-1">Investisseur / Jury</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Capacité d'investissement (PiXi)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono text-sm bg-white"
                                            defaultValue={user.juryWallet || 0}
                                            onBlur={(e) => handleUpdateJuryWallet(user.uid, Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 mt-2">
                                        <button onClick={() => {
                                            const el = document.getElementById(`wallet-${user.uid}`) as HTMLInputElement;
                                            if(el) el.value = "50000";
                                            handleUpdateJuryWallet(user.uid, 50000);
                                        }} className="py-1 bg-slate-200 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 transition-colors text-[10px] font-bold rounded">50k</button>
                                        <button onClick={() => {
                                            const el = document.getElementById(`wallet-${user.uid}`) as HTMLInputElement;
                                            if(el) el.value = "100000";
                                            handleUpdateJuryWallet(user.uid, 100000);
                                        }} className="py-1 bg-slate-200 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 transition-colors text-[10px] font-bold rounded">100k</button>
                                        <button onClick={() => {
                                            const el = document.getElementById(`wallet-${user.uid}`) as HTMLInputElement;
                                            if(el) el.value = "250000";
                                            handleUpdateJuryWallet(user.uid, 250000);
                                        }} className="py-1 bg-slate-200 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 transition-colors text-[10px] font-bold rounded">250k</button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">Sauvegarde automatique en quittant le champ.</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};