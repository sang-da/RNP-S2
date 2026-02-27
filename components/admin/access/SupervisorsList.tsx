
import React from 'react';
import { ShieldCheck, UserCog, MoreVertical, Star, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../../AdminAccess';

interface SupervisorsListProps {
    users: UserProfile[];
}

export const SupervisorsList: React.FC<SupervisorsListProps> = ({ users }) => {
    const admins = users.filter(u => u.role === 'admin');
    const supervisors = users.filter(u => u.role === 'supervisor');

    if (admins.length + supervisors.length === 0) return null;

    return (
        <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600"/> Équipe Pédagogique ({admins.length + supervisors.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...admins, ...supervisors].map(user => (
                    <div key={user.uid} className={`bg-white p-4 rounded-2xl border-2 shadow-sm flex items-center justify-between ${user.role === 'admin' ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <img src={user.photoURL} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white shadow-sm ${user.role === 'admin' ? 'bg-indigo-600' : 'bg-purple-500'}`}>
                                    {user.role === 'admin' ? <Star size={10}/> : <ShieldCheck size={10}/>}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 leading-none">{user.displayName}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">{user.email}</p>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-2 inline-block ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {user.role === 'admin' ? 'Admin Principal' : 'Superviseur'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
