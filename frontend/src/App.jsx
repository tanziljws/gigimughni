import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import PageTransition from './components/PageTransition';
import HomePage from './pages/main/HomePage';
import MobileAppPage from './pages/main/MobileAppPage';
import EventsPage from './pages/events/EventsPage';
import EventListPage from './pages/events/EventsListPage';
import EventDetail from './pages/events/EventDetailModern';
import CreateEvent from './pages/events/CreateEvent';
import EventDashboard from './pages/events/EventDashboard';
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import ContactPage from './pages/contact/ContactPage';
import BlogPage from './pages/blog/BlogPage';
import ArticleDetailPage from './pages/blog/ArticleDetailPage';
import SettingsPage from './pages/settings/profile';
import AttendancePage from './pages/attendance/AttendancePage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import MyEvents from './pages/user/MyEvents';
import RegistrationFormPage from './pages/events/RegistrationFormPage';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentPendingPage from './pages/payment/PaymentPendingPage';
import PaymentErrorPage from './pages/payment/PaymentErrorPage';
// Removed separate pages - now integrated into Settings

// Admin Components
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import EventsManagement from './pages/admin/EventsManagement';
import EditEvent from './pages/admin/EditEvent';
import CategoriesManagement from './pages/admin/CategoriesManagement';
import UsersManagement from './pages/admin/UsersManagement';
import RegistrationsManagement from './pages/admin/RegistrationsManagement';
import Analytics from './pages/admin/Analytics';
import StatisticsDashboard from './pages/admin/StatisticsDashboard';
import CertificateManagement from './pages/admin/CertificateManagement';
import BlogManagement from './pages/admin/BlogManagement';
import ReviewsManagement from './pages/admin/ReviewsManagement';
import ReportsManagement from './pages/admin/ReportsManagement';
import ContactManagement from './pages/admin/ContactManagement';

// CSS files are now imported in main.jsx

// Simple page transition animations CSS
const pageTransitionStyles = `
  .page-wrapper {
    position: relative;
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .page-content {
    width: 100%;
  }
`;
// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <style>{pageTransitionStyles}</style>
            <AnimatedRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

// Animated Routes Component
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <div className="page-wrapper" style={{ backgroundColor: '#fff' }}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="/mobile-app" element={<PageTransition><MobileAppPage /></PageTransition>} />
          <Route path="/events" element={<PageTransition><EventsPage /></PageTransition>} />
          <Route path="/events-dashboard" element={<PageTransition><EventDashboard /></PageTransition>} />
          <Route path="/events-list" element={<PageTransition><EventListPage /></PageTransition>} />
          <Route path="/events/create" element={<PageTransition><CreateEvent /></PageTransition>} />
          <Route path="/events/:id" element={<PageTransition><EventDetail /></PageTransition>} />
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/blog" element={<PageTransition><BlogPage /></PageTransition>} />
          <Route path="/blog/:slug" element={<PageTransition><ArticleDetailPage /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="/my-events" element={<PageTransition><MyEvents /></PageTransition>} />
          <Route path="/reviews" element={<PageTransition><ReviewsPage /></PageTransition>} />
          <Route path="/attendance/:eventId" element={<PageTransition><AttendancePage /></PageTransition>} />
          <Route path="/register-event/:eventId" element={<PageTransition><RegistrationFormPage /></PageTransition>} />
          <Route path="/payment/success" element={<PageTransition><PaymentSuccessPage /></PageTransition>} />
          <Route path="/payment/pending" element={<PageTransition><PaymentPendingPage /></PageTransition>} />
          <Route path="/payment/error" element={<PageTransition><PaymentErrorPage /></PageTransition>} />
            
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="events" element={<EventsManagement />} />
            <Route path="events/edit/:id" element={<EditEvent />} />
            <Route path="categories" element={<CategoriesManagement />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="registrations" element={<RegistrationsManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="statistics" element={<StatisticsDashboard />} />
            <Route path="certificates" element={<CertificateManagement />} />
            <Route path="blogs" element={<BlogManagement />} />
            <Route path="reviews" element={<ReviewsManagement />} />
            <Route path="reports" element={<ReportsManagement />} />
            <Route path="contacts" element={<ContactManagement />} />
          </Route>
            
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default App;

