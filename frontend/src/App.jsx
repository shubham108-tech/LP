import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
                    <div className="p-4 bg-rose-500/20 rounded-full text-rose-400 text-5xl mb-4">🚀</div>
                    <h2 className="text-2xl font-bold mb-2">New System Update Available!</h2>
                    <p className="text-slate-400 max-w-md mb-6 text-sm">
                        LibraryPro has been updated with new improvements. Click below to load the latest version.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition text-sm"
                    >
                        Refresh Page Now
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Direct Page Imports (Eliminates Dynamic Import 404 Chunk Errors Completely)
import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerification from './pages/OTPVerification';
import Landing from './pages/Landing';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import BooksManager from './pages/admin/BooksManager';
import RequestsManager from './pages/admin/RequestsManager';
import IssuesManager from './pages/admin/IssuesManager';
import TeachersManager from './pages/admin/TeachersManager';
import StudentsManager from './pages/admin/StudentsManager';
import StationaryAdmin from './pages/admin/StationaryAdmin';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherHistory from './pages/teacher/MyHistory';
import NotesManager from './pages/teacher/NotesManager';
import AssignmentsManager from './pages/teacher/AssignmentsManager';
import ExamsManager from './pages/teacher/ExamsManager';
import ExamPortal from './pages/teacher/ExamPortal';
import ScheduleManager from './pages/teacher/ScheduleManager';
import AnalyticsDashboard from './pages/teacher/AnalyticsDashboard';
import TeacherNotices from './pages/teacher/TeacherNotices';
import TeacherPerformance from './pages/admin/TeacherPerformance';
import FeedbackManager from './pages/admin/FeedbackManager';
import ProfileSettings from './pages/ProfileSettings';
import Feedback from './pages/Feedback';
import StationaryTeacher from './pages/teacher/StationaryTeacher';

// Engineering / Shared Pages
import ProjectRepository from './pages/engineering/ProjectRepository';
import PlacementZone from './pages/engineering/PlacementZone';
import ResourceBooking from './pages/engineering/ResourceBooking';

// Components
import Layout from './components/Layout';

// Loading Component
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) return <PageLoader />;
    return user ? children : <Navigate to="/login" state={{ from: location.pathname }} replace />;
};

const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <PageLoader />;
    return user && (user.role === 'admin' || user.role === 'hod') ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <BrowserRouter basename="/LP">
                    <Toaster position="top-right" />
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/verify-otp" element={<OTPVerification />} />

                            {/* Shared Protected Routes */}
                            <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
                                <Route index element={<Navigate to="/admin" replace />} />
                                <Route path="profile" element={<ProfileSettings />} />
                                <Route path="feedback" element={<Feedback />} />
                            </Route>

                            {/* Admin & HOD Routes */}
                            <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
                                <Route index element={<AdminDashboard />} />
                                <Route path="books" element={<BooksManager />} />
                                <Route path="requests" element={<RequestsManager />} />
                                <Route path="issues" element={<IssuesManager />} />
                                <Route path="teachers" element={<TeachersManager />} />
                                <Route path="students" element={<StudentsManager />} />
                                <Route path="stationary" element={<StationaryAdmin />} />
                                <Route path="performance" element={<TeacherPerformance />} />
                                <Route path="feedback" element={<FeedbackManager />} />
                            </Route>

                            {/* Teacher Routes */}
                            <Route path="/teacher" element={<PrivateRoute><Layout /></PrivateRoute>}>
                                <Route index element={<TeacherDashboard />} />
                                <Route path="history" element={<TeacherHistory />} />
                                <Route path="notes" element={<NotesManager />} />
                                <Route path="assignments" element={<AssignmentsManager />} />
                                <Route path="exams" element={<ExamsManager />} />
                                <Route path="exam-portal" element={<ExamPortal />} />
                                <Route path="schedules" element={<ScheduleManager />} />
                                <Route path="analytics" element={<AnalyticsDashboard />} />
                                <Route path="notices" element={<TeacherNotices />} />
                                <Route path="stationary" element={<StationaryTeacher />} />
                            </Route>

                            {/* Shared Engineering Routes */}
                            <Route path="/engineering" element={<PrivateRoute><Layout /></PrivateRoute>}>
                                <Route path="projects" element={<ProjectRepository />} />
                                <Route path="placements" element={<PlacementZone />} />
                                <Route path="booking" element={<ResourceBooking />} />
                            </Route>

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
