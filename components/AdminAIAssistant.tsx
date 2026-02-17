
import React, { useState } from 'react';
import { Agency } from '../types';
import { MessageSquare, Zap, Fingerprint, Sparkles, Bot } from 'lucide-react';
import { OracleChat } from './admin/ai/OracleChat';
import { CrisisGenerator } from './admin/ai/CrisisGenerator';
import { CreativeDirector } from './admin/ai/CreativeDirector';
import { Profiler } from './admin/ai/Profiler';

interface AdminAIAssistantProps {
    agencies: Agency[];
}

type Mode = 'ORACLE' | 'GENERATOR_CRISIS' | 'GENERATOR_CREA' | 'PROFILER';

export const AdminAIAssistant: React.FC<AdminAIAssistantProps> = ({ agencies }) => {
    const [mode, setMode] = useState<Mode>('ORACLE');

    return (
        <div className="animate-in fade-in duration-500 pb-20 h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-200"><Bot size={32}/></div>
                        Co-Pilote IA (v2.0)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Assistant intelligent connecté aux données du RNP.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => setMode('ORACLE')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'ORACLE' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <MessageSquare size={16}/> Oracle
                    </button>
                    <button onClick={() => setMode('GENERATOR_CRISIS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'GENERATOR_CRISIS' ? 'bg-red-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Zap size={16}/> Crises
                    </button>
                    <button onClick={() => setMode('GENERATOR_CREA')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'GENERATOR_CREA' ? 'bg-purple-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Sparkles size={16}/> Créa
                    </button>
                    <button onClick={() => setMode('PROFILER')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'PROFILER' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Fingerprint size={16}/> Profiler
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
                {mode === 'ORACLE' && <OracleChat agencies={agencies} />}
                {mode === 'GENERATOR_CRISIS' && <CrisisGenerator agencies={agencies} />}
                {mode === 'GENERATOR_CREA' && <CreativeDirector agencies={agencies} />}
                {mode === 'PROFILER' && <Profiler agencies={agencies} />}
            </div>
        </div>
    );
};
