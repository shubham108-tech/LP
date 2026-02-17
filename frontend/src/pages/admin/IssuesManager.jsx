import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    RiArrowGoBackLine, RiFileListLine, RiHistoryLine,
    RiSearchLine, RiFilter3Line, RiAlarmWarningLine, RiCheckDoubleLine
} from 'react-icons/ri';

const IssuesManager = () => {
    const [issues, setIssues] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, overdue: 0, returnedToday: 0 });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Active'); // Active, Returned, All

    const [returnModal, setReturnModal] = useState({ isOpen: false, issueId: null, status: 'returned', fine: 0 });

    useEffect(() => {
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        try {
            const res = await api.get('/issues/admin');
            const data = res.data;
            setIssues(data);

            // Calculate Stats
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            setStats({
                total: data.length,
                active: data.filter(i => !i.returned).length,
                overdue: data.filter(i => !i.returned && new Date(i.return_date) < now).length,
                returnedToday: data.filter(i => i.returned && i.return_date && i.return_date.startsWith(todayStr)).length
            });

        } catch (error) {
            toast.error('Failed to fetch issues');
        }
    };

    const openReturnModal = (issueId) => {
        setReturnModal({ isOpen: true, issueId, status: 'returned', fine: 0 });
    };

    const submitReturn = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/issues/return/${returnModal.issueId}`, {
                status: returnModal.status,
                fine: returnModal.fine
            });
            toast.success(`Book marked as ${returnModal.status}`);
            setReturnModal({ ...returnModal, isOpen: false });
            fetchIssues();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const handleDownloadReport = async () => {
        const toastId = toast.loading('Generating report...');
        try {
            const response = await api.get('/issues/report', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `library_report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Report downloaded', { id: toastId });
        } catch (error) {
            toast.error('Failed to download report', { id: toastId });
        }
    };

    const filteredIssues = issues.filter(issue => {
        const matchesSearch = (
            issue.book_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            issue.user_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        let matchesFilter = true;
        if (filterStatus === 'Active') matchesFilter = !issue.returned;
        if (filterStatus === 'Returned') matchesFilter = issue.returned;

        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (issue) => {
        if (!issue.returned) return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-orange-50 text-orange-600 border-orange-200">Issued</span>;

        switch (issue.status) {
            case 'lost': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-red-50 text-red-600 border-red-200">Lost</span>;
            case 'damaged': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-600 border-amber-200">Damaged</span>;
            default: return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-emerald-50 text-emerald-600 border-emerald-200">Returned</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Circulation Desk</h1>
                    <p className="text-sm text-slate-500">Track issued books and returns</p>
                </div>
                <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-slate-700 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm"
                >
                    <RiFileListLine size={20} className="text-red-500" />
                    <span>Download Report</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><RiHistoryLine size={28} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Issues</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><RiAlarmWarningLine size={28} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Overdue</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.overdue}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><RiCheckDoubleLine size={28} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Previously Returned</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.total - stats.active}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <div className="relative flex-1 max-w-lg">
                    <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by book or student name..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
                    <RiFilter3Line className="text-gray-400" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="py-2 pl-2 pr-8 border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer text-sm"
                    >
                        <option value="Active">Active Issues</option>
                        <option value="Returned">Returned History</option>
                        <option value="All">All Records</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Book Details</th>
                                <th className="px-6 py-4">Borrowed By</th>
                                <th className="px-6 py-4">Timestamps</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredIssues.map((issue) => (
                                <tr key={issue.id} className="hover:bg-slate-50 transition group">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{issue.book_name}</p>
                                        <p className="text-xs text-slate-500">{issue.author}</p>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <span className="font-medium text-slate-700">{issue.user_name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs">
                                            <p className="text-slate-500 flex justify-between w-32"><span className="font-medium">Issued:</span> {new Date(issue.issue_date).toLocaleDateString()}</p>
                                            <p className={`flex justify-between w-32 ${issue.returned ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                <span className="font-medium">{issue.returned ? 'Returned:' : 'Due:'}</span>
                                                <span>
                                                    {issue.returned && issue.return_date
                                                        ? new Date(issue.return_date).toLocaleDateString()
                                                        : (issue.expected_return_date ? new Date(issue.expected_return_date).toLocaleDateString() : 'N/A')
                                                    }
                                                </span>
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getStatusBadge(issue)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {!issue.returned && (
                                            <button
                                                onClick={() => openReturnModal(issue.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold uppercase tracking-wider transition ml-auto"
                                            >
                                                <RiArrowGoBackLine /> Return
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredIssues.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        No records found for "{filterStatus}" filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Return Modal */}
            {returnModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-down">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Confirm Return</h3>
                            <form onSubmit={submitReturn}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Return Status</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={returnModal.status}
                                            onChange={(e) => setReturnModal({ ...returnModal, status: e.target.value })}
                                        >
                                            <option value="returned">Returned (Good Condition)</option>
                                            <option value="damaged">Damaged (Fine may apply)</option>
                                            <option value="lost">Lost (Fine applies)</option>
                                        </select>
                                    </div>

                                    {(returnModal.status === 'lost' || returnModal.status === 'damaged') && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Fine Amount (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={returnModal.fine}
                                                onChange={(e) => setReturnModal({ ...returnModal, fine: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3 justify-end mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setReturnModal({ ...returnModal, isOpen: false })}
                                        className="px-4 py-2 text-slate-600 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition"
                                    >
                                        Confirm Return
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssuesManager;
