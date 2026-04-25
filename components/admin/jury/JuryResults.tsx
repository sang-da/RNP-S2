import React, { useMemo } from 'react';
import { Agency } from '../../../types';
import { MessageSquare, Landmark, Trophy, Search, UserCircle2 } from 'lucide-react';

interface JuryResultsProps {
    agencies: Agency[];
}

export const JuryResults: React.FC<JuryResultsProps> = ({ agencies }) => {
    // Trier les agences par montant d'investissement reçu ou par ordre alphabétique
    const agenciesStats = useMemo(() => {
        return agencies.filter(a => a.id !== 'unassigned').map(agency => {
            const juryEvents = agency.eventLog?.filter(e => e.label === 'INVESTISSEMENT JURY') || [];
            const totalInvested = juryEvents.reduce((acc, ev) => acc + (ev.deltaBudgetReal || 0), 0);
            const feedbacks = agency.juryFeedbacks || [];

            return {
                ...agency,
                totalInvested,
                juryEvents,
                feedbacks
            };
        }).sort((a, b) => b.totalInvested - a.totalInvested);
    }, [agencies]);

    const totalJuryInvestments = agenciesStats.reduce((acc, a) => acc + a.totalInvested, 0);
    const totalFeedbacks = agenciesStats.reduce((acc, a) => acc + a.feedbacks.length, 0);

    return (
        <div className="space-y-8 animate-in fade-in flex flex-col h-full">
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Investi (Jury)</p>
                        <p className="text-3xl font-mono font-bold text-emerald-600">{totalJuryInvestments.toLocaleString()} PiXi</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Avis Soumis</p>
                        <p className="text-3xl font-mono font-bold text-indigo-600">{totalFeedbacks}</p>
                    </div>
                </div>
            </div>

            {/* List of agencies */}
            <div className="space-y-6 flex-1 w-full pb-8">
                {agenciesStats.map((agency, index) => (
                    <div key={agency.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row relative">
                        
                        {/* Grand Vainqueur Badge */}
                        {index === 0 && agency.totalInvested > 0 && (
                            <div className="absolute top-0 right-0 lg:right-auto lg:left-0">
                                <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl lg:rounded-bl-none lg:rounded-br-xl shadow-sm flex items-center gap-2">
                                    <Trophy size={12}/> Favori du Jury
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 p-6 lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-center items-center text-center relative pt-8">
                            {agency.logoUrl ? (
                                <img src={agency.logoUrl} alt={agency.name} className="w-20 h-20 rounded-2xl object-cover bg-white shadow-md border border-slate-100 mb-4" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-indigo-100/50 border border-indigo-100 flex items-center justify-center mb-4 shadow-sm">
                                    <span className="text-3xl font-display font-bold text-indigo-400">{agency.name.charAt(0)}</span>
                                </div>
                            )}
                            <h3 className="font-display font-bold text-xl text-slate-900 break-words w-full px-2" style={{ textWrap: 'balance' }}>{agency.name}</h3>
                            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl w-full shadow-sm">
                                <span className="text-xs uppercase font-bold tracking-widest text-slate-400 block mb-2">Total Récolté</span>
                                <span className={`text-2xl font-mono font-bold ${agency.totalInvested > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    {agency.totalInvested.toLocaleString()} PiXi
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-1 bg-white min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><MessageSquare size={16} /></span>
                                Retours du Jury ({agency.feedbacks.length})
                            </h4>

                            {agency.feedbacks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {agency.feedbacks.map((fb, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-colors">
                                            <div className="flex justify-between items-start mb-3 gap-4">
                                                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm truncate">
                                                    <UserCircle2 size={16} className="text-indigo-400 shrink-0"/>
                                                    <span className="truncate">{fb.juryName}</span>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                                                    {new Date(fb.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap pl-6 border-l-2 border-indigo-100">{fb.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400">
                                    <Search size={32} className="mb-3 opacity-20"/>
                                    <p className="text-sm font-medium">Aucun retour enregistré pour le moment.</p>
                                </div>
                            )}

                            {agency.juryEvents.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Landmark size={16} /></span>
                                        Détail des Investissements
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {agency.juryEvents.map(ev => {
                                            const parts = ev.description.split(': ');
                                            const juryName = parts.length > 1 ? parts.slice(1).join(': ') : ev.description;
                                            return (
                                                <div key={ev.id} className="text-sm bg-white border border-emerald-200 text-slate-600 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    <span className="font-mono font-bold text-emerald-700">{ev.deltaBudgetReal}</span>
                                                    <span>par <span className="font-bold text-slate-900">{juryName}</span></span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {agenciesStats.length === 0 && (
                    <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
                        <p className="text-slate-500">Aucune agence active trouvée.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
