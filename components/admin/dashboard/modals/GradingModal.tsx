
import React, { useState } from 'react';
import { Agency, Deliverable, GameEvent } from '../../../../types';
import { Modal } from '../../../Modal';
import { useUI } from '../../../../contexts/UIContext';
import { getAgencyPerformanceMultiplier } from '../../../../constants';
import { Mail, Star, Send } from 'lucide-react';
import { db, collection } from '../../../../services/firebase';

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
            // 1. CALCULS DE PERFORMANCE
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
                        daysLate: daysLate || 0,
                        constraintBroken,
                        finalDelta: finalDelta || 0,
                        mvpId: mvpId || null
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

            // 2. SAUVEGARDE DB (AGENCY UPDATE)
            await onUpdateAgency(updatedAgency);
            
            // 3. ENVOI EMAIL SEAMLESS (VIA FIRESTORE TRIGGER)
            // Au lieu d'ouvrir mailto:, on écrit dans la collection 'mail'
            // Cela nécessite l'extension "Trigger Email" dans Firebase Console.
            const recipients = agency.members
                .map(m => m.email)
                .filter(email => email && email.includes('@'));

            if (recipients.length > 0) {
                const mailSubject = `Correction RNP : ${item.deliverable.name} (${agency.name})`;
                const mailBody = `
Bonjour l'équipe ${agency.name},

Voici le retour officiel pour le livrable "${item.deliverable.name}" :

- Qualité : ${quality}
- Retard : ${daysLate} jour(s)
- Impact VE : ${finalDelta >= 0 ? '+' : ''}${finalDelta}

Commentaire de l'enseignant :
"${feedback}"

Bon courage pour la suite.
L'équipe RNP.
                `;

                // Écriture dans la collection 'mail' pour déclencher l'envoi serveur
                await collection(db, 'mail').add({
                    to: recipients,
                    message: {
                        subject: mailSubject,
                        text: mailBody,
                        html: mailBody.replace(/\n/g, '<br>') // Version HTML basique
                    }
                });
                
                toast('success', `Correction enregistrée & Email envoyé (${recipients.length} destinataires)`);
            } else {
                toast('warning', "Correction enregistrée, mais aucun email valide trouvé pour l'envoi.");
            }

            onClose();
        } catch (error) {
            console.error("Erreur validation:", error);
            toast('error', "Erreur lors de l'enregistrement.");
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
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? 'Envoi...' : <><Send size={16}/> Valider & Notifier</>}
                    </button>
                 </div>
            </div>
        </Modal>
    );
}
