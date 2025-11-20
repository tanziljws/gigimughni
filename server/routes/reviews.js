const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireUser } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

// Helper middleware for admin only
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return ApiResponse.forbidden(res, 'Admin access required');
  }
};

// Get all approved reviews (public)
router.get('/', async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const limitNum = parseInt(limit) || 50;
    const pageNum = parseInt(page) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    
    const [reviews] = await query(
      `SELECT r.*, u.username 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.is_approved = TRUE 
       ORDER BY r.created_at DESC 
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      []
    );

    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM reviews WHERE is_approved = TRUE'
    );

    return ApiResponse.success(res, {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit)
      }
    }, 'Reviews retrieved successfully');
  } catch (error) {
    console.error('Get reviews error:', error);
    return ApiResponse.error(res, 'Failed to get reviews');
  }
});

// Create review (authenticated users)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { rating, comment, full_name } = req.body;
    const user_id = req.user.id;

    // Validate
    if (!rating || !comment || !full_name) {
      return ApiResponse.badRequest(res, 'Rating, comment, and full name are required');
    }

    if (rating < 1 || rating > 5) {
      return ApiResponse.badRequest(res, 'Rating must be between 1 and 5');
    }

    if (comment.length < 10) {
      return ApiResponse.badRequest(res, 'Comment must be at least 10 characters');
    }

    // Check if user already has a review
    const [existing] = await query(
      'SELECT id FROM reviews WHERE user_id = ?',
      [user_id]
    );

    if (existing.length > 0) {
      return ApiResponse.badRequest(res, 'You have already submitted a review. You can edit your existing review.');
    }

    // Insert review
    const [result] = await query(
      `INSERT INTO reviews (user_id, full_name, rating, comment, is_approved, is_verified) 
       VALUES (?, ?, ?, ?, FALSE, FALSE)`,
      [user_id, full_name, rating, comment]
    );

    // Get created review
    const [reviews] = await query(
      `SELECT r.*, u.username 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.id = ?`,
      [result.insertId]
    );

    return ApiResponse.created(res, reviews[0], 'Review submitted successfully. It will be visible after admin approval.');
  } catch (error) {
    console.error('Create review error:', error);
    return ApiResponse.error(res, 'Failed to create review');
  }
});

// Update review (authenticated users - own review only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, full_name } = req.body;
    const user_id = req.user.id;

    // Check if review exists and belongs to user
    const [existing] = await query(
      'SELECT id FROM reviews WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Review not found or you do not have permission to edit it');
    }

    // Update review (reset approval status)
    await query(
      `UPDATE reviews 
       SET rating = ?, comment = ?, full_name = ?, is_approved = FALSE, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [rating, comment, full_name, id]
    );

    // Get updated review
    const [reviews] = await query(
      `SELECT r.*, u.username 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.id = ?`,
      [id]
    );

    return ApiResponse.success(res, reviews[0], 'Review updated successfully. It will be reviewed by admin again.');
  } catch (error) {
    console.error('Update review error:', error);
    return ApiResponse.error(res, 'Failed to update review');
  }
});

// Delete review (authenticated users - own review only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if review exists and belongs to user
    const [existing] = await query(
      'SELECT id FROM reviews WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Review not found or you do not have permission to delete it');
    }

    await query('DELETE FROM reviews WHERE id = ?', [id]);

    return ApiResponse.success(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('Delete review error:', error);
    return ApiResponse.error(res, 'Failed to delete review');
  }
});

// ===== ADMIN ROUTES =====

// Get all reviews (admin)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, page = 1, status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    if (status === 'pending') {
      whereClause = 'r.is_approved = FALSE';
    } else if (status === 'approved') {
      whereClause = 'r.is_approved = TRUE';
    }

    const limitNum = parseInt(limit) || 50;
    const pageNum = parseInt(page) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    
    const [reviews] = await query(
      `SELECT r.*, u.username, u.email 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE ${whereClause}
       ORDER BY r.created_at DESC 
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      []
    );

    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM reviews r WHERE ${whereClause}`
    );

    return ApiResponse.success(res, {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limitNum)
      }
    }, 'Reviews retrieved successfully');
  } catch (error) {
    console.error('Get all reviews error:', error);
    return ApiResponse.error(res, 'Failed to get reviews');
  }
});

// Approve/reject review (admin)
router.put('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved, admin_notes } = req.body;

    // Check if review exists
    const [existing] = await query('SELECT id FROM reviews WHERE id = ?', [id]);
    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Review not found');
    }

    await query(
      'UPDATE reviews SET is_approved = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [is_approved, admin_notes || null, id]
    );

    const [reviews] = await query(
      `SELECT r.*, u.username, u.email 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.id = ?`,
      [id]
    );

    return ApiResponse.success(res, reviews[0], `Review ${is_approved ? 'approved' : 'rejected'} successfully`);
  } catch (error) {
    console.error('Update review status error:', error);
    return ApiResponse.error(res, 'Failed to update review status');
  }
});

// Delete review (admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await query('SELECT id FROM reviews WHERE id = ?', [id]);
    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Review not found');
    }

    await query('DELETE FROM reviews WHERE id = ?', [id]);

    return ApiResponse.success(res, null, 'Review deleted successfully');
  } catch (error) {
    console.error('Delete review error:', error);
    return ApiResponse.error(res, 'Failed to delete review');
  }
});

module.exports = router;
