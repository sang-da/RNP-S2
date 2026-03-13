import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    requestPushPermission: () => Promise<void>;
    pushEnabled: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [pushEnabled, setPushEnabled] = useState(false);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) {
            setNotifications([]);
            return;
        }

        // S'abonner aux notifications en temps réel
        const unsubscribe = notificationService.subscribeToNotifications(currentUser.uid, (notifs) => {
            setNotifications(notifs);
            
            // Si on a les permissions Push, on déclenche une notification locale
            // On utilise le Service Worker pour que ça fonctionne sur mobile (PWA)
            if (Notification.permission === 'granted') {
                const newUnread = notifs.filter(n => !n.read && new Date(n.createdAt).getTime() > Date.now() - 5000);
                newUnread.forEach(n => {
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(registration => {
                            registration.showNotification(n.title, {
                                body: n.message,
                                icon: '/vite.svg',
                                badge: '/vite.svg',
                                vibrate: [100, 50, 100],
                                tag: n.id // Évite les doublons
                            } as any);
                        });
                    } else {
                        new Notification(n.title, {
                            body: n.message,
                            icon: '/vite.svg'
                        });
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        if ('Notification' in window) {
            setPushEnabled(Notification.permission === 'granted');
        }
    }, []);

    const requestPushPermission = async () => {
        if (!('Notification' in window)) {
            alert("Ce navigateur ne supporte pas les notifications desktop/push.");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPushEnabled(permission === 'granted');
            if (permission === 'granted') {
                console.log("Permission de notification accordée.");
                // Ici on pourrait initialiser Firebase Cloud Messaging (FCM)
                // et récupérer le token pour l'envoyer au serveur.
            }
        } catch (error) {
            console.error("Erreur lors de la demande de permission:", error);
        }
    };

    const markAsRead = async (id: string) => {
        await notificationService.markAsRead(id);
    };

    const markAllAsRead = async () => {
        if (currentUser) {
            await notificationService.markAllAsRead(currentUser.uid);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            unreadCount, 
            markAsRead, 
            markAllAsRead,
            requestPushPermission,
            pushEnabled
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
