const express = require('express');
const midtransClient = require('midtrans-client');
const { query } = require('../db');
const { authenticateToken, requireUser } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

const router = express.Router();

// Initialize Midtrans Snap
// ⚠️ FIX: Check if we're in production or development
const isProduction = process.env.NODE_ENV === 'production' && 
                     process.env.MIDTRANS_SERVER_KEY && 
                     !process.env.MIDTRANS_SERVER_KEY.includes('SB-Mid-server');
const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-your-server-key-here',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-your-client-key-here'
});

console.log('💳 Midtrans initialized:', {
  isProduction,
  hasServerKey: !!process.env.MIDTRANS_SERVER_KEY,
  hasClientKey: !!process.env.MIDTRANS_CLIENT_KEY
});

// Create payment transaction for paid event
router.post('/create-transaction', authenticateToken, requireUser, async (req, res) => {
  try {
    const { event_id, registration_id } = req.body;
    const user_id = req.user.id;

    if (!event_id) {
      return ApiResponse.badRequest(res, 'Event ID is required');
    }

    // Get event details
    const [events] = await query(
      'SELECT * FROM events WHERE id = ? AND is_active = 1',
      [event_id]
    );

    if (events.length === 0) {
      return ApiResponse.notFound(res, 'Event not found or inactive');
    }

    const event = events[0];
    const isFreeEvent = event.is_free === 1 || parseFloat(event.price || 0) === 0;

    if (isFreeEvent) {
      return ApiResponse.badRequest(res, 'This event is free. No payment required.');
    }

    // Check if registration exists
    let registrationId = registration_id;
    if (!registrationId) {
      // Get pending registration
      const [registrations] = await query(
        'SELECT id FROM event_registrations WHERE user_id = ? AND event_id = ? AND status = "pending" ORDER BY created_at DESC LIMIT 1',
        [user_id, event_id]
      );

      if (registrations.length === 0) {
        return ApiResponse.badRequest(res, 'No pending registration found. Please register first.');
      }

      registrationId = registrations[0].id;
    }

    // Get registration details
    const [regDetails] = await query(
      `SELECT er.*, u.full_name, u.email, u.phone 
       FROM event_registrations er
       LEFT JOIN users u ON er.user_id = u.id
       WHERE er.id = ? AND er.user_id = ?`,
      [registrationId, user_id]
    );

    if (regDetails.length === 0) {
      return ApiResponse.notFound(res, 'Registration not found');
    }

    const registration = regDetails[0];

    // Check if payment already exists
    const [existingPayments] = await query(
      'SELECT * FROM payments WHERE registration_id = ? AND status IN ("success", "pending")',
      [registrationId]
    );

    if (existingPayments.length > 0 && existingPayments[0].status === 'success') {
      return ApiResponse.badRequest(res, 'Payment already completed for this registration');
    }

    // Generate unique order ID
    const orderId = `EVENT-${event_id}-${user_id}-${Date.now()}`;
    const amount = parseFloat(event.price || 0);

    // Prepare Midtrans Snap parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: registration.full_name || req.user.full_name || 'Customer',
        last_name: '',
        email: registration.email || req.user.email,
        phone: registration.phone || req.user.phone || '',
        billing_address: {
          first_name: registration.full_name || req.user.full_name || 'Customer',
          last_name: '',
          email: registration.email || req.user.email,
          phone: registration.phone || req.user.phone || '',
          address: registration.address || '',
          city: registration.city || '',
          postal_code: '',
          country_code: 'IDN'
        }
      },
      item_details: [
        {
          id: `EVENT-${event_id}`,
          price: amount,
          quantity: 1,
          name: event.title,
          category: 'Event Registration',
          merchant_name: 'Event Yukk'
        }
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL || 'https://fronten.up.railway.app'}/payment/success`,
        error: `${process.env.FRONTEND_URL || 'https://fronten.up.railway.app'}/payment/error`,
        pending: `${process.env.FRONTEND_URL || 'https://fronten.up.railway.app'}/payment/pending`
      }
    };

    console.log('💳 Creating Midtrans transaction:', orderId);
    console.log('💳 Amount:', amount);
    console.log('💳 Event:', event.title);

    // Create Snap transaction
    const transaction = await snap.createTransaction(parameter);
    const token = transaction.token;
    const redirectUrl = transaction.redirect_url;

    console.log('✅ Midtrans token created:', token);

    // Save payment record
    if (existingPayments.length > 0) {
      // Update existing payment
      await query(
        'UPDATE payments SET order_id = ?, midtrans_token = ?, amount = ?, status = "pending", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [orderId, token, amount, existingPayments[0].id]
      );
    } else {
      // Create new payment record
      await query(
        'INSERT INTO payments (registration_id, order_id, amount, payment_method, status, midtrans_token) VALUES (?, ?, ?, ?, ?, ?)',
        [registrationId, orderId, amount, 'midtrans', 'pending', token]
      );
    }

    return ApiResponse.success(res, {
      token: token,
      redirect_url: redirectUrl,
      order_id: orderId,
      amount: amount,
      client_key: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-your-client-key-here'
    }, 'Payment transaction created successfully');

  } catch (error) {
    console.error('❌ Create payment transaction error:', error);
    return ApiResponse.error(res, error.message || 'Failed to create payment transaction');
  }
});

// Handle Midtrans notification (webhook)
router.post('/notification', async (req, res) => {
  try {
    const notification = req.body;
    
    console.log('📬 Midtrans notification received:', JSON.stringify(notification, null, 2));

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    const paymentType = notification.payment_type;
    const transactionTime = notification.transaction_time;

    if (!orderId) {
      console.error('❌ No order_id in notification');
      return res.status(400).json({ status: 'ERROR', message: 'Missing order_id' });
    }

    // Get payment record
    const [payments] = await query(
      'SELECT p.*, er.user_id, er.event_id FROM payments p LEFT JOIN event_registrations er ON p.registration_id = er.id WHERE p.order_id = ?',
      [orderId]
    );

    if (payments.length === 0) {
      console.error('❌ Payment not found for order_id:', orderId);
      return res.status(404).json({ status: 'ERROR', message: 'Payment not found' });
    }

    const payment = payments[0];
    let paymentStatus = 'pending';

    // Determine payment status based on transaction status
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        paymentStatus = 'challenge';
      } else if (fraudStatus === 'accept') {
        paymentStatus = 'success';
      }
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'success';
    } else if (transactionStatus === 'cancel' || 
               transactionStatus === 'deny' || 
               transactionStatus === 'expire') {
      paymentStatus = 'failed';
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'pending';
    }

    console.log('💳 Payment status update:', {
      orderId,
      oldStatus: payment.status,
      newStatus: paymentStatus,
      transactionStatus,
      paymentType
    });

    // Update payment status
    await query(
      'UPDATE payments SET status = ?, payment_date = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?',
      [paymentStatus, transactionTime || null, orderId]
    );

    // Update registration status based on payment status
    if (paymentStatus === 'success') {
      // Update event_registrations
      await query(
        'UPDATE event_registrations SET status = "confirmed", payment_status = "paid", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [payment.registration_id]
      );

      // Update registrations (legacy table)
      // ⚠️ FIX: registrations table uses 'confirmed' status
      await query(
        'UPDATE registrations SET status = "confirmed", payment_status = "paid", updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?',
        [payment.event_id, payment.user_id]
      );

      // Generate attendance token for paid event
      try {
        const TokenService = require('../services/tokenService');
        const tokenData = await TokenService.createAttendanceToken(
          payment.registration_id,
          payment.user_id,
          payment.event_id
        );

        // Get user email
        const [users] = await query('SELECT email, full_name FROM users WHERE id = ?', [payment.user_id]);
        if (users.length > 0) {
          await TokenService.sendTokenEmail(
            users[0].email,
            users[0].full_name,
            'Event Registration',
            tokenData.token
          );
        }
      } catch (tokenError) {
        console.error('❌ Failed to generate token:', tokenError);
        // Don't fail the payment update
      }

      console.log('✅ Registration confirmed for order:', orderId);
    } else if (paymentStatus === 'failed') {
      // Update registration to cancelled
      await query(
        'UPDATE event_registrations SET status = "cancelled", payment_status = "failed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [payment.registration_id]
      );
      console.log('❌ Registration cancelled for order:', orderId);
    }

    res.status(200).json({ status: 'OK' });

  } catch (error) {
    console.error('❌ Payment notification error:', error);
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// Get payment status
router.get('/status/:orderId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { orderId } = req.params;

    const [payments] = await query(
      `SELECT p.*, er.event_id, er.status as registration_status, e.title as event_title 
       FROM payments p
       LEFT JOIN event_registrations er ON p.registration_id = er.id
       LEFT JOIN events e ON er.event_id = e.id
       WHERE p.order_id = ? AND er.user_id = ?`,
      [orderId, req.user.id]
    );

    if (payments.length === 0) {
      return ApiResponse.notFound(res, 'Payment not found');
    }

    return ApiResponse.success(res, payments[0], 'Payment status retrieved successfully');

  } catch (error) {
    console.error('Get payment status error:', error);
    return ApiResponse.error(res, 'Failed to get payment status');
  }
});

// Get user payment history
router.get('/history', authenticateToken, requireUser, async (req, res) => {
  try {
    const [payments] = await query(
      `SELECT p.*, er.event_id, er.status as registration_status, e.title as event_title, e.event_date
       FROM payments p
       LEFT JOIN event_registrations er ON p.registration_id = er.id
       LEFT JOIN events e ON er.event_id = e.id
       WHERE er.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    return ApiResponse.success(res, payments, 'Payment history retrieved successfully');

  } catch (error) {
    console.error('Get payment history error:', error);
    return ApiResponse.error(res, 'Failed to get payment history');
  }
});

// Verify payment status from Midtrans
router.post('/verify/:orderId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get payment record
    const [payments] = await query(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId]
    );

    if (payments.length === 0) {
      return ApiResponse.notFound(res, 'Payment not found');
    }

    const payment = payments[0];

    // Verify with Midtrans Core API
    const coreApi = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY
    });

    const transaction = await coreApi.transaction.status(orderId);

    // Update payment status based on Midtrans response
    let paymentStatus = 'pending';
    if (transaction.transaction_status === 'settlement' || transaction.transaction_status === 'capture') {
      paymentStatus = 'success';
    } else if (transaction.transaction_status === 'cancel' || transaction.transaction_status === 'deny' || transaction.transaction_status === 'expire') {
      paymentStatus = 'failed';
    } else {
      paymentStatus = 'pending';
    }

    // Update payment in database
    await query(
      'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?',
      [paymentStatus, orderId]
    );

    // Update registration if payment successful
    if (paymentStatus === 'success') {
      await query(
        'UPDATE event_registrations SET status = "confirmed", payment_status = "paid" WHERE id = ?',
        [payment.registration_id]
      );
    }

    return ApiResponse.success(res, {
      order_id: orderId,
      status: paymentStatus,
      transaction: transaction
    }, 'Payment verified successfully');

  } catch (error) {
    console.error('Verify payment error:', error);
    return ApiResponse.error(res, error.message || 'Failed to verify payment');
  }
});

module.exports = router;
