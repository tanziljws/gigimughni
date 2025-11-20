import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { eventsAPI, categoriesAPI } from '../../services/api';
import { 
  Sparkles, 
  Laptop, 
  Briefcase, 
  GraduationCap, 
  Music, 
  Trophy, 
  Users,
  Search,
  Calendar,
  MapPin,
  Clock,
  Ticket,
  ArrowRight
} from 'lucide-react';

const EventsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_asc');
  const [timeFilter, setTimeFilter] = useState('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  // Handle navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchData();
  }, [sortBy, timeFilter]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        fetchData();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting to fetch data...');
      
      // Fetch events first
      console.log('📡 Fetching events...');
      const eventsResponse = await eventsAPI.getAll({ 
        limit: 100, 
        page: 1,
        search: searchTerm,
        category_id: selectedCategory !== 'all' ? selectedCategory : '',
        sort_by: sortBy,
        upcoming: timeFilter === 'upcoming' ? 'true' : ''
      });
      console.log('📡 Events response:', eventsResponse);
      console.log('📡 Events response structure:', {
        hasData: !!eventsResponse?.data,
        hasEvents: !!eventsResponse?.data?.events,
        isArray: Array.isArray(eventsResponse),
        keys: Object.keys(eventsResponse || {})
      });
      
      // Use simplified categories from database with Lucide icons
      const allCategories = [
        { id: 'all', name: 'Semua Kategori', icon: Sparkles },
        { id: '71', name: 'Technology', icon: Laptop },
        { id: '72', name: 'Business', icon: Briefcase },
        { id: '73', name: 'Education', icon: GraduationCap },
        { id: '74', name: 'Entertainment', icon: Music },
        { id: '75', name: 'Sports', icon: Trophy },
        { id: '76', name: 'Community', icon: Users }
      ];
      
      setCategories(allCategories);
      
      // Get events from response - handle different response structures
      let events = [];
      if (eventsResponse?.data) {
        // Response structure: { data: { events: [...], pagination: {...} } }
        events = eventsResponse.data.events || eventsResponse.data.data?.events || [];
      } else if (eventsResponse?.events) {
        // Response structure: { events: [...] }
        events = eventsResponse.events;
      } else if (Array.isArray(eventsResponse)) {
        // Response is directly an array
        events = eventsResponse;
      }
      
      console.log('📋 Raw events from API:', events);
      console.log('📋 Events count:', events.length);
      console.log('📅 Current date:', new Date());
      
      // Filter only active and published events
      const activeEvents = events.filter(e => 
        e.is_active !== false && 
        e.status !== 'archived' && 
        e.status !== 'draft'
      );
      
      console.log('📋 Active events (filtered):', activeEvents.length);
      setEvents(activeEvents);
      setIsLoaded(true);
      
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError('Gagal memuat data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes} WIB`;
  };

  const formatPrice = (price, isFree) => {
    if (isFree || price === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'technology': Laptop,
      'business': Briefcase,
      'education': GraduationCap,
      'entertainment': Music,
      'sports': Trophy,
      'community': Users,
      'olahraga': Trophy,
      'seminar': GraduationCap,
      'pertunjukan': Music,
      'pameran': Sparkles,
      'workshop': Briefcase,
      'konser': Music,
      'festival': Sparkles,
      'kompetisi': Trophy
    };
    const IconComponent = iconMap[categoryName?.toLowerCase()] || Sparkles;
    return <IconComponent className="h-16 w-16 text-gray-400" />;
  };

  const filteredEvents = events.filter(event => {
    const matchesCategory = selectedCategory === 'all' || event.category_id == selectedCategory;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@300;400;600;700;900&display=swap');
        .font-bebas { font-family: 'Bebas Neue', cursive; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}</style>

      {/* Custom Transparent Navbar like HomePage */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-black/90 backdrop-blur-md shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="font-bebas text-2xl text-white tracking-wider">EVENT YUKK</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => navigate('/')} className="font-poppins text-white hover:text-pink-400 transition-colors font-medium">Home</button>
              <button onClick={() => navigate('/events')} className="font-poppins text-pink-400 font-semibold">Events</button>
              <button onClick={() => navigate('/blog')} className="font-poppins text-white hover:text-pink-400 transition-colors font-medium">Blog</button>
              <button onClick={() => navigate('/contact')} className="font-poppins text-white hover:text-pink-400 transition-colors font-medium">Contact</button>
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-4">          
              {/* Mobile Menu Button */}
              <button className="md:hidden text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-purple-900 via-purple-800 to-pink-900 pt-24 pb-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-wider">LATEST EVENTS</h1>
          <p className="font-poppins text-xl text-purple-200 max-w-2xl mx-auto">Find exciting events that match your interests and join an amazing community</p>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl font-poppins focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-poppins font-semibold text-sm transition-all ${
                      selectedCategory === category.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {category.name}
                  </button>
                );
              })}
            </div>

            {/* Time & Sort Filters */}
            <div className="flex flex-wrap gap-4 justify-center">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Time</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="date_asc">Nearest</option>
                <option value="date_desc">Farthest</option>
                <option value="title_asc">A-Z</option>
                <option value="title_desc">Z-A</option>
                <option value="price_asc">Lowest Price</option>
                <option value="price_desc">Highest Price</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="flex justify-center mb-4">
                <div className="animate-spin">
                  <Clock className="h-16 w-16 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Memuat event...</h3>
              <p className="text-gray-600">Mohon tunggu sebentar</p>
            </div>
          ) : error || events.length === 0 ? (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="flex justify-center mb-4">
                <div className="animate-bounce">
                  <Sparkles className="h-16 w-16 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Event Coming Soon</h3>
              <p className="text-gray-600 mb-6">Event menarik akan segera hadir. Pantau terus untuk update terbaru!</p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={handleBackToHome}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  Kembali ke Beranda
                </button>
                {error && (
                  <button 
                    onClick={fetchData}
                    className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-gray-100 text-gray-700 font-medium py-2 px-6 rounded-xl transition-all transform hover:scale-105"
                  >
                    Coba Lagi
                  </button>
                )}
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 animate-fade-in-up">
              <div className="flex justify-center mb-4">
                <Search className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak ada event ditemukan</h3>
              <p className="text-gray-600">Coba ubah filter atau kata kunci pencarian Anda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event, index) => (
                <div key={event.id} onClick={() => navigate(`/events/${event.id}`)} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-400 hover:shadow-xl transition-all group cursor-pointer animate-zoom-in" style={{animationDelay: `${index * 0.2}s`}}>
                  {/* Event Image */}
                  <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative overflow-hidden">
                    {event.image_url ? (
                      <img 
                        src={`${BACKEND_BASE_URL}${event.image_url}`}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className="text-6xl group-hover:scale-110 transition-transform" style={{display: event.image_url ? 'none' : 'flex'}}>
                      {getCategoryIcon(event.category_name)}
                    </div>
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all"></div>
                    
                    {/* Floating particles in event cards */}
                    <div className="absolute top-4 right-4 w-2 h-2 bg-gray-400 rounded-full opacity-30 animate-pulse"></div>
                    <div className="absolute bottom-4 left-4 w-1 h-1 bg-gray-500 rounded-full opacity-40 animate-bounce"></div>
                    <div className="absolute top-1/2 left-4 w-1.5 h-1.5 bg-gray-600 rounded-full opacity-50 animate-pulse"></div>
                  </div>
                  
                  {/* Event Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                        {event.category_name || 'Umum'}
                      </span>
                      <span className="text-sm text-gray-500">{formatDate(event.event_date)}</span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.short_description || event.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                        <Clock className="w-4 h-4 mr-2" />
                        {formatTime(event.event_time)}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                        <MapPin className="w-4 h-4 mr-2" />
                        {event.location || 'Lokasi TBA'}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                        <Users className="w-4 h-4 mr-2" />
                        {event.approved_registrations || event.current_participants || 0}/{event.max_participants || '∞'} peserta
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(event.price, event.is_free)}
                      </span>
                      <button className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg">
                        <span className="flex items-center gap-2">
                          Daftar Sekarang
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default EventsPage;
