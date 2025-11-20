const { query } = require('../db');

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
        // Update event status to archived
        await query(`
          UPDATE events 
          SET 
            is_active = FALSE,
            status = 'archived',
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
    const history = await query(`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        e.end_date,
        e.location,
        e.status,
        e.is_active,
        e.has_certificate,
        r.id as registration_id,
        r.created_at as registration_date,
        r.status as registration_status,
        c.id as certificate_id,
        c.certificate_code,
        c.issued_at as certificate_issued_at
      FROM event_registrations r
      INNER JOIN events e ON r.event_id = e.id
      LEFT JOIN certificates c ON c.user_id = r.user_id AND c.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY e.event_date DESC
    `, [userId]);

    return history;
  } catch (error) {
    console.error('Error getting user event history:', error);
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
      WHERE e.status = 'archived' OR e.is_active = FALSE
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
