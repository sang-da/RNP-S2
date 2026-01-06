
import React from 'react';
import { Agency, Student } from '../../../types';
import { UserPlus, Briefcase, Coins, FileSearch, Loader2 } from 'lucide-react';
import { MASCOTS, GAME_RULES } from '../../../constants';

interface RecruitmentPoolProps {
    agency: Agency;
    unemployedStudents: Student[];
    onOpenHireModal: (student: Student) => void;
}

export const RecruitmentPool: React.FC<RecruitmentPoolProps> = ({ agency, unemployedStudents, onOpenHireModal }) => {
    
    // Filter unemployed students by the agency's class
    const myClassUnemployed = unemployedStudents.filter(s => s.classId === agency.classId);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus size={20} className="text-emerald-500"/> Vivier de Talents
                </h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded text-white md:mr-24 ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                    CLASSE {agency.classId} UNIQUEMENT
                </span>
            </div>
            
            {myClassUnemployed.length === 0 ? (
                <div className="relative text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 overflow-hidden">
                    <img src={MASCOTS.MERCATO_SEARCH} className="w-24 absolute right-4 bottom-0 opacity-40 grayscale" />
                    <Briefcase size={32} className="mx-auto mb-2 opacity-50"/>
                    <p className="font-bold text-sm">Aucun candidat disponible.</p>
                    <p className="text-xs">Le marché de la Classe {agency.classId} est vide.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <img src={MASCOTS.MERCATO_SEARCH} className="w-24 absolute -right-6 -top-16 opacity-100 z-10 drop-shadow-lg hidden md:block" />

                    {myClassUnemployed.map(student => {
                        // Check globally if this student has a pending HIRE request from THIS agency
                        const isPending = agency.mercatoRequests.some(r => r.type === 'HIRE' && r.studentId === student.id && r.status === 'PENDING');
                        const salaryCost = student.individualScore * GAME_RULES.SALARY_MULTIPLIER;

                        return (
                            <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <img src={student.avatarUrl} className="w-10 h-10 rounded-full bg-slate-100 grayscale" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-slate-900">{student.name}</p>
                                            <span className={`text-[10px] font-bold ${student.individualScore < 50 ? 'text-red-500' : 'text-emerald-500'}`}>Sc. {student.individualScore}</span>
                                        </div>
                                        <p className="text-xs text-slate-400">{student.role}</p>
                                        <div className="mt-1 flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-lg w-fit">
                                            <Coins size={12}/> {salaryCost} PiXi / sem
                                        </div>
                                    </div>
                                    <div className="ml-2">
                                        {student.cvUrl ? (
                                            <a href={student.cvUrl} target="_blank" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg block hover:bg-indigo-100" title="Voir CV">
                                                <FileSearch size={18}/>
                                            </a>
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">Pas de CV</span>
                                        )}
                                    </div>
                                </div>
                                
                                {isPending ? (
                                    <button disabled className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-lg text-xs cursor-not-allowed">
                                        Vote en cours...
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => onOpenHireModal(student)}
                                        className="w-full py-2 bg-slate-900 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors"
                                    >
                                        Proposer une embauche
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
