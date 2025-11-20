const express = require('express');
const { query } = require('../db');
const { validateCategory, handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

const router = express.Router();

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const { page, limit, search = '', status = 'all' } = req.query;
    
    let whereClause = '1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (status !== 'all') {
      whereClause += ' AND is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }

    // If pagination parameters are provided, use them; otherwise get all categories
    let categoriesQuery = `SELECT *, 
       (SELECT COUNT(*) FROM events WHERE category_id = categories.id) as event_count
       FROM categories 
       WHERE ${whereClause} 
       ORDER BY name ASC`;
    
    let queryParams = [...params];
    
    if (page && limit) {
      const offset = (page - 1) * limit;
      // ⚠️ FIX: LIMIT and OFFSET must be in query string, not as parameters (mysql2 issue)
      categoriesQuery += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    }

    const [categories] = await query(categoriesQuery, queryParams);

    const [totalResult] = await query(
      `SELECT COUNT(*) as total FROM categories WHERE ${whereClause}`,
      params
    );

    const response = { categories };
    
    // Only include pagination if page/limit were requested
    if (page && limit) {
      response.pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      };
    }

    return ApiResponse.success(res, response, 'Categories retrieved successfully');

  } catch (error) {
    console.error('Get categories error:', error);
    return ApiResponse.error(res, 'Failed to get categories');
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await query(
      `SELECT *, 
       (SELECT COUNT(*) FROM events WHERE category_id = categories.id) as event_count
       FROM categories WHERE id = ?`,
      [id]
    );

    if (categories.length === 0) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    return ApiResponse.success(res, categories[0], 'Category retrieved successfully');

  } catch (error) {
    console.error('Get category error:', error);
    return ApiResponse.error(res, 'Failed to get category');
  }
});

// Create new category (admin only)
router.post('/', authenticateToken, requireAdmin, validateCategory, handleValidationErrors, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;

    const [result] = await query(
      'INSERT INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)',
      [name, description, icon || null, color || '#007bff']
    );

    const [newCategory] = await query(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );

    return ApiResponse.success(res, newCategory[0], 'Category created successfully', 201);

  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return ApiResponse.error(res, 'Category name already exists', 400);
    }
    return ApiResponse.error(res, 'Failed to create category');
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, requireAdmin, validateCategory, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, is_active } = req.body;

    const [existing] = await query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    await query(
      'UPDATE categories SET name = ?, description = ?, icon = ?, color = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, icon, color, is_active !== undefined ? is_active : existing[0].is_active, id]
    );

    const [updatedCategory] = await query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    return ApiResponse.success(res, updatedCategory[0], 'Category updated successfully');

  } catch (error) {
    console.error('Update category error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return ApiResponse.error(res, 'Category name already exists', 400);
    }
    return ApiResponse.error(res, 'Failed to update category');
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    // Check if category has events
    const [events] = await query('SELECT COUNT(*) as count FROM events WHERE category_id = ?', [id]);
    if (events[0].count > 0) {
      return ApiResponse.error(res, 'Cannot delete category with existing events', 400);
    }

    await query('DELETE FROM categories WHERE id = ?', [id]);

    return ApiResponse.success(res, null, 'Category deleted successfully');

  } catch (error) {
    console.error('Delete category error:', error);
    return ApiResponse.error(res, 'Failed to delete category');
  }
});

module.exports = router;
