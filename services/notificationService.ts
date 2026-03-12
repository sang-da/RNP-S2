import { collection, addDoc, query, where, getDocs, updateDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification } from '../types';

export const notificationService = {
    // Écouter les notifications d'un utilisateur en temps réel
    subscribeToNotifications: (userId: string, callback: (notifications: AppNotification[]) => void) => {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AppNotification[];
            callback(notifications);
        }, (error) => {
            console.error("Erreur lors de l'écoute des notifications:", error);
        });
    },

    // Créer une notification
    createNotification: async (
        userId: string, 
        title: string, 
        message: string, 
        type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' = 'INFO',
        link?: string
    ) => {
        try {
            await addDoc(collection(db, 'notifications'), {
                userId,
                title,
                message,
                type,
                read: false,
                createdAt: new Date().toISOString(),
                link
            });
        } catch (error) {
            console.error("Erreur lors de la création de la notification:", error);
        }
    },

    // Créer une notification pour tout un groupe (agence)
    createGroupNotification: async (
        memberIds: string[],
        title: string,
        message: string,
        type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' = 'INFO',
        link?: string
    ) => {
        try {
            const promises = memberIds.map(userId => 
                addDoc(collection(db, 'notifications'), {
                    userId,
                    title,
                    message,
                    type,
                    read: false,
                    createdAt: new Date().toISOString(),
                    link
                })
            );
            await Promise.all(promises);
        } catch (error) {
            console.error("Erreur lors de la création des notifications de groupe:", error);
        }
    },

    // Marquer une notification comme lue
    markAsRead: async (notificationId: string) => {
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, { read: true });
        } catch (error) {
            console.error("Erreur lors du marquage de la notification:", error);
        }
    },

    // Marquer toutes les notifications d'un utilisateur comme lues
    markAllAsRead: async (userId: string) => {
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);
            
            const promises = snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { read: true }));
            await Promise.all(promises);
        } catch (error) {
            console.error("Erreur lors du marquage de toutes les notifications:", error);
        }
    }
};
