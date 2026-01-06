
import React, { useState } from 'react';
import { Agency, Student, MercatoRequest } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';

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
  const { submitMercatoVote } = useGame();
  const { currentUser: authUser } = useAuth();
  
  const [isCVModalOpen, setIsCVModalOpen] = useState(false);
  const [isMotivationModalOpen, setIsMotivationModalOpen] = useState(false);
  
  // State for Actions
  const [actionType, setActionType] = useState<'HIRE' | 'FIRE' | 'RESIGN'>('HIRE');
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [targetAgencyId, setTargetAgencyId] = useState<string | null>(null);
  const [motivationText, setMotivationText] = useState("");

  // CV Upload State
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isUploadingCV, setIsUploadingCV] = useState(false);

  // Identity logic
  const currentUser = agency.members.find(m => m.id === authUser?.uid);

  // Lists Logic
  // CORRECTION: Filter available agencies based on the CURRENT USER'S CLASS, not the first member of the unemployment pool.
  const availableAgencies = allAgencies.filter(a => a.id !== 'unassigned' && a.classId === currentUser?.classId);
  
  const unemployedAgency = allAgencies.find(a => a.id === 'unassigned');
  const allUnemployed = unemployedAgency ? unemployedAgency.members : [];

  // --- GENERIC REQUEST HANDLER ---
  const handleSubmitRequest = () => {
      if(motivationText.length < 10) {
          toast('error', 'La motivation doit faire au moins 10 caractères.');
          return;
      }

      if (!currentUser) return;

      const today = new Date().toISOString().split('T')[0];
      let newRequest: MercatoRequest | null = null;

      if (actionType === 'HIRE' && targetStudent) {
          // Agency wants to hire Unemployed
          newRequest = {
            id: `req-${Date.now()}`, type: 'HIRE',
            studentId: targetStudent.id, studentName: targetStudent.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: { [currentUser.id]: 'APPROVE' } // Auto-vote yes for requester
          };
      } else if (actionType === 'FIRE' && targetStudent) {
          // Agency wants to fire Member
          newRequest = {
            id: `req-${Date.now()}`, type: 'FIRE',
            studentId: targetStudent.id, studentName: targetStudent.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: { [currentUser.id]: 'APPROVE' } // Auto-vote yes for requester
          };
      } else if (actionType === 'RESIGN') {
          // Member wants to leave
          newRequest = {
            id: `req-${Date.now()}`, type: 'FIRE', // Technical type is FIRE (leaving agency)
            studentId: currentUser.id, studentName: currentUser.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: {} 
          };
      } else if (actionType === 'HIRE' && targetAgencyId) {
          // Unemployed wants to join Agency (APPLY)
          newRequest = {
            id: `req-${Date.now()}`, type: 'HIRE',
            studentId: currentUser.id, studentName: currentUser.name,
            requesterId: currentUser.id, targetAgencyId: targetAgencyId,
            status: 'PENDING', date: today, motivation: motivationText,
            votes: {} 
          };
          
          // Must update target agency, not current (unassigned)
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

      if (newRequest && agency.id !== 'unassigned') {
          onUpdateAgency({
              ...agency,
              mercatoRequests: [...agency.mercatoRequests, newRequest]
          });
          toast('success', 'Demande envoyée. Le vote est ouvert !');
      }
      setIsMotivationModalOpen(false);
      setMotivationText("");
  };

  // --- VOTING HANDLER ---
  const handleVote = async (request: MercatoRequest, vote: 'APPROVE' | 'REJECT') => {
      if (!currentUser) return;
      await submitMercatoVote(agency.id, request.id, currentUser.id, vote);
  };

  // --- OPEN MODALS HANDLERS ---
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
      setActionType('HIRE'); // Asking to be hired
      setTargetAgencyId(agencyId);
      setMotivationText("");
      setIsMotivationModalOpen(true);
  }

  // --- HANDLE CV UPLOAD ---
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
        onUpdateAgency({
            ...agency,
            members: updatedMembers
        });
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

  // -----------------------------------------------------------
  // VIEW FOR UNEMPLOYED
  // -----------------------------------------------------------
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
                title="Pourquoi vous ?" 
                subtitle="Expliquez à l'agence pourquoi elle devrait vous recruter."
            />
          </>
      );
  }

  // -----------------------------------------------------------
  // VIEW FOR AGENCY MEMBERS
  // -----------------------------------------------------------
  return (
    <div className="animate-in fade-in space-y-8">
        
        {/* 1. DEMOCRACY (VOTES) */}
        <AgencyDemocracy 
            agency={agency} 
            currentUser={currentUser} 
            onVote={handleVote} 
        />

        {/* 2. TEAM MANAGEMENT & STATUS */}
        <TeamManagement 
            agency={agency}
            currentUser={currentUser}
            onOpenResignModal={openResignModal}
            onOpenFireModal={openFireModal}
        />

        {/* 3. RECRUITMENT POOL */}
        <RecruitmentPool 
            agency={agency}
            unemployedStudents={allUnemployed}
            onOpenHireModal={openHireModal}
        />

        {/* MODALS */}
        <MotivationModal 
            isOpen={isMotivationModalOpen} 
            onClose={() => setIsMotivationModalOpen(false)} 
            onSubmit={handleSubmitRequest} 
            motivation={motivationText} 
            setMotivation={setMotivationText} 
            title={actionType === 'FIRE' ? "Motif du renvoi" : actionType === 'RESIGN' ? "Motif de départ" : "Proposition d'embauche"}
            subtitle={actionType === 'FIRE' ? "Expliquez pourquoi vous souhaitez vous séparer de ce collaborateur (Vote requis 75%)." : actionType === 'RESIGN' ? "Pourquoi quittez-vous le navire ?" : "Message pour l'équipe (Vote requis 66%)."}
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
