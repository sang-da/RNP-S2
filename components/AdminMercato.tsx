
import React, { useState, useMemo } from 'react';
import { Agency, GameEvent, MercatoRequest } from '../types';
import { ArrowRightLeft, UserPlus, UserMinus, Briefcase, Plus, AlertCircle, Check, X, FileSearch, UserX, Coins } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

interface AdminMercatoProps {
  agencies: Agency[];
  onUpdateAgencies: (agencies: Agency[]) => void;
}

export const AdminMercato: React.FC<AdminMercatoProps> = ({ agencies, onUpdateAgencies }) => {
  const { confirm, toast } = useUI();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [targetAgencyId, setTargetAgencyId] = useState<string | null>(null);

  // Separate Unassigned (Chômage) from Active Agencies
  const unassignedAgency = agencies.find(a => a.id === 'unassigned');
  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  // Collect all Pending Requests
  const pendingRequests = useMemo(() => {
      const requests: {req: MercatoRequest, agency: Agency}[] = [];
      agencies.forEach(a => {
          a.mercatoRequests.forEach(r => {
              if (r.status === 'PENDING') requests.push({req: r, agency: a});
          });
      });
      return requests;
  }, [agencies]);

  // Helper to find student and their current agency
  const findStudentData = (studentId: string) => {
    for (const agency of agencies) {
        const student = agency.members.find(m => m.id === studentId);
        if (student) return { student, agency };
    }
    return null;
  };

  // ------------------------------------------------------------------
  // LOGIC: Gradual Score Calculation
  // ------------------------------------------------------------------
  const calculateFiringVEDelta = (score: number) => {
      if (score < 30) return 10;   // Dead weight removal (Huge bonus)
      if (score < 50) return 5;    // Optimization (Small bonus)
      if (score < 70) return -5;   // Minor loss (Small penalty)
      if (score < 90) return -15;  // Major loss (Big penalty)
      return -25;                  // Critical loss (Huge penalty)
  };

  const executeTransfer = (studentId: string, sourceAgencyId: string, targetAgencyId: string, transferType: 'HIRE' | 'FIRE' | 'TRANSFER') => {
    const sourceAgency = agencies.find(a => a.id === sourceAgencyId);
    const targetAgency = agencies.find(a => a.id === targetAgencyId);
    const student = sourceAgency?.members.find(m => m.id === studentId);

    if (!sourceAgency || !targetAgency || !student) return;

    // 1. Remove from Source
    const updatedSourceMembers = sourceAgency.members.filter(m => m.id !== student.id);
    const updatedSource = { ...sourceAgency, members: updatedSourceMembers };

    // 2. Add to Target
    const updatedTargetMembers = [...targetAgency.members, student];
    const updatedTarget = { ...targetAgency, members: updatedTargetMembers };

    // 3. Events Logic
    let eventSource: GameEvent | null = null;
    let eventTarget: GameEvent | null = null;
    let sourceVEDelta = 0;
    let targetVEDelta = 0;

    if (transferType === 'FIRE') {
        sourceVEDelta = calculateFiringVEDelta(student.individualScore);
        
        let label = "Départ";
        let desc = "";
        
        if(sourceVEDelta > 0) {
            label = "Restructuration";
            desc = `Départ validé de ${student.name} (Score ${student.individualScore}). Optimisation structurelle.`;
        } else {
            label = "Perte Compétence";
            desc = `Départ de ${student.name} (Score ${student.individualScore}). Perte de capital humain.`;
        }

        eventSource = {
            id: `evt-${Date.now()}-1`, date: new Date().toISOString().split('T')[0],
            type: sourceVEDelta > 0 ? 'VE_DELTA' : 'CRISIS',
            label: label, 
            deltaVE: sourceVEDelta,
            description: desc
        };

    } else if (transferType === 'HIRE') {
        targetVEDelta = -5;
        eventTarget = {
            id: `evt-${Date.now()}-2`, date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA', label: 'Recrutement Ext.', deltaVE: targetVEDelta,
            description: `${student.name} rejoint l'équipe depuis le vivier. Coût d'intégration.`
        };
    } else {
         // Classic Transfer Logic
         sourceVEDelta = -5;
         targetVEDelta = -2;
         eventSource = {
            id: `evt-${Date.now()}-1`, date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA', label: 'Transfert Sortant', deltaVE: sourceVEDelta,
            description: `${student.name} quitte l'agence.`
        };
        eventTarget = {
            id: `evt-${Date.now()}-2`, date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA', label: 'Transfert Entrant', deltaVE: targetVEDelta,
            description: `${student.name} rejoint l'agence.`
        };
    }

    if (eventSource && sourceAgency.id !== 'unassigned') {
        updatedSource.eventLog = [...updatedSource.eventLog, eventSource];
        updatedSource.ve_current = Math.max(0, updatedSource.ve_current + sourceVEDelta);
    }
    if (eventTarget && targetAgency.id !== 'unassigned') {
        updatedTarget.eventLog = [...updatedTarget.eventLog, eventTarget];
        updatedTarget.ve_current = Math.max(0, updatedTarget.ve_current + targetVEDelta);
    }

    const newAgencies = agencies.map(a => 
        a.id === sourceAgency.id ? updatedSource : 
        a.id === targetAgency.id ? updatedTarget : a
    );
    return newAgencies;
  }

  const handleManualTransfer = async () => {
     if (!selectedStudentId || !targetAgencyId) return;
     const sourceData = findStudentData(selectedStudentId);
     if (!sourceData) return;

     // --- CLASS CHECK ---
     const student = sourceData.student;
     const targetAgency = agencies.find(a => a.id === targetAgencyId);
     
     if (targetAgency && targetAgency.id !== 'unassigned') {
         if (targetAgency.classId !== student.classId) {
             toast('error', `Action Interdite : Classes incompatibles (Étudiant ${student.classId} -> Agence ${targetAgency.classId})`);
             return;
         }
     }
     
     const type = sourceData.agency.id === 'unassigned' ? 'HIRE' : targetAgencyId === 'unassigned' ? 'FIRE' : 'TRANSFER';
     
     // Confirmation UI
     const confirmed = await confirm({
         title: "Confirmation de Mouvement RH",
         message: `Voulez-vous forcer le mouvement de ${student.name} ?\n\nType: ${type}\nSource: ${sourceData.agency.name}\nCible: ${targetAgency?.name || 'Chômage'}`,
         confirmText: "Valider le Transfert",
         isDangerous: type === 'FIRE'
     });

     if (!confirmed) return;

     const newAgencies = executeTransfer(selectedStudentId, sourceData.agency.id, targetAgencyId, type);
     if(newAgencies) {
         onUpdateAgencies(newAgencies);
         toast('success', `Transfert effectué : ${student.name}`);
         setSelectedStudentId(null);
         setTargetAgencyId(null);
     }
  };

  const handleApproveRequest = (request: MercatoRequest, requestAgency: Agency) => {
      let newAgencies: Agency[] | undefined;

      if (request.type === 'FIRE') {
          newAgencies = executeTransfer(request.studentId, request.targetAgencyId, 'unassigned', 'FIRE');
      } else if (request.type === 'HIRE') {
          newAgencies = executeTransfer(request.studentId, 'unassigned', request.targetAgencyId, 'HIRE');
      }

      if (newAgencies) {
          const finalAgencies = newAgencies.map(a => {
             if (a.id === requestAgency.id) {
                 return { ...a, mercatoRequests: a.mercatoRequests.filter(r => r.id !== request.id) };
             }
             return a;
          });
          onUpdateAgencies(finalAgencies);
          toast('success', 'Demande validée.');
      }
  };

  const handleRejectRequest = (request: MercatoRequest, requestAgency: Agency) => {
      const updatedAgency = {
          ...requestAgency,
          mercatoRequests: requestAgency.mercatoRequests.filter(r => r.id !== request.id)
      };
      onUpdateAgencies(agencies.map(a => a.id === updatedAgency.id ? updatedAgency : a));
      toast('info', 'Demande rejetée.');
  };

  const handleCreateAgency = () => {
      const newAgency: Agency = {
          id: `a-${Date.now()}`,
          name: "Nouvelle Agence",
          tagline: "En construction...",
          ve_current: 50,
          status: 'stable',
          classId: 'A', // Default to A, admin might change logic later
          budget_real: 5000,
          budget_valued: 0,
          members: [],
          peerReviews: [],
          eventLog: [],
          currentCycle: agencies[0].currentCycle,
          constraints: { space: "À définir", style: "À définir", client: "À définir" },
          projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: false },
          mercatoRequests: [],
          progress: JSON.parse(JSON.stringify(agencies[0].progress))
      };
      onUpdateAgencies([...agencies, newAgency]);
      toast('success', 'Nouvelle agence créée.');
  };

  // UI Helpers
  const getTransferTypeLabel = (sourceId: string, targetId: string) => {
      if (sourceId === 'unassigned') return 'HIRE';
      if (targetId === 'unassigned') return 'FIRE';
      return 'TRANSFER';
  }

  const getActionLabel = () => {
    if (!selectedStudentId || !targetAgencyId) return "Sélectionner";
    const source = findStudentData(selectedStudentId)?.agency;
    if (!source) return "Erreur";
    
    const type = getTransferTypeLabel(source.id, targetAgencyId);
    if (type === 'FIRE') return 'Licencier (Vers Chômage)';
    if (type === 'HIRE') return 'Recruter (Depuis Vivier)';
    return 'Transférer';
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900">Mercato & RH</h2>
                <p className="text-slate-500 text-sm">Gérez les effectifs. Transferts limités par Classe (A/B).</p>
            </div>
            <button 
                onClick={handleCreateAgency}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
            >
                <Plus size={18} /> Créer un Groupe
            </button>
        </div>

        {/* --- SECTION: PENDING REQUESTS --- */}
        {pendingRequests.length > 0 && (
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-4">
                    <AlertCircle size={20}/> Demandes en attente ({pendingRequests.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingRequests.map(({req, agency}) => {
                        const student = findStudentData(req.studentId)?.student;
                        const score = student?.individualScore || 0;
                        const delta = calculateFiringVEDelta(score);
                        const isResignation = req.requesterId === req.studentId;

                        return (
                            <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${req.type === 'HIRE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {req.type === 'HIRE' ? 'Embauche' : (isResignation ? 'Démission' : 'Renvoi')}
                                        </span>
                                        <span className="text-xs text-slate-400">{req.date}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200 font-bold">Classe {student?.classId}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => handleRejectRequest(req, agency)}
                                            className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                        >
                                            <X size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleApproveRequest(req, agency)}
                                            className="p-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                        >
                                            <Check size={16}/>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-1">
                                    <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        {req.studentName} 
                                        {req.type === 'HIRE' ? (
                                            <span className="text-xs text-emerald-600 font-normal">rejoint {agency.name}</span>
                                        ) : (
                                            <span className="text-xs text-red-600 font-normal">quitte {agency.name}</span>
                                        )}
                                    </p>
                                    {req.type === 'FIRE' && (
                                        <div className="flex items-center gap-2 mt-2 text-xs">
                                            <span className="text-slate-500">Score:</span>
                                            <span className={`font-bold ${score < 50 ? 'text-red-500' : 'text-emerald-500'}`}>{score}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className={`font-bold px-2 py-0.5 rounded ${delta > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {delta > 0 ? '+' : ''}{delta} VE
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- ZONE 1 & 2: LISTS --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12">
                 {/* UNASSIGNED POOL */}
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Briefcase size={16}/> Vivier / Pôle Chômage
                </h3>
                <div className={`border-2 border-dashed rounded-2xl p-4 mb-8 transition-colors ${targetAgencyId === 'unassigned' ? 'bg-red-50 border-red-300' : 'bg-slate-100 border-slate-300'}`}>
                     <div className="flex justify-between items-center mb-4">
                         <p className="text-sm text-slate-500 italic">Étudiants sans affectation. Attention à la Classe (A/B) lors du recrutement.</p>
                         <button 
                            onClick={() => setTargetAgencyId('unassigned')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                targetAgencyId === 'unassigned' 
                                ? 'bg-red-600 text-white ring-2 ring-red-300' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-red-300 hover:text-red-500'
                            }`}
                         >
                            Définir comme Destination (Licenciement)
                         </button>
                    </div>
                    {unassignedAgency && unassignedAgency.members.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {unassignedAgency.members.map(student => (
                            <div 
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all relative overflow-hidden ${
                                    selectedStudentId === student.id 
                                    ? 'bg-white border-indigo-500 shadow-md transform scale-105' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                }`}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${student.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                                <img src={student.avatarUrl} className="w-8 h-8 rounded-full bg-slate-200 grayscale" />
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{student.name}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-red-500 font-bold uppercase">Chômage</p>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${student.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                                            CLASSE {student.classId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                        <div className="text-center py-4 text-slate-400 text-sm font-bold">Aucun étudiant au chômage.</div>
                    )}
                </div>

                {/* ACTIVE AGENCIES */}
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserPlus size={16}/> Agences Actives
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeAgencies.map(agency => (
                        <div key={agency.id} className={`bg-white rounded-2xl border transition-all relative overflow-hidden ${targetAgencyId === agency.id ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
                            {/* Class Indicator Strip */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                            
                            <div 
                                onClick={() => setTargetAgencyId(agency.id)}
                                className={`p-4 border-b border-slate-100 flex justify-between items-center cursor-pointer rounded-t-2xl mt-1 transition-colors ${targetAgencyId === agency.id ? 'bg-indigo-50' : 'bg-slate-50 hover:bg-slate-100'}`}
                            >
                                <div>
                                    <h4 className={`font-bold ${targetAgencyId === agency.id ? 'text-indigo-700' : 'text-slate-700'}`}>{agency.name}</h4>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${agency.classId === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        CLASSE {agency.classId}
                                    </span>
                                </div>
                                {targetAgencyId === agency.id && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 rounded-full font-bold">Destination</span>}
                            </div>
                            <div className="p-4 space-y-2">
                                {agency.members.map(student => (
                                    <div 
                                        key={student.id}
                                        onClick={(e) => { e.stopPropagation(); setSelectedStudentId(student.id); }}
                                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                                            selectedStudentId === student.id 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <img src={student.avatarUrl} className={`w-8 h-8 rounded-full ${selectedStudentId === student.id ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-sm leading-none">{student.name}</p>
                                                <span className={`text-[10px] font-bold ${student.individualScore < 50 ? 'text-red-400' : 'text-emerald-400'}`}>{student.individualScore} pts</span>
                                            </div>
                                            <p className={`text-[10px] mt-0.5 ${selectedStudentId === student.id ? 'text-indigo-200' : 'text-slate-400'}`}>{student.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {/* Floating Action Bar */}
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 md:ml-32 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 transition-all duration-300 z-50 ${selectedStudentId && targetAgencyId ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
            <div className="flex items-center gap-3">
                 <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Source</span>
                    <span className="font-bold">{selectedStudentId ? findStudentData(selectedStudentId)?.agency.name : '-'}</span>
                 </div>
                 <ArrowRightLeft className="text-slate-500" />
                 <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Cible</span>
                    <span className="font-bold">{targetAgencyId === 'unassigned' ? 'Chômage' : agencies.find(a => a.id === targetAgencyId)?.name}</span>
                 </div>
            </div>
            <button 
                onClick={handleManualTransfer}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-colors ${
                    getActionLabel().includes('Licencier') ? 'bg-red-500 hover:bg-red-600 text-white' : 
                    getActionLabel().includes('Recruter') ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 
                    'bg-white text-slate-900 hover:bg-indigo-50'
                }`}
            >
                {getActionLabel()} (Force)
            </button>
        </div>
    </div>
  );
};
