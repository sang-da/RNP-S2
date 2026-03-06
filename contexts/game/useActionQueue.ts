import { collection, addDoc, db } from '../../services/firebase';
import { GameAction } from '../../types';

export const useActionQueue = (toast: (type: string, msg: string) => void) => {
    const dispatchAction = async (type: GameAction['type'], payload: any, studentId: string, agencyId: string) => {
        try {
            await addDoc(collection(db, 'action_queue'), {
                type,
                payload,
                studentId,
                agencyId,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            });
            toast('success', "Action envoyée pour validation...");
        } catch (e: any) {
            console.error("Action Dispatch Error:", e);
            toast('error', "Erreur d'envoi de l'action.");
        }
    };

    return { dispatchAction };
};