
import React from 'react';
import { Agency, Student } from '../../../types';
import { UserMinus, UserX, Clock } from 'lucide-react';
import { GAME_RULES } from '../../../constants';

interface TeamManagementProps {
    agency: Agency;
    currentUser: Student | undefined;
    onOpenResignModal: () => void;
    onOpenFireModal: (student: Student) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ agency, currentUser, onOpenResignModal, onOpenFireModal }) => {
    
    const hasPendingResignation = agency.mercatoRequests.find(r => r.studentId === currentUser?.id && r.requesterId === currentUser?.id && r.type === 'FIRE' && r.status === 'PENDING');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* LEFT: MY STATUS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserMinus size={20} className="text-slate-400"/> Mon Statut
                </h3>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-sm text-slate-500">Score Individuel</p>
                        <p className={`text-2xl font-bold ${currentUser && currentUser.individualScore < 50 ? 'text-red-500' : 'text-slate-900'}`}>
                            {currentUser?.individualScore}/100
                        </p>
                        {currentUser && (
                            <p className="text-xs text-red-500 font-bold mt-1">Coût: -{currentUser.individualScore * GAME_RULES.SALARY_MULTIPLIER} PiXi / sem</p>
                        )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                        CLASSE {agency.classId}
                    </span>
                </div>
                {hasPendingResignation ? (
                    <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-200 text-sm font-bold flex items-center gap-2">
                        <Clock size={16}/> Démission en cours
                    </div>
                ) : (
                    <button 
                        onClick={onOpenResignModal}
                        className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-sm transition-colors"
                    >
                        Demander ma démission
                    </button>
                )}
            </div>

            {/* RIGHT: TEAM MANAGEMENT (FIRE OTHERS) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserX size={20} className="text-slate-400"/> Gestion d'Effectif
                </h3>
                <div className="space-y-3">
                    {currentUser && agency.members.filter(m => m.id !== currentUser.id).map(colleague => {
                        const isPendingFire = agency.mercatoRequests.some(r => r.type === 'FIRE' && r.studentId === colleague.id && r.status === 'PENDING');
                        return (
                            <div key={colleague.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <img src={colleague.avatarUrl} className="w-8 h-8 rounded-full bg-slate-200" />
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{colleague.name}</p>
                                        <p className={`text-[10px] font-bold ${colleague.individualScore < 50 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            Score: {colleague.individualScore}
                                        </p>
                                    </div>
                                </div>
                                {isPendingFire ? (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">En cours</span>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={() => onOpenFireModal(colleague)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer z-10"
                                        title="Proposer le licenciement"
                                    >
                                        <UserX size={16}/>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
