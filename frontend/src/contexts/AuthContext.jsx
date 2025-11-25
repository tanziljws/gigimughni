import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    // Check if user is logged in from localStorage
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          
          // ⚠️ FIX: Validate token with backend on refresh
          // Only validate if not admin (admin sessions are longer)
          if (parsedUser.role !== 'admin') {
            try {
              // Quick validation - check if token is still valid using existing API service
              await api.get('/auth/profile');
              // If successful, token is valid - continue
            } catch (error) {
              // If 401, token is invalid - logout
              if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('Token invalid on refresh - logging out');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsLoading(false);
                return;
              }
              // Other errors (network, etc.) - don't logout, just log
              console.error('Error validating token (non-fatal):', error);
            }
          }
          
          setUser(parsedUser);
          setLastActivity(Date.now());
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Session timeout - 5 minutes (ONLY for visitors, NOT for admin)
  useEffect(() => {
    if (!user) return;

    // Skip session timeout for admin users
    if (user.role === 'admin') {
      console.log('Admin user - session timeout disabled');
      return;
    }

    // ⚠️ FIX: Increase session timeout to 24 hours (same as JWT expiration)
    // JWT token expires in 24h, so session should match
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    const checkSessionTimeout = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        console.log('Session timeout - logging out user');
        logout();
      }
    };

    // Check timeout every minute
    const timeoutCheckInterval = setInterval(checkSessionTimeout, 60000);
    
    // Update last activity on user interaction
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      clearInterval(timeoutCheckInterval);
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [user, lastActivity]);

  const login = (userData, token) => {
    setUser(userData);
    setLastActivity(Date.now());
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect to login page
    window.location.href = '/login';
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
