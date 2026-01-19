
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

interface BackdoorTriggerProps {
    onTrigger: () => void;
}

export const BackdoorTrigger: React.FC<BackdoorTriggerProps> = ({ onTrigger }) => {
    const { userData } = useAuth();
    const [isBackdoorAvailable, setIsBackdoorAvailable] = useState(false);

    // TIME CHECK FOR BACKDOOR
    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours();
            // Available between 22h and 04h OR IF ADMIN (Simulation Mode)
            const isOpen = hour >= 22 || hour < 4 || userData?.role === 'admin';
            setIsBackdoorAvailable(isOpen);
        };
        checkTime();
        const timer = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(timer);
    }, [userData]);

    if (!isBackdoorAvailable) return null;

    return (
        <button 
            onClick={onTrigger}
            className="fixed bottom-8 right-6 z-[100] p-4 group cursor-alias transition-all hover:scale-110"
            title="Faille Système Détectée"
        >
            <div className="relative">
                {/* Ping Effect Larger */}
                <div className="absolute inset-0 bg-[#00ff41] rounded-sm animate-ping opacity-30 group-hover:opacity-80 duration-500"></div>
                {/* Visual Core - Slightly bigger and brighter */}
                <div className="w-3 h-3 bg-[#00ff41] rounded-sm shadow-[0_0_15px_#00ff41] opacity-50 group-hover:opacity-100 transition-all duration-300 border border-white/20"></div>
            </div>
        </button>
    );
};
