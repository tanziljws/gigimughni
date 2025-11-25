import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowRight, Ticket, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Footer from '../../components/Footer';

const MyEvents = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchMyRegistrations();
  }, [isAuthenticated, navigate]);

  const fetchMyRegistrations = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching my events...');
      
      // Fetch from history endpoint to include archived events
      const response = await api.get('/history/my-events');
      
      console.log('📋 My events response:', response);
      console.log('📋 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        hasEvents: !!response.data?.events,
        eventsType: Array.isArray(response.data?.events) ? 'array' : typeof response.data?.events,
        eventsLength: Array.isArray(response.data?.events) ? response.data.events.length : 'N/A',
        firstEvent: response.data?.events?.[0] || null
      });
      
      // Handle both response structures: {success, data: {events}} or {success, data: events}
      let events = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data.events)) {
          events = response.data.events;
        } else if (Array.isArray(response.data)) {
          events = response.data;
        } else if (response.data.events) {
          events = Array.isArray(response.data.events) ? response.data.events : [];
        }
        console.log('📋 Events found:', events.length);
        console.log('📋 First event raw data:', events[0]);
        
        // Transform to match registrations format
        const formattedRegistrations = events.map(event => {
          // ⚠️ FIX: Log all available keys to debug
          console.log('📋 Processing event - all keys:', Object.keys(event || {}));
          console.log('📋 Processing event - full data:', event);
          
          // ⚠️ FIX: Handle case where event might be an object with nested structure
          const eventData = event || {};
          
          return {
            id: eventData.registration_id || eventData.id || null,
            // ⚠️ FIX: Use event.id (from events table) not registration_id for event_id
            event_id: eventData.id || null, // This is the event ID from events table
            event_title: eventData.title || 'Event tanpa judul',
            event_date: eventData.event_date || null,
            location: eventData.location || 'Lokasi tidak tersedia',
            status: eventData.registration_status || eventData.status || 'pending',
            created_at: eventData.registration_date || eventData.created_at || new Date().toISOString(),
            is_archived: eventData.status === 'archived' || eventData.is_active === false || eventData.is_active === 0,
            has_certificate: eventData.has_certificate || false,
            certificate_id: eventData.certificate_id || null,
            certificate_code: eventData.certificate_code || null,
            // ⚠️ FIX: attendance_token is now included in history/my-events response
            attendance_token: eventData.attendance_token || null
          };
        });
        
        console.log('📋 Formatted registrations:', formattedRegistrations);
        setRegistrations(formattedRegistrations);
      } else {
        console.warn('⚠️ No events found or invalid response:', response);
        setRegistrations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching my events:', error);
      console.error('   Error response:', error.response);
      console.error('   Error message:', error.message);
      console.error('   Error data:', error.response?.data);
      
      // Don't show alert if it's a 401 (will be handled by interceptor)
      if (error.response?.status !== 401) {
        alert(`Gagal memuat data event Anda: ${error.response?.data?.message || error.message}`);
      }
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { color: 'bg-green-100 text-green-800', text: 'Terdaftar' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Menunggu' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Dibatalkan' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
        {config.text}
      </span>
    );
  };

  const filteredRegistrations = registrations.filter(reg => {
    if (activeTab === 'all') return true;
    return reg.status === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat event Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-4">
            <Ticket className="w-8 h-8 mr-3" />
            <h1 className="text-3xl md:text-4xl font-bold">Event Saya</h1>
          </div>
          <p className="text-purple-100 text-lg">
            Kelola dan lihat event yang sudah Anda daftarkan
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'Semua Event' },
            { key: 'approved', label: 'Terdaftar' },
            { key: 'pending', label: 'Menunggu' },
            { key: 'cancelled', label: 'Dibatalkan' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-sm">
                ({tab.key === 'all' 
                  ? registrations.length 
                  : registrations.filter(r => r.status === tab.key).length})
              </span>
            </button>
          ))}
        </div>

        {/* Events List */}
        {filteredRegistrations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-md">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada event</h3>
            <p className="text-sm text-gray-500 mb-6">
              {activeTab === 'all' 
                ? 'Anda belum mendaftar event apapun.' 
                : `Tidak ada event dengan status ${activeTab}.`}
            </p>
            <Link
              to="/events"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Lihat Semua Event
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRegistrations.map((registration) => (
              <div key={registration.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1">
                      {registration.event_title}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(registration.status)}
                      {registration.is_archived && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          📦 Archived
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600 text-xs">Tanggal</p>
                        <p className="font-medium text-sm">
                          {registration.event_date ? (() => {
                            try {
                              const date = new Date(registration.event_date);
                              if (isNaN(date.getTime())) {
                                return 'Tanggal tidak valid';
                              }
                              return date.toLocaleDateString('id-ID', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              });
                            } catch (error) {
                              console.error('Error parsing date:', error, registration.event_date);
                              return 'Tanggal tidak valid';
                            }
                          })() : 'Tanggal tidak tersedia'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600 text-xs">Lokasi</p>
                        <p className="font-medium text-sm line-clamp-2">{registration.location}</p>
                      </div>
                    </div>

                    {registration.category_name && (
                      <div className="pt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {registration.category_name}
                        </span>
                      </div>
                    )}
                    
                    {/* Attendance Token */}
                    {registration.attendance_token && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-gray-600 text-xs mb-1">Token Daftar Hadir</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                            <p className="font-mono text-lg font-bold text-purple-800 tracking-wider text-center">
                              {registration.attendance_token}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(registration.attendance_token);
                              alert('Token berhasil disalin!');
                            }}
                            className="px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            title="Salin token"
                          >
                            📋
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Gunakan token ini untuk daftar hadir di lokasi event
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Certificate Button - Available even for archived events */}
                    {registration.certificate_id && (
                      <Link
                        to={`/certificates/${registration.certificate_id}`}
                        className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        🏆 Lihat Sertifikat
                      </Link>
                    )}
                    
                    {registration.event_id ? (
                      <Link
                        to={`/events/${registration.event_id}`}
                        className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-purple-300 text-sm font-medium rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                      >
                        Lihat Detail Event
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    ) : (
                      <div className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed">
                        Event ID tidak tersedia
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyEvents;
