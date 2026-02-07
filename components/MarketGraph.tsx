import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Agency } from '../types';
import { useMarketData } from '../hooks/useMarketData';
import { ScanEye } from 'lucide-react';

interface MarketGraphProps {
    agencies: Agency[];
    highlightAgencyId?: string;
    showBlackOpsButton?: boolean; // Deprecated but kept for type safety if needed
    onIntelClick?: () => void;
    title?: string;
    height?: string;
    isLanding?: boolean;
}

export const MarketGraph: React.FC<MarketGraphProps> = ({ 
    agencies, 
    highlightAgencyId, 
    onIntelClick, 
    title = "Évolution du Marché (VE)", 
    height = "350px",
    isLanding = false 
}) => {
    const { validAgencies, chartData } = useMarketData(agencies);

    // Landing Page specific styles
    if (isLanding) {
        return (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl relative overflow-hidden h-full flex flex-col">
                <h3 className="font-bold text-slate-900 mb-4">{title}</h3>
                <div style={{ width: '100%', height: height }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVe" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="name" tick={{fontSize: 10}} interval="preserveStartEnd" stroke="#94a3b8" tickLine={false} axisLine={false}/>
                            <YAxis tick={{fontSize: 10}} stroke="#94a3b8" tickLine={false} axisLine={false}/>
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                                itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                            />
                            {validAgencies.map((agency, index) => (
                                <Area 
                                    key={agency.id}
                                    type="monotone" 
                                    dataKey={agency.name} 
                                    stroke={["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"][index % 6]} 
                                    fillOpacity={1} 
                                    fill="url(#colorVe)" 
                                    strokeWidth={2}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {title}
                </h3>
                {onIntelClick && (
                    <button 
                        onClick={onIntelClick}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 uppercase bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all"
                        title="Acheter Renseignements (300 PiXi)"
                    >
                        <ScanEye size={12}/> Intel
                    </button>
                )}
            </div>

            <div style={{ width: '100%', height: height }}>
                <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorVe" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" tick={{fontSize: 10}} interval="preserveStartEnd" stroke="#94a3b8" tickLine={false} axisLine={false}/>
                        <YAxis tick={{fontSize: 10}} stroke="#94a3b8" tickLine={false} axisLine={false}/>
                        <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                            itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                        />
                        {validAgencies.map((agency, index) => (
                            <Area 
                                key={agency.id}
                                type="monotone" 
                                dataKey={agency.name} 
                                stroke={agency.id === highlightAgencyId ? "#6366f1" : ["#cbd5e1", "#94a3b8"][index % 2]} 
                                strokeWidth={agency.id === highlightAgencyId ? 3 : 1}
                                strokeOpacity={agency.id === highlightAgencyId ? 1 : 0.5}
                                fill="none"
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};