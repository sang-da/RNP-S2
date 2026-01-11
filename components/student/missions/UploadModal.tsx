
import React from 'react';
import { Modal } from '../../Modal';
import { Upload, CheckSquare } from 'lucide-react';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    checks: { naming: boolean; format: boolean; resolution: boolean; audio: boolean; };
    setChecks: (checks: any) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onConfirm, checks, setChecks }) => {
    
    const toggleCheck = (key: keyof typeof checks) => {
        setChecks({ ...checks, [key]: !checks[key] });
    };

    const allChecked = Object.values(checks).every(Boolean);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Contrôle Qualité">
            <div className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800">
                    Avant de déposer, certifiez la conformité de votre fichier. Un mauvais format entraînera un rejet immédiat (0 VE).
                </div>

                <div className="space-y-3">
                    <CheckItem 
                        label="Nommage Correct" 
                        sub="GRPXX_SEMXX_NomLivrable_vXX.ext"
                        checked={checks.naming} 
                        onChange={() => toggleCheck('naming')}
                    />
                    <CheckItem 
                        label="Format de Fichier" 
                        sub="MP4 (H.264), PDF ou JPG/PNG"
                        checked={checks.format} 
                        onChange={() => toggleCheck('format')}
                    />
                    <CheckItem 
                        label="Poids & Résolution" 
                        sub="Max 50Mo (sauf rendu final) / 1080p"
                        checked={checks.resolution} 
                        onChange={() => toggleCheck('resolution')}
                    />
                    <CheckItem 
                        label="Conformité Technique" 
                        sub="Pas de lien externe, fichier brut uniquement"
                        checked={checks.audio} 
                        onChange={() => toggleCheck('audio')}
                    />
                </div>

                <button 
                    onClick={onConfirm}
                    disabled={!allChecked}
                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        allChecked 
                        ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {allChecked ? <><Upload size={18}/> Confirmer le Dépôt</> : 'Validez la checklist'}
                </button>
            </div>
        </Modal>
    );
};

const CheckItem: React.FC<{label: string, sub: string, checked: boolean, onChange: () => void}> = ({label, sub, checked, onChange}) => (
    <div 
        onClick={onChange}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
        }`}
    >
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
            checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
        }`}>
            {checked && <CheckSquare size={14} className="text-white"/>}
        </div>
        <div>
            <p className={`font-bold text-sm ${checked ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</p>
            <p className="text-xs text-slate-500">{sub}</p>
        </div>
    </div>
);
