import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { Wifi, WifiOff, CheckCircle2, Loader2, Send, X, Terminal, AlertTriangle } from 'lucide-react';
import { collection, query, where, onSnapshot, db, doc } from '../../services/firebase';

export const ConnectivityTest: React.FC = () => {
    const { dispatchAction } = useGame();
    const { currentUser } = useAuth();
    const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'RECEIVED' | 'ERROR'>('IDLE');
    const [lastPingId, setLastPingId] = useState<string | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    useEffect(() => {
        if (!lastPingId) return;

        addLog(`Listening for updates on action: ${lastPingId}`);
        // Listen for the specific ping action to be processed
        const unsub = onSnapshot(doc(db, 'action_queue', lastPingId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                addLog(`Update received for ${lastPingId}: Status=${data.status}`);
                
                if (data.status === 'PROCESSED') {
                    setStatus('RECEIVED');
                    const sentTime = new Date(data.createdAt).getTime();
                    const processedTime = new Date(data.processedAt).getTime();
                    const duration = processedTime - sentTime;
                    setResponseTime(duration);
                    addLog(`PING SUCCESS! Round-trip: ${duration}ms`);
                } else if (data.status === 'ERROR') {
                    setStatus('ERROR');
                    addLog(`PING FAILED: ${data.error}`);
                }
            }
        });

        return () => unsub();
    }, [lastPingId]);

    const sendPing = async () => {
        if (!currentUser) {
            addLog("ERROR: No current user found.");
            return;
        }
        
        setIsModalOpen(true);
        setStatus('SENDING');
        setResponseTime(null);
        setLogs([]); // Clear previous logs
        addLog("Initiating PING sequence...");
        addLog(`User ID: ${currentUser.uid}`);
        
        try {
            addLog("Dispatching 'PING' action to Firebase...");
            // dispatchAction doesn't return the ID currently, which is a limitation we're working around
            // by listening to the latest query below.
            await dispatchAction('PING', { timestamp: Date.now() }, currentUser.uid, 'system');
            
            setStatus('SENT');
            addLog("Action dispatched. Waiting for Admin Processor...");

        } catch (e: any) {
            console.error(e);
            setStatus('ERROR');
            addLog(`CRITICAL ERROR: ${e.message}`);
        }
    };

    // Listen to the latest PING from this user to catch the ID
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
                    const id = change.doc.id;
                    // Only update if it's a new ID we haven't tracked yet
                    if (id !== lastPingId) {
                        setLastPingId(id);
                        addLog(`Action detected in queue: ${id}`);
                    }
                }
            });
        });
        return () => unsub();
    }, [currentUser, status, lastPingId]);


    return (
        <>
            <div className="fixed bottom-4 left-4 z-50">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border transition-all ${
                    status === 'RECEIVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    status === 'SENDING' || status === 'SENT' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    status === 'ERROR' ? 'bg-red-50 border-red-200 text-red-700' :
                    'bg-white border-slate-200 text-slate-600 hover:scale-105 cursor-pointer'
                }`}
                onClick={sendPing}
                title="Tester la connexion au serveur de jeu"
                >
                    {status === 'IDLE' && <Wifi size={16} />}
                    {status === 'SENDING' && <Loader2 size={16} className="animate-spin" />}
                    {status === 'SENT' && <Send size={16} className="animate-pulse" />}
                    {status === 'RECEIVED' && <CheckCircle2 size={16} />}
                    {status === 'ERROR' && <WifiOff size={16} />}
                    
                    <span className="text-xs font-bold">
                        {status === 'IDLE' && "Test Connexion"}
                        {status === 'SENDING' && "Envoi..."}
                        {status === 'SENT' && "En attente..."}
                        {status === 'RECEIVED' && `Connecté (${responseTime}ms)`}
                        {status === 'ERROR' && "Erreur"}
                    </span>
                </div>
            </div>

            {/* LOG MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 text-green-400 font-mono rounded-lg shadow-2xl w-full max-w-lg border border-green-900 overflow-hidden flex flex-col max-h-[60vh]">
                        <div className="p-3 border-b border-green-900/50 flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                <Terminal size={14} />
                                System Diagnostic
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-green-700 hover:text-green-400 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
                            {logs.length === 0 && <span className="opacity-50 italic">Initializing...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="border-l-2 border-green-900 pl-2">{log}</div>
                            ))}
                            {status === 'SENDING' && (
                                <div className="animate-pulse">_</div>
                            )}
                        </div>
                        {status === 'ERROR' && (
                            <div className="p-3 bg-red-900/20 border-t border-red-900/50 text-red-400 text-xs flex items-center gap-2">
                                <AlertTriangle size={14} />
                                Connection Failed. Check console for details.
                            </div>
                        )}
                        {status === 'RECEIVED' && (
                            <div className="p-3 bg-green-900/20 border-t border-green-900/50 text-green-400 text-xs flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                Connection Verified. Latency: {responseTime}ms
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
