
import React, { useState, useMemo } from 'react';
import { Agency, WeekModule, GameEvent, Deliverable, CycleType } from '../../types';
import { CheckCircle2, Upload, MessageSquare, Loader2, FileText, Send, XCircle } from 'lucide-react';
import { generateFeedback } from '../../services/geminiService';
import { Modal } from '../Modal';
import { useUI } from '../../contexts/UIContext';

interface MissionsViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

export const MissionsView: React.FC<MissionsViewProps> = ({ agency, onUpdateAgency }) => {
  const { toast } = useUI();
  const [activeWeek, setActiveWeek] = useState<string>("1"); // Default ID
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  
  // Charter Form State
  const [charterData, setCharterData] = useState({
      teamName: agency.name === `Équipe ${agency.id.replace('a','')}` ? '' : agency.name,
      problem: agency.projectDef.problem,
      target: agency.projectDef.target,
      location: agency.projectDef.location,
      gesture: agency.projectDef.gesture
  });

  // Cycle Configuration
  const CYCLE_MAPPING: Record<CycleType, string[]> = {
      [CycleType.MARQUE_BRIEF]: ['1', '2', '3'],
      [CycleType.NARRATION_IA]: ['4', '5', '6'],
      [CycleType.LOOKDEV]: ['7', '8', '9'],
      [CycleType.PACKAGING]: ['10', '11', '12']
  };

  const getVisibleWeeks = () => {
      const currentCycleWeeks = CYCLE_MAPPING[agency.currentCycle] || [];
      const visibleIds = [...currentCycleWeeks];
      return Object.values(agency.progress).filter((w: WeekModule) => visibleIds.includes(w.id));
  };

  const visibleWeeks = getVisibleWeeks();
  const currentWeekData = agency.progress[activeWeek] || visibleWeeks[0];

  const handleFileUpload = async (deliverableId: string) => {
    // Special Case: Project Charter
    if (deliverableId === 'd_charter') {
        setIsCharterModalOpen(true);
        return;
    }

    setIsUploading(deliverableId);
    setTimeout(async () => {
        const deliverable = currentWeekData.deliverables.find(d => d.id === deliverableId);
        const feedback = await generateFeedback(deliverable?.name || "Livrable", agency.constraints.style);

        const updatedWeek = { ...currentWeekData };
        updatedWeek.deliverables = updatedWeek.deliverables.map(d => 
            d.id === deliverableId ? { ...d, status: 'submitted' as const, fileUrl: '#', feedback: feedback } : d
        );

        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA',
            label: `Rendu ${deliverable?.name}`,
            deltaVE: 5,
            description: "Validation automatique MVP"
        };

        onUpdateAgency({
            ...agency,
            ve_current: Math.min(100, agency.ve_current + 5),
            eventLog: [...agency.eventLog, newEvent],
            progress: {
                ...agency.progress,
                [activeWeek]: updatedWeek
            }
        });
        setIsUploading(null);
        toast('success', "Livrable envoyé ! (+5 VE)");
    }, 1500);
  };

  const handleSubmitCharter = () => {
      // Validation simple
      if (!charterData.teamName || !charterData.problem || !charterData.target || !charterData.location || !charterData.gesture) {
          toast('error', "Merci de remplir tous les champs du formulaire.");
          return;
      }

      const updatedWeek = { ...currentWeekData };
      updatedWeek.deliverables = updatedWeek.deliverables.map(d => 
          d.id === 'd_charter' ? { ...d, status: 'submitted' as const, feedback: "En attente de validation par l'enseignant." } : d
      );

      const newEvent: GameEvent = {
          id: `evt-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'INFO',
          label: "Définition Projet",
          description: `L'équipe s'appelle désormais ${charterData.teamName}. Projet soumis.`
      };

      onUpdateAgency({
          ...agency,
          name: charterData.teamName,
          projectDef: {
              problem: charterData.problem,
              target: charterData.target,
              location: charterData.location,
              gesture: charterData.gesture,
              isLocked: true // Lock after submission logic
          },
          eventLog: [...agency.eventLog, newEvent],
          progress: {
              ...agency.progress,
              [activeWeek]: updatedWeek
          }
      });
      setIsCharterModalOpen(false);
      toast('success', "Charte projet soumise !");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        
        {/* Cycle Info */}
        <div className="bg-indigo-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-indigo-900/20">
            <div>
                <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Cycle Actuel</span>
                <h3 className="font-display font-bold text-xl">{agency.currentCycle}</h3>
            </div>
            <div className="text-right text-xs text-indigo-200">
                {visibleWeeks.length} semaines
            </div>
        </div>

        {/* Week Slider */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x">
             {visibleWeeks.map((week: WeekModule) => (
                <button
                    key={week.id}
                    onClick={() => setActiveWeek(week.id)}
                    className={`snap-center flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex flex-col items-start min-w-[140px] relative overflow-hidden ${
                        activeWeek === week.id 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                    }`}
                >
                    <span className="font-display font-bold text-lg relative z-10">SEM {week.id}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 relative z-10">{week.type}</span>
                    
                    {/* Date Badge */}
                    {(week.schedule.classA || week.schedule.classB) && (
                        <div className={`mt-2 px-2 py-0.5 rounded text-[10px] font-bold relative z-10 ${activeWeek === week.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                             {agency.classId === 'A' ? week.schedule.classA?.date?.split('-').slice(1).reverse().join('/') : week.schedule.classB?.date?.split('-').slice(1).reverse().join('/')}
                        </div>
                    )}
                </button>
            ))}
        </div>

        {currentWeekData ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <div className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{currentWeekData.title}</h3>
                        <div className="flex flex-wrap gap-2">
                            {currentWeekData.objectives.map((obj, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                                    {obj}
                                </span>
                            ))}
                        </div>
                    </div>
                    {/* Show Session Info */}
                    <div className="text-right hidden md:block">
                        <span className="block text-xs font-bold text-slate-400 uppercase">Session Classe {agency.classId}</span>
                        {agency.classId === 'A' && currentWeekData.schedule.classA ? (
                            <div>
                                <div className="font-bold text-indigo-600">{currentWeekData.schedule.classA.date}</div>
                                <div className="text-xs text-slate-500">{currentWeekData.schedule.classA.slot}</div>
                            </div>
                        ) : agency.classId === 'B' && currentWeekData.schedule.classB ? (
                            <div>
                                <div className="font-bold text-purple-600">{currentWeekData.schedule.classB.date}</div>
                                <div className="text-xs text-slate-500">{currentWeekData.schedule.classB.slot}</div>
                            </div>
                        ) : (
                            <span className="text-xs italic text-slate-300">Pas de cours</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {currentWeekData.deliverables.map((deliverable) => (
                    <div key={deliverable.id} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 transition-all">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ${
                                    deliverable.status === 'validated' ? 'bg-emerald-100 text-emerald-600' :
                                    deliverable.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                    deliverable.status === 'submitted' ? 'bg-indigo-100 text-indigo-600' :
                                    'bg-white text-slate-400 border border-slate-200'
                                }`}>
                                    {deliverable.status === 'validated' ? <CheckCircle2 size={24}/> : 
                                     deliverable.status === 'rejected' ? <XCircle size={24}/> :
                                     deliverable.status === 'submitted' ? <Loader2 size={24} className="animate-spin"/> : 
                                     deliverable.id === 'd_charter' ? <FileText size={24}/> : <Upload size={24}/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-900">{deliverable.name}</h4>
                                    <p className="text-sm text-slate-500">{deliverable.description}</p>
                                </div>
                            </div>

                            {(deliverable.status === 'pending' || deliverable.status === 'rejected') ? (
                                <button 
                                onClick={() => !isUploading && handleFileUpload(deliverable.id)}
                                className={`w-full md:w-auto px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                                    deliverable.id === 'd_charter' 
                                    ? 'bg-slate-900 hover:bg-slate-700 text-white shadow-slate-900/20' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                }`}
                            >
                                {isUploading === deliverable.id ? <Loader2 className="animate-spin" size={18}/> : 
                                 deliverable.id === 'd_charter' ? <FileText size={18} /> : <Upload size={18}/>}
                                {deliverable.status === 'rejected' ? 'Recommencer' : (deliverable.id === 'd_charter' ? 'Remplir Fiche' : 'Déposer')}
                            </button>
                            ) : (
                                <span className={`px-4 py-2 bg-white border rounded-lg text-xs font-bold ${
                                    deliverable.status === 'validated' ? 'text-emerald-600 border-emerald-200' : 'text-slate-500 border-slate-200'
                                }`}>
                                    {deliverable.status === 'submitted' ? 'En attente...' : 'Validé'}
                                </span>
                            )}
                        </div>

                        {deliverable.feedback && (
                            <div className={`mt-4 p-4 rounded-xl flex gap-3 items-start ${deliverable.status === 'rejected' ? 'bg-red-50' : 'bg-indigo-50'}`}>
                                <MessageSquare size={16} className={`${deliverable.status === 'rejected' ? 'text-red-500' : 'text-indigo-500'} mt-0.5 shrink-0`}/>
                                <p className={`${deliverable.status === 'rejected' ? 'text-red-800' : 'text-indigo-800'} text-sm italic`}>"{deliverable.feedback}"</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
        ) : (
            <div className="p-8 text-center text-slate-400">Sélectionnez une semaine.</div>
        )}

        {/* MODAL: Charter Form */}
        <Modal isOpen={isCharterModalOpen} onClose={() => setIsCharterModalOpen(false)} title="Charte de Projet">
            <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-800 mb-4 border border-indigo-100">
                    Cette étape est cruciale. Vous définissez ici l'ADN de votre micro-entreprise pour tout le semestre. Soyez précis et ambitieux.
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nom de l'Agence / Équipe</label>
                    <input 
                        type="text" 
                        value={charterData.teamName}
                        onChange={e => setCharterData({...charterData, teamName: e.target.value})}
                        placeholder="Ex: Studio Impact"
                        className="w-full p-3 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Quel problème réel et local adressez-vous ?</label>
                    <textarea 
                        value={charterData.problem}
                        onChange={e => setCharterData({...charterData, problem: e.target.value})}
                        placeholder="Ex: Le manque d'espaces verts accessibles aux seniors dans le quartier X..."
                        className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[80px] bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Qui souffre de ce problème ? (Persona)</label>
                    <textarea 
                        value={charterData.target}
                        onChange={e => setCharterData({...charterData, target: e.target.value})}
                        placeholder="Ex: Les résidents de l'EHPAD Les Magnolias et leurs familles..."
                        className="w-full p-3 border border-slate-300 rounded-xl text-sm min-h-[80px] bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Où ça se passe ? (Précis)</label>
                        <input 
                            type="text" 
                            value={charterData.location}
                            onChange={e => setCharterData({...charterData, location: e.target.value})}
                            placeholder="Ex: 12 Rue de la Paix, Nantes"
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Geste Architectural Unique</label>
                         <input 
                            type="text" 
                            value={charterData.gesture}
                            onChange={e => setCharterData({...charterData, gesture: e.target.value})}
                            placeholder="Ex: Une pergola bioclimatique..."
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-[10px] text-slate-400 italic block mt-1">Modifiable ultérieurement</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                    <button 
                        onClick={() => setIsCharterModalOpen(false)}
                        className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSubmitCharter}
                        className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2"
                    >
                        <Send size={18} />
                        Soumettre le Projet
                    </button>
                </div>
            </div>
        </Modal>
    </div>
  );
};
