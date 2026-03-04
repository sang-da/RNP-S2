
import React, { useState } from 'react';
import { Agency } from '../../types';
import { useGame } from '../../contexts/GameContext';
import { BookOpen, Search, FileText, Video, Box, Link, ExternalLink, Briefcase, TrendingUp, Skull, ShieldAlert, HelpCircle } from 'lucide-react';
import { HOLDING_RULES, GAME_RULES } from '../../constants';
import ReactMarkdown from 'react-markdown';
import { HELP_CONTENT } from './HelpContent';

interface WikiViewProps {
  agency: Agency;
}

export const WikiView: React.FC<WikiViewProps> = ({ agency }) => {
  const { resources } = useGame();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'RESOURCES' | 'RULES' | 'HELP'>('RESOURCES');
  const [filterType, setFilterType] = useState<'ALL' | 'PDF' | 'VIDEO' | 'ASSET' | 'LINK'>('ALL');

  const filteredResources = resources.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = r.targetClass === 'ALL' || r.targetClass === agency.classId;
      const matchesType = filterType === 'ALL' || r.type === filterType;
      return matchesSearch && matchesClass && matchesType;
  });

  const getIcon = (type: string) => {
      switch(type) {
          case 'PDF': return <FileText size={24}/>;
          case 'VIDEO': return <Video size={24}/>;
          case 'ASSET': return <Box size={24}/>;
          default: return <Link size={24}/>;
      }
  };

  const getColor = (type: string) => {
      switch(type) {
          case 'PDF': return 'bg-red-50 text-red-500';
          case 'VIDEO': return 'bg-purple-50 text-purple-500';
          case 'ASSET': return 'bg-amber-50 text-amber-500';
          default: return 'bg-blue-50 text-blue-500';
      }
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-20">
        <div className="mb-6 flex justify-between items-end">
            <div>
                <h3 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="text-indigo-500" size={28}/> Wiki & Règles
                </h3>
                <p className="text-slate-500 text-sm">Documents de cours et règles avancées du jeu.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('RESOURCES')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'RESOURCES' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BookOpen size={14}/> Ressources
                </button>
                <button 
                    onClick={() => setActiveTab('RULES')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'RULES' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Briefcase size={14}/> Règles Holdings
                </button>
                <button 
                    onClick={() => setActiveTab('HELP')}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'HELP' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <HelpCircle size={14}/> Aide
                </button>
            </div>
        </div>

        {activeTab === 'RULES' && (
            <div className="space-y-8 max-w-3xl mx-auto">
                {/* INTRO HOLDING */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                                <Briefcase size={32} className="text-indigo-300"/>
                            </div>
                            <h2 className="text-3xl font-display font-bold">Les Holdings</h2>
                        </div>
                        <p className="text-indigo-100 text-lg leading-relaxed">
                            Une agence qui atteint une taille critique ({HOLDING_RULES.MIN_MEMBERS}+ membres) devient une <strong>Holding</strong>. 
                            Ce statut offre une puissance financière démesurée mais impose une pression constante.
                        </p>
                    </div>
                </div>

                {/* AVANTAGES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
                        <h4 className="font-bold text-emerald-700 flex items-center gap-2 mb-4">
                            <TrendingUp size={20}/> Puissance Financière
                        </h4>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex gap-2">
                                <span className="font-bold text-emerald-600">•</span>
                                <span><strong>Revenus Boostés :</strong> 1 VE rapporte <span className="text-emerald-600 font-bold">{HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD} PiXi</span> (vs {GAME_RULES.REVENUE_VE_MULTIPLIER} standard).</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-emerald-600">•</span>
                                <span><strong>Surperformance :</strong> Si croissance &gt; {HOLDING_RULES.GROWTH_TARGET_BONUS} VE/semaine, le taux passe à <span className="text-emerald-600 font-bold">{HOLDING_RULES.REVENUE_MULTIPLIER_PERFORMANCE} PiXi</span> !</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-emerald-600">•</span>
                                <span><strong>Invulnérabilité :</strong> Seuil de faillite repoussé à <span className="text-emerald-600 font-bold">{GAME_RULES.BANKRUPTCY_THRESHOLD_HOLDING} PiXi</span>.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm">
                        <h4 className="font-bold text-amber-700 flex items-center gap-2 mb-4">
                            <Briefcase size={20}/> Dividendes Seniors
                        </h4>
                        <p className="text-sm text-slate-600 mb-3">
                            Les membres fondateurs (Seniors) prélèvent un % du Chiffre d'Affaires directement dans leur poche personnelle.
                        </p>
                        <div className="bg-amber-50 p-3 rounded-lg text-xs font-mono text-amber-800">
                            VE &lt; 60 : {HOLDING_RULES.DIVIDEND_RATE_LOW * 100}%<br/>
                            VE 60-80 : {HOLDING_RULES.DIVIDEND_RATE_MID * 100}%<br/>
                            VE &gt; 80 : {HOLDING_RULES.DIVIDEND_RATE_HIGH * 100}%
                        </div>
                    </div>
                </div>

                {/* CONTRAINTES */}
                <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 text-red-50 opacity-50">
                        <Skull size={150} />
                    </div>
                    <h4 className="font-bold text-red-700 flex items-center gap-2 mb-4 relative z-10">
                        <ShieldAlert size={20}/> La Pression Actionnariale
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div>
                            <h5 className="font-bold text-slate-900 text-sm mb-2">Objectif de Croissance</h5>
                            <p className="text-sm text-slate-600">
                                La Holding DOIT gagner au moins <strong>+{HOLDING_RULES.GROWTH_TARGET} VE</strong> par semaine.
                                <br/><span className="text-red-500 text-xs font-bold">Sanction : Revenus divisés par 2 la semaine suivante.</span>
                            </p>
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-900 text-sm mb-2">Le Siège Éjectable</h5>
                            <p className="text-sm text-slate-600">
                                Si un membre n'est pas "Suggéré MVP" (Top 3 Score) pendant <strong>{HOLDING_RULES.WEEKS_WITHOUT_MVP_LIMIT} semaines</strong> consécutives...
                                <br/><span className="text-red-600 font-black text-xs uppercase">IL EST AUTOMATIQUEMENT LICENCIÉ.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* RACHATS */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900">Mécaniques de Rachat (M&A)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800">Rachat "Vautour" (Hostile)</h4>
                                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Force Majeure</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">Pour les agences en faillite imminente.</p>
                            <ul className="text-sm space-y-2">
                                <li>🎯 <strong>Cible :</strong> Budget &lt; {HOLDING_RULES.BUYOUT_VULTURE_THRESHOLD} PiXi</li>
                                <li>💰 <strong>Coût :</strong> Remboursement Dette + 1000 PiXi</li>
                                <li>⚡ <strong>Effet :</strong> Absorption immédiate sans vote. Membres deviennent "Juniors" (0 bonus).</li>
                            </ul>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800">Parachute Doré (Amical)</h4>
                                <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Vote Requis</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">Pour vendre son agence contre du cash.</p>
                            <ul className="text-sm space-y-2">
                                <li>🎯 <strong>Cible :</strong> VE &lt; {HOLDING_RULES.BUYOUT_FRIENDLY_VE_THRESHOLD}</li>
                                <li>💰 <strong>Coût :</strong> Prime Négociée (ex: 3000 PiXi)</li>
                                <li>⚡ <strong>Effet :</strong> Vote requis. Si OUI, la prime va dans la poche PERSO des membres rachetés.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'RESOURCES' && (
            /* LISTE RESSOURCES EXISTANTE */
            <>
                {/* FILTERS */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['ALL', 'PDF', 'VIDEO', 'ASSET', 'LINK'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                                    filterType === type 
                                    ? 'bg-slate-900 text-white' 
                                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* LIST */}
                {filteredResources.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <BookOpen size={32} className="mx-auto text-slate-300 mb-2"/>
                        <p className="text-slate-400 font-bold text-sm">Aucune ressource trouvée.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredResources.map(res => (
                            <a 
                                key={res.id} 
                                href={res.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-indigo-300 transition-all group"
                            >
                                <div className={`p-3 rounded-xl shrink-0 ${getColor(res.type)}`}>
                                    {getIcon(res.type)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{res.title}</h4>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded">{res.type}</span>
                                        <span className="text-[10px] text-slate-400">{res.date}</span>
                                    </div>
                                </div>
                                <ExternalLink size={18} className="text-slate-300 group-hover:text-indigo-500"/>
                            </a>
                        ))}
                    </div>
                )}
            </>
        )}
        {activeTab === 'HELP' && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm prose prose-slate max-w-none animate-in fade-in duration-300">
                <ReactMarkdown>{HELP_CONTENT}</ReactMarkdown>
            </div>
        )}
    </div>
  );
};
