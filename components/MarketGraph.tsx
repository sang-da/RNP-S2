
import React, { useState, useEffect, useMemo } from 'react';
import { Agency } from '../types';
import { TrendingUp, MessageCircle, AlertCircle, X, Search, ShieldCheck, ShieldAlert, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MASCOTS } from '../constants';
import { useMarketData } from '../hooks/useMarketData';

interface MarketGraphProps {
    agencies: Agency[];
    highlightAgencyId?: string; // Prop optionnelle pour forcer le focus (ex: mon agence)
    onToggleBlackOps?: () => void;
    showBlackOpsButton?: boolean;
    title?: string;
    height?: string;
    isLanding?: boolean;
}

export const MarketGraph: React.FC<MarketGraphProps> = ({ 
    agencies, 
    highlightAgencyId, 
    title = "Marché (VE)",
    height = "350px",
    isLanding = false
}) => {
    const [isMascotHovered, setIsMascotHovered] = useState(false);
    const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
    
    // Utilisation du Hook Dédié
    const { validAgencies, chartData } = useMarketData(agencies, highlightAgencyId);

    // Initialisation : On sélectionne par défaut l'agence de l'utilisateur
    useEffect(() => {
        if (highlightAgencyId) setLocalSelectedId(highlightAgencyId);
    }, [highlightAgencyId]);

    const focusedAgency = useMemo(() => 
        validAgencies.find(a => a.id === localSelectedId)
    , [validAgencies, localSelectedId]);

    // Détection du contexte (Mon agence vs Concurrent)
    const isCompetitor = highlightAgencyId && localSelectedId && localSelectedId !== highlightAgencyId;
    const isMyAgency = highlightAgencyId && localSelectedId === highlightAgencyId;

    const getMascot = () => {
        if (isLanding) return MASCOTS.MARKET_RICH;
        if (focusedAgency) {
            if (focusedAgency.ve_current >= 60) return MASCOTS.MARKET_RICH;
            if (focusedAgency.ve_current <= 30) return MASCOTS.MARKET_POOR;
        }
        return MASCOTS.MARKET_STABLE;
    };

    const getMascotMessage = () => {
        if (isLanding) return "Cliquez sur une courbe pour analyser les stats !";
        if (isMyAgency) return "C'est nous ! Gardons le cap.";
        if (isCompetitor) return `Espionnage de ${focusedAgency?.name}... Intéressant.`;
        if (focusedAgency) return `Analyse : ${focusedAgency.name}`;
        return "Cliquez sur une ligne pour voir les détails.";
    };

    const mascotMessage = getMascotMessage();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-white/10 text-xs z-50">
              <p className="font-black text-indigo-300 mb-2 uppercase tracking-widest">{label}</p>
              <div className="space-y-1">
                {payload.map((p: any) => {
                  const isThisOne = validAgencies.find(a => a.name === p.name)?.id === localSelectedId;
                  return (
                    <div key={p.name} className={`flex items-center justify-between gap-4 ${isThisOne ? 'opacity-100 scale-105' : 'opacity-50'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.stroke}}></div>
                        <span className={`font-bold ${isThisOne ? 'text-white' : 'text-slate-400'}`}>{p.name}</span>
                      </div>
                      <span className="font-mono font-black" style={{ color: p.stroke }}>{p.value} VE</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-500 mt-2 italic text-center">Cliquez sur une ligne pour sélectionner</p>
            </div>
          );
        }
        return null;
    };

    const getColor = (index: number) => {
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        return colors[index % colors.length];
    };

    return (
        <div className="space-y-4 h-full">
            <div className={`bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-visible flex flex-col h-full animate-in fade-in zoom-in duration-500 ${isLanding ? 'p-6 md:p-10' : 'p-4 md:p-6'}`}>
                
                {/* Mascot Decoration */}
                <div 
                    className={`absolute z-30 transition-all duration-500 cursor-pointer group ${isLanding ? '-right-8 -bottom-10 w-40 md:w-52 md:-right-12 md:-bottom-12' : '-right-4 -bottom-6 w-24 md:w-32 opacity-90'}`}
                    onMouseEnter={() => setIsMascotHovered(true)}
                    onMouseLeave={() => setIsMascotHovered(false)}
                >
                    <div className={`absolute bottom-full right-0 mb-2 bg-slate-900 text-white text-xs font-bold p-3 rounded-t-xl rounded-bl-xl shadow-lg w-40 transform transition-all duration-300 origin-bottom-right ${isMascotHovered ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                        <MessageCircle size={12} className="inline mr-1 text-yellow-400"/>
                        {mascotMessage}
                    </div>
                    
                    <img 
                        src={getMascot()} 
                        alt="Mascot" 
                        className={`drop-shadow-2xl transition-transform duration-300 ${isMascotHovered ? 'scale-110 rotate-3' : 'scale-100'}`}
                    />
                </div>

                {/* Header */}
                <div className="flex justify-between items-center mb-6 shrink-0 z-20">
                    <div>
                        <h3 className={`font-bold text-slate-900 flex items-center gap-2 ${isLanding ? 'text-2xl font-display' : 'text-base md:text-lg'}`}>
                            <TrendingUp className="text-yellow-500" size={isLanding ? 28 : 20} /> {title}
                        </h3>
                        {!isLanding && <p className="text-[10px] text-slate-400 font-medium ml-1">👆 Cliquez sur les courbes pour comparer</p>}
                    </div>
                    
                    <div className="flex gap-2">
                        {localSelectedId && (
                            <button 
                                onClick={() => setLocalSelectedId(highlightAgencyId || null)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 uppercase bg-slate-100 px-2 py-1 rounded-lg"
                            >
                                <X size={12}/> Reset
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Chart Container */}
                <div className="w-full z-20 pr-2 flex-1" style={{ minHeight: height }}>
                    {validAgencies.length > 0 && chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                                data={chartData} 
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={10} 
                                />
                                <YAxis 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    domain={[0, 'auto']} 
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    iconType="circle" 
                                    wrapperStyle={{ paddingTop: '20px', fontSize: '10px', paddingLeft: '10px', cursor: 'pointer' }} 
                                    onClick={(data) => {
                                        const agency = validAgencies.find(a => a.name === data.value);
                                        if (agency) setLocalSelectedId(agency.id);
                                    }}
                                />
                                {validAgencies.map((a, index) => {
                                    const isFocused = a.id === localSelectedId;
                                    const color = getColor(index);
                                    return (
                                        <Line 
                                            key={a.id}
                                            type="monotone" 
                                            dataKey={a.name} 
                                            stroke={isFocused ? '#6366f1' : color} 
                                            strokeWidth={isFocused ? 4 : (isLanding ? 3 : 2)}
                                            strokeOpacity={localSelectedId ? (isFocused ? 1 : 0.15) : 0.6} 
                                            dot={isFocused}
                                            activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer' }}
                                            isAnimationActive={true}
                                            connectNulls={true}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setLocalSelectedId(a.id)}
                                        />
                                    )
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <AlertCircle size={32} className="mb-2 opacity-50"/>
                            <p className="text-sm font-bold">Données de marché indisponibles</p>
                        </div>
                    )}
                </div>
            </div>

            {/* INFO PANEL: MEMBERS OF SELECTED AGENCY */}
            {focusedAgency && !isLanding && (
                <div className={`rounded-3xl border p-5 shadow-lg animate-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row items-center gap-6 ${isCompetitor ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-4 shrink-0">
                         <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 p-1 flex items-center justify-center overflow-hidden shadow-sm">
                             {focusedAgency.logoUrl ? (
                                 <img src={focusedAgency.logoUrl} className="w-full h-full object-contain" />
                             ) : (
                                 <Users size={32} className="text-slate-300"/>
                             )}
                         </div>
                         <div>
                             <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-xl font-display font-bold text-slate-900">{focusedAgency.name}</h4>
                                {isCompetitor && <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">Concurrent</span>}
                                {isMyAgency && <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">Mon Studio</span>}
                             </div>
                             
                             <div className="flex items-center gap-2">
                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                     focusedAgency.status === 'stable' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                 }`}>
                                     {focusedAgency.status}
                                 </span>
                                 <span className="text-xs font-black text-indigo-600">{focusedAgency.ve_current} VE</span>
                             </div>
                         </div>
                    </div>

                    <div className="h-px w-full md:h-12 md:w-px bg-slate-200/50"></div>

                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            {isCompetitor ? <Search size={12}/> : <ShieldCheck size={12}/>} 
                            {isCompetitor ? 'Composition de l\'équipe adverse' : 'Effectif de mon agence'}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {focusedAgency.members.map(m => (
                                <div key={m.id} className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
                                    <img src={m.avatarUrl} className="w-6 h-6 rounded-full border border-slate-100 shadow-sm" alt={m.name} />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 leading-tight">{m.name}</span>
                                        <span className="text-[9px] text-slate-400 font-medium">{m.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {isCompetitor && (
                        <div className="hidden md:flex flex-col items-end gap-1 opacity-50">
                            <ShieldAlert size={24} className="text-amber-400"/>
                            <span className="text-[9px] uppercase font-bold text-amber-600">Cible Potentielle</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
