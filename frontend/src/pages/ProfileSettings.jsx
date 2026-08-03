import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RiUserLine, RiMailLine, RiUploadCloud2Line, RiLockPasswordLine, RiSave3Line } from 'react-icons/ri';
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

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">

                {/* Profile Image */}
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg">
                            {previewImage ? (
                                <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-indigo-50 text-indigo-300 flex items-center justify-center">
                                    <RiUserLine size={64} />
                                </div>
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                            <RiUploadCloud2Line size={32} />
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>
                    <p className="text-sm text-gray-500">Click image to change photo</p>
                </div>

                <div className="space-y-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Branch</label>
                                <select
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                >
                                    <option value="">Select Branch</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                                    <option value="Civil Engineering">Civil Engineering</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Electronics & Comm">Electronics & Comm</option>
                                    <option value="Electrical Engineering">Electrical Engineering</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Year</label>
                                <select
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                >
                                    <option value="">Select Year</option>
                                    <option value="First Year">First Year</option>
                                    <option value="Second Year">Second Year</option>
                                    <option value="Third Year">Third Year</option>
                                    <option value="Final Year">Final Year</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Division</label>
                                <select
                                    name="division"
                                    value={formData.division}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                >
                                    <option value="">Select Division</option>
                                    <option value="A">Division A</option>
                                    <option value="B">Division B</option>
                                    <option value="C">Division C</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Password */}
                    <div className="space-y-2">
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
        </div>
    );
};

export default ProfileSettings;
