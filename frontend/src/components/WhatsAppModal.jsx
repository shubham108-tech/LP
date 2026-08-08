import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RiWhatsappLine, RiCloseLine, RiCheckLine, RiRefreshLine, RiQrCodeLine, RiSendPlaneLine } from 'react-icons/ri';

const WhatsAppModal = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sendingTest, setSendingTest] = useState(false);

    const fetchStatus = async () => {
        try {
            let data = null;
            try {
                const res = await api.get('/whatsapp/status');
                data = res.data;
            } catch (e) {
                console.warn('Main API whatsapp status failed, checking local backend...', e.message);
            }

            // If main API returned Vercel or empty QR, check local backend on 5000 directly
            if (!data || data.isVercel || (!data.isReady && !data.qrDataUrl)) {
                try {
                    const localRes = await fetch('http://localhost:5000/api/whatsapp/status');
                    const localData = await localRes.json();
                    if (localData && (localData.isReady || localData.qrDataUrl)) {
                        data = { ...localData, isLocalFallback: true };
                    }
                } catch (localErr) {
                    // Local backend 5000 not reachable
                }
            }

            setStatus(data || { isReady: false, isVercel: true, qrDataUrl: null });
            setLoading(false);
        } catch (err) {
            console.error('WhatsApp status error:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const handleTestMessage = async () => {
        setSendingTest(true);
        try {
            let messageText = 'Test WhatsApp message sent successfully!';
            if (status?.isLocalFallback) {
                const rawRes = await fetch('http://localhost:5000/api/whatsapp/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                const resData = await rawRes.json();
                if (rawRes.ok && resData.status === 'success') {
                    messageText = resData.message || messageText;
                } else {
                    throw new Error(resData.message || 'WhatsApp QR code not scanned yet!');
                }
            } else {
                const res = await api.post('/whatsapp/test');
                messageText = res.data.message || messageText;
            }
            toast.success(messageText);
        } catch (err) {
            toast.error(err.message || err.response?.data?.message || 'WhatsApp QR Code not scanned yet!');
        } finally {
            setSendingTest(false);
        }
    };

    const handleReset = async () => {
        try {
            toast.loading('Generating fresh QR Code...', { id: 'wa-reset' });
            if (status?.isLocalFallback) {
                await fetch('http://localhost:5000/api/whatsapp/reset', { method: 'POST' });
            } else {
                await api.post('/whatsapp/reset');
            }
            setTimeout(() => {
                toast.success('Fresh QR Code generated!', { id: 'wa-reset' });
                fetchStatus();
            }, 3000);
        } catch (err) {
            toast.error('Failed to reset WhatsApp client', { id: 'wa-reset' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between relative overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-md">
                            <RiWhatsappLine />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">WhatsApp Integration</h3>
                            <p className="text-emerald-100 text-xs mt-0.5">Automated Request Notifications</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-all relative z-10"
                    >
                        <RiCloseLine />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400">
                            <RiRefreshLine className="animate-spin text-4xl m-auto text-emerald-600 mb-3" />
                            <p className="text-sm font-medium">Checking WhatsApp Status...</p>
                        </div>
                    ) : status?.isReady ? (
                        /* Connected State */
                        <div className="text-center py-4">
                            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl m-auto mb-4 animate-bounce">
                                <RiCheckLine />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-1">WhatsApp Connected!</h4>
                            <p className="text-slate-500 text-sm max-w-xs m-auto mb-6">
                                Aapka WhatsApp account system se successfully authenticated aur linked hai.
                            </p>

                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-emerald-600 text-white text-lg mt-0.5">
                                    <RiWhatsappLine />
                                </div>
                                <div>
                                    <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700">Target Admin Number</span>
                                    <p className="font-bold text-slate-800 text-base">917972194304</p>
                                    <p className="text-xs text-emerald-600 mt-0.5">Automated notifications will be sent to this number.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleTestMessage}
                                disabled={sendingTest}
                                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                            >
                                <RiSendPlaneLine className={sendingTest ? 'animate-spin' : ''} />
                                <span>{sendingTest ? 'Sending Test Message...' : 'Send Test WhatsApp Message'}</span>
                            </button>
                        </div>
                    ) : (
                        /* QR Scan Needed State */
                        <div>
                            <div className="text-center mb-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-2">
                                    <RiQrCodeLine /> QR Code Scan Required
                                </span>
                                <h4 className="text-lg font-bold text-slate-800">Scan WhatsApp QR Code</h4>
                                <p className="text-slate-500 text-xs">Scan this QR code using WhatsApp on your phone to link notifications.</p>
                            </div>

                            {status?.isVercel && !status?.isLocalFallback && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4 text-xs text-amber-900 flex items-start gap-2.5">
                                    <span className="text-base mt-0.5">☁️</span>
                                    <div>
                                        <p className="font-bold">Online Cloud Backend (Vercel Mode)</p>
                                        <p className="text-[11px] text-amber-800 mt-0.5">
                                            WhatsApp Web daemon runs on your computer backend (`http://localhost:5000`).
                                        </p>
                                        <a
                                            href="http://localhost:5000/qr"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block mt-2 font-bold px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition text-[11px]"
                                        >
                                            🔗 Open Local QR (`http://localhost:5000/qr`) ↗
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* QR Image Box */}
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center my-3 relative flex flex-col items-center justify-center min-h-[220px]">
                                {status?.qrDataUrl ? (
                                    <div className="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                                        <img src={status.qrDataUrl} alt="WhatsApp QR Code" className="w-48 h-48 block" />
                                    </div>
                                ) : (
                                    <div className="py-6 text-slate-500">
                                        <RiRefreshLine className="animate-spin text-3xl m-auto mb-2 text-emerald-600" />
                                        <p className="text-xs font-medium mb-3">Generating QR Code...</p>
                                        <button
                                            onClick={handleReset}
                                            className="px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded-lg text-xs transition"
                                        >
                                            🔄 Generate Fresh QR Code
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 text-xs space-y-1.5 mb-4">
                                <p className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">How to Link WhatsApp:</p>
                                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                                    <li>Open <b>WhatsApp</b> on your phone</li>
                                    <li>Tap <b>Settings / 3-Dots Menu</b></li>
                                    <li>Select <b>Linked Devices (लिंक किए गए डिवाइस)</b></li>
                                    <li>Tap <b>Link a Device</b> and scan the QR above</li>
                                </ol>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleReset}
                                    className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                                >
                                    <RiRefreshLine /> Fresh QR Code
                                </button>
                                <button
                                    onClick={handleTestMessage}
                                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                                >
                                    <RiSendPlaneLine /> Test WhatsApp
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhatsAppModal;
