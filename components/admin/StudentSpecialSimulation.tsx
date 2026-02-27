
import React, { useState } from 'react';
import { Agency, Student } from '../../types';
import { WalletView } from '../student/WalletView';
import { MissionsView } from '../student/MissionsView';
import { TeamView } from '../student/TeamView';
import { MercatoView } from '../student/MercatoView';
import { WikiView } from '../student/WikiView';
import { FAQView } from '../student/FAQView';
import { Wallet, Target, Users, Briefcase, BookOpen, HelpCircle, X, Layout } from 'lucide-react';

interface StudentSpecialSimulationProps {
    onClose: () => void;
}

type SpecialTab = 'WALLET' | 'MISSIONS' | 'TEAM' | 'MERCATO' | 'WIKI' | 'FAQ';

export const StudentSpecialSimulation: React.FC<StudentSpecialSimulationProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<SpecialTab>('WALLET');
    
    // Mock functions for simulation (no real impact)
    const noop = () => console.log("Simulation: Action blocked in preview mode");

    // MOCK DATA FOR ISOLATION
    const MOCK_AGENCY: Agency = {
        id: 'mock-agency-id',
        name: 'Studio Simulation (Alpha)',
        tagline: 'L\'excellence en mode aperçu',
        classId: 'A',
        ve_current: 75.5,
        budget_real: 15000,
        budget_valued: 12000,
        weeklyTax: 500,
        weeklyRevenueModifier: 1,
        status: 'stable',
        currentCycle: 1 as any,
        members: [
            { id: 'm1', name: 'Alice Simulation', role: 'Directrice Artistique', individualScore: 85, wallet: 4500, savings: 1200, loanDebt: 0, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', badges: [], classId: 'A', connectionStatus: 'online' },
            { id: 'm2', name: 'Bob Prototype', role: 'Lead Developer', individualScore: 78, wallet: 2100, savings: 0, loanDebt: 500, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', badges: [], classId: 'A', connectionStatus: 'online' },
            { id: 'm3', name: 'Charlie Mockup', role: 'UX Designer', individualScore: 62, wallet: 850, savings: 100, loanDebt: 0, avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', badges: [], classId: 'A', connectionStatus: 'offline' },
        ],
        progress: {
            '1': {
                id: '1',
                cycleId: 1,
                title: 'Semaine 1 : Fondations',
                isVisible: true,
                deliverables: [
                    { id: 'd1', name: 'Naming & Logo', description: 'Définir le nom et le logo de l\'agence', status: 'validated', grading: { quality: 'A', finalDelta: 5, daysLate: 0, constraintBroken: false } },
                    { id: 'd2', name: 'Charte Projet', description: 'Cadrer les intentions du projet', status: 'validated', grading: { quality: 'B', finalDelta: 3, daysLate: 0, constraintBroken: false } }
                ],
                type: 'TECHNIQUE',
                objectives: ['Définir l\'identité', 'Cadrer le projet'],
                status: 'completed',
                schedule: {}
            }
        },
        eventLog: [],
        branding: { color: 'indigo' },
        mercatoRequests: [],
        transactionRequests: [],
        constraints: { space: 'Bureau', style: 'Minimaliste', client: 'Fictif' },
        badges: [],
        projectDef: { problem: '', target: '', location: '', gesture: '', isLocked: false }
    };

    const [selectedStudentId, setSelectedStudentId] = useState<string>(MOCK_AGENCY.members[0].id);
    const selectedStudent = MOCK_AGENCY.members.find(m => m.id === selectedStudentId) || MOCK_AGENCY.members[0];
    const ALL_MOCK_AGENCIES = [MOCK_AGENCY];
    const ALL_MOCK_STUDENTS = MOCK_AGENCY.members;

    const tabs = [
        { id: 'WALLET', label: 'Banque & Portefeuille', icon: <Wallet size={20}/>, color: 'text-yellow-500', bg: 'bg-yellow-50' },
        { id: 'MISSIONS', label: 'Missions & Éval', icon: <Target size={20}/>, color: 'text-rose-500', bg: 'bg-rose-50' },
        { id: 'TEAM', label: 'Gestion Équipe', icon: <Users size={20}/>, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { id: 'MERCATO', label: 'Mercato / RH', icon: <Briefcase size={20}/>, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { id: 'WIKI', label: 'Wiki Ressources', icon: <BookOpen size={20}/>, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 'FAQ', label: 'Centre d\'Aide', icon: <HelpCircle size={20}/>, color: 'text-slate-500', bg: 'bg-slate-50' },
    ];

    return (
        <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col overflow-hidden">
            {/* HEADER SIMULATION */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-500 rounded-lg"><Layout size={24}/></div>
                    <div>
                        <h2 className="font-display font-bold text-xl">Simulateur d'Interfaces Spéciales</h2>
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Aperçu Étudiant : {MOCK_AGENCY.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Incarner :</span>
                    <div className="flex gap-1">
                        {MOCK_AGENCY.members.map(member => (
                            <button
                                key={member.id}
                                onClick={() => setSelectedStudentId(member.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    selectedStudentId === member.id
                                    ? 'bg-indigo-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <img src={member.avatarUrl} className="w-5 h-5 rounded-full bg-slate-800" alt="" />
                                {member.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                    <X size={24}/>
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR NAV */}
                <div className="w-72 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 overflow-y-auto">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Espaces Étudiants</p>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SpecialTab)}
                            className={`flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all ${
                                activeTab === tab.id 
                                ? `${tab.bg} ${tab.color} shadow-sm ring-1 ring-inset ring-black/5` 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}

                    <div className="mt-auto p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-xs text-amber-800 font-medium leading-relaxed">
                            <strong>Note :</strong> Vous simulez actuellement l'interface de <strong>{selectedStudent.name}</strong>.
                        </p>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                    <div className="max-w-5xl mx-auto">
                        {activeTab === 'WALLET' && (
                            <WalletView 
                                student={selectedStudent} 
                                agency={MOCK_AGENCY} 
                                allStudents={ALL_MOCK_STUDENTS}
                                onTransfer={noop}
                                onInjectCapital={noop}
                                onRequestScore={noop}
                            />
                        )}
                        {activeTab === 'MISSIONS' && <MissionsView agency={MOCK_AGENCY} onUpdateAgency={noop} />}
                        {activeTab === 'TEAM' && <TeamView agency={MOCK_AGENCY} onUpdateAgency={noop} currentUserOverride={selectedStudent} />}
                        {activeTab === 'MERCATO' && <MercatoView agency={MOCK_AGENCY} allAgencies={ALL_MOCK_AGENCIES} onUpdateAgency={noop} onUpdateAgencies={noop} currentUserOverride={selectedStudent} />}
                        {activeTab === 'WIKI' && <WikiView agency={MOCK_AGENCY} />}
                        {activeTab === 'FAQ' && <FAQView />}
                    </div>
                </div>
            </div>
        </div>
    );
};
