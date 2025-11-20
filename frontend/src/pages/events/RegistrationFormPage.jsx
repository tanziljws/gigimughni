import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Footer from '../../components/Footer';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const RegistrationFormPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    institution: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/register-event/${eventId}` } });
      return;
    }
    fetchEventDetails();
  }, [eventId, isAuthenticated]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${eventId}`);
      const eventData = response?.data?.event || response?.data || response;
      setEvent(eventData);
      
      // Pre-fill data dari user profile
      if (user) {
        setFormData(prev => ({
          ...prev,
          full_name: user.full_name || user.username || '',
          email: user.email || '',
          phone: user.phone || user.phone_number || '',
          address: user.address || '',
          city: user.city || '',
          province: user.province || '',
          institution: user.institution || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Gagal memuat data event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nama lengkap harus diisi';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email harus diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor telepon harus diisi';
    } else if (!/^(\+62|62|0)[0-9]{9,12}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Format nomor telepon tidak valid';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Alamat harus diisi';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Kota harus diisi';
    }

    if (!formData.province.trim()) {
      newErrors.province = 'Provinsi harus diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Mohon lengkapi semua data yang diperlukan');
      return;
    }

    setSubmitting(true);
    try {
      const isFreeEvent = event?.is_free || event?.price === 0;
      
      // Submit registration dengan data diri lengkap
      const response = await api.post('/registrations', {
        event_id: parseInt(eventId),
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        institution: formData.institution,
        notes: formData.notes,
        payment_method: isFreeEvent ? 'free' : 'cash'
      });

      const responseData = response?.data || response;
      const success = responseData?.success !== false;

      if (success) {
        if (isFreeEvent) {
          // Free event - registration confirmed immediately
          setRegistered(true);
          const token = responseData?.data?.token || responseData?.token || null;
          setTokenInfo({
            token,
            email: formData.email,
            expiresAt: responseData?.data?.tokenExpiresAt || responseData?.tokenExpiresAt || null,
          });

          toast.success('✅ Pendaftaran berhasil! Token kehadiran telah dikirim ke email Anda.');
          
          setTimeout(() => {
            navigate('/settings');
          }, 3000);
        } else {
          // Paid event - redirect to payment
          const registrationData = responseData?.data || responseData;
          const registrationId = registrationData?.id;
          
          if (registrationId) {
            // Create payment transaction
            try {
              const paymentResponse = await api.post('/payments/create-transaction', {
                event_id: parseInt(eventId),
                registration_id: registrationId
              });
              
              const paymentData = paymentResponse?.data || paymentResponse;
              
              if (paymentData?.token && paymentData?.client_key) {
                // Load Midtrans Snap.js dynamically
                const loadSnapAndPay = () => {
                  if (window.snap) {
                    window.snap.pay(paymentData.token, {
                      onSuccess: function(result) {
                        console.log('Payment success:', result);
                        navigate(`/payment/success?order_id=${result.order_id}`);
                      },
                      onPending: function(result) {
                        console.log('Payment pending:', result);
                        navigate(`/payment/pending?order_id=${result.order_id}`);
                      },
                      onError: function(result) {
                        console.log('Payment error:', result);
                        navigate(`/payment/error?order_id=${result.order_id}`);
                      },
                      onClose: function() {
                        console.log('Payment popup closed');
                        alert('Pembayaran dibatalkan. Anda dapat mencoba lagi nanti.');
                      }
                    });
                  } else {
                    console.error('Midtrans Snap.js not loaded');
                    alert('Gagal memuat payment gateway. Silakan refresh halaman dan coba lagi.');
                  }
                };

                if (!window.snap) {
                  const script = document.createElement('script');
                  script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
                  script.setAttribute('data-client-key', paymentData.client_key);
                  script.onload = loadSnapAndPay;
                  script.onerror = () => {
                    alert('Gagal memuat payment gateway. Silakan coba lagi.');
                  };
                  document.head.appendChild(script);
                } else {
                  loadSnapAndPay();
                }
              } else {
                throw new Error('Failed to get payment token');
              }
            } catch (paymentError) {
              console.error('Payment error:', paymentError);
              toast.error('Registrasi berhasil, tetapi gagal membuat transaksi pembayaran. Silakan hubungi admin.');
              navigate('/settings');
            }
          } else {
            toast.success('Registrasi berhasil! Silakan selesaikan pembayaran.');
            navigate('/settings');
          }
        }
      } else {
        throw new Error(responseData?.message || 'Gagal melakukan registrasi');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorData = error.response?.data || error;
      let errorMessage = 'Gagal melakukan registrasi. Silakan coba lagi.';
      
      if (errorData) {
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check if already registered
      if (error.response?.status === 409) {
        toast.error('Anda sudah terdaftar untuk event ini');
        navigate(`/events/${eventId}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event tidak ditemukan</h2>
          <button 
            onClick={() => navigate('/events')} 
            className="text-purple-600 hover:underline"
          >
            Kembali ke Events
          </button>
        </div>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pendaftaran Berhasil!</h2>
          {tokenInfo?.token ? (
            <div className="mb-4">
              <p className="text-gray-700 text-sm mb-3">
                Gunakan token berikut saat registrasi ulang di lokasi. Kami juga mengirimkan token ini
                ke email <span className="font-semibold">{tokenInfo.email}</span>.
              </p>
              <div className="rounded-xl border border-green-200 bg-green-50 py-4 px-6">
                <p className="text-xs text-green-700 uppercase tracking-[0.4em] mb-2">Token Kehadiran</p>
                <p className="font-mono text-3xl font-bold tracking-[0.3em] text-green-800">{tokenInfo.token}</p>
                {tokenInfo.expiresAt && (
                  <p className="text-xs text-green-600 mt-2">
                    Berlaku sampai{' '}
                    {new Date(tokenInfo.expiresAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(tokenInfo.token)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-green-300 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
                >
                  Salin Token
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 mb-4">
              Data Anda sudah kami simpan. Token akan dikirim ke email Anda setelah panitia menyelesaikan
              proses verifikasi/pembayaran.
            </p>
          )}
          <p className="text-sm text-gray-500">Anda akan diarahkan ke halaman profil dalam beberapa detik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white hover:text-gray-100 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
          <h1 className="text-3xl font-bold">Daftar Event</h1>
          <p className="text-purple-100 mt-1">Isi data diri Anda untuk melanjutkan pendaftaran</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Event Info Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detail Event</h3>
              
              {(event.image_url || event.image) && (
                <img 
                  src={event.image_url?.startsWith('http') 
                    ? event.image_url 
                    : `http://localhost:3000${event.image_url || event.image}`} 
                  alt={event.title}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop';
                  }}
                />
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nama Event</p>
                  <p className="font-semibold text-gray-900 text-base">{event.title}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Tanggal</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(event.event_date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Waktu</p>
                  <p className="font-semibold text-gray-900">{event.event_time || 'TBA'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Lokasi</p>
                  <p className="font-semibold text-gray-900 text-sm">{event.location}</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Harga</p>
                  <p className="text-lg font-bold text-green-600">
                    {event.is_free || event.price === 0 
                      ? 'GRATIS' 
                      : `Rp ${parseFloat(event.price || 0).toLocaleString('id-ID')}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Diri Peserta</h2>

              {/* Full Name */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                    errors.full_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan nama lengkap Anda"
                />
                {errors.full_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan email Anda"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nomor Telepon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Contoh: 081234567890"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Address */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alamat <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan alamat lengkap Anda"
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                )}
              </div>

              {/* City */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kota <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan kota"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                )}
              </div>

              {/* Province */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Provinsi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                    errors.province ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Masukkan provinsi"
                />
                {errors.province && (
                  <p className="text-red-500 text-sm mt-1">{errors.province}</p>
                )}
              </div>

              {/* Institution (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Institusi / Perusahaan <span className="text-gray-400">(Opsional)</span>
                </label>
                <input
                  type="text"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  placeholder="Nama institusi atau perusahaan"
                />
              </div>

              {/* Notes (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catatan Khusus <span className="text-gray-400">(Opsional)</span>
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  placeholder="Tuliskan hal yang ingin kami ketahui tentang Anda"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </div>
                ) : (
                  'Konfirmasi Pendaftaran'
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                <span className="text-red-500">*</span> Kolom wajib diisi
              </p>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RegistrationFormPage;