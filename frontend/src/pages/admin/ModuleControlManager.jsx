import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
    RiToggleLine, RiBookLine, RiFolderOpenLine, RiHistoryLine,
    RiFileTextLine, RiTaskLine, RiDraftLine, RiCalendarEventLine,
    RiMailSendLine, RiBriefcaseLine, RiStore2Line, RiBarChartGroupedLine,
    RiChat1Line, RiCheckLine, RiCloseLine, RiRefreshLine, RiShieldCheckLine
} from 'react-icons/ri';

const MODULE_DEFINITIONS = [
    { key: 'browse_books', name: 'Browse Books', path: '/teacher/dashboard', icon: RiBookLine, category: 'Academic', description: 'Library catalogue and book browsing' },
    { key: 'project_repository', name: 'Project Repository', path: '/engineering/projects', icon: RiFolderOpenLine, category: 'Engineering', description: 'Student and guide engineering projects' },
    { key: 'my_history', name: 'My History', path: '/teacher/history', icon: RiHistoryLine, category: 'User Account', description: 'Personal book borrowing and issue log' },
    { key: 'notes', name: 'Lab Manuals / Notes', path: '/teacher/notes', icon: RiFileTextLine, category: 'Academic', description: 'Course materials, notes and lab manuals' },
    { key: 'assignments', name: 'Assignments', path: '/teacher/assignments', icon: RiTaskLine, category: 'Academic', description: 'Class assignments submission & portal' },
    { key: 'exams', name: 'Online Exams', path: '/teacher/exams', icon: RiDraftLine, category: 'Examination', description: 'Online tests, quizzes and exam portal' },
    { key: 'schedule', name: 'Schedule', path: '/teacher/schedule', icon: RiCalendarEventLine, category: 'Academic', description: 'Timetable and lecture schedule' },
    { key: 'notices', name: 'Class Notices', path: '/teacher/notices', icon: RiMailSendLine, category: 'Communication', description: 'Department announcements and notices' },
    { key: 'placements', name: 'Placement Cell', path: '/engineering/placements', icon: RiBriefcaseLine, category: 'Career', description: 'Campus placements and job opportunities' },
    { key: 'resources', name: 'Resource Booking', path: '/engineering/resources', icon: RiCalendarEventLine, category: 'Facilities', description: 'Lab, seminar hall and equipment booking' },
    { key: 'stationary', name: 'Stationary', path: '/teacher/stationary', icon: RiStore2Line, category: 'Supplies', description: 'Stationary requisition and item requests' },
    { key: 'analytics', name: 'Analytics', path: '/teacher/analytics', icon: RiBarChartGroupedLine, category: 'Reports', description: 'Performance and usage analytics dashboard' },
    { key: 'feedback', name: 'Feedback', path: '/teacher/feedback', icon: RiChat1Line, category: 'Support', description: 'User feedback and suggestion portal' },
];

const ModuleControlManager = () => {
    const [modules, setModules] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchModuleStatus();
    }, []);

    const fetchModuleStatus = async () => {
        setLoading(true);
        try {
            const res = await api.get('/modules');
            if (res.data && res.data.modules) {
                setModules(res.data.modules);
            }
        } catch (error) {
            toast.error('Failed to load menu module statuses');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key, currentStatus) => {
        const newStatus = !currentStatus;
        setModules(prev => ({ ...prev, [key]: newStatus }));

        try {
            await api.put('/modules', {
                module_key: key,
                is_enabled: newStatus
            });
            const modName = MODULE_DEFINITIONS.find(m => m.key === key)?.name || key;
            toast.success(`${modName} is now ${newStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'}`);
            // Dispatch custom window event so Sidebar updates instantly
            window.dispatchEvent(new Event('modulesUpdated'));
        } catch (error) {
            setModules(prev => ({ ...prev, [key]: currentStatus })); // revert
            toast.error('Failed to update module status');
        }
    };

    const handleBatchSetAll = async (targetStatus) => {
        setSaving(true);
        const updatedMap = {};
        MODULE_DEFINITIONS.forEach(m => {
            updatedMap[m.key] = targetStatus;
        });
        setModules(updatedMap);

        try {
            await api.put('/modules', { modules: updatedMap });
            toast.success(`All modules ${targetStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'}`);
            window.dispatchEvent(new Event('modulesUpdated'));
        } catch (error) {
            toast.error('Failed to update all modules');
            fetchModuleStatus();
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = Object.values(modules).filter(Boolean).length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-8 -translate-y-8">
                    <RiToggleLine size={280} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-fuchsia-500/20 text-fuchsia-300 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-fuchsia-500/30">
                        <RiShieldCheckLine size={16} /> Admin Feature Access Control
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                        Menu & Module Control Panel
                    </h1>
                    <p className="text-purple-200/80 text-sm leading-relaxed">
                        Control which features and menu items are visible to Teachers, Students, and Staff. Disabling a module hides it from the menu in real-time.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <button
                            onClick={() => handleBatchSetAll(true)}
                            disabled={saving}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <RiCheckLine size={18} /> Enable All Modules
                        </button>
                        <button
                            onClick={() => handleBatchSetAll(false)}
                            disabled={saving}
                            className="px-5 py-2.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <RiCloseLine size={18} /> Disable All Modules
                        </button>
                        <button
                            onClick={fetchModuleStatus}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                            <RiRefreshLine size={16} /> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold">
                        <RiToggleLine size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Modules</p>
                        <p className="text-xl font-black text-slate-800">
                            {enabledCount} <span className="text-xs font-semibold text-slate-400">/ {MODULE_DEFINITIONS.length} Modules Enabled</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                        {enabledCount} Active
                    </span>
                    <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                        {MODULE_DEFINITIONS.length - enabledCount} Disabled
                    </span>
                </div>
            </div>

            {/* Modules Grid */}
            {loading ? (
                <div className="bg-white p-12 rounded-2xl text-center text-slate-400 font-medium border border-slate-100">
                    <RiRefreshLine className="animate-spin text-3xl mx-auto mb-2 text-indigo-600" />
                    Loading menu modules status...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {MODULE_DEFINITIONS.map(mod => {
                        const Icon = mod.icon;
                        const isEnabled = modules[mod.key] !== false; // Default true if undefined

                        return (
                            <div
                                key={mod.key}
                                className={`p-5 rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between ${
                                    isEnabled
                                        ? 'border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'
                                        : 'border-slate-200 opacity-60 bg-slate-50/50'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${isEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                                <Icon size={22} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-base">{mod.name}</h3>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{mod.category}</span>
                                            </div>
                                        </div>

                                        {/* Toggle Switch */}
                                        <button
                                            onClick={() => handleToggle(mod.key, isEnabled)}
                                            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                                            }`}
                                            title={`Click to ${isEnabled ? 'Disable' : 'Enable'} ${mod.name}`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                    <span className="font-mono text-slate-400 text-[11px] truncate max-w-[180px]">{mod.path}</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ModuleControlManager;
