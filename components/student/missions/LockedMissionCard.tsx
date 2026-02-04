
import React from 'react';
import { Lock, Calendar, ShieldAlert } from 'lucide-react';
import { WeekModule } from '../../../types';

interface LockedMissionCardProps {
    week: WeekModule;
}

export const LockedMissionCard: React.FC<LockedMissionCardProps> = ({ week }) => {
    // Calcul date de déblocage estimée (basée sur le planning de classe A par défaut ou simulation)
    const unlockDate = week.schedule.classA?.date || "Date à définir";

    return (
        <div className="relative rounded-2xl p-8 border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden group">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #f8fafc 25%, #f8fafc 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px'}}></div>
            
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <Lock size={32} className="text-slate-400"/>
                </div>
                
                <div>
                    <h4 className="text-xl font-display font-bold text-slate-800 uppercase tracking-wider mb-1">
                        CONFIDENTIEL
                    </h4>
                    <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
                        Le brief de cette semaine est actuellement sous scellé.
                        <br/>L'accès sera autorisé par le client prochainement.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm mt-2">
                    <Calendar size={14} className="text-indigo-500"/>
                    <span className="text-xs font-bold text-slate-600">Déblocage estimé : {new Date(unlockDate).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long'})}</span>
                </div>

                {/* TEASING INDICE (Placeholder pour future feature "Leak") */}
                <div className="mt-4 opacity-50 hover:opacity-100 transition-opacity cursor-help" title="Achetez un indice au Marché Noir (Bientôt)">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-3 py-1 rounded-full bg-slate-100">
                        <ShieldAlert size={12}/> Indice crypté disponible
                    </div>
                </div>
            </div>
        </div>
    );
};
