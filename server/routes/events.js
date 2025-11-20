const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { validateEvent, handleValidationErrors } = require('../middleware/validation');
const ApiResponse = require('../middleware/response');

const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/events');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
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
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all events (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category_id = '', upcoming = '', sort_by = 'date_asc', status = '' } = req.query;
    
    // Ensure limit and page are valid integers
    const limitNum = parseInt(limit) || 10;
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    // Filter: only active events that are NOT archived
    let whereClause = "WHERE e.is_active = 1 AND e.status != 'archived'";
    let params = [];

    if (search) {
      whereClause += ' AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category_id) {
      whereClause += ' AND e.category_id = ?';
      params.push(parseInt(category_id));
    }

    if (status && status.trim() !== '') {
      whereClause += ' AND e.status = ?';
      params.push(status);
    }

    if (upcoming === 'true') {
      whereClause += ' AND e.event_date > NOW()';
    }

    // Determine sort order
    let orderClause = 'ORDER BY e.event_date ASC'; // Default: nearest first
    switch (sort_by) {
      case 'date_desc':
        orderClause = 'ORDER BY e.event_date DESC';
        break;
      case 'title_asc':
        orderClause = 'ORDER BY e.title ASC';
        break;
      case 'title_desc':
        orderClause = 'ORDER BY e.title DESC';
        break;
      case 'price_asc':
        orderClause = 'ORDER BY e.price ASC';
        break;
      case 'price_desc':
        orderClause = 'ORDER BY e.price DESC';
        break;
      case 'date_asc':
      default:
        orderClause = 'ORDER BY e.event_date ASC';
        break;
    }

    // Get total count
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM events e ${whereClause}`,
      params
    );

    // Get events with category info and registration count
    // Use direct values for LIMIT and OFFSET (not parameters) to avoid MySQL2 issues
    const [events] = await query(
      `SELECT e.*, c.name as category_name, e.image as image_url,
              (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'confirmed') as approved_registrations,
              CASE 
                WHEN e.event_date < NOW() THEN 'past'
                WHEN e.event_date > NOW() THEN 'upcoming'
                ELSE 'ongoing'
              END as event_status
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       ${whereClause}
       ${orderClause}
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    const result = {
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limitNum)
      }
    };

    return ApiResponse.success(res, result, 'Events retrieved successfully');

  } catch (error) {
    console.error('Get events error:', error);
    return ApiResponse.error(res, 'Failed to get events');
  }
});

// Get event by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if admin is requesting (for edit purposes)
    const isAdmin = req.user && req.user.role === 'admin';

    const [events] = await query(
      `SELECT e.*, c.name as category_name, e.image as image_url,
              (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'confirmed') as approved_registrations
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.id = ? ${!isAdmin ? 'AND e.is_active = 1 AND e.status != \'archived\'' : ''}`,
      [id]
    );

    if (events.length === 0) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    return ApiResponse.success(res, events[0], 'Event retrieved successfully');

  } catch (error) {
    console.error('Get event error:', error);
    return ApiResponse.error(res, 'Failed to get event');
  }
});

// Create event (admin only)
router.post('/', authenticateToken, requireUser, upload.single('image'), async (req, res) => {
  try {
    const { title, description, short_description, event_date, event_time, end_date, end_time, location, address, city, province, category_id, max_participants, price, is_free, has_certificate, status, image_aspect_ratio } = req.body;

    // Validate required fields
    if (!title || !description || !event_date || !event_time || !location || !category_id) {
      return ApiResponse.badRequest(res, 'Missing required fields');
    }

    // Validate event date is not in the past
    const eventDate = new Date(event_date);
    const now = new Date();
    
    if (eventDate < now) {
      return ApiResponse.badRequest(res, 'Event date cannot be in the past');
    }

    // Validate H-3 rule: Admin can only create events minimum 3 days in advance
    const minAdvanceDays = 3;
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + minAdvanceDays);
    minDate.setHours(0, 0, 0, 0); // Set to start of day
    
    const eventDateOnly = new Date(event_date);
    eventDateOnly.setHours(0, 0, 0, 0);
    
    if (eventDateOnly < minDate) {
      return ApiResponse.badRequest(
        res, 
        `Event hanya dapat dibuat minimal ${minAdvanceDays} hari sebelum tanggal event (H-${minAdvanceDays}). ` +
        `Tanggal event paling awal yang bisa dibuat: ${minDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      );
    }

    // Check if category exists
    const [categories] = await query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (categories.length === 0) {
      return ApiResponse.badRequest(res, 'Category not found');
    }

    // Get image path if uploaded
    const imagePath = req.file ? `/uploads/events/${req.file.filename}` : null;

    // Create event - convert undefined to null for SQL compatibility
    const [result] = await query(
      `INSERT INTO events (title, description, short_description, event_date, event_time, end_date, end_time, location, address, city, province, category_id, organizer_id, max_participants, price, is_free, has_certificate, image, image_aspect_ratio, banner, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, 
        description, 
        short_description || description.substring(0, 200), 
        event_date, 
        event_time, 
        end_date || event_date, 
        end_time || event_time, 
        location, 
        address ?? location,  // Use nullish coalescing to handle undefined
        city ?? 'Jakarta', 
        province ?? 'DKI Jakarta', 
        category_id, 
        req.user.id, 
        max_participants || 50, 
        price || 0, 
        is_free === 'true' || is_free === true || price == 0, 
        has_certificate === 'true' || has_certificate === true, 
        imagePath, 
        image_aspect_ratio || '16:9', 
        null, 
        status || 'published'
      ]
    );

    // Get created event
    const [events] = await query(
      `SELECT e.*, c.name as category_name 
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.id = ?`,
      [result.insertId]
    );

    return ApiResponse.created(res, events[0], 'Event created successfully');

  } catch (error) {
    console.error('Create event error:', error);
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    return ApiResponse.error(res, error.message || 'Failed to create event');
  }
});

// Update event (admin only) - SIMPLIFIED VERSION
router.put('/:id', authenticateToken, requireUser, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('=== UPDATE EVENT START ===');
    console.log('Event ID:', id);
    console.log('Request Body:', req.body);
    console.log('File uploaded:', req.file ? req.file.filename : 'No file');

    // Check if event exists
    const [existingEvents] = await query('SELECT * FROM events WHERE id = ?', [id]);
    if (existingEvents.length === 0) {
      console.log('ERROR: Event not found');
      return ApiResponse.notFound(res, 'Event not found');
    }

    const existingEvent = existingEvents[0];
    console.log('Existing event found:', existingEvent.title);

    // Extract and validate only what's provided
    const title = req.body.title || existingEvent.title;
    const description = req.body.description || existingEvent.description;
    const category_id = req.body.category_id || existingEvent.category_id;
    const event_date = req.body.event_date || existingEvent.event_date;
    const event_time = req.body.event_time || existingEvent.event_time;
    const location = req.body.location || existingEvent.location;

    console.log('Validated required fields:', { title, description, category_id, event_date, event_time, location });

    // Validate H-3 rule if event_date is being changed
    if (req.body.event_date && req.body.event_date !== existingEvent.event_date) {
      const minAdvanceDays = 3;
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + minAdvanceDays);
      minDate.setHours(0, 0, 0, 0);
      
      const newEventDate = new Date(event_date);
      newEventDate.setHours(0, 0, 0, 0);
      
      if (newEventDate < minDate) {
        return ApiResponse.badRequest(
          res,
          `Event hanya dapat dijadwalkan minimal ${minAdvanceDays} hari dari sekarang (H-${minAdvanceDays}). ` +
          `Tanggal event paling awal: ${minDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
        );
      }
    }

    const parseBooleanField = (value, fallback) => {
      if (value === undefined || value === null) {
        return fallback;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return 1;
        if (['false', '0', 'no', 'off'].includes(normalized)) return 0;
      }

      if (typeof value === 'number') {
        return value ? 1 : 0;
      }

      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }

      return fallback;
    };

    // Get new image path if uploaded, otherwise keep existing
    const imagePath = req.file 
      ? `/uploads/events/${req.file.filename}` 
      : existingEvent.image;

    const parsedMaxParticipants = parseInt(
      req.body.max_participants !== undefined ? req.body.max_participants : existingEvent.max_participants || 50,
      10
    );
    const parsedPrice = parseFloat(
      req.body.price !== undefined ? req.body.price : existingEvent.price || 0
    );

    const updateData = {
      title,
      description,
      short_description: req.body.short_description || existingEvent.short_description || description.substring(0, 200),
      event_date,
      event_time,
      end_date: req.body.end_date || event_date,
      end_time: req.body.end_time || event_time,
      location,
      address: req.body.address || existingEvent.address || location,
      city: req.body.city || existingEvent.city || 'Jakarta',
      province: req.body.province || existingEvent.province || 'DKI Jakarta',
      category_id: parseInt(category_id, 10),
      max_participants: Number.isNaN(parsedMaxParticipants) ? existingEvent.max_participants || 50 : parsedMaxParticipants,
      price: Number.isNaN(parsedPrice) ? existingEvent.price || 0 : parsedPrice,
      is_free: parseBooleanField(req.body.is_free, existingEvent.is_free),
      image: imagePath,
      image_aspect_ratio: req.body.image_aspect_ratio || existingEvent.image_aspect_ratio || '16:9',
      // IMPORTANT: Keep existing status if not explicitly provided
      status: req.body.status || existingEvent.status || 'published',
      // IMPORTANT: Keep existing is_active if not explicitly provided (prevent auto-deactivation!)
      is_active: parseBooleanField(req.body.is_active, existingEvent.is_active)
    };

    console.log('Final update data:', updateData);

    // Simple update query
    try {
      const updateQuery = `
        UPDATE events 
        SET 
          title = ?, 
          description = ?, 
          short_description = ?, 
          event_date = ?, 
          event_time = ?, 
          end_date = ?, 
          end_time = ?, 
          location = ?, 
          address = ?, 
          city = ?, 
          province = ?, 
          category_id = ?, 
          max_participants = ?, 
          price = ?, 
          is_free = ?, 
          image = ?, 
          image_aspect_ratio = ?, 
          status = ?, 
          is_active = ?, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`;
      
      const updateParams = [
        updateData.title,
        updateData.description,
        updateData.short_description,
        updateData.event_date,
        updateData.event_time,
        updateData.end_date,
        updateData.end_time,
        updateData.location,
        updateData.address,
        updateData.city,
        updateData.province,
        updateData.category_id,
        updateData.max_participants,
        updateData.price,
        updateData.is_free,
        updateData.image,
        updateData.image_aspect_ratio,
        updateData.status,
        updateData.is_active,
        parseInt(id)
      ];
      
      console.log('Executing update with params:', updateParams);
      const [result] = await query(updateQuery, updateParams);
      console.log('✅ Update successful! Rows affected:', result.affectedRows);
      
      if (result.affectedRows === 0) {
        throw new Error('No rows were affected by the update');
      }
    } catch (queryError) {
      console.error('❌ Database query error:', {
        message: queryError.message,
        code: queryError.code,
        sqlMessage: queryError.sqlMessage
      });
      return ApiResponse.error(res, `Database error: ${queryError.sqlMessage || queryError.message}`);
    }

    // Get updated event
    const [events] = await query(
      `SELECT e.*, c.name as category_name 
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.id = ?`,
      [id]
    );

    console.log('=== UPDATE EVENT SUCCESS ===');
    return ApiResponse.success(res, events[0], 'Event berhasil diupdate!');

  } catch (error) {
    console.error('❌ Update event error:', {
      message: error.message,
      stack: error.stack
    });
    
    // Detailed error message
    let errorMsg = 'Gagal update event';
    if (error.message.includes('Duplicate')) {
      errorMsg = 'Data duplikat ditemukan';
    } else if (error.message.includes('foreign key')) {
      errorMsg = 'Category tidak valid';
    } else if (error.message) {
      errorMsg = error.message;
    }
    
    return ApiResponse.error(res, errorMsg);
  }
});

// Delete event (admin only)
router.delete('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const [existingEvents] = await query('SELECT id FROM events WHERE id = ?', [id]);
    if (existingEvents.length === 0) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Check if there are registrations
    const [registrations] = await query('SELECT id FROM registrations WHERE event_id = ?', [id]);
    if (registrations.length > 0) {
      return ApiResponse.conflict(res, 'Cannot delete event with existing registrations');
    }

    // Delete event
    await query('DELETE FROM events WHERE id = ?', [id]);

    return ApiResponse.success(res, null, 'Event deleted successfully');

  } catch (error) {
    console.error('Delete event error:', error);
    return ApiResponse.error(res, 'Failed to delete event');
  }
});

// Get upcoming events
router.get('/upcoming/events', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const [events] = await query(
      `SELECT e.*, c.name as category_name,
              (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'confirmed') as approved_registrations
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.is_active = 1 AND e.event_date > NOW()
       ORDER BY e.event_date ASC 
       LIMIT ?`,
      [parseInt(limit)]
    );

    return ApiResponse.success(res, events, 'Upcoming events retrieved successfully');

  } catch (error) {
    console.error('Get upcoming events error:', error);
    return ApiResponse.error(res, 'Failed to get upcoming events');
  }
});

// Get events by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if category exists
    const [categories] = await query('SELECT id, name FROM categories WHERE id = ?', [categoryId]);
    if (categories.length === 0) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    // Get total count
    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM events WHERE category_id = ? AND is_active = 1',
      [categoryId]
    );

    // Get events
    const [events] = await query(
      `SELECT e.*, c.name as category_name,
              (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'confirmed') as approved_registrations
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.category_id = ? AND e.is_active = 1
       ORDER BY e.event_date ASC 
       LIMIT ? OFFSET ?`,
      [categoryId, parseInt(limit), offset]
    );

    const result = {
      category: categories[0],
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit)
      }
    };

    return ApiResponse.success(res, result, 'Events by category retrieved successfully');

  } catch (error) {
    console.error('Get events by category error:', error);
    return ApiResponse.error(res, 'Failed to get events by category');
  }
});

// Search events
router.get('/search/events', async (req, res) => {
  try {
    const { q = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!q.trim()) {
      return ApiResponse.badRequest(res, 'Search query is required');
    }

    // Get total count
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM events e 
       WHERE e.is_active = 1 AND 
             (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );

    // Get events
    const [events] = await query(
      `SELECT e.*, c.name as category_name,
              (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'confirmed') as approved_registrations
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.is_active = 1 AND 
             (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)
       ORDER BY e.event_date ASC 
       LIMIT ? OFFSET ?`,
      [`%${q}%`, `%${q}%`, `%${q}%`, parseInt(limit), offset]
    );

    const result = {
      query: q,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit)
      }
    };

    return ApiResponse.success(res, result, 'Search results retrieved successfully');

  } catch (error) {
    console.error('Search events error:', error);
    return ApiResponse.error(res, 'Failed to search events');
  }
});

// Cleanup ended events (can be triggered manually or runs automatically)
router.post('/cleanup-ended', authenticateToken, async (req, res) => {
  try {
    const result = await deleteEndedEvents();
    return ApiResponse.success(res, result, `Successfully deleted ${result.deletedCount} ended event(s)`);
  } catch (error) {
    console.error('Cleanup ended events error:', error);
    return ApiResponse.error(res, 'Failed to cleanup ended events');
  }
});

// Get highlighted event for homepage hero section (public)
router.get('/highlighted/event', async (req, res) => {
  try {
    const [events] = await query(
      `SELECT e.*, c.name as category_name, e.image as image_url,
              (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'confirmed') as approved_registrations
       FROM events e 
       LEFT JOIN categories c ON e.category_id = c.id 
       WHERE e.is_highlighted = 1 
         AND e.is_active = 1 
         AND e.status = 'published'
         AND e.event_date >= CURDATE()
       ORDER BY e.event_date ASC
       LIMIT 1`
    );

    if (events.length === 0) {
      // If no highlighted event, return the nearest upcoming event
      const [fallbackEvents] = await query(
        `SELECT e.*, c.name as category_name, e.image as image_url,
                (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'confirmed') as approved_registrations
         FROM events e 
         LEFT JOIN categories c ON e.category_id = c.id 
         WHERE e.is_active = 1 
           AND e.status = 'published'
           AND e.event_date >= CURDATE()
         ORDER BY e.event_date ASC
         LIMIT 1`
      );
      
      return ApiResponse.success(res, fallbackEvents[0] || null, 'No highlighted event, showing nearest upcoming event');
    }

    return ApiResponse.success(res, events[0], 'Highlighted event retrieved successfully');

  } catch (error) {
    console.error('Get highlighted event error:', error);
    return ApiResponse.error(res, 'Failed to get highlighted event');
  }
});

// Set event as highlighted (admin only) - only one event can be highlighted at a time
router.put('/:id/highlight', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_highlighted } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'Only admins can set highlighted events');
    }

    // If setting as highlighted, remove highlight from all other events first
    if (is_highlighted) {
      await query('UPDATE events SET is_highlighted = 0');
    }

    // Update the event
    await query(
      'UPDATE events SET is_highlighted = ?, updated_at = NOW() WHERE id = ?',
      [is_highlighted ? 1 : 0, id]
    );

    return ApiResponse.success(res, null, `Event ${is_highlighted ? 'highlighted' : 'unhighlighted'} successfully`);

  } catch (error) {
    console.error('Set highlighted event error:', error);
    return ApiResponse.error(res, 'Failed to set highlighted event');
  }
});

module.exports = router;
