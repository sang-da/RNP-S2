
import React from 'react';
import { Deliverable } from '../../../../types';
import { CheckCircle2, Loader2, FileText, Upload, PenTool, AlertOctagon, Link, Image } from 'lucide-react';

interface MissionHeaderProps {
    deliverable: Deliverable;
}

export const MissionHeader: React.FC<MissionHeaderProps> = ({ deliverable }) => {
    const type = deliverable.type || 'FILE';

    const getIcon = () => {
        if (deliverable.status === 'validated') return <CheckCircle2 size={20}/>;
        if (deliverable.status === 'rejected') return <AlertOctagon size={20}/>;
        if (deliverable.status === 'submitted') return <Loader2 size={20} className="animate-spin"/>;
        
        switch(type) {
            case 'FORM_CHARTER': return <FileText size={20}/>;
            case 'FORM_NAMING': return <PenTool size={20}/>;
            case 'SPECIAL_LOGO':
            case 'SPECIAL_BANNER': return <Image size={20}/>;
            case 'LINK': return <Link size={20}/>;
            default: return <Upload size={20}/>;
        }
    };

    const getStatusColor = () => {
        if (deliverable.status === 'validated') return 'bg-emerald-100 text-emerald-600';
        if (deliverable.status === 'rejected') return 'bg-red-100 text-red-600';
        if (deliverable.status === 'submitted') return 'bg-indigo-100 text-indigo-600';
        return 'bg-white text-slate-400 border';
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
            </div>
            
            <div className={`p-2 rounded-xl shrink-0 ${getStatusColor()}`}>
                {getIcon()}
            </div>
        </div>
    );
};
