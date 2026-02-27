
import React from 'react';
import { Agency } from '../types';
import { Eye, Users, MonitorPlay, ArrowRight, Terminal, Sparkles } from 'lucide-react';

interface AdminViewsProps {
  agencies: Agency[];
  onSimulateAgency: (agencyId: string) => void;
  onSimulateWaitingRoom: () => void;
  onSimulateBackdoor: () => void;
  onSimulateSpecial: () => void;
}

export const AdminViews: React.FC<AdminViewsProps> = ({ agencies, onSimulateAgency, onSimulateWaitingRoom, onSimulateBackdoor, onSimulateSpecial }) => {
  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><MonitorPlay size={32}/></div>
                Vues & Simulation
            </h2>
            <p className="text-slate-500 text-sm mt-1">Prenez la place de vos étudiants pour vérifier l'expérience utilisateur.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* BACKDOOR CARD (NEW) */}
            <div 
                onClick={onSimulateBackdoor}
                className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/30 hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer group flex flex-col relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500">
                    <Terminal size={100} />
                </div>
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Terminal size={24} className="text-emerald-500 group-hover:scale-110 transition-transform"/>
                    </div>
                    <span className="bg-emerald-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">22-04</span>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">The Backdoor</h3>
                    <p className="text-sm text-slate-400 mb-4">Accès isolé au marché noir (Audit, Leaks, Doxxing).</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-emerald-500 font-bold text-sm group-hover:translate-x-1 transition-transform">
                    Ouvrir la faille <ArrowRight size={16}/>
                </div>
            </div>

            {/* SPECIAL INTERFACES CARD (NEW) */}
            <div 
                onClick={onSimulateSpecial}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 text-amber-500">
                    <Sparkles size={100} />
                </div>
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                        <Sparkles size={24} className="text-amber-500 group-hover:rotate-12 transition-transform"/>
                    </div>
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Special</span>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900">Espaces Spéciaux</h3>
                    <p className="text-sm text-slate-500 mb-4">Simuler la Banque, les Missions et les outils RH sans affecter le jeu.</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-amber-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                    Explorer les interfaces <ArrowRight size={16}/>
                </div>
            </div>

            {/* WAITING ROOM CARD */}
            <div 
                onClick={onSimulateWaitingRoom}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col items-center text-center gap-4"
            >
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <Users size={32} className="text-slate-400 group-hover:text-indigo-600"/>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900">Salle d'Attente</h3>
                    <p className="text-sm text-slate-500">Voir ce que voient les étudiants non-assignés.</p>
                </div>
                <button className="mt-2 text-indigo-600 font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                    Simuler <ArrowRight size={16}/>
                </button>
            </div>

            {/* AGENCIES LIST */}
            {agencies.filter(a => a.id !== 'unassigned').map(agency => (
                <div 
                    key={agency.id}
                    onClick={() => onSimulateAgency(agency.id)}
                    className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                >
                    <div className={`absolute top-0 left-0 h-full w-1 ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                    
                    <div className="flex justify-between items-start mb-4 pl-2">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-600">
                            {agency.name.substring(0,2)}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                            CLASSE {agency.classId}
                        </span>
                    </div>
                    
                    <div className="pl-2">
                        <h3 className="font-bold text-lg text-slate-900 truncate">{agency.name}</h3>
                        <p className="text-sm text-slate-500 mb-4">{agency.members.length} membres</p>
                        
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                            <Eye size={16}/> Simuler le Studio <ArrowRight size={16}/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
