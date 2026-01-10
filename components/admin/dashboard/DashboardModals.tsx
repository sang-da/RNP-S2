
import React, { useState } from 'react';
import { Agency, Deliverable, GameEvent } from '../../../types';
import { Modal } from '../../Modal';
import { useUI } from '../../../contexts/UIContext';
import { useGame } from '../../../contexts/GameContext';
import { getAgencyPerformanceMultiplier } from '../../../constants';
import { UserCog, Flame, Star, Wallet, Zap } from 'lucide-react';

// --- CONTROL PANEL ---
interface ControlPanelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ isOpen, onClose }) => {
    const { isAutoMode, toggleAutoMode, processFinance, processPerformance } = useGame();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Centre de Contrôle Hebdo">
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isAutoMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">Mode Automatique</p>
                            <p className="text-xs text-slate-500">Exécution programmée selon calendrier</p>
                        </div>
                    </div>
                    <button 
                      onClick={toggleAutoMode}
                      className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isAutoMode ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    >
                        {isAutoMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* CLASSE A */}
                    <div className="p-4 border-2 border-blue-100 rounded-xl bg-blue-50/30">
                        <h4 className="font-bold text-blue-800 mb-3 text-center border-b border-blue-200 pb-2">CLASSE A</h4>
                        <div className="space-y-2">
                            <button 
                              onClick={() => processFinance('A')}
                              className="w-full py-3 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Wallet size={14}/> Traiter Finance
                            </button>
                            <button 
                              onClick={() => processPerformance('A')}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Zap size={14}/> Traiter Performance
                            </button>
                        </div>
                    </div>

                    {/* CLASSE B */}
                    <div className="p-4 border-2 border-purple-100 rounded-xl bg-purple-50/30">
                        <h4 className="font-bold text-purple-800 mb-3 text-center border-b border-purple-200 pb-2">CLASSE B</h4>
                        <div className="space-y-2">
                            <button 
                              onClick={() => processFinance('B')}
                              className="w-full py-3 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Wallet size={14}/> Traiter Finance
                            </button>
                            <button 
                              onClick={() => processPerformance('B')}
                              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Zap size={14}/> Traiter Performance
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="text-center text-[10px] text-slate-400 italic">
                    Attention : Ces actions sont irréversibles et impactent immédiatement les budgets et notes.
                </div>
            </div>
        </Modal>
    );
};

// --- GRADING MODAL ---
interface GradingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {agencyId: string, weekId: string, deliverable: Deliverable};
    agencies: Agency[];
    onUpdateAgency: (agency: Agency) => void;
}

export const GradingModal: React.FC<GradingModalProps> = ({ isOpen, onClose, item, agencies, onUpdateAgency }) => {
    const { toast } = useUI();
    const [quality, setQuality] = useState<'A' | 'B' | 'C'>('B');
    const [daysLate, setDaysLate] = useState<number>(0);
    const [constraintBroken, setConstraintBroken] = useState<boolean>(false);
    const [feedback, setFeedback] = useState(item.deliverable.feedback || "");
    const [mvpId, setMvpId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    const agency = agencies.find(a => a.id === item.agencyId);
    const baseScore = quality === 'A' ? 10 : quality === 'B' ? 4 : 0;
    const penaltyLate = (daysLate || 0) * 5;
    const penaltyConstraint = constraintBroken ? 10 : 0;
    const rawDelta = baseScore - penaltyLate - penaltyConstraint;

    const handleValidate = async () => {
        if(!agency) return;
        setIsSaving(true);

        try {
            // PERFORMANCE MULTIPLIER APPLICATION
            const multiplier = getAgencyPerformanceMultiplier(agency);
            const finalDelta = rawDelta > 0 ? Math.round(rawDelta * multiplier) : rawDelta;
            const perfPercent = Math.round(multiplier * 100);

            const currentWeek = agency.progress[item.weekId];
            const isRejected = quality === 'C';
            const finalStatus: 'validated' | 'rejected' = isRejected ? 'rejected' : 'validated';
            
            const updatedDeliverables = currentWeek.deliverables.map(d => 
                d.id === item.deliverable.id 
                ? { 
                    ...d, 
                    status: finalStatus,
                    feedback: feedback,
                    score: 100,
                    grading: {
                        quality,
                        daysLate: daysLate || 0, // Sécurité NaN
                        constraintBroken,
                        finalDelta: finalDelta || 0, // Sécurité NaN
                        mvpId: mvpId || null // Sécurité Firebase (null au lieu de undefined/empty)
                    }
                }
                : d
            );

            let updatedProjectDef = agency.projectDef;
            if (item.deliverable.id === 'd_charter' && isRejected) {
                updatedProjectDef = { ...agency.projectDef, isLocked: false };
            }

            // Apply MVP Bonus if Grade is A and MVP selected
            let updatedMembers = agency.members;
            if (quality === 'A' && mvpId) {
                updatedMembers = agency.members.map(m => 
                    m.id === mvpId ? { ...m, individualScore: Math.min(100, m.individualScore + 5) } : m
                );
            }

            const newEvent: GameEvent = {
                id: `evt-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'VE_DELTA',
                label: isRejected ? `Rejet: ${item.deliverable.name}` : `Correction: ${item.deliverable.name}`,
                deltaVE: finalDelta,
                description: `Qualité ${quality} (${baseScore}pts) | Retard: ${daysLate}j (-${penaltyLate}) | Perf. ${perfPercent}%${mvpId ? ' | MVP Bonus' : ''}`
            };

            const updatedAgency = {
                ...agency,
                ve_current: Math.max(0, Math.min(100, agency.ve_current + finalDelta)),
                projectDef: updatedProjectDef,
                eventLog: [...agency.eventLog, newEvent],
                members: updatedMembers,
                progress: {
                    ...agency.progress,
                    [item.weekId]: {
                        ...currentWeek,
                        deliverables: updatedDeliverables
                    }
                }
            };

            // ATTENTE DE LA SAUVEGARDE DB
            await onUpdateAgency(updatedAgency);
            
            toast(finalDelta >= 0 ? 'success' : 'warning', `Correction enregistrée (${finalDelta} VE) - Perf ${perfPercent}%`);
            onClose();
        } catch (error) {
            console.error("Erreur validation:", error);
            toast('error', "Échec de l'enregistrement en base de données.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Correction de Livrable">
            <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-lg text-slate-800">{item.deliverable.name}</h4>
                    {item.deliverable.fileUrl && (
                        <a href={item.deliverable.fileUrl} target="_blank" className="text-sm text-indigo-600 font-bold hover:underline block mt-1">Voir le fichier rendu</a>
                    )}
                </div>
                 <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Qualité du rendu</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setQuality('A')} className={`py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${quality === 'A' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 hover:border-emerald-200'}`}>A (Excellence)</button>
                            <button onClick={() => setQuality('B')} className={`py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${quality === 'B' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 hover:border-amber-200'}`}>B (Standard)</button>
                            <button onClick={() => setQuality('C')} className={`py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${quality === 'C' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 hover:border-red-200'}`}>C (Rejet)</button>
                        </div>
                    </div>
                    
                    {quality === 'A' && agency && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
                                <Star size={16} fill="currentColor"/> Lead / MVP du Rendu (+5 Score)
                            </label>
                            <select 
                                className="w-full p-2 border border-emerald-200 rounded-lg bg-emerald-50 text-emerald-900 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                value={mvpId}
                                onChange={e => setMvpId(e.target.value)}
                            >
                                <option value="">-- Sélectionner un étudiant --</option>
                                {agency.members.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">Jours de Retard</label>
                             <input 
                                type="number" 
                                min="0" 
                                value={daysLate} 
                                onChange={e => setDaysLate(e.target.value ? parseInt(e.target.value) : 0)} 
                                className="w-full p-3 border border-slate-200 rounded-xl"
                             />
                        </div>
                        <div className="flex items-end">
                             <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-xl w-full hover:bg-slate-50">
                                 <input type="checkbox" checked={constraintBroken} onChange={e => setConstraintBroken(e.target.checked)} className="w-5 h-5 accent-red-500"/>
                                 <span className="text-sm font-bold text-slate-700">Contrainte non respectée</span>
                             </label>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Commentaire</label>
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white" placeholder="Feedback constructif..." />
                    </div>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="font-bold">
                        Impact VE Brut: <span className={`${rawDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{rawDelta > 0 ? '+' : ''}{rawDelta}</span>
                        {rawDelta > 0 && agency && (
                            <span className="text-xs text-slate-400 block font-normal">
                                Multiplicateur Perf: x{getAgencyPerformanceMultiplier(agency).toFixed(2)}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={handleValidate} 
                        disabled={isSaving}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Sauvegarde...' : 'Valider'}
                    </button>
                 </div>
            </div>
        </Modal>
    );
}

// --- AUDIT RH MODAL ---
interface AuditRHModalProps {
    agency: Agency;
    onClose: () => void;
    onUpdateAgency: (a: Agency) => void;
    readOnly?: boolean;
}

export const AuditRHModal: React.FC<AuditRHModalProps> = ({agency, onClose, onUpdateAgency, readOnly}) => {
    const { toast, confirm } = useUI();

    const detectAnomalies = (agency: Agency): string[] => {
        const anomalies: string[] = [];
        if (agency.peerReviews.length > 2) {
            const averageScore = agency.peerReviews.reduce((acc, r) => 
                acc + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / agency.peerReviews.length;
            if (averageScore > 4.8) anomalies.push("Notes Suspectes");
        }
        if (agency.budget_real < 0) anomalies.push("Faillite imminente");
        if (agency.eventLog.length < 2) anomalies.push("Inactivité détectée");
        return anomalies;
    };

    const handlePunish = async () => {
        const confirmed = await confirm({
            title: "Sanctionner l'Agence ?",
            message: `Vous allez infliger -15 VE à l'agence "${agency.name}" pour "Fraude Notation RH".`,
            confirmText: "Sanctionner",
            isDangerous: true
        });

        if (!confirmed) return;

        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'CRISIS',
            label: "Fraude Notation RH",
            deltaVE: -15,
            description: "Les notes attribuées entre pairs sont jugées de complaisance et non réalistes. Audit négatif."
        };

        const updatedAgency = {
            ...agency,
            ve_current: Math.max(0, agency.ve_current - 15),
            eventLog: [...agency.eventLog, newEvent]
        };
        onUpdateAgency(updatedAgency);
        toast('error', `Sanction appliquée à ${agency.name}`);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Audit RH: ${agency.name}`}>
            <div className="space-y-6">
                <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <UserCog size={24} className="text-purple-600"/>
                    <p className="text-sm text-purple-900 leading-tight">
                        Anomalies détectées : <strong>{detectAnomalies(agency).join(', ') || 'Aucune'}</strong>.
                        <br/>Vérifiez la variance des notes.
                    </p>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {agency.peerReviews.length === 0 ? (
                        <div className="text-center text-slate-400 py-8 italic border-2 border-dashed rounded-xl">
                            Aucune évaluation effectuée par les étudiants.
                        </div>
                    ) : (
                        agency.peerReviews.map(review => (
                            <div key={review.id} className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm">
                                        <span className="font-bold text-slate-700">{review.reviewerName}</span>
                                        <span className="text-slate-400 mx-1">→</span>
                                        <span className="font-bold text-slate-900">{review.targetName}</span>
                                    </div>
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 rounded-md">{review.date}</span>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <BadgeScore label="Assiduité" score={review.ratings.attendance} />
                                    <BadgeScore label="Qualité" score={review.ratings.quality} />
                                    <BadgeScore label="Implication" score={review.ratings.involvement} />
                                </div>
                                {review.comment && (
                                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg">"{review.comment}"</p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                        Fermer
                    </button>
                    {!readOnly && (
                    <button 
                        onClick={handlePunish}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                        <Flame size={18}/>
                        Sanctionner (-15 VE)
                    </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const BadgeScore: React.FC<{label: string, score: number}> = ({label, score}) => (
    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${
        score >= 4 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
        score >= 2.5 ? 'bg-amber-50 border-amber-100 text-amber-700' :
        'bg-red-50 border-red-100 text-red-700'
    }`}>
        {label}: {score}/5
    </div>
);
