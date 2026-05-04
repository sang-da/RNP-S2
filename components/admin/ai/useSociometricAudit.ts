import { useState } from 'react';
import { Agency } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { useUI } from '../../../contexts/UIContext';
import { generateSociometricPrompt } from '../../../prompts/sociometricPrompt';

export const useSociometricAudit = (agencies: Agency[], setChatHistory: React.Dispatch<React.SetStateAction<any[]>>) => {
    const { toast } = useUI();
    const [loading, setLoading] = useState(false);

    const generateAudit = async () => {
        setLoading(true);
        try {
            const activeAgencies = agencies.filter(a => a.id !== 'unassigned');
            let totalStudents = 0;
            let totalP2PTransfers = 0;
            let totalPhantomMarketTxs = 0;
            let totalFired = 0;
            let totalResigned = 0;
            let totalTransfers = 0;
            let totalJuryEvents = 0;
            let minDate = new Date();
            let maxDate = new Date(0);

            activeAgencies.forEach(a => {
                totalStudents += a.members.length;
                a.members.forEach(m => {
                    const history = m.history || [];
                    totalFired += history.filter(h => h.action === 'FIRED').length;
                    totalResigned += history.filter(h => h.action === 'RESIGNED').length;
                    totalTransfers += history.filter(h => h.action === 'TRANSFER').length;
                });
                
                a.eventLog.forEach(e => {
                    // Enhancing the logical detection of P2P and Phantom
                    if (e.description.includes(' -> ') || e.description.includes('<-')) totalP2PTransfers++;
                    if (e.type === 'BLACK_OP' || e.description.includes('Achat de :') || e.description.includes('Enchère') || e.label.includes('Backdoor')) totalPhantomMarketTxs++;
                    if (e.label.includes('Jury') || e.description.includes('administration') || e.description.includes('Jury')) totalJuryEvents++;
                    
                    const eDate = new Date(e.date);
                    if (eDate < minDate) minDate = eDate;
                    if (eDate > maxDate) maxDate = eDate;
                });
            });

            const prompt = generateSociometricPrompt(
                minDate.toISOString().split('T')[0],
                maxDate.toISOString().split('T')[0],
                totalFired,
                totalResigned,
                totalTransfers,
                totalPhantomMarketTxs,
                totalP2PTransfers,
                totalJuryEvents,
                totalStudents
            );

            // Pass anonymized agencies details to the AI for rich context
            const anonymizedAgencies = activeAgencies.map(a => ({
                id: a.id,
                name: a.name,
                ve_current: a.ve_current,
                members: a.members.map(m => ({
                    id: m.id.substring(0,6),
                    role: m.role,
                    history: m.history, // Includes past transfers/fired/resigned records
                })),
                eventLog: a.eventLog.map(e => ({
                    date: e.date,
                    type: e.type,
                    label: e.label,
                    desc: e.description // Contains the raw transaction descriptions (eg P2P, store)
                }))
            }));


            const answer = await askGroq(prompt, anonymizedAgencies, "Tu es un chercheur en sociologie des groupes et pédagogie rédigeant une note de synthèse sociométrique. L'expérience se base sur des agences et une promotion d'étudiants.");
            
            setChatHistory(prev => [...prev, { role: 'ai', content: answer + "\n\n*Audit sociométrique généré avec succès. Exportation en cours...*" }]);

            const exportData = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    type: "SOCIOMETRIC_AUDIT_DATASET_AND_MEMO",
                    stats: {
                        duration: { start: minDate.toISOString(), end: maxDate.toISOString() },
                        p2pTransfers: totalP2PTransfers,
                        phantomTransactions: totalPhantomMarketTxs,
                        fired: totalFired,
                        resigned: totalResigned,
                        transfers: totalTransfers,
                        juryEvents: totalJuryEvents
                    }
                },
                memo: answer,
                raw_agencies: anonymizedAgencies
            };

            const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.setAttribute('download', `RNP_Sociometric_Export_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);

            const mdBlob = new Blob([answer], { type: 'text/markdown;charset=utf-8;' });
            const mdUrl = URL.createObjectURL(mdBlob);
            const mdLink = document.createElement('a');
            mdLink.href = mdUrl;
            mdLink.setAttribute('download', `RNP_Sociometric_Memo_${new Date().toISOString().split('T')[0]}.md`);
            document.body.appendChild(mdLink);
            mdLink.click();
            document.body.removeChild(mdLink);

            toast('success', "Audit sociométrique généré et exporté (JSON + MD).");

        } catch (error) {
            toast('error', "Erreur lors de la génération de l'audit sociométrique.");
        } finally {
            setLoading(false);
        }
    };

    return { generateAudit, loading };
};
