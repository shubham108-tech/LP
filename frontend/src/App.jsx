import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Suspense } from 'react';

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
