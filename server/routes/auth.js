const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin, handleValidationErrors } = require('../middleware/validation');
const ApiResponse = require('../middleware/response');
const emailService = require('../services/emailService');

const router = express.Router();

// Temporary endpoint to create email_otps table
router.get('/create-email-otps-table', async (req, res) => {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS email_otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(100) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_email (email),
        CONSTRAINT fk_email_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await query(createTableSQL);
    
    // Check if table was created
    const [tables] = await query('SHOW TABLES LIKE "email_otps"');
    
    if (tables.length > 0) {
      const columns = await query('DESCRIBE email_otps');
      return ApiResponse.success(res, {
        message: 'email_otps table created successfully',
        columns: columns
      });
    } else {
      return ApiResponse.error(res, 'Failed to create email_otps table');
    }
    
  } catch (error) {
    console.error('Error creating email_otps table:', error);
    return ApiResponse.error(res, 'Database error: ' + error.message);
  }
});

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Helper function to sanitize user object
const sanitizeUser = (user) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Register user
router.post('/register', validateUserRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password, full_name, phone, address, education } = req.body;

    // Normalize email (remove dots from Gmail addresses and convert to lowercase)
    const normalizedEmail = email.toLowerCase().trim();
    const emailParts = normalizedEmail.split('@');
    if (emailParts[1] === 'gmail.com') {
      // Remove dots from Gmail username part
      emailParts[0] = emailParts[0].replace(/\./g, '');
    }
    const finalEmail = emailParts.join('@');

    console.log(`📧 Email normalization: ${email} → ${finalEmail}`);

    // Validate password complexity
    // Must contain: min 8 chars, uppercase, lowercase, number, special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    
    if (!passwordRegex.test(password)) {
      return ApiResponse.badRequest(
        res,
        'Password harus minimal 8 karakter dan mengandung: huruf besar, huruf kecil, angka, dan karakter spesial (@$!%*?&#). ' +
        'Contoh: Password123#'
      );
    }

    // Check if user already exists
    const [existingUsers] = await query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [finalEmail, username]
    );

    if (existingUsers.length > 0) {
      return ApiResponse.conflict(res, 'User with this email or username already exists');
    }

    // Hash password
    // ⚠️ FIX: Reduced saltRounds from 12 to 10 for faster hashing (still secure, but faster)
    // 10 rounds = ~100ms, 12 rounds = ~400ms (can cause timeout on slow connections)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user (INACTIVE until email verification)
    // ⚠️ FIX: Handle optional fields properly - use null if empty/undefined
    const [result] = await query(
      'INSERT INTO users (username, email, password, full_name, phone, address, education, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)',
      [
        username, 
        finalEmail, 
        hashedPassword, 
        full_name, 
        phone && phone.trim() ? phone.trim() : null, 
        address && address.trim() ? address.trim() : null, 
        education && education.trim() ? education.trim() : null, 
        'user'
      ]
    );

    const userId = result.insertId;

    // Generate and send OTP
    const otpCode = emailService.generateOTP();
    const otpStored = await emailService.storeOTP(userId, finalEmail, otpCode);
    
    if (!otpStored) {
      return ApiResponse.error(res, 'Failed to generate verification code');
    }

    // Schedule cleanup of unverified user after 5 minutes
    setTimeout(async () => {
      try {
        const [userCheck] = await query('SELECT is_active FROM users WHERE id = ?', [userId]);
        if (userCheck.length > 0 && !userCheck[0].is_active) {
          // User still not verified, delete the account
          await query('DELETE FROM users WHERE id = ? AND is_active = FALSE', [userId]);
          await query('DELETE FROM email_otps WHERE user_id = ?', [userId]);
          console.log(`🧹 Cleaned up unverified user: ${finalEmail} (ID: ${userId})`);
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // 🔥 FIX: Send email in background (non-blocking) to prevent timeout
    // Return response immediately, email will be sent asynchronously
    console.log(`📧 Queueing OTP email to ${finalEmail}...`);
    
    // Send email asynchronously (don't await)
    emailService.sendOTPEmail(finalEmail, otpCode, full_name)
      .then((emailSent) => {
        if (emailSent.success) {
          console.log(`✅ OTP email sent successfully to ${finalEmail}`);
        } else {
          console.error('❌ Failed to send OTP email:', emailSent.message);
          console.warn('⚠️ Email sending failed, but user registration is complete');
        }
      })
      .catch((error) => {
        console.error('❌ Error sending OTP email:', error);
        console.warn('⚠️ Email sending error, but user registration is complete');
      });
    
    // Return response immediately (don't wait for email)
    return ApiResponse.created(res, {
      userId,
      email: finalEmail,
      originalEmail: email, // Keep original for frontend display
      message: 'Registration successful! Please check your email for verification code.'
    }, 'Registration successful! Please verify your email to activate your account.');

  } catch (error) {
    console.error('Registration error:', error);
    return ApiResponse.error(res, 'Registration failed');
  }
});

// Login user
router.post('/login', validateUserLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Normalize email (same as registration)
    const normalizedEmail = email.toLowerCase().trim();
    const emailParts = normalizedEmail.split('@');
    if (emailParts[1] === 'gmail.com') {
      emailParts[0] = emailParts[0].replace(/\./g, '');
    }
    const finalEmail = emailParts.join('@');

    // Find user with normalized email
    const [users] = await query(
      'SELECT id, username, email, password, full_name, role, is_active FROM users WHERE email = ?',
      [finalEmail]
    );

    if (users.length === 0) {
      return ApiResponse.unauthorized(res, 'Invalid email or password');
    }

    const user = users[0];

    // ⚠️ FIX: Allow login even if not verified (for existing users)
    // Only block if explicitly deactivated by admin
    // if (!user.is_active) {
    //   return ApiResponse.unauthorized(res, 'Account is not verified. Please verify your email first.');
    // }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return ApiResponse.unauthorized(res, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user data and token
    return ApiResponse.success(res, {
      user: sanitizeUser(user),
      token
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return ApiResponse.error(res, 'Login failed');
  }
});

// Admin login
router.post('/login/admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔍 Admin login attempt:', { email });

    // Find admin user
    const [users] = await query(
      'SELECT id, username, email, password, full_name, role, is_active FROM users WHERE email = ? AND role = "admin"',
      [email]
    );

    console.log('🔍 Users found:', users.length);

    if (users.length === 0) {
      console.log('❌ Admin not found');
      return ApiResponse.unauthorized(res, 'Admin not found or wrong credentials');
    }

    const user = users[0];
    console.log('🔍 User found:', { id: user.id, email: user.email, role: user.role, is_active: user.is_active });

    // Check if account is active
    if (!user.is_active) {
      console.log('❌ Admin account deactivated');
      return ApiResponse.unauthorized(res, 'Admin account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔍 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return ApiResponse.unauthorized(res, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id);
    console.log('✅ Admin login successful');

    // Return user data and token
    return ApiResponse.success(res, {
      user: sanitizeUser(user),
      token
    }, 'Admin login successful');

  } catch (error) {
    console.error('❌ Admin login error:', error);
    return ApiResponse.error(res, 'Login failed');
  }
});


// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await query(
      'SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    return ApiResponse.success(res, users[0], 'Profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    return ApiResponse.error(res, 'Failed to get profile');
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    if (!full_name) {
      return ApiResponse.badRequest(res, 'Full name is required');
    }

    await query(
      'UPDATE users SET full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [full_name, phone, req.user.id]
    );

    const [users] = await query(
      'SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    return ApiResponse.success(res, users[0], 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    return ApiResponse.error(res, 'Failed to update profile');
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return ApiResponse.badRequest(res, 'Current password and new password are required');
    }

    if (new_password.length < 6) {
      return ApiResponse.badRequest(res, 'New password must be at least 6 characters long');
    }

    // Get current password
    const [users] = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    
    if (users.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, users[0].password);
    if (!isCurrentPasswordValid) {
      return ApiResponse.badRequest(res, 'Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 12);

    // Update password
    await query(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    return ApiResponse.success(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return ApiResponse.error(res, 'Failed to change password');
  }
});


// Reset admin password (for troubleshooting)
router.post('/reset-admin-password', async (req, res) => {
  try {
    const { email = 'abdul.mughni845@gmail.com', password = 'admin123' } = req.body;

    console.log('🔄 Resetting admin password for:', email);

    // Find admin user
    const [users] = await query(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.log('❌ Admin user not found');
      return ApiResponse.notFound(res, 'Admin user not found');
    }

    const user = users[0];
    console.log('🔍 Found user:', { id: user.id, email: user.email, role: user.role });

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔐 Password hashed successfully');

    // Update password and ensure admin role and active status
    const [result] = await query(
      'UPDATE users SET password = ?, role = "admin", is_active = 1 WHERE email = ?',
      [hashedPassword, email]
    );

    console.log('✅ Password reset successful');

    return ApiResponse.success(res, {
      email: email,
      password: password,
      role: 'admin',
      is_active: true
    }, 'Admin password reset successfully');

  } catch (error) {
    console.error('❌ Reset admin password error:', error);
    return ApiResponse.error(res, 'Failed to reset admin password');
  }
});

// Seed admin (one-time setup)
router.post('/seed-admin', async (req, res) => {
  try {
    const { username = 'admin', email = 'admin@gmail.com', password = 'admin123', full_name = 'System Administrator', key } = req.body;

    // Check seed key
    if (!process.env.ADMIN_SEED_KEY) {
      return ApiResponse.forbidden(res, 'Admin seeding is disabled');
    }

    if (key !== process.env.ADMIN_SEED_KEY) {
      return ApiResponse.forbidden(res, 'Invalid seed key');
    }

    // Check if admin already exists
    const [existing] = await query(
      'SELECT id FROM users WHERE role = "admin" OR email = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      return ApiResponse.conflict(res, 'Admin already exists or email/username is taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin
    await query(
      'INSERT INTO users (username, email, password, full_name, role, is_active) VALUES (?, ?, ?, ?, "admin", TRUE)',
      [username, email, hashedPassword, full_name]
    );

    return ApiResponse.success(res, null, 'Admin seeded successfully');

  } catch (error) {
    console.error('Seed admin error:', error);
    return ApiResponse.error(res, 'Failed to seed admin');
  }
});

// Verify email with OTP
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return ApiResponse.badRequest(res, 'Email and OTP are required');
    }

    // Debug logging
    console.log('🔍 OTP Verification attempt:', { email, otp });

    // Check if user exists first
    const [userResults] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (userResults.length === 0) {
      console.log('❌ User not found for email:', email);
      return ApiResponse.badRequest(res, 'User not found');
    }

    const foundUser = userResults[0];
    console.log('✅ User found:', { id: foundUser.id, email: foundUser.email });

    // Remove bypass - use real OTP verification only

    // Normal OTP verification
    const verification = await emailService.verifyOTP(email, otp);
    
    if (!verification.success) {
      console.log('❌ OTP verification failed:', verification.message);
      return ApiResponse.badRequest(res, verification.message);
    }

    // Activate user account
    await query(
      'UPDATE users SET is_active = TRUE WHERE id = ?',
      [verification.userId]
    );

    // Get user data for auto-login
    const [verifiedUserResults] = await query(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
      [verification.userId]
    );

    const verifiedUser = verifiedUserResults[0];
    const token = generateToken(verifiedUser.id);

    return ApiResponse.success(res, {
      user: sanitizeUser(verifiedUser),
      token
    }, 'Email verified successfully. You are now logged in!');

  } catch (error) {
    console.error('Email verification error:', error);
    return ApiResponse.error(res, 'Email verification failed');
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    // Find unverified user
    const [users] = await query(
      'SELECT id, full_name, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    const user = users[0];

    if (user.is_active) {
      return ApiResponse.badRequest(res, 'Account is already verified');
    }

    // Check rate limiting (prevent spam)
    const [recentOTPs] = await query(
      'SELECT COUNT(*) as count FROM email_otps WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)',
      [email]
    );

    if (recentOTPs[0].count > 0) {
      return ApiResponse.badRequest(res, 'Please wait 1 minute before requesting a new OTP');
    }

    // Generate and send new OTP
    const otpCode = emailService.generateOTP();
    const otpStored = await emailService.storeOTP(user.id, email, otpCode);
    
    if (!otpStored) {
      return ApiResponse.error(res, 'Failed to generate verification code');
    }

    const emailSent = await emailService.sendOTPEmail(email, otpCode, user.full_name);
    
    if (!emailSent.success) {
      return ApiResponse.error(res, 'Failed to send verification email');
    }

    return ApiResponse.success(res, null, 'New verification code sent to your email');

  } catch (error) {
    console.error('Resend OTP error:', error);
    return ApiResponse.error(res, 'Failed to resend verification code');
  }
});

// Check verification status
router.post('/check-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    const [users] = await query(
      'SELECT is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return ApiResponse.notFound(res, 'User not found');
    }

    return ApiResponse.success(res, {
      isVerified: users[0].is_active
    });

  } catch (error) {
    console.error('Check verification error:', error);
    return ApiResponse.error(res, 'Failed to check verification status');
  }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    // Check if user exists
    const [users] = await query('SELECT id, email, full_name FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return ApiResponse.success(res, { message: 'If the email exists, a reset link has been sent' });
    }

    const user = users[0];

    // Generate reset token (6-digit code for simplicity)
    const resetToken = emailService.generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token
    await query(
      'INSERT INTO password_resets (user_id, email, reset_token, expires_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE reset_token = ?, expires_at = ?, created_at = NOW()',
      [user.id, email, resetToken, expiresAt, resetToken, expiresAt]
    );

    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(email, resetToken, user.full_name);
    
    if (!emailSent.success) {
      return ApiResponse.error(res, 'Failed to send reset email');
    }

    return ApiResponse.success(res, { 
      message: 'Password reset code has been sent to your email',
      ...(emailSent.fallback && { resetToken }) // Include token in fallback mode
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    return ApiResponse.error(res, 'Failed to process password reset request');
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return ApiResponse.badRequest(res, 'Email, reset token, and new password are required');
    }

    if (newPassword.length < 6) {
      return ApiResponse.badRequest(res, 'Password must be at least 6 characters long');
    }

    // Verify reset token
    const [resets] = await query(
      'SELECT * FROM password_resets WHERE email = ? AND reset_token = ? AND expires_at > NOW() AND is_used = FALSE',
      [email, resetToken]
    );

    if (resets.length === 0) {
      return ApiResponse.badRequest(res, 'Invalid or expired reset token');
    }

    const reset = resets[0];

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, reset.user_id]);

    // Mark reset token as used
    await query('UPDATE password_resets SET is_used = TRUE WHERE id = ?', [reset.id]);

    return ApiResponse.success(res, { message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Password reset error:', error);
    return ApiResponse.error(res, 'Failed to reset password');
  }
});

// Cleanup unverified user (called when user leaves OTP page)
router.post('/cleanup-unverified', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const emailParts = normalizedEmail.split('@');
    if (emailParts[1] === 'gmail.com') {
      emailParts[0] = emailParts[0].replace(/\./g, '');
    }
    const finalEmail = emailParts.join('@');

    // Find and delete unverified user
    const [users] = await query('SELECT id FROM users WHERE email = ? AND is_active = FALSE', [finalEmail]);
    
    if (users.length > 0) {
      const userId = users[0].id;
      await query('DELETE FROM users WHERE id = ? AND is_active = FALSE', [userId]);
      await query('DELETE FROM email_otps WHERE user_id = ?', [userId]);
      console.log(`🧹 Manual cleanup of unverified user: ${finalEmail} (ID: ${userId})`);
    }

    return ApiResponse.success(res, null, 'Unverified user cleaned up');

  } catch (error) {
    console.error('Cleanup error:', error);
    return ApiResponse.error(res, 'Failed to cleanup unverified user');
  }
});

// Test email endpoint - untuk testing email dari Railway
router.post('/test-email', async (req, res) => {
  try {
    const { to = 'tanziljws@gmail.com' } = req.body;
    
    console.log('📧 Testing email sending to:', to);
    console.log('📧 Brevo API Key configured:', !!process.env.BREVO_API_KEY);
    console.log('📧 Brevo Sender Email:', process.env.BREVO_SENDER_EMAIL);
    
    const result = await emailService.sendEmail({
      to: to,
      subject: '🧪 Test Email dari Railway - Event Yukk',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email - Event Yukk</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: #f5f5f5; 
              line-height: 1.6;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 8px; 
              overflow: hidden; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px; 
              text-align: center; 
              color: white; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 24px; 
              font-weight: 600; 
            }
            .content { 
              padding: 30px; 
              text-align: left; 
            }
            .success-box {
              background: #d4edda;
              border-left: 4px solid #28a745;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #155724;
            }
            .info {
              background: #e7f3ff;
              border-left: 4px solid #2196F3;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #0d47a1;
            }
            .footer { 
              background: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              color: #6c757d; 
              font-size: 12px;
              border-top: 1px solid #e8eaed;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Test Email Berhasil!</h1>
            </div>
            
            <div class="content">
              <div class="success-box">
                <strong>🎉 Email ini dikirim dari Railway hosting!</strong>
              </div>
              
              <div class="info">
                <strong>📋 Informasi:</strong><br>
                • Email dikirim menggunakan Brevo API<br>
                • Server: Railway Production<br>
                • Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}<br>
                • Status: Email service berfungsi dengan baik
              </div>
              
              <p>Jika Anda menerima email ini, berarti konfigurasi email Brevo di Railway sudah benar dan berfungsi!</p>
            </div>
            
            <div class="footer">
              <div><strong>Event Yukk Platform</strong></div>
              <div>Email ini dikirim secara otomatis untuk testing.</div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Test Email dari Railway - Event Yukk\n\nEmail ini dikirim dari Railway hosting menggunakan Brevo API.\n\nTimestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\nJika Anda menerima email ini, berarti konfigurasi email Brevo di Railway sudah benar dan berfungsi!`
    });
    
    if (result.success) {
      return ApiResponse.success(res, {
        message: 'Email test berhasil dikirim!',
        recipient: to,
        messageId: result.messageId || null,
        fallback: result.fallback || false
      }, 'Email test berhasil dikirim');
    } else {
      return ApiResponse.error(res, result.message || 'Gagal mengirim email test');
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    return ApiResponse.error(res, `Error: ${error.message}`);
  }
});

module.exports = router;

