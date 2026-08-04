import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RiUserLine, RiMailLine, RiUploadCloud2Line, RiLockPasswordLine, RiSave3Line, RiErrorWarningLine, RiRefreshLine } from 'react-icons/ri';
import { SERVER_URL } from '../config';

const ProfileSettings = () => {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        branch: '',
        year: '',
        division: '',
        profile_image: null
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                branch: user.branch || '',
                year: user.year || '',
                division: user.division || ''
            }));
            if (user.profile_image) {
                setPreviewImage(`${SERVER_URL}${user.profile_image}`);
            }
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, profile_image: file });
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Updating profile...');

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            if (formData.branch) data.append('branch', formData.branch);
            if (formData.year) data.append('year', formData.year);
            if (formData.division) data.append('division', formData.division);
            if (formData.password) {
                data.append('password', formData.password);
            }
            if (formData.profile_image instanceof File) {
                data.append('profile_image', formData.profile_image);
            }

            const res = await api.put('/auth/profile', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            updateUser(res.data.user);
            toast.success('Profile updated successfully', { id: toastId });
            setFormData(prev => ({ ...prev, password: '' })); // Clear password
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed', { id: toastId });
        }
    };

    const handleResetDatabase = async () => {
        if (confirmText.trim().toUpperCase() !== 'RESET') {
            toast.error('Please type RESET to confirm');
            return;
        }

        setIsResetting(true);
        try {
            const res = await api.post('/admin/reset-data');
            toast.success(res.data.message || 'Database reset successfully!');
            setShowResetModal(false);
            setConfirmText('');
            window.location.reload();
        } catch (error) {
            console.error('Reset error:', error);
            toast.error(error.response?.data?.message || 'Failed to reset database');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">Profile Settings</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6">
                
                {/* Profile Image */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
                        {previewImage ? (
                            <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <RiUserLine className="text-indigo-300 text-4xl" />
                        )}
                    </div>
                    <div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">
                            <RiUploadCloud2Line size={18} /> Change Photo
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                        <p className="text-xs text-slate-400 mt-2">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <RiUserLine /> Full Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <RiMailLine /> Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50"
                            required
                        />
                    </div>

                    {/* Additional Details (Branch/Year/Division) */}
                    {(user?.role === 'student' || user?.role === 'teacher') && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Branch</label>
                                <select name="branch" value={formData.branch} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                    <option value="">Select Branch</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                                    <option value="Civil Engineering">Civil Engineering</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Electronics & Comm">Electronics & Comm</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Year</label>
                                    <select name="year" value={formData.year} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                        <option value="">Year</option>
                                        <option value="First Year">First</option>
                                        <option value="Second Year">Second</option>
                                        <option value="Third Year">Third</option>
                                        <option value="Final Year">Final</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Division</label>
                                    <select name="division" value={formData.division} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                        <option value="">Div</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Password */}
                    <div className="space-y-2 col-span-full">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <RiLockPasswordLine /> New Password <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Leave blank to keep current password"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition flex items-center justify-center gap-2">
                        <RiSave3Line size={20} /> Save Changes
                    </button>
                </div>
            </form>

            {/* Admin Danger Zone: System Reset */}
            {user?.role === 'admin' && (
                <div className="mt-12 pt-8 border-t border-rose-200">
                    <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 text-rose-700 mb-2">
                            <RiErrorWarningLine className="text-2xl" />
                            <h3 className="text-lg font-extrabold">Danger Zone: System Reset</h3>
                        </div>
                        <p className="text-xs text-rose-600 mb-4 leading-relaxed">
                            Resetting the database will permanently delete all data. This action is irreversible.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowResetModal(true)}
                            className="px-5, py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 text-sm"
                        >
                            <RiRefreshLine className="text-lg" /> Reset System Database
                        </button>
                    </div>
                </div>
            )}

            {/* Reset Safety Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="p-3 bg-rose-100 rounded-xl">
                                <RiErrorWarningLine className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Confirm System Reset</h3>
                                <p className="text-xs text-slate-500">This action cannot be reversed!</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Type <strong className="text-rose-600">RESET</strong> to confirm clearing all data.
                        </p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type RESET"
                            className="w-full px-4 py-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none uppercase font-mono font-bold"
                        />
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowResetModal(false); setConfirmText(''); }}
                                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleResetDatabase}
                                disabled={isResetting || confirmText.trim().toUpperCase() !== 'RESET'}
                                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition disabled:opacity-40 text-sm"
                            >
                                {isResetting ? 'Resetting...' : 'Confirm Reset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSettings;
