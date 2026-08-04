import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import DeveloperCredit from '../components/DeveloperCredit';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(email, password);
            toast.success('Welcome back!');
            const targetFrom = location.state?.from;
            if (targetFrom && targetFrom !== '/' && targetFrom !== '/login' && targetFrom !== '/register') {
                navigate(targetFrom);
            } else if (user.role === 'admin' || user.role === 'hod') {
                navigate('/admin/dashboard');
            } else {
                navigate('/teacher/dashboard');
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-800 p-4">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
                <h2 className="text-3xl font-bold text-center mb-2">LibraryPro</h2>
                <p className="text-center text-blue-100 mb-8">Sign in to your account</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-blue-100 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-blue-300/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 outline-none transition-all placeholder-blue-200/50 text-white"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-blue-100 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-blue-300/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 outline-none transition-all placeholder-blue-200/50 text-white"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-blue-200">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-white font-semibold hover:underline">
                        Register here
                    </Link>
                </div>
                <DeveloperCredit />
            </div>
        </div>
    );
};
export default Login;
