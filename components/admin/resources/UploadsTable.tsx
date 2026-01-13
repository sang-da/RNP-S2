
import React from 'react';
import { Deliverable } from '../../../types';
import { FileText, Download, CheckCircle2, MessageSquare } from 'lucide-react';

interface UploadItem {
    id: string;
    agencyId: string;
    agencyName: string;
    agencyClass: string;
    weekId: string;
    weekTitle: string;
    deliverable: Deliverable;
    url: string;
    status: string;
    date: string;
}

interface UploadsTableProps {
    files: UploadItem[];
    readOnly?: boolean;
    onGrade: (item: {agencyId: string, weekId: string, deliverable: Deliverable}) => void;
}

export const UploadsTable: React.FC<UploadsTableProps> = ({ files, readOnly, onGrade }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-slate-50 p-6 rounded-full mb-4">
                        <CheckCircle2 size={48} className="text-slate-300"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Inbox Vide</h3>
                    <p className="text-slate-400 text-sm">Tout est à jour ou aucun rendu correspondant.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                            <tr>
                                <th className="p-4">Livrable</th>
                                <th className="p-4">Agence</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {files.map(file => (
                                <tr key={file.id} className="hover:bg-cyan-50/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${file.status === 'submitted' ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-500'}`}>
                                                <FileText size={20}/>
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{file.deliverable.name}</div>
                                                <div className={`text-[10px] font-bold uppercase inline-block px-1.5 rounded mt-1 ${
                                                    file.status === 'validated' ? 'bg-emerald-100 text-emerald-600' : 
                                                    file.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                    'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                    {file.status === 'validated' ? 'Validé (A/B)' : file.status === 'rejected' ? 'Rejeté (C)' : 'En Attente'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-bold text-slate-700 block">{file.agencyName}</span>
                                        <span className={`text-[10px] font-bold px-1.5 rounded text-white ${file.agencyClass === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                                            CLASSE {file.agencyClass}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm text-slate-600 font-medium">
                                            {new Date(file.date).toLocaleDateString()}
                                        </span>
                                        <span className="block text-[10px] text-slate-400">SEM {file.weekId}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <a 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-slate-400 hover:text-slate-800 rounded-lg text-xs font-bold text-slate-500 transition-all"
                                            >
                                                <Download size={14}/> Voir
                                            </a>
                                            {!readOnly && (
                                                <button 
                                                    onClick={() => onGrade({agencyId: file.agencyId, weekId: file.weekId, deliverable: file.deliverable})}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-sm ${
                                                        file.status === 'submitted' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400 hover:bg-slate-500'
                                                    }`}
                                                >
                                                    <MessageSquare size={14}/> {file.status === 'submitted' ? 'Corriger' : 'Modifier Note'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
