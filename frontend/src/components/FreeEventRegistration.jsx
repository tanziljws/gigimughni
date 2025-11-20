import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, User, Calendar, MapPin, Clock, Ticket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const FreeEventRegistration = ({ event, onRegistrationSuccess }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [participantCount, setParticipantCount] = useState(event.approved_registrations || 0);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const checkRegistration = async () => {
      if (!isAuthenticated || !user) {
        setCheckingStatus(false);
        return;
      }
      
      try {
        const response = await api.get(`/registrations/check/${event.id}`);
        if (response.data.success) {
          setIsRegistered(response.data.data.is_registered);
        }
      } catch (error) {
        console.error('Error checking registration:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkRegistration();
  }, [event.id, isAuthenticated, user]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      if (window.confirm('Anda harus login terlebih dahulu. Lanjutkan ke halaman login?')) {
        navigate('/login', { state: { from: window.location.pathname } });
      }
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin mendaftar event ini?')) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Submitting registration for event:', event.id);
      console.log('👤 User authenticated:', isAuthenticated);
      console.log('👤 User data:', user);
      
      const response = await api.post('/registrations', {
        event_id: event.id,
        event_date: event?.event_date || event?.date || event?.eventDate, // ⚠️ CRITICAL: Backend requires event_date
        payment_method: 'free',
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
      });

      console.log('✅ Registration response:', response.data);

      if (response.data.success) {
        setIsRegistered(true);
        setParticipantCount(prev => prev + 1);
        alert('✅ Pendaftaran berhasil! Token kehadiran telah dikirim ke email Anda.');
        if (onRegistrationSuccess) onRegistrationSuccess();
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Gagal mendaftar. Silakan coba lagi.';
      
      alert('❌ Gagal melakukan registrasi\n\n' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Jangan tampilkan jika event berbayar
  if (event.price > 0 || event.registration_fee > 0) {
    return null;
  }

  const isFull = event.max_participants && participantCount >= event.max_participants;

  if (checkingStatus) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Memeriksa status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg overflow-hidden border-2 border-purple-200">
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
            <Ticket className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 ml-4">
            {isRegistered ? 'Anda Sudah Terdaftar!' : 'Daftar Event Gratis'}
          </h3>
        </div>
        
        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start bg-white rounded-lg p-4 shadow-sm">
            <Calendar className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-gray-600 text-sm font-medium">Tanggal</p>
              <p className="font-bold text-gray-800">
                {new Date(event.event_date).toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start bg-white rounded-lg p-4 shadow-sm">
            <Clock className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-gray-600 text-sm font-medium">Waktu</p>
              <p className="font-bold text-gray-800">{event.event_time || 'TBA'}</p>
            </div>
          </div>

          <div className="flex items-start bg-white rounded-lg p-4 shadow-sm md:col-span-2">
            <MapPin className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-gray-600 text-sm font-medium">Lokasi</p>
              <p className="font-bold text-gray-800">{event.location}</p>
              {event.location_url && (
                <a 
                  href={event.location_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 hover:underline text-sm mt-1 inline-block"
                >
                  📍 Lihat di Peta
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quota Info */}
        <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <User className="w-5 h-5 text-purple-600 mr-2" />
              <span className="text-gray-700 font-medium">Kuota Peserta</span>
            </div>
            <span className="font-bold text-lg text-purple-600">
              {event.max_participants 
                ? `${participantCount} / ${event.max_participants}` 
                : `${participantCount} peserta`}
            </span>
          </div>
          
          {event.max_participants && (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (participantCount / event.max_participants) * 100)}%` 
                }}
              ></div>
            </div>
          )}
        </div>

        {/* Registration Status / Button */}
        {isRegistered ? (
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <p className="text-green-800 font-bold text-lg">Pendaftaran Berhasil!</p>
              <p className="text-green-700 text-sm">Token kehadiran telah dikirim ke email Anda</p>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={handleRegister}
              disabled={isLoading || isFull}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg transition-all duration-300 transform flex items-center justify-center shadow-lg ${
                isLoading || isFull
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105 hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses Pendaftaran...
                </>
              ) : (
                <>
                  <Ticket className="w-6 h-6 mr-2" />
                  Daftar Sekarang - GRATIS
                </>
              )}
            </button>

            {isFull && (
              <div className="mt-4 text-center text-red-600 flex items-center justify-center bg-red-50 p-3 rounded-lg">
                <XCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Maaf, kuota peserta sudah penuh</span>
              </div>
            )}

            {!isAuthenticated && (
              <p className="mt-4 text-center text-gray-600 text-sm">
                💡 Anda perlu <button onClick={() => navigate('/login')} className="text-purple-600 hover:text-purple-700 font-semibold underline">login</button> untuk mendaftar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FreeEventRegistration;
