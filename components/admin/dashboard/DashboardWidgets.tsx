
import React, { useMemo } from 'react';
import { Agency, Deliverable, TransactionRequest, PeerReview } from '../../../types';
import { UserPlus, Briefcase, UserMinus, Wallet, CheckCircle2, UserCog, ArrowRight, X, Check, Eye, ShieldAlert } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';
import { GAME_RULES } from '../../../constants';

interface DashboardWidgetsProps {
    pendingUsersCount: number;
    pendingHires: number;
    pendingFires: number;
    pendingTransactions: {agency: Agency, request: TransactionRequest}[];
    pendingReviews: {agency: Agency, weekId: string, deliverable: Deliverable}[];
    activeAgencies: Agency[];
    onNavigate: (view: string) => void;
    onSetGradingItem: (item: any) => void;
    onSetAuditAgency: (agency: Agency) => void;
    readOnly?: boolean;
}

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ 
    pendingUsersCount, pendingHires, pendingFires, pendingTransactions, pendingReviews, activeAgencies, 
    onNavigate, onSetGradingItem, onSetAuditAgency, readOnly 
}) => {
    
    const { handleTransactionRequest, reviews } = useGame();

    // --- LOGIQUE DE DETECTION RH (Interne au widget d'affichage) ---
    const detectAnomalies = (agency: Agency, allReviews: PeerReview[]): string[] => {
        const anomalies: string[] = [];
        const agencyReviews = allReviews.filter(r => r.agencyId === agency.id);
        
        // 1. Notes suspectes (trop hautes)
        if (agencyReviews.length > 2) {
            const averageScore = agencyReviews.reduce((acc, r) => 
                acc + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / agencyReviews.length;
            if (averageScore > 4.8) anomalies.push("Notes Suspectes");
        }

        // 2. Karma Critique (Comportement toxique ou triche détectée)
        // On considère qu'un Karma < 30 est un signal d'alarme (Base 50)
        const lowKarmaMembers = agency.members.filter(m => (m.karma || 50) < 30);
        if (lowKarmaMembers.length > 0) {
            anomalies.push(`Karma Critique (${lowKarmaMembers.length})`);
        }

        // 3. Problèmes Financiers
        if (agency.budget_real <= GAME_RULES.BANKRUPTCY_THRESHOLD) anomalies.push("FAILLITE !!!");
        else if (agency.budget_real < 0) anomalies.push("Dette (Gel Salaire)");
        
        // 4. Inactivité
        if (agency.eventLog.length < 2) anomalies.push("Inactivité détectée");
        
        return anomalies;
    };

    // Count Suspicious Activity (BLACK_OP events in last 24h across all agencies)
    const suspicionCount = activeAgencies.reduce((acc, agency) => {
        return acc + agency.eventLog.filter(e => e.type === 'BLACK_OP').length;
    }, 0);

    const anomalousAgencies = useMemo(() => {
        return activeAgencies.filter(a => detectAnomalies(a, reviews).length > 0);
    }, [activeAgencies, reviews]);

    return (
        <div className="xl:col-span-1 space-y-4">
            
            {/* WIDGET: SUSPICIOUS ACTIVITY (NEW) */}
            {suspicionCount > 0 && (
                <div className="p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all bg-red-900 border-red-700 text-white animate-pulse">
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={20} className="text-red-300"/>
                        <div>
                            <p className="text-xs font-bold uppercase opacity-80 text-red-200">Activité Suspecte</p>
                            <p className="font-bold text-lg leading-none">{suspicionCount} incidents détectés</p>
                        </div>
                    </div>
                </div>
            )}

            {/* WIDGET: PENDING USERS */}
            <div 
                onClick={() => onNavigate('ACCESS')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
                pendingUsersCount > 0 ? 'bg-indigo-600 border-indigo-700 text-white ring-4 ring-indigo-200' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
            }`}>
                <div className="flex items-center gap-3">
                    <UserPlus size={20} className={pendingUsersCount > 0 ? "text-indigo-200" : "text-slate-400"}/>
                    <div>
                        <p className="text-xs font-bold uppercase opacity-80">Salle d'attente</p>
                        <p className="font-bold text-lg leading-none">{pendingUsersCount} étudiants</p>
                    </div>
                </div>
                {pendingUsersCount > 0 && <div className="animate-pulse w-3 h-3 bg-white rounded-full"></div>}
            </div>

            {/* WIDGET: PENDING HIRES (EMBAUCHES) */}
            <div 
                onClick={() => onNavigate('MERCATO')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
                pendingHires > 0 ? 'bg-emerald-500 border-emerald-600 text-white ring-4 ring-emerald-200' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'
            }`}>
                <div className="flex items-center gap-3">
                    <Briefcase size={20} className={pendingHires > 0 ? "text-emerald-100" : "text-slate-400"}/>
                    <div>
                        <p className="text-xs font-bold uppercase opacity-80">Embauches</p>
                        <p className="font-bold text-lg leading-none">{pendingHires} demandes</p>
                    </div>
                </div>
                {pendingHires > 0 && <ArrowRight size={18} className="opacity-80"/>}
            </div>

            {/* WIDGET: PENDING FIRES */}
            <div 
                onClick={() => onNavigate('MERCATO')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:shadow-md ${
                pendingFires > 0 ? 'bg-amber-500 border-amber-600 text-white ring-4 ring-amber-200' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
            }`}>
                <div className="flex items-center gap-3">
                    <UserMinus size={20} className={pendingFires > 0 ? "text-amber-100" : "text-slate-400"}/>
                    <div>
                        <p className="text-xs font-bold uppercase opacity-80">Licenciements</p>
                        <p className="font-bold text-lg leading-none">{pendingFires} demandes</p>
                    </div>
                </div>
                <ArrowRight size={18} className="opacity-50"/>
            </div>

            {/* WIDGET: PENDING TRANSACTIONS (BUY SCORE) */}
            {pendingTransactions.length > 0 && (
                <div className="bg-white border border-amber-200 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-base font-bold text-amber-800 mb-4 flex items-center gap-2">
                        <Wallet size={18} /> Achats Points ({pendingTransactions.length})
                    </h3>
                    <div className="space-y-2">
                        {pendingTransactions.map(({agency, request}) => (
                            <div key={request.id} className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{request.studentName}</p>
                                    <p className="text-[10px] text-slate-500">
                                        +{request.amountScore} pts contre {request.amountPixi} PiXi
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleTransactionRequest(agency, request, false)} className="p-1 bg-white hover:bg-red-100 text-red-500 rounded border border-red-100"><X size={14}/></button>
                                    <button onClick={() => handleTransactionRequest(agency, request, true)} className="p-1 bg-white hover:bg-emerald-100 text-emerald-500 rounded border border-emerald-100"><Check size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 1. Pending Reviews */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    À Corriger ({pendingReviews.length})
                </h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                    {pendingReviews.length === 0 ? (
                         <div className="text-center py-6 text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-xl">
                            Tout est à jour.
                        </div>
                    ) : (
                        pendingReviews.map((item) => (
                            <div 
                                key={`${item.agency.id}-${item.deliverable.id}`}
                                onClick={() => !readOnly && onSetGradingItem({agencyId: item.agency.id, weekId: item.weekId, deliverable: item.deliverable})}
                                className={`p-3 bg-white border rounded-xl transition-all shadow-sm ${readOnly ? 'cursor-default opacity-70 border-slate-100' : 'cursor-pointer hover:bg-indigo-50 border-indigo-100 hover:border-indigo-300 group'}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-700 text-xs">{item.agency.name}</span>
                                    <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">SEM {item.weekId}</span>
                                </div>
                                <p className="text-xs text-indigo-900 font-medium truncate">{item.deliverable.name}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 2. HR Audits */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserCog size={18} className="text-purple-500" />
                    Audits RH Requis
                </h3>
                <div className="space-y-2">
                     {anomalousAgencies.length === 0 && (
                          <div className="text-center py-6 text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-xl">
                            R.A.S
                        </div>
                     )}
                     {anomalousAgencies.map(agency => (
                         <div key={agency.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-xl">
                             <div>
                                 <div className="font-bold text-slate-800 text-xs">{agency.name}</div>
                                 <div className="text-[10px] text-red-600 font-bold">{detectAnomalies(agency, reviews)[0]}</div>
                             </div>
                             <button onClick={() => onSetAuditAgency(agency)} className="p-1.5 bg-white text-red-500 rounded-lg hover:bg-red-100 border border-red-100">
                                 <Eye size={14}/>
                             </button>
                         </div>
                     ))}
                </div>
            </div>
        </div>
    );
};
