
import React, { useState, useMemo } from 'react';
import { Agency, Deliverable, GameEvent, WeekModule, CrisisPreset } from '../types';
import { AlertTriangle, CheckCircle2, UserCog, Wallet, Bell, Flame, TrendingDown, Eye, Ban, List, ChevronDown, ChevronUp, Siren, Trophy, XCircle, Calculator } from 'lucide-react';
import { Modal } from './Modal';
import { useUI } from '../contexts/UIContext';

interface AdminDashboardProps {
  agencies: Agency[];
  onSelectAgency: (id: string) => void;
  onShuffleConstraints: (id: string) => void;
  onUpdateAgency: (agency: Agency) => void;
  onProcessWeek: () => void;
}

// --- ALGORITHMES DE DÉTECTION ---
const detectAnomalies = (agency: Agency): string[] => {
    const anomalies: string[] = [];
    if (agency.peerReviews.length > 2) {
        const averageScore = agency.peerReviews.reduce((acc, r) => 
            acc + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3), 0) / agency.peerReviews.length;
        if (averageScore > 4.8) anomalies.push("Notes Suspectes");
    }
    if (agency.budget_real < 0) anomalies.push("Faillite imminente");
    if (agency.eventLog.length < 2) anomalies.push("Inactivité détectée");
    return anomalies;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ agencies, onSelectAgency, onUpdateAgency, onProcessWeek }) => {
  const { confirm, toast } = useUI();
  const [gradingItem, setGradingItem] = useState<{agencyId: string, weekId: string, deliverable: Deliverable} | null>(null);
  const [auditAgency, setAuditAgency] = useState<Agency | null>(null);
  const [selectedClass, setSelectedClass] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  // 1. FILTERING
  const activeAgencies = useMemo(() => {
      return agencies.filter(a => 
          a.id !== 'unassigned' && 
          (selectedClass === 'ALL' || a.classId === selectedClass)
      );
  }, [agencies, selectedClass]);

  // 2. GLOBAL FEED
  const activityFeed = useMemo(() => {
      const allEvents: {event: GameEvent, agencyName: string, agencyId: string}[] = [];
      activeAgencies.forEach(a => {
          a.eventLog.forEach(e => {
              allEvents.push({ event: e, agencyName: a.name, agencyId: a.id });
          });
      });
      return allEvents.reverse(); 
  }, [activeAgencies]);

  const visibleFeed = showAllActivity ? activityFeed : activityFeed.slice(0, 4);

  // 3. PENDING REVIEWS
  const pendingReviews = useMemo(() => {
    const reviews: {agency: Agency, weekId: string, deliverable: Deliverable}[] = [];
    activeAgencies.forEach(agency => {
        Object.values(agency.progress).forEach((week: WeekModule) => {
            week.deliverables.forEach(d => {
                if (d.status === 'submitted') {
                    reviews.push({ agency, weekId: week.id, deliverable: d });
                }
            });
        });
    });
    return reviews;
  }, [activeAgencies]);

  const handleGlobalCrisis = async (preset: CrisisPreset) => {
      const confirmed = await confirm({
          title: "Confirmation de Crise Globale",
          message: `Voulez-vous appliquer "${preset.label}" à TOUTES les agences de la classe ${selectedClass === 'ALL' ? 'A et B' : selectedClass} ?\n\nImpact : ${preset.deltaVE} VE / ${preset.deltaBudget} PiXi`,
          confirmText: "Déclencher la Crise",
          isDangerous: true
      });

      if (!confirmed) return;

      const impactedAgencies = agencies.map(a => {
          if (a.id === 'unassigned') return a;
          if (selectedClass !== 'ALL' && a.classId !== selectedClass) return a;

          const newEvent: GameEvent = {
              id: `crisis-${Date.now()}-${a.id}`,
              date: new Date().toISOString().split('T')[0],
              type: 'CRISIS',
              label: preset.label,
              description: preset.description,
              deltaVE: preset.deltaVE,
              deltaBudgetReal: preset.deltaBudget
          };

          return {
              ...a,
              ve_current: Math.max(0, a.ve_current + preset.deltaVE),
              budget_real: a.budget_real + preset.deltaBudget,
              eventLog: [...a.eventLog, newEvent]
          };
      });

      impactedAgencies.forEach(a => {
          if(a.id !== 'unassigned') onUpdateAgency(a);
      });
      toast('success', `Crise "${preset.label}" déclenchée.`);
      setIsCrisisModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 font-sans pb-20">
      
      {/* --- TOP CONTROL BAR --- */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-16 md:top-4 z-30">
        
        {/* Class Filter */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
             <button onClick={() => setSelectedClass('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Toutes</button>
             <button onClick={() => setSelectedClass('A')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'A' ? 'bg-blue-100 text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Classe A</button>
             <button onClick={() => setSelectedClass('B')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'B' ? 'bg-purple-100 text-purple-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Classe B</button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full md:w-auto">
             <button 
                onClick={() => setIsCrisisModalOpen(true)}
                className="flex-1 md:flex-none justify-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl border border-red-700 font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20"
             >
                <Flame size={16} /> CRISE
             </button>
             <button 
                onClick={onProcessWeek}
                className="flex-1 md:flex-none justify-center bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-900 font-bold text-sm flex items-center gap-2 transition-colors"
             >
                <Wallet size={16} /> Paye Hebdo
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* --- LEFT COL: ALERTS (PRIORITY) --- */}
        <div className="xl:col-span-1 space-y-6">
            
            {/* 1. Pending Reviews - CRITICAL */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm ring-4 ring-indigo-50/50">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-indigo-500" />
                    À Corriger ({pendingReviews.length})
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {pendingReviews.length === 0 ? (
                         <div className="text-center py-6 text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-xl">
                            Tout est à jour.
                        </div>
                    ) : (
                        pendingReviews.map((item) => (
                            <div 
                                key={`${item.agency.id}-${item.deliverable.id}`}
                                onClick={() => setGradingItem({agencyId: item.agency.id, weekId: item.weekId, deliverable: item.deliverable})}
                                className="p-3 bg-white hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 rounded-xl cursor-pointer transition-all group shadow-sm"
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-700 text-xs">{item.agency.name}</span>
                                    <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">SEM {item.weekId}</span>
                                </div>
                                <p className="text-xs text-indigo-900 font-medium truncate">{item.deliverable.name}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 2. HR Audits - CRITICAL */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserCog size={18} className="text-purple-500" />
                    Audits RH Requis
                </h3>
                <div className="space-y-2">
                     {activeAgencies.filter(a => detectAnomalies(a).length > 0).length === 0 && (
                          <div className="text-center py-6 text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-xl">
                            R.A.S
                        </div>
                     )}
                     {activeAgencies.filter(a => detectAnomalies(a).length > 0).map(agency => (
                         <div key={agency.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-xl">
                             <div>
                                 <div className="font-bold text-slate-800 text-xs">{agency.name}</div>
                                 <div className="text-[10px] text-red-600 font-bold">{detectAnomalies(agency)[0]}</div>
                             </div>
                             <button onClick={() => setAuditAgency(agency)} className="p-1.5 bg-white text-red-500 rounded-lg hover:bg-red-100 border border-red-100">
                                 <Eye size={14}/>
                             </button>
                         </div>
                     ))}
                </div>
            </div>

        </div>

        {/* --- CENTER COL: COMPACT LIST --- */}
        <div className="xl:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex justify-between items-center">
                <span className="flex items-center gap-2"><List size={20}/> État des Agences</span>
                <span className="text-xs font-normal text-slate-400">
                    {activeAgencies.length} actives
                </span>
            </h3>
            
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Agence</th>
                            <th className="p-4 hidden md:table-cell">Statut</th>
                            <th className="p-4 text-right">VE</th>
                            <th className="p-4 text-right hidden md:table-cell">Budget</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeAgencies
                            .sort((a,b) => b.ve_current - a.ve_current)
                            .map(agency => (
                            <tr key={agency.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-3 pl-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                            agency.classId === 'A' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                                        }`}>
                                            {agency.name.substring(0,2)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">{agency.name}</div>
                                            <div className="text-[10px] text-slate-400">{agency.members.length} membres</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3 hidden md:table-cell">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                        agency.status === 'stable' ? 'bg-emerald-50 text-emerald-600' : 
                                        agency.status === 'fragile' ? 'bg-amber-50 text-amber-600' : 
                                        'bg-red-50 text-red-600'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            agency.status === 'stable' ? 'bg-emerald-500' : 
                                            agency.status === 'fragile' ? 'bg-amber-500' : 
                                            'bg-red-500'
                                        }`}></span>
                                        {agency.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="font-display font-bold text-lg text-slate-900">{agency.ve_current}</span>
                                </td>
                                <td className="p-3 text-right hidden md:table-cell">
                                    <span className={`text-xs font-bold ${agency.budget_real < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {agency.budget_real} €
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <button 
                                        onClick={() => onSelectAgency(agency.id)}
                                        className="text-xs font-bold bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        Gérer
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- RIGHT COL: LIVE FEED (CONDENSED) --- */}
        <div className="xl:col-span-1 bg-slate-900 rounded-3xl p-5 text-slate-300 flex flex-col h-fit sticky top-32 shadow-xl shadow-slate-900/10">
             <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <Bell size={18} className="text-emerald-400" />
                    Flux
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">En direct</span>
            </h3>
            
            <div className="space-y-4 pr-2 mb-4">
                {visibleFeed.map((item, idx) => (
                    <div key={`${item.event.id}-${idx}`} className="relative pl-4 border-l border-slate-700 pb-1">
                        <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${
                             item.event.type === 'CRISIS' ? 'bg-red-500' : 
                             item.event.type === 'VE_DELTA' && (item.event.deltaVE || 0) > 0 ? 'bg-emerald-500' : 
                             'bg-slate-600'
                        }`}></div>
                        
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5 flex justify-between">
                            <span>{item.agencyName}</span>
                            <span>{item.event.date}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 leading-tight">{item.event.label}</p>
                        {item.event.deltaVE && (
                            <span className={`text-[10px] font-bold ${item.event.deltaVE > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {item.event.deltaVE > 0 ? '+' : ''}{item.event.deltaVE} VE
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {activityFeed.length > 4 && (
                <button 
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {showAllActivity ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    {showAllActivity ? 'Réduire' : 'Voir tout'}
                </button>
            )}
        </div>

      </div>

      {/* --- MODALS --- */}
      <Modal isOpen={isCrisisModalOpen} onClose={() => setIsCrisisModalOpen(false)} title="Centre de Crise Global">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CrisisCard 
                    title="Inflation Matériaux" 
                    desc="-10% de budget sur toutes les agences. Cause: Pénurie mondiale."
                    impact="Budget -500€"
                    color="bg-amber-50 border-amber-200 hover:border-amber-400"
                    icon={<TrendingDown className="text-amber-600"/>}
                    onClick={() => handleGlobalCrisis({label: "Inflation", description: "Hausse des coûts matériaux.", deltaVE: 0, deltaBudget: -500, icon: null})}
                />
                <CrisisCard 
                    title="Krach Boursier RNP" 
                    desc="Perte de confiance des investisseurs. La VE s'effondre."
                    impact="VE -10 pts"
                    color="bg-red-50 border-red-200 hover:border-red-400"
                    icon={<Flame className="text-red-600"/>}
                    onClick={() => handleGlobalCrisis({label: "Krach Boursier", description: "Perte de confiance du marché.", deltaVE: -10, deltaBudget: 0, icon: null})}
                />
                 <CrisisCard 
                    title="Grève des Transports" 
                    desc="Retard généralisé sur les rendus. Aucun impact financier direct mais moral."
                    impact="VE -2 pts"
                    color="bg-slate-50 border-slate-200 hover:border-slate-400"
                    icon={<Ban className="text-slate-600"/>}
                    onClick={() => handleGlobalCrisis({label: "Grève Transports", description: "Retards logistiques.", deltaVE: -2, deltaBudget: 0, icon: null})}
                />
                 <CrisisCard 
                    title="Subvention Exceptionnelle" 
                    desc="Le ministère de la culture débloque des fonds."
                    impact="Budget +1000€"
                    color="bg-emerald-50 border-emerald-200 hover:border-emerald-400"
                    icon={<Wallet className="text-emerald-600"/>}
                    onClick={() => handleGlobalCrisis({label: "Subvention Culture", description: "Aide exceptionnelle de l'état.", deltaVE: +5, deltaBudget: 1000, icon: null})}
                />
            </div>
      </Modal>

      {gradingItem && (
          <GradingModal 
            isOpen={!!gradingItem} 
            onClose={() => setGradingItem(null)}
            item={gradingItem}
            agencies={agencies}
            onUpdateAgency={onUpdateAgency}
          />
      )}

      {auditAgency && (
          <AuditRHModal 
            agency={auditAgency} 
            onClose={() => setAuditAgency(null)} 
            onUpdateAgency={onUpdateAgency}
          />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const CrisisCard: React.FC<{title: string, desc: string, impact: string, color: string, icon: any, onClick: () => void}> = ({title, desc, impact, color, icon, onClick}) => (
    <button onClick={onClick} className={`p-4 rounded-xl border text-left transition-all ${color} group`}>
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-900 group-hover:underline">{title}</h4>
            {icon}
        </div>
        <p className="text-xs text-slate-600 mb-3">{desc}</p>
        <span className="text-[10px] font-bold uppercase bg-white/50 px-2 py-1 rounded">{impact}</span>
    </button>
);

const AuditRHModal: React.FC<{agency: Agency, onClose: () => void, onUpdateAgency: (a: Agency) => void}> = ({agency, onClose, onUpdateAgency}) => {
    const { toast, confirm } = useUI();

    const handlePunish = async () => {
        const confirmed = await confirm({
            title: "Sanctionner l'Agence ?",
            message: `Vous allez infliger -15 VE à l'agence "${agency.name}" pour "Fraude Notation RH".`,
            confirmText: "Sanctionner",
            isDangerous: true
        });

        if (!confirmed) return;

        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'CRISIS',
            label: "Fraude Notation RH",
            deltaVE: -15,
            description: "Les notes attribuées entre pairs sont jugées de complaisance et non réalistes. Audit négatif."
        };

        const updatedAgency = {
            ...agency,
            ve_current: Math.max(0, agency.ve_current - 15),
            eventLog: [...agency.eventLog, newEvent]
        };
        onUpdateAgency(updatedAgency);
        toast('error', `Sanction appliquée à ${agency.name}`);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Audit RH: ${agency.name}`}>
            <div className="space-y-6">
                <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <UserCog size={24} className="text-purple-600"/>
                    <p className="text-sm text-purple-900 leading-tight">
                        Anomalies détectées : <strong>{detectAnomalies(agency).join(', ') || 'Aucune'}</strong>.
                        <br/>Vérifiez la variance des notes.
                    </p>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {agency.peerReviews.length === 0 ? (
                        <div className="text-center text-slate-400 py-8 italic border-2 border-dashed rounded-xl">
                            Aucune évaluation effectuée par les étudiants.
                        </div>
                    ) : (
                        agency.peerReviews.map(review => (
                            <div key={review.id} className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm">
                                        <span className="font-bold text-slate-700">{review.reviewerName}</span>
                                        <span className="text-slate-400 mx-1">→</span>
                                        <span className="font-bold text-slate-900">{review.targetName}</span>
                                    </div>
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 rounded-md">{review.date}</span>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <BadgeScore label="Assiduité" score={review.ratings.attendance} />
                                    <BadgeScore label="Qualité" score={review.ratings.quality} />
                                    <BadgeScore label="Implication" score={review.ratings.involvement} />
                                </div>
                                {review.comment && (
                                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg">"{review.comment}"</p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                        Fermer
                    </button>
                    <button 
                        onClick={handlePunish}
                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                        <Siren size={18}/>
                        Sanctionner (-15 VE)
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const BadgeScore: React.FC<{label: string, score: number}> = ({label, score}) => (
    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${
        score >= 4 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
        score >= 2.5 ? 'bg-amber-50 border-amber-100 text-amber-700' :
        'bg-red-50 border-red-100 text-red-700'
    }`}>
        {label}: {score}/5
    </div>
);

// --- REUSED GRADING MODAL ---
interface GradingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {agencyId: string, weekId: string, deliverable: Deliverable};
    agencies: Agency[];
    onUpdateAgency: (agency: Agency) => void;
}

const GradingModal: React.FC<GradingModalProps> = ({ isOpen, onClose, item, agencies, onUpdateAgency }) => {
    const { toast } = useUI();
    const [quality, setQuality] = useState<'A' | 'B' | 'C'>('B');
    const [daysLate, setDaysLate] = useState<number>(0);
    const [constraintBroken, setConstraintBroken] = useState<boolean>(false);
    const [feedback, setFeedback] = useState(item.deliverable.feedback || "");

    const baseScore = quality === 'A' ? 10 : quality === 'B' ? 4 : 0;
    const penaltyLate = daysLate * 5;
    const penaltyConstraint = constraintBroken ? 10 : 0;
    const totalDelta = baseScore - penaltyLate - penaltyConstraint;

    const handleValidate = () => {
        const agency = agencies.find(a => a.id === item.agencyId);
        if(!agency) return;

        const currentWeek = agency.progress[item.weekId];
        const isRejected = quality === 'C';
        const finalStatus: 'validated' | 'rejected' = isRejected ? 'rejected' : 'validated';
        
        const updatedDeliverables = currentWeek.deliverables.map(d => 
            d.id === item.deliverable.id 
            ? { 
                ...d, 
                status: finalStatus,
                feedback: feedback,
                score: 100,
                grading: {
                    quality,
                    daysLate,
                    constraintBroken,
                    finalDelta: totalDelta
                }
              }
            : d
        );

        let updatedProjectDef = agency.projectDef;
        if (item.deliverable.id === 'd_charter' && isRejected) {
             updatedProjectDef = { ...agency.projectDef, isLocked: false };
        }

        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA',
            label: isRejected ? `Rejet: ${item.deliverable.name}` : `Correction: ${item.deliverable.name}`,
            deltaVE: totalDelta,
            description: `Qualité ${quality} (${baseScore}pts) | Retard: ${daysLate}j (-${penaltyLate})`
        };

        const updatedAgency = {
            ...agency,
            ve_current: Math.max(0, Math.min(100, agency.ve_current + totalDelta)),
            projectDef: updatedProjectDef,
            eventLog: [...agency.eventLog, newEvent],
            progress: {
                ...agency.progress,
                [item.weekId]: {
                    ...currentWeek,
                    deliverables: updatedDeliverables
                }
            }
        };

        onUpdateAgency(updatedAgency);
        toast(totalDelta >= 0 ? 'success' : 'warning', `Correction enregistrée (${totalDelta} VE)`);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Correction de Livrable">
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{item.deliverable.name}</h3>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Trophy size={16} className="text-yellow-500"/> Qualité du rendu
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setQuality('A')} className={`py-3 px-2 rounded-xl border-2 font-bold text-sm ${quality === 'A' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100'}`}>A (Excellence)</button>
                            <button onClick={() => setQuality('B')} className={`py-3 px-2 rounded-xl border-2 font-bold text-sm ${quality === 'B' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100'}`}>B (Standard)</button>
                            <button onClick={() => setQuality('C')} className={`py-3 px-2 rounded-xl border-2 font-bold text-sm ${quality === 'C' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100'}`}>C (Rejet)</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">Retard (jours)</label>
                             <div className="flex items-center gap-2">
                                <button onClick={() => setDaysLate(Math.max(0, daysLate - 1))} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold">-</button>
                                <span className="font-mono font-bold w-8 text-center">{daysLate}</span>
                                <button onClick={() => setDaysLate(daysLate + 1)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold">+</button>
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">Contraintes</label>
                             <button onClick={() => setConstraintBroken(!constraintBroken)} className={`w-full py-2 px-3 rounded-xl border text-xs font-bold ${constraintBroken ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-slate-200 text-slate-400'}`}>{constraintBroken ? 'Non Respectées (-10)' : 'Respectées (OK)'}</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Commentaire</label>
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]" />
                    </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center justify-between">
                    <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Impact VE</span>
                        <span className={`text-3xl font-display font-bold ${totalDelta > 0 ? 'text-emerald-400' : totalDelta < 0 ? 'text-red-400' : 'text-white'}`}>{totalDelta > 0 ? '+' : ''}{totalDelta}</span>
                    </div>
                    <button onClick={handleValidate} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 flex items-center gap-2">
                        {quality === 'C' ? <XCircle size={18} className="text-red-600"/> : <Calculator size={18}/>}
                        {quality === 'C' ? 'Rejeter' : 'Valider'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
