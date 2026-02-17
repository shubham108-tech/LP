import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const AnalyticsDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            let endpoint = '/analytics/teacher';
            if (user.role === 'student') endpoint = '/analytics/student';
            if (user.role === 'hod') endpoint = '/analytics/hod';

            const res = await api.get(endpoint);
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">Loading Analytics...</div>;
    if (!data) return <div className="p-10 text-center text-red-500">Failed to load data. Please refresh.</div>;

    if (user.role === 'student') {
        const examComparison = data.examComparison.map(d => ({
            name: d.title,
            my_score: d.my_score,
            class_avg: parseFloat(d.class_avg).toFixed(1)
        }));

        const passedAmt = data.assignmentProgress.submitted;
        const pendingAmt = data.assignmentProgress.total - data.assignmentProgress.submitted;
        const assignmentData = [
            { name: 'Submitted', value: passedAmt },
            { name: 'Pending', value: pendingAmt }
        ];

        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">My Performance</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Scores Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                        <h3 className="font-bold text-lg mb-4 text-slate-700">Exam Performance vs Class Average</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={examComparison}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="my_score" name="My Score" fill="#3b82f6" />
                                <Bar dataKey="class_avg" name="Class Average" fill="#9ca3af" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Assignment Completion */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col items-center">
                        <h3 className="font-bold text-lg mb-4 text-slate-700">Assignment Completion</h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={assignmentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {assignmentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center font-bold text-2xl text-slate-700">
                            {passedAmt}/{data.assignmentProgress.total} Submissions
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // HOD View
    if (user.role === 'hod') {
        const { teacherStats = [], recentActivity = [] } = data;
        const batchStats = (data.batchStats || []).map(b => ({ name: b.batch, avg: parseFloat(b.avg_score).toFixed(1) }));
        const divisionStats = (data.divisionStats || []).map(d => ({ name: d.division, avg: parseFloat(d.avg_score).toFixed(1) }));
        const classGroupStats = (data.classGroupStats || []).map(c => ({ name: c.class_group, avg: parseFloat(c.avg_score).toFixed(1) }));

        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Department Overview</h1>
                <p className="text-slate-500 mb-8">Monitor faculty performance and recent activities.</p>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Faculty</h3>
                        <p className="text-3xl font-bold text-indigo-600">{teacherStats.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Active Exams</h3>
                        <p className="text-3xl font-bold text-blue-600">{teacherStats.reduce((acc, t) => acc + t.exam_count, 0)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Study Materials</h3>
                        <p className="text-3xl font-bold text-emerald-600">{teacherStats.reduce((acc, t) => acc + t.note_count, 0)}</p>
                    </div>
                </div>

                {/* Performance Breakdown Charts */}
                <h2 className="text-xl font-bold text-slate-800 mb-4">Academic Performance Analysis</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Batch Performance */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                        <h3 className="font-bold text-md text-slate-700 mb-4">Batch Performance (Year)</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={batchStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="avg" fill="#8884d8" name="Avg Score" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Class Group Performance */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                        <h3 className="font-bold text-md text-slate-700 mb-4">Class Group Performance</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={classGroupStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="avg" fill="#82ca9d" name="Avg Score" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Division Performance */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                        <h3 className="font-bold text-md text-slate-700 mb-4">Division Performance</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={divisionStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="avg" fill="#ffc658" name="Avg Score" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Faculty Performance Table */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-slate-700">Faculty Performance</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Teacher</th>
                                        <th className="p-4 text-center">Exams</th>
                                        <th className="p-4 text-center">Notes</th>
                                        <th className="p-4 text-center">Assignments</th>
                                        <th className="p-4 text-right">Avg Student Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teacherStats.map((teacher) => (
                                        <tr key={teacher.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{teacher.name}</div>
                                                <div className="text-xs text-gray-400">{teacher.email}</div>
                                            </td>
                                            <td className="p-4 text-center text-slate-600">{teacher.exam_count}</td>
                                            <td className="p-4 text-center text-slate-600">{teacher.note_count}</td>
                                            <td className="p-4 text-center text-slate-600">{teacher.assignment_count}</td>
                                            <td className="p-4 text-right font-bold text-blue-600">
                                                {teacher.avg_student_score ? parseFloat(teacher.avg_student_score).toFixed(1) + '%' : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                    {teacherStats.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No teachers found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
                        <h3 className="font-bold text-lg text-slate-700 mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                            {recentActivity.map((activity, index) => (
                                <div key={index} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${activity.type === 'exam' ? 'bg-red-400' :
                                        activity.type === 'note' ? 'bg-emerald-400' : 'bg-blue-400'
                                        }`}></div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{activity.title}</p>
                                        <p className="text-xs text-slate-500">{activity.teacher_name} • <span className="uppercase font-bold text-[10px]">{activity.type}</span></p>
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(activity.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            {recentActivity.length === 0 && <p className="text-center text-gray-400 text-sm">No recent activity.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Teacher View logic (Safe check for data existence)
    const pfData = [
        { name: 'Passed', value: parseInt(data?.passFail?.passed || 0) },
        { name: 'Failed', value: parseInt(data?.passFail?.failed || 0) }
    ];

    const examTrend = (data?.examPerformance || []).map(e => ({
        name: e.title,
        avg: parseFloat(e.avg_score).toFixed(1),
        max: e.max_score
    }));

    const batchStats = (data?.batchStats || []).map(b => ({ name: b.batch, avg: parseFloat(b.avg_score).toFixed(1) }));
    const divisionStats = (data?.divisionStats || []).map(d => ({ name: d.division, avg: parseFloat(d.avg_score).toFixed(1) }));
    const classGroupStats = (data?.classGroupStats || []).map(c => ({ name: c.class_group, avg: parseFloat(c.avg_score).toFixed(1) }));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Class Analytics</h1>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Exams</h3>
                    <p className="text-3xl font-bold text-blue-600">{data?.examPerformance?.length || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Avg Class Score</h3>
                    <p className="text-3xl font-bold text-emerald-600">
                        {examTrend.length > 0 ? (examTrend.reduce((acc, curr) => acc + parseFloat(curr.avg), 0) / examTrend.length).toFixed(1) : 0}%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Pass/Fail Ratio */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                    <h3 className="font-bold text-lg mb-4 text-slate-700">Overall Pass/Fail Ratio</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie
                                data={pfData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Exam Trends */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                    <h3 className="font-bold text-lg mb-4 text-slate-700">Exam Performance Trend</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={examTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="avg" name="Average Score" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="max" name="Max Score" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Performance Breakdown Charts */}
            <h2 className="text-xl font-bold text-slate-800 mb-4">Academic Performance Analysis</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Batch Performance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-bold text-md text-slate-700 mb-4">Batch Performance (Year)</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={batchStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="avg" fill="#8884d8" name="Avg Score" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Class Group Performance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-bold text-md text-slate-700 mb-4">Class Group Performance</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={classGroupStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="avg" fill="#82ca9d" name="Avg Score" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Division Performance */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-bold text-md text-slate-700 mb-4">Division Performance</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={divisionStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="avg" fill="#ffc658" name="Avg Score" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Students Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4 text-slate-700">Top Performing Students</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-3">Rank</th>
                                <th className="p-3">Student Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3 text-right">Avg Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {(data?.topStudents || []).map((s, index) => (
                                <tr key={index}>
                                    <td className="p-3 font-bold text-blue-600">#{index + 1}</td>
                                    <td className="p-3 font-medium">{s.name}</td>
                                    <td className="p-3 text-gray-500">{s.email}</td>
                                    <td className="p-3 text-right font-bold">{parseFloat(s.avg_score).toFixed(1)}</td>
                                </tr>
                            ))}
                            {(data?.topStudents || []).length === 0 && (
                                <tr><td colSpan="4" className="text-center p-4 text-gray-400">No data available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
