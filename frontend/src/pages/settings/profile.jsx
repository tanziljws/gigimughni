import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { certificatesAPI, registrationsAPI } from '../../services/api';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Calendar, Shield, Award, 
  Ticket, Edit2, Save, X, Camera, Lock, Eye, EyeOff,
  TrendingUp, CheckCircle, Clock, Upload, Palette, Download, 
  MapPin, Clock as ClockIcon, Users, FileText, RotateCcw, Mail as MailIcon,
  ClipboardCheck, CheckCircle2
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const SettingsPage = () => {
  const { user, isAuthenticated, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [certificates, setCertificates] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [showCertificateEditor, setShowCertificateEditor] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [certificateCustomization, setCertificateCustomization] = useState({
    title: 'CERTIFICATE',
    subtitle: 'OF ACHIEVEMENT',
    presentedText: 'This certificate is proudly presented to',
    content: '',
    footer: 'Diterbitkan pada',
    backgroundColor: '#fefefe',
    primaryColor: '#1a1a1a',
    accentColor: '#d4af37',
    textColor: '#4a4a4a',
    titleFontSize: 64,
    nameFontSize: 48,
    contentFontSize: 16
  });
  const [activeTab, setActiveTab] = useState('profile'); // profile, certificates, events
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: ''
  });
  
  // Password change with OTP
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    otp: '',
    new_password: '',
    confirm_password: ''
  });
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Attendance states
  const [submittingAttendance, setSubmittingAttendance] = useState({});
  const [attendanceCheck, setAttendanceCheck] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      const updateData = new FormData();
      updateData.append('full_name', formData.full_name);
      updateData.append('phone', formData.phone);
      
      if (avatarFile) {
        updateData.append('avatar', avatarFile);
      }

      const response = await api.put('/users/profile', updateData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setUser(response.data.user);
        setIsEditMode(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Request OTP for password change
  const handleRequestOTP = async () => {
    try {
      setOtpLoading(true);
      const response = await api.post('/users/request-password-otp');
      
      if (response.data.success) {
        setOtpRequested(true);
        toast.success('OTP telah dikirim ke email Anda. Silakan cek email Anda.');
      }
    } catch (error) {
      console.error('Request OTP error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengirim OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Change password with OTP
  const handleChangePassword = async () => {
    if (!otpRequested) {
      toast.error('Silakan request OTP terlebih dahulu');
      return;
    }

    if (!passwordData.otp) {
      toast.error('Masukkan kode OTP');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Password baru dan konfirmasi password tidak cocok');
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(passwordData.new_password)) {
      toast.error('Password harus mengandung minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan karakter spesial');
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.put('/users/change-password', {
        otp: passwordData.otp,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      });

      if (response.data.success) {
        setShowPasswordChange(false);
        setOtpRequested(false);
        setPasswordData({
          otp: '',
          new_password: '',
          confirm_password: ''
        });
        toast.success('Password berhasil diubah!');
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setFormData({
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || ''
    });
  };

  // Fetch user certificates
  const fetchCertificates = async () => {
    try {
      setLoadingCertificates(true);
      const response = await certificatesAPI.getMyCertificates();
      setCertificates(response.data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setCertificates([]);
    } finally {
      setLoadingCertificates(false);
    }
  };

  // Fetch user registrations
  const fetchRegistrations = async () => {
    try {
      setLoadingRegistrations(true);
      const response = await api.get('/registrations/my-registrations');
      setRegistrations(response.data?.data?.registrations || response.data?.registrations || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // Check attendance availability for an event
  const checkAttendanceAvailability = async (eventId) => {
    try {
      const response = await api.get(`/attendance/check/${eventId}`);
      if (response.success) {
        setAttendanceCheck(prev => ({
          ...prev,
          [eventId]: response.data
        }));
      }
      return response.data;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return null;
    }
  };

  // Submit attendance for an event
  const handleSubmitAttendance = async (registration) => {
    if (!registration.attendance_token || !registration.event_id) {
      toast.error('Token atau event ID tidak ditemukan');
      return;
    }

    // Check availability first
    const availability = await checkAttendanceAvailability(registration.event_id);
    if (!availability || !availability.isAvailable) {
      toast.error(availability?.message || 'Daftar hadir belum tersedia');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin submit daftar hadir untuk event "${registration.event_title}"?`)) {
      return;
    }

    setSubmittingAttendance(prev => ({ ...prev, [registration.id]: true }));

    try {
      const response = await api.post('/attendance/submit', {
        token: registration.attendance_token,
        event_id: registration.event_id
      });

      if (response.success) {
        toast.success('Daftar hadir berhasil disubmit!');
        // Refresh registrations to update status
        await fetchRegistrations();
      } else {
        toast.error(response.message || 'Gagal submit daftar hadir');
      }
    } catch (error) {
      console.error('Submit attendance error:', error);
      toast.error(error.message || 'Gagal submit daftar hadir');
    } finally {
      setSubmittingAttendance(prev => ({ ...prev, [registration.id]: false }));
    }
  };


  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificatePreview(true);
  };

  const handleEditCertificate = (certificate) => {
    setEditingCertificate(certificate);
    // Load existing customization if available
    if (certificate.customization) {
      setCertificateCustomization(JSON.parse(certificate.customization));
    }
    setShowCertificateEditor(true);
  };

  const handleSaveCertificateCustomization = async () => {
    try {
      setIsSaving(true);
      const response = await certificatesAPI.update(editingCertificate.id, {
        customization: JSON.stringify(certificateCustomization)
      });
      
      if (response.data.success) {
        toast.success('Sertifikat berhasil disesuaikan!');
        setShowCertificateEditor(false);
        setEditingCertificate(null);
        fetchCertificates(); // Refresh certificates
      }
    } catch (error) {
      console.error('Error saving certificate customization:', error);
      toast.error('Gagal menyimpan penyesuaian sertifikat');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCertificate = async (certificate) => {
    try {
      const response = await api.get(`/certificates/${certificate.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${certificate.certificate_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Sertifikat berhasil diunduh!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Gagal mengunduh sertifikat');
    }
  };

  // Load data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCertificates();
      fetchRegistrations();
    }
  }, [isAuthenticated, user]);

  // Check attendance availability for events with tokens when events tab is active
  useEffect(() => {
    if (activeTab === 'events' && registrations.length > 0) {
      registrations.forEach(reg => {
        if (reg.attendance_token && reg.event_id && reg.status !== 'attended') {
          checkAttendanceAvailability(reg.event_id);
        }
      });
    }
  }, [activeTab, registrations.length]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 relative overflow-hidden">
        {/* Space Theme Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900">
          {/* Background elements */}
          <div className="absolute top-20 left-20 w-80 h-80 bg-pink-500/20 rounded-full opacity-30 animate-pulse blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-purple-500/20 rounded-full opacity-40 animate-bounce blur-3xl" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/20 rounded-full opacity-25 animate-pulse blur-3xl" style={{animationDelay: '2s'}}></div>
        </div>
        
        {/* Navigation Header */}
        <div className="bg-black/30 backdrop-blur-md border-b border-pink-500/30 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-pink-400 hover:text-pink-300 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Login Required Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="max-w-md w-full">
            <div className="bg-black/40 backdrop-blur-md rounded-3xl p-8 border-2 border-pink-500/30 text-center shadow-2xl">
              {/* User Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-white mb-4">Account Settings</h1>
              <p className="text-purple-200 mb-8">
                Please login to access your account settings and manage your profile.
              </p>

              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  Login to Your Account
                </button>
                
                <button
                  onClick={handleRegister}
                  className="w-full bg-transparent hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 border-2 border-pink-500/50 hover:border-pink-400"
                >
                  Create New Account
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-pink-500/30">
                <p className="text-purple-300 text-sm">
                  New to Event Yukk? Register as a visitor to discover and join amazing events!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-white/90 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Home</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8 relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
          
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : user?.avatar ? (
                  <img src={`http://localhost:3000${user.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
              
              {isEditMode && (
                <label className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full cursor-pointer shadow-lg transition-all group-hover:scale-110">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{user?.full_name || user?.username}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  Visitor Account
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              </div>
              <p className="text-gray-600 flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
            </div>

            {/* Edit Button */}
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all hover:scale-105"
              >
                <Edit2 className="w-5 h-5" />
                Edit Profile
              </button>
            )}
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Events</p>
                <p className="text-3xl font-bold text-purple-600">{registrations.length}</p>
                <p className="text-xs text-gray-500 mt-1">Events joined</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-full">
                <Ticket className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Certificates</p>
                <p className="text-3xl font-bold text-pink-600">{certificates.length}</p>
                <p className="text-xs text-gray-500 mt-1">Certificates earned</p>
              </div>
              <div className="bg-pink-100 p-4 rounded-full">
                <Award className="w-8 h-8 text-pink-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Member Since</p>
                <p className="text-lg font-bold text-cyan-600">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Join date</p>
              </div>
              <div className="bg-cyan-100 p-4 rounded-full">
                <Calendar className="w-8 h-8 text-cyan-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab Navigation - Modern */}
        <div className="bg-white rounded-xl shadow-lg p-2 mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[120px] px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex-1 min-w-[120px] px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'certificates'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            Certificates ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 min-w-[120px] px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'events'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Ticket className="w-4 h-4 inline mr-2" />
            Events ({registrations.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Information Card */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-6 h-6 text-purple-600" />
                    Profile Information
                  </h2>
                  {isEditMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                        disabled={isSaving}
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                        disabled={isSaving}
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium text-lg">{user?.full_name || 'Not provided'}</p>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4" />
                      Username
                    </label>
                    <p className="text-gray-500 font-medium text-lg">@{user?.username}</p>
                    <span className="text-xs text-gray-400">Username cannot be changed</span>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </label>
                    <p className="text-gray-500 font-medium text-lg">{user?.email}</p>
                    <span className="text-xs text-gray-400">Email cannot be changed</span>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </label>
                    {isEditMode ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium text-lg">{user?.phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Change Password Card */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-purple-600" />
                    Security
                  </h2>
                  {!showPasswordChange && !isEditMode && (
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Change Password
                    </button>
                  )}
                </div>

                {showPasswordChange ? (
                  <div className="space-y-4">
                    {/* OTP Request */}
                    {!otpRequested ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900 mb-3">
                          Untuk mengganti password, Anda perlu memverifikasi dengan kode OTP yang akan dikirim ke email Anda.
                        </p>
                        <button
                          onClick={handleRequestOTP}
                          disabled={otpLoading}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                        >
                          {otpLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Mengirim OTP...
                            </>
                          ) : (
                            <>
                              <MailIcon className="w-4 h-4" />
                              Kirim Kode OTP ke Email
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* OTP Input */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Kode OTP
                          </label>
                          <input
                            type="text"
                            name="otp"
                            value={passwordData.otp}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-center text-2xl font-mono tracking-widest"
                            placeholder="000000"
                            maxLength="6"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Kode OTP telah dikirim ke email Anda. Berlaku selama 15 menit.
                          </p>
                          <button
                            onClick={handleRequestOTP}
                            disabled={otpLoading}
                            className="text-xs text-purple-600 hover:text-purple-700 mt-2"
                          >
                            Kirim ulang OTP
                          </button>
                        </div>
                      </>
                    )}

                    {otpRequested && (
                      <>
                        {/* New Password */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Password Baru
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              name="new_password"
                              value={passwordData.new_password}
                              onChange={handlePasswordChange}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all pr-12"
                              placeholder="Min. 8 karakter: huruf besar, kecil, angka, karakter spesial"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Password harus minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan karakter spesial (contoh: Password123#)
                          </p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Konfirmasi Password Baru
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirm_password"
                              value={passwordData.confirm_password}
                              onChange={handlePasswordChange}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all pr-12"
                              placeholder="Ulangi password baru"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {otpRequested && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setShowPasswordChange(false);
                            setOtpRequested(false);
                            setPasswordData({
                              otp: '',
                              new_password: '',
                              confirm_password: ''
                            });
                          }}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                          disabled={isSaving}
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleChangePassword}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 font-medium"
                          disabled={isSaving || !passwordData.otp || !passwordData.new_password}
                        >
                          {isSaving ? 'Mengubah...' : 'Ubah Password'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Your password is secure</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Change Password" to update</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Column - Quick Info */}
            <div className="space-y-6">
              {/* Account Activity */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white"
              >
                <h3 className="text-lg font-bold mb-4">Account Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-100">Events Joined</span>
                    <span className="font-bold text-2xl">{registrations.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-100">Certificates Earned</span>
                    <span className="font-bold text-2xl">{certificates.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-100">Account Status</span>
                    <span className="font-bold text-green-300">Active</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/events')}
                  className="mt-6 w-full bg-white text-purple-600 py-3 rounded-lg font-medium hover:bg-purple-50 transition-all"
                >
                  Browse Events
                </button>
              </motion.div>

              {/* Account Status */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Account Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Account Type</span>
                    <span className="text-purple-600 font-semibold">Visitor</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Email Status</span>
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="text-gray-900 font-semibold">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border-2 border-pink-500/30 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              My Certificates
            </h3>
            
            {loadingCertificates ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            ) : certificates.length > 0 ? (
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div key={cert.id} className="bg-white/10 p-4 rounded-lg border border-pink-500/30 hover:bg-white/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-semibold">{cert.event_title}</div>
                        <div className="text-purple-300 text-sm">
                          {new Date(cert.event_date).toLocaleDateString()} • {cert.certificate_number}
                        </div>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                          cert.status === 'generated' ? 'bg-pink-500/30 text-pink-300' :
                          cert.status === 'issued' ? 'bg-cyan-500/30 text-cyan-300' :
                          'bg-purple-500/30 text-purple-300'
                        }`}>
                          {cert.status}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewCertificate(cert)}
                          className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleEditCertificate(cert)}
                          className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                        >
                          <Palette className="w-4 h-4" />
                          Customize
                        </button>
                        {cert.status === 'generated' && (
                          <button
                            onClick={() => handleDownloadCertificate(cert)}
                            className="px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-purple-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-purple-300">No certificates yet</p>
                <p className="text-purple-400 text-sm">Complete events to earn certificates</p>
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border-2 border-pink-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Event History
              </h3>
              <button
                onClick={() => navigate('/my-events')}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                Lihat Semua Event
              </button>
            </div>
            
            {loadingRegistrations ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            ) : registrations.length > 0 ? (
              <div className="space-y-4">
                {registrations.map((reg) => (
                  <div key={reg.id} className="bg-white/10 p-5 rounded-lg border border-pink-500/30 hover:bg-white/20 transition-all hover:border-pink-400/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-white font-bold text-lg mb-2">{reg.event_title}</div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-purple-300">
                            <Calendar className="w-4 h-4" />
                            {new Date(reg.event_date).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          {reg.event_time && (
                            <div className="flex items-center gap-2 text-purple-300">
                              <ClockIcon className="w-4 h-4" />
                              {reg.event_time}
                            </div>
                          )}
                          {reg.location && (
                            <div className="flex items-center gap-2 text-purple-300">
                              <MapPin className="w-4 h-4" />
                              {reg.location}
                            </div>
                          )}
                          {reg.payment_amount !== undefined && reg.payment_amount > 0 && (
                            <div className="flex items-center gap-2 text-purple-300">
                              <FileText className="w-4 h-4" />
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0
                              }).format(reg.payment_amount)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            reg.status === 'attended' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                            reg.status === 'approved' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' :
                            reg.status === 'pending' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                            reg.status === 'cancelled' ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                            'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                          }`}>
                            {reg.status === 'attended' ? '✓ Hadir' :
                             reg.status === 'approved' ? '✓ Disetujui' :
                             reg.status === 'pending' ? '⏳ Menunggu' :
                             reg.status === 'cancelled' ? '✗ Dibatalkan' :
                             reg.status}
                          </div>
                          {reg.payment_status && (
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              reg.payment_status === 'paid' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                              reg.payment_status === 'pending' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                              'bg-gray-500/30 text-gray-300 border border-gray-500/50'
                            }`}>
                              {reg.payment_status === 'paid' ? '✓ Lunas' :
                               reg.payment_status === 'pending' ? '⏳ Menunggu Pembayaran' :
                               'Belum Bayar'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xs text-purple-400 uppercase tracking-wide">Terdaftar</div>
                        <div className="text-sm text-white font-medium">
                          {new Date(reg.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        {reg.attendance_token && (
                          <div className="mt-2">
                            <div className="text-xs text-purple-400 uppercase tracking-wide">Token</div>
                            <div className="text-xs text-cyan-300 font-mono font-bold bg-cyan-500/20 px-2 py-1 rounded mt-1">
                              {reg.attendance_token}
                            </div>
                            {reg.status !== 'attended' && (
                              <button
                                onClick={() => handleSubmitAttendance(reg)}
                                disabled={submittingAttendance[reg.id]}
                                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {submittingAttendance[reg.id] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    <span>Mengirim...</span>
                                  </>
                                ) : (
                                  <>
                                    <ClipboardCheck className="w-3 h-3" />
                                    <span>Submit Absen</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        {reg.status === 'attended' && (
                          <div className="mt-2 flex items-center gap-2 text-green-300 text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Sudah Hadir</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-purple-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-purple-300">No events registered yet</p>
                <p className="text-purple-400 text-sm">Join events to see your history here</p>
                <button
                  onClick={() => navigate('/events')}
                  className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg"
                >
                  Browse Events
                </button>
              </div>
            )}
          </div>
        )}


        {/* Certificate Editor Modal */}
        {showCertificateEditor && editingCertificate && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl max-w-5xl w-full my-8 border-2 border-pink-500/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Palette className="w-6 h-6" />
                    Customize Certificate
                  </h3>
                  <button
                    onClick={() => {
                      setShowCertificateEditor(false);
                      setEditingCertificate(null);
                    }}
                    className="text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Editor Controls */}
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="bg-white/10 rounded-lg p-4 space-y-4">
                      <h4 className="text-white font-semibold mb-3">Text Content</h4>
                      
                      <div>
                        <label className="block text-sm text-purple-200 mb-1.5">Title</label>
                        <input
                          type="text"
                          value={certificateCustomization.title}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, title: e.target.value})}
                          className="w-full px-3 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="CERTIFICATE"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-purple-200 mb-1.5">Subtitle</label>
                        <input
                          type="text"
                          value={certificateCustomization.subtitle}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, subtitle: e.target.value})}
                          className="w-full px-3 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="OF ACHIEVEMENT"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-purple-200 mb-1.5">Presented Text</label>
                        <input
                          type="text"
                          value={certificateCustomization.presentedText}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, presentedText: e.target.value})}
                          className="w-full px-3 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="This certificate is proudly presented to"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-purple-200 mb-1.5">Content</label>
                        <textarea
                          rows="3"
                          value={certificateCustomization.content}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, content: e.target.value})}
                          className="w-full px-3 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                          placeholder="atas partisipasinya dalam [NAMA_EVENT]..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-purple-200 mb-1.5">Footer</label>
                        <input
                          type="text"
                          value={certificateCustomization.footer}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, footer: e.target.value})}
                          className="w-full px-3 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Diterbitkan pada"
                        />
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4 space-y-4">
                      <h4 className="text-white font-semibold mb-3">Typography</h4>
                      
                      <div>
                        <label className="block text-sm text-purple-200 mb-2">
                          Title Font Size: {certificateCustomization.titleFontSize}px
                        </label>
                        <input
                          type="range"
                          min="32"
                          max="96"
                          value={certificateCustomization.titleFontSize}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, titleFontSize: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-purple-200 mb-2">
                          Name Font Size: {certificateCustomization.nameFontSize}px
                        </label>
                        <input
                          type="range"
                          min="32"
                          max="72"
                          value={certificateCustomization.nameFontSize}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, nameFontSize: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-purple-200 mb-2">
                          Content Font Size: {certificateCustomization.contentFontSize}px
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="24"
                          value={certificateCustomization.contentFontSize}
                          onChange={(e) => setCertificateCustomization({...certificateCustomization, contentFontSize: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4 space-y-4">
                      <h4 className="text-white font-semibold mb-3">Colors</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-purple-200 mb-1.5">Primary Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={certificateCustomization.primaryColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, primaryColor: e.target.value})}
                              className="w-12 h-10 border border-pink-500/30 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateCustomization.primaryColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, primaryColor: e.target.value})}
                              className="flex-1 px-2 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-purple-200 mb-1.5">Accent Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={certificateCustomization.accentColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, accentColor: e.target.value})}
                              className="w-12 h-10 border border-pink-500/30 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateCustomization.accentColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, accentColor: e.target.value})}
                              className="flex-1 px-2 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-purple-200 mb-1.5">Text Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={certificateCustomization.textColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, textColor: e.target.value})}
                              className="w-12 h-10 border border-pink-500/30 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateCustomization.textColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, textColor: e.target.value})}
                              className="flex-1 px-2 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-purple-200 mb-1.5">Background</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={certificateCustomization.backgroundColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, backgroundColor: e.target.value})}
                              className="w-12 h-10 border border-pink-500/30 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateCustomization.backgroundColor}
                              onChange={(e) => setCertificateCustomization({...certificateCustomization, backgroundColor: e.target.value})}
                              className="flex-1 px-2 py-2 bg-white/20 border border-pink-500/30 rounded-lg text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setShowCertificateEditor(false);
                          setEditingCertificate(null);
                        }}
                        className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-pink-500/30 font-medium"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCertificateCustomization}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Customization
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="sticky top-4">
                    <h4 className="text-white font-semibold mb-3">Live Preview</h4>
                    <div className="bg-white rounded-lg p-4 shadow-2xl">
                      <div 
                        className="w-full relative overflow-hidden rounded-lg"
                        style={{ 
                          backgroundColor: certificateCustomization.backgroundColor,
                          aspectRatio: '1.414 / 1',
                          minHeight: '400px',
                          padding: '40px'
                        }}
                      >
                        <div className="h-full flex flex-col justify-center text-center">
                          <h1 
                            className="font-bold mb-2"
                            style={{
                              fontSize: `${certificateCustomization.titleFontSize * 0.4}px`,
                              color: certificateCustomization.primaryColor,
                              fontFamily: 'Georgia, serif'
                            }}
                          >
                            {certificateCustomization.title}
                          </h1>
                          <p 
                            className="italic mb-6"
                            style={{
                              fontSize: '16px',
                              color: certificateCustomization.textColor,
                              fontFamily: 'Georgia, serif'
                            }}
                          >
                            {certificateCustomization.subtitle}
                          </p>
                          <p 
                            className="mb-4"
                            style={{
                              fontSize: `${certificateCustomization.contentFontSize}px`,
                              color: certificateCustomization.textColor
                            }}
                          >
                            {certificateCustomization.presentedText}
                          </p>
                          <div 
                            className="mb-4"
                            style={{
                              fontSize: `${certificateCustomization.nameFontSize * 0.4}px`,
                              color: certificateCustomization.primaryColor,
                              fontFamily: 'Georgia, serif',
                              fontWeight: 'bold'
                            }}
                          >
                            {user?.full_name || user?.username}
                          </div>
                          <p 
                            className="mb-6"
                            style={{
                              fontSize: `${certificateCustomization.contentFontSize}px`,
                              color: certificateCustomization.textColor
                            }}
                          >
                            {certificateCustomization.content || 'atas partisipasinya dalam event...'}
                          </p>
                          <div 
                            className="text-xs mt-auto"
                            style={{ color: certificateCustomization.textColor }}
                          >
                            {certificateCustomization.footer}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Preview Modal */}
        {showCertificatePreview && selectedCertificate && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-pink-500/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Certificate Preview</h3>
                  <button
                    onClick={() => setShowCertificatePreview(false)}
                    className="text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Certificate Design */}
                <div className="bg-gradient-to-br from-white to-gray-50 border-4 border-purple-600 rounded-lg p-12 text-center shadow-2xl">
                  <div className="border-2 border-purple-300 rounded-lg p-8">
                    {/* Header */}
                    <div className="mb-8">
                      <h1 className="text-4xl font-bold text-gray-900 mb-2">CERTIFICATE OF COMPLETION</h1>
                      <div className="w-32 h-1 bg-gray-800 mx-auto"></div>
                    </div>

                    {/* Content */}
                    <div className="mb-8">
                      <p className="text-lg text-gray-700 mb-6">This is to certify that</p>
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-2 border-gray-300 pb-2 inline-block">
                        {user?.full_name || user?.username}
                      </h2>
                      <p className="text-lg text-gray-700 mb-4">has successfully completed the</p>
                      <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                        {selectedCertificate.eventTitle}
                      </h3>
                      <p className="text-gray-600">
                        held on {new Date(selectedCertificate.eventDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end mt-12">
                      <div className="text-left">
                        <div className="w-32 h-0.5 bg-gray-800 mb-2"></div>
                        <p className="text-sm text-gray-600">Event Organizer</p>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500 mb-2">Certificate ID</div>
                        <div className="font-mono text-sm text-gray-800">{selectedCertificate.certificateId}</div>
                      </div>
                      <div className="text-right">
                        <div className="w-32 h-0.5 bg-gray-800 mb-2"></div>
                        <p className="text-sm text-gray-600">Event Yukk</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4 mt-6">
                  <button
                    onClick={() => handleDownloadCertificate(selectedCertificate)}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:scale-105 flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Certificate
                  </button>
                  <button
                    onClick={() => setShowCertificatePreview(false)}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-all border border-pink-500/30"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;

