const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { query } = require('../db');
const ApiResponse = require('../middleware/response');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return ApiResponse.badRequest(res, 'Name, email, subject, and message are required');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ApiResponse.badRequest(res, 'Invalid email format');
    }

    const [result] = await query(
      'INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, subject, message]
    );

    // Send email notification to admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'abdul.mughni845@gmail.com';
      
      const mailOptions = {
        from: `"Event Yukk Contact Form" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `🔔 New Contact Form Submission: ${subject}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .info-box { background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px; }
              .label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
              .value { color: #333; }
              .message-box { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border: 1px solid #e5e7eb; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">📬 New Contact Message</h1>
                <p style="margin: 10px 0 0 0;">Event Yukk Contact Form</p>
              </div>
              <div class="content">
                <p>You have received a new message from the Event Yukk contact form:</p>
                
                <div class="info-box">
                  <div class="label">👤 Name:</div>
                  <div class="value">${name}</div>
                </div>
                
                <div class="info-box">
                  <div class="label">📧 Email:</div>
                  <div class="value"><a href="mailto:${email}">${email}</a></div>
                </div>
                
                ${phone ? `
                <div class="info-box">
                  <div class="label">📞 Phone:</div>
                  <div class="value">${phone}</div>
                </div>
                ` : ''}
                
                <div class="info-box">
                  <div class="label">📝 Subject:</div>
                  <div class="value">${subject}</div>
                </div>
                
                <div class="message-box">
                  <div class="label">💬 Message:</div>
                  <div class="value" style="margin-top: 10px; white-space: pre-wrap;">${message}</div>
                </div>
                
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'https://fronten.up.railway.app'}/admin/contacts" class="button">View in Admin Panel</a>
                </div>
                
                <div class="footer">
                  <p>This email was sent from Event Yukk Contact Form</p>
                  <p>Contact ID: #${result.insertId}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Contact notification email sent to admin');
    } catch (emailError) {
      console.error('❌ Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    return ApiResponse.created(res, 
      { contact_id: result.insertId }, 
      'Your message has been sent successfully. We will get back to you soon!'
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return ApiResponse.error(res, 'Failed to send message');
  }
});

// Get all contacts (Admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (status) {
      whereClause = 'WHERE status = ?';
      queryParams.push(status);
    }

    const [contacts] = await query(`
      SELECT 
        c.*, 
        u.full_name as replied_by_name
      FROM contacts c
      LEFT JOIN users u ON c.replied_by = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    const [countResult] = await query(`
      SELECT COUNT(*) as total FROM contacts ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    return ApiResponse.success(res, {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    return ApiResponse.error(res, 'Failed to fetch contacts');
  }
});

// Update contact status (Admin only)
router.patch('/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['new', 'read', 'replied', 'closed'].includes(status)) {
      return ApiResponse.badRequest(res, 'Invalid status');
    }

    const updateData = { status };
    const queryParams = [status];

    if (status === 'replied') {
      updateData.replied_at = new Date();
      updateData.replied_by = userId;
      queryParams.push(new Date(), userId, id);
      
      await query(
        'UPDATE contacts SET status = ?, replied_at = ?, replied_by = ? WHERE id = ?',
        queryParams
      );
    } else {
      queryParams.push(id);
      await query('UPDATE contacts SET status = ? WHERE id = ?', queryParams);
    }

    return ApiResponse.success(res, null, 'Contact status updated successfully');

  } catch (error) {
    console.error('Update contact status error:', error);
    return ApiResponse.error(res, 'Failed to update contact status');
  }
});

// Get contact by ID (Admin only)
router.get('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const [contacts] = await query(`
      SELECT 
        c.*, 
        u.full_name as replied_by_name
      FROM contacts c
      LEFT JOIN users u ON c.replied_by = u.id
      WHERE c.id = ?
    `, [id]);

    if (contacts.length === 0) {
      return ApiResponse.notFound(res, 'Contact not found');
    }

    // Mark as read if it's new
    if (contacts[0].status === 'new') {
      await query('UPDATE contacts SET status = "read" WHERE id = ?', [id]);
      contacts[0].status = 'read';
    }

    return ApiResponse.success(res, contacts[0]);

  } catch (error) {
    console.error('Get contact error:', error);
    return ApiResponse.error(res, 'Failed to fetch contact');
  }
});

// Reply to contact (Admin only)
router.post('/:id/reply', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_message } = req.body;
    const userId = req.user.id;

    if (!reply_message || reply_message.trim().length === 0) {
      return ApiResponse.badRequest(res, 'Reply message is required');
    }

    // Check if contact exists
    const [contacts] = await query('SELECT * FROM contacts WHERE id = ?', [id]);
    if (contacts.length === 0) {
      return ApiResponse.notFound(res, 'Contact not found');
    }

    const contact = contacts[0];

    // Update contact with reply
    await query(
      'UPDATE contacts SET reply_message = ?, status = ?, replied_at = NOW(), replied_by = ? WHERE id = ?',
      [reply_message.trim(), 'replied', userId, id]
    );

    // Send email reply to user
    let emailSent = false;
    let emailError = null;
    
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials not configured, skipping email send');
        emailError = 'SMTP not configured';
      } else {
        const mailOptions = {
          from: `"Event Yukk Support" <${process.env.SMTP_USER}>`,
          to: contact.email,
          replyTo: process.env.SMTP_USER,
          subject: `Re: ${contact.subject}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .message-box { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border: 1px solid #e5e7eb; white-space: pre-wrap; }
                .original-message { background: #f3f4f6; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">📧 Balasan dari Event Yukk</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Tim Support Event Yukk</p>
                </div>
                <div class="content">
                  <p>Halo <strong>${contact.name}</strong>,</p>
                  <p>Terima kasih telah menghubungi kami. Berikut adalah balasan untuk pesan Anda:</p>
                  
                  <div class="message-box">
                    ${reply_message.replace(/\n/g, '<br>')}
                  </div>

                  <div class="original-message">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: bold;">Pesan Asli Anda:</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">${contact.message.replace(/\n/g, '<br>')}</p>
                  </div>

                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'https://fronten.up.railway.app'}/contact" class="btn">Kunjungi Event Yukk</a>
                  </div>

                  <div class="footer">
                    <p>Salam hangat,<br><strong>Tim Event Yukk</strong></p>
                    <p style="margin-top: 20px; font-size: 12px;">Jika Anda memiliki pertanyaan lebih lanjut, silakan balas email ini atau kunjungi halaman contact kami.</p>
                    <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
                      Email ini dikirim sebagai balasan untuk pesan Anda dengan subjek: "${contact.subject}"
                    </p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`✅ Reply email sent successfully to ${contact.email}`);
      }
    } catch (err) {
      emailError = err.message;
      console.error('❌ Failed to send reply email:', err);
      // Don't fail the request if email fails, but log it
    }

    // Return success even if email fails (email is optional, database update is primary)
    return ApiResponse.success(res, {
      email_sent: emailSent,
      email_error: emailError
    }, emailSent 
      ? 'Balasan berhasil dikirim dan email telah terkirim ke user' 
      : 'Balasan berhasil disimpan, namun email gagal terkirim. Silakan cek konfigurasi SMTP.');

  } catch (error) {
    console.error('Reply contact error:', error);
    return ApiResponse.error(res, 'Failed to send reply');
  }
});

module.exports = router;
