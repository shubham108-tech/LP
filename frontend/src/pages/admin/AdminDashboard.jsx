import { useEffect, useState } from 'react';
import api from '../../services/api';
import { RiBookLine, RiBookOpenLine, RiUserLine, RiHistoryLine, RiTimeLine, RiTrophyLine, RiBarChartLine, RiUserSmileLine, RiFileDownloadLine, RiCloseCircleLine, RiErrorWarningLine, RiMoneyDollarCircleLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="p-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex items-center">
        <div className={`p-4 rounded-xl ${bgClass} ${colorClass}`}>
            <Icon className="text-3xl" />
        </div>
        <div className="ml-5">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-extrabold text-slate-800 mt-1">{value}</p>
        </div>
    </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalBooks: 0,
        availableBooks: 0,
        issuedBooks: 0,
        totalTeachers: 0,
        totalStudents: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [lowStockBooks, setLowStockBooks] = useState([]);
    const [overdueBooks, setOverdueBooks] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [topBorrowers, setTopBorrowers] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/admin/data');
            setStats(res.data.stats);
            setRecentActivity(res.data.recentActivity || []);
            setLowStockBooks(res.data.lowStockBooks || []);
            setOverdueBooks(res.data.overdueBooks || []);
            setCategoryData(res.data.categoryStats || []);
            setMonthlyData(res.data.monthlyStats || []);
            setTopBorrowers(res.data.topBorrowers || []);
        } catch (error) {
            toast.error('Failed to fetch dashboard data');
        }
    };

    const handleDownloadReport = async () => {
        try {
            const response = await api.get('/issues/report', {
                responseType: 'blob'
            });
            // Create blob link ensure correct type
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'issued_books_report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            // Clean up
            window.URL.revokeObjectURL(url);
            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download report');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
                <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
                >
                    <RiFileDownloadLine className="text-xl" />
                    <span>Download Report</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Books" value={stats.totalBooks} icon={RiBookLine} bgClass="bg-blue-100" colorClass="text-blue-600" />
                <StatCard title="Available" value={stats.availableBooks} icon={RiBookOpenLine} bgClass="bg-emerald-100" colorClass="text-emerald-600" />
                <StatCard title="Issued" value={stats.issuedBooks} icon={RiHistoryLine} bgClass="bg-orange-100" colorClass="text-orange-600" />
                <StatCard title="Lost Books" value={stats.lostBooks} icon={RiCloseCircleLine} bgClass="bg-red-100" colorClass="text-red-600" />
                <StatCard title="Damaged" value={stats.damagedBooks} icon={RiErrorWarningLine} bgClass="bg-amber-100" colorClass="text-amber-600" />
                <StatCard title="Total Fines" value={`₹${stats.totalFines}`} icon={RiMoneyDollarCircleLine} bgClass="bg-rose-100" colorClass="text-rose-600" />
                <StatCard title="Teachers" value={stats.totalTeachers} icon={RiUserLine} bgClass="bg-purple-100" colorClass="text-purple-600" />
                <StatCard title="Students" value={stats.totalStudents} icon={RiUserSmileLine} bgClass="bg-pink-100" colorClass="text-pink-600" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* 1. Monthly Trends (Line Chart) - Takes 2 cols */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-2 h-8 bg-indigo-500 rounded-full mr-3"></span> Monthly Issue Trends
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="issued"
                                    name="Issued"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="returned"
                                    name="Returned"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Category Distribution (Pie Chart) - Takes 1 col */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-2 h-8 bg-purple-500 rounded-full mr-3"></span> Categories Popularity
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} fill="#8884d8" paddingAngle={5} dataKey="value">
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Lists Section A */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Top Borrowers */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <span className="w-2 h-8 bg-yellow-400 rounded-full mr-3"></span> Top Readers
                    </h2>
                    <div className="space-y-4">
                        {topBorrowers.map((user, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-xl border border-yellow-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {index + 1}
                                    </div>
                                    <p className="font-semibold text-slate-700">{user.name}</p>
                                </div>
                                <span className="text-sm font-bold text-yellow-600">{user.count} Books</span>
                            </div>
                        ))}
                        {topBorrowers.length === 0 && <p className="text-sm text-slate-400">No data available.</p>}
                    </div>
                </div>

                {/* Overdue Books */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <span className="w-2 h-8 bg-red-600 rounded-full mr-3"></span> Overdue Books
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">{overdueBooks.length} Late</span>
                    </h2>
                    <div className="space-y-3">
                        {overdueBooks.length > 0 ? (
                            overdueBooks.map((book) => (
                                <div key={book.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100 hover:bg-red-50 transition">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{book.book_name}</p>
                                        <p className="text-xs text-slate-500">Borrowed by <span className="font-bold">{book.user_name}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-red-600">Due: {new Date(book.due_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <RiTimeLine className="text-4xl mb-2 opacity-50" />
                                <p className="text-sm">No books are currently overdue.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <span className="w-2 h-8 bg-blue-500 rounded-full mr-3"></span> Recent Activity
                    </h2>
                    <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className={`p-2 rounded-lg mr-4 ${activity.type === 'returned' ? 'bg-emerald-50 text-emerald-600' :
                                        activity.type === 'lost' ? 'bg-red-50 text-red-600' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                        <RiHistoryLine size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-800">
                                            <span className="font-semibold">{activity.user_name}</span> {activity.type === 'returned' ? 'returned' : activity.type === 'lost' ? 'lost' : 'borrowed'} <span className="font-medium text-slate-600">"{activity.book_name}"</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(activity.date).toLocaleDateString()} at {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-400">No recent activity found.</p>
                        )}
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <span className="w-2 h-8 bg-orange-500 rounded-full mr-3"></span> Low Stock Alerts
                    </h2>
                    <div className="space-y-3">
                        {lowStockBooks.length > 0 ? (
                            lowStockBooks.map((book) => (
                                <div key={book.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{book.book_name}</p>
                                        <p className="text-xs text-slate-500">{book.author}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xl font-bold text-orange-600">{book.available_quantity}</span>
                                        <span className="text-[10px] uppercase text-orange-400 font-bold tracking-wider">Left</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-emerald-600 flex items-center">
                                <RiBookOpenLine className="mr-2" /> All stock levels are healthy!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AdminDashboard;
