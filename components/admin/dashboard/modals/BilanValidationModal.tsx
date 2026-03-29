
import React, { useState, useEffect } from 'react';
import { Modal } from '../../../Modal';
import { BilanSimulation, AgencyPerformancePreview } from '../../../../types';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Info, TrendingDown, TrendingUp, Wallet, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BilanValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    simulation: BilanSimulation | null;
    onConfirm: (adjustments: { [agencyId: string]: number }) => void;
    isProcessing: boolean;
}

export const BilanValidationModal: React.FC<BilanValidationModalProps> = ({ 
    isOpen, 
    onClose, 
    simulation, 
    onConfirm,
    isProcessing
}) => {
    const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
    const [manualAdjustments, setManualAdjustments] = useState<{ [agencyId: string]: number }>({});

    useEffect(() => {
        if (simulation) {
            // Initialize adjustments with the calculated penaltyVE
            const initial: { [agencyId: string]: number } = {};
            simulation.agencies.forEach(a => {
                // We store the penalty part specifically so we can adjust it
                initial[a.id] = -a.penaltyVE;
            });
            setManualAdjustments(initial);
        }
    }, [simulation]);

    if (!simulation) return null;

    const toggleExpand = (id: string) => {
        const next = new Set(expandedAgencies);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedAgencies(next);
    };

    const handleAdjustmentChange = (agencyId: string, value: number) => {
        setManualAdjustments(prev => ({
            ...prev,
            [agencyId]: value
        }));
    };

    const handleConfirm = () => {
        onConfirm(manualAdjustments);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Validation du Bilan VE" width="max-w-4xl">
            <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-lg text-white">
                            <Info size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-indigo-900 text-sm">Simulation de la Semaine {simulation.weekId}</h4>
                            <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-widest">
                                {simulation.agencies.length} Agences analysées
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Agences OK</p>
                            <p className="text-lg font-black text-emerald-600">
                                {simulation.agencies.filter(a => !a.hasMissingReviews).length}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Alertes</p>
                            <p className="text-lg font-black text-rose-600">
                                {simulation.agencies.filter(a => a.hasMissingReviews).length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Agency List */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {simulation.agencies.map(agency => {
                        const isExpanded = expandedAgencies.has(agency.id);
                        const currentAdjustment = manualAdjustments[agency.id] || 0;
                        
                        // Calculate final preview VE based on manual adjustment
                        // Note: finalVE in simulation already includes penaltyVE, budgetAdj, and pendingEffects.
                        // We want to replace penaltyVE with manualAdjustment.
                        const baseVEWithoutPenalty = agency.finalVE + agency.penaltyVE;
                        const previewFinalVE = Math.max(0, baseVEWithoutPenalty + currentAdjustment);
                        const previewDelta = previewFinalVE - agency.currentVE;

                        return (
                            <div 
                                key={agency.id}
                                className={`border rounded-2xl transition-all ${agency.hasMissingReviews ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100 bg-white'}`}
                            >
                                {/* Row Header */}
                                <div 
                                    className="p-4 flex items-center justify-between cursor-pointer"
                                    onClick={() => toggleExpand(agency.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${agency.hasMissingReviews ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500'}`} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-bold text-slate-900">{agency.name}</h5>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">CLASSE {agency.classId}</span>
                                                {agency.type === 'HOLDING' && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded font-bold">HOLDING</span>}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {agency.hasMissingReviews ? `${agency.members.filter(m => m.missingReviews > 0).length} membre(s) en retard` : 'Toutes les reviews complétées'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        {/* VE Preview */}
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Impact VE</p>
                                            <div className="flex items-center gap-2 justify-end">
                                                <span className="text-xs text-slate-400 line-through">{agency.currentVE}</span>
                                                <span className={`font-black ${previewDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {previewFinalVE}
                                                </span>
                                                {previewDelta !== 0 && (
                                                    <span className={`text-[10px] font-bold ${previewDelta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        ({previewDelta > 0 ? '+' : ''}{previewDelta})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Financial Impact Preview */}
                                        <div className="text-right w-32">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Est. PiXi (S+1)</p>
                                            <div className="flex items-center gap-1 justify-end font-bold text-slate-700">
                                                <Wallet size={12} className="text-slate-400" />
                                                <span>{Math.round(agency.predictedRevenue)}</span>
                                                <span className="text-[9px] text-slate-400">px</span>
                                            </div>
                                        </div>

                                        {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-t border-slate-100"
                                        >
                                            <div className="p-4 bg-slate-50/50 space-y-4">
                                                {/* Members List */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Détail des membres (Viviane logic)</h6>
                                                        <div className="space-y-1">
                                                            {agency.members.map(member => (
                                                                <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 text-xs">
                                                                    <span className="font-medium text-slate-700">{member.name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-bold ${member.missingReviews > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                            {member.votesCast} / {member.votesExpected}
                                                                        </span>
                                                                        {member.missingReviews > 0 ? <AlertCircle size={14} className="text-rose-400" /> : <CheckCircle size={14} className="text-emerald-400" />}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Manual Adjustment Control */}
                                                    <div className="space-y-2">
                                                        <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ajustement Manuel de la Sanction</h6>
                                                        <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-slate-500">Malus calculé :</span>
                                                                <span className="text-xs font-bold text-rose-500">-{agency.penaltyVE} VE</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Nouvelle Valeur (VE)</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        type="number" 
                                                                        value={currentAdjustment}
                                                                        onChange={(e) => handleAdjustmentChange(agency.id, parseInt(e.target.value) || 0)}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                        placeholder="0"
                                                                    />
                                                                    <button 
                                                                        onClick={() => handleAdjustmentChange(agency.id, 0)}
                                                                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                                                        title="Reset"
                                                                    >
                                                                        <Zap size={16} />
                                                                    </button>
                                                                </div>
                                                                <p className="text-[9px] text-slate-400 italic">
                                                                    Positif = Bonus, Négatif = Malus. 0 = Pas de sanction.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Holding specific impact */}
                                                {agency.type === 'HOLDING' && (
                                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-3">
                                                        <div className="p-1.5 bg-amber-500 rounded text-white mt-0.5">
                                                            <TrendingUp size={14} />
                                                        </div>
                                                        <div>
                                                            <h6 className="text-[11px] font-bold text-amber-900">Impact Croissance Holding</h6>
                                                            <p className="text-[10px] text-amber-700 leading-relaxed">
                                                                Avec cette VE ({previewFinalVE}), la croissance est de <span className="font-bold">{agency.growth > 0 ? '+' : ''}{agency.growth} VE</span>. 
                                                                Multiplicateur PiXi : <span className="font-bold">x{agency.predictedMultiplier}</span>.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        ANNULER
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                TRAITEMENT...
                            </>
                        ) : (
                            <>
                                APPLIQUER LE BILAN
                                <CheckCircle size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
