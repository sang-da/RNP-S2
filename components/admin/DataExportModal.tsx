
import React, { useState } from 'react';
import { Agency, WeekModule } from '../../types';
import { Modal } from '../Modal';
import { Download, FileSpreadsheet, Users, Briefcase, History, FileText, Check } from 'lucide-react';

interface DataExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    agencies: Agency[];
}

type ExportType = 'AGENCIES' | 'STUDENTS' | 'DELIVERABLES' | 'HISTORY';
type ClassFilter = 'ALL' | 'A' | 'B';

export const DataExportModal: React.FC<DataExportModalProps> = ({ isOpen, onClose, agencies }) => {
    const [classFilter, setClassFilter] = useState<ClassFilter>('ALL');
    const [exportType, setExportType] = useState<ExportType>('STUDENTS');
    const [isExporting, setIsExporting] = useState(false);

    // Helper pour sécuriser les champs CSV (virgules, guillemets)
    const escapeCsv = (text: any) => {
        if (text === null || text === undefined) return '';
        const stringValue = String(text);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' }); // BOM pour Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = () => {
        setIsExporting(true);
        
        // 1. Filtrage des données
        const targetAgencies = agencies.filter(a => 
            a.id !== 'unassigned' && (classFilter === 'ALL' || a.classId === classFilter)
        );

        let csvContent = "";
        let filename = `RNP_Export_${exportType}_${classFilter}_${new Date().toISOString().split('T')[0]}.csv`;

        // 2. Génération selon le type
        if (exportType === 'STUDENTS') {
            const headers = ['ID', 'Nom', 'Agence', 'Classe', 'Rôle', 'Score', 'Wallet (PiXi)', 'Badges'];
            const rows = targetAgencies.flatMap(a => a.members.map(m => [
                m.id,
                m.name,
                a.name,
                a.classId,
                m.role,
                m.individualScore,
                m.wallet || 0,
                (m.badges || []).map(b => b.label).join(' | ')
            ]));
            csvContent = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
        
        } else if (exportType === 'AGENCIES') {
            const headers = ['ID', 'Nom Agence', 'Classe', 'Membres', 'VE', 'Budget Réel', 'Statut', 'Projet (Problème)', 'Projet (Cible)'];
            const rows = targetAgencies.map(a => [
                a.id,
                a.name,
                a.classId,
                a.members.length,
                a.ve_current,
                a.budget_real,
                a.status,
                a.projectDef.problem,
                a.projectDef.target
            ]);
            csvContent = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');

        } else if (exportType === 'DELIVERABLES') {
            // Export de tous les fichiers/livrables
            const headers = ['Agence', 'Classe', 'Semaine', 'Livrable', 'Statut', 'Note (Qualité)', 'Retard (Jours)', 'Lien Fichier', 'Feedback'];
            const rows: any[] = [];
            
            targetAgencies.forEach(a => {
                Object.values(a.progress).forEach((week: any) => { // Type 'any' cast for flexibility here
                    week.deliverables.forEach((d: any) => {
                        if (d.status !== 'pending') {
                            rows.push([
                                a.name,
                                a.classId,
                                week.id,
                                d.name,
                                d.status,
                                d.grading?.quality || 'N/A',
                                d.grading?.daysLate || 0,
                                d.fileUrl || '',
                                d.feedback || ''
                            ]);
                        }
                    });
                });
            });
            csvContent = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');

        } else if (exportType === 'HISTORY') {
            const headers = ['Date', 'Agence', 'Type', 'Événement', 'Description', 'Impact VE', 'Impact Budget'];
            const rows = targetAgencies.flatMap(a => a.eventLog.map(e => [
                e.date,
                a.name,
                e.type,
                e.label,
                e.description,
                e.deltaVE || 0,
                e.deltaBudgetReal || 0
            ]));
            csvContent = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
        }

        // 3. Déclenchement
        setTimeout(() => {
            downloadCSV(csvContent, filename);
            setIsExporting(false);
            onClose();
        }, 500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exportation des Données">
            <div className="space-y-6">
                
                {/* 1. CLASSE */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Périmètre (Classe)</label>
                    <div className="flex gap-2">
                        {['ALL', 'A', 'B'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setClassFilter(c as any)}
                                className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                                    classFilter === c 
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                    : 'border-slate-100 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                {c === 'ALL' ? 'Toutes' : `Classe ${c}`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. TYPE DE DONNÉES */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Catégorie de Données</label>
                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => setExportType('STUDENTS')} className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${exportType === 'STUDENTS' ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'}`}>
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Users size={18}/></div>
                            <div className="text-left">
                                <span className="block font-bold text-slate-900 text-sm">Étudiants & Notes</span>
                                <span className="block text-[10px] text-slate-500">Scores, Wallets, Rôles...</span>
                            </div>
                            {exportType === 'STUDENTS' && <Check size={18} className="ml-auto text-emerald-600"/>}
                        </button>

                        <button onClick={() => setExportType('AGENCIES')} className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${exportType === 'AGENCIES' ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'}`}>
                            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Briefcase size={18}/></div>
                            <div className="text-left">
                                <span className="block font-bold text-slate-900 text-sm">Agences & Performance</span>
                                <span className="block text-[10px] text-slate-500">VE, Budgets, Projets...</span>
                            </div>
                            {exportType === 'AGENCIES' && <Check size={18} className="ml-auto text-blue-600"/>}
                        </button>

                        <button onClick={() => setExportType('DELIVERABLES')} className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${exportType === 'DELIVERABLES' ? 'bg-white border-amber-500 shadow-md ring-1 ring-amber-500' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'}`}>
                            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><FileText size={18}/></div>
                            <div className="text-left">
                                <span className="block font-bold text-slate-900 text-sm">Livrables & Fichiers</span>
                                <span className="block text-[10px] text-slate-500">Liens fichiers, Retards, Feedbacks...</span>
                            </div>
                            {exportType === 'DELIVERABLES' && <Check size={18} className="ml-auto text-amber-600"/>}
                        </button>

                        <button onClick={() => setExportType('HISTORY')} className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${exportType === 'HISTORY' ? 'bg-white border-purple-500 shadow-md ring-1 ring-purple-500' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'}`}>
                            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><History size={18}/></div>
                            <div className="text-left">
                                <span className="block font-bold text-slate-900 text-sm">Historique & Logs</span>
                                <span className="block text-[10px] text-slate-500">Journal complet des événements...</span>
                            </div>
                            {exportType === 'HISTORY' && <Check size={18} className="ml-auto text-purple-600"/>}
                        </button>
                    </div>
                </div>

                <div className="bg-slate-100 p-3 rounded-lg flex items-center gap-2 text-xs text-slate-500">
                    <FileSpreadsheet size={16}/>
                    Format : CSV (Compatible Excel, Google Sheets, Numbers)
                </div>

                <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-4 bg-slate-900 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                    {isExporting ? 'Génération...' : 'Télécharger le rapport'}
                    {!isExporting && <Download size={20}/>}
                </button>
            </div>
        </Modal>
    );
};
