const express = require('express');
const router = express.Router();
const { query } = require('../db');
const ApiResponse = require('../middleware/response');
const { authenticateToken } = require('../middleware/auth');

// Get all published articles with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a.status = "published"';
    let queryParams = [];

    if (category) {
      whereClause += ' AND a.category = ?';
      queryParams.push(category);
    }

    if (search) {
      whereClause += ' AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get articles with author info
    // ⚠️ LIMIT and OFFSET must be in query string, not as parameters (mysql2 issue)
    const articlesQuery = `
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.featured_image, a.category, 
        a.views, a.is_featured, a.published_at, a.tags,
        u.full_name as author_name, u.username as author_username
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      ${whereClause}
      ORDER BY a.is_featured DESC, a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [articles] = await query(articlesQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM articles a 
      ${whereClause}
    `;
    const [countResult] = await query(countQuery, queryParams.slice(0, -2));
    const total = countResult[0].total;

    // Parse tags JSON (handle both JSON string and already parsed)
    const parsedArticles = articles.map(article => {
      let tags = [];
      if (article.tags) {
        try {
          tags = typeof article.tags === 'string' ? JSON.parse(article.tags) : article.tags;
        } catch (e) {
          console.warn('Failed to parse tags for article:', article.id, e.message);
          tags = [];
        }
      }
      return {
        ...article,
        tags
      };
    });

    return ApiResponse.success(res, {
      articles: parsedArticles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get articles error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to fetch articles: ${error.message}` 
      : 'Failed to fetch articles';
    
    return ApiResponse.error(res, errorMessage, 500);
  }
});

// Get featured articles
router.get('/featured', async (req, res) => {
  try {
    const [articles] = await query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.featured_image, a.category, 
        a.views, a.published_at, a.tags,
        u.full_name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = "published" AND a.is_featured = TRUE
      ORDER BY a.published_at DESC
      LIMIT 6
    `);

    const parsedArticles = articles.map(article => ({
      ...article,
      tags: article.tags ? JSON.parse(article.tags) : []
    }));

    return ApiResponse.success(res, parsedArticles);

  } catch (error) {
    console.error('Get featured articles error:', error);
    return ApiResponse.error(res, 'Failed to fetch featured articles');
  }
});

// Get article by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [articles] = await query(`
      SELECT 
        a.*, u.full_name as author_name, u.username as author_username
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.slug = ? AND a.status = "published"
    `, [slug]);

    if (articles.length === 0) {
      return ApiResponse.notFound(res, 'Article not found');
    }

    const article = articles[0];
    article.tags = article.tags ? JSON.parse(article.tags) : [];

    // Increment view count
    await query('UPDATE articles SET views = views + 1 WHERE id = ?', [article.id]);
    article.views += 1;

    // Get related articles
    const [relatedArticles] = await query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.featured_image, a.category, 
        a.published_at, u.full_name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = "published" 
        AND a.category = ? 
        AND a.id != ?
      ORDER BY a.published_at DESC
      LIMIT 4
    `, [article.category, article.id]);

    return ApiResponse.success(res, {
      article,
      relatedArticles
    });

  } catch (error) {
    console.error('Get article error:', error);
    return ApiResponse.error(res, 'Failed to fetch article');
  }
});

// Get articles by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // ⚠️ LIMIT and OFFSET must be in query string, not as parameters (mysql2 issue)
    const [articles] = await query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.featured_image, a.category, 
        a.views, a.published_at, a.tags,
        u.full_name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.status = "published" AND a.category = ?
      ORDER BY a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [category]);

    const [countResult] = await query(`
      SELECT COUNT(*) as total 
      FROM articles 
      WHERE status = "published" AND category = ?
    `, [category]);

    const total = countResult[0].total;

    const parsedArticles = articles.map(article => ({
      ...article,
      tags: article.tags ? JSON.parse(article.tags) : []
    }));

    return ApiResponse.success(res, {
      articles: parsedArticles,
      category,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get articles by category error:', error);
    return ApiResponse.error(res, 'Failed to fetch articles');
  }
});

module.exports = router;
