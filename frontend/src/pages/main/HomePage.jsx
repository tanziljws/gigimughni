import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, ArrowRight, Ticket, Star, UserCircle2, Music, Code, Briefcase, Dumbbell, GraduationCap, Palette, Utensils, HeartPulse, Wrench, Mic, BarChart3, PartyPopper, Drama, Gamepad2, Shirt, Plane, Microscope, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeInUp, FadeInLeft, FadeInRight, ScaleIn, StaggerContainer, StaggerItem, HoverScale, RevealOnScroll, RotateIn } from '../../components/ScrollAnimation';
import { useAuth } from '../../contexts/AuthContext';
import { eventsAPI } from '../../services/api';
import api, { BACKEND_BASE_URL } from '../../services/api';
import { getBackendBaseUrl } from '../../lib/imageUtils';
import Footer from '../../components/Footer';

// Helper function to get category icons (Lucide React)
const getCategoryIcon = (categoryName) => {
  const iconMap = {
    'Music': Music,
    'Technology': Code,
    'Business': Briefcase,
    'Sports': Dumbbell,
    'Education': GraduationCap,
    'Art': Palette,
    'Food': Utensils,
    'Health': HeartPulse,
    'Workshop': Wrench,
    'Conference': Mic,
    'Seminar': BarChart3,
    'Festival': PartyPopper,
    'Entertainment': Drama,
    'Gaming': Gamepad2,
    'Fashion': Shirt,
    'Travel': Plane,
    'Science': Microscope,
    'Charity': Heart,
    'Community': Users,
  };
  
  // Handle null/undefined categoryName
  if (!categoryName) {
    return <Star className="w-10 h-10" />;
  }
  
  // Find matching icon or return default
  const matchedKey = Object.keys(iconMap).find(key => 
    categoryName.toLowerCase().includes(key.toLowerCase())
  );
  
  const IconComponent = iconMap[matchedKey] || Star;
  return <IconComponent className="w-10 h-10" />;
};

const HomePage = () => {
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [dominantColor, setDominantColor] = useState({ r: 147, g: 51, b: 234 }); // Default purple
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const hasFetched = useRef(false);

  // Extract dominant color from image
  const extractDominantColor = (imageSrc) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSrc;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;
      
      // Sample every 10th pixel for performance
      for (let i = 0; i < data.length; i += 40) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      const sampleCount = pixelCount / 10;
      r = Math.floor(r / sampleCount);
      g = Math.floor(g / sampleCount);
      b = Math.floor(b / sampleCount);
      
      // Make colors more vibrant and darker for better contrast
      r = Math.max(0, Math.min(255, Math.floor(r * 0.7)));
      g = Math.max(0, Math.min(255, Math.floor(g * 0.7)));
      b = Math.max(0, Math.min(255, Math.floor(b * 0.7)));
      
      setDominantColor({ r, g, b });
    };
  };

  // Handle navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch events
  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    const fetchEvents = async () => {
      // Skip if already fetching or component unmounted
      if (hasFetched.current || !isMounted) {
        console.log('Skipping fetch - already in progress or unmounted');
        return;
      }
      
      hasFetched.current = true;
      
      try {
        // Fetch highlighted event for hero section
        const highlightedResponse = await api.get('/events/highlighted/event');
        const highlightedData = highlightedResponse.data || highlightedResponse;
        
        console.log('✅ Highlighted event response:', highlightedData);
        
        if (highlightedData.success && highlightedData.data && isMounted) {
          setFeaturedEvent(highlightedData.data);
          console.log('✅ Featured event set:', highlightedData.data.title);
          
          // Extract color from event image
          if (highlightedData.data.image_url) {
            const imageUrl = `${BACKEND_BASE_URL}${highlightedData.data.image_url}`;
            extractDominantColor(imageUrl);
          }
        } else {
          console.log('⚠️ No highlighted event found, will use first upcoming event');
        }
        
        // Fetch upcoming events for sections below
        const response = await eventsAPI.getAll({ limit: 20, status: 'published' });
        const events = response?.data?.events || [];
        
        console.log('✅ All events fetched:', events.length);
        
        // If no featured event was set, use the first event as featured
        if (!highlightedData.data && events.length > 0 && isMounted) {
          console.log('📌 Setting first event as featured:', events[0].title);
          setFeaturedEvent(events[0]);
          
          // Extract color from event image
          if (events[0].image_url || events[0].image) {
            const imageUrl = `${BACKEND_BASE_URL}${events[0].image_url || events[0].image}`;
            extractDominantColor(imageUrl);
          }
        }
        
        // Get all active events (include highlighted event in regular sections)
        const allActiveEvents = events;
        
        console.log('✅ Active events for sections:', allActiveEvents.length);
        
        if (isMounted) {
          setUpcomingEvents(allActiveEvents);
        }
        
        // Fetch categories with error handling
        const categoriesResponse = await fetch(`${BACKEND_BASE_URL}/api/categories`);
        
        if (!categoriesResponse.ok) {
          console.error('Categories API error:', categoriesResponse.status, categoriesResponse.statusText);
          if (isMounted) setCategories([]);
          return;
        }
        
        const categoriesData = await categoriesResponse.json();
        console.log('Categories response:', categoriesData);
        console.log('Categories data structure:', JSON.stringify(categoriesData, null, 2));
        
        if (categoriesData.success && isMounted) {
          // API returns: { success: true, data: { categories: [...] } }
          // Try multiple paths to get the categories array
          const cats = categoriesData.data?.categories || categoriesData.data || categoriesData.categories || [];
          console.log('Categories from API:', cats);
          console.log('First category:', cats[0]);
          
          // Process categories with simplified logic
          if (Array.isArray(cats) && cats.length > 0) {
            console.log('Raw categories count:', cats.length);
            
            // Filter active categories and remove duplicates in one pass
            const seenIds = new Set();
            const uniqueCategories = cats.filter(cat => {
              if (!cat || !cat.id) {
                console.log('Skipping invalid category:', cat);
                return false;
              }
              
              // Check if already seen
              if (seenIds.has(cat.id)) {
                console.log('Duplicate category found:', cat.name, cat.id);
                return false;
              }
              
              // Check is_active - handle both boolean and numeric (1/0)
              const isActive = cat.is_active === true || cat.is_active === 1 || cat.is_active === '1';
              if (!isActive) {
                console.log('Inactive category:', cat.name, 'is_active:', cat.is_active);
                return false;
              }
              
              // Add to seen set and include this category
              seenIds.add(cat.id);
              console.log('Including category:', cat.name, 'ID:', cat.id);
              return true;
            });
            
            console.log('Final unique active categories:', uniqueCategories.length);
            console.log('Categories to set:', uniqueCategories);
            setCategories(uniqueCategories);
          } else {
            console.log('No categories array or empty array, cats:', cats);
            setCategories([]);
          }
        } else if (isMounted) {
          setCategories([]);
        }

        // Fetch approved reviews from database
        try {
          const reviewsResponse = await api.get('/reviews', { params: { limit: 20 } });
          console.log('Reviews API response:', reviewsResponse);
          
          // API uses ApiResponse format: { success, data: { reviews, pagination }, message }
          const reviewsData = reviewsResponse?.data?.data?.reviews || reviewsResponse?.data?.reviews || [];
          console.log('Reviews data:', reviewsData);
          
          if (isMounted) {
            setReviews(reviewsData);
          }
        } catch (error) {
          console.error('Error fetching reviews:', error);
          if (isMounted) {
            setReviews([]);
          }
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEvents();
    
    // Cleanup function
    return () => {
      isMounted = false;
      hasFetched.current = false; // Reset ref so data can be fetched again on remount
    };
  }, []);

  // Countdown timer for featured event
  useEffect(() => {
    if (!featuredEvent) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const eventDate = new Date(featuredEvent.event_date).getTime();
      const distance = eventDate - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [featuredEvent]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@300;400;600;700;900&display=swap');
        
        @keyframes neon-glow {
          0%, 100% { 
            text-shadow: 0 0 10px #ff006e, 0 0 20px #ff006e, 0 0 30px #ff006e, 0 0 40px #ff006e;
            filter: brightness(1);
          }
          50% { 
            text-shadow: 0 0 20px #ff006e, 0 0 30px #ff006e, 0 0 40px #ff006e, 0 0 50px #ff006e, 0 0 60px #ff006e;
            filter: brightness(1.2);
          }
        }
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(255, 0, 110, 0.6), 0 0 60px rgba(138, 43, 226, 0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 50px rgba(255, 0, 110, 0.8), 0 0 80px rgba(138, 43, 226, 0.6);
            transform: scale(1.02);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes slide-up {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .font-bebas { font-family: 'Bebas Neue', cursive; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .animate-neon-glow { animation: neon-glow 2s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        
        .text-stroke {
          -webkit-text-stroke: 2px rgba(255, 255, 255, 0.3);
          paint-order: stroke fill;
        }
        
        .countdown-box {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 0, 110, 0.5);
          position: relative;
          overflow: hidden;
        }
        
        .countdown-box::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #ff006e, #8a2be2, #ff006e);
          z-index: -1;
          filter: blur(10px);
          opacity: 0.7;
        }
      `}</style>

      {/* Custom Transparent Navbar for HomePage */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-black/90 backdrop-blur-md shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <motion.div 
                className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Calendar className="w-6 h-6 text-white" />
              </motion.div>
              <motion.span 
                className="font-bebas text-2xl text-white tracking-wider"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                EVENT YUKK
              </motion.span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <motion.button 
                onClick={() => navigate('/')} 
                className="font-poppins text-pink-400 font-semibold"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Home
              </motion.button>
              <motion.button 
                onClick={() => navigate('/events')} 
                className="font-poppins text-white hover:text-pink-400 transition-colors font-medium"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Events
              </motion.button>
              <motion.button 
                onClick={() => navigate('/blog')} 
                className="font-poppins text-white hover:text-pink-400 transition-colors font-medium"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Blog
              </motion.button>
              <motion.button 
                onClick={() => navigate('/contact')} 
                className="font-poppins text-white hover:text-pink-400 transition-colors font-medium"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                Contact
              </motion.button>
            </div>

            {/* CTA Button or Profile Icon */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <motion.button 
                  onClick={() => navigate('/settings')}
                  className="hidden md:flex items-center gap-2 font-poppins px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <UserCircle2 className="w-5 h-5" />
                  <span>{user?.full_name || user?.username || 'Profile'}</span>
                </motion.button>
              ) : (
                <motion.button 
                  onClick={() => navigate('/login')}
                  className="hidden md:block font-poppins px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started
                </motion.button>
              )}
              
              {/* Mobile Menu Button */}
              <motion.button 
                className="md:hidden text-white"
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Minimalist & Modern */}
      <section className="relative pt-40 pb-32 min-h-screen flex items-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <motion.div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: featuredEvent?.image_url 
                ? `url(${getBackendBaseUrl()}${featuredEvent.image_url})`
                : 'url(https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop)',
            }}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 1.5, 
              ease: [0.25, 0.1, 0.25, 1],
              opacity: { duration: 1 }
            }}
          ></motion.div>
          {/* Dynamic gradient overlay based on image color */}
          <motion.div 
            className="absolute inset-0 transition-all duration-1000"
            style={{
              background: `linear-gradient(to bottom, 
                rgba(0, 0, 0, 0.85), 
                rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.75), 
                rgba(${dominantColor.r * 0.8}, ${dominantColor.g * 0.8}, ${dominantColor.b * 0.8}, 0.85)
              )`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
          ></motion.div>
        </div>

        {/* Content - Large & Prominent */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {loading ? (
            <div className="text-center text-white py-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"
              ></motion.div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-4 font-poppins"
              >
                Loading amazing events...
              </motion.p>
            </div>
          ) : featuredEvent ? (
            <motion.div 
              className="flex flex-col lg:flex-row items-center gap-16"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 1, 
                ease: [0.25, 0.1, 0.25, 1],
                y: { type: "spring", stiffness: 100, damping: 15 }
              }}
            >
              {/* Left: Event Image Card */}
              <motion.div 
                className="w-full lg:w-1/2"
                initial={{ opacity: 0, x: -80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  delay: 0.3, 
                  duration: 0.9,
                  ease: [0.25, 0.1, 0.25, 1],
                  scale: { type: "spring", stiffness: 200, damping: 20 }
                }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                  {featuredEvent.image_url ? (
                    <img 
                      src={`${BACKEND_BASE_URL}${featuredEvent.image_url}`}
                      alt={featuredEvent.title}
                      className="w-full h-[500px] object-cover transform group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800';
                      }}
                    />
                  ) : (
                    <div className="w-full h-[500px] bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center">
                      <div className="text-center text-white">
                        <svg className="w-24 h-24 mx-auto mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        <p className="text-xl font-bold">Event Image</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  {/* Highlight Badge */}
                  <motion.div 
                    className="absolute top-6 left-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-full font-poppins font-bold text-base flex items-center gap-2 shadow-2xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Featured Event
                  </motion.div>
                </div>
              </motion.div>

              {/* Right: Event Info */}
              <motion.div 
                className="w-full lg:w-1/2 text-white"
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  delay: 0.5, 
                  duration: 0.9,
                  ease: [0.25, 0.1, 0.25, 1],
                  scale: { type: "spring", stiffness: 200, damping: 20 }
                }}
              >
                <motion.h1 
                  className="font-bebas text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight animate-welcome-fade-in animate-welcome-glow"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 0.7, 
                    duration: 1,
                    ease: [0.25, 0.1, 0.25, 1],
                    y: { type: "spring", stiffness: 150, damping: 20 }
                  }}
                >
                  {featuredEvent.title}
                </motion.h1>
                
                <motion.p 
                  className="font-poppins text-gray-300 text-xl mb-8 line-clamp-3 animate-fadeInUp"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 0.9, 
                    duration: 0.9,
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                >
                  {featuredEvent.short_description || featuredEvent.description}
                </motion.p>

                {/* Countdown - Large */}
                <motion.div 
                  className="flex gap-4 mb-8 animate-slide-in-bounce"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 1.1, 
                    duration: 1,
                    type: "spring", 
                    stiffness: 200, 
                    damping: 25 
                  }}
                >
                  <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 flex-1 border border-pink-500/30">
                    <div className="font-bebas text-5xl font-black text-pink-400">{countdown.days}</div>
                    <div className="font-poppins text-sm text-white/80">Days</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 flex-1 border border-pink-500/30">
                    <div className="font-bebas text-5xl font-black text-pink-400">{countdown.hours}</div>
                    <div className="font-poppins text-sm text-white/80">Hours</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 flex-1 border border-pink-500/30">
                    <div className="font-bebas text-5xl font-black text-pink-400">{countdown.minutes}</div>
                    <div className="font-poppins text-sm text-white/80">Min</div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 flex-1 border border-pink-500/30">
                    <div className="font-bebas text-5xl font-black text-pink-400">{countdown.seconds}</div>
                    <div className="font-poppins text-sm text-white/80">Sec</div>
                  </div>
                </motion.div>

                {/* Event Details - Large */}
                <motion.div 
                  className="flex flex-wrap gap-4 mb-8 font-poppins text-base animate-fadeInUp"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 1.3, 
                    duration: 0.9,
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                >
                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-5 py-3 rounded-lg">
                    <Calendar className="w-5 h-5 text-pink-400" />
                    <span>{new Date(featuredEvent.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-5 py-3 rounded-lg">
                    <MapPin className="w-5 h-5 text-pink-400" />
                    <span>{featuredEvent.location}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-5 py-3 rounded-lg">
                    <Users className="w-5 h-5 text-pink-400" />
                    <span>{featuredEvent.approved_registrations || 0} / {featuredEvent.max_participants}</span>
                  </div>
                </motion.div>

                {/* CTA Button - Large */}
                <motion.button
                  onClick={() => navigate(`/events/${featuredEvent.id}`)}
                  className="group bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-poppins font-bold py-5 px-10 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl inline-flex items-center gap-3 animate-pulse-glow"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 1.5, 
                    duration: 1,
                    type: "spring", 
                    stiffness: 250, 
                    damping: 20 
                  }}
                >
                  <Ticket className="w-6 h-6" />
                  Register Now
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              className="text-center text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-6xl font-bold mb-6">No Featured Events</h1>
              <p className="text-xl text-pink-200">Check back soon for upcoming events!</p>
            </motion.div>
          )}
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </motion.div>
      </section>

      {/* Smooth Fade Transition from Hero to How to Join */}
      <div className="h-32 bg-gradient-to-b from-purple-800 via-purple-900 to-white"></div>

      {/* How to Join Event Section - Interactive with Hover Effects */}
      <section className="py-24 bg-gradient-to-b from-white via-purple-50/30 to-white relative overflow-hidden">
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
          }
          .step-card:hover .pulse-ring {
            animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          .step-card:hover .sparkle {
            animation: sparkle 1s ease-in-out infinite;
          }
        `}</style>

        {/* Animated Background Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-40">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: `${Math.random() * 300 + 150}px`,
                height: `${Math.random() * 300 + 150}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, ${['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)', 'rgba(59, 130, 246, 0.2)'][i % 3]}, transparent)`,
              }}
              animate={{
                x: [0, (Math.random() - 0.5) * 100, 0],
                y: [0, (Math.random() - 0.5) * 100, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <FadeInUp>
            <div className="text-center mb-20">
              <motion.div 
                className="inline-block mb-4 animate-bounce"
                whileHover={{ scale: 1.1 }}
              >
                <span className="bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-poppins font-bold shadow-lg">
                  🚀 GETTING STARTED
                </span>
              </motion.div>
              <h2 className="font-bebas text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 mb-6 tracking-tight">
                How to Join Event
              </h2>
              <p className="font-poppins text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
                Follow these <span className="font-bold text-purple-600">5 simple steps</span> to discover and join amazing events
              </p>
            </div>
          </FadeInUp>

          {/* Steps with Progress Line */}
          <div className="relative">
            {/* Animated Progress Line - Hidden on mobile */}
            <div className="hidden lg:block absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-green-200 via-blue-200 via-purple-200 via-pink-200 to-yellow-200 rounded-full mx-auto" style={{ width: 'calc(100% - 12rem)', left: '6rem' }}></div>
            
            <StaggerContainer staggerDelay={0.15}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-6">
              {/* Step 1: Login */}
              <StaggerItem>
                <div className="step-card group relative">
              {/* Hover Info Card */}
              <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20 border-2 border-green-500">
                <h4 className="font-bebas text-xl text-green-600 mb-2">🔐 Step 1: Login</h4>
                <p className="font-poppins text-sm text-gray-600">Create your account or sign in to unlock all features and start booking events!</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => navigate('/register')} className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-poppins font-bold hover:bg-green-600">Sign Up</button>
                  <button onClick={() => navigate('/login')} className="flex-1 bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-poppins font-bold hover:bg-gray-300">Login</button>
                </div>
              </div>
              
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  {/* Pulse Ring on Hover */}
                  <div className="pulse-ring absolute inset-0 rounded-full bg-green-400"></div>
                  
                  {/* Main Circle */}
                  <motion.div 
                    className="relative w-28 h-28 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                    whileHover={{ scale: 1.1, rotate: 6 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    
                    {/* Sparkles */}
                    {[...Array(4)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        className="sparkle absolute w-2 h-2 bg-yellow-300 rounded-full" 
                        style={{
                          top: ['10%', '90%', '10%', '90%'][i],
                          left: ['10%', '10%', '90%', '90%'][i]
                        }}
                        animate={{ 
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      ></motion.div>
                    ))}
                  </motion.div>
                  
                  {/* Step Number Badge */}
                  <motion.div 
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center font-bebas text-2xl text-white shadow-xl group-hover:scale-125 transition-transform duration-300"
                    whileHover={{ scale: 1.25 }}
                  >
                    1
                  </motion.div>
                </div>
                <h3 className="font-poppins text-xl font-black text-gray-900 mb-2 uppercase tracking-wide group-hover:text-green-600 transition-colors">Login</h3>
                <p className="font-poppins text-sm text-gray-600 leading-relaxed">Create account or sign in to get started</p>
              </div>
            </div>
              </StaggerItem>

            {/* Step 2: Browse Events */}
              <StaggerItem>
            <div className="step-card group relative">
              <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20 border-2 border-blue-500">
                <h4 className="font-bebas text-xl text-blue-600 mb-2">🔍 Step 2: Find Event</h4>
                <p className="font-poppins text-sm text-gray-600">Browse thousands of amazing events! Use filters to find exactly what you're looking for.</p>
                <button onClick={() => navigate('/events')} className="mt-2 w-full bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-poppins font-bold hover:bg-blue-600">Browse Events</button>
              </div>
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="pulse-ring absolute inset-0 rounded-full bg-blue-400"></div>
                  <motion.div 
                    className="relative w-28 h-28 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                    whileHover={{ scale: 1.1, rotate: 6 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {[...Array(4)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        className="sparkle absolute w-2 h-2 bg-yellow-300 rounded-full" 
                        style={{ top: ['10%', '90%', '10%', '90%'][i], left: ['10%', '10%', '90%', '90%'][i] }}
                        animate={{ 
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      ></motion.div>
                    ))}
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center font-bebas text-2xl text-white shadow-xl group-hover:scale-125 transition-transform duration-300"
                    whileHover={{ scale: 1.25 }}
                  >
                    2
                  </motion.div>
                </div>
                <h3 className="font-poppins text-xl font-black text-gray-900 mb-2 uppercase tracking-wide group-hover:text-blue-600 transition-colors">Find Event</h3>
                <p className="font-poppins text-sm text-gray-600 leading-relaxed">Browse and discover events you love</p>
              </div>
            </div>
              </StaggerItem>

            {/* Step 3: Buy Ticket */}
              <StaggerItem>
            <div className="step-card group relative">
              <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20 border-2 border-purple-500">
                <h4 className="font-bebas text-xl text-purple-600 mb-2">🎫 Step 3: Buy Ticket</h4>
                <p className="font-poppins text-sm text-gray-600">Secure payment options available. Get instant confirmation and e-ticket!</p>
              </div>
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="pulse-ring absolute inset-0 rounded-full bg-purple-400"></div>
                  <motion.div 
                    className="relative w-28 h-28 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                    whileHover={{ scale: 1.1, rotate: 6 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Ticket className="w-14 h-14 text-white" />
                    {[...Array(4)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        className="sparkle absolute w-2 h-2 bg-yellow-300 rounded-full" 
                        style={{ top: ['10%', '90%', '10%', '90%'][i], left: ['10%', '10%', '90%', '90%'][i] }}
                        animate={{ 
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      ></motion.div>
                    ))}
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center font-bebas text-2xl text-white shadow-xl group-hover:scale-125 transition-transform duration-300"
                    whileHover={{ scale: 1.25 }}
                  >
                    3
                  </motion.div>
                </div>
                <h3 className="font-poppins text-xl font-black text-gray-900 mb-2 uppercase tracking-wide group-hover:text-purple-600 transition-colors">Buy Ticket</h3>
                <p className="font-poppins text-sm text-gray-600 leading-relaxed">Secure your spot with easy payment</p>
              </div>
            </div>
              </StaggerItem>

            {/* Step 4: Enjoy Event */}
              <StaggerItem>
            <div className="step-card group relative">
              <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20 border-2 border-pink-500">
                <h4 className="font-bebas text-xl text-pink-600 mb-2">🎉 Step 4: Enjoy Event</h4>
                <p className="font-poppins text-sm text-gray-600">Show your e-ticket at the venue and enjoy an unforgettable experience!</p>
              </div>
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="pulse-ring absolute inset-0 rounded-full bg-pink-400"></div>
                  <motion.div 
                    className="relative w-28 h-28 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                    whileHover={{ scale: 1.1, rotate: 6 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {[...Array(4)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        className="sparkle absolute w-2 h-2 bg-yellow-300 rounded-full" 
                        style={{ top: ['10%', '90%', '10%', '90%'][i], left: ['10%', '10%', '90%', '90%'][i] }}
                        animate={{ 
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      ></motion.div>
                    ))}
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-700 rounded-full flex items-center justify-center font-bebas text-2xl text-white shadow-xl group-hover:scale-125 transition-transform duration-300"
                    whileHover={{ scale: 1.25 }}
                  >
                    4
                  </motion.div>
                </div>
                <h3 className="font-poppins text-xl font-black text-gray-900 mb-2 uppercase tracking-wide group-hover:text-pink-600 transition-colors">Enjoy Event</h3>
                <p className="font-poppins text-sm text-gray-600 leading-relaxed">Have an amazing experience</p>
              </div>
            </div>
              </StaggerItem>

            {/* Step 5: Get Certificate */}
              <StaggerItem>
            <div className="step-card group relative">
              <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20 border-2 border-yellow-500">
                <h4 className="font-bebas text-xl text-yellow-600 mb-2">🏆 Step 5: Get Certificate</h4>
                <p className="font-poppins text-sm text-gray-600">Complete the event and receive your official achievement certificate as proof!</p>
              </div>
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="pulse-ring absolute inset-0 rounded-full bg-yellow-400"></div>
                  <motion.div 
                    className="relative w-28 h-28 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                    whileHover={{ scale: 1.1, rotate: 6 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    {[...Array(4)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        className="sparkle absolute w-2 h-2 bg-white rounded-full" 
                        style={{ top: ['10%', '90%', '10%', '90%'][i], left: ['10%', '10%', '90%', '90%'][i] }}
                        animate={{ 
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      ></motion.div>
                    ))}
                  </motion.div>
                  <motion.div 
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-full flex items-center justify-center font-bebas text-2xl text-white shadow-xl group-hover:scale-125 transition-transform duration-300"
                    whileHover={{ scale: 1.25 }}
                  >
                    5
                  </motion.div>
                </div>
                <h3 className="font-poppins text-xl font-black text-gray-900 mb-2 uppercase tracking-wide group-hover:text-yellow-600 transition-colors">Get Certificate</h3>
                <p className="font-poppins text-sm text-gray-600 leading-relaxed">Receive your achievement certificate</p>
              </div>
            </div>
              </StaggerItem>
            </div>
            </StaggerContainer>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <motion.button
              onClick={() => navigate('/events')}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full font-poppins font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Start Your Journey</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </div>

        {/* CSS for floating animation */}
        <style>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) translateX(0);
            }
            25% {
              transform: translateY(-20px) translateX(10px);
            }
            50% {
              transform: translateY(-10px) translateX(-10px);
            }
            75% {
              transform: translateY(-30px) translateX(5px);
            }
          }
        `}</style>
      </section>

      {/* Smooth Transition to Upcoming Events */}
      <div className="h-24 bg-white"></div>

      {/* Upcoming Events Section - Asymmetric Bento Grid */}
      <section className="py-20 bg-gray-50 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-purple-300 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 -right-20 w-72 h-72 bg-pink-300 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header - Left Aligned */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-10 h-10 text-purple-600" />
              <h2 className="font-bebas text-5xl md:text-6xl font-bold text-gray-800">
                Upcoming Events
              </h2>
            </div>
            <p className="font-poppins text-gray-600 text-lg ml-13">Don't miss out on these amazing experiences</p>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-[280px]">
              {upcomingEvents.slice(0, 6).map((event, index) => {
                // Bento grid pattern - different sizes for visual interest
                const gridClasses = [
                  'md:col-span-3 lg:col-span-4 md:row-span-2', // Large
                  'md:col-span-3 lg:col-span-4 md:row-span-1', // Wide
                  'md:col-span-3 lg:col-span-2 md:row-span-1', // Medium
                  'md:col-span-3 lg:col-span-2 md:row-span-1', // Medium
                  'md:col-span-3 lg:col-span-3 md:row-span-1', // Medium-wide
                  'md:col-span-3 lg:col-span-3 md:row-span-1', // Medium-wide
                ];
                
                return (
              <motion.div
                key={event.id}
                className={`group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer ${gridClasses[index] || 'md:col-span-3'}`}
                onClick={() => navigate(`/events/${event.id}`)}
                whileHover={{ y: -10, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={event.image_url ? `${BACKEND_BASE_URL}${event.image_url}` : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop';
                    }}
                  />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                    <MapPin className="w-5 h-5" />
                    <span className="font-poppins font-semibold text-sm drop-shadow-lg">{event.location}</span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-poppins text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-poppins text-sm font-semibold">{(event.price === 0 || event.price === null || event.is_free) ? 'FREE' : `Rp ${(event.price || 0).toLocaleString('id-ID')}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Users className="w-4 h-4" />
                      <span className="font-poppins text-sm">{event.approved_registrations || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-blue-600 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span className="font-poppins text-sm font-semibold">
                      {new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </motion.div>
                );
              })}
            </div>
          ) : !loading && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Upcoming Events</h3>
              <p className="text-gray-400">Check back soon for new events!</p>
            </div>
          )}
        </div>
        
        {/* Gradient Fade to White */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white"></div>
      </section>

      {/* Featured Events Section - Diagonal Split Layout */}
      <section className="py-32 bg-gradient-to-br from-white via-purple-50 to-pink-50 relative overflow-hidden">
        {/* Decorative diagonal stripes */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-100 to-transparent transform skew-x-12"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header - Split Design */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Star className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h2 className="font-bebas text-5xl md:text-6xl font-bold text-gray-800 leading-tight">
                    Featured<br/>Events
                  </h2>
                  <p className="font-poppins text-gray-600 text-lg mt-2">Curated picks you'll love</p>
                </div>
              </div>
            </div>
            <motion.button 
              onClick={() => navigate('/events')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-poppins font-bold text-base transition-all flex items-center gap-2 shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              Explore All Events <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Show events 6-12 if more than 6 events exist, otherwise show first 3 events */}
              {(upcomingEvents.length > 6 ? upcomingEvents.slice(6, 12) : upcomingEvents.slice(0, 3)).map((event, index) => (
              <motion.div
                key={event.id}
                className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/events/${event.id}`)}
                whileHover={{ y: -10, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="relative h-80 overflow-hidden">
                  <img
                    src={event.image_url ? `${BACKEND_BASE_URL}${event.image_url}` : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop';
                    }}
                  />
                  <div className="absolute top-6 right-6">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-poppins font-bold shadow-lg">
                      {new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-poppins text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span className="font-poppins text-base line-clamp-1">{event.location}</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="font-poppins text-base font-bold text-purple-600">
                      {(event.price === 0 || event.price === null || event.is_free) ? 'FREE' : `Rp ${(event.price || 0).toLocaleString('id-ID')}`}
                    </span>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Users className="w-5 h-5" />
                      <span className="font-poppins text-sm">{event.approved_registrations || 0}/{event.max_participants}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="font-bebas text-3xl text-gray-800 mb-2">No Featured Events Yet</h3>
              <p className="font-poppins text-gray-600 mb-6">Check back soon for curated events!</p>
              <motion.button 
                onClick={() => navigate('/events')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-poppins font-bold hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Browse All Events
              </motion.button>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section - Redesigned */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Gradient Fade from Previous Section */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent z-20"></div>
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-200 rounded-full blur-3xl opacity-20"></div>
        
        {/* Floating Decorative Bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${Math.random() * 150 + 30}px`,
                height: `${Math.random() * 150 + 30}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, ${i % 2 === 0 ? 'rgba(236, 72, 153, 0.1)' : 'rgba(147, 51, 234, 0.1)'}, transparent)`,
              }}
              animate={{
                x: [0, (Math.random() - 0.5) * 50, 0],
                y: [0, (Math.random() - 0.5) * 50, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <FadeInUp>
            <div className="text-center mb-16">
              <motion.div 
                className="inline-block mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-poppins font-bold shadow-lg">
                  🎯 EXPLORE CATEGORIES
                </span>
              </motion.div>
              <h2 className="font-bebas text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 mb-6 tracking-tight">
                Event Categories
              </h2>
              <p className="font-poppins text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
                Discover events tailored to <span className="font-bold text-purple-600">your interests</span>
              </p>
            </div>
          </FadeInUp>

          {/* Categories Grid */}
          {categories.length > 0 ? (
            <StaggerContainer staggerDelay={0.1}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {categories.map((category, index) => (
                  <StaggerItem key={category.id}>
                    <motion.div
                      className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                      onClick={() => navigate(`/events?category=${category.id}`)}
                      whileHover={{ y: -10, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Gradient Background on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                      
                      {/* Icon */}
                      <div className="relative mb-4 flex justify-center">
                        <motion.div 
                          className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <div className="text-purple-600 group-hover:text-white transition-colors duration-300">
                            {getCategoryIcon(category.name)}
                          </div>
                        </motion.div>
                      </div>
                      
                      {/* Category Name */}
                      <h3 className="font-poppins text-center text-lg font-bold text-gray-800 group-hover:text-purple-600 transition-colors duration-300 mb-2">
                        {category.name}
                      </h3>
                      
                      {/* Event Count */}
                      <p className="font-poppins text-center text-sm text-gray-500 group-hover:text-purple-500 transition-colors duration-300">
                        {category.event_count || 0} Events
                      </p>
                      
                      {/* Hover Arrow */}
                      <motion.div 
                        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={{ x: -10 }}
                        whileHover={{ x: 0 }}
                      >
                        <ArrowRight className="w-5 h-5 text-purple-600" />
                      </motion.div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="font-bebas text-3xl text-gray-800 mb-2">No Categories Yet</h3>
              <p className="font-poppins text-gray-600">Categories will appear here soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Reviews Section - Testimonials */}
      <section className="py-32 bg-gradient-to-b from-white via-purple-50 to-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <FadeInUp>
            <div className="text-center mb-20">
              <motion.div 
                className="inline-block mb-4"
                whileHover={{ scale: 1.1 }}
              >
                <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-poppins font-bold shadow-lg">
                  ⭐ TESTIMONIALS
                </span>
              </motion.div>
              <h2 className="font-bebas text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 mb-6 tracking-tight">
                What People Say
              </h2>
              <p className="font-poppins text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
                Real experiences from our <span className="font-bold text-purple-600">amazing community</span>
              </p>
            </div>
          </FadeInUp>

          {/* Reviews Grid */}
          {reviews.length > 0 ? (
            <StaggerContainer staggerDelay={0.15}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reviews.slice(0, 6).map((review, index) => (
                  <StaggerItem key={review.id}>
                    <motion.div
                      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
                      whileHover={{ y: -10 }}
                    >
                      {/* Gradient Border Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '2px' }}>
                        <div className="bg-white rounded-2xl w-full h-full"></div>
                      </div>
                      
                      <div className="relative z-10">
                        {/* Stars Rating */}
                        <div className="flex gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 + i * 0.05 }}
                            >
                              <Star 
                                className={`w-5 h-5 ${
                                  i < (review.rating || 5) 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-300'
                                }`} 
                              />
                            </motion.div>
                          ))}
                        </div>
                        
                        {/* Review Text */}
                        <p className="font-poppins text-gray-700 text-base mb-6 leading-relaxed line-clamp-4">
                          "{review.comment || review.review_text}"
                        </p>
                        
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {(review.user_name || review.username || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-poppins font-bold text-gray-900">
                              {review.user_name || review.username || 'Anonymous'}
                            </h4>
                            <p className="font-poppins text-sm text-gray-500">
                              {review.event_title || 'Event Attendee'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="font-bebas text-3xl text-gray-800 mb-2">No Reviews Yet</h3>
              <p className="font-poppins text-gray-600">Be the first to share your experience!</p>
            </div>
          )}
        </div>
      </section>

      {/* Mobile App Preview Section */}
      <section className="py-32 bg-gradient-to-br from-purple-900 via-purple-800 to-black relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <FadeInLeft>
              <div className="text-white">
                <motion.div 
                  className="inline-block mb-6"
                  whileHover={{ scale: 1.1 }}
                >
                  <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-poppins font-bold shadow-lg">
                    📱 DOWNLOAD APP
                  </span>
                </motion.div>
                
                <h2 className="font-bebas text-5xl md:text-7xl font-black mb-6 leading-tight">
                  Get Event Yukk<br/>On Mobile
                </h2>
                
                <p className="font-poppins text-gray-300 text-xl mb-8 leading-relaxed">
                  Experience the best event booking platform on your mobile device. 
                  Book tickets, manage registrations, and get real-time updates on the go!
                </p>
                
                {/* Features List */}
                <div className="space-y-4 mb-8">
                  {[
                    { icon: '⚡', text: 'Lightning fast booking' },
                    { icon: '🔔', text: 'Real-time notifications' },
                    { icon: '🎫', text: 'Digital tickets & QR codes' },
                    { icon: '🌟', text: 'Personalized recommendations' }
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-4"
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-2xl">
                        {feature.icon}
                      </div>
                      <span className="font-poppins text-lg">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
                
                {/* CTA Button to Mobile App Page */}
                <motion.button
                  onClick={() => navigate('/mobile-app')}
                  className="mb-6 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-2xl font-poppins font-bold transition-all shadow-lg hover:shadow-2xl flex items-center gap-3"
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>📱</span>
                  <span>Lihat Halaman Mobile App</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>

                {/* Download Buttons */}
                <div className="flex flex-wrap gap-4">
                  <motion.button
                    onClick={() => navigate('/mobile-app')}
                    className="flex items-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl font-poppins font-bold hover:shadow-2xl transition-all"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs">Download on the</div>
                      <div className="text-lg font-bold">App Store</div>
                    </div>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => navigate('/mobile-app')}
                    className="flex items-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl font-poppins font-bold hover:shadow-2xl transition-all"
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs">Get it on</div>
                      <div className="text-lg font-bold">Google Play</div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </FadeInLeft>
            
            {/* Right: Phone Mockup */}
            <FadeInRight>
              <div className="relative">
                {/* Floating Animation */}
                <motion.div
                  animate={{ y: [-20, 20, -20] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  {/* Phone Frame */}
                  <div className="relative mx-auto w-[300px] h-[600px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                    {/* Phone Screen */}
                    <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                      {/* Status Bar */}
                      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-between px-6 text-white text-xs">
                        <span>9:41</span>
                        <div className="flex gap-1">
                          <div className="w-4 h-4 border border-white rounded-sm"></div>
                          <div className="w-4 h-4 border border-white rounded-sm"></div>
                          <div className="w-4 h-4 border border-white rounded-sm"></div>
                        </div>
                      </div>
                      
                      {/* App Screenshot Simulation */}
                      <div className="pt-8 bg-gradient-to-b from-purple-50 to-white h-full overflow-hidden">
                        <div className="p-4">
                          <div className="text-2xl font-bold text-gray-900 mb-4">Upcoming Events</div>
                          
                          {/* Event Cards */}
                          {[1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="bg-white rounded-xl shadow-md p-4 mb-4"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.2 }}
                            >
                              <div className="flex gap-3">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg"></div>
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Phone Notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-gray-900 rounded-b-2xl"></div>
                  </div>
                </motion.div>
                
                {/* Decorative Elements */}
                <motion.div
                  className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500 rounded-full blur-3xl opacity-30"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-30"
                  animate={{ scale: [1.2, 1, 1.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </FadeInRight>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;