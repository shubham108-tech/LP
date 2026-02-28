import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SERVER_URL } from '../../config';
import toast from 'react-hot-toast';
import {
    RiAddLine, RiUploadCloud2Line, RiSearchLine, RiPencilLine,
    RiDeleteBinLine, RiHistoryLine, RiUserStarLine, RiCloseLine,
    RiShieldUserLine, RiCheckDoubleLine
} from 'react-icons/ri';

const TeachersManager = () => {
    const { user } = useAuth();
    // Data
    const [teachers, setTeachers] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, newThisMonth: 0 });

    // UI State
    const [viewRole, setViewRole] = useState('teacher'); // 'teacher' or 'hod'
    const [searchTerm, setSearchTerm] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Selection
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [teacherHistory, setTeacherHistory] = useState([]);

    // Forms
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'teacher', branch: '' });
    const [profileImage, setProfileImage] = useState(null);
    const [bulkFile, setBulkFile] = useState(null);

    useEffect(() => {
        fetchTeachers();
    }, [viewRole]);

    const fetchTeachers = async () => {
        try {
            const res = await api.get(`/auth/users?role=${viewRole}`);
            setTeachers(res.data);

            // Calc stats
            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();

            setStats({
                total: res.data.length,
                active: res.data.length, // Assuming active
                newThisMonth: res.data.filter(t => {
                    const d = new Date(t.created_at);
                    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                }).length
            });
        } catch (error) {
            toast.error('Failed to fetch teachers');
        }
    };

    const fetchHistory = async (teacher) => {
        try {
            const res = await api.get(`/issues/history/${teacher.id}`);
            setTeacherHistory(res.data);
            setSelectedTeacher(teacher);
            setShowHistoryModal(true);
        } catch (error) {
            toast.error('Failed to fetch history');
        }
    };

    // HOD Branch Lock Helper
    useEffect(() => {
        if (showFormModal && user?.role === 'hod' && user?.branch) {
            setFormData(prev => ({ ...prev, role: 'teacher', branch: user.branch }));
        }
    }, [showFormModal, user]);

    // --- Actions ---

    const handleManualRegister = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('role', formData.role);
            if (formData.branch) data.append('branch', formData.branch);
            if (profileImage) {
                data.append('profile_image', profileImage);
            }

            await api.post('/auth/users', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(`${formData.role.toUpperCase()} added successfully`);
            setFormData({ name: '', email: '', password: '', role: viewRole, branch: '' });
            setProfileImage(null);
            setShowFormModal(false);
            fetchTeachers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add user');
        }
    };

    const handleBulkRegister = async () => {
        if (!bulkFile) return;
        const data = new FormData();
        data.append('file', bulkFile);
        data.append('role', 'teacher');

        const toastId = toast.loading('Processing file...');
        try {
            const res = await api.post('/auth/register/bulk', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message, { id: toastId });
            fetchTeachers();
            setBulkFile(null);
            setShowFormModal(false);
        } catch (err) {
            toast.error('Upload failed', { id: toastId });
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/auth/users/${selectedTeacher.id}`, {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                branch: formData.branch
            });
            toast.success('Teacher updated');
            setShowEditModal(false);
            fetchTeachers();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this teacher? This will also delete their history.')) return;
        try {
            await api.delete(`/auth/users/${id}`);
            toast.success('Teacher removed');
            fetchTeachers();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const openEdit = (teacher) => {
        setSelectedTeacher(teacher);
        setFormData({ name: teacher.name, email: teacher.email, password: '', role: viewRole, branch: teacher.branch || '' });
        setShowEditModal(true);
    };

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{viewRole === 'teacher' ? 'Faculty Management' : 'Department Heads (HOD)'}</h1>
                    <p className="text-sm text-slate-500">Manage {viewRole} accounts and assignments</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewRole('teacher')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${viewRole === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            disabled={user?.role === 'hod'} // HODs only see teachers
                        >
                            Teachers
                        </button>
                        {user?.role !== 'hod' && (
                            <button
                                onClick={() => setViewRole('hod')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${viewRole === 'hod' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                HODs
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => { setShowFormModal(true); setFormData({ name: '', email: '', password: '', role: viewRole, branch: '' }); setBulkFile(null); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition font-medium"
                    >
                        <RiAddLine size={20} /> Add {viewRole === 'teacher' ? 'Teacher' : 'HOD'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><RiUserStarLine size={28} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Faculty</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><RiCheckDoubleLine size={28} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><RiAddLine size={28} /></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Joined This Month</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.newThisMonth}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <div className="relative flex-1 max-w-lg">
                    <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">{viewRole === 'teacher' ? 'Teacher Name' : 'HOD Name'}</th>
                                <th className="px-6 py-4">Email Address</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Joined On</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTeachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-slate-50 transition group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {teacher.profile_image ? (
                                                <img
                                                    src={`${SERVER_URL}${teacher.profile_image}`}
                                                    alt={teacher.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                                    {teacher.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="font-medium text-slate-800">{teacher.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{teacher.email}</td>
                                    <td className="px-6 py-4 text-slate-600 font-medium text-xs">{teacher.branch || 'General'}</td>
                                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">{new Date(teacher.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => fetchHistory(teacher)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="View History"><RiHistoryLine size={18} /></button>
                                        <button onClick={() => openEdit(teacher)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit details"><RiPencilLine size={18} /></button>
                                        <button onClick={() => handleDelete(teacher.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Account"><RiDeleteBinLine size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTeachers.length === 0 && (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No teachers found matching your search.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD TEACHER MODAL */}
            {showFormModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-slate-800">Add Faculty Member</h2>
                            <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"><RiCloseLine size={24} /></button>
                        </div>

                        <div className="p-6">
                            {/* Tabs */}
                            <div className="flex gap-4 mb-6 border-b border-gray-100 pb-1">
                                <button className={`pb-2 text-sm font-bold border-b-2 transition ${!bulkFile ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`} onClick={() => setBulkFile(null)}>Manual Entry</button>
                                <button className={`pb-2 text-sm font-bold border-b-2 transition ${bulkFile ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`} onClick={() => setBulkFile({})}>Bulk Upload</button>
                            </div>

                            {bulkFile ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl bg-slate-50 text-center hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer relative">
                                        <input type="file" accept=".xlsx,.csv,.pdf,.ods" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setBulkFile(e.target.files[0])} />
                                        <RiUploadCloud2Line className="mx-auto text-4xl text-indigo-400 mb-2" />
                                        <p className="font-medium text-slate-700">{bulkFile.name || "Click to upload file"}</p>
                                        <p className="text-xs text-slate-400 mt-1">Supports Excel, CSV, PDF</p>
                                    </div>
                                    <p className="text-xs text-slate-500 text-center">Format: Name, Email. Default password: <code>password123</code></p>
                                    <button onClick={handleBulkRegister} disabled={!bulkFile?.name} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none">Start Import</button>
                                </div>
                            ) : (
                                <form onSubmit={handleManualRegister} className="space-y-4 animate-fade-in">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Full Name</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Prof. Jane Doe" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Profile Photo</label>
                                        <div className="relative border border-gray-200 rounded-lg p-2 flex items-center gap-3 bg-gray-50">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setProfileImage(e.target.files[0])}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            />
                                            <div className="p-2 bg-white rounded-md border border-gray-200 text-gray-500">
                                                <RiUploadCloud2Line size={20} />
                                            </div>
                                            <span className="text-sm text-gray-500 truncate">
                                                {profileImage ? profileImage.name : "Upload photo (Optional)"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Email Address</label>
                                        <input type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required placeholder="jane@university.edu" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Password</label>
                                        <input type="password" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required placeholder="••••••••" />
                                    </div>
                                    {user?.role !== 'hod' && (
                                        <div className="space-y-2">
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="teacher">Teacher</option>
                                                <option value="hod">HOD (Department Head)</option>
                                            </select>
                                        </div>
                                    )}

                                    {(!user?.branch || user?.role !== 'hod') && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Department (Branch)</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={formData.branch}
                                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                            >
                                                <option value="">Select Department</option>
                                                <option value="Computer Science">Computer Science</option>
                                                <option value="Civil Engineering">Civil Engineering</option>
                                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                                <option value="Electronics & Comm">Electronics & Comm</option>
                                                <option value="Electrical Engineering">Electrical Engineering</option>
                                                <option value="General">General / All</option>
                                            </select>
                                        </div>
                                    )}
                                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">Create Account</button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Edit Teacher</h2>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Full Name</label>
                                <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Email</label>
                                <input type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">New Password <span className="text-xs font-normal text-gray-400">(Leave blank to keep current)</span></label>
                                <input type="password" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.password || ''}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Role</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="teacher">Teacher</option>
                                    <option value="hod">HOD (Department Head)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Department (Branch)</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.branch || ''}
                                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                >
                                    <option value="">Select Department</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Civil Engineering">Civil Engineering</option>
                                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                                    <option value="Electronics & Comm">Electronics & Comm</option>
                                    <option value="Electrical Engineering">Electrical Engineering</option>
                                    <option value="General">General / All</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 bg-gray-100 text-slate-600 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-lg">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {showHistoryModal && selectedTeacher && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Borrowing History</h2>
                                <p className="text-xs text-slate-500">Teacher: {selectedTeacher.name}</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)}><RiCloseLine size={24} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3">Book Title</th>
                                        <th className="px-6 py-3">Issue Date</th>
                                        <th className="px-6 py-3">Returned On</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teacherHistory.map((h) => (
                                        <tr key={h.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3">
                                                <p className="font-medium text-slate-800">{h.book_name}</p>
                                                <p className="text-[10px] text-slate-400">{h.author}</p>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600">{new Date(h.issue_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 text-slate-600">{h.return_date ? new Date(h.return_date).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${h.returned ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-600'}`}>
                                                    {h.returned ? 'Returned' : 'Issued'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {teacherHistory.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-gray-400">No history found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                            <button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 bg-white border border-gray-300 text-slate-600 rounded-lg hover:bg-gray-50 text-sm font-medium">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeachersManager;
