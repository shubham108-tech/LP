import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL } from '../config';
import { RiDashboardLine, RiBookLine, RiExchangeLine, RiHistoryLine, RiLogoutBoxLine, RiUserLine, RiCloseLine, RiUserSmileLine, RiFileTextLine, RiTaskLine, RiDraftLine, RiCalendarEventLine, RiBarChartGroupedLine, RiLineChartLine, RiChat1Line } from 'react-icons/ri';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const adminLinks = [
        { path: '/admin/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
        { path: '/admin/books', icon: RiBookLine, label: 'Books Manager' },
        { path: '/admin/requests', icon: RiExchangeLine, label: 'Requests' },
        { path: '/admin/issues', icon: RiHistoryLine, label: 'Issued Books' },
        { path: '/admin/teachers', icon: RiUserLine, label: 'Teachers' },
        { path: '/admin/students', icon: RiUserSmileLine, label: 'Students' },
        { path: '/admin/performance', icon: RiLineChartLine, label: 'Teacher Performance' },
        { path: '/admin/feedback', icon: RiChat1Line, label: 'Feedback' },
    ];

    const teacherLinks = [
        { path: '/teacher/dashboard', icon: RiBookLine, label: 'Browse Books' },
        { path: '/teacher/history', icon: RiHistoryLine, label: 'My History' },
        { path: '/teacher/notes', icon: RiFileTextLine, label: 'Study Materials' },
        { path: '/teacher/assignments', icon: RiTaskLine, label: 'Assignments' },
        { path: '/teacher/exams', icon: RiDraftLine, label: 'Online Exams' },
        { path: '/teacher/schedule', icon: RiCalendarEventLine, label: 'Schedule' },
        { path: '/teacher/analytics', icon: RiBarChartGroupedLine, label: 'Analytics' },
        { path: '/teacher/feedback', icon: RiChat1Line, label: 'Help & Feedback' },
    ];

    // If HOD, add performance link to teacher views
    if (user?.role === 'hod') {
        teacherLinks.push({ path: '/teacher/performance', icon: RiLineChartLine, label: 'Teacher performance' });
    }

    const links = user?.role === 'admin' ? adminLinks : teacherLinks;

    return (
        <div
            className={`fixed top-0 left-0 text-white z-50 h-screen w-64 bg-slate-900 transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
        >
            <div className="flex items-center justify-between p-6">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                    LibraryPro
                </div>
                <button
                    onClick={onClose}
                    className="md:hidden text-gray-400 hover:text-white"
                >
                    <RiCloseLine size={24} />
                </button>
            </div>

            <div className="px-6 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Menu</p>
            </div>
            <nav className="flex-1 space-y-2 px-4 overflow-y-auto">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        onClick={onClose}
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive(link.path)
                            ? 'bg-blue-600 shadow-lg shadow-blue-500/30 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <link.icon className={`mr-3 text-xl ${isActive(link.path) ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                        <span className="font-medium">{link.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-800">
                <Link to="profile" className="px-4 mb-4 flex items-center gap-3 hover:bg-slate-800 rounded-lg py-2 transition cursor-pointer" onClick={onClose}>
                    {user?.profile_image ? (
                        <img
                            src={`${SERVER_URL}${user.profile_image}`}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm border-2 border-slate-700">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                    </div>
                </Link>
                <button
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2 mt-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                >
                    <RiLogoutBoxLine className="mr-3 text-lg" />
                    <span className="font-medium text-sm">Logout</span>
                </button>
            </div>
        </div>
    );
};
export default Sidebar;
