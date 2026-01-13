import React, { useMemo } from 'react';
import { Agency } from '../types';
import { TrendingUp, Eye, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MASCOTS } from '../constants';

interface MarketGraphProps {
    agencies: Agency[];
    highlightAgencyId?: string;
    onToggleBlackOps?: () => void;
    showBlackOpsButton?: boolean;
    title?: string;
    height?: string;
}

export const MarketGraph: React.FC<MarketGraphProps> = ({ 
    agencies, 
    highlightAgencyId, 
    onToggleBlackOps, 
    showBlackOpsButton = false, 
    title = "Marché (VE)",
    height = "350px"
}) => {
    
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
      )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

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
        if (highlightAgencyId) {
            const agency = validAgencies.find(a => a.id === highlightAgencyId);
            if (agency) {
                if (agency.ve_current >= 60) return MASCOTS.MARKET_RICH;
                if (agency.ve_current <= 30) return MASCOTS.MARKET_POOR;
            }
        }
        // Generic mascot if no highlight or neutral
        return MASCOTS.MARKET_STABLE;
    };

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

    return (
        <div className="bg-white rounded-[24px] md:rounded-[32px] p-4 md:p-6 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden flex flex-col h-full animate-in fade-in zoom-in duration-500">
            
            {/* Mascot Decoration */}
            <div className="absolute -right-4 -bottom-6 md:-right-6 md:-bottom-8 w-24 md:w-48 z-10 pointer-events-none opacity-90 transition-all duration-500">
                <img src={getMascot()} alt="Mascot" className="drop-shadow-2xl"/>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-4 shrink-0 z-20">
                <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="text-yellow-500" size={20} /> {title}
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
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                            {validAgencies.map((a, index) => {
                                const isMe = a.id === highlightAgencyId;
                                return (
                                    <Line 
                                        key={a.id}
                                        type="monotone" 
                                        dataKey={a.name} 
                                        stroke={isMe ? '#facc15' : index % 2 === 0 ? '#6366f1' : '#10b981'} 
                                        strokeWidth={isMe ? 4 : 2}
                                        strokeOpacity={isMe ? 1 : highlightAgencyId ? 0.2 : 0.8} 
                                        dot={isMe ? {r: 4, fill: '#facc15', strokeWidth: 2, stroke: '#fff'} : false}
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