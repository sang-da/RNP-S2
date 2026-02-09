
/**
 * Calcule le nombre de jours ouvrables (Lundi-Vendredi) de retard.
 * @param deadline Date limite
 * @param submission Date de soumission
 * @returns Nombre de jours de retard (0 si à l'heure)
 */
export const calculateBusinessDaysLate = (deadline: string | Date, submission: string | Date): number => {
    const dDeadline = new Date(deadline);
    const dSubmission = new Date(submission);

    // Tolérance de 15 minutes
    const tolerance = 15 * 60 * 1000;
    
    // Si rendu avant la deadline (+ tolérance), pas de retard
    if (dSubmission.getTime() <= dDeadline.getTime() + tolerance) {
        return 0;
    }

    let businessDays = 0;
    let currentDate = new Date(dDeadline);

    // On boucle jour par jour jusqu'à atteindre la date de soumission
    while (currentDate < dSubmission) {
        // On avance d'un jour
        currentDate.setDate(currentDate.getDate() + 1);
        
        const dayOfWeek = currentDate.getDay();
        // 0 = Dimanche, 6 = Samedi
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            businessDays++;
        }
    }

    return businessDays;
};

export const formatDateFr = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};
