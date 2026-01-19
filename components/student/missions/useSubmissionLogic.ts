
import { useState } from 'react';
import { Agency, WeekModule, Deliverable, GameEvent } from '../../../types';
import { ref, uploadBytes, getDownloadURL, storage } from '../../../services/firebase';
import { useUI } from '../../../contexts/UIContext';

export const useSubmissionLogic = (agency: Agency, onUpdateAgency: (a: Agency) => void) => {
  const { toast } = useUI();
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const getDynamicDeadline = (week: WeekModule, classId: string): string | undefined => {
    const schedule = classId === 'A' ? week.schedule.classA : week.schedule.classB;
    if (!schedule || !schedule.date) return undefined;
    const sessionDate = new Date(schedule.date);
    if (schedule.slot === 'MATIN') sessionDate.setHours(9, 0, 0, 0);
    else sessionDate.setHours(13, 30, 0, 0);
    return new Date(sessionDate.getTime() - 10 * 60000).toISOString();
  };

  const handleFileUpload = async (
    file: File, 
    deliverableId: string, 
    weekId: string, 
    selfAssessment: 'A' | 'B' | 'C', 
    nominatedMvp: string | null
  ) => {
    const currentWeekData = agency.progress[weekId];
    if (!currentWeekData) return;

    const targetDeliverable = currentWeekData.deliverables.find(d => d.id === deliverableId);
    const type = targetDeliverable?.type || 'FILE';

    setIsUploading(deliverableId);
    toast('info', 'Envoi en cours...');

    try {
      let storagePath = `submissions/${agency.id}/${weekId}/${deliverableId}_${file.name}`;
      if (type === 'SPECIAL_LOGO') storagePath = `logos/${agency.id}_${Date.now()}`;
      else if (type === 'SPECIAL_BANNER') storagePath = `banners/${agency.id}_${Date.now()}`;

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // --- CALCUL EARLY BIRD ---
      let bonusScore = 0;
      const dynDeadline = getDynamicDeadline(currentWeekData, agency.classId as string);
      if (dynDeadline) {
        const diffMs = new Date(dynDeadline).getTime() - new Date().getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours > 24) bonusScore = 3;
        else if (diffHours > 12) bonusScore = 1;
      }

      // --- PRÉPARATION DU LIVRABLE (CORRECTION UNDEFINED) ---
      const updatedDeliverables = currentWeekData.deliverables.map((d): Deliverable => 
        d.id === deliverableId 
        ? { 
            ...d, 
            status: 'submitted', 
            fileUrl: downloadUrl, 
            feedback: bonusScore > 0 ? `Bonus Early Bird (+${bonusScore}) appliqué ! En attente de note.` : "Fichier reçu. En attente de notation.",
            submissionDate: new Date().toISOString(),
            selfAssessment: selfAssessment, 
            nominatedMvpId: nominatedMvp || "", // Utilisation d'une string vide plutôt qu'undefined pour Firestore
          } 
        : d
      );

      const updatedWeek = { ...currentWeekData, deliverables: updatedDeliverables };
      
      const newEvent: GameEvent = {
        id: `evt-${Date.now()}`, 
        date: new Date().toISOString().split('T')[0], 
        type: 'INFO',
        label: `Dépôt: ${targetDeliverable?.name}`, 
        deltaVE: 0,
        description: bonusScore > 0 ? `Rendu anticipé ! Bonus Early Bird (+${bonusScore} Score).` : `Fichier transmis pour évaluation.`
      };

      const updatedMembers = agency.members.map(m => ({
        ...m, individualScore: Math.min(100, m.individualScore + bonusScore)
      }));

      // Construction de l'objet final
      let updatedAgency: Agency = {
        ...agency,
        members: updatedMembers,
        eventLog: [...agency.eventLog, newEvent],
        progress: { ...agency.progress, [weekId]: updatedWeek }
      };

      if (type === 'SPECIAL_LOGO') updatedAgency.logoUrl = downloadUrl;
      else if (type === 'SPECIAL_BANNER') updatedAgency.branding = { ...updatedAgency.branding, bannerUrl: downloadUrl };

      onUpdateAgency(updatedAgency);
      
      if (bonusScore > 0) toast('success', `Early Bird ! +${bonusScore} points de score.`);
      else toast('success', "Fichier enregistré !");

    } catch (error: any) {
      toast('error', `Erreur : ${error.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  return { isUploading, handleFileUpload, getDynamicDeadline };
};
