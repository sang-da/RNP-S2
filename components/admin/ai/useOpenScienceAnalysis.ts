import { useState } from 'react';
import { Agency } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { useUI } from '../../../contexts/UIContext';
import { generateOpenSciencePrompt } from '../../../prompts/openSciencePrompt';

export const useOpenScienceAnalysis = (agencies: Agency[], setChatHistory: React.Dispatch<React.SetStateAction<any[]>>) => {
    const { toast } = useUI();
    const [loading, setLoading] = useState(false);

    const generateMemo = async () => {
        setLoading(true);
        try {
            const activeAgencies = agencies.filter(a => a.id !== 'unassigned');
            let totalStudents = 0;
            let totalDismissals = 0;
            let totalCrises = 0;
            let totalFinancialCharges = 0;
            let successfulAgencies = 0;
            let failedAgencies = 0;
            let minDate = new Date();
            let maxDate = new Date(0);

            activeAgencies.forEach(a => {
                totalStudents += a.members.length;
                a.members.forEach(m => {
                    totalDismissals += (m.history || []).filter(h => h.action === 'FIRED').length;
                });
                a.eventLog.forEach(e => {
                    if (e.type === 'CRISIS' || (e.deltaVE && e.deltaVE < 0)) totalCrises++;
                    if (e.deltaBudgetReal && e.deltaBudgetReal < 0) totalFinancialCharges += Math.abs(e.deltaBudgetReal);
                    const eDate = new Date(e.date);
                    if (eDate < minDate) minDate = eDate;
                    if (eDate > maxDate) maxDate = eDate;
                });
                
                if (a.ve_current >= 60 && !a.isBankrupt) successfulAgencies++;
                else if (a.ve_current < 40 || a.isBankrupt) failedAgencies++;
            });

            const statsPrompt = generateOpenSciencePrompt(
                minDate.toISOString().split('T')[0],
                maxDate.toISOString().split('T')[0],
                totalStudents,
                totalCrises,
                totalDismissals,
                totalFinancialCharges,
                successfulAgencies,
                failedAgencies,
                activeAgencies.length
            );

            // Pass the entire anonymized data to the AI to give it deep context
            const anonymizedAgencies = activeAgencies.map(a => ({
                id: a.id,
                name: a.name,
                ve_current: a.ve_current,
                budget_real: a.budget_real,
                isBankrupt: a.isBankrupt,
                members: a.members.map(m => ({
                    id: m.id.substring(0,6),
                    role: m.role,
                    history: m.history,
                })),
                eventLog: a.eventLog.map(e => ({
                    date: e.date,
                    type: e.type,
                    label: e.label,
                    deltaVE: e.deltaVE,
                    deltaBudgetReal: e.deltaBudgetReal
                }))
            }));
            
            // Note: we use "llama-3.3-70b-versatile" by passing it in the askGroq if needed, but askGroq defaults to what is in groqConfig (which we should keep or we can update the backend to allow passing model). Let's let the backend handle fallback.
            const answer = await askGroq(statsPrompt, anonymizedAgencies, "Tu es un chercheur en pédagogie rédigeant une note de synthèse Open Science.");
            
            setChatHistory(prev => [...prev, { role: 'ai', content: answer + "\n\n*Memo généré avec succès. Vous pouvez maintenant l'exporter.*" }]);

            const fullExport = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    type: "OPEN_SCIENCE_DATASET_AND_MEMO",
                    stats: {
                        duration: { start: minDate.toISOString(), end: maxDate.toISOString() },
                        students: totalStudents,
                        dismissals: totalDismissals,
                        crises: totalCrises,
                        totalFinancialCharges: totalFinancialCharges,
                        successCount: successfulAgencies,
                        failCount: failedAgencies
                    }
                },
                memo: answer,
                raw_agencies: anonymizedAgencies
            };

            const jsonBlob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json;charset=utf-8;' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.setAttribute('download', `RNP_OpenScience_Export_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);

            const mdBlob = new Blob([answer], { type: 'text/markdown;charset=utf-8;' });
            const mdUrl = URL.createObjectURL(mdBlob);
            const mdLink = document.createElement('a');
            mdLink.href = mdUrl;
            mdLink.setAttribute('download', `RNP_OpenScience_Memo_${new Date().toISOString().split('T')[0]}.md`);
            document.body.appendChild(mdLink);
            mdLink.click();
            document.body.removeChild(mdLink);

            toast('success', "Memo Open Science généré et données (JSON + MD) exportées.");

        } catch (error) {
            toast('error', "Erreur lors de la génération du Memo Open Science.");
        } finally {
            setLoading(false);
        }
    };

    return { generateMemo, loading };
};
