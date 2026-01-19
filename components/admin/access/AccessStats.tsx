
import React from 'react';
import { Users, ShieldCheck, UserX, AlertCircle, Zap } from 'lucide-react';

interface AccessStatsProps {
    total: number;
    supervisors: number;
    linked: number;
    pending: number;
    duplicates: number;
    online: number;
}

export const AccessStats: React.FC<AccessStatsProps> = ({ total, supervisors, linked, pending, duplicates, online }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Total Authentifiés" value={total} icon={<Users size={20}/>} color="bg-slate-100 text-slate-600" />
            
            <StatCard 
                label="Actifs Maintenant" 
                value={online} 
                icon={<Zap size={20}/>} 
                color={online > 0 ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-50" : "bg-slate-50 text-slate-300"} 
                isHighlighted={online > 0}
            />

            <StatCard label="Staff / Superviseurs" value={supervisors} icon={<ShieldCheck size={20}/>} color="bg-indigo-100 text-indigo-600" />
            <StatCard label="Étudiants Liés" value={linked} icon={<Users size={20}/>} color="bg-blue-100 text-blue-600" />
            <StatCard label="En Attente" value={pending} icon={<UserX size={20}/>} color="bg-amber-100 text-amber-600" />
            
            <StatCard 
                label="Doublons" 
                value={duplicates} 
                icon={<AlertCircle size={20}/>} 
                color={duplicates > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-400"} 
            />
        </div>
    );
};

const StatCard = ({ label, value, icon, color, isHighlighted }: any) => (
    <div className={`bg-white p-4 rounded-2xl border shadow-sm transition-all ${isHighlighted ? 'border-emerald-200 shadow-emerald-100' : 'border-slate-200'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
            {icon}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
);
