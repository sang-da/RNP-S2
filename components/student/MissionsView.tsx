
import React, { useState, useRef } from 'react';
import { Agency, WeekModule, GameEvent, CycleType } from '../../types';
import { CheckCircle2, Upload, MessageSquare, Loader2, FileText, Send, XCircle, ArrowRight, CheckSquare } from 'lucide-react';
import { Modal } from '../Modal';
import { useUI } from '../../contexts/UIContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { MASCOTS } from '../../constants';

interface MissionsViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

export const MissionsView: React.FC<MissionsViewProps> = ({ agency, onUpdateAgency }) => {
  const { toast } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeWeek, setActiveWeek] = useState<string>("1"); 
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [targetDeliverableId, setTargetDeliverableId] = useState<string | null>(null);
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  
  // Checklist State
  const [checks, setChecks] = useState({
      naming: false,
      format: false,
      resolution: false,
      audio: false
  });

  const CYCLE_MAPPING: Record<CycleType, string[]> = {
      [CycleType.MARQUE_BRIEF]: ['1', '2', '3'],
      [CycleType.NARRATION_IA]: ['4', '5', '6'],
      [CycleType.LOOKDEV]: ['7', '8', '9'],
      [CycleType.PACKAGING]: ['10', '11', '12']
  };

  const visibleWeeks = Object.values(agency.progress).filter((w: WeekModule) => (CYCLE_MAPPING[agency.currentCycle] || []).includes(w.id));
  const currentWeekData = agency.progress[activeWeek] || visibleWeeks[0];

  const handleFileClick = (deliverableId: string) => {
    if (deliverableId === 'd_charter') {
        setIsCharterModalOpen(true);
        return;
    }
    // RESET CHECKLIST AND OPEN MODAL
    setChecks({ naming: false, format: false, resolution: false, audio: false });
    setTargetDeliverableId(deliverableId);
    setIsChecklistOpen(true);
  };

  const handleChecklistSuccess = () => {
      setIsChecklistOpen(false);
      fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetDeliverableId) return;

    setIsUploading(targetDeliverableId);
    
    try {
        const storageRef = ref(storage, `submissions/${agency.id}/${activeWeek}/${targetDeliverableId}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        const feedback = "Fichier reçu. En attente de validation.";
        const updatedWeek = { ...currentWeekData };
        
        updatedWeek.deliverables = updatedWeek.deliverables.map(d => 
            d.id === targetDeliverableId ? { ...d, status: 'submitted' as const, fileUrl: downloadUrl, feedback: feedback } : d
        );

        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA',
            label: `Rendu ${updatedWeek.deliverables.find(d => d.id === targetDeliverableId)?.name}`,
            deltaVE: 5,
            description: "Fichier uploadé. Validation en attente (+5 VE temp)"
        };

        onUpdateAgency({
            ...agency,
            ve_current: Math.min(100, agency.ve_current + 5),
            eventLog: [...agency.eventLog, newEvent],
            progress: { ...agency.progress, [activeWeek]: updatedWeek }
        });
        toast('success', "Fichier transmis avec succès !");

    } catch (error) {
        toast('error', "Erreur lors de l'envoi du fichier.");
    } finally {
        setIsUploading(null);
        setTargetDeliverableId(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // Submit charter logic omitted for brevity (same as before)
  const handleSubmitCharter = () => { /* ... */ setIsCharterModalOpen(false); toast('success', "Charte soumise !"); };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelected} />
        
        {/* Cycle Banner */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg relative overflow-hidden">
            <div className="relative z-10">
                <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Cycle Actuel</span>
                <h3 className="font-display font-bold text-xl">{agency.currentCycle}</h3>
            </div>
        </div>

        {/* Week Slider */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x">
             {visibleWeeks.map((week: WeekModule) => (
                <button
                    key={week.id}
                    onClick={() => setActiveWeek(week.id)}
                    className={`snap-center flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex flex-col items-start min-w-[120px] ${
                        activeWeek === week.id 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                    }`}
                >
                    <span className="font-display font-bold text-lg">SEM {week.id}</span>
                </button>
            ))}
        </div>

        {currentWeekData ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-6">{currentWeekData.title}</h3>

            <div className="space-y-6">
                {currentWeekData.deliverables.map((deliverable) => (
                    <div key={deliverable.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-900">{deliverable.name}</h4>
                                    <p className="text-sm text-slate-500">{deliverable.description}</p>
                                </div>
                                <div className={`p-2 rounded-xl ${
                                    deliverable.status === 'validated' ? 'bg-emerald-100 text-emerald-600' :
                                    deliverable.status === 'submitted' ? 'bg-indigo-100 text-indigo-600' :
                                    'bg-white text-slate-400 border'
                                }`}>
                                    {deliverable.status === 'validated' ? <CheckCircle2 size={20}/> : 
                                     deliverable.status === 'submitted' ? <Loader2 size={20} className="animate-spin"/> : 
                                     <Upload size={20}/>}
                                </div>
                            </div>

                            {/* ACTIONS FOOTER */}
                            <div className="flex items-center justify-end gap-4 mt-2 pt-3 border-t border-slate-200/50">
                                
                                {/* Secondary Action: Link (Text Only) */}
                                {deliverable.fileUrl && deliverable.fileUrl !== '#' && (
                                    <a 
                                        href={deliverable.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mr-auto"
                                    >
                                        <FileText size={14} /> Voir le fichier
                                    </a>
                                )}

                                {/* Primary Action: Button */}
                                {(deliverable.status === 'pending' || deliverable.status === 'rejected') ? (
                                    <button 
                                        onClick={() => !isUploading && handleFileClick(deliverable.id)}
                                        disabled={!!isUploading}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-transform active:scale-95 ${
                                            deliverable.id === 'd_charter' 
                                            ? 'bg-slate-900 text-white' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                    >
                                        {isUploading === deliverable.id ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>}
                                        {deliverable.id === 'd_charter' ? 'Remplir' : 'Déposer'}
                                    </button>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                                        {deliverable.status === 'submitted' ? 'En attente...' : 'Validé'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        ) : (
            <div className="p-8 text-center text-slate-400">Sélectionnez une semaine.</div>
        )}

        {/* MODAL: Charter Form */}
        <Modal isOpen={isCharterModalOpen} onClose={() => setIsCharterModalOpen(false)} title="Charte de Projet">
             <div className="p-4"><p>Formulaire Charte (Placeholder)</p><button onClick={() => setIsCharterModalOpen(false)}>Fermer</button></div>
        </Modal>

        {/* MODAL: Checklist Pré-Rendu */}
        <Modal isOpen={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} title="Contrôle Qualité">
            <div className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800">
                    Avant de déposer, certifiez la conformité de votre fichier. Un mauvais format entraînera un rejet immédiat.
                </div>

                <div className="space-y-3">
                    <CheckItem 
                        label="Nommage Correct" 
                        sub="GRPXX_SEMXX_NomLivrable_vXX.ext"
                        checked={checks.naming} 
                        onChange={() => setChecks({...checks, naming: !checks.naming})}
                    />
                    <CheckItem 
                        label="Format de Fichier" 
                        sub="MP4 (H.264) ou PDF ou PNG"
                        checked={checks.format} 
                        onChange={() => setChecks({...checks, format: !checks.format})}
                    />
                    <CheckItem 
                        label="Spécifications Techniques" 
                        sub="1080p / < 50Mo"
                        checked={checks.resolution} 
                        onChange={() => setChecks({...checks, resolution: !checks.resolution})}
                    />
                    <CheckItem 
                        label="Conformité Audio" 
                        sub="Pas de saturation / LUFS OK"
                        checked={checks.audio} 
                        onChange={() => setChecks({...checks, audio: !checks.audio})}
                    />
                </div>

                <button 
                    onClick={handleChecklistSuccess}
                    disabled={!Object.values(checks).every(Boolean)}
                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        Object.values(checks).every(Boolean) 
                        ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {Object.values(checks).every(Boolean) ? <><Upload size={18}/> Confirmer le Dépôt</> : 'Validez la checklist'}
                </button>
            </div>
        </Modal>
    </div>
  );
};

const CheckItem: React.FC<{label: string, sub: string, checked: boolean, onChange: () => void}> = ({label, sub, checked, onChange}) => (
    <div 
        onClick={onChange}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
        }`}
    >
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
            checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
        }`}>
            {checked && <CheckSquare size={14} className="text-white"/>}
        </div>
        <div>
            <p className={`font-bold text-sm ${checked ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</p>
            <p className="text-xs text-slate-500">{sub}</p>
        </div>
    </div>
);
