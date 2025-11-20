const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

const router = express.Router();

// Create blogs upload directory if it doesn't exist
const blogsUploadDir = path.join(__dirname, '../uploads/blogs');
if (!fs.existsSync(blogsUploadDir)) {
  fs.mkdirSync(blogsUploadDir, { recursive: true });
}

// Configure multer for blog image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, blogsUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Get all blogs (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [blogs] = await query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.content, a.featured_image, 
        a.category, a.status, a.is_featured, a.tags, a.views,
        a.created_at, a.updated_at, a.published_at,
        u.full_name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `);

    // Parse tags JSON
    const parsedBlogs = blogs.map(blog => ({
      ...blog,
      tags: blog.tags ? (typeof blog.tags === 'string' ? JSON.parse(blog.tags) : blog.tags) : []
    }));

    return ApiResponse.success(res, { blogs: parsedBlogs });

  } catch (error) {
    console.error('Get blogs error:', error);
    return ApiResponse.error(res, 'Failed to fetch blogs');
  }
});

// Get blog by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [blogs] = await query(`
      SELECT 
        a.*, u.full_name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);

    if (blogs.length === 0) {
      return ApiResponse.notFound(res, 'Blog not found');
    }

    const blog = blogs[0];
    blog.tags = blog.tags ? (typeof blog.tags === 'string' ? JSON.parse(blog.tags) : blog.tags) : [];

    return ApiResponse.success(res, { blog });

  } catch (error) {
    console.error('Get blog error:', error);
    return ApiResponse.error(res, 'Failed to fetch blog');
  }
});

// Create blog (admin only)
router.post('/', authenticateToken, requireAdmin, upload.single('featured_image'), async (req, res) => {
  try {
    const { title, content, excerpt, category, status, tags, is_featured } = req.body;

    if (!title || !content) {
      return ApiResponse.badRequest(res, 'Title and content are required');
    }

    // Featured image is required
    if (!req.file) {
      return ApiResponse.badRequest(res, 'Featured image is required. Please upload a real image file.');
    }

    // Get user ID from token
    const userId = req.user.id;

    // Generate slug
    let slug = generateSlug(title);
    
    // Check if slug exists, if yes, append number
    let slugExists = true;
    let slugCounter = 1;
    let finalSlug = slug;
    
    while (slugExists) {
      const [existing] = await query('SELECT id FROM articles WHERE slug = ?', [finalSlug]);
      if (existing.length === 0) {
        slugExists = false;
      } else {
        finalSlug = `${slug}-${slugCounter}`;
        slugCounter++;
      }
    }

    // Get image path if uploaded
    let featuredImage = null;
    if (req.file) {
      featuredImage = `/uploads/blogs/${req.file.filename}`;
    }

    // Parse tags
    let tagsArray = [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Insert blog
    const [result] = await query(`
      INSERT INTO articles (
        title, slug, excerpt, content, featured_image, category, 
        status, author_id, tags, is_featured, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      finalSlug,
      excerpt || content.substring(0, 200),
      content,
      featuredImage,
      category || 'general',
      status || 'draft',
      userId,
      JSON.stringify(tagsArray),
      is_featured === 'true' || is_featured === true ? 1 : 0,
      status === 'published' ? new Date() : null
    ]);

    // Get created blog
    const [blogs] = await query(`
      SELECT 
        a.*, u.full_name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [result.insertId]);

    const blog = blogs[0];
    blog.tags = tagsArray;

    return ApiResponse.created(res, blog, 'Blog created successfully');

  } catch (error) {
    console.error('Create blog error:', error);
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    return ApiResponse.error(res, error.message || 'Failed to create blog');
  }
});

// Update blog (admin only)
router.put('/:id', authenticateToken, requireAdmin, upload.single('featured_image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, category, status, tags, is_featured } = req.body;

    // Check if blog exists
    const [existing] = await query('SELECT * FROM articles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Blog not found');
    }

    const existingBlog = existing[0];

    // Generate new slug if title changed
    let slug = existingBlog.slug;
    if (title && title !== existingBlog.title) {
      slug = generateSlug(title);
      
      // Check if new slug exists
      let slugExists = true;
      let slugCounter = 1;
      let finalSlug = slug;
      
      while (slugExists) {
        const [existingSlug] = await query('SELECT id FROM articles WHERE slug = ? AND id != ?', [finalSlug, id]);
        if (existingSlug.length === 0) {
          slugExists = false;
        } else {
          finalSlug = `${slug}-${slugCounter}`;
          slugCounter++;
        }
      }
      slug = finalSlug;
    }

    // Handle image upload
    let featuredImage = existingBlog.featured_image;
    if (req.file) {
      // Delete old image if exists
      if (existingBlog.featured_image) {
        const oldImagePath = path.join(__dirname, '..', existingBlog.featured_image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlink(oldImagePath, (err) => {
            if (err) console.error('Error deleting old image:', err);
          });
        }
      }
      featuredImage = `/uploads/blogs/${req.file.filename}`;
    }

    // Parse tags
    let tagsArray = existingBlog.tags ? (typeof existingBlog.tags === 'string' ? JSON.parse(existingBlog.tags) : existingBlog.tags) : [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Update blog
    await query(`
      UPDATE articles SET
        title = ?,
        slug = ?,
        excerpt = ?,
        content = ?,
        featured_image = ?,
        category = ?,
        status = ?,
        tags = ?,
        is_featured = ?,
        published_at = ?
      WHERE id = ?
    `, [
      title || existingBlog.title,
      slug,
      excerpt !== undefined ? excerpt : existingBlog.excerpt,
      content || existingBlog.content,
      featuredImage,
      category || existingBlog.category,
      status || existingBlog.status,
      JSON.stringify(tagsArray),
      is_featured !== undefined ? (is_featured === 'true' || is_featured === true ? 1 : 0) : existingBlog.is_featured,
      status === 'published' && !existingBlog.published_at ? new Date() : existingBlog.published_at,
      id
    ]);

    // Get updated blog
    const [blogs] = await query(`
      SELECT 
        a.*, u.full_name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);

    const blog = blogs[0];
    blog.tags = tagsArray;

    return ApiResponse.success(res, blog, 'Blog updated successfully');

  } catch (error) {
    console.error('Update blog error:', error);
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    return ApiResponse.error(res, error.message || 'Failed to update blog');
  }
});

// Delete blog (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get blog to delete image
    const [blogs] = await query('SELECT featured_image FROM articles WHERE id = ?', [id]);
    if (blogs.length === 0) {
      return ApiResponse.notFound(res, 'Blog not found');
    }

    const blog = blogs[0];

    // Delete blog
    await query('DELETE FROM articles WHERE id = ?', [id]);

    // Delete image file if exists
    if (blog.featured_image) {
      const imagePath = path.join(__dirname, '..', blog.featured_image);
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Error deleting image:', err);
        });
      }
    }

    return ApiResponse.success(res, null, 'Blog deleted successfully');

  } catch (error) {
    console.error('Delete blog error:', error);
    return ApiResponse.error(res, 'Failed to delete blog');
  }
});

module.exports = router;
