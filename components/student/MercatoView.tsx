
import React, { useState } from 'react';
import { Agency, Student, MercatoRequest, MergerRequest } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL, storage } from '../../services/firebase';
import { GAME_RULES } from '../../constants';
import { Building2, ArrowRightLeft, Check, X } from 'lucide-react';

// IMPORT SUB-COMPONENTS
import { CVModal, MotivationModal } from './mercato/MercatoModals';
import { UnemployedView } from './mercato/UnemployedView';
import { AgencyDemocracy } from './mercato/AgencyDemocracy';
import { TeamManagement } from './mercato/TeamManagement';
import { RecruitmentPool } from './mercato/RecruitmentPool';

interface MercatoViewProps {
  agency: Agency;
  allAgencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
  onUpdateAgencies: (agencies: Agency[]) => void;
}

export const MercatoView: React.FC<MercatoViewProps> = ({ agency, allAgencies, onUpdateAgency, onUpdateAgencies }) => {
  const { toast } = useUI();
  const { submitMercatoVote, getCurrentGameWeek, proposeMerger, finalizeMerger } = useGame();
  const { currentUser: authUser } = useAuth();
  
  const [isCVModalOpen, setIsCVModalOpen] = useState(false);
  const [isMotivationModalOpen, setIsMotivationModalOpen] = useState(false);
  const [showMergerModal, setShowMergerModal] = useState(false);
  
  // State for Actions
  const [actionType, setActionType] = useState<'HIRE' | 'FIRE' | 'RESIGN' | 'FOUND'>('HIRE');
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [targetAgencyId, setTargetAgencyId] = useState<string | null>(null);
  const [motivationText, setMotivationText] = useState("");

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isUploadingCV, setIsUploadingCV] = useState(false);

  const currentUser = agency.members.find(m => m.id === authUser?.uid);

  const availableAgencies = allAgencies.filter(a => a.id !== 'unassigned' && a.classId === currentUser?.classId);
  const unemployedAgency = allAgencies.find(a => a.id === 'unassigned');

  const currentWeek = getCurrentGameWeek();
  const canMerge = currentWeek >= GAME_RULES.UNLOCK_WEEK_MERGERS;

  const handleSubmitRequest = () => {
      if(motivationText.length < 5) {
          toast('error', 'La motivation doit faire au moins 5 caractères.');
          return;
      }

      if (!currentUser) return;

      const today = new Date().toISOString().split('T')[0];
      let newRequest: MercatoRequest | null = null;

      if (actionType === 'FOUND') {
          newRequest = {
            id: `req-found-${Date.now()}`, type: 'FOUND_AGENCY',
            studentId: currentUser.id, studentName: currentUser.name,
            requesterId: currentUser.id, targetAgencyId: 'new',
            status: 'PENDING', date: today, motivation: motivationText,
            votes: {} 
          };
          if (unemployedAgency) {
              const updatedUnassigned = { ...unemployedAgency, mercatoRequests: [...unemployedAgency.mercatoRequests, newRequest] };
              onUpdateAgency(updatedUnassigned);
              toast('success', "Demande de fondation envoyée à l'enseignant !");
          }
      } else if (actionType === 'HIRE' && targetStudent) {
          newRequest = {
            id: `req-${Date.now()}`, type: 'HIRE',
            studentId: targetStudent.id, studentName: targetStudent.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: { [currentUser.id]: 'APPROVE' } 
          };
      } else if (actionType === 'FIRE' && targetStudent) {
          newRequest = {
            id: `req-${Date.now()}`, type: 'FIRE',
            studentId: targetStudent.id, studentName: targetStudent.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: { [currentUser.id]: 'APPROVE' } 
          };
      } else if (actionType === 'RESIGN') {
          newRequest = {
            id: `req-${Date.now()}`, type: 'FIRE', 
            studentId: currentUser.id, studentName: currentUser.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: {} 
          };
      } else if (actionType === 'HIRE' && targetAgencyId) {
          newRequest = {
            id: `req-${Date.now()}`, type: 'HIRE',
            studentId: currentUser.id, studentName: currentUser.name,
            requesterId: currentUser.id, targetAgencyId: targetAgencyId,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: {} 
          };
          const targetAgency = allAgencies.find(a => a.id === targetAgencyId);
          if (targetAgency) {
              const updatedAgencies = allAgencies.map(a => 
                  a.id === targetAgencyId 
                  ? { ...a, mercatoRequests: [...a.mercatoRequests, newRequest!] } 
                  : a
              );
              onUpdateAgencies(updatedAgencies);
              toast('success', "Candidature envoyée !");
              setIsMotivationModalOpen(false);
              return;
          }
      }

      if (newRequest && agency.id !== 'unassigned' && actionType !== 'FOUND') {
          onUpdateAgency({
              ...agency,
              mercatoRequests: [...agency.mercatoRequests, newRequest]
          });
          toast('success', 'Demande envoyée. Le vote est ouvert !');
      }
      setIsMotivationModalOpen(false);
      setMotivationText("");
  };

  const handleVote = async (request: MercatoRequest, vote: 'APPROVE' | 'REJECT') => {
      if (!currentUser) return;
      await submitMercatoVote(agency.id, request.id, currentUser.id, vote);
  };

  const openHireModal = (student: Student) => {
      setActionType('HIRE');
      setTargetStudent(student);
      setMotivationText("");
      setIsMotivationModalOpen(true);
  }

  const openFireModal = (student: Student) => {
      setActionType('FIRE');
      setTargetStudent(student);
      setMotivationText("");
      setIsMotivationModalOpen(true);
  }

  const openResignModal = () => {
      setActionType('RESIGN');
      setMotivationText("");
      setIsMotivationModalOpen(true);
  }

  const openApplyModal = (agencyId: string) => {
      if (agencyId === 'new') {
          setActionType('FOUND');
          setTargetAgencyId(null);
      } else {
          setActionType('HIRE'); 
          setTargetAgencyId(agencyId);
      }
      setMotivationText("");
      setIsMotivationModalOpen(true);
  }

  const handleUploadCV = async () => {
    if(!currentUser || !cvFile) return;
    setIsUploadingCV(true);
    try {
        const storageRef = ref(storage, `resumes/${currentUser.id}_${cvFile.name}`);
        await uploadBytes(storageRef, cvFile);
        const downloadUrl = await getDownloadURL(storageRef);
        const updatedMembers = agency.members.map(m => 
            m.id === currentUser.id ? { ...m, cvUrl: downloadUrl } : m
        );
        onUpdateAgency({ ...agency, members: updatedMembers });
        setIsCVModalOpen(false);
        setCvFile(null);
        toast('success', "CV mis à jour !");
    } catch (error) {
        console.error(error);
        toast('error', "Erreur lors de l'upload du CV.");
    } finally {
        setIsUploadingCV(false);
    }
  };

  const handleProposeMerger = async (targetId: string) => {
      await proposeMerger(agency.id, targetId);
      setShowMergerModal(false);
  };

  const handleMergerResponse = async (req: MergerRequest, approved: boolean) => {
      await finalizeMerger(req.id, agency.id, approved);
  };

  if (agency.id === 'unassigned') {
      return (
          <>
            <UnemployedView 
                currentUser={currentUser}
                availableAgencies={availableAgencies}
                onOpenCVModal={() => setIsCVModalOpen(true)}
                onOpenApplyModal={openApplyModal}
            />
            <CVModal 
                isOpen={isCVModalOpen} 
                onClose={() => setIsCVModalOpen(false)} 
                cvFile={cvFile} 
                setCvFile={setCvFile} 
                handleUploadCV={handleUploadCV} 
                isUploadingCV={isUploadingCV} 
            />
            <MotivationModal 
                isOpen={isMotivationModalOpen} 
                onClose={() => setIsMotivationModalOpen(false)} 
                onSubmit={handleSubmitRequest} 
                motivation={motivationText} 
                setMotivation={setMotivationText} 
                title={actionType === 'FOUND' ? "Nom & Vision du Studio" : "Pourquoi vous ?"} 
                subtitle={actionType === 'FOUND' ? "Décrivez brièvement votre projet de studio." : "Expliquez à l'agence pourquoi elle devrait vous recruter."}
            />
          </>
      );
  }

  const potentialTargets = allAgencies.filter(a => a.id !== 'unassigned' && a.id !== agency.id && a.ve_current < GAME_RULES.MERGER_VE_THRESHOLD && a.classId === agency.classId);

  return (
    <div className="animate-in fade-in space-y-8">
        {agency.mergerRequests && agency.mergerRequests.length > 0 && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-500 relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Building2 className="text-emerald-400"/> Offre de Rachat Reçue !</h3>
                    <div className="space-y-3">
                        {agency.mergerRequests.map(req => (
                            <div key={req.id} className="bg-white/10 p-4 rounded-xl border border-white/20">
                                <p className="font-bold text-lg mb-1">{req.requesterAgencyName} veut vous absorber.</p>
                                <p className="text-sm italic opacity-80 mb-4">"{req.offerDetails}"</p>
                                <div className="flex gap-4">
                                    <button onClick={() => handleMergerResponse(req, true)} className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                                        <Check size={16}/> Accepter (Fusion)
                                    </button>
                                    <button onClick={() => handleMergerResponse(req, false)} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                                        <X size={16}/> Refuser
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <AgencyDemocracy 
            agency={agency} 
            currentUser={currentUser} 
            onVote={handleVote} 
        />

        <TeamManagement 
            agency={agency}
            currentUser={currentUser}
            onOpenResignModal={openResignModal}
            onOpenFireModal={openFireModal}
        />

        {/* Fix: Changed unassignedAgency?.members to unemployedAgency?.members */}
        <RecruitmentPool 
            agency={agency}
            unemployedStudents={unemployedAgency?.members || []}
            onOpenHireModal={openHireModal}
        />

        {canMerge && (
            <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={20} className="text-indigo-600"/> Fusions & Acquisitions (M&A)
                    </h3>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                    <p className="text-sm text-indigo-800 mb-4">
                        Vous pouvez proposer de racheter une agence en difficulté (VE &lt; {GAME_RULES.MERGER_VE_THRESHOLD}). 
                        <br/><strong>Condition :</strong> Vous absorbez leurs membres (Max {GAME_RULES.MERGER_MAX_MEMBERS} total) et leurs dettes.
                    </p>
                    
                    {potentialTargets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {potentialTargets.map(target => (
                                <div key={target.id} className="bg-white p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{target.name}</h4>
                                        <div className="flex gap-2 text-xs mt-1">
                                            <span className="text-red-500 font-bold">VE: {target.ve_current}</span>
                                            <span className="text-slate-500">{target.members.length} membres</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleProposeMerger(target.id)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Proposer Rachat
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-400 text-sm italic">
                            Aucune cible potentielle (VE &lt; 40) disponible sur le marché.
                        </div>
                    )}
                </div>
            </div>
        )}

        <MotivationModal 
            isOpen={isMotivationModalOpen} 
            onClose={() => setIsMotivationModalOpen(false)} 
            onSubmit={handleSubmitRequest} 
            motivation={motivationText} 
            setMotivation={setMotivationText} 
            title={actionType === 'FIRE' ? "Motif du renvoi" : actionType === 'RESIGN' ? "Motif de départ" : actionType === 'FOUND' ? "Fondation de Studio" : "Proposition d'embauche"}
            subtitle={actionType === 'FIRE' ? "Expliquez pourquoi vous souhaitez vous séparer de ce collaborateur (Vote requis 75%)." : actionType === 'RESIGN' ? "Pourquoi quittez-vous le navire ?" : actionType === 'FOUND' ? "Donnez un nom provisoire et votre vision." : "Message pour l'équipe (Vote requis 66%)."}
        />
        
        <CVModal 
            isOpen={isCVModalOpen} 
            onClose={() => setIsCVModalOpen(false)} 
            cvFile={cvFile} 
            setCvFile={setCvFile} 
            handleUploadCV={handleUploadCV} 
            isUploadingCV={isUploadingCV} 
        />
    </div>
  );
};
