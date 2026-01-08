
import React, { useState } from 'react';
import { HelpCircle, TrendingUp, Coins, Zap, ShieldAlert, Rocket, Info, Landmark, Book, ArrowRight, ChevronRight } from 'lucide-react';
import { GAME_MANUALS } from '../../constants';

export const FAQView: React.FC = () => {
    const [selectedManualId, setSelectedManualId] = useState<string | null>(null);

    const activeManual = GAME_MANUALS.find(m => m.id === selectedManualId);

    // Fonction simple pour rendre le markdown "maison"
    const renderContent = (content: string) => {
        return content.split('\n').map((line, idx) => {
            if (line.startsWith('# ')) return <h3 key={idx} className="text-2xl font-bold text-slate-900 mt-6 mb-4">{line.replace('# ', '')}</h3>;
            if (line.startsWith('### ')) return <h4 key={idx} className="text-lg font-bold text-indigo-700 mt-4 mb-2">{line.replace('### ', '')}</h4>;
            if (line.startsWith('* ')) return <li key={idx} className="ml-4 list-disc text-slate-700 mb-1">{parseBold(line.replace('* ', ''))}</li>;
            if (line.startsWith('> ')) return <div key={idx} className="border-l-4 border-amber-400 bg-amber-50 p-4 my-4 text-amber-900 italic rounded-r-lg">{parseBold(line.replace('> ', ''))}</div>;
            if (/^\d+\./.test(line)) return <div key={idx} className="font-bold text-slate-800 mt-2 mb-1">{parseBold(line)}</div>;
            if (line.trim() === '') return <br key={idx}/>;
            return <p key={idx} className="text-slate-600 leading-relaxed mb-2">{parseBold(line)}</p>;
        });
    };

    const parseBold = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="animate-in slide-in-from-right-4 duration-500 pb-20 h-[calc(100vh-12rem)]">
            
            <div className="flex flex-col lg:flex-row h-full gap-6">
                
                {/* SIDEBAR NAVIGATION */}
                <div className={`lg:w-1/3 flex flex-col h-full ${selectedManualId ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="mb-6 shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <Book size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-bold text-slate-900">Le Codex RNP</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Manuel de l'Employé S2</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">Toutes les règles pour survivre et gagner.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {GAME_MANUALS.map((manual) => (
                            <button
                                key={manual.id}
                                onClick={() => setSelectedManualId(manual.id)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all group relative overflow-hidden ${
                                    selectedManualId === manual.id 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${selectedManualId === manual.id ? 'bg-white/20 text-white' : 'bg-slate-50 ' + manual.color}`}>
                                            <manual.icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-sm ${selectedManualId === manual.id ? 'text-white' : 'text-slate-800'}`}>{manual.title}</h4>
                                            <p className={`text-xs ${selectedManualId === manual.id ? 'text-slate-300' : 'text-slate-400'}`}>{manual.subtitle}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className={`transition-transform ${selectedManualId === manual.id ? 'text-white translate-x-1' : 'text-slate-300 group-hover:text-indigo-400'}`} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT READER */}
                <div className={`lg:w-2/3 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col ${!selectedManualId ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedManualId ? (
                        <>
                            {/* Reader Header */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                                <button onClick={() => setSelectedManualId(null)} className="lg:hidden text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-bold">
                                    <ArrowRight size={16} className="rotate-180"/> Retour
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-slate-100 ${activeManual?.color}`}>
                                        {activeManual && <activeManual.icon size={24} />}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">{activeManual?.title}</h3>
                                </div>
                                <div className="w-8"></div> {/* Spacer for alignment */}
                            </div>

                            {/* Reader Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                                <div className="max-w-3xl mx-auto">
                                    {activeManual && renderContent(activeManual.content)}
                                </div>
                                <div className="mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400 italic">
                                    Dernière mise à jour : Semaine 1
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
                            <Book size={64} className="mb-6 opacity-20"/>
                            <h3 className="text-lg font-bold text-slate-600 mb-2">Sélectionnez un chapitre</h3>
                            <p className="text-sm max-w-md">
                                Pour maîtriser le jeu, vous devez en connaître les règles.
                                Commencez par le chapitre 01 pour comprendre la philosophie.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
