
import { useMemo } from 'react';
import { Agency } from '../types';

export const useMarketData = (agencies: Agency[], highlightAgencyId?: string | null) => {
    
    const validAgencies = useMemo(() => {
        if (!agencies || !Array.isArray(agencies)) return [];
        return agencies.filter(a => a.id !== 'unassigned');
    }, [agencies]);

    const chartData = useMemo(() => {
        if (validAgencies.length === 0) return [];

        let allDates = Array.from(new Set(
            validAgencies.flatMap(a => a.eventLog.map(e => e.date))
        )).sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());

        // FIX: Si aucune donnée, on met la date d'aujourd'hui pour ne pas casser le graphe
        if (allDates.length === 0) {
            allDates = [new Date().toISOString().split('T')[0]];
        }

        const STARTING_VE = 0;

        const points = allDates.map((dateStr: string) => {
            const point: any = { 
                name: new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                date: dateStr
            };

            validAgencies.forEach(a => {
                const veAtDate = a.eventLog
                    .filter(e => e.date <= dateStr)
                    .reduce((sum, e) => sum + (e.deltaVE || 0), STARTING_VE); 
                
                point[a.name] = Math.max(0, veAtDate);
            });

            return point;
        });

        // Ajout point de départ pour esthétique
        const startPoint: any = { name: 'Départ' };
        validAgencies.forEach(a => startPoint[a.name] = STARTING_VE);

        return [startPoint, ...points];
    }, [validAgencies]);

    return { validAgencies, chartData };
};
