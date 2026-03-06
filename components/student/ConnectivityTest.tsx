import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { Wifi, WifiOff, CheckCircle2, Loader2, Send } from 'lucide-react';
import { collection, query, where, onSnapshot, db, doc } from '../../services/firebase';

export const ConnectivityTest: React.FC = () => {
    const { dispatchAction } = useGame();
    const { currentUser } = useAuth();
    const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'RECEIVED'>('IDLE');
    const [lastPingId, setLastPingId] = useState<string | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);

    useEffect(() => {
        if (!lastPingId) return;

        // Listen for the specific ping action to be processed
        const unsub = onSnapshot(doc(db, 'action_queue', lastPingId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'PROCESSED') {
                    setStatus('RECEIVED');
                    const sentTime = new Date(data.createdAt).getTime();
                    const processedTime = new Date(data.processedAt).getTime();
                    setResponseTime(processedTime - sentTime);
                }
            }
        });

        return () => unsub();
    }, [lastPingId]);

    const sendPing = async () => {
        if (!currentUser) return;
        setStatus('SENDING');
        setResponseTime(null);
        
        try {
            const pingId = `ping-${Date.now()}`;
            // We need to manually construct the ID to track it easily, 
            // but dispatchAction generates ID automatically.
            // So we'll query for the latest PING from this user instead.
            
            await dispatchAction('PING', { timestamp: Date.now() }, currentUser.uid, 'system');
            setStatus('SENT');

            // Find the latest pending ping to track
            // This is a bit tricky with the current dispatchAction abstraction which doesn't return the ID.
            // Let's just listen to the latest PING from this user.
        } catch (e) {
            console.error(e);
            setStatus('IDLE'); // Error state
        }
    };

    // Better approach: Listen to the latest PING from this user
    useEffect(() => {
        if (!currentUser || status === 'IDLE') return;

        const q = query(
            collection(db, 'action_queue'), 
            where('studentId', '==', currentUser.uid),
            where('type', '==', 'PING'),
            where('createdAt', '>', new Date(Date.now() - 10000).toISOString()) // Only recent pings
        );

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    setLastPingId(change.doc.id);
                }
                if (change.type === 'modified' && change.doc.id === lastPingId) {
                    const data = change.doc.data();
                    if (data.status === 'PROCESSED') {
                        setStatus('RECEIVED');
                        const sentTime = new Date(data.createdAt).getTime();
                        const processedTime = new Date(data.processedAt).getTime();
                        setResponseTime(processedTime - sentTime);
                    }
                }
            });
        });
        return () => unsub();
    }, [currentUser, status, lastPingId]);


    return (
        <div className="fixed bottom-4 left-4 z-50">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border transition-all ${
                status === 'RECEIVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                status === 'SENDING' || status === 'SENT' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-white border-slate-200 text-slate-600 hover:scale-105 cursor-pointer'
            }`}
            onClick={status === 'IDLE' || status === 'RECEIVED' ? sendPing : undefined}
            title="Tester la connexion au serveur de jeu"
            >
                {status === 'IDLE' && <Wifi size={16} />}
                {status === 'SENDING' && <Loader2 size={16} className="animate-spin" />}
                {status === 'SENT' && <Send size={16} className="animate-pulse" />}
                {status === 'RECEIVED' && <CheckCircle2 size={16} />}
                
                <span className="text-xs font-bold">
                    {status === 'IDLE' && "Test Connexion"}
                    {status === 'SENDING' && "Envoi..."}
                    {status === 'SENT' && "En attente..."}
                    {status === 'RECEIVED' && `Connecté (${responseTime}ms)`}
                </span>
            </div>
        </div>
    );
};
