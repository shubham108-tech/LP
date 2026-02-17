import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RiSendPlaneFill, RiHistoryLine, RiFeedbackLine } from 'react-icons/ri';

const Feedback = () => {
    const [message, setMessage] = useState('');
    const [type, setType] = useState('other');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/feedback/my');
            setHistory(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/feedback', { message, type });
            toast.success('Feedback submitted!');
            setMessage('');
            setType('other');
            fetchHistory();
        } catch (error) {
            toast.error('Failed to submit feedback');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'acknowledged': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <RiFeedbackLine /> Help & Feedback
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Submit Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                        <RiSendPlaneFill /> Submit Feedback
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
                            <select
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <option value="bug">Report a Bug</option>
                                <option value="suggestion">Suggestion</option>
                                <option value="other">Other Issue</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 h-32 resize-none"
                                placeholder="Describe your issue or suggestion..."
                                required
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1 text-right">{message.length}/500</p>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                        >
                            <RiSendPlaneFill /> Submit Feedback
                        </button>
                    </form>
                </div>

                {/* History */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                        <RiHistoryLine /> My Feedback History
                    </h2>

                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            No feedback submitted yet.
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {history.map(item => (
                                <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-100 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{item.message}</p>
                                    <div className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                        Type: {item.type}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Feedback;
