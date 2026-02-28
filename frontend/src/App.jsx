import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

// Lazy Load Components to prevent bundle crashes
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const OTPVerification = lazy(() => import('./pages/OTPVerification'));
const Landing = lazy(() => import('./pages/Landing'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const BooksManager = lazy(() => import('./pages/admin/BooksManager'));
const RequestsManager = lazy(() => import('./pages/admin/RequestsManager'));
const IssuesManager = lazy(() => import('./pages/admin/IssuesManager'));
const TeachersManager = lazy(() => import('./pages/admin/TeachersManager'));
const StudentsManager = lazy(() => import('./pages/admin/StudentsManager'));

// Teacher Pages
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherHistory = lazy(() => import('./pages/teacher/MyHistory'));
const NotesManager = lazy(() => import('./pages/teacher/NotesManager'));
const AssignmentsManager = lazy(() => import('./pages/teacher/AssignmentsManager'));
const ExamsManager = lazy(() => import('./pages/teacher/ExamsManager'));
const ExamPortal = lazy(() => import('./pages/teacher/ExamPortal'));
const ScheduleManager = lazy(() => import('./pages/teacher/ScheduleManager'));
const AnalyticsDashboard = lazy(() => import('./pages/teacher/AnalyticsDashboard'));
const TeacherNotices = lazy(() => import('./pages/teacher/TeacherNotices'));
const TeacherPerformance = lazy(() => import('./pages/admin/TeacherPerformance'));
const FeedbackManager = lazy(() => import('./pages/admin/FeedbackManager'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const Feedback = lazy(() => import('./pages/Feedback'));

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
    return user && (user.role === 'admin' || user.role === 'hod') ? children : <Navigate to="/teacher/dashboard" />;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Toaster position="top-right" />
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/verify-otp" element={<OTPVerification />} />
                        <Route path="/" element={<Landing />} />

                        {/* Admin Routes */}
                        <Route path="/admin" element={<PrivateRoute><AdminRoute><Layout /></AdminRoute></PrivateRoute>}>
                            <Route index element={<Navigate to="/admin/dashboard" />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="books" element={<BooksManager />} />
                            <Route path="requests" element={<RequestsManager />} />
                            <Route path="issues" element={<IssuesManager />} />
                            <Route path="teachers" element={<TeachersManager />} />
                            <Route path="students" element={<StudentsManager />} />
                            <Route path="performance" element={<TeacherPerformance />} />
                            <Route path="feedback" element={<FeedbackManager />} />
                            <Route path="profile" element={<ProfileSettings />} />
                        </Route>

                        {/* Teacher Routes */}
                        <Route path="/teacher" element={<PrivateRoute><Layout /></PrivateRoute>}>
                            <Route index element={<Navigate to="/teacher/dashboard" />} />
                            <Route path="dashboard" element={<TeacherDashboard />} />
                            <Route path="history" element={<TeacherHistory />} />
                            <Route path="notes" element={<NotesManager />} />
                            <Route path="assignments" element={<AssignmentsManager />} />
                            <Route path="exams" element={<ExamsManager />} />
                            <Route path="schedule" element={<ScheduleManager />} />
                            <Route path="analytics" element={<AnalyticsDashboard />} />
                            <Route path="notices" element={<TeacherNotices />} />
                            <Route path="feedback" element={<Feedback />} />
                            <Route path="performance" element={<TeacherPerformance />} />
                            <Route path="profile" element={<ProfileSettings />} />
                        </Route>

                        {/* Exam Portal (Full Screen) */}
                        <Route path="/teacher/exams/:id" element={<PrivateRoute><ExamPortal /></PrivateRoute>} />

                        {/* Catch all */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Suspense>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
