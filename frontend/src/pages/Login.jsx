import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import DeveloperCredit from '../components/DeveloperCredit';
import Background3DEffect from '../components/Background3DEffect';
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(email, password);
            toast.success('Welcome back!');

            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                // For teacher, student, and hod
                let isBrowseBooksEnabled = true;
                try {
                    const res = await api.get('/modules');
                    if (res.data && res.data.modules && res.data.modules.browse_books === false) {
                        isBrowseBooksEnabled = false;
                    }
                } catch (err) {
                    console.warn('Failed to fetch modules status on login:', err);
                }

                if (!isBrowseBooksEnabled) {
                    navigate('/teacher/stationary');
                } else {
                    const targetFrom = location.state?.from;
                    if (targetFrom && targetFrom !== '/' && targetFrom !== '/login' && targetFrom !== '/register') {
                        navigate(targetFrom);
                    } else {
                        navigate('/teacher/dashboard');
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative font-sans">
            <Background3DEffect />
            <div className="bg-[#170a35]/80 backdrop-blur-2xl border border-purple-400/30 p-8 md:p-10 rounded-3xl shadow-[0_30px_70px_rgba(147,51,234,0.3)] w-full max-w-md text-white transition-transform duration-300 hover:border-fuchsia-400/50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-3xl font-black shadow-lg shadow-fuchsia-500/40 border border-fuchsia-300/40">
                    LP
                </div>
                <h2 className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-fuchsia-300 via-purple-200 to-pink-300 text-transparent bg-clip-text">LibraryPro</h2>
                <p className="text-center text-purple-200/80 text-sm mb-8 font-medium">Sign in to your 3D Executive Dashboard</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3.5 rounded-xl bg-purple-950/50 border border-purple-400/30 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/40 outline-none transition-all placeholder-purple-300/40 text-white text-sm"
                            placeholder="bhendavade@library.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-purple-200 mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-purple-950/50 border border-purple-400/30 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/40 outline-none transition-all placeholder-purple-300/40 text-white text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-300/60 hover:text-fuchsia-400 transition-colors"
                                tabIndex={-1}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-fuchsia-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-purple-300/70">
                    Contact System Administrator for account access.
                </div>
                <DeveloperCredit />
            </div>
        </div>
    );
};
export default Login;
