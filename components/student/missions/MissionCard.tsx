
import React from 'react';
import { Deliverable } from '../../../types';
import { CheckCircle2, Loader2, FileText, Upload, PenTool, Clock, MessageSquare, AlertOctagon } from 'lucide-react';

interface MissionCardProps {
    deliverable: Deliverable;
    isUploading: boolean;
    onAction: (id: string) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({ deliverable, isUploading, onAction }) => {
    
    const getIcon = () => {
        if (deliverable.status === 'validated') return <CheckCircle2 size={20}/>;
        if (deliverable.status === 'rejected') return <AlertOctagon size={20}/>;
        if (deliverable.status === 'submitted') return <Loader2 size={20} className="animate-spin"/>;
        if (deliverable.id === 'd_charter') return <FileText size={20}/>;
        if (deliverable.id === 'd_branding') return <PenTool size={20}/>;
        return <Upload size={20}/>;
    };

    const getStatusColor = () => {
        if (deliverable.status === 'validated') return 'bg-emerald-100 text-emerald-600';
        if (deliverable.status === 'rejected') return 'bg-red-100 text-red-600';
        if (deliverable.status === 'submitted') return 'bg-indigo-100 text-indigo-600';
        return 'bg-white text-slate-400 border';
    };

    const getButtonLabel = () => {
        if (deliverable.id === 'd_charter') return 'Remplir la Charte';
        if (deliverable.id === 'd_branding') return 'Définir l\'Identité';
        return 'Déposer le fichier';
    };

    const getDeadlineInfo = () => {
        if (!deliverable.deadline || deliverable.status !== 'pending') return null;
        
        const now = new Date();
        const dl = new Date(deliverable.deadline);
        const diff = dl.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return { text: "EN RETARD", color: "text-red-600 bg-red-50 border-red-100" };
        if (days === 0) return { text: "AUJOURD'HUI", color: "text-orange-600 bg-orange-50 border-orange-100 animate-pulse" };
        if (days === 1) return { text: "DEMAIN", color: "text-amber-600 bg-amber-50 border-amber-100" };
        return { text: `J-${days}`, color: "text-slate-500 bg-slate-100 border-slate-200" };
    };

    const dlInfo = getDeadlineInfo();

    return (
        <div className={`rounded-2xl p-5 border transition-all group ${
            deliverable.status === 'validated' ? 'bg-emerald-50/30 border-emerald-100' :
            deliverable.status === 'rejected' ? 'bg-red-50/30 border-red-100' :
            'bg-slate-50 border-slate-200 hover:border-slate-300'
        }`}>
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg text-slate-900 leading-tight">{deliverable.name}</h4>
                            {dlInfo && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${dlInfo.color}`}>
                                    {dlInfo.text}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{deliverable.description}</p>
                        
                        {/* DEADLINE DISPLAY */}
                        {deliverable.deadline && deliverable.status === 'pending' && (
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
                                <Clock size={12}/> Deadline: {new Date(deliverable.deadline).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                             </div>
                        )}

                        {/* FEEDBACK DISPLAY (REQUESTED FEATURE) */}
                        {deliverable.feedback && (deliverable.status === 'validated' || deliverable.status === 'rejected') && (
                            <div className={`mt-3 p-3 rounded-xl text-sm italic flex gap-3 border ${
                                deliverable.status === 'validated' ? 'bg-emerald-100/50 text-emerald-800 border-emerald-200' : 'bg-red-100/50 text-red-800 border-red-200'
                            }`}>
                                <MessageSquare size={16} className="shrink-0 mt-0.5 opacity-70"/>
                                <div>
                                    <span className="block text-[10px] font-bold uppercase opacity-70 mb-1">Retour Client :</span>
                                    "{deliverable.feedback}"
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className={`p-2 rounded-xl shrink-0 ${getStatusColor()}`}>
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
                        <span className={`text-xs font-bold uppercase tracking-wider py-2 flex items-center gap-2 ${
                            deliverable.status === 'validated' ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                            {deliverable.status === 'submitted' ? (
                                <><Loader2 size={14} className="animate-spin"/> En attente de validation...</>
                            ) : (
                                <><CheckCircle2 size={14}/> Validé</>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
