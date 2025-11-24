import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Backend base URL (without /api) for image URLs and other static resources
export const BACKEND_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // ⚠️ FIX: Increase timeout to 30s for registration (email sending might take time)
  headers: {
    'Content-Type': 'application/json',
  },
}); 

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Prevent caching for API calls
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Return the data directly (backend returns { success, message, data })
    return response.data || response;
  },
  (error) => {
    console.error('🔍 API Error:', error.response?.data || error.message);
    
    // Handle session expired
    if (error.response?.status === 401) {
      const errorData = error.response.data;
      
      // Check if user is admin - admin sessions never expire
      const userData = localStorage.getItem('user');
      let isAdmin = false;
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          isAdmin = user.role === 'admin';
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      // Skip logout for admin users
      if (isAdmin) {
        console.log('⚠️ 401 error for admin user - keeping session active');
        // Return the error but don't logout
        return Promise.reject(error.response?.data || error.message);
      }
      
      if (errorData?.code === 'SESSION_EXPIRED') {
        // Show session expired message (only for non-admin)
        alert('Session expired. You will be redirected to login page.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      // Regular unauthorized (only for non-admin)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  adminLogin: (credentials) => api.post('/auth/login/admin', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  cleanupUnverified: (data) => api.post('/auth/cleanup-unverified', data),
  checkVerification: (data) => api.post('/auth/check-verification', data),
  requestPasswordReset: (data) => api.post('/auth/request-password-reset', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/overview'),
};

// Categories API
export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Events API
export const eventsAPI = {
  getAll: (params) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getUpcoming: (params) => api.get('/events/upcoming/events', { params }),
  getByCategory: (categoryId, params) => api.get(`/events/category/${categoryId}`, { params }),
  search: (params) => api.get('/events/search/events', { params }),
  getStats: () => api.get('/events/stats/overview'),
  getParticipants: (eventId) => api.get(`/events/${eventId}/participants`),
};

// Registrations API
export const registrationsAPI = {
  getAll: (params) => api.get('/registrations', { params }),
  getById: (id) => api.get(`/registrations/${id}`),
  create: (data) => api.post('/registrations', data),
  update: (id, data) => api.put(`/registrations/${id}`, data),
  delete: (id) => api.delete(`/registrations/${id}`),
  getStats: () => api.get('/registrations/stats/overview'),
};

// Analytics API
export const analyticsAPI = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getMonthlyEvents: (params) => api.get('/analytics/monthly-events', { params }),
  getMonthlyParticipants: (params) => api.get('/analytics/monthly-participants', { params }),
  getTopEvents: () => api.get('/analytics/top-events'),
  trackAction: (data) => api.post('/analytics/track', data),
  getEventAnalytics: (id, params) => api.get(`/analytics/events/${id}`, { params }),
};

// Certificates API
export const certificatesAPI = {
  getAll: () => api.get('/certificates'),
  getMyCertificates: (params) => api.get('/certificates/my-certificates', { params }),
  getById: (id) => api.get(`/certificates/${id}`),
  create: (data) => api.post('/certificates', data),
  update: (id, data) => api.put(`/certificates/${id}`, data),
  delete: (id) => api.delete(`/certificates/${id}`),
  generate: (eventId, participantId) => api.post(`/certificates/generate`, { event_id: eventId, participant_id: participantId }),
  generateBulk: (eventId) => api.post(`/certificates/generate-bulk`, { event_id: eventId }),
  getTemplate: () => api.get('/certificates/template'),
  updateTemplate: (data) => api.put('/certificates/template', data),
};

// Blogs API
export const blogsAPI = {
  getAll: (params) => api.get('/blogs', { params }),
  getById: (id) => api.get(`/blogs/${id}`),
  create: (data) => {
    // If data is FormData, don't set Content-Type header (browser will set it with boundary)
    if (data instanceof FormData) {
      return api.post('/blogs', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/blogs', data);
  },
  update: (id, data) => {
    // If data is FormData, don't set Content-Type header (browser will set it with boundary)
    if (data instanceof FormData) {
      return api.put(`/blogs/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.put(`/blogs/${id}`, data);
  },
  delete: (id) => api.delete(`/blogs/${id}`),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getAllEvents: (params) => api.get('/admin/events', { params }),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getAllRegistrations: (params) => api.get('/admin/registrations', { params }),
};

// Attendance API
export const attendanceAPI = {
  getTokens: () => api.get('/attendance/tokens'),
  verifyToken: (data) => api.post('/attendance/verify', data),
  submitAttendance: (data) => api.post('/attendance/submit', data),
  getEventAttendance: (eventId) => api.get(`/attendance/event/${eventId}`),
  getAttendanceStats: (eventId) => api.get(`/attendance/stats/${eventId}`),
};

// Contacts API
export const contactsAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getById: (id) => api.get(`/contacts/${id}`),
  updateStatus: (id, status) => api.patch(`/contacts/${id}/status`, { status }),
  reply: (id, replyMessage) => api.post(`/contacts/${id}/reply`, { reply_message: replyMessage }),
};

// Reviews API
export const reviewsAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  getById: (id) => api.get(`/reviews/${id}`),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

export default api;

