
import React, { useMemo } from 'react';
import { Agency } from '../../types';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MASCOTS } from '../../constants';

interface MarketOverviewProps {
  agency: Agency;
  allAgencies: Agency[];
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ agency, allAgencies }) => {
  
  // Génération dynamique des données basée sur l'historique réel (EventLog)
  const comparisonData = useMemo(() => {
    // 1. Récupérer toutes les dates uniques où il s'est passé quelque chose dans TOUTES les agences
    const allDates = Array.from(new Set(
        allAgencies.flatMap(a => a.eventLog.map(e => e.date))
    )).sort();

    const STARTING_VE = 0; // FIXED: Base VE at 0

    // 2. Point de départ (Semaine 0 / Création)
    const initialPoint = {
        name: 'Départ',
        date: '2024-01-01', // Date arbitraire de début
        [agency.name]: STARTING_VE, 
        ...allAgencies.reduce((acc, a) => ({ ...acc, [a.name]: STARTING_VE }), {})
    };

    // 3. Construire les points pour chaque date d'événement
    const historyPoints = allDates.map((date: unknown) => {
        const dateStr = date as string;
        const point: any = { 
            name: new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), // Format DD/MM
            date: dateStr
        };

        // Pour chaque agence, on calcule sa VE cumulée jusqu'à cette date incluse
        allAgencies.forEach(a => {
            // Somme des deltaVE de tous les événements antérieurs ou égaux à la date + BASE
            const veAtDate = a.eventLog
                .filter(e => e.date <= dateStr)
                .reduce((sum, e) => sum + (e.deltaVE || 0), STARTING_VE); 
            
            // On s'assure que ça ne descend pas sous 0
            point[a.name] = Math.max(0, veAtDate);
        });

        return point;
    });

    // S'il n'y a pas encore d'événements, on affiche au moins le départ
    if (historyPoints.length === 0) return [initialPoint];

    return [initialPoint, ...historyPoints];
  }, [allAgencies, agency.name]);

  // Leaderboard logic
  const leaderboard = [...allAgencies].sort((a, b) => b.ve_current - a.ve_current);

  // Mascotte Logic based on VE
  const getMascot = () => {
      if (agency.ve_current >= 60) return MASCOTS.MARKET_RICH;
      if (agency.ve_current <= 30) return MASCOTS.MARKET_POOR;
      return MASCOTS.MARKET_STABLE;
  };

  return (
    <div className="animate-in fade-in zoom-in duration-500 h-full w-full">
        {/* The Graph Card */}
        <div className="bg-white rounded-[24px] md:rounded-[32px] p-4 md:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden flex flex-col">
            
            {/* MASCOTTE DECORATION */}
            <div className="absolute -right-4 -bottom-6 md:-right-6 md:-bottom-8 w-32 md:w-48 z-10 pointer-events-none opacity-90 transition-all duration-500">
                <img src={getMascot()} alt="Agency Status Mascot" className="drop-shadow-2xl"/>
            </div>

            <div className="flex justify-between items-center mb-4 md:mb-6 shrink-0 z-20">
                <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="text-yellow-500" size={20} /> <span className="hidden xs:inline">Market Overview</span><span className="xs:hidden">Marché</span>
                </h3>
                {/* Mini Leaderboard */}
                <div className="hidden md:flex gap-2">
                    {leaderboard.slice(0, 3).map((a, i) => (
                        <div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${a.id === agency.id ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="font-bold text-slate-400">#{i+1}</span>
                            <span className={`font-bold ${a.id === agency.id ? 'text-yellow-600' : 'text-slate-700'}`}>{a.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Responsive Height: Smaller on mobile to fit Landing Page */}
            <div className="h-[260px] xs:h-[300px] md:h-[400px] w-full shrink-0 z-20">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }} />
                        {allAgencies.map((a, index) => (
                            <Line 
                                key={a.id}
                                type="monotone" 
                                dataKey={a.name} 
                                stroke={a.id === agency.id ? '#facc15' : index % 2 === 0 ? '#6366f1' : '#10b981'} 
                                strokeWidth={a.id === agency.id ? 3 : 1.5}
                                strokeOpacity={a.id === agency.id ? 1 : 0.2}
                                dot={a.id === agency.id ? {r: 4, fill: '#facc15', strokeWidth: 2, stroke: '#fff'} : false}
                                activeDot={{ r: 6 }}
                                isAnimationActive={false} // Désactivé pour éviter les glitchs lors des updates rapides
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};
