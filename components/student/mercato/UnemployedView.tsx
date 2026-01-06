
import React from 'react';
import { Agency, Student } from '../../../types';
import { Briefcase, FileText, Upload, UserPlus, Send } from 'lucide-react';

interface UnemployedViewProps {
    currentUser: Student | undefined;
    availableAgencies: Agency[];
    onOpenCVModal: () => void;
    onOpenApplyModal: (agencyId: string) => void;
}

export const UnemployedView: React.FC<UnemployedViewProps> = ({ currentUser, availableAgencies, onOpenCVModal, onOpenApplyModal }) => {
    
    return (
        <div className="animate-in fade-in space-y-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl">
                <h3 className="text-red-700 font-bold text-lg flex items-center gap-2">
                    <Briefcase size={24}/> Statut: Sans Emploi
                </h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${currentUser?.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                        CLASSE {currentUser?.classId}
                    </span>
                    <p className="text-red-600/80 text-sm">
                        Postulez uniquement dans les agences de votre classe.
                    </p>
                </div>
            </div>

            {/* MON CV */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-900">Mon Dossier Professionnel</h4>
                    {currentUser?.cvUrl && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">CV en ligne</span>}
                </div>
                
                {currentUser?.cvUrl ? (
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <FileText size={32} className="text-indigo-500"/>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-bold text-slate-900 truncate">CV_{currentUser.name.replace(' ', '_')}.pdf</p>
                                <a href={currentUser.cvUrl} target="_blank" className="text-xs text-indigo-600 hover:underline">Voir le document</a>
                            </div>
                            <button onClick={onOpenCVModal} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500">
                                <Upload size={18}/>
                            </button>
                    </div>
                ) : (
                    <button 
                        onClick={onOpenCVModal}
                        className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-500 transition-all flex flex-col items-center gap-2"
                    >
                        <Upload size={32}/>
                        <span className="font-bold text-sm">Déposer mon CV (PDF)</span>
                    </button>
                )}
            </div>

            {/* LISTE DES AGENCES */}
            <div>
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-emerald-500"/> Offres d'Emploi (Classe {currentUser?.classId})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableAgencies.map(targetAgency => {
                        const isPending = targetAgency.mercatoRequests.some(r => r.studentId === currentUser?.id && r.status === 'PENDING');
                        
                        return (
                            <div key={targetAgency.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-bold text-slate-900">{targetAgency.name}</h5>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${targetAgency.status === 'stable' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {targetAgency.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-4 line-clamp-2 italic">"{targetAgency.tagline}"</p>
                                
                                {isPending ? (
                                    <button disabled className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-lg text-xs cursor-not-allowed">
                                        Candidature envoyée
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => onOpenApplyModal(targetAgency.id)}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Send size={14}/> Postuler
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
