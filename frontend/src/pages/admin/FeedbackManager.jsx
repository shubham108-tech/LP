import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { RiSearchLine, RiFilterLine, RiChat1Line, RiCheckLine, RiThumbUpLine, RiCloseLine } from 'react-icons/ri';

const FeedbackManager = () => {
    const [feedback, setFeedback] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeedback();
    }, []);

    useEffect(() => {
        let results = feedback;
        if (filter !== 'all') {
            results = results.filter(f => f.status === filter);
        }
        if (search) {
            results = results.filter(f =>
                f.message.toLowerCase().includes(search.toLowerCase()) ||
                f.user_name.toLowerCase().includes(search.toLowerCase())
            );
        }
        setFiltered(results);
    }, [filter, search, feedback]);

    const fetchFeedback = async () => {
        try {
            const res = await api.get('/feedback');
            setFeedback(res.data);
            setLoading(false);
        } catch (error) {
            toast.error('Failed to load feedback');
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.put(`/feedback/${id}`, { status });
            toast.success(`Marked as ${status}`);
            fetchFeedback();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'acknowledged': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    if (loading) return <div className="text-center py-20">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <RiChat1Line /> User Feedback
            </h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
                    <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>Pending</button>
                    <button onClick={() => setFilter('acknowledged')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'acknowledged' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>Acknowledged</button>
                    <button onClick={() => setFilter('resolved')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'resolved' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>Resolved</button>
                </div>
                <div className="relative w-full max-w-md">
                    <RiSearchLine className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search feedback..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {filtered.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white uppercase ${item.user_role === 'student' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                    {item.user_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{item.user_name}</h3>
                                    <p className="text-xs text-slate-500 capitalize">{item.user_role} • {new Date(item.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusBadge(item.status)}`}>
                                {item.status}
                            </span>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg text-slate-700 text-sm whitespace-pre-wrap border border-gray-100 my-4">
                            {item.message}
                            <div className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-t pt-2 border-gray-200">
                                Type: {item.type}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4 border-t pt-4 border-gray-100">
                            {item.status !== 'resolved' && (
                                <button
                                    onClick={() => handleUpdateStatus(item.id, 'resolved')}
                                    className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-bold text-sm flex items-center gap-2"
                                >
                                    <RiCheckLine /> Mark Resolved
                                </button>
                            )}
                            {item.status === 'pending' && (
                                <button
                                    onClick={() => handleUpdateStatus(item.id, 'acknowledged')}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-sm flex items-center gap-2"
                                >
                                    <RiThumbUpLine /> Acknowledge
                                </button>
                            )}
                            {item.status !== 'pending' && (
                                <button
                                    onClick={() => handleUpdateStatus(item.id, 'pending')}
                                    className="px-4 py-2 text-gray-400 hover:text-gray-600 font-bold text-sm flex items-center gap-2"
                                >
                                    Reopen
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No feedback found.
                </div>
            )}
        </div>
    );
};

export default FeedbackManager;
