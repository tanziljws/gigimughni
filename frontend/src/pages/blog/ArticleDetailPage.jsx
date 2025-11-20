import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { BACKEND_BASE_URL } from '../../services/api';

const ArticleDetailPage = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/articles/${slug}`);
      const data = response.data || response;

      if (data.success) {
        setArticle(data.data.article);
        setRelatedArticles(data.data.relatedArticles);
      } else {
        setError('Artikel tidak ditemukan');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Gagal memuat artikel');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryLabel = (category) => {
    const categories = {
      'tips': 'Tips & Trik',
      'news': 'Berita',
      'event-update': 'Update Event',
      'general': 'Umum'
    };
    return categories[category] || 'Umum';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'tips': '💡',
      'news': '📰',
      'event-update': '🎪',
      'general': '📝'
    };
    return icons[category] || '📝';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-space relative overflow-hidden">
        {/* Cosmic Loading Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-comet-cyan/20 rounded-full blur-2xl animate-cosmic-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-plasma-purple/20 rounded-full blur-xl animate-stellar-drift"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="animate-pulse">
            <div className="h-8 bg-cosmic-navy/50 rounded mb-8 w-1/4 animate-cosmic-pulse"></div>
            <div className="h-12 bg-cosmic-navy/50 rounded mb-4 animate-stellar-drift"></div>
            <div className="h-6 bg-cosmic-navy/50 rounded mb-8 w-1/2 animate-nebula-swirl"></div>
            <div className="h-64 bg-cosmic-navy/50 rounded mb-8 animate-space-float"></div>
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-cosmic-navy/50 rounded animate-cosmic-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-deep-space flex items-center justify-center relative overflow-hidden">
        {/* Error State Cosmic Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-nebula-pink/10 rounded-full blur-3xl animate-cosmic-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-comet-cyan/10 rounded-full blur-2xl animate-stellar-drift"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-starlight mb-2 animate-cosmic-twinkle">Artikel Tidak Ditemukan</h1>
          <p className="text-moon-silver mb-6 animate-fade-in-up">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/blog')}
              className="px-6 py-3 bg-gradient-to-r from-comet-cyan to-plasma-purple text-star-white rounded-xl hover:from-comet-cyan/80 hover:to-plasma-purple/80 transition-all transform hover:scale-105 animate-glow"
            >
              Kembali ke Blog
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 cosmic-glass text-star-white rounded-xl hover:bg-cosmic-navy/50 transition-all transform hover:scale-105 animate-glow"
            >
              Ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-moon-silver mb-8 animate-fade-in-up">
          <Link to="/" className="hover:text-starlight transition-colors animate-cosmic-twinkle">Beranda</Link>
          <span className="text-comet-cyan">/</span>
          <Link to="/blog" className="hover:text-starlight transition-colors animate-cosmic-twinkle">Blog</Link>
          <span className="text-comet-cyan">/</span>
          <span className="text-starlight">{article.title}</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <span className="bg-gradient-to-r from-comet-cyan to-plasma-purple text-star-white text-sm px-3 py-1 rounded-full animate-glow">
              {getCategoryIcon(article.category)} {getCategoryLabel(article.category)}
            </span>
            <span className="text-moon-silver text-sm animate-cosmic-twinkle">
              👁️ {article.views} views
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-cosmic mb-6 leading-tight animate-fade-in-up">
            {article.title}
          </h1>
          
          <div className="flex items-center justify-between text-moon-silver mb-6 animate-slide-in-left">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-comet-cyan to-plasma-purple rounded-full flex items-center justify-center animate-glow">
                <span className="text-star-white font-semibold">
                  {article.author_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-starlight font-medium">{article.author_name}</p>
                <p className="text-sm">{formatDate(article.published_at)}</p>
              </div>
            </div>
          </div>

          {article.excerpt && (
            <p className="text-xl text-moon-silver leading-relaxed mb-8 animate-fade-in-up">
              {article.excerpt}
            </p>
          )}
        </header>

        {/* Featured Image */}
        {article.featured_image && (
          <div className="mb-8">
            <img
              src={article.featured_image.startsWith('http') ? article.featured_image : `${BACKEND_BASE_URL}${article.featured_image}`}
              alt={article.title}
              className="w-full h-64 md:h-96 object-cover rounded-2xl"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Article Content */}
        <article className="prose prose-lg prose-invert max-w-none mb-12 animate-fade-in-up">
          <div 
            className="text-moon-silver leading-relaxed"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mb-12">
            <h3 className="text-starlight font-semibold mb-4 animate-cosmic-twinkle">Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <span
                  key={index}
                  className="cosmic-glass text-comet-cyan px-3 py-1 rounded-full text-sm animate-glow"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share Buttons */}
        <div className="border-t border-cosmic-navy pt-8 mb-12 animate-fade-in-up">
          <h3 className="text-starlight font-semibold mb-4 animate-cosmic-twinkle">Bagikan Artikel:</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                const url = window.location.href;
                const text = `Baca artikel menarik: ${article.title}`;
                if (navigator.share) {
                  navigator.share({ title: article.title, text, url });
                } else {
                  navigator.clipboard.writeText(`${text} ${url}`);
                  alert('Link berhasil disalin!');
                }
              }}
              className="flex items-center space-x-2 cosmic-glass hover:bg-cosmic-navy/50 text-star-white px-4 py-2 rounded-xl transition-all transform hover:scale-105 animate-glow"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Share</span>
            </button>
            
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-gradient-to-r from-comet-cyan to-plasma-purple hover:from-comet-cyan/80 hover:to-plasma-purple/80 text-star-white px-4 py-2 rounded-xl transition-all transform hover:scale-105 animate-glow"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              <span>Twitter</span>
            </a>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-cosmic mb-8 animate-fade-in-up">Artikel Terkait</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  to={`/blog/${relatedArticle.slug}`}
                  className="group cosmic-glass rounded-2xl overflow-hidden hover:border-comet-cyan/50 transition-all duration-300 hover:scale-105 animate-fade-in-up"
                >
                  <div className="aspect-video bg-gradient-to-r from-cosmic-navy to-stellar-blue relative overflow-hidden">
                    {relatedArticle.featured_image ? (
                      <img 
                        src={relatedArticle.featured_image.startsWith('http') ? relatedArticle.featured_image : `${BACKEND_BASE_URL}${relatedArticle.featured_image}`}
                        alt={relatedArticle.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-4xl">' + getCategoryIcon(relatedArticle.category) + '</span></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">{getCategoryIcon(relatedArticle.category)}</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="cosmic-glass text-star-white text-xs px-3 py-1 rounded-full animate-glow">
                        {getCategoryLabel(relatedArticle.category)}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-starlight mb-2 group-hover:text-comet-cyan transition-colors line-clamp-2">
                      {relatedArticle.title}
                    </h3>
                    <p className="text-moon-silver text-sm mb-3 line-clamp-2">
                      {relatedArticle.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-moon-silver">
                      <span>{relatedArticle.author_name}</span>
                      <span>{formatDate(relatedArticle.published_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="text-center mt-16">
          <Link
            to="/blog"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-comet-cyan to-plasma-purple text-star-white rounded-xl hover:from-comet-cyan/80 hover:to-plasma-purple/80 transition-all transform hover:scale-105 animate-glow"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Blog
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailPage;
