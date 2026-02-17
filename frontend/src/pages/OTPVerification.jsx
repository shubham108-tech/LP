import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api'; // Ensure this path is correct based on your file structure

const OTPVerification = () => {
    const [otp, setOtp] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [registrationToken, setRegistrationToken] = useState('');

    useEffect(() => {
        if (location.state && location.state.email && location.state.registrationToken) {
            setEmail(location.state.email);
            setRegistrationToken(location.state.registrationToken);
        } else {
            // If accessed directly without state, redirect to register
            toast.error('Session expired or invalid access. Please register again.');
            navigate('/register');
        }
    }, [location, navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();

        if (!otp) {
            toast.error('Please enter the OTP');
            return;
        }

        try {
            const res = await api.post('/auth/verify-otp', { otp, registrationToken });

            // Store token and user data
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            toast.success('Verification Successful! Welcome!');

            // Redirect based on role
            const role = res.data.user.role;
            setTimeout(() => {
                if (role === 'admin' || role === 'hod') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/teacher/dashboard'); // Or student dashboard if exists
                }
            }, 1000);

        } catch (error) {
            console.error('Verify OTP Error:', error);
            toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
        }
    };

    const handleResend = async () => {
        try {
            const res = await api.post('/auth/resend-otp', { email, registrationToken });

            if (res.data.registrationToken) {
                setRegistrationToken(res.data.registrationToken);
            }

            toast.success('OTP Resent! Check your email.');
        } catch (error) {
            console.error('Resend OTP Error:', error);
            toast.error(error.response?.data?.message || 'Failed to resend OTP');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-800 p-4">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
                <h2 className="text-3xl font-bold text-center mb-2">Verification</h2>
                <p className="text-center text-blue-100 mb-8">
                    Enter the code sent to {email}
                </p>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-blue-100 mb-1">OTP Code</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-blue-300/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 outline-none transition-all placeholder-blue-200/50 text-white text-center tracking-[1em] text-2xl"
                            placeholder="••••••"
                            value={otp}
                            maxLength={6}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 transition-all transform hover:scale-[1.02]"
                    >
                        Verify & Create Account
                    </button>
                </form>

                <div className="mt-6 flex justify-between items-center text-sm text-blue-200">
                    <button type="button" onClick={handleResend} className="hover:text-white underline">
                        Resend Code
                    </button>
                    <Link to="/register" className="hover:text-white underline">
                        Change Email
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OTPVerification;
