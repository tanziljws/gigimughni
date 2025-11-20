import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Lightbulb, Newspaper, Calendar, FileText, Search } from 'lucide-react';
import api from '../../services/api';
import { BACKEND_BASE_URL } from '../../services/api';
import Footer from '../../components/Footer';

const BlogPage = () => {
  const [articles, setArticles] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const categories = [
    { value: 'all', label: 'Semua Artikel', icon: BookOpen },
    { value: 'tips', label: 'Tips & Trik', icon: Lightbulb },
    { value: 'news', label: 'Berita', icon: Newspaper },
    { value: 'event-update', label: 'Update Event', icon: Calendar },
    { value: 'general', label: 'Umum', icon: FileText }
  ];

  useEffect(() => {
    fetchArticles();
    fetchFeaturedArticles();
  }, [selectedCategory, searchQuery, currentPage]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 9
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await api.get(`/articles?${params}`);
      const data = response.data || response;

      if (data.success) {
        setArticles(data.data.articles);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedArticles = async () => {
    try {
      const response = await api.get('/articles/featured');
      const data = response.data || response;

      if (data.success) {
        setFeaturedArticles(data.data);
      }
    } catch (error) {
      console.error('Error fetching featured articles:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchArticles();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryIcon = (category) => {
    const categoryData = categories.find(cat => cat.value === category);
    const IconComponent = categoryData ? categoryData.icon : FileText;
    return <IconComponent className="w-5 h-5" />;
  };

  const getCategoryLabel = (category) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData ? categoryData.label : 'Umum';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@300;400;600;700;900&display=swap');
        .font-bebas { font-family: 'Bebas Neue', cursive; }
        .font-poppins { font-family: 'Poppins', sans-serif; }
      `}</style>

      {/* Custom Transparent Navbar */}
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
              <button onClick={() => navigate('/events')} className="font-poppins text-white hover:text-pink-400 transition-colors font-medium">Events</button>
              <button onClick={() => navigate('/blog')} className="font-poppins text-pink-400 font-semibold">Blog</button>
              <button onClick={() => navigate('/contact')} className="font-poppins text-white hover:text-pink-400 transition-colors font-medium">Contact</button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-4">
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
          <h1 className="font-bebas text-5xl md:text-7xl text-white mb-4 tracking-wider">BLOG & ARTICLES</h1>
          <p className="font-poppins text-xl text-purple-200 max-w-2xl mx-auto">Tips, tricks, and latest updates about events and career development</p>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl font-poppins focus:outline-none focus:border-purple-500 transition-colors"
              />
            </form>
            
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setSelectedCategory(cat.value);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-poppins font-semibold text-sm whitespace-nowrap transition-all ${
                      selectedCategory === cat.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <div className="mb-16">
            <h2 className="font-poppins text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-purple-600" />
              Featured Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredArticles.slice(0, 3).map((article) => (
                <Link
                  key={article.id}
                  to={`/blog/${article.slug}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-56 overflow-hidden">
                    {article.featured_image ? (
                      <img 
                        src={article.featured_image.startsWith('http') ? article.featured_image : `${BACKEND_BASE_URL}${article.featured_image}`}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const iconElement = getCategoryIcon(article.category);
                          e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">' + iconElement.props.children + '</div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {getCategoryIcon(article.category)}
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                        {getCategoryLabel(article.category)}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="bg-gray-900/20 backdrop-blur-sm text-gray-900 text-xs px-2 py-1 rounded-full animate-pulse">
                        ⭐ Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-poppins text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="font-poppins text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500 font-poppins">
                      <span>{article.author_name}</span>
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Articles Section */}
        <div className="mb-8">
          <h2 className="font-poppins text-3xl font-bold text-gray-800 mb-8">All Articles</h2>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  to={`/blog/${article.slug}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-56 overflow-hidden">
                    {article.featured_image ? (
                      <img 
                        src={article.featured_image.startsWith('http') ? article.featured_image : `${BACKEND_BASE_URL}${article.featured_image}`}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const iconElement = getCategoryIcon(article.category);
                          e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">' + iconElement.props.children + '</div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {getCategoryIcon(article.category)}
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                        {getCategoryLabel(article.category)}
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <span className="bg-white/80 backdrop-blur-sm text-gray-900 text-xs px-2 py-1 rounded-full">
                        👁️ {article.views}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{article.author_name}</span>
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {article.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  ← Sebelumnya
                </button>
                
                <div className="flex space-x-2">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-xl transition-all ${
                          currentPage === page
                            ? 'bg-gray-900 text-white'
                            : 'bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-all"
                >
                  Selanjutnya →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              <FileText className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tidak Ada Artikel</h3>
            <p className="text-gray-600">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Tidak ditemukan artikel yang sesuai dengan pencarian atau filter Anda.'
                : 'Belum ada artikel yang dipublikasikan.'}
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setCurrentPage(1);
                }}
                className="mt-4 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all transform hover:scale-105"
              >
                Reset Filter
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default BlogPage;
