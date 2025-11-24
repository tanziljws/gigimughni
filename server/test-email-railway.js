#!/usr/bin/env node

/**
 * Script untuk test email dari Railway
 * Usage: node test-email-railway.js [email]
 * Example: node test-email-railway.js tanziljws@gmail.com
 */

require('dotenv').config({ path: './config.env' });
const emailService = require('./services/emailService');

async function testEmail() {
  const recipientEmail = process.argv[2] || 'tanziljws@gmail.com';
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Email Service dari Railway');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 Configuration:');
  console.log(`   Recipient  : ${recipientEmail}`);
  console.log(`   API Key    : ${process.env.BREVO_API_KEY ? '***configured***' : 'NOT SET'}`);
  console.log(`   Sender     : ${process.env.BREVO_SENDER_EMAIL || 'NOT SET'}`);
  console.log(`   Sender Name: ${process.env.BREVO_SENDER_NAME || 'NOT SET'}`);
  console.log('');
  
  try {
    console.log('📤 Sending test email...\n');
    
    const result = await emailService.sendEmail({
      to: recipientEmail,
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
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (result.success) {
      console.log('✅ EMAIL TEST BERHASIL!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`📧 Email dikirim ke: ${recipientEmail}`);
      if (result.messageId) {
        console.log(`📝 Message ID: ${result.messageId}`);
      }
      if (result.fallback) {
        console.log('⚠️  Mode: Fallback (email tidak benar-benar dikirim, hanya log)');
      } else {
        console.log('✅ Mode: Real email via Brevo API');
      }
      console.log('\n💡 Silakan cek inbox email Anda (dan folder spam jika perlu).\n');
    } else {
      console.log('❌ EMAIL TEST GAGAL!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`❌ Error: ${result.message || 'Unknown error'}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ EMAIL TEST ERROR!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('');
    process.exit(1);
  }
}

// Run test
testEmail();

