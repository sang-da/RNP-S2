
import React, { useState, useMemo } from 'react';
import { Agency, Student } from '../../../types';
import { Building2, User, Search, ChevronRight, LayoutGrid } from 'lucide-react';
import { StudentFinancialProfile } from './StudentFinancialProfile';

interface BankMicroViewProps {
    agencies: Agency[];
}

export const BankMicroView: React.FC<BankMicroViewProps> = ({ agencies }) => {
    const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

    const filteredAgencies = useMemo(() => {
        return activeAgencies.filter(a => 
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            a.members.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [activeAgencies, searchTerm]);

    const selectedAgency = agencies.find(a => a.id === selectedAgencyId);
    const selectedStudent = selectedAgency?.members.find(m => m.id === selectedStudentId);

    // Auto-select first agency/student on search
    const handleAgencyClick = (id: string) => {
        setSelectedAgencyId(id);
        setSelectedStudentId(null);
    };

    const handleStudentClick = (sId: string, aId: string) => {
        setSelectedAgencyId(aId);
        setSelectedStudentId(sId);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            
            {/* SIDEBAR: NAVIGATOR */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Filtrer Agence / Étudiant..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {filteredAgencies.map(agency => {
                        const isExpanded = selectedAgencyId === agency.id;
                        return (
                            <div key={agency.id} className="rounded-xl overflow-hidden border border-slate-100 transition-all">
                                <button 
                                    onClick={() => handleAgencyClick(agency.id)}
                                    className={`w-full flex items-center justify-between p-3 text-left transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-white/20' : 'bg-white border border-slate-200'}`}>
                                            <Building2 size={14}/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs">{agency.name}</p>
                                            <p className={`text-[10px] ${isExpanded ? 'text-slate-400' : 'text-slate-500'}`}>
                                                VE: {agency.ve_current} | Cash: {agency.budget_real}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}/>
                                </button>

                                {isExpanded && (
                                    <div className="bg-slate-50 p-2 space-y-1 border-t border-slate-100">
                                        {agency.members.map(member => (
                                            <button 
                                                key={member.id}
                                                onClick={() => handleStudentClick(member.id, agency.id)}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                                                    selectedStudentId === member.id 
                                                    ? 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-200' 
                                                    : 'hover:bg-white text-slate-600 hover:shadow-sm'
                                                }`}
                                            >
                                                <img src={member.avatarUrl} className="w-6 h-6 rounded-full bg-white"/>
                                                <div className="text-left flex-1 min-w-0">
                                                    <p className="text-xs truncate">{member.name}</p>
                                                </div>
                                                <div className="text-[10px] font-mono opacity-70">{member.wallet} px</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MAIN PANEL: INSPECTOR */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {selectedStudent && selectedAgency ? (
                    <StudentFinancialProfile student={selectedStudent} agency={selectedAgency} />
                ) : selectedAgency ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 p-8 text-center animate-in fade-in">
                        <Building2 size={64} className="opacity-20"/>
                        <div>
                            <h3 className="text-xl font-bold text-slate-700">{selectedAgency.name}</h3>
                            <p className="text-sm">Sélectionnez un membre dans la liste de gauche pour voir son audit financier détaillé.</p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 p-8 text-center animate-in fade-in">
                        <LayoutGrid size={64} className="opacity-20"/>
                        <div>
                            <h3 className="text-xl font-bold text-slate-700">Inspecteur Micro</h3>
                            <p className="text-sm">Sélectionnez une agence ou un étudiant pour commencer l'audit.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
