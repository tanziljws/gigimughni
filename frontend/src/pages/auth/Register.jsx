import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone, ArrowLeft, Calendar, Eye, EyeOff, ArrowRight, MapPin, GraduationCap } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const RegisterPage = () => {
  const [step, setStep] = useState('register');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    address: '',
    education: ''
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTimer, setOtpTimer] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const timerRef = useRef(null);
  const cleanupCalled = useRef(false);

  // Simple fade animation
  const pageVariants = {
    initial: { 
      opacity: 0,
      scale: 0.98
    },
    animate: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.98,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  // Cleanup function
  const cleanupUnverifiedUser = async () => {
    if (cleanupCalled.current) return;
    cleanupCalled.current = true;
    
    try {
      await authAPI.cleanupUnverified({ email: formData.email });
      console.log('🧹 Cleaned up unverified user');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Timer effect
  useEffect(() => {
    if (timerActive && otpTimer > 0) {
      timerRef.current = setTimeout(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    } else if (timerActive && otpTimer === 0) {
      // Timer expired
      setMessage('⏰ Waktu verifikasi habis! Registrasi dibatalkan.');
      cleanupUnverifiedUser();
      setTimeout(() => {
        setStep('register');
        setTimerActive(false);
        setOtpTimer(300);
        cleanupCalled.current = false;
      }, 3000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerActive, otpTimer]);

  // Page leave cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (step === 'verify' && !cleanupCalled.current) {
        cleanupUnverifiedUser();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // ⚠️ FIX: Sanitize phone input - only allow numbers, +, -, spaces, parentheses
    if (name === 'phone') {
      // Remove all characters except numbers, +, -, spaces, and parentheses
      const sanitized = value.replace(/[^0-9+\-\s()]/g, '');
      setFormData({
        ...formData,
        [name]: sanitized
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.password || !formData.full_name) {
      setMessage('Semua field wajib diisi');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Password tidak cocok');
      return;
    }

    // Password complexity validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setMessage(
        'Password harus minimal 8 karakter dan mengandung:\n' +
        '• Huruf besar (A-Z)\n' +
        '• Huruf kecil (a-z)\n' +
        '• Angka (0-9)\n' +
        '• Karakter spesial (@$!%*?&#)\n' +
        'Contoh: Password123#'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // ⚠️ FIX: Sanitize phone before sending - remove all non-numeric characters except +, -, spaces, parentheses
      const sanitizedPhone = formData.phone ? formData.phone.replace(/[^0-9+\-\s()]/g, '') : '';
      
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: sanitizedPhone || undefined, // Send undefined if empty (optional field)
        address: formData.address || undefined,
        education: formData.education || undefined
      });
      
      if (response && response.success) {
        // Check if it's fallback mode (SMTP not configured)
        if (response.data && response.data.otpCode) {
          setMessage(`Registrasi berhasil! Kode OTP Anda: ${response.data.otpCode} (SMTP tidak dikonfigurasi)`);
        } else {
          setMessage('Registrasi berhasil! Kode OTP telah dikirim ke email Anda.');
        }
        
        // Update formData with normalized email for verification
        if (response.data && response.data.email) {
          setFormData(prev => ({
            ...prev,
            email: response.data.email
          }));
        }
        
        // Start timer and go to verification step
        setStep('verify');
        setTimerActive(true);
        setOtpTimer(300); // Reset timer to 5 minutes
        cleanupCalled.current = false;
      } else {
        setMessage(response?.message || 'Registrasi gagal');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // ⚠️ FIX: Better error handling - show validation errors clearly
      if (error.response?.data?.errors) {
        // Backend validation errors
        const validationErrors = error.response.data.errors;
        const errorMessages = Array.isArray(validationErrors) 
          ? validationErrors.map(err => `${err.field}: ${err.message}`).join('\n')
          : Object.entries(validationErrors).map(([field, messages]) => {
              const msg = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${msg}`;
            }).join('\n');
        
        setMessage(`Validasi gagal:\n${errorMessages}`);
      } else if (error.response?.data?.message) {
        // Backend error message
        setMessage(error.response.data.message);
      } else if (error.message) {
        // Generic error message
        setMessage(error.message);
      } else {
        setMessage('Terjadi kesalahan saat registrasi. Silakan coba lagi.');
      }
      
      // ⚠️ FIX: Clear phone field if it contains invalid data
      if (formData.phone && !/^[0-9+\-\s()]{0,20}$/.test(formData.phone)) {
        setFormData(prev => ({
          ...prev,
          phone: ''
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setMessage('Masukkan kode OTP 6 digit');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await authAPI.verifyEmail({
        email: formData.email,
        otp: otp
      });
      
      if (response && response.success) {
        // Stop timer and cleanup
        setTimerActive(false);
        cleanupCalled.current = true;
        
        if (response.data.user && response.data.token) {
          login(response.data.user, response.data.token);
          setMessage('Verifikasi berhasil! Selamat datang di Event Yukk!');
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setMessage('Verifikasi berhasil! Anda dapat login sekarang.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        setMessage(response?.message || 'Verifikasi gagal');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setMessage(error.message || 'Terjadi kesalahan saat verifikasi');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await authAPI.resendOTP({ email: formData.email });
      
      if (response && response.success) {
        setMessage('Kode OTP baru telah dikirim ke email Anda');
        setResendCooldown(60);
        
        // Start countdown
        const interval = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setMessage(response?.message || 'Gagal mengirim ulang OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setMessage(error.message || 'Terjadi kesalahan saat mengirim ulang OTP');
    } finally {
      setLoading(false);
    }
  };


  // Verification step component
  if (step === 'verify') {
    return (
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-black relative overflow-hidden flex"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        {/* Animated Background Particles */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {[...Array(15)].map((_, i) => (
            <div
              key={`verify-${i}`}
              className="absolute w-2 h-2 bg-pink-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
        
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-black via-purple-900 to-purple-800 relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <button
              onClick={() => navigate('/')}
              className="absolute top-8 left-8 flex items-center text-white hover:text-pink-400 transition-colors group font-poppins">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </button>
            <div className="mb-8">
              <div className="mb-8 flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Event Yukk</h1>
              </div>
              <h1 className="text-5xl font-bebas font-black mb-4 text-white leading-tight">EMAIL VERIFICATION</h1>
              <p className="text-xl text-gray-300 font-poppins">Final step to activate your account</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Verification Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-pink-500/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-500/30">
                <Mail className="w-8 h-8 text-pink-400" />
              </div>
              <h2 className="text-3xl font-bebas font-black text-white mb-2">VERIFY EMAIL</h2>
              <p className="text-gray-300 font-poppins">Enter OTP code sent to</p>
              <p className="text-pink-400 font-poppins font-semibold">{formData.email}</p>
              
              {/* Timer Display */}
              {timerActive && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-yellow-800 font-medium">
                      Waktu tersisa: {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1 text-center">
                    Jika tidak verifikasi dalam 5 menit, registrasi akan dibatalkan
                  </p>
                </div>
              )}
            </div>
            
            {message && (
              <div className={`p-4 rounded-lg mb-6 ${
                message.includes('berhasil') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Kode OTP (6 digit)
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">
                    <strong>⏰ Penting:</strong> Kode OTP akan kedaluwarsa dalam 15 menit
                  </p>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || !timerActive}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105">
                {loading ? 'Memverifikasi...' : 'Verifikasi Email'}
              </button>
              
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading || resendCooldown > 0}
                className="w-full text-blue-600 hover:text-blue-700 font-medium py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown}s` : 'Kirim ulang kode OTP'}
              </button>
            </form>
            
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setStep('register');
                  setTimerActive(false);
                  cleanupUnverifiedUser();
                }}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                ← Kembali ke pendaftaran
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-black relative overflow-hidden flex"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-pink-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* Gradient fade overlay for smooth color transition */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-purple-900/40 to-black/20"></div>
      
      {/* Left Panel - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10 order-2 lg:order-1">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-pink-500/20">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bebas font-black text-white mb-2">SIGN UP</h2>
            <p className="text-gray-300 font-poppins">Create your Event Yukk account</p>
          </div>
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.includes('berhasil') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins"
                  placeholder="Full Name"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins"
                  placeholder="Username"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins"
                  placeholder="Email"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={20}
                  pattern="[0-9+\-\s()]{8,20}"
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins"
                  placeholder="Phone (Optional, e.g: 081234567890)"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins resize-none"
                  placeholder="Alamat Tempat Tinggal (Optional)"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <select
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins appearance-none"
                >
                  <option value="" className="bg-purple-900">Pilih Pendidikan Terakhir (Optional)</option>
                  <option value="SD" className="bg-purple-900">SD / Sederajat</option>
                  <option value="SMP" className="bg-purple-900">SMP / Sederajat</option>
                  <option value="SMA" className="bg-purple-900">SMA / Sederajat</option>
                  <option value="D3" className="bg-purple-900">D3 (Diploma)</option>
                  <option value="S1" className="bg-purple-900">S1 (Sarjana)</option>
                  <option value="S2" className="bg-purple-900">S2 (Magister)</option>
                  <option value="S3" className="bg-purple-900">S3 (Doktor)</option>
                </select>
              </div>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-poppins"
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-400 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-poppins font-bold py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg hover:shadow-xl">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
          <div className="text-center mt-6">
            <p className="text-gray-300 text-sm font-poppins">
              Already have an account?{' '}
              <span 
                onClick={() => navigate('/login', { state: { from: 'register' } })}
                className="text-pink-400 hover:text-pink-300 font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                Sign in <ArrowRight className="w-4 h-4" />
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Info */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden order-1 lg:order-2">
        {/* Gradient background with fade */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-800 via-purple-900 to-black"></div>
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-purple-900/30 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <button
            onClick={() => navigate('/')}
            className="absolute top-8 right-8 flex items-center text-white hover:text-pink-400 transition-colors group font-poppins">
            <span>Back to Home</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="mb-8">
            <div className="mb-8 flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Event Yukk</h1>
            </div>
            <h1 className="text-5xl font-bebas font-black mb-4 text-white leading-tight">JOIN EVENT YUKK</h1>
            <p className="text-xl text-gray-300 font-poppins">Temukan dan ikuti event menarik di seluruh Indonesia</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RegisterPage;

