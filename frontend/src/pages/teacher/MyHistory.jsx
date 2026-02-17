import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TeacherHistory = () => {
    const [activeTab, setActiveTab] = useState('issued');
    const [issues, setIssues] = useState([]);
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [issuesRes, requestsRes] = await Promise.all([
                api.get('/issues/my'),
                api.get('/requests/my')
            ]);
            setIssues(issuesRes.data);
            setRequests(requestsRes.data);
        } catch (error) {
            toast.error('Failed to fetch history');
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">My Activity</h1>

            <div className="flex space-x-6 border-b border-gray-200 mb-6">
                <button
                    className={`pb-4 px-2 font-medium transition ${activeTab === 'issued' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('issued')}
                >
                    Issued Books ({issues.length})
                </button>
                <button
                    className={`pb-4 px-2 font-medium transition ${activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('requests')}
                >
                    Request History ({requests.length})
                </button>
            </div>

            {activeTab === 'issued' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto animate-fade-in">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Book</th>
                                <th className="px-6 py-4">Issue Date</th>
                                <th className="px-6 py-4">Return Date</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {issues.map((issue) => (
                                <tr key={issue.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {issue.book_name}
                                        <span className="block text-xs text-slate-400 font-normal">{issue.author}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {new Date(issue.issue_date).toLocaleDateString()}
                                        <br />
                                        <span className="text-xs text-slate-400">{new Date(issue.issue_date).toLocaleTimeString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {issue.return_date ? (
                                            <>
                                                {new Date(issue.return_date).toLocaleDateString()}
                                                <br />
                                                <span className="text-xs text-slate-400">{new Date(issue.return_date).toLocaleTimeString()}</span>
                                            </>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${issue.returned ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                                            {issue.returned ? 'Returned' : 'Active Issue'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {issues.length === 0 && (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No issued books</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto animate-fade-in">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Book</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">Request Date</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {req.book_name}
                                        <span className="block text-xs text-slate-400 font-normal">{req.author}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm max-w-xs">
                                        <p className="line-clamp-2" title={req.reason}>
                                            {req.reason || <span className="text-slate-300 italic">No details</span>}
                                        </p>
                                        {req.reference_link && (
                                            <a
                                                href={req.reference_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-700 text-xs mt-1 inline-flex items-center gap-1"
                                            >
                                                Link ↗
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{new Date(req.request_date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide 
                            ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No requests found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
};

export default TeacherHistory;
