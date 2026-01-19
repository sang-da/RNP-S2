
import React from 'react';
import { AlertTriangle, UserX, Trash2, RefreshCw } from 'lucide-react';
import { UserProfile } from '../AdminAccess';

interface DuplicateAlertsProps {
    duplicates: { studentName: string, accounts: UserProfile[] }[];
    onReset: (uid: string, name: string) => void;
}

export const DuplicateAlerts: React.FC<DuplicateAlertsProps> = ({ duplicates, onReset }) => {
    if (duplicates.length === 0) return null;

    return (
        <div className="mb-8 space-y-4">
            <h3 className="text-red-600 font-bold flex items-center gap-2 px-1">
                <AlertTriangle size={20} className="animate-bounce" /> 
                CONFLITS D'IDENTITÉ DÉTECTÉS ({duplicates.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {duplicates.map((dup, i) => (
                    <div key={i} className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 shadow-sm">
                        <p className="font-bold text-red-800 text-lg mb-4">
                            Le profil <span className="underline">"{dup.studentName}"</span> est revendiqué par :
                        </p>
                        <div className="space-y-3">
                            {dup.accounts.map(acc => (
                                <div key={acc.uid} className="bg-white/80 p-3 rounded-xl border border-red-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={acc.photoURL} className="w-8 h-8 rounded-full bg-slate-200" />
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-sm text-slate-900 truncate">{acc.displayName}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{acc.email}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onReset(acc.uid, acc.displayName)}
                                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                                        title="Délier ce compte"
                                    >
                                        <RefreshCw size={16}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-start gap-2 bg-red-100/50 p-3 rounded-lg text-[11px] text-red-700 italic">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>Action requise : Réinitialisez le compte erroné. S'il s'agit d'un professeur, promuvez-le "Superviseur" après le reset.</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
