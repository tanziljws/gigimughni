const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

const router = express.Router();

// Configure multer for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = 'all', status = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (role !== 'all') {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    if (status !== 'all') {
      whereClause += ' AND is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }

    // ⚠️ FIX: LIMIT and OFFSET must be in query string, not as parameters (mysql2 issue)
    const [users] = await query(
      `SELECT id, username, email, full_name, phone, role, avatar, is_active, created_at, updated_at,
       (SELECT COUNT(*) FROM events WHERE organizer_id = users.id) as events_count,
       (SELECT COUNT(*) FROM registrations WHERE user_id = users.id) as registrations_count
       FROM users 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [totalResult] = await query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );

    return ApiResponse.success(res, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    }, 'Users retrieved successfully');

  } catch (error) {
    console.error('Get users error:', error);
    return ApiResponse.error(res, 'Failed to get users');
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await query(
      `SELECT id, username, email, full_name, phone, role, avatar, is_active, created_at, updated_at,
       (SELECT COUNT(*) FROM events WHERE organizer_id = users.id) as events_count,
       (SELECT COUNT(*) FROM registrations WHERE user_id = users.id) as registrations_count
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    return ApiResponse.success(res, users[0], 'User retrieved successfully');

  } catch (error) {
    console.error('Get user error:', error);
    return ApiResponse.error(res, 'Failed to get user');
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role = 'user' } = req.body;

    // Validate required fields
    if (!username || !email || !password || !full_name) {
      return ApiResponse.error(res, 'Username, email, password, and full name are required', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await query(
      'INSERT INTO users (username, email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name, phone || null, role]
    );

    const [newUser] = await query(
      'SELECT id, username, email, full_name, phone, role, avatar, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    return ApiResponse.success(res, newUser[0], 'User created successfully', 201);

  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return ApiResponse.error(res, 'Username or email already exists', 400);
    }
    return ApiResponse.error(res, 'Failed to create user');
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, phone, role, is_active, password } = req.body;

    const [existing] = await query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    let updateFields = [];
    let updateValues = [];

    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (full_name) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    if (role) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updatedUser] = await query(
      'SELECT id, username, email, full_name, phone, role, avatar, is_active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return ApiResponse.success(res, updatedUser[0], 'User updated successfully');

  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return ApiResponse.error(res, 'Username or email already exists', 400);
    }
    return ApiResponse.error(res, 'Failed to update user');
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    // Check if user has events or registrations
    const [events] = await query('SELECT COUNT(*) as count FROM events WHERE organizer_id = ?', [id]);
    const [registrations] = await query('SELECT COUNT(*) as count FROM registrations WHERE user_id = ?', [id]);
    
    if (events[0].count > 0 || registrations[0].count > 0) {
      return ApiResponse.error(res, 'Cannot delete user with existing events or registrations', 400);
    }

    await query('DELETE FROM users WHERE id = ?', [id]);

    return ApiResponse.success(res, null, 'User deleted successfully');

  } catch (error) {
    console.error('Delete user error:', error);
    return ApiResponse.error(res, 'Failed to delete user');
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [stats] = await query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
        SUM(CASE WHEN role = 'organizer' THEN 1 ELSE 0 END) as organizer_count,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_registrations,
        SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_registrations
      FROM users
    `);

    return ApiResponse.success(res, stats[0], 'User statistics retrieved successfully');

  } catch (error) {
    console.error('Get user stats error:', error);
    return ApiResponse.error(res, 'Failed to get user statistics');
  }
});

// Update own profile (authenticated user)
router.put('/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user;
    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }
    
    const { full_name, phone } = req.body;

    // Build update query
    let updateFields = [];
    let params = [];

    if (full_name) {
      updateFields.push('full_name = ?');
      params.push(full_name);
    }

    if (phone) {
      updateFields.push('phone = ?');
      params.push(phone);
    }

    // Handle avatar upload
    if (req.file) {
      const avatarPath = `/uploads/avatars/${req.file.filename}`;
      updateFields.push('avatar = ?');
      params.push(avatarPath);

      // Delete old avatar if exists
      const [oldUser] = await query('SELECT avatar FROM users WHERE id = ?', [userId]);
      if (oldUser[0].avatar) {
        const oldAvatarPath = path.join(__dirname, '..', oldUser[0].avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
    }

    if (updateFields.length === 0) {
      return ApiResponse.error(res, 'No fields to update', 400);
    }

    params.push(userId);
    await query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    // Get updated user
    const [updatedUser] = await query(
      'SELECT id, username, email, full_name, phone, role, avatar, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    return ApiResponse.success(res, { user: updatedUser[0] }, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    return ApiResponse.error(res, 'Failed to update profile');
  }
});

// Request OTP for password change
router.post('/request-password-otp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user;
    const EmailService = require('../services/emailService');
    const emailService = new EmailService();

    // Get user email
    const [users] = await query('SELECT email, full_name FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const user = users[0];
    const otpCode = emailService.generateOTP();

    // Store OTP
    await emailService.storeOTP(userId, user.email, otpCode);

    // Send OTP email
    await emailService.sendPasswordChangeOTP(user.email, user.full_name || user.username, otpCode);

    return ApiResponse.success(res, { 
      message: 'OTP telah dikirim ke email Anda',
      expiresIn: 15 // minutes
    }, 'OTP sent successfully');

  } catch (error) {
    console.error('Request password OTP error:', error);
    return ApiResponse.error(res, 'Failed to send OTP');
  }
});

// Verify OTP and change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user;
    const { otp, new_password, confirm_password } = req.body;

    if (!otp || !new_password || !confirm_password) {
      return ApiResponse.error(res, 'OTP, new password, and confirm password are required', 400);
    }

    if (new_password !== confirm_password) {
      return ApiResponse.error(res, 'New password and confirm password do not match', 400);
    }

    if (new_password.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters', 400);
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(new_password)) {
      return ApiResponse.error(res, 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character', 400);
    }

    // Verify OTP
    const EmailService = require('../services/emailService');
    const emailService = new EmailService();
    const [otps] = await query(
      'SELECT * FROM email_otps WHERE user_id = ? AND otp_code = ? AND expires_at > NOW() AND is_used = FALSE ORDER BY created_at DESC LIMIT 1',
      [userId, otp]
    );

    if (otps.length === 0) {
      return ApiResponse.error(res, 'OTP tidak valid atau sudah kadaluarsa', 400);
    }

    // Mark OTP as used
    await query('UPDATE email_otps SET is_used = TRUE WHERE id = ?', [otps[0].id]);

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password
    await query(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );

    return ApiResponse.success(res, { success: true }, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return ApiResponse.error(res, 'Failed to change password');
  }
});

module.exports = router;
