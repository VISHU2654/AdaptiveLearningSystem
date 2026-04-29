import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CertificatesPage from './pages/CertificatesPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LearningSidebar from './components/LearningSidebar';
import CoursePlayerModal from './components/CoursePlayerModal';
import LearningChatbot from './components/LearningChatbot';
import useAuthStore from './store/authStore';

function AppShell({ token }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [plan, setPlan] = useState(localStorage.getItem('plan') || 'free');
  const [surpriseTick, setSurpriseTick] = useState(0);
  const [activeCourse, setActiveCourse] = useState(null);

  useEffect(() => {
    localStorage.setItem('plan', plan);
  }, [plan]);

  return (
    <div className="min-h-screen">
      {token && <Navbar />}
      {token && (
        <LearningSidebar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          plan={plan}
          onPlanChange={setPlan}
          onSurprise={() => setSurpriseTick((value) => value + 1)}
        />
      )}

      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={token ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage
                searchTerm={searchTerm}
                plan={plan}
                surpriseTick={surpriseTick}
                onStartCourse={setActiveCourse}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage plan={plan} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>

      {token && <LearningChatbot />}
      <CoursePlayerModal
        course={activeCourse}
        plan={plan}
        onClose={() => setActiveCourse(null)}
        onUpgrade={() => setPlan('premium')}
      />
    </div>
  );
}

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <Router>
      <AppShell token={token} />
    </Router>
  );
}

export default App;
