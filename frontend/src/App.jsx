import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

// Auto-reload page when dynamic imports fail due to new deployment asset hash updates
window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    window.location.reload();
});

const safeLazy = (importFn) => {
    return lazy(() =>
        importFn().catch((err) => {
            console.warn('Chunk load error, refreshing latest build assets...', err);
            window.location.reload();
            return new Promise(() => {});
        })
    );
};

// Lazy Load Components
const Login = safeLazy(() => import('./pages/Login'));
const Register = safeLazy(() => import('./pages/Register'));
const OTPVerification = safeLazy(() => import('./pages/OTPVerification'));
const Landing = safeLazy(() => import('./pages/Landing'));

// Admin Pages
const AdminDashboard = safeLazy(() => import('./pages/admin/AdminDashboard'));
const BooksManager = safeLazy(() => import('./pages/admin/BooksManager'));
const RequestsManager = safeLazy(() => import('./pages/admin/RequestsManager'));
const IssuesManager = safeLazy(() => import('./pages/admin/IssuesManager'));
const TeachersManager = safeLazy(() => import('./pages/admin/TeachersManager'));
const StudentsManager = safeLazy(() => import('./pages/admin/StudentsManager'));
const StationaryAdmin = safeLazy(() => import('./pages/admin/StationaryAdmin'));
const ModuleControlManager = safeLazy(() => import('./pages/admin/ModuleControlManager'));

// Teacher Pages
const TeacherDashboard = safeLazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherHistory = safeLazy(() => import('./pages/teacher/MyHistory'));
const NotesManager = safeLazy(() => import('./pages/teacher/NotesManager'));
const AssignmentsManager = safeLazy(() => import('./pages/teacher/AssignmentsManager'));
const ExamsManager = safeLazy(() => import('./pages/teacher/ExamsManager'));
const ExamPortal = safeLazy(() => import('./pages/teacher/ExamPortal'));
const ScheduleManager = safeLazy(() => import('./pages/teacher/ScheduleManager'));
const AnalyticsDashboard = safeLazy(() => import('./pages/teacher/AnalyticsDashboard'));
const TeacherNotices = safeLazy(() => import('./pages/teacher/TeacherNotices'));
const TeacherPerformance = safeLazy(() => import('./pages/admin/TeacherPerformance'));
const FeedbackManager = safeLazy(() => import('./pages/admin/FeedbackManager'));
const ProfileSettings = safeLazy(() => import('./pages/ProfileSettings'));
const Feedback = safeLazy(() => import('./pages/Feedback'));
const StationaryTeacher = safeLazy(() => import('./pages/teacher/StationaryTeacher'));

// Engineering / Shared Pages
const ProjectRepository = safeLazy(() => import('./pages/engineering/ProjectRepository'));
const PlacementZone = safeLazy(() => import('./pages/engineering/PlacementZone'));
const ResourceBooking = safeLazy(() => import('./pages/engineering/ResourceBooking'));

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
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 1500,
                        style: {
                            borderRadius: '14px',
                            background: '#0f172a',
                            color: '#f8fafc',
                            fontSize: '13px',
                            fontWeight: '600',
                            padding: '12px 18px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        },
                        success: {
                            duration: 1500,
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#ffffff',
                            },
                        },
                        error: {
                            duration: 1500,
                            iconTheme: {
                                primary: '#f43f5e',
                                secondary: '#ffffff',
                            },
                        }
                    }}
                />
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Navigate to="/login" replace />} />
                        <Route path="/verify-otp" element={<OTPVerification />} />
                        <Route path="/" element={<Landing />} />

                        {/* Admin Routes */}
                        <Route path="/admin" element={<PrivateRoute><AdminRoute><Layout /></AdminRoute></PrivateRoute>}>
                            <Route index element={<Navigate to="/admin/dashboard" />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="modules" element={<ModuleControlManager />} />
                            <Route path="books" element={<BooksManager />} />
                            <Route path="requests" element={<RequestsManager />} />
                            <Route path="issues" element={<IssuesManager />} />
                            <Route path="teachers" element={<TeachersManager />} />
                            <Route path="students" element={<StudentsManager />} />
                            <Route path="stationary" element={<StationaryAdmin />} />
                            <Route path="performance" element={<TeacherPerformance />} />
                            <Route path="feedback" element={<FeedbackManager />} />
                            <Route path="profile" element={<ProfileSettings />} />
                        </Route>

                        {/* Engineering / Shared Routes */}
                        <Route path="/engineering" element={<PrivateRoute><Layout /></PrivateRoute>}>
                            <Route path="projects" element={<ProjectRepository />} />
                            <Route path="placements" element={<PlacementZone />} />
                            <Route path="resources" element={<ResourceBooking />} />
                        </Route>

                        {/* Teacher/Student Routes */}
                        <Route path="/teacher" element={<PrivateRoute><Layout /></PrivateRoute>}>
                            <Route index element={<Navigate to="/teacher/dashboard" />} />
                            <Route path="dashboard" element={<TeacherDashboard />} />
                            <Route path="history" element={<TeacherHistory />} />
                            <Route path="notes" element={<NotesManager />} />
                            <Route path="assignments" element={<AssignmentsManager />} />
                            <Route path="exams" element={<ExamsManager />} />
                            <Route path="schedule" element={<ScheduleManager />} />
                            <Route path="stationary" element={<StationaryTeacher />} />
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
