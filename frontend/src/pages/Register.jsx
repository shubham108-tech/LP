import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import DeveloperCredit from '../components/DeveloperCredit';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation
        if (!name || !email || !password) {
            toast.error('Please fill in all fields');
            setLoading(false);
            return;
        }

        try {
            console.log('Initiating registration for:', email);
            const res = await api.post('/auth/register', { name, email, password, role });
            console.log('Register Response:', res.data);

            if (res.data && res.data.registrationToken) {
                toast.success('OTP Sent! Go to next step.');

                // Navigate after a brief delay to ensure user sees success
                setTimeout(() => {
                    navigate('/verify-otp', {
                        state: {
                            email,
                            registrationToken: res.data.registrationToken
                        },
                        replace: true
                    });
                    setLoading(false);
                }, 1000);

            } else {
                console.error('No registration token received:', res.data);
                toast.error('Failed to initiate verification. Try again.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Registration/Submit Error:', error);
            // Handle error response gracefully
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Registration failed. Please check your connection.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-800 p-4">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
                <h2 className="text-3xl font-bold text-center mb-2">LibraryPro</h2>
                <p className="text-center text-blue-100 mb-8">
                    Create your account
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-blue-100 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-blue-300/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 outline-none transition-all placeholder-blue-200/50 text-white"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-blue-100 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-blue-300/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 outline-none transition-all placeholder-blue-200/50 text-white"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
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
                            disabled={loading}
                        />
                    </div>

                    <input type="hidden" value="student" />

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] mt-4 flex justify-center items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending OTP...
                            </>
                        ) : 'Register'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-blue-200">
                    Already have an account?{' '}
                    <Link to="/login" className="text-white font-semibold hover:underline">
                        Login here
                    </Link>
                </div>
                <DeveloperCredit />
            </div>
        </div>
    );
};

export default Register;
