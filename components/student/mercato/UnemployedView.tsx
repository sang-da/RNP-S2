
import React from 'react';
import { Agency, Student } from '../../../types';
import { Briefcase, FileText, Upload, UserPlus, Send, Building2, Coins, TrendingUp, Plus } from 'lucide-react';
import { GAME_RULES } from '../../../constants';

interface UnemployedViewProps {
    currentUser: Student | undefined;
    availableAgencies: Agency[];
    onOpenCVModal: () => void;
    onOpenApplyModal: (agencyId: string) => void;
}

export const UnemployedView: React.FC<UnemployedViewProps> = ({ currentUser, availableAgencies, onOpenCVModal, onOpenApplyModal }) => {
    
    // Check if there's already a pending FOUND_AGENCY request
    // This requires checking the unassigned agency requests (passed in context usually, but for UI we assume one request at a time)
    
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

            {/* FONDER UN STUDIO */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Building2 size={120} />
                </div>
                <h4 className="font-bold text-xl mb-2 flex items-center gap-2">
                    <Building2 size={24} className="text-indigo-400"/> Fonder mon propre Studio
                </h4>
                <p className="text-sm text-indigo-100 mb-6 max-w-md">
                    Vous avez l'âme d'un leader ? Lancez votre agence en solo ou recrutez ensuite d'autres talents du vivier.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                        <span className="text-[10px] font-bold uppercase text-indigo-300 block mb-1">Coût Fondation</span>
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <Coins size={16} className="text-yellow-400"/> {GAME_RULES.CREATION_COST_PIXI} PiXi
                        </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                        <span className="text-[10px] font-bold uppercase text-indigo-300 block mb-1">Investissement Perso</span>
                        <div className="flex items-center gap-2 font-bold text-lg text-red-400">
                            <TrendingUp size={16}/> -{GAME_RULES.CREATION_COST_SCORE} pts Score
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => onOpenApplyModal('new')}
                    disabled={(currentUser?.wallet || 0) < GAME_RULES.CREATION_COST_PIXI}
                    className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                        (currentUser?.wallet || 0) < GAME_RULES.CREATION_COST_PIXI 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                    }`}
                >
                    <Plus size={20}/>
                    {(currentUser?.wallet || 0) < GAME_RULES.CREATION_COST_PIXI ? 'Fonds insuffisants' : 'Fonder mon Studio'}
                </button>
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
