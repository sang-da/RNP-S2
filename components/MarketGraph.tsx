import React, { useMemo, useState } from 'react';
import { Agency } from '../types';
import { TrendingUp, Eye, AlertCircle, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MASCOTS } from '../constants';

interface MarketGraphProps {
    agencies: Agency[];
    highlightAgencyId?: string;
    onToggleBlackOps?: () => void;
    showBlackOpsButton?: boolean;
    title?: string;
    height?: string;
    isLanding?: boolean;
}

export const MarketGraph: React.FC<MarketGraphProps> = ({ 
    agencies, 
    highlightAgencyId, 
    onToggleBlackOps, 
    showBlackOpsButton = false, 
    title = "Marché (VE)",
    height = "350px",
    isLanding = false
}) => {
    const [isMascotHovered, setIsMascotHovered] = useState(false);
    
    // --- DATA PREPARATION ---
    const validAgencies = useMemo(() => {
        if (!agencies || !Array.isArray(agencies)) return [];
        return agencies.filter(a => a.id !== 'unassigned');
    }, [agencies]);

    const comparisonData = useMemo(() => {
      if (validAgencies.length === 0) return [];

      // 1. Récupération de toutes les dates uniques présentes dans les logs
      let allDates = Array.from(new Set(
          validAgencies.flatMap(a => a.eventLog.map(e => e.date))
      )).sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());

      // Sécurité : Si aucune date (début de semestre), on met la date du jour
      if (allDates.length === 0) {
          allDates = [new Date().toISOString().split('T')[0]];
      }

      const STARTING_VE = 0;

      // 2. Construction des points temporels
      const points = allDates.map((dateStr: string) => {
          const point: any = { 
              name: new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
              date: dateStr
          };

          // Pour chaque agence, on calcule sa VE cumulée à cette date
          validAgencies.forEach(a => {
              const veAtDate = a.eventLog
                  .filter(e => e.date <= dateStr)
                  .reduce((sum, e) => sum + (e.deltaVE || 0), STARTING_VE); 
              
              point[a.name] = Math.max(0, veAtDate);
          });

          return point;
      });

      // 3. Ajout d'un point de départ (J-1 ou S0) pour avoir une ligne qui part de 0
      const startPoint: any = { name: 'Départ' };
      validAgencies.forEach(a => startPoint[a.name] = STARTING_VE);

      return [startPoint, ...points];
    }, [validAgencies]);

    const getMascot = () => {
        if (isLanding) return MASCOTS.MARKET_RICH; // Mascotte riche/caméra pour la landing
        if (highlightAgencyId) {
            const agency = validAgencies.find(a => a.id === highlightAgencyId);
            if (agency) {
                if (agency.ve_current >= 60) return MASCOTS.MARKET_RICH;
                if (agency.ve_current <= 30) return MASCOTS.MARKET_POOR;
            }
        }
        return MASCOTS.MARKET_STABLE;
    };

    const mascotMessage = isLanding 
        ? "Regardez-les grimper ! Qui dominera le S2 ?" 
        : highlightAgencyId ? "Votre performance influence ma richesse..." : "Le marché est volatile !";

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-200 text-xs z-50">
              <p className="font-black text-slate-400 mb-2 uppercase tracking-widest">{label}</p>
              <div className="space-y-1">
                {payload.map((p: any) => {
                  const isHighlighted = highlightAgencyId ? (validAgencies.find(a => a.name === p.name)?.id === highlightAgencyId) : true;
                  return (
                    <div key={p.name} className={`flex items-center justify-between gap-4 ${isHighlighted ? 'opacity-100' : 'opacity-50'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.stroke}}></div>
                        <span className={`font-bold ${isHighlighted ? 'text-slate-900' : 'text-slate-500'}`}>{p.name}</span>
                      </div>
                      <span className="font-mono font-black" style={{ color: p.stroke }}>{p.value}</span>
                    </div>
                  );
                })}
              </div>
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
        <div className={`bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-visible flex flex-col h-full animate-in fade-in zoom-in duration-500 ${isLanding ? 'p-6 md:p-10' : 'p-4 md:p-6'}`}>
            
            {/* Mascot Decoration - Interactive */}
            <div 
                className={`absolute z-30 transition-all duration-500 cursor-pointer group ${isLanding ? '-right-8 -bottom-10 w-40 md:w-52 md:-right-12 md:-bottom-12' : '-right-4 -bottom-6 w-24 md:w-32 opacity-90'}`}
                onMouseEnter={() => setIsMascotHovered(true)}
                onMouseLeave={() => setIsMascotHovered(false)}
            >
                {/* Speech Bubble */}
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
                <h3 className={`font-bold text-slate-900 flex items-center gap-2 ${isLanding ? 'text-2xl font-display' : 'text-base md:text-lg'}`}>
                    <TrendingUp className="text-yellow-500" size={isLanding ? 28 : 20} /> {title}
                </h3>
                
                <div className="flex gap-2">
                    {showBlackOpsButton && onToggleBlackOps && (
                        <button 
                            onClick={onToggleBlackOps}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20"
                        >
                            <Eye size={14}/> Intel
                        </button>
                    )}
                </div>
            </div>
            
            {/* Chart Container */}
            <div className="w-full z-20 pr-2" style={{ height }}>
                {validAgencies.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                wrapperStyle={{ paddingTop: '20px', fontSize: '10px', paddingLeft: '10px' }} 
                            />
                            {validAgencies.map((a, index) => {
                                const isMe = a.id === highlightAgencyId;
                                return (
                                    <Line 
                                        key={a.id}
                                        type="monotone" 
                                        dataKey={a.name} 
                                        stroke={isMe ? '#facc15' : getColor(index)} 
                                        strokeWidth={isMe ? 4 : isLanding ? 3 : 2}
                                        strokeOpacity={isMe ? 1 : highlightAgencyId ? 0.2 : 0.6} 
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                        isAnimationActive={true} 
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
    );
};