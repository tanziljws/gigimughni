const nodemailer = require('nodemailer');
const { query } = require('../db');

class EmailService {
  constructor() {
    // Check if SMTP credentials are configured
    this.isConfigured = process.env.SMTP_USER && process.env.SMTP_PASS && 
                       process.env.SMTP_USER !== 'your-gmail@gmail.com' && 
                       process.env.SMTP_PASS.trim() !== '';
    
    console.log('📧 EmailService Configuration:');
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***configured***' : 'NOT SET'}`);
    console.log(`   Is Configured: ${this.isConfigured}`);
    
    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        debug: false,
        logger: false
      });
      
      // Skip connection test on startup to prevent crashes
      console.log('📧 SMTP transporter created (connection test skipped)');
    } else {
      console.warn('❌ SMTP not configured. Email features will use fallback mode.');
      this.transporter = null;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!to) {
        throw new Error('Recipient email is required');
      }

      if (!this.isConfigured || !this.transporter) {
        console.warn('📨 SMTP not configured. Using fallback logging for email notification.');
        console.log('----- EMAIL (FALLBACK) -----');
        console.log('To      :', to);
        console.log('Subject :', subject);
        if (text) {
          console.log('Text    :', text);
        }
        if (html) {
          console.log('HTML    :', html.substring(0, 500) + (html.length > 500 ? '...' : ''));
        }
        console.log('----------------------------');
        return { success: true, fallback: true };
      }

      // 🔥 FIX: Add timeout to email sending (max 10 seconds)
      const emailPromise = this.transporter.sendMail({
        from: `"Event Yukk" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      // Set timeout for email sending (10 seconds max)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout (10s)')), 10000);
      });

      const info = await Promise.race([emailPromise, timeoutPromise]);

      console.log(`📧 Email sent to ${to} (${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ sendEmail error:', error);
      // Don't throw - return error object instead to prevent blocking
      return { success: false, message: error.message || 'Failed to send email' };
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database with 5-minute expiration
  async storeOTP(userId, email, otpCode) {
    try {
      // Delete any existing OTPs for this user
      await query('DELETE FROM email_otps WHERE user_id = ? OR email = ?', [userId, email]);
      
      // Create expiration time (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Store new OTP
      await query(
        'INSERT INTO email_otps (user_id, email, otp_code, expires_at) VALUES (?, ?, ?, ?)',
        [userId, email, otpCode, expiresAt]
      );
      
      return true;
    } catch (error) {
      console.error('Error storing OTP:', error);
      return false;
    }
  }

  // Verify OTP
  async verifyOTP(email, otpCode) {
    try {
      const [otps] = await query(
        'SELECT * FROM email_otps WHERE email = ? AND otp_code = ? AND is_used = FALSE AND expires_at > NOW()',
        [email, otpCode]
      );

      if (otps.length === 0) {
        return { success: false, message: 'Invalid or expired OTP' };
      }

      const otp = otps[0];

      // Mark OTP as used
      await query('UPDATE email_otps SET is_used = TRUE WHERE id = ?', [otp.id]);

      return { success: true, userId: otp.user_id };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'OTP verification failed' };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, fullName) {
    try {
      // If SMTP is not configured, use fallback mode
      if (!this.isConfigured) {
        console.log(`FALLBACK MODE: Password reset token for ${email}: ${resetToken}`);
        return { 
          success: true, 
          message: 'Reset token sent successfully (fallback mode)',
          fallback: true 
        };
      }

      const mailOptions = {
        from: `"Event Yukk" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset - Event Yukk',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - Event Yukk</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
              .content { padding: 40px 30px; text-align: center; }
              .reset-box { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; margin: 30px 0; display: inline-block; }
              .reset-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
              .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset</h1>
                <p>Event Yukk Security</p>
              </div>
              
              <div class="content">
                <h2>Hello ${fullName}!</h2>
                <p>We received a request to reset your password for your Event Yukk account.</p>
                
                <div class="reset-box">
                  <p>Your password reset code is:</p>
                  <div class="reset-code">${resetToken}</div>
                  <p><small>This code will expire in 15 minutes</small></p>
                </div>
                
                <p>Enter this code on the password reset page to create a new password.</p>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong><br>
                  • If you didn't request this reset, please ignore this email<br>
                  • Never share this code with anyone<br>
                  • This code expires in 15 minutes<br>
                  • Only use this code on the official Event Yukk website
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated message from Event Yukk.<br>
                Please do not reply to this email.</p>
                <p>&copy; 2024 Event Yukk. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'Password reset email sent successfully' };

    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, message: 'Failed to send password reset email' };
    }
  }

  // Send OTP email
  async sendOTPEmail(email, otpCode, fullName) {
    try {
      console.log(`📤 Attempting to send OTP email to ${email} with code: ${otpCode}`);
      
      // Force real email sending - no fallback mode
      if (!this.isConfigured || !this.transporter) {
        console.error('❌ SMTP not properly configured');
        return { 
          success: false, 
          message: 'Email service not configured properly' 
        };
      }
      const mailOptions = {
        from: `"Event Yukk Platform" <${process.env.SMTP_USER}>`,
        to: email, // Dynamic - setiap user beda email
        subject: 'Email Verification OTP',
        text: `Your email verification OTP is: ${otpCode}. Valid for 15 minutes.`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification OTP - Event Yukk</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background-color: #f5f5f5; 
                line-height: 1.6;
              }
              .container { 
                max-width: 500px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 8px; 
                overflow: hidden; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
              }
              .header { 
                background: #1a73e8; 
                padding: 20px; 
                text-align: center; 
                color: white; 
              }
              .header h1 { 
                margin: 0; 
                font-size: 20px; 
                font-weight: 500; 
              }
              .content { 
                padding: 30px 20px; 
                text-align: left; 
              }
              .otp-section {
                text-align: center;
                margin: 25px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 4px solid #1a73e8;
              }
              .otp-label {
                font-size: 14px;
                color: #5f6368;
                margin-bottom: 8px;
              }
              .otp-code { 
                font-size: 32px; 
                font-weight: 600; 
                letter-spacing: 6px; 
                color: #1a73e8;
                font-family: 'Courier New', monospace;
              }
              .validity {
                font-size: 12px;
                color: #5f6368;
                margin-top: 8px;
              }
              .message {
                color: #3c4043;
                font-size: 14px;
                margin: 20px 0;
              }
              .footer { 
                background: #f8f9fa; 
                padding: 15px 20px; 
                text-align: center; 
                color: #5f6368; 
                font-size: 12px;
                border-top: 1px solid #e8eaed;
              }
              .company {
                font-weight: 500;
                color: #1a73e8;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verification OTP</h1>
              </div>
              
              <div class="content">
                <div class="message">
                  Your email verification OTP is: <strong>${otpCode}</strong>. Valid for 15 minutes.
                </div>
                
                <div class="otp-section">
                  <div class="otp-label">Verification Code</div>
                  <div class="otp-code">${otpCode}</div>
                  <div class="validity">Valid for 15 minutes</div>
                </div>
                
                <div class="message">
                  Enter this code on the verification page to complete your registration.
                </div>
              </div>
              
              <div class="footer">
                <div class="company">Event Yukk Platform</div>
                <div>This is an automated message. Please do not reply.</div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password change OTP email
  async sendPasswordChangeOTP(email, fullName, otpCode) {
    try {
      const subject = 'Kode OTP untuk Ganti Password - Event Yukk';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Change OTP - Event Yukk</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: #f5f5f5; 
              line-height: 1.6;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 8px; 
              overflow: hidden; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px; 
              text-align: center; 
              color: white; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 20px; 
              font-weight: 500; 
            }
            .content { 
              padding: 30px 20px; 
              text-align: left; 
            }
            .otp-section {
              text-align: center;
              margin: 25px 0;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 6px;
              border-left: 4px solid #667eea;
            }
            .otp-label {
              font-size: 14px;
              color: #5f6368;
              margin-bottom: 8px;
            }
            .otp-code { 
              font-size: 32px; 
              font-weight: 600; 
              letter-spacing: 6px; 
              color: #667eea;
              font-family: 'Courier New', monospace;
            }
            .validity {
              font-size: 12px;
              color: #5f6368;
              margin-top: 8px;
            }
            .message {
              color: #3c4043;
              font-size: 14px;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 15px 0;
              border-radius: 4px;
              font-size: 13px;
              color: #856404;
            }
            .footer { 
              background: #f8f9fa; 
              padding: 15px 20px; 
              text-align: center; 
              color: #5f6368; 
              font-size: 12px;
              border-top: 1px solid #e8eaed;
            }
            .company {
              font-weight: 500;
              color: #667eea;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Kode OTP Ganti Password</h1>
            </div>
            
            <div class="content">
              <div class="message">
                Halo <strong>${fullName}</strong>,
              </div>
              
              <div class="message">
                Anda telah meminta untuk mengganti password akun Event Yukk Anda. Gunakan kode OTP berikut untuk melanjutkan:
              </div>
              
              <div class="otp-section">
                <div class="otp-label">Kode OTP Anda</div>
                <div class="otp-code">${otpCode}</div>
                <div class="validity">Berlaku selama 15 menit</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Peringatan Keamanan:</strong><br>
                Jika Anda tidak meminta perubahan password ini, abaikan email ini dan pastikan akun Anda aman.
              </div>
              
              <div class="message">
                Masukkan kode OTP di halaman ganti password untuk menyelesaikan proses perubahan password.
              </div>
            </div>
            
            <div class="footer">
              <div class="company">Event Yukk Platform</div>
              <div>Email ini dikirim secara otomatis. Jangan balas email ini.</div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      return await this.sendEmail({
        to: email,
        subject,
        html,
        text: `Kode OTP untuk ganti password Anda adalah: ${otpCode}. Berlaku selama 15 menit.`
      });
    } catch (error) {
      console.error('Error sending password change OTP:', error);
      throw error;
    }
  }

  // Clean up expired OTPs (can be called periodically)
  async cleanupExpiredOTPs() {
    try {
      await query('DELETE FROM email_otps WHERE expires_at < NOW() OR is_used = TRUE');
      console.log('✅ Expired OTPs cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up OTPs:', error);
    }
  }
}

module.exports = new EmailService();
