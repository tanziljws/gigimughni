const { query } = require('../db');
const TokenService = require('../services/tokenService');

/**
 * Mark registrations as failed if user didn't attend (after attendance deadline)
 */
const markAbsentRegistrations = async () => {
  try {
    console.log('⏰ Checking for absent registrations...');
    
    // First, check if columns exist in registrations table
    const [columns] = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'registrations' 
      AND COLUMN_NAME IN ('attendance_required', 'attendance_status', 'attendance_deadline')
    `);
    
    const hasAttendanceColumns = columns.length === 3;
    
    if (!hasAttendanceColumns) {
      console.log('⚠️ Attendance columns not found in registrations table. Checking event_registrations table...');
      
      // Check if event_registrations has attendance columns
      const [erColumns] = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'event_registrations' 
        AND COLUMN_NAME IN ('attendance_required', 'attendance_status', 'attendance_deadline')
      `);
      
      const hasERAttendanceColumns = erColumns.length >= 2; // at least attendance_required and attendance_status
      const hasDeadline = erColumns.some(col => col.COLUMN_NAME === 'attendance_deadline');
      
      if (!hasERAttendanceColumns) {
        console.log('✅ No attendance columns found. Skipping absent registration check.');
        return { marked: 0 };
      }
      
      // Use event_registrations table - build query based on available columns
      const now = new Date();
      let querySQL = `
        SELECT er.id, er.user_id, er.event_id, e.title as event_title
        FROM event_registrations er
        INNER JOIN events e ON er.event_id = e.id
        WHERE er.attendance_required = TRUE
          AND er.attendance_status = 'pending'
          AND er.status != 'cancelled'
      `;
      
      // Only add deadline check if column exists
      if (hasDeadline) {
        querySQL += ` AND er.attendance_deadline IS NOT NULL AND er.attendance_deadline < ?`;
      } else {
        // If no deadline column, use event end date as fallback
        querySQL += ` AND CONCAT(COALESCE(e.end_date, e.event_date), ' ', COALESCE(e.end_time, '23:59:59')) < ?`;
      }
      
      const [absentRegistrations] = await query(querySQL, [now]);
      
      if (absentRegistrations.length === 0) {
        console.log('✅ No absent registrations to mark');
        return { marked: 0 };
      }
      
      console.log(`⚠️ Found ${absentRegistrations.length} registrations that missed attendance deadline`);
      
      let markedCount = 0;
      for (const reg of absentRegistrations) {
        try {
          // Mark as absent/failed in event_registrations
          await query(`
            UPDATE event_registrations 
            SET 
              attendance_status = 'absent',
              status = 'failed',
              updated_at = NOW()
            WHERE id = ?
          `, [reg.id]);
          
          // Try to update registrations table if columns exist
          try {
            await query(`
              UPDATE registrations 
              SET 
                attendance_status = 'absent',
                status = 'failed',
                updated_at = NOW()
              WHERE user_id = ? AND event_id = ?
            `, [reg.user_id, reg.event_id]);
          } catch (err) {
            // Ignore if registrations table doesn't have columns
          }
          
          markedCount++;
          console.log(`   ✗ Marked as absent: Event "${reg.event_title}" (Registration ID: ${reg.id})`);
        } catch (err) {
          console.error(`   ✗ Failed to mark registration ${reg.id} as absent:`, err.message);
        }
      }
      
      console.log(`✅ Marked ${markedCount} registrations as absent/failed`);
      return { marked: markedCount };
    }
    
    // If columns exist, use the original query
    const now = new Date();
    
    // Check if deadline column exists
    const hasDeadline = columns.some(col => col.COLUMN_NAME === 'attendance_deadline');
    
    // Build query based on available columns
    let querySQL = `
      SELECT r.id, r.user_id, r.event_id, e.title as event_title
      FROM registrations r
      INNER JOIN events e ON r.event_id = e.id
      WHERE r.attendance_required = TRUE
        AND r.attendance_status = 'pending'
        AND r.status != 'cancelled'
    `;
    
    if (hasDeadline) {
      querySQL += ` AND r.attendance_deadline IS NOT NULL AND r.attendance_deadline < ?`;
    } else {
      // Use event end date as fallback
      querySQL += ` AND CONCAT(COALESCE(e.end_date, e.event_date), ' ', COALESCE(e.end_time, '23:59:59')) < ?`;
    }
    
    const [absentRegistrations] = await query(querySQL, [now]);

    if (absentRegistrations.length === 0) {
      console.log('✅ No absent registrations to mark');
      return { marked: 0 };
    }

    console.log(`⚠️ Found ${absentRegistrations.length} registrations that missed attendance deadline`);

    let markedCount = 0;
    for (const reg of absentRegistrations) {
      try {
        // Mark as absent/failed
        await query(`
          UPDATE registrations 
          SET 
            attendance_status = 'absent',
            status = 'failed',
            updated_at = NOW()
          WHERE id = ?
        `, [reg.id]);

        // Also update event_registrations
        await query(`
          UPDATE event_registrations 
          SET 
            attendance_status = 'absent',
            status = 'failed',
            updated_at = NOW()
          WHERE user_id = ? AND event_id = ?
        `, [reg.user_id, reg.event_id]);

        markedCount++;
        console.log(`   ✗ Marked as absent: Event "${reg.event_title}" (Registration ID: ${reg.id})`);
      } catch (err) {
        console.error(`   ✗ Failed to mark registration ${reg.id} as absent:`, err.message);
      }
    }

    console.log(`✅ Marked ${markedCount} registrations as absent/failed`);
    return { marked: markedCount };

  } catch (error) {
    console.error('❌ Error in markAbsentRegistrations:', error);
    throw error;
  }
};

/**
 * Soft delete events that have ended more than 1 month ago
 * - Mark event as archived (is_active = FALSE)
 * - Keep certificates intact
 * - Keep registration history intact
 * - Event won't show in public listings but data preserved
 * - Users can still access certificates and history
 */
const archiveEndedEvents = async () => {
  try {
    console.log('🧹 Starting automatic event archival...');
    
    // First, mark absent registrations
    await markAbsentRegistrations();
    
    // Get current date/time
    const now = new Date();
    
    // Calculate date 1 month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Find events that ended more than 1 month ago
    // CRITICAL: Only select events with valid ID (not NULL)
    const [endedEvents] = await query(`
      SELECT 
        id, 
        title, 
        event_date,
        end_date,
        end_time
      FROM events 
      WHERE is_active = TRUE 
        AND status = 'published'
        AND id IS NOT NULL
        AND CONCAT(COALESCE(end_date, event_date), ' ', COALESCE(end_time, '23:59:59')) < ?
    `, [oneMonthAgo]);

    if (!endedEvents || endedEvents.length === 0) {
      console.log('✅ No ended events to archive');
      return { archived: 0, events: [] };
    }

    console.log(`📦 Found ${endedEvents.length} ended events to archive`);

    // Archive each event (soft delete)
    const archivedEvents = [];
    for (const event of endedEvents) {
      // CRITICAL: Validate event data before processing
      if (!event || !event.id) {
        console.error(`   ✗ Skipping invalid event (missing ID):`, event);
        continue;
      }

      // Additional validation: ensure id is a valid number
      if (isNaN(event.id) || event.id <= 0) {
        console.error(`   ✗ Skipping invalid event (invalid ID: ${event.id}):`, event);
        continue;
      }

      try {
        // Update event status to completed (archived via is_active = FALSE)
        // Note: Using 'completed' instead of 'archived' because ENUM doesn't include 'archived'
        await query(`
          UPDATE events 
          SET 
            is_active = FALSE,
            status = 'completed',
            updated_at = NOW()
          WHERE id = ?
        `, [event.id]);

        archivedEvents.push({
          id: event.id,
          title: event.title || 'Untitled Event',
          event_date: event.event_date
        });

        console.log(`   ✓ Archived: ${event.title || 'Untitled Event'} (ID: ${event.id})`);
      } catch (err) {
        console.error(`   ✗ Failed to archive event ${event.id || 'undefined'}:`, err.message);
        // Continue processing other events instead of crashing
      }
    }

    console.log(`✅ Successfully archived ${archivedEvents.length} events`);
    console.log('📋 Certificates and registration history preserved');

    return {
      archived: archivedEvents.length,
      events: archivedEvents
    };

  } catch (error) {
    console.error('❌ Error in archiveEndedEvents:', error);
    // Don't throw error - return empty result to prevent server crash
    // Log error but allow server to continue running
    return { archived: 0, events: [] };
  }
};

/**
 * Get user's event history (including archived events)
 * Shows all events user has participated in
 * User can still access certificates even for archived events
 */
const getUserEventHistory = async (userId) => {
  try {
    console.log('📋 Getting event history for user:', userId);
    
    // ⚠️ FIX: Use event_registrations as primary source (same as other endpoints)
    // Join with events and certificates to get complete event history
    // ⚠️ FIX: Simplify query - only select columns that definitely exist
    // Use subquery for certificates to avoid column name conflicts
    const history = await query(`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        e.end_date,
        e.location,
        e.status,
        e.is_active,
        COALESCE(e.has_certificate, 0) as has_certificate,
        er.id as registration_id,
        er.created_at as registration_date,
        er.status as registration_status,
        er.payment_status,
        er.payment_amount,
        (SELECT id FROM certificates WHERE user_id = er.user_id AND event_id = e.id LIMIT 1) as certificate_id,
        (SELECT certificate_number FROM certificates WHERE user_id = er.user_id AND event_id = e.id LIMIT 1) as certificate_code,
        (SELECT issued_at FROM certificates WHERE user_id = er.user_id AND event_id = e.id LIMIT 1) as certificate_issued_at,
        -- ⚠️ FIX: Get attendance token using LEFT JOIN for better performance and reliability
        at.token as attendance_token,
        r.id as primary_registration_id
      FROM event_registrations er
      INNER JOIN events e ON er.event_id = e.id
      LEFT JOIN registrations r ON r.user_id = er.user_id AND r.event_id = er.event_id
      LEFT JOIN attendance_tokens at ON at.registration_id = r.id AND at.user_id = er.user_id AND at.event_id = er.event_id
      WHERE er.user_id = ?
      ORDER BY e.event_date DESC, er.created_at DESC
    `, [userId]);

    console.log('✅ Event history retrieved:', history.length, 'events');
    
    // ⚠️ FIX: Check if tokens actually exist in database for each registration
    // First, verify if token exists in database even if query didn't return it
    for (const event of history) {
      // Check if token exists in database directly
      if (event.primary_registration_id && !event.attendance_token) {
        try {
          const [existingTokens] = await query(
            `SELECT token FROM attendance_tokens 
             WHERE registration_id = ? AND user_id = ? AND event_id = ? 
             ORDER BY created_at DESC LIMIT 1`,
            [event.primary_registration_id, userId, event.id]
          );
          
          if (existingTokens && existingTokens.length > 0) {
            event.attendance_token = existingTokens[0].token;
            console.log(`✅ Found existing token in database for event ${event.id}: ${existingTokens[0].token}`);
          } else {
            console.log(`⚠️ No token found in database for event ${event.id}, registration ${event.primary_registration_id}`);
          }
        } catch (tokenCheckError) {
          console.error(`❌ Error checking token in database:`, tokenCheckError);
        }
      }
      
      console.log(`🔍 Checking event ${event.id}:`, {
        registration_status: event.registration_status,
        payment_status: event.payment_status,
        has_token: !!event.attendance_token,
        primary_registration_id: event.primary_registration_id
      });
      
      // Generate token if:
      // 1. Status is approved/confirmed AND
      // 2. Payment is paid (or event is free) AND
      // 3. Token is missing AND
      // 4. We have primary_registration_id
      const paymentAmount = parseFloat(event.payment_amount) || 0;
      const isPaid = event.payment_status === 'paid' || paymentAmount === 0;
      const isApproved = event.registration_status === 'approved' || event.registration_status === 'confirmed';
      const shouldHaveToken = isApproved 
                              && isPaid
                              && !event.attendance_token 
                              && event.primary_registration_id;
      
      console.log(`🔍 Token check for event ${event.id}:`, {
        isApproved,
        isPaid,
        payment_status: event.payment_status,
        payment_amount: event.payment_amount,
        parsed_amount: paymentAmount,
        has_token: !!event.attendance_token,
        has_registration_id: !!event.primary_registration_id,
        shouldHaveToken
      });
      
      if (shouldHaveToken) {
        console.log(`⚠️ Missing token for event ${event.id} (status: ${event.registration_status}, payment: ${event.payment_status}), registration ${event.primary_registration_id}. Generating...`);
        try {
          const tokenData = await TokenService.createAttendanceToken(
            event.primary_registration_id,
            userId,
            event.id
          );
          event.attendance_token = tokenData.token;
          console.log(`✅ Token generated retroactively: ${tokenData.token}`);
          
          // Also send email notification
          try {
            const [userData] = await query('SELECT email, full_name FROM users WHERE id = ?', [userId]);
            if (userData && userData.length > 0) {
              await TokenService.sendTokenEmail(
                userData[0].email,
                userData[0].full_name,
                event.title,
                tokenData.token
              );
              console.log(`✅ Token email sent to ${userData[0].email}`);
            }
          } catch (emailError) {
            console.error('❌ Failed to send token email:', emailError);
            // Don't fail if email fails
          }
        } catch (tokenError) {
          console.error(`❌ Failed to generate token retroactively:`, tokenError);
          console.error('   Error details:', tokenError.message, tokenError.stack);
        }
      } else if (!event.attendance_token) {
        console.log(`ℹ️ Event ${event.id} doesn't need token yet:`, {
          status: event.registration_status,
          payment: event.payment_status,
          has_registration_id: !!event.primary_registration_id
        });
      }
    }
    
    return history;
  } catch (error) {
    console.error('❌ Error getting user event history:', error);
    console.error('   Error message:', error.message);
    console.error('   SQL State:', error.sqlState);
    console.error('   Error code:', error.code);
    if (error.stack) {
      console.error('   Error stack:', error.stack.substring(0, 500));
    }
    throw error;
  }
};

/**
 * Get archived events (for admin view)
 */
const getArchivedEvents = async () => {
  try {
    const archived = await query(`
      SELECT 
        e.*,
        COUNT(DISTINCT r.id) as total_participants,
        COUNT(DISTINCT c.id) as total_certificates,
        c2.name as category_name
      FROM events e
      LEFT JOIN event_registrations r ON e.id = r.event_id
      LEFT JOIN certificates c ON c.event_id = e.id
      LEFT JOIN categories c2 ON e.category_id = c2.id
      WHERE e.status = 'completed' OR e.is_active = FALSE
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `);

    return archived;
  } catch (error) {
    console.error('Error getting archived events:', error);
    throw error;
  }
};

/**
 * Restore archived event (make it active again)
 */
const restoreArchivedEvent = async (eventId) => {
  try {
    await query(`
      UPDATE events 
      SET 
        is_active = TRUE,
        status = 'published',
        updated_at = NOW()
      WHERE id = ?
    `, [eventId]);

    console.log(`✅ Restored event ID: ${eventId}`);
    return true;
  } catch (error) {
    console.error('Error restoring event:', error);
    throw error;
  }
};

/**
 * Permanently delete event (hard delete)
 * WARNING: This will delete certificates and history too!
 * Only use this for spam/test events, not real events!
 */
const permanentlyDeleteEvent = async (eventId) => {
  try {
    // Delete in order due to foreign key constraints
    await query('DELETE FROM certificates WHERE event_id = ?', [eventId]);
    await query('DELETE FROM attendance_tokens WHERE event_id = ?', [eventId]);
    await query('DELETE FROM event_registrations WHERE event_id = ?', [eventId]);
    await query('DELETE FROM performers WHERE event_id = ?', [eventId]);
    await query('DELETE FROM events WHERE id = ?', [eventId]);

    console.log(`🗑️ Permanently deleted event ID: ${eventId}`);
    return true;
  } catch (error) {
    console.error('Error permanently deleting event:', error);
    throw error;
  }
};

module.exports = {
  archiveEndedEvents,
  markAbsentRegistrations,
  getUserEventHistory,
  getArchivedEvents,
  restoreArchivedEvent,
  permanentlyDeleteEvent
};
