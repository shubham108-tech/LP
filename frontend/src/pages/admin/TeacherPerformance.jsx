import { useEffect, useState } from 'react';
import api from '../../services/api';
import { SERVER_URL } from '../../config';
import toast from 'react-hot-toast';
import { RiUserStarLine, RiBookOpenLine, RiFileTextLine, RiAwardLine, RiUserLine, RiLineChartLine } from 'react-icons/ri';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TeacherPerformance = () => {
    const [stats, setStats] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/analytics/hod');
            setStats(res.data.teacherStats);
            setActivity(res.data.recentActivity);
        } catch (error) {
            toast.error('Failed to load performance data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6 text-center">Loading Analytics...</div>;

    return (
        <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Teacher Performance Analysis</h1>
                    <p className="text-sm text-slate-500">Monitor contributions and student outcomes per faculty member</p>
                </div>
            </div>

            {/* Stats Overview Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <RiLineChartLine className="text-blue-600" /> Content Contribution Overview
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="exam_count" name="Exams" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="note_count" name="Notes" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="assignment_count" name="Assignments" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Teacher Leaderboard */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <RiUserStarLine className="text-blue-600" /> Faculty Performance List
                    </h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Teacher</th>
                                    <th className="px-6 py-4 text-center">Exams / Attempts</th>
                                    <th className="px-6 py-4 text-center">Notes / Assig.</th>
                                    <th className="px-6 py-4 text-center">Avg Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats.map((teacher, idx) => (
                                    <tr key={teacher.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {teacher.profile_image ? (
                                                    <img
                                                        src={`${SERVER_URL}${teacher.profile_image}`}
                                                        alt={teacher.name}
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br ${idx === 0 ? 'from-blue-600 to-indigo-600' : 'from-slate-400 to-slate-500'}`}>
                                                        {teacher.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-slate-800">{teacher.name}</p>
                                                    <p className="text-xs text-slate-500">{teacher.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <p className="font-bold text-slate-700">{teacher.exam_count}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">({teacher.total_exam_attempts} attempts)</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs font-bold">{teacher.note_count}N</span>
                                                <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded text-xs font-bold">{teacher.assignment_count}A</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center gap-1 font-bold ${teacher.avg_student_score >= 60 ? 'text-green-600' : 'text-amber-600'}`}>
                                                <RiAwardLine /> {teacher.avg_student_score ? parseFloat(teacher.avg_student_score).toFixed(1) : '0'}%
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Department Activity */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <RiFileTextLine className="text-blue-600" /> Recent Activity
                    </h3>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                        <div className="space-y-6">
                            {activity.map((act, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    {i !== activity.length - 1 && <div className="absolute left-4 top-10 bottom-[-20px] w-0.5 bg-gray-100"></div>}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${act.type === 'exam' ? 'bg-blue-100 text-blue-600' :
                                        act.type === 'note' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        {act.type === 'exam' ? <RiAwardLine /> : act.type === 'note' ? <RiBookOpenLine /> : <RiFileTextLine />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 leading-tight">{act.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            By <span className="font-semibold">{act.teacher_name}</span> • {new Date(act.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherPerformance;
