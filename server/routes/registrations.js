const express = require('express');
const { query } = require('../db');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { validateRegistration, handleValidationErrors } = require('../middleware/validation');
const ApiResponse = require('../middleware/response');
const TokenService = require('../services/tokenService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireUser);

// Check if user is registered for a specific event
router.get('/check/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const [registrations] = await query(
      'SELECT id, status FROM event_registrations WHERE user_id = ? AND event_id = ?',
      [req.user.id, eventId]
    );

    return ApiResponse.success(res, {
      is_registered: registrations.length > 0,
      status: registrations.length > 0 ? registrations[0].status : null,
      registration_id: registrations.length > 0 ? registrations[0].id : null
    }, 'Registration status checked');

  } catch (error) {
    console.error('Check registration error:', error);
    return ApiResponse.error(res, 'Failed to check registration');
  }
});

// Get user's registrations
router.get('/my-registrations', async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE er.user_id = ?';
    let params = [req.user.id];

    if (status) {
      whereClause += ' AND er.status = ?';
      params.push(status);
    }

    // ⚠️ FIX: Use event_registrations as primary source (same as check duplicate)
    // Get total count from event_registrations
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM event_registrations er ${whereClause}`,
      params
    );

    // Get registrations with event info from event_registrations
    // Join with users table to get user details (full_name, email, phone, etc.)
    // ⚠️ FIX: attendance_tokens.registration_id references registrations.id, not event_registrations.id
    // So we need to join through registrations table
    // ⚠️ FIX: Only select columns that exist in event_registrations table
    const [registrations] = await query(
      `SELECT er.id,
              er.user_id,
              er.event_id,
              er.payment_method,
              er.payment_amount,
              er.payment_status,
              er.status,
              er.notes,
              er.created_at,
              er.updated_at,
              e.title as event_title, 
              e.event_date, 
              e.event_time,
              e.location, 
              e.price as registration_fee,
              e.is_free,
              -- Get user info from users table
              u.full_name as full_name,
              u.email as email,
              u.phone as phone,
              u.address as address,
              u.city as city,
              u.province as province,
              u.institution as institution,
              -- Get attendance token (join through registrations table)
              at.token as attendance_token,
              c.name as category_name
       FROM event_registrations er
       LEFT JOIN events e ON er.event_id = e.id
       LEFT JOIN users u ON er.user_id = u.id
       LEFT JOIN categories c ON e.category_id = c.id
       LEFT JOIN registrations r ON r.user_id = er.user_id AND r.event_id = er.event_id
       LEFT JOIN attendance_tokens at ON at.registration_id = r.id AND at.user_id = er.user_id AND at.event_id = er.event_id
       ${whereClause}
       ORDER BY er.created_at DESC 
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const result = {
      registrations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit)
      }
    };

    return ApiResponse.success(res, result, 'Registrations retrieved successfully');

  } catch (error) {
    console.error('❌ Get registrations error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ SQL State:', error.sqlState);
    console.error('❌ Error code:', error.code);
    return ApiResponse.error(res, `Failed to get registrations: ${error.message}`);
  }
});

// Register for an event
router.post('/', validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    console.log('🚀 Registration request:', req.body);
    console.log('👤 User:', req.user);

    const {
      event_id,
      event_date, // ⚠️ Allow event_date from request body (frontend can send it)
      payment_method = 'cash',
      full_name,
      email,
      phone,
      address,
      city,
      province,
      institution,
      notes
    } = req.body;

    // Check if event exists and is active
    const [events] = await query(
      'SELECT * FROM events WHERE id = ? AND is_active = 1',
      [event_id]
    );

    if (events.length === 0) {
      console.log('❌ Event not found:', event_id);
      return ApiResponse.notFound(res, 'Event not found or inactive');
    }

    const event = events[0];
    console.log('✅ Event found:', event.title);

    // Check if event registration is still open (event hasn't started yet)
    const now = new Date();
    
    // Safely parse event date and time
    // ⚠️ Use event_date from request body if provided, otherwise use from database
    let eventDateTime;
    try {
      // Prefer event_date from request body, fallback to database
      const eventDateSource = event_date || event.event_date;
      
      // Handle different date formats
      let eventDateStr = null;
      if (eventDateSource) {
        if (eventDateSource instanceof Date) {
          eventDateStr = eventDateSource.toISOString().split('T')[0];
        } else if (typeof eventDateSource === 'string') {
          eventDateStr = eventDateSource.split('T')[0];
        } else {
          eventDateStr = String(eventDateSource).split('T')[0];
        }
      }
      
      // Validate date string format (YYYY-MM-DD)
      if (!eventDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(eventDateStr)) {
        return ApiResponse.badRequest(res, 'Event date is required and must be in YYYY-MM-DD format');
      }
      
      // Parse time safely
      let eventTimeStr = '00:00:00';
      if (event.event_time) {
        eventTimeStr = String(event.event_time);
      }
      
      // Parse date components
      const [year, month, day] = eventDateStr.split('-').map(Number);
      
      // Parse time components (HH:MM:SS or HH:MM)
      const timeParts = eventTimeStr.split(':');
      const hours = parseInt(timeParts[0] || 0, 10);
      const minutes = parseInt(timeParts[1] || 0, 10);
      const seconds = parseInt(timeParts[2] || 0, 10);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || 
          isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        throw new Error('Invalid date or time components');
      }
      
      // Validate month and day ranges
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        throw new Error('Invalid month or day value');
      }
      
      // Create date object
      eventDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Validate the date is valid
      if (isNaN(eventDateTime.getTime())) {
        throw new Error('Invalid date object created');
      }
    } catch (dateError) {
      console.error('❌ Error parsing event date/time:', dateError);
      console.error('   Event data:', {
        event_date: event.event_date,
        event_time: event.event_time,
        event_date_from_body: event_date
      });
      return ApiResponse.badRequest(res, `Invalid event date or time format: ${dateError.message}`);
    }
    
    // ⚠️ FIX: Validate eventDateTime before using toISOString()
    if (isNaN(eventDateTime.getTime())) {
      console.error('❌ Invalid eventDateTime:', eventDateTime);
      return ApiResponse.badRequest(res, 'Invalid event date or time format');
    }
    
    console.log('🕐 Current time:', now.toISOString());
    console.log('🕐 Event time:', eventDateTime.toISOString());
    console.log('🕐 Event date:', event.event_date);
    console.log('🕐 Event time:', event.event_time);
    
    // Add some buffer time (1 hour) before closing registration
    const registrationCloseTime = new Date(eventDateTime.getTime() - (60 * 60 * 1000)); // 1 hour before event
    
    if (now >= registrationCloseTime) {
      console.log('❌ Registration closed - too close to event time');
      return ApiResponse.badRequest(res, 'Pendaftaran sudah ditutup. Event akan dimulai kurang dari 1 jam lagi');
    }

    // Check if user already registered
    const [existingRegistrations] = await query(
      'SELECT id FROM event_registrations WHERE user_id = ? AND event_id = ?',
      [req.user.id, event_id]
    );

    if (existingRegistrations.length > 0) {
      console.log('❌ User already registered');
      return ApiResponse.conflict(res, 'You have already registered for this event');
    }

    // Check if event is full
    // ⚠️ FIX: Check both 'confirmed' and 'approved' status (event_registrations uses 'approved')
    if (event.max_participants) {
      const [approvedRegistrations] = await query(
        'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ? AND (status = "confirmed" OR status = "approved")',
        [event_id]
      );

      if (approvedRegistrations[0].count >= event.max_participants) {
        console.log('❌ Event is full');
        return ApiResponse.conflict(res, 'Event is full');
      }
    }

    console.log('✅ Creating registration...');
    const registrantName = (full_name || req.user.full_name || '').trim();
    const registrantEmail = (email || req.user.email || '').trim();
    const registrantPhone = (phone || req.user.phone || '').trim();
    const registrantAddress = (address || req.user.address || '').trim();
    const registrantCity = (city || req.user.city || '').trim();
    const registrantProvince = (province || req.user.province || '').trim();
    const registrantInstitution = (institution || req.user.institution || '').trim();
    
    const isFreeEvent = event.is_free === 1 || parseFloat(event.price || 0) === 0;
    
    // Validate required fields for free events
    if (isFreeEvent) {
      if (!registrantName || registrantName.length < 2) {
        return ApiResponse.badRequest(res, 'Nama lengkap wajib diisi (minimal 2 karakter)');
      }
      if (!registrantEmail || !registrantEmail.includes('@')) {
        return ApiResponse.badRequest(res, 'Email wajib diisi dan harus valid');
      }
    }

    // ⚠️ FIX: event_registrations status enum is ('pending','approved','cancelled','attended')
    // Use 'approved' instead of 'confirmed' for free events
    const registrationStatus = isFreeEvent ? 'approved' : 'pending';
    const paymentStatus = isFreeEvent ? 'paid' : 'pending';
    const paymentAmount = parseFloat(event.price || 0);
    
    // ⚠️ FIX: Validate and truncate payment_method to max 50 characters (VARCHAR(50) limit)
    // Allowed values: 'cash', 'midtrans', 'bank_transfer', 'credit_card', 'debit_card', etc.
    let validPaymentMethod = 'cash'; // Default for free events
    if (payment_method) {
      const paymentMethodStr = String(payment_method).trim().toLowerCase();
      // Truncate to 50 characters max
      validPaymentMethod = paymentMethodStr.substring(0, 50);
      
      // For free events, always use 'cash'
      if (isFreeEvent) {
        validPaymentMethod = 'cash';
      }
    } else if (!isFreeEvent) {
      // For paid events, default to 'midtrans' if not specified
      validPaymentMethod = 'midtrans';
    }
    
    console.log('💳 Payment method:', validPaymentMethod, '(original:', payment_method, ')');

    // Calculate attendance deadline (end of event day + 1 hour buffer)
    let attendanceDeadline;
    try {
      // Get event end date (prefer end_date, fallback to event_date)
      let eventEndDateSource = event.end_date || event.event_date;
      
      // Handle different date formats (Date object, string, or null)
      let eventEndDateStr = null;
      if (eventEndDateSource) {
        if (eventEndDateSource instanceof Date) {
          eventEndDateStr = eventEndDateSource.toISOString().split('T')[0];
        } else if (typeof eventEndDateSource === 'string') {
          eventEndDateStr = eventEndDateSource.split('T')[0];
        } else {
          eventEndDateStr = String(eventEndDateSource).split('T')[0];
        }
      }
      
      // Get event end time (prefer end_time, fallback to event_time or default)
      let eventEndTimeStr = '23:59:59';
      if (event.end_time) {
        eventEndTimeStr = String(event.end_time);
      } else if (event.event_time) {
        eventEndTimeStr = String(event.event_time);
      }
      
      // Validate date string format (YYYY-MM-DD)
      if (!eventEndDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(eventEndDateStr)) {
        throw new Error('Invalid event date format');
      }
      
      // Parse date components
      const [year, month, day] = eventEndDateStr.split('-').map(Number);
      
      // Parse time components (HH:MM:SS or HH:MM)
      const timeParts = eventEndTimeStr.split(':');
      const hours = parseInt(timeParts[0] || 23, 10);
      const minutes = parseInt(timeParts[1] || 59, 10);
      const seconds = parseInt(timeParts[2] || 59, 10);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || 
          isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        throw new Error('Invalid date or time components');
      }
      
      // Create date object
      attendanceDeadline = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Validate the date is valid
      if (isNaN(attendanceDeadline.getTime())) {
        throw new Error('Invalid date object created');
      }
      
      // Add 1 hour after event ends
      attendanceDeadline.setHours(attendanceDeadline.getHours() + 1);
      
      // Validate again after modification
      if (isNaN(attendanceDeadline.getTime())) {
        throw new Error('Invalid attendance deadline after modification');
      }
      
      console.log('✅ Attendance deadline calculated:', attendanceDeadline.toISOString());
    } catch (dateError) {
      console.error('❌ Error calculating attendance deadline:', dateError);
      console.error('   Event data:', {
        event_date: event.event_date,
        end_date: event.end_date,
        event_time: event.event_time,
        end_time: event.end_time
      });
      
      // Fallback: use event date + 1 day
      try {
        const eventDateStr = event.event_date ? 
          (event.event_date instanceof Date ? event.event_date.toISOString().split('T')[0] : 
           String(event.event_date).split('T')[0]) : null;
        
        if (eventDateStr && /^\d{4}-\d{2}-\d{2}$/.test(eventDateStr)) {
          const [year, month, day] = eventDateStr.split('-').map(Number);
          attendanceDeadline = new Date(year, month - 1, day + 1, 23, 59, 59);
        } else {
          attendanceDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        attendanceDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
      }
      
      console.warn('⚠️ Using fallback attendance deadline:', attendanceDeadline.toISOString());
    }
    
    // Format attendanceDeadline for MySQL (YYYY-MM-DD HH:mm:ss)
    // ⚠️ FIX: Validate before calling toISOString()
    if (isNaN(attendanceDeadline.getTime())) {
      console.error('❌ Attendance deadline is still invalid, using default');
      attendanceDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    const attendanceDeadlineFormatted = attendanceDeadline.toISOString().slice(0, 19).replace('T', ' ');
    console.log('📅 Attendance deadline:', attendanceDeadlineFormatted);

    // ⚠️ IMPORTANT: Insert order matters!
    // 1. Insert to registrations table FIRST (attendance_tokens references registrations.id)
    // 2. Then insert to event_registrations table
    // 3. Then create token using primaryRegistrationId

    // Save to primary registrations table (analytics & user profile)
    // ⚠️ IMPORTANT: This must succeed because attendance_tokens references registrations.id
    let primaryRegistrationId = null;
    try {
      const [primaryInsert] = await query(
        `INSERT INTO registrations 
         (user_id, event_id, full_name, phone, email, address, city, province, institution, payment_method, status, payment_status, payment_amount, attendance_required, attendance_status, attendance_deadline, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'pending', ?, ?)`,
        [
          req.user.id,
          event_id,
          registrantName,
          registrantPhone,
          registrantEmail,
          registrantAddress,
          registrantCity,
          registrantProvince,
          registrantInstitution,
          validPaymentMethod,
          registrationStatus,
          paymentStatus,
          paymentAmount,
          attendanceDeadlineFormatted,
          notes || ''
        ]
      );
      primaryRegistrationId = primaryInsert.insertId;
      console.log('✅ Registration record stored:', primaryRegistrationId);
    } catch (primaryError) {
      console.error('❌ Failed to insert into registrations table:', primaryError);
      // ⚠️ FIX: Don't continue if registrations insert fails - attendance_tokens needs this ID
      // Throw error to prevent foreign key constraint violation
      throw new Error(`Failed to create registration record: ${primaryError.message}`);
    }

    // Create event registration (main reference for attendance & admin screens)
    // ⚠️ FIX: event_registrations table doesn't have full_name, email, phone, etc.
    // Use only columns that exist in the table
    let eventInsert;
    let eventRegistrationId;
    
    try {
      // Insert with only fields that exist in event_registrations table
      // Based on DESCRIBE: id, user_id, event_id, payment_method, payment_amount, status, registration_fee, payment_status, payment_date, notes, created_at, updated_at
      [eventInsert] = await query(
        `INSERT INTO event_registrations
         (user_id, event_id, payment_method, payment_amount, payment_status, status, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          event_id,
          validPaymentMethod,
          paymentAmount,
          paymentStatus,
          registrationStatus, // 'approved' for free events, 'pending' for paid
          notes || ''
        ]
      );
      eventRegistrationId = eventInsert.insertId;
      console.log('✅ Event registration created:', eventRegistrationId);
    } catch (insertError) {
      console.error('❌ Failed to create event registration:', insertError);
      // ⚠️ FIX: If event_registrations insert fails, rollback registrations insert
      if (primaryRegistrationId) {
        try {
          await query('DELETE FROM registrations WHERE id = ?', [primaryRegistrationId]);
          console.log('🔄 Rolled back registrations insert');
        } catch (rollbackError) {
          console.error('❌ Failed to rollback registrations:', rollbackError);
        }
      }
      throw insertError;
    }

    let tokenData = null;

    // ⚠️ FIX: Check both 'confirmed' and 'approved' status (free events use 'approved')
    if (registrationStatus === 'confirmed' || registrationStatus === 'approved') {
      // Generate attendance token
      // ⚠️ IMPORTANT: Use primaryRegistrationId (from registrations table) not eventRegistrationId
      // because attendance_tokens.registration_id references registrations.id
      if (!primaryRegistrationId) {
        console.error('❌ Cannot create token: primaryRegistrationId is null');
        throw new Error('Registration ID is required for token generation');
      }
      
      console.log('🔑 Generating token with registration_id:', primaryRegistrationId);
      tokenData = await TokenService.createAttendanceToken(
        primaryRegistrationId, // Use registrations.id, not event_registrations.id
        req.user.id,
        event_id
      );

      console.log('✅ Token generated:', tokenData.token);

      // Send token via email
      try {
        console.log('📧 Sending token email...');
        await TokenService.sendTokenEmail(
          registrantEmail || req.user.email,
          registrantName || req.user.full_name,
          event.title,
          tokenData.token
        );
        console.log('✅ Token email sent');
      } catch (emailError) {
        console.error('❌ Failed to send token email:', emailError);
        // Don't fail registration if email fails
      }
    } else {
      console.log('ℹ️ Registration pending payment - token will be generated after confirmation');
    }

    // Get created registration
    const [registrations] = await query(
      `SELECT r.*, e.title as event_title, e.event_date, e.location, e.price as registration_fee
       FROM event_registrations r
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [eventRegistrationId]
    );

    console.log('✅ Registration completed successfully');
    return ApiResponse.created(res, {
      ...registrations[0],
      token: tokenData?.token || null,
      tokenExpiresAt: tokenData?.expiresAt || null
    }, (registrationStatus === 'confirmed' || registrationStatus === 'approved')
      ? 'Registration created successfully. Attendance token has been sent to your email.'
      : 'Registration created successfully. Silakan selesaikan pembayaran untuk menerima token kehadiran.'
    );

  } catch (error) {
    console.error('❌ Create registration error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ SQL State:', error.sqlState);
    
    // Provide more specific error message
    let errorMessage = 'Failed to create registration';
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Database schema error. Please run migrations.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return ApiResponse.error(res, errorMessage);
  }
});

// Cancel registration
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if registration exists and belongs to user
    const [registrations] = await query(
      'SELECT * FROM registrations WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (registrations.length === 0) {
      return ApiResponse.notFound(res, 'Registration not found');
    }

    const registration = registrations[0];

    // Check if registration can be cancelled
    if (registration.status === 'cancelled') {
      return ApiResponse.badRequest(res, 'Registration is already cancelled');
    }

    if (registration.status === 'confirmed') {
      return ApiResponse.badRequest(res, 'Cannot cancel confirmed registration');
    }

    // Cancel registration
    await query(
      'UPDATE registrations SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    return ApiResponse.success(res, null, 'Registration cancelled successfully');

  } catch (error) {
    console.error('Cancel registration error:', error);
    return ApiResponse.error(res, 'Failed to cancel registration');
  }
});

// Get registration by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [registrations] = await query(
      `SELECT er.*, e.title as event_title, e.event_date, e.location, e.price as registration_fee,
              c.name as category_name
       FROM registrations er
       LEFT JOIN events e ON er.event_id = e.id
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE er.id = ? AND er.user_id = ?`,
      [id, req.user.id]
    );

    if (registrations.length === 0) {
      return ApiResponse.notFound(res, 'Registration not found');
    }

    return ApiResponse.success(res, registrations[0], 'Registration retrieved successfully');

  } catch (error) {
    console.error('Get registration error:', error);
    return ApiResponse.error(res, 'Failed to get registration');
  }
});

// Test token generation
router.post('/test-token', async (req, res) => {
  try {
    console.log('🧪 Testing token generation...');
    
    // Generate test token
    const tokenData = await TokenService.createAttendanceToken(
      999, // fake registration ID
      req.user.id,
      req.body.event_id || 1
    );

    console.log('✅ Test token generated:', tokenData.token);

    return ApiResponse.success(res, {
      token: tokenData.token,
      expiresAt: tokenData.expiresAt
    }, 'Test token generated successfully');

  } catch (error) {
    console.error('❌ Test token error:', error);
    return ApiResponse.error(res, 'Failed to generate test token');
  }
});

module.exports = router;

