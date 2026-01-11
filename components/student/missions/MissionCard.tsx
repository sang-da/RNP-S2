
import React from 'react';
import { Deliverable } from '../../../types';
import { CheckCircle2, Loader2, FileText, Upload, PenTool } from 'lucide-react';

interface MissionCardProps {
    deliverable: Deliverable;
    isUploading: boolean;
    onAction: (id: string) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({ deliverable, isUploading, onAction }) => {
    
    const getIcon = () => {
        if (deliverable.status === 'validated') return <CheckCircle2 size={20}/>;
        if (deliverable.status === 'submitted') return <Loader2 size={20} className="animate-spin"/>;
        if (deliverable.id === 'd_charter') return <FileText size={20}/>;
        if (deliverable.id === 'd_branding') return <PenTool size={20}/>;
        return <Upload size={20}/>;
    };

    const getStatusColor = () => {
        if (deliverable.status === 'validated') return 'bg-emerald-100 text-emerald-600';
        if (deliverable.status === 'submitted') return 'bg-indigo-100 text-indigo-600';
        return 'bg-white text-slate-400 border';
    };

    const getButtonLabel = () => {
        if (deliverable.id === 'd_charter') return 'Remplir la Charte';
        if (deliverable.id === 'd_branding') return 'Définir l\'Identité';
        return 'Déposer le fichier';
    };

    return (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-bold text-lg text-slate-900">{deliverable.name}</h4>
                        <p className="text-sm text-slate-500">{deliverable.description}</p>
                    </div>
                    <div className={`p-2 rounded-xl ${getStatusColor()}`}>
                        {getIcon()}
                    </div>
                </div>

                {/* ACTIONS FOOTER */}
                <div className="flex items-center justify-end gap-4 mt-2 pt-3 border-t border-slate-200/50">
                    
                    {/* Secondary Action: Link (Text Only) */}
                    {deliverable.fileUrl && deliverable.fileUrl !== '#' && (
                        <a 
                            href={deliverable.fileUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mr-auto"
                        >
                            <FileText size={14} /> Voir le fichier envoyé
                        </a>
                    )}

                    {/* Primary Action: Button */}
                    {(deliverable.status === 'pending' || deliverable.status === 'rejected') ? (
                        <button 
                            onClick={() => !isUploading && onAction(deliverable.id)}
                            disabled={isUploading}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95 ${
                                ['d_charter', 'd_branding'].includes(deliverable.id) 
                                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isUploading ? <Loader2 className="animate-spin" size={16}/> : 
                             deliverable.id === 'd_charter' ? <FileText size={16}/> : 
                             deliverable.id === 'd_branding' ? <PenTool size={16}/> :
                             <Upload size={16}/>}
                            
                            {getButtonLabel()}
                        </button>
                    ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                            {deliverable.status === 'submitted' ? 'En attente de validation...' : 'Validé par l\'enseignant'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
