
import React from 'react';
import { Agency, GameEvent } from '../../../../types';
import { Modal } from '../../../Modal';
import { useUI } from '../../../../contexts/UIContext';
import { UserCog, Flame } from 'lucide-react';

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
