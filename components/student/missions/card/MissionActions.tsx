
import React from 'react';
import { Deliverable } from '../../../../types';
import { Loader2, FileText, CheckCircle2, Upload, PenTool, Link, Image, AlertCircle, RefreshCw } from 'lucide-react';

interface MissionActionsProps {
    deliverable: Deliverable;
    isUploading: boolean;
    onAction: (id: string) => void;
}

export const MissionActions: React.FC<MissionActionsProps> = ({ deliverable, isUploading, onAction }) => {
    const type = deliverable.type || 'FILE';

    const getActionIcon = () => {
        if (isUploading) return <Loader2 className="animate-spin" size={16}/>;
        switch(type) {
            case 'FORM_CHARTER': return <FileText size={16}/>;
            case 'FORM_NAMING': return <PenTool size={16}/>;
            case 'SPECIAL_LOGO':
            case 'SPECIAL_BANNER': return <Image size={16}/>;
            case 'LINK': return <Link size={16}/>;
            default: return <Upload size={16}/>;
        }
    };

    const getButtonLabel = () => {
        switch(type) {
            case 'FORM_CHARTER': return 'Remplir la Charte';
            case 'FORM_NAMING': return 'Définir l\'Identité';
            case 'SPECIAL_LOGO': return 'Uploader le Logo';
            case 'SPECIAL_BANNER': return 'Uploader la Bannière';
            case 'LINK': return 'Soumettre le Lien';
            default: return 'Déposer le fichier';
        }
    };

    // Logic to determine if action is needed
    const canSubmit = deliverable.status === 'pending' || deliverable.status === 'rejected';
    const isSubmitted = deliverable.status === 'submitted';
    const isValidated = deliverable.status === 'validated';

    return (
        <div className="flex flex-col md:flex-row items-center justify-end gap-4 mt-2 pt-3 border-t border-slate-200/50">
            
            {/* LINK TO FILE (IF EXISTS) */}
            {deliverable.fileUrl && deliverable.fileUrl !== '#' && (
                <a 
                    href={deliverable.fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 mr-auto"
                >
                    <FileText size={14} /> Voir le rendu actuel
                </a>
            )}

            {/* ACTION AREA */}
            {canSubmit ? (
                <button 
                    onClick={() => !isUploading && onAction(deliverable.id)}
                    disabled={isUploading}
                    className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        ['FORM_CHARTER', 'FORM_NAMING', 'SPECIAL_LOGO', 'SPECIAL_BANNER'].includes(type) 
                        ? 'bg-slate-900 text-white hover:bg-slate-800' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                    } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {getActionIcon()}
                    {getButtonLabel()}
                </button>
            ) : isSubmitted ? (
                <div className="w-full md:w-auto flex items-center justify-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <Loader2 size={14} className="animate-spin text-indigo-500"/>
                        En attente de correction...
                    </div>
                    {/* OPTIONNEL : BOUTON DE RE-UPLOAD SI BESOIN */}
                    {/* <button onClick={() => onAction(deliverable.id)} className="text-[10px] text-slate-400 underline hover:text-indigo-600">Modifier</button> */}
                </div>
            ) : isValidated ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle2 size={16}/> Validé & Archivé
                </div>
            ) : null}
        </div>
    );
};
