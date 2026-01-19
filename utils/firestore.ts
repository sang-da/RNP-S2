
/**
 * Supprime récursivement toutes les propriétés 'undefined' d'un objet.
 * Firestore rejette les objets contenant des valeurs undefined.
 * Remplace également les undefined par null si nécessaire pour l'écrasement.
 */
export const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }

  const sanitized: { [key: string]: any } = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value === undefined) {
      // On ignore purement et simplement les undefined
      return;
    }
    
    sanitized[key] = sanitizeForFirestore(value);
  });
  
  return sanitized;
};
