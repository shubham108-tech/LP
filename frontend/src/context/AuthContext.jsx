import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = () => {
            try {
                const token = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');
                if (token && storedUser && storedUser !== 'undefined') {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Auth init error:", error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data.user;
    };

    const register = async (name, email, password, role) => {
        await api.post('/auth/register', { name, email, password, role });
    };

    const verifyOTP = async (email, otp) => {
        const res = await api.post('/auth/verify-otp', { email, otp });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data.user;
    };

    const resendOTP = async (email) => {
        await api.post('/auth/resend-otp', { email });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        // Don't force reload, let state update handle it
    };

    const updateUser = (userData) => {
        const newUser = { ...user, ...userData };
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOTP, resendOTP, logout, updateUser, loading }}>
            {loading ? (
                <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <div className="text-xl font-semibold text-blue-600">Initializing Application...</div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
