import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { RiNotification3Line, RiMailSendLine } from 'react-icons/ri';

const TeacherNotices = () => {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [targetBranch, setTargetBranch] = useState(user?.branch || '');
    const [targetYear, setTargetYear] = useState('');
    const [loading, setLoading] = useState(false);

    const [notices, setNotices] = useState([]);

    // Fetch notices for student view
    // Fetch notices for student view
    useEffect(() => {
        if (user.role === 'student') {
            fetchNotices();
        }
    }, [user.role]);

    const fetchNotices = async () => {
        try {
            const res = await api.get('/notifications');
            // Filter only 'notice' type if needed, but generally correct
            setNotices(res.data.notifications.filter(n => n.type === 'notice'));
        } catch (error) {
            console.error(error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message) return;

        setLoading(true);
        try {
            const res = await api.post('/notifications/send', {
                message,
                branch: targetBranch,
                year: targetYear
            });
            toast.success(res.data.message);
            setMessage('');
            if (!user.branch) setTargetBranch('');
            setTargetYear('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send notice');
        } finally {
            setLoading(false);
        }
    };

    if (user.role === 'student') {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Class Notices</h1>
                <div className="space-y-4">
                    {notices.map(notice => (
                        <div key={notice.id} className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500 border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-800">New Announcement</h3>
                                <span className="text-xs text-gray-400">{new Date(notice.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600">{notice.message}</p>
                        </div>
                    ))}
                    {notices.length === 0 && (
                        <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                            No notices found.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Class Notice Board</h1>
                <p className="text-sm text-slate-500">Send important announcements to students</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
                <form onSubmit={handleSend} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Target Branch</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={targetBranch}
                                onChange={(e) => setTargetBranch(e.target.value)}
                                disabled={!!user.branch} // Lock if teacher has branch assigned
                            >
                                <option value="">All Branches</option>
                                <option value="Computer Science">Computer Science</option>
                                <option value="Civil Engineering">Civil Engineering</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Electronics & Comm">Electronics & Comm</option>
                                <option value="Electrical Engineering">Electrical Engineering</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Target Year</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={targetYear}
                                onChange={(e) => setTargetYear(e.target.value)}
                            >
                                <option value="">All Years</option>
                                <option value="First Year">First Year</option>
                                <option value="Second Year">Second Year</option>
                                <option value="Third Year">Third Year</option>
                                <option value="Final Year">Final Year</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Message / Announcement</label>
                        <textarea
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                            placeholder="Write your announcement here... (e.g. 'Tomorrow's lecture is rescheduled to 10 AM')"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Sending...' : <><RiMailSendLine size={20} /> Send Notice</>}
                    </button>
                </form>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800 text-sm">
                <RiNotification3Line size={20} className="shrink-0 mt-0.5" />
                <p>
                    <strong>Note:</strong> Notices sent here will appear in the student's notification center properly filtered by their Branch and Year.
                </p>
            </div>
        </div>
    );
};

export default TeacherNotices;
