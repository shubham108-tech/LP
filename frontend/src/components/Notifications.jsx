import { useState, useEffect, useRef, useCallback } from 'react';
import { RiNotification3Line, RiCheckDoubleLine, RiWifiLine, RiWifiOffLine } from 'react-icons/ri';
import api from '../services/api';
import { API_BASE_URL } from '../config';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const dropdownRef = useRef(null);
    const eventSourceRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (error) {
            console.error('Failed to fetch notifications');
        }
    }, []);

    const startSSE = useCallback(() => {
        // Clean up any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        // Build SSE URL with token as query param (EventSource doesn't support headers)
        const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
        const sseUrl = `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

        try {
            const es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onopen = () => {
                setIsConnected(true);
                // Clear any fallback polling when SSE is active
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            };

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'notification' && data.notification) {
                        // Prepend new notification and bump unread count
                        setNotifications(prev => {
                            // Avoid duplicates
                            if (data.notification.id && prev.find(n => n.id === data.notification.id)) return prev;
                            return [data.notification, ...prev].slice(0, 20);
                        });
                        setUnreadCount(prev => Number(prev) + 1);
                    }
                } catch (e) {
                    // Non-JSON (heartbeat comments) — ignore
                }
            };

            es.onerror = () => {
                setIsConnected(false);
                es.close();
                eventSourceRef.current = null;

                // Fallback: poll every 30s when SSE fails
                if (!pollIntervalRef.current) {
                    fetchNotifications();
                    pollIntervalRef.current = setInterval(fetchNotifications, 30000);
                }

                // Attempt SSE reconnect after 60s
                reconnectTimeoutRef.current = setTimeout(() => {
                    startSSE();
                }, 60000);
            };
        } catch (e) {
            // EventSource not supported — fall back to polling
            setIsConnected(false);
            pollIntervalRef.current = setInterval(fetchNotifications, 30000);
        }
    }, [fetchNotifications]);

    useEffect(() => {
        fetchNotifications();
        startSSE();

        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read');
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark read');
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'alert': return 'text-red-500 bg-red-50 border-red-100';
            case 'success': return 'text-green-500 bg-green-50 border-green-100';
            case 'warning': return 'text-yellow-500 bg-yellow-50 border-yellow-100';
            case 'notice': return 'text-purple-500 bg-purple-50 border-purple-100';
            default: return 'text-blue-500 bg-blue-50 border-blue-100';
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'alert': return '⚠️';
            case 'success': return '✅';
            case 'warning': return '🔔';
            case 'notice': return '📢';
            default: return '💬';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) fetchNotifications();
                }}
                className="relative p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title={isConnected ? 'Live notifications (connected)' : 'Notifications (polling mode)'}
            >
                <RiNotification3Line size={22} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                {/* Live indicator dot */}
                <span
                    className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900 ${isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`}
                    title={isConnected ? 'Live' : 'Polling'}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                {isConnected ? <RiWifiLine size={10} /> : <RiWifiOffLine size={10} />}
                                {isConnected ? 'Live' : 'Polling'}
                            </span>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium flex items-center gap-1 transition"
                            >
                                <RiCheckDoubleLine /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                <div className="bg-gray-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-2xl">🔔</div>
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((n, i) => (
                                    <div key={n.id || i} className={`p-4 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border text-sm ${getIconColor(n.type)}`}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                    {n.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(n.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {!n.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 animate-pulse"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
