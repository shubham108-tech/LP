import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';

const RequestsManager = () => {
    const [requests, setRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'pending', 'approved', 'rejected'

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/requests');
            setRequests(res.data);
        } catch (error) {
            toast.error('Failed to fetch requests');
        }
    };

    const handleStatus = async (id, status) => {
        try {
            await api.put(`/requests/${id}`, { status });
            toast.success(`Request ${status}`);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-emerald-100 text-emerald-700',
            rejected: 'bg-red-100 text-red-700',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = (
            req.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.book_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.author.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesFilter = filterStatus === 'All' || req.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Book Requests</h1>

                <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                    {/* Filter Status */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                        <option value="All">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    {/* Search Bar */}
                    <input
                        type="text"
                        placeholder="Search request..."
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Book</th>
                            <th className="px-6 py-4">Reason & Link</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 font-medium text-slate-800">{req.user_name}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <p className="font-medium text-slate-800">{req.book_name}</p>
                                    <p className="text-xs">{req.author}</p>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-sm max-w-xs">
                                    <p className="line-clamp-2" title={req.reason || 'No reason provided'}>
                                        {req.reason || <span className="text-slate-400 italic">No reason</span>}
                                    </p>
                                    {req.reference_link && (
                                        <a
                                            href={req.reference_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-700 text-xs mt-1 inline-flex items-center gap-1"
                                        >
                                            View Link ↗
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{new Date(req.request_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {req.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleStatus(req.id, 'approved')}
                                                className="bg-emerald-100 text-emerald-600 p-2 rounded-full hover:bg-emerald-200 transition"
                                                title="Approve"
                                            >
                                                <RiCheckLine />
                                            </button>
                                            <button
                                                onClick={() => handleStatus(req.id, 'rejected')}
                                                className="bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition"
                                                title="Reject"
                                            >
                                                <RiCloseLine />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredRequests.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No requests found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RequestsManager;
