
/**
 * Supprime récursivement toutes les propriétés 'undefined' d'un objet.
 * Firestore rejette les objets contenant des valeurs undefined.
 * Cette version est plus robuste pour les tableaux d'objets imbriqués.
 */
export const sanitizeForFirestore = (obj: any): any => {
  // Cas de base : null ou non-objet
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Gestion des dates (Firestore Timestamps ou Date JS)
  if (obj instanceof Date) {
    return obj;
  }

  // Gestion des tableaux
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined) // Retirer les slots undefined
      .map(sanitizeForFirestore);
  }

  // Gestion des objets
  const sanitized: { [key: string]: any } = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    // Ignorer explicitement les undefined
    if (value === undefined) {
      return;
    }
    
    // Récursion pour les objets imbriqués
    sanitized[key] = sanitizeForFirestore(value);
  });
  
  return sanitized;
};
