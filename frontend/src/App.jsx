import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';

import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import ReviewPage from './pages/ReviewPage';
import HistoryPage from './pages/HistoryPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SurveyPage from './pages/SurveyPage';

// Pages where the footer should be hidden so content fills the screen
const NO_FOOTER_PATHS = ['/quiz', '/survey'];

function HomeRedirect() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <HomePage />;
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
}

function AuthRedirect({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
}

function DashboardRedirect() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <DashboardPage />;
}

function QuizRedirect() {
  const { user } = useAuth();
  if (user && !user.survey_completed) return <Navigate to="/survey" replace />;
  return <QuizPage />;
}

export default function App() {
  const location = useLocation();
  const hideFooter = NO_FOOTER_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen flex flex-col bg-cyber-darkest">
      <Navbar />
      <main className="flex-1 flex flex-col" style={hideFooter ? { overflow: 'hidden' } : {}}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<AuthRedirect><AuthPage /></AuthRedirect>} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
          <Route path="/survey" element={<ProtectedRoute userOnly><SurveyPage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute userOnly><QuizRedirect /></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/review/:id" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
