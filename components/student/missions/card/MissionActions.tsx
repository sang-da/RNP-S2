
import React from 'react';
import { Deliverable } from '../../../../types';
import { Loader2, FileText, CheckCircle2, Upload, PenTool, Link, Image } from 'lucide-react';

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

    return (
        <div className="flex items-center justify-end gap-4 mt-2 pt-3 border-t border-slate-200/50">
            
            {/* Secondary Action: Link (Text Only) */}
            {deliverable.fileUrl && deliverable.fileUrl !== '#' && (
                <a 
                    href={deliverable.fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mr-auto"
                >
                    <FileText size={14} /> Voir le fichier rendu
                </a>
            )}

            {/* Primary Action: Button */}
            {(deliverable.status === 'pending' || deliverable.status === 'rejected') ? (
                <button 
                    onClick={() => !isUploading && onAction(deliverable.id)}
                    disabled={isUploading}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95 ${
                        ['FORM_CHARTER', 'FORM_NAMING', 'SPECIAL_LOGO', 'SPECIAL_BANNER'].includes(type) 
                        ? 'bg-slate-900 text-white hover:bg-slate-800' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {getActionIcon()}
                    {getButtonLabel()}
                </button>
            ) : (
                <span className={`text-xs font-bold uppercase tracking-wider py-2 flex items-center gap-2 ${
                    deliverable.status === 'validated' ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                    {deliverable.status === 'submitted' ? (
                        <><Loader2 size={14} className="animate-spin"/> En attente de correction...</>
                    ) : (
                        <span className="flex items-center gap-1"><CheckCircle2 size={14}/> Noté & Archivé</span>
                    )}
                </span>
            )}
        </div>
    );
};
