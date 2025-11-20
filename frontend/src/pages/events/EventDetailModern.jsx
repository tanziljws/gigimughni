import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Footer from '../../components/Footer';
import { ArrowLeft, Calendar, MapPin, Clock, ChevronDown, ChevronUp, Instagram, Facebook, Youtube, Twitter } from 'lucide-react';

const EventDetailModern = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${id}`);
      const eventData = response?.data || response;
      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Event tidak ditemukan atau gagal dimuat');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // If timeString is in format "HH:MM:SS", extract just HH:MM
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  const formatPrice = (price, isFree) => {
    if (isFree) return 'Gratis';
    if (!price || price === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleRegister = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    navigate(`/register-event/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Tidak Ditemukan</h1>
          <p className="text-gray-600 mb-6">{error || 'Event yang Anda cari tidak ditemukan'}</p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Daftar Event
          </Link>
        </div>
      </div>
    );
  }

  // Truncate description for preview
  const descriptionText = event.description || event.short_description || '';
  const shouldTruncate = descriptionText.length > 300;
  const displayDescription = showFullDescription || !shouldTruncate 
    ? descriptionText 
    : descriptionText.substring(0, 300) + '...';

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Poster & Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Poster/Image */}
            {(event.image_url || event.image) && (
              <div className="w-full rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
                <img
                  src={event.image_url 
                    ? `http://localhost:3000${event.image_url}` 
                    : event.image 
                    ? `http://localhost:3000${event.image}` 
                    : ''}
                  alt={event.title}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop';
                  }}
                />
              </div>
            )}

            {/* Event Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
                {event.title}
              </h1>
            </div>

            {/* Description Section */}
            {descriptionText && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Deskripsi</h2>
                <div 
                  className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: displayDescription }}
                />
                {shouldTruncate && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1 transition-colors"
                  >
                    {showFullDescription ? (
                      <>
                        <span>Tampilkan Lebih Sedikit</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Tampilkan Lebih Banyak</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Lineup Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Lineup</h2>
              <div className="flex items-center justify-center py-8 text-gray-400">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Belum Ada Lineup</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Event Details Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Event Details Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                {/* Event Title (smaller) */}
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {event.title}
                </h2>

                {/* Event Details */}
                <div className="space-y-5 mb-6">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-900 font-medium">
                        {formatDate(event.event_date)}
                      </p>
                    </div>
                  </div>

                  {/* Time */}
                  {event.event_time && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-900 font-medium">
                          {formatTime(event.event_time)} WIB
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {event.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium leading-relaxed">
                          {event.location}
                        </p>
                        {event.address && (
                          <p className="text-sm text-gray-500 mt-1">{event.address}</p>
                        )}
                        {(event.city || event.province) && (
                          <p className="text-sm text-gray-500">
                            {event.city}{event.city && event.province ? ', ' : ''}{event.province}
                          </p>
                        )}
                        {event.location && (
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 transition-colors">
                            Petunjuk Arah
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Organizer */}
                {event.organizer_id && (
                  <div className="pt-5 border-t border-gray-200 mb-6">
                    <p className="text-sm text-gray-500 mb-1">Dibuat Oleh</p>
                    <p className="text-gray-900 font-medium">Event Yukk Platform</p>
                  </div>
                )}

                {/* Price */}
                <div className="pt-5 border-t border-gray-200 mb-6">
                  <p className="text-sm text-gray-500 mb-2">Mulai Dari</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(event.price, event.is_free)}
                  </p>
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleRegister}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow-md mb-4"
                >
                  {isAuthenticated ? 'Beli Sekarang' : 'Login untuk Daftar'}
                </button>
              </div>

              {/* Social Media Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Media Sosial</h3>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                      <Instagram className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Instagram</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Tiktok</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Facebook className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Facebook</span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                      <Youtube className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Youtube</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EventDetailModern;
