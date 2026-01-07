
import React, { useState, useMemo } from 'react';
import { Agency, GameEvent, MercatoRequest, StudentHistoryEntry } from '../types';
import { ArrowRightLeft, UserPlus, UserMinus, Briefcase, Plus, AlertCircle, Check, X, FileSearch, UserX, Coins, Quote, User, Info } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { GAME_RULES } from '../constants';

interface AdminMercatoProps {
  agencies: Agency[];
  onUpdateAgencies: (agencies: Agency[]) => void;
  readOnly?: boolean;
}

export const AdminMercato: React.FC<AdminMercatoProps> = ({ agencies, onUpdateAgencies, readOnly }) => {
  const { confirm, toast } = useUI();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [targetAgencyId, setTargetAgencyId] = useState<string | null>(null);

  // Separate Unassigned (Chômage) from Active Agencies
  const unassignedAgency = agencies.find(a => a.id === 'unassigned');
  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  // Collect all Pending Requests including HIRE from outside
  const pendingRequests = useMemo(() => {
      const requests: {req: MercatoRequest, agency: Agency}[] = [];
      agencies.forEach(a => {
          // Both unassigned and assigned agencies might have requests
          (a.mercatoRequests || []).forEach(r => {
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

  const calculateFiringVEDelta = (score: number) => {
      if (score < 30) return 10;
      if (score < 50) return 5;
      if (score < 70) return -5;
      if (score < 90) return -15;
      return -25;
  };

  const executeTransfer = (studentId: string, sourceAgencyId: string, targetAgencyId: string, transferType: 'HIRE' | 'FIRE' | 'TRANSFER', reason?: string) => {
    const sourceAgency = agencies.find(a => a.id === sourceAgencyId);
    const targetAgency = agencies.find(a => a.id === targetAgencyId);
    const student = sourceAgency?.members.find(m => m.id === studentId);

    if (!sourceAgency || !targetAgency || !student) return;

    const today = new Date().toISOString().split('T')[0];
    const newHistory: StudentHistoryEntry[] = [...(student.history || [])];
    
    if (sourceAgencyId !== 'unassigned') {
        newHistory.push({
            date: today, agencyId: sourceAgency.id, agencyName: sourceAgency.name,
            action: transferType === 'FIRE' ? 'FIRED' : 'LEFT',
            contextVE: sourceAgency.ve_current, contextBudget: sourceAgency.budget_real,
            reason: reason || (transferType === 'FIRE' ? "Licenciement" : "Départ")
        });
    }

    if (targetAgencyId !== 'unassigned') {
        newHistory.push({
            date: today, agencyId: targetAgency.id, agencyName: targetAgency.name,
            action: 'JOINED', contextVE: targetAgency.ve_current, contextBudget: targetAgency.budget_real,
            reason: reason || "Recrutement"
        });
    }

    const updatedStudent = { ...student, history: newHistory };
    const updatedSourceMembers = sourceAgency.members.filter(m => m.id !== student.id);
    const updatedSource = { ...sourceAgency, members: updatedSourceMembers };
    const updatedTargetMembers = [...targetAgency.members, updatedStudent];
    const updatedTarget = { ...targetAgency, members: updatedTargetMembers };

    let eventSource: GameEvent | null = null;
    let eventTarget: GameEvent | null = null;
    let sourceVEDelta = 0;
    let targetVEDelta = 0;

    if (transferType === 'FIRE') {
        sourceVEDelta = calculateFiringVEDelta(student.individualScore);
        let label = sourceVEDelta > 0 ? "Restructuration" : "Perte Compétence";
        eventSource = {
            id: `evt-${Date.now()}-1`, date: today, type: sourceVEDelta > 0 ? 'VE_DELTA' : 'CRISIS',
            label: label, deltaVE: sourceVEDelta,
            description: `Départ de ${student.name}.`
        };
    } else if (transferType === 'HIRE') {
        targetVEDelta = -5;
        eventTarget = {
            id: `evt-${Date.now()}-2`, date: today, type: 'VE_DELTA', label: 'Recrutement Ext.', deltaVE: targetVEDelta,
            description: `${student.name} rejoint l'équipe.`
        };
    } else {
         sourceVEDelta = -5; targetVEDelta = -2;
         eventSource = { id: `evt-${Date.now()}-1`, date: today, type: 'VE_DELTA', label: 'Transfert Sortant', deltaVE: sourceVEDelta, description: `${student.name} quitte l'agence.` };
         eventTarget = { id: `evt-${Date.now()}-2`, date: today, type: 'VE_DELTA', label: 'Transfert Entrant', deltaVE: targetVEDelta, description: `${student.name} rejoint l'agence.` };
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
     if(readOnly) return;
     if (!selectedStudentId || !targetAgencyId) return;
     const sourceData = findStudentData(selectedStudentId);
     if (!sourceData) return;

     const student = sourceData.student;
     const targetAgency = agencies.find(a => a.id === targetAgencyId);
     
     if (targetAgency && targetAgency.id !== 'unassigned' && targetAgency.classId !== student.classId) {
         toast('error', `Classes incompatibles (Étudiant ${student.classId} -> Agence ${targetAgency.classId})`);
         return;
     }
     
     const type = sourceData.agency.id === 'unassigned' ? 'HIRE' : targetAgencyId === 'unassigned' ? 'FIRE' : 'TRANSFER';
     const confirmed = await confirm({
         title: "Confirmation de Mouvement RH",
         message: `Forcer le mouvement de ${student.name} ?\nDe ${sourceData.agency.name} vers ${targetAgency?.name || 'Chômage'}`,
         confirmText: "Valider", isDangerous: type === 'FIRE'
     });

     if (!confirmed) return;

     const newAgencies = executeTransfer(selectedStudentId, sourceData.agency.id, targetAgencyId, type, "Action Admin");
     if(newAgencies) {
         onUpdateAgencies(newAgencies);
         toast('success', `Transfert effectué`);
         setSelectedStudentId(null); setTargetAgencyId(null);
     }
  };

  const handleApproveRequest = (request: MercatoRequest, requestAgency: Agency) => {
      if(readOnly) return;
      let newAgencies: Agency[] | undefined;
      const studentData = findStudentData(request.studentId);
      if(!studentData) return;

      if (request.type === 'FIRE') {
          newAgencies = executeTransfer(request.studentId, request.targetAgencyId, 'unassigned', 'FIRE', request.motivation);
      } else if (request.type === 'HIRE') {
          newAgencies = executeTransfer(request.studentId, studentData.agency.id, request.targetAgencyId, 'HIRE', request.motivation);
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
      if(readOnly) return;
      const updatedAgency = { ...requestAgency, mercatoRequests: requestAgency.mercatoRequests.filter(r => r.id !== request.id) };
      onUpdateAgencies(agencies.map(a => a.id === updatedAgency.id ? updatedAgency : a));
      toast('info', 'Demande rejetée.');
  };

  const handleCreateAgency = async () => {
      if(readOnly) return;
      let founderId = selectedStudentId && findStudentData(selectedStudentId)?.agency.id === 'unassigned' ? selectedStudentId : null;
      let founder = founderId ? findStudentData(founderId)?.student : null;

      if (founder) {
          const proceed = await confirm({ title: "Fonder une Agence", message: `Voulez-vous que ${founder.name} fonde ce studio ? (-${GAME_RULES.CREATION_COST_PIXI} PiXi / -${GAME_RULES.CREATION_COST_SCORE} pts)`, confirmText: "Payer et Créer", isDangerous: true });
          if (!proceed) return;
      } else {
          if (!await confirm({ title: "Création Agence", message: "Créer une agence vide ?", confirmText: "Créer" })) return;
      }

      const newAgencyId = `a-${Date.now()}`;
      const newAgency: Agency = {
          id: newAgencyId, name: "Nouveau Studio", tagline: "En construction...", ve_current: 20, status: 'critique',
          classId: founder ? founder.classId : 'A', budget_real: 2000, budget_valued: 0, weeklyTax: 0, weeklyRevenueModifier: 0,
          members: [], peerReviews: [], eventLog: [{ id: `e-${newAgencyId}-1`, date: new Date().toISOString().split('T')[0], type: "INFO", label: "Ouverture Studio", deltaVE: 0, description: "Ouverture du compte." }],
          currentCycle: agencies[0].currentCycle, constraints: { space: "À définir", style: "À définir", client: "À définir" },
          projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: false },
          mercatoRequests: [], transactionRequests: [], branding: { color: 'indigo' }, badges: [], progress: JSON.parse(JSON.stringify(agencies[0].progress))
      };

      let updatedAgencies = [...agencies, newAgency];
      if (founder && founderId) {
         const unassigned = agencies.find(a => a.id === 'unassigned');
         if (unassigned) {
             const updatedFounder = { ...founder, wallet: (founder.wallet || 0) - GAME_RULES.CREATION_COST_PIXI, individualScore: Math.max(0, founder.individualScore - GAME_RULES.CREATION_COST_SCORE) };
             updatedAgencies = updatedAgencies.map(a => {
                 if (a.id === 'unassigned') return { ...a, members: a.members.filter(m => m.id !== founderId) };
                 if (a.id === newAgencyId) return { ...a, members: [updatedFounder] };
                 return a;
             });
         }
      }
      onUpdateAgencies(updatedAgencies);
      toast('success', 'Studio créé.');
      setSelectedStudentId(null);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900">Mercato & RH</h2>
                <p className="text-slate-500 text-sm">Gérez les candidatures et les mouvements d'effectifs.</p>
            </div>
            {!readOnly && (
            <button onClick={handleCreateAgency} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg">
                <Plus size={18} /> {selectedStudentId && findStudentData(selectedStudentId)?.agency.id === 'unassigned' ? "Fonder Agence (Sélection)" : "Créer un Groupe"}
            </button>
            )}
        </div>

        {/* --- SECTION: PENDING REQUESTS --- */}
        {pendingRequests.length > 0 && (
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-4">
                    <AlertCircle size={20}/> Demandes & Candidatures en attente ({pendingRequests.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingRequests.map(({req, agency}) => {
                        const studentData = findStudentData(req.studentId);
                        const student = studentData?.student;
                        const sourceAgency = studentData?.agency;
                        const isExternalApply = sourceAgency?.id === 'unassigned' && req.type === 'HIRE';
                        const isResignation = req.requesterId === req.studentId && req.type === 'FIRE';

                        return (
                            <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                            isExternalApply ? 'bg-indigo-600 text-white' : 
                                            req.type === 'HIRE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {isExternalApply ? 'Candidature' : req.type === 'HIRE' ? 'Embauche' : (isResignation ? 'Démission' : 'Renvoi')}
                                        </span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded font-bold">Cl. {student?.classId}</span>
                                    </div>
                                    {!readOnly && (
                                    <div className="flex gap-1">
                                        <button onClick={() => handleRejectRequest(req, agency)} className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg"><X size={16}/></button>
                                        <button onClick={() => handleApproveRequest(req, agency)} className="p-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg"><Check size={16}/></button>
                                    </div>
                                    )}
                                </div>

                                <div className="mt-1">
                                    <p className="font-bold text-slate-900 text-sm">
                                        {req.studentName}
                                        <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                                            {isExternalApply ? `veut rejoindre ${agency.name}` : `veut quitter ${agency.name}`}
                                        </span>
                                    </p>
                                    <div className="bg-slate-50 p-2 rounded-lg mt-2 flex gap-2 border border-slate-100">
                                        <Quote size={12} className="text-slate-300 shrink-0"/>
                                        <p className="text-xs text-slate-600 italic">"{req.motivation || 'Pas de motivation'}"</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Briefcase size={16}/> Vivier / Pôle Chômage
                </h3>
                <div className={`border-2 border-dashed rounded-2xl p-4 mb-8 transition-colors ${targetAgencyId === 'unassigned' ? 'bg-red-50 border-red-300' : 'bg-slate-100 border-slate-300'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-slate-500 italic">Cliquez sur un étudiant pour le sélectionner, puis choisissez une destination.</p>
                        <button onClick={() => !readOnly && setTargetAgencyId('unassigned')} disabled={readOnly} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${targetAgencyId === 'unassigned' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                            Destination: Licenciement
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {unassignedAgency?.members.map(student => (
                            <div key={student.id} onClick={() => !readOnly && setSelectedStudentId(student.id)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedStudentId === student.id ? 'bg-white border-indigo-500 shadow-md transform scale-105' : 'bg-white border-slate-200'}`}>
                                <img src={student.avatarUrl} className="w-8 h-8 rounded-full grayscale" />
                                <div>
                                    <p className="font-bold text-slate-700 text-sm leading-none">{student.name}</p>
                                    <span className={`text-[9px] font-bold px-1.5 rounded text-white ${student.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>CLASSE {student.classId}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><UserPlus size={16}/> Agences Actives</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeAgencies.map(agency => (
                        <div key={agency.id} className={`bg-white rounded-2xl border transition-all relative overflow-hidden ${targetAgencyId === agency.id ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className={`absolute top-0 left-0 right-0 h-1 ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                            <div onClick={() => !readOnly && setTargetAgencyId(agency.id)} className={`p-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl mt-1 transition-colors cursor-pointer ${targetAgencyId === agency.id ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                                <div>
                                    <h4 className="font-bold text-slate-700">{agency.name}</h4>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">CLASSE {agency.classId}</span>
                                </div>
                                {targetAgencyId === agency.id && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 rounded-full font-bold">Cible</span>}
                            </div>
                            <div className="p-4 space-y-2">
                                {agency.members.map(student => (
                                    <div key={student.id} onClick={(e) => { e.stopPropagation(); if(!readOnly) setSelectedStudentId(student.id); }} className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${selectedStudentId === student.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-700'}`}>
                                        <img src={student.avatarUrl} className="w-8 h-8 rounded-full" />
                                        <div className="flex-1">
                                            <p className="font-bold text-sm leading-none">{student.name}</p>
                                            <p className="text-[10px] mt-0.5 opacity-70">{student.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {!readOnly && selectedStudentId && targetAgencyId && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 md:ml-32 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50">
            <div className="flex items-center gap-3">
                 <div className="text-right">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Source: {findStudentData(selectedStudentId)?.agency.name}</span>
                 </div>
                 <ArrowRightLeft className="text-slate-500" />
                 <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Cible: {targetAgencyId === 'unassigned' ? 'Chômage' : agencies.find(a => a.id === targetAgencyId)?.name}</span>
                 </div>
            </div>
            <button onClick={handleManualTransfer} className="bg-white text-slate-900 px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50">Transférer (Force)</button>
        </div>
        )}
    </div>
  );
};
