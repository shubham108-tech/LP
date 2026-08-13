import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { RiSendPlaneFill, RiNotification4Line, RiGroupLine, RiUserLocationLine, RiInformationLine } from 'react-icons/ri';

const AdminNotices = () => {
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [branch, setBranch] = useState('');
    const [year, setYear] = useState('');
    const [division, setDivision] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const res = await api.get('/auth/users?role=teacher');
                if (Array.isArray(res.data)) {
                    setTeachers(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch teachers', err);
            }
        };
        fetchTeachers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            return toast.error('Message content is required');
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Sending broadcast notification...');

        try {
            const payload = {
                message: message.trim(),
                targetRole: targetRole === 'specific_teacher' ? 'teacher' : targetRole
            };

            if (targetRole === 'specific_teacher') {
                if (!selectedTeacherId) {
                    return toast.error('Please select a teacher', { id: loadingToast });
                }
                payload.userId = selectedTeacherId;
            }

            // Include filters if applicable
            if (targetRole === 'student' || targetRole === 'all') {
                if (branch) payload.branch = branch;
                if (year) payload.year = year;
                if (division) payload.division = division;
            }

            if (targetRole === 'teacher' || targetRole === 'hod') {
                if (branch) payload.branch = branch;
            }

            const res = await api.post('/notifications/send', payload);
            toast.success(res.data.message || 'Notification broadcasted successfully!', { id: loadingToast });
            
            // Reset form
            setMessage('');
            setBranch('');
            setYear('');
            setDivision('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send notification', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm">
                    <RiNotification4Line className="text-3xl" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Broadcast Notices</h1>
                    <p className="text-slate-500 font-medium">Send real-time system notifications to users</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Target Audience Selection */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <RiGroupLine className="text-lg" /> Target Audience
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <label className={`cursor-pointer p-4 border-2 rounded-2xl flex flex-col gap-2 transition-all ${targetRole === 'all' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-indigo-200 bg-slate-50'}`}>
                                    <input type="radio" name="targetRole" value="all" className="hidden" checked={targetRole === 'all'} onChange={(e) => setTargetRole(e.target.value)} />
                                    <span className="font-bold text-slate-800 text-lg">Everyone</span>
                                    <span className="text-xs text-slate-500 font-medium">All registered users</span>
                                </label>
                                
                                <label className={`cursor-pointer p-4 border-2 rounded-2xl flex flex-col gap-2 transition-all ${targetRole === 'student' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-indigo-200 bg-slate-50'}`}>
                                    <input type="radio" name="targetRole" value="student" className="hidden" checked={targetRole === 'student'} onChange={(e) => setTargetRole(e.target.value)} />
                                    <span className="font-bold text-slate-800 text-lg">Students</span>
                                    <span className="text-xs text-slate-500 font-medium">Only students</span>
                                </label>
                                
                                <label className={`cursor-pointer p-4 border-2 rounded-2xl flex flex-col gap-2 transition-all ${targetRole === 'teacher' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-indigo-200 bg-slate-50'}`}>
                                    <input type="radio" name="targetRole" value="teacher" className="hidden" checked={targetRole === 'teacher'} onChange={(e) => setTargetRole(e.target.value)} />
                                    <span className="font-bold text-slate-800 text-lg">Teachers</span>
                                    <span className="text-xs text-slate-500 font-medium">Faculty members</span>
                                </label>

                                <label className={`cursor-pointer p-4 border-2 rounded-2xl flex flex-col gap-2 transition-all ${targetRole === 'hod' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-indigo-200 bg-slate-50'}`}>
                                    <input type="radio" name="targetRole" value="hod" className="hidden" checked={targetRole === 'hod'} onChange={(e) => setTargetRole(e.target.value)} />
                                    <span className="font-bold text-slate-800 text-lg">HODs</span>
                                    <span className="text-xs text-slate-500 font-medium">Department heads</span>
                                </label>
                                
                                <label className={`cursor-pointer p-4 border-2 rounded-2xl flex flex-col gap-2 transition-all ${targetRole === 'specific_teacher' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-indigo-200 bg-slate-50'}`}>
                                    <input type="radio" name="targetRole" value="specific_teacher" className="hidden" checked={targetRole === 'specific_teacher'} onChange={(e) => setTargetRole(e.target.value)} />
                                    <span className="font-bold text-slate-800 text-lg">Specific</span>
                                    <span className="text-xs text-slate-500 font-medium">Individual teacher</span>
                                </label>
                            </div>
                        </div>

                        {/* Optional Filters based on Audience */}
                        {(targetRole === 'student' || targetRole === 'all' || targetRole === 'teacher' || targetRole === 'hod') && (
                            <div className="bg-slate-50/70 p-5 border border-slate-100 rounded-2xl space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <RiUserLocationLine className="text-lg" /> Optional Filters <span className="text-xs font-normal lowercase">(Leave blank for all)</span>
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Branch / Department</label>
                                        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow">
                                            <option value="">All Branches</option>
                                            <option value="Computer Science">Computer Science</option>
                                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                                            <option value="Civil Engineering">Civil Engineering</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Electronics & Comm">Electronics & Comm</option>
                                        </select>
                                    </div>
                                    
                                    {(targetRole === 'student' || targetRole === 'all') && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                                                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow">
                                                    <option value="">All Years</option>
                                                    <option value="First Year">First Year</option>
                                                    <option value="Second Year">Second Year</option>
                                                    <option value="Third Year">Third Year</option>
                                                    <option value="Final Year">Final Year</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Division</label>
                                                <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow">
                                                    <option value="">All Divisions</option>
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {targetRole === 'specific_teacher' && (
                            <div className="bg-slate-50/70 p-5 border border-slate-100 rounded-2xl space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <RiUserLocationLine className="text-lg" /> Select Teacher
                                </h3>
                                <div>
                                    <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow" required>
                                        <option value="">Choose a teacher...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.branch || 'No Branch'})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Message Content */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <RiInformationLine className="text-lg" /> Broadcast Message
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows="4"
                                placeholder="Type your important announcement or notification here..."
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all resize-none text-slate-700"
                                required
                            />
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading || !message.trim()}
                                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-lg"
                            >
                                <RiSendPlaneFill className="text-xl" />
                                {isLoading ? 'Broadcasting...' : 'Broadcast Notification'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminNotices;
