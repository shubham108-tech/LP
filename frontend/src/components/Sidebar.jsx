import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL } from '../config';
import api from '../services/api';
import {
    RiDashboardLine, RiBookLine, RiExchangeLine, RiHistoryLine, RiLogoutBoxLine,
    RiUserLine, RiCloseLine, RiUserSmileLine, RiFileTextLine, RiTaskLine, RiDraftLine,
    RiCalendarEventLine, RiBarChartGroupedLine, RiLineChartLine, RiChat1Line,
    RiMailSendLine, RiFolderOpenLine, RiBriefcaseLine, RiStore2Line, RiToggleLine
} from 'react-icons/ri';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [modules, setModules] = useState({});

    useEffect(() => {
        fetchModules();
        window.addEventListener('modulesUpdated', fetchModules);
        return () => window.removeEventListener('modulesUpdated', fetchModules);
    }, []);

    const fetchModules = async () => {
        try {
            const res = await api.get('/modules');
            if (res.data && res.data.modules) {
                setModules(res.data.modules);
            }
        } catch (error) {
            console.log('Sidebar modules load skipped:', error.message);
        }
    };

    const isActive = (path) => location.pathname === path;

    const adminLinks = [
        { path: '/admin/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
        { path: '/admin/modules', icon: RiToggleLine, label: 'Menu Module Control' },
        { path: '/admin/books', icon: RiBookLine, label: 'Books Manager' },
        { path: '/admin/requests', icon: RiExchangeLine, label: 'Requests' },
        { path: '/admin/issues', icon: RiHistoryLine, label: 'Issued Books' },
        { path: '/admin/teachers', icon: RiUserLine, label: 'Teachers' },
        { path: '/admin/students', icon: RiUserSmileLine, label: 'Students' },
        { path: '/admin/stationary', icon: RiStore2Line, label: 'Stationary & Supplies' },
        { path: '/admin/performance', icon: RiLineChartLine, label: 'Teacher Performance' },
        { path: '/admin/feedback', icon: RiChat1Line, label: 'Feedback' },
    ];

    const teacherLinks = [
        { path: '/teacher/dashboard', icon: RiBookLine, label: 'Browse Books', moduleKey: 'browse_books' },
        { path: '/engineering/projects', icon: RiFolderOpenLine, label: 'Project Repository', moduleKey: 'project_repository' },
        { path: '/teacher/history', icon: RiHistoryLine, label: 'My History', moduleKey: 'my_history' },
        { path: '/teacher/notes', icon: RiFileTextLine, label: 'Lab Manuals / Notes', moduleKey: 'notes' },
        { path: '/teacher/assignments', icon: RiTaskLine, label: 'Assignments', moduleKey: 'assignments' },
        { path: '/teacher/exams', icon: RiDraftLine, label: 'Online Exams', moduleKey: 'exams' },
        { path: '/teacher/schedule', icon: RiCalendarEventLine, label: 'Schedule', moduleKey: 'schedule' },
        { path: '/teacher/notices', icon: RiMailSendLine, label: 'Class Notices', moduleKey: 'notices' },
        { path: '/engineering/placements', icon: RiBriefcaseLine, label: 'Placement Cell', moduleKey: 'placements' },
        { path: '/engineering/resources', icon: RiCalendarEventLine, label: 'Resource Booking', moduleKey: 'resources' },
        { path: '/teacher/stationary', icon: RiStore2Line, label: 'Stationary', moduleKey: 'stationary' },
        { path: '/teacher/analytics', icon: RiBarChartGroupedLine, label: 'Analytics', moduleKey: 'analytics' },
        { path: '/teacher/feedback', icon: RiChat1Line, label: 'Feedback', moduleKey: 'feedback' },
    ];

    const studentLinks = [
        { path: '/teacher/dashboard', icon: RiBookLine, label: 'Browse Books', moduleKey: 'browse_books' },
        { path: '/engineering/projects', icon: RiFolderOpenLine, label: 'Project Repository', moduleKey: 'project_repository' },
        { path: '/engineering/placements', icon: RiBriefcaseLine, label: 'Placement Cell', moduleKey: 'placements' },
        { path: '/engineering/resources', icon: RiCalendarEventLine, label: 'Resource Booking', moduleKey: 'resources' },
        { path: '/teacher/history', icon: RiHistoryLine, label: 'My History', moduleKey: 'my_history' },
        { path: '/teacher/notes', icon: RiFileTextLine, label: 'Lab Manuals / Notes', moduleKey: 'notes' },
        { path: '/teacher/assignments', icon: RiTaskLine, label: 'My Assignments', moduleKey: 'assignments' },
        { path: '/teacher/exams', icon: RiDraftLine, label: 'Online Exams', moduleKey: 'exams' },
        { path: '/teacher/schedule', icon: RiCalendarEventLine, label: 'Class Schedule', moduleKey: 'schedule' },
        { path: '/teacher/notices', icon: RiMailSendLine, label: 'Class Notices', moduleKey: 'notices' },
        { path: '/teacher/feedback', icon: RiChat1Line, label: 'Feedback', moduleKey: 'feedback' },
    ];

    let computedTeacherLinks = [...teacherLinks];
    // If HOD, add performance & admin stationary link to teacher views
    if (user?.role === 'hod') {
        computedTeacherLinks.push({ path: '/admin/stationary', icon: RiStore2Line, label: 'Stationary & Ledger', moduleKey: 'stationary' });
        computedTeacherLinks.push({ path: '/teacher/performance', icon: RiLineChartLine, label: 'Teacher performance', moduleKey: 'analytics' });
        computedTeacherLinks.push({ path: '/admin/students', icon: RiUserSmileLine, label: 'My Students' });
        computedTeacherLinks = computedTeacherLinks.filter(link => !['/teacher/assignments', '/teacher/exams'].includes(link.path));
    }

    let rawLinks = user?.role === 'admin' ? adminLinks : (user?.role === 'student' ? studentLinks : computedTeacherLinks);

    // Filter links based on Admin module toggles for non-admin users
    const links = user?.role === 'admin'
        ? rawLinks
        : rawLinks.filter(link => !link.moduleKey || modules[link.moduleKey] !== false);

    return (
        <div
            className={`fixed flex flex-col top-0 left-0 text-white z-50 h-screen w-64 bg-[#12072b] transition-transform duration-300 ease-in-out md:translate-x-0 border-r border-purple-950/60 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            <div className="flex items-center justify-between p-6">
                <div className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 via-purple-300 to-pink-400 text-transparent bg-clip-text tracking-tight">
                    LibraryPro
                </div>
                <button
                    onClick={onClose}
                    className="md:hidden text-purple-300 hover:text-white"
                >
                    <RiCloseLine size={24} />
                </button>
            </div>

            <div className="px-6 mb-4">
                <p className="text-[11px] text-purple-300/60 uppercase tracking-widest font-bold">Menu</p>
            </div>
            <nav className="flex-1 space-y-2 px-4 overflow-y-auto">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        onClick={onClose}
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                            isActive(link.path)
                                ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-lg shadow-fuchsia-600/30 text-white font-bold'
                                : 'text-purple-200/70 hover:bg-purple-900/30 hover:text-white'
                        }`}
                    >
                        <link.icon className={`mr-3 text-xl ${isActive(link.path) ? 'text-white' : 'text-purple-400 group-hover:text-white'}`} />
                        <span className="font-semibold">{link.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-purple-900/40">
                <Link to="profile" className="px-4 mb-4 flex items-center gap-3 hover:bg-purple-900/30 rounded-xl py-2 transition cursor-pointer" onClick={onClose}>
                    {user?.profile_image ? (
                        <img
                            src={`${SERVER_URL}${user.profile_image}`}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-fuchsia-500/40"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-900/50 text-fuchsia-300 flex items-center justify-center font-bold text-sm border-2 border-fuchsia-500/40">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                        <p className="text-xs text-purple-300/60 capitalize">{user?.role}</p>
                    </div>
                </Link>
                <button
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2 mt-2 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 rounded-xl transition-colors"
                >
                    <RiLogoutBoxLine className="mr-3 text-lg" />
                    <span className="font-semibold text-sm">Logout</span>
                </button>
            </div>
        </div>
    );
};
export default Sidebar;
