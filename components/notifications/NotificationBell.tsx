import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, Info, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { AppNotification } from '../../types';

export const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, requestPushPermission, pushEnabled } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'INFO': return <Info className="w-5 h-5 text-blue-500" />;
            case 'WARNING': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'ERROR': return <AlertOctagon className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors rounded-full hover:bg-gray-100"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                        <div className="flex space-x-2">
                            {unreadCount > 0 && (
                                <button 
                                    onClick={() => markAllAsRead()}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                                >
                                    <Check className="w-3 h-3 mr-1" /> Tout marquer comme lu
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {!pushEnabled && (
                        <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex items-start justify-between">
                            <div className="text-xs text-indigo-800">
                                <strong>Activer les notifications push</strong> pour être alerté même quand l'app est fermée.
                            </div>
                            <button 
                                onClick={requestPushPermission}
                                className="ml-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 whitespace-nowrap"
                            >
                                Activer
                            </button>
                        </div>
                    )}

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                <p>Aucune notification</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {notifications?.map((notif) => (
                                    <li 
                                        key={notif.id} 
                                        className={`p-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                        onClick={() => {
                                            if (!notif.read) markAsRead(notif.id);
                                            if (notif.link) window.location.href = notif.link;
                                        }}
                                    >
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {formatTime(notif.createdAt)}
                                                </p>
                                            </div>
                                            {!notif.read && (
                                                <div className="flex-shrink-0 ml-2">
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
