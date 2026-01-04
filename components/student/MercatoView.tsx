
import React, { useState } from 'react';
import { Agency, Student, MercatoRequest } from '../../types';
import { Briefcase, UserPlus, UserMinus, FileText, Upload, Clock, UserX, Coins, FileSearch, Loader2, Send } from 'lucide-react';
import { Modal } from '../Modal';
import { GAME_RULES, MASCOTS } from '../../constants';
import { useUI } from '../../contexts/UIContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';

interface MercatoViewProps {
  agency: Agency;
  allAgencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
  onUpdateAgencies: (agencies: Agency[]) => void;
}

export const MercatoView: React.FC<MercatoViewProps> = ({ agency, allAgencies, onUpdateAgency, onUpdateAgencies }) => {
  const { toast, confirm } = useUI();
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

  // Active Agencies for Job Seekers (Filter by my class)
  const availableAgencies = allAgencies.filter(a => a.id !== 'unassigned' && a.classId === agency.members[0].classId);

  // FILTER CHÔMAGE: Only show students from my class for Recruimtent
  const unemployedAgency = allAgencies.find(a => a.id === 'unassigned');
  const allUnemployed = unemployedAgency ? unemployedAgency.members : [];
  const myClassUnemployed = agency.id !== 'unassigned' 
    ? allUnemployed.filter(s => s.classId === agency.classId)
    : [];
  
  // Current user mock (first member of current agency)
  const currentUser = agency.members[0];

  // --- GENERIC REQUEST HANDLER ---
  const handleSubmitRequest = () => {
      if(motivationText.length < 10) {
          toast('error', 'La motivation doit faire au moins 10 caractères.');
          return;
      }

      const today = new Date().toISOString().split('T')[0];
      let newRequest: MercatoRequest | null = null;

      if (actionType === 'HIRE' && targetStudent) {
          // Agency wants to hire Unemployed
          newRequest = {
            id: `req-${Date.now()}`, type: 'HIRE',
            studentId: targetStudent.id, studentName: targetStudent.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText
          };
      } else if (actionType === 'FIRE' && targetStudent) {
          // Agency wants to fire Member
          newRequest = {
            id: `req-${Date.now()}`, type: 'FIRE',
            studentId: targetStudent.id, studentName: targetStudent.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText
          };
      } else if (actionType === 'RESIGN') {
          // Member wants to leave
          newRequest = {
            id: `req-${Date.now()}`, type: 'FIRE', // Technical type is FIRE (leaving agency)
            studentId: currentUser.id, studentName: currentUser.name,
            requesterId: currentUser.id, targetAgencyId: agency.id,
            status: 'PENDING', date: today, motivation: motivationText
          };
      } else if (actionType === 'HIRE' && targetAgencyId) {
          // Unemployed wants to join Agency
          newRequest = {
            id: `req-${Date.now()}`, type: 'HIRE',
            studentId: currentUser.id, studentName: currentUser.name,
            requesterId: currentUser.id, targetAgencyId: targetAgencyId,
            status: 'PENDING', date: today, motivation: motivationText
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
          toast('success', 'Demande envoyée à l\'administration.');
      }
      setIsMotivationModalOpen(false);
      setMotivationText("");
  };

  // --- OPEN MODALS ---
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

  const hasPendingResignation = agency.mercatoRequests.find(r => r.studentId === currentUser?.id && r.requesterId === currentUser?.id && r.type === 'FIRE' && r.status === 'PENDING');

  // -----------------------------------------------------------
  // VIEW FOR UNEMPLOYED
  // -----------------------------------------------------------
  if (agency.id === 'unassigned') {
      return (
          <div className="animate-in fade-in space-y-6">
              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl">
                  <h3 className="text-red-700 font-bold text-lg flex items-center gap-2">
                      <Briefcase size={24}/> Statut: Sans Emploi
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${currentUser.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                          CLASSE {currentUser.classId}
                      </span>
                      <p className="text-red-600/80 text-sm">
                          Postulez uniquement dans les agences de votre classe.
                      </p>
                  </div>
              </div>

              {/* MON CV */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-900">Mon Dossier Professionnel</h4>
                      {currentUser?.cvUrl && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">CV en ligne</span>}
                  </div>
                  
                  {currentUser?.cvUrl ? (
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                           <FileText size={32} className="text-indigo-500"/>
                           <div className="flex-1 overflow-hidden">
                                <p className="font-bold text-slate-900 truncate">CV_{currentUser.name.replace(' ', '_')}.pdf</p>
                                <a href={currentUser.cvUrl} target="_blank" className="text-xs text-indigo-600 hover:underline">Voir le document</a>
                           </div>
                           <button onClick={() => setIsCVModalOpen(true)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500">
                                <Upload size={18}/>
                           </button>
                      </div>
                  ) : (
                      <button 
                        onClick={() => setIsCVModalOpen(true)}
                        className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-500 transition-all flex flex-col items-center gap-2"
                      >
                          <Upload size={32}/>
                          <span className="font-bold text-sm">Déposer mon CV (PDF)</span>
                      </button>
                  )}
              </div>

              {/* LISTE DES AGENCES */}
              <div>
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <UserPlus size={20} className="text-emerald-500"/> Offres d'Emploi (Classe {currentUser.classId})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableAgencies.map(targetAgency => {
                          // Check if I already applied
                          const isPending = targetAgency.mercatoRequests.some(r => r.studentId === currentUser.id && r.status === 'PENDING');
                          
                          return (
                              <div key={targetAgency.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                  <div className="flex justify-between items-start mb-2">
                                      <h5 className="font-bold text-slate-900">{targetAgency.name}</h5>
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${targetAgency.status === 'stable' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {targetAgency.status}
                                      </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-4 line-clamp-2 italic">"{targetAgency.tagline}"</p>
                                  
                                  {isPending ? (
                                      <button disabled className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-lg text-xs cursor-not-allowed">
                                          Candidature envoyée
                                      </button>
                                  ) : (
                                      <button 
                                          onClick={() => openApplyModal(targetAgency.id)}
                                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
                                      >
                                          <Send size={14}/> Postuler
                                      </button>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* MODALS */}
              <CVModal isOpen={isCVModalOpen} onClose={() => setIsCVModalOpen(false)} cvFile={cvFile} setCvFile={setCvFile} handleUploadCV={handleUploadCV} isUploadingCV={isUploadingCV} />
              <MotivationModal 
                isOpen={isMotivationModalOpen} 
                onClose={() => setIsMotivationModalOpen(false)} 
                onSubmit={handleSubmitRequest} 
                motivation={motivationText} 
                setMotivation={setMotivationText} 
                title="Pourquoi vous ?"
                subtitle="Expliquez à l'agence pourquoi elle devrait vous recruter."
              />
          </div>
      );
  }

  // -----------------------------------------------------------
  // VIEW FOR AGENCY MEMBERS
  // -----------------------------------------------------------
  return (
    <div className="animate-in fade-in space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT: MY STATUS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserMinus size={20} className="text-slate-400"/> Mon Statut
                </h3>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-sm text-slate-500">Score Individuel</p>
                        <p className={`text-2xl font-bold ${currentUser?.individualScore < 50 ? 'text-red-500' : 'text-slate-900'}`}>
                            {currentUser?.individualScore}/100
                        </p>
                        <p className="text-xs text-red-500 font-bold mt-1">Coût: -{currentUser?.individualScore * GAME_RULES.SALARY_MULTIPLIER} € / sem</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                        CLASSE {agency.classId}
                    </span>
                </div>
                {hasPendingResignation ? (
                    <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-200 text-sm font-bold flex items-center gap-2">
                        <Clock size={16}/> Démission en cours
                    </div>
                ) : (
                    <button 
                        onClick={openResignModal}
                        className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-sm transition-colors"
                    >
                        Demander ma démission
                    </button>
                )}
            </div>

            {/* RIGHT: TEAM MANAGEMENT (FIRE OTHERS) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserX size={20} className="text-slate-400"/> Gestion d'Effectif
                </h3>
                <div className="space-y-3">
                    {agency.members.filter(m => m.id !== currentUser.id).map(colleague => {
                        const isPendingFire = agency.mercatoRequests.some(r => r.type === 'FIRE' && r.studentId === colleague.id && r.status === 'PENDING');
                        return (
                            <div key={colleague.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <img src={colleague.avatarUrl} className="w-8 h-8 rounded-full bg-slate-200" />
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{colleague.name}</p>
                                        <p className={`text-[10px] font-bold ${colleague.individualScore < 50 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            Score: {colleague.individualScore}
                                        </p>
                                    </div>
                                </div>
                                {isPendingFire ? (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">En cours</span>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={() => openFireModal(colleague)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer z-10"
                                        title="Proposer le licenciement"
                                    >
                                        <UserX size={16}/>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* SECTION 2: RECRUITMENT POOL */}
        <div>
            <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus size={20} className="text-emerald-500"/> Vivier de Talents
                </h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded text-white md:mr-24 ${agency.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                    CLASSE {agency.classId} UNIQUEMENT
                </span>
            </div>
            
            {myClassUnemployed.length === 0 ? (
                <div className="relative text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 overflow-hidden">
                    <img src={MASCOTS.MERCATO_SEARCH} className="w-24 absolute right-4 bottom-0 opacity-40 grayscale" />
                    <Briefcase size={32} className="mx-auto mb-2 opacity-50"/>
                    <p className="font-bold text-sm">Aucun candidat disponible.</p>
                    <p className="text-xs">Le marché de la Classe {agency.classId} est vide.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <img src={MASCOTS.MERCATO_SEARCH} className="w-24 absolute -right-6 -top-16 opacity-100 z-10 drop-shadow-lg hidden md:block" />

                    {myClassUnemployed.map(student => {
                        const isPending = agency.mercatoRequests.some(r => r.type === 'HIRE' && r.studentId === student.id && r.status === 'PENDING');
                        const salaryCost = student.individualScore * GAME_RULES.SALARY_MULTIPLIER;

                        return (
                            <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <img src={student.avatarUrl} className="w-10 h-10 rounded-full bg-slate-100 grayscale" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-slate-900">{student.name}</p>
                                            <span className={`text-[10px] font-bold ${student.individualScore < 50 ? 'text-red-500' : 'text-emerald-500'}`}>Sc. {student.individualScore}</span>
                                        </div>
                                        <p className="text-xs text-slate-400">{student.role}</p>
                                        <div className="mt-1 flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-lg w-fit">
                                            <Coins size={12}/> {salaryCost} € / sem
                                        </div>
                                    </div>
                                    <div className="ml-2">
                                        {student.cvUrl ? (
                                            <a href={student.cvUrl} target="_blank" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg block hover:bg-indigo-100" title="Voir CV">
                                                <FileSearch size={18}/>
                                            </a>
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">Pas de CV</span>
                                        )}
                                    </div>
                                </div>
                                
                                {isPending ? (
                                    <button disabled className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-lg text-xs cursor-not-allowed">
                                        Offre envoyée...
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => openHireModal(student)}
                                        className="w-full py-2 bg-slate-900 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors"
                                    >
                                        Proposer une embauche
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        <MotivationModal 
            isOpen={isMotivationModalOpen} 
            onClose={() => setIsMotivationModalOpen(false)} 
            onSubmit={handleSubmitRequest} 
            motivation={motivationText} 
            setMotivation={setMotivationText} 
            title={actionType === 'FIRE' ? "Motif du renvoi" : actionType === 'RESIGN' ? "Motif de départ" : "Proposition d'embauche"}
            subtitle={actionType === 'FIRE' ? "Expliquez pourquoi vous souhaitez vous séparer de ce collaborateur." : actionType === 'RESIGN' ? "Pourquoi quittez-vous le navire ?" : "Message personnalisé au candidat."}
        />
    </div>
  );
};

// --- SUB COMPONENTS ---

const CVModal: React.FC<any> = ({isOpen, onClose, cvFile, setCvFile, handleUploadCV, isUploadingCV}) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Mettre à jour mon CV">
        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
                    Importez un fichier PDF (Max 5MB). Ce CV sera visible par les recruteurs.
            </div>
            
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors ${cvFile ? 'border-indigo-500 bg-indigo-50' : ''}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {cvFile ? (
                            <>
                                <FileText className="w-8 h-8 text-indigo-500 mb-2"/>
                                <p className="text-sm text-indigo-900 font-bold">{cvFile.name}</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500"><span className="font-bold">Cliquez</span> pour sélectionner</p>
                                <p className="text-xs text-slate-400">PDF uniquement</p>
                            </>
                        )}
                    </div>
                    <input id="dropzone-file" type="file" accept="application/pdf" className="hidden" onChange={e => setCvFile(e.target.files?.[0] || null)} />
                </label>
            </div> 

            <button 
            onClick={handleUploadCV} 
            disabled={!cvFile || isUploadingCV}
            className={`w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 ${!cvFile || isUploadingCV ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-indigo-600'}`}
            >
                {isUploadingCV ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
                {isUploadingCV ? 'Envoi en cours...' : 'Enregistrer le CV'}
            </button>
        </div>
    </Modal>
);

const MotivationModal: React.FC<{isOpen: boolean, onClose: () => void, onSubmit: () => void, motivation: string, setMotivation: (s: string) => void, title: string, subtitle: string}> = ({isOpen, onClose, onSubmit, motivation, setMotivation, title, subtitle}) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-4">
            <p className="text-sm text-slate-500">{subtitle}</p>
            <textarea 
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900"
                placeholder="Rédigez ici (Min 10 caractères)..."
            />
            <button 
                onClick={onSubmit}
                disabled={motivation.length < 10}
                className={`w-full py-3 font-bold rounded-xl text-white transition-all ${motivation.length < 10 ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                Envoyer la demande
            </button>
        </div>
    </Modal>
);
