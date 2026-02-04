
import React from 'react';
import { Modal } from '../../Modal';
import { Upload, CheckSquare, Target, User, AlertCircle } from 'lucide-react';
import { Student } from '../../../types';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileSelect: (file: File) => void;
    checks: { naming: boolean; format: boolean; resolution: boolean; audio: boolean; };
    setChecks: (checks: any) => void;
    selfAssessment: 'A' | 'B' | 'C';
    setSelfAssessment: (val: 'A' | 'B' | 'C') => void;
    members?: Student[]; // Liste des membres pour le choix du MVP
    nominatedMvp: string | null;
    setNominatedMvp: (id: string | null) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onFileSelect, checks, setChecks, selfAssessment, setSelfAssessment, members = [], nominatedMvp, setNominatedMvp }) => {
    
    const toggleCheck = (key: keyof typeof checks) => {
        setChecks({ ...checks, [key]: !checks[key] });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const allChecked = Object.values(checks).every(Boolean);
    const isSolo = members.length <= 1;
    const isMvpReady = isSolo || nominatedMvp !== null;
    const canSubmit = allChecked && isMvpReady;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Dépôt & Lucidité">
            <div className="space-y-6">
                
                {/* 1. LUCIDITY INDEX */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
                        <Target size={16}/> Auto-Évaluation (Indice de Lucidité)
                    </h4>
                    <p className="text-xs text-indigo-700 mb-3">
                        Quelle note méritez-vous ? Si votre estimation correspond à celle du prof, vous gagnez un <strong>Bonus Lucidité (+2 Score)</strong>.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setSelfAssessment('A')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selfAssessment === 'A' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white border-indigo-200 text-slate-500'}`}>A (Excellent)</button>
                        <button onClick={() => setSelfAssessment('B')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selfAssessment === 'B' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white border-indigo-200 text-slate-500'}`}>B (Standard)</button>
                        <button onClick={() => setSelfAssessment('C')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selfAssessment === 'C' ? 'bg-red-500 text-white border-red-600' : 'bg-white border-indigo-200 text-slate-500'}`}>C (Moyen)</button>
                    </div>
                </div>

                {/* 2. LEAD MVP (Team Only) */}
                {!isSolo && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h4 className="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2">
                            <User size={16}/> Qui a leadé cette mission ? (MVP)
                        </h4>
                        <p className="text-xs text-amber-800 mb-3">
                            Désignez le membre qui a le plus contribué. Si le rendu est excellent (A), le MVP peut gagner <strong>+5 Score</strong>.
                        </p>
                        <select 
                            value={nominatedMvp || ''} 
                            onChange={(e) => setNominatedMvp(e.target.value || null)}
                            className="w-full p-2 rounded-lg border border-amber-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                            <option value="">-- Sélectionner un Lead --</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 3. CHECKLIST */}
                <div className="space-y-3">
                    <CheckItem label="Nommage Correct" sub="GRPXX_SEMXX_NomLivrable_vXX.ext" checked={checks.naming} onChange={() => toggleCheck('naming')}/>
                    <CheckItem label="Format de Fichier" sub="MP4 (H.264), PDF ou JPG/PNG" checked={checks.format} onChange={() => toggleCheck('format')}/>
                    <CheckItem label="Poids & Résolution" sub="Max 50Mo (sauf rendu final) / 1080p" checked={checks.resolution} onChange={() => toggleCheck('resolution')}/>
                    <CheckItem label="Conformité Technique" sub="Pas de lien externe, fichier brut uniquement" checked={checks.audio} onChange={() => toggleCheck('audio')}/>
                </div>

                {/* 4. SUBMISSION AREA */}
                <div className="pt-2">
                    <input 
                        type="file" 
                        id="submission-upload"
                        className="hidden" 
                        onChange={handleFileChange}
                        disabled={!canSubmit}
                    />
                    <label 
                        htmlFor="submission-upload"
                        className={`w-full py-4 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 text-center border-2 border-dashed ${
                            canSubmit
                            ? 'bg-slate-900 text-white border-slate-900 hover:bg-indigo-600 hover:border-indigo-600 cursor-pointer shadow-lg active:scale-95' 
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                    >
                        <div className="flex items-center gap-2 text-sm">
                            <Upload size={20} className={canSubmit ? "animate-bounce" : ""}/> 
                            {canSubmit ? "SÉLECTIONNER LE FICHIER" : "Complétez la checklist pour débloquer"}
                        </div>
                        {canSubmit && <span className="text-[10px] opacity-70 font-normal">Max 50 Mo - PDF, MP4, JPG, PNG</span>}
                    </label>
                </div>
            </div>
        </Modal>
    );
};

const CheckItem: React.FC<{label: string, sub: string, checked: boolean, onChange: () => void}> = ({label, sub, checked, onChange}) => (
    <div onClick={onChange} className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
            {checked && <CheckSquare size={12} className="text-white"/>}
        </div>
        <div>
            <p className={`font-bold text-xs ${checked ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</p>
            <p className="text-[10px] text-slate-500">{sub}</p>
        </div>
    </div>
);
