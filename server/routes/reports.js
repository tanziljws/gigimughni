const express = require('express');
const { query } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get report summary
router.get('/summary', async (req, res) => {
  try {
    const { start_date, end_date, event_id } = req.query;

    let eventFilter = '';
    let params = [];

    if (event_id) {
      eventFilter = ' AND e.id = ?';
      params.push(event_id);
    }

    // Date filter for events
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = ' AND e.event_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // Total events
    const [totalEventsResult] = await query(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN e.status = 'published' AND e.is_active = 1 THEN 1 ELSE 0 END) as active
       FROM events e
       WHERE 1=1 ${eventFilter} ${dateFilter}`,
      params
    );

    // Total participants
    const [participantsResult] = await query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN er.status = 'approved' THEN 1 ELSE 0 END) as approved
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       WHERE 1=1 ${eventFilter} ${dateFilter}`,
      params
    );

    // Attendance data - with error handling for missing attendance table
    let attendanceResult = [{ total_registrations: 0, total_attended: 0 }];
    try {
      const result = await query(
        `SELECT COUNT(DISTINCT er.id) as total_registrations,
                COUNT(DISTINCT CASE WHEN a.status = 'present' THEN er.id END) as total_attended
         FROM event_registrations er
         JOIN events e ON er.event_id = e.id
         LEFT JOIN attendance a ON er.id = a.registration_id
         WHERE er.status = 'approved' ${eventFilter} ${dateFilter}`,
        params
      );
      attendanceResult = result;
    } catch (error) {
      console.warn('Attendance table not found, using default values');
      // If attendance table doesn't exist, just count registrations
      const result = await query(
        `SELECT COUNT(DISTINCT er.id) as total_registrations, 0 as total_attended
         FROM event_registrations er
         JOIN events e ON er.event_id = e.id
         WHERE er.status = 'approved' ${eventFilter} ${dateFilter}`,
        params
      );
      attendanceResult = result;
    }

    const attendanceRate = attendanceResult[0].total_registrations > 0
      ? Math.round((attendanceResult[0].total_attended / attendanceResult[0].total_registrations) * 100)
      : 0;

    // Total revenue (from paid events)
    const [revenueResult] = await query(
      `SELECT COALESCE(SUM(e.price * 
              (SELECT COUNT(*) FROM event_registrations er2 
               WHERE er2.event_id = e.id AND er2.status = 'approved')), 0) as total
       FROM events e
       WHERE e.price > 0 ${eventFilter} ${dateFilter}`,
      params
    );

    // Event performance - with error handling
    let eventPerformance = [];
    try {
      const result = await query(
        `SELECT e.id, e.title, e.event_date, e.status,
                COUNT(DISTINCT er.id) as participants,
                COUNT(DISTINCT CASE WHEN a.status = 'present' THEN er.id END) as attended,
                CASE 
                  WHEN COUNT(DISTINCT er.id) > 0 
                  THEN ROUND((COUNT(DISTINCT CASE WHEN a.status = 'present' THEN er.id END) / COUNT(DISTINCT er.id)) * 100)
                  ELSE 0 
                END as attendance_rate
         FROM events e
         LEFT JOIN event_registrations er ON e.id = er.event_id AND er.status = 'approved'
         LEFT JOIN attendance a ON er.id = a.registration_id
         WHERE 1=1 ${eventFilter} ${dateFilter}
         GROUP BY e.id, e.title, e.event_date, e.status
         ORDER BY e.event_date DESC
         LIMIT 10`,
        params
      );
      eventPerformance = result;
    } catch (error) {
      console.warn('Error fetching event performance, using simplified query');
      const result = await query(
        `SELECT e.id, e.title, e.event_date, e.status,
                COUNT(DISTINCT er.id) as participants,
                0 as attended,
                0 as attendance_rate
         FROM events e
         LEFT JOIN event_registrations er ON e.id = er.event_id AND er.status = 'approved'
         WHERE 1=1 ${eventFilter} ${dateFilter}
         GROUP BY e.id, e.title, e.event_date, e.status
         ORDER BY e.event_date DESC
         LIMIT 10`,
        params
      );
      eventPerformance = result;
    }

    // Category distribution
    const [categoryDistribution] = await query(
      `SELECT c.name, COUNT(e.id) as count,
              ROUND((COUNT(e.id) * 100.0 / (SELECT COUNT(*) FROM events WHERE 1=1 ${dateFilter})), 1) as percentage
       FROM categories c
       LEFT JOIN events e ON c.id = e.category_id ${dateFilter ? 'AND e.event_date BETWEEN ? AND ?' : ''}
       WHERE c.is_active = 1
       GROUP BY c.id, c.name
       HAVING count > 0
       ORDER BY count DESC`,
      start_date && end_date ? [start_date, end_date] : []
    );

    // Participant details
    const [participantDetails] = await query(
      `SELECT 
          u.full_name as name, 
          COALESCE(er.email, u.email) as email, 
          COALESCE(er.phone, u.phone) as phone,
          e.title as event_title,
          er.status, 
          er.created_at as registration_date
       FROM event_registrations er
       JOIN users u ON er.user_id = u.id
       JOIN events e ON er.event_id = e.id
       WHERE 1=1 ${eventFilter} ${dateFilter}
       ORDER BY er.created_at DESC
       LIMIT 100`,
      params
    );

    const reportData = {
      total_events: totalEventsResult[0].total,
      active_events: totalEventsResult[0].active,
      total_participants: participantsResult[0].total,
      approved_participants: participantsResult[0].approved,
      total_attended: attendanceResult[0].total_attended,
      attendance_rate: attendanceRate,
      total_revenue: revenueResult[0].total,
      event_performance: eventPerformance,
      category_distribution: categoryDistribution,
      participant_details: participantDetails,
      generated_at: new Date().toISOString(),
      date_range: {
        start: start_date || 'all',
        end: end_date || 'all'
      }
    };

    return ApiResponse.success(res, reportData, 'Report generated successfully');

  } catch (error) {
    console.error('Generate report error:', error);
    return ApiResponse.error(res, 'Failed to generate report');
  }
});

// Export report (PDF/Excel)
router.get('/export', async (req, res) => {
  try {
    const { start_date, end_date, event_id, format = 'pdf' } = req.query;

    // For now, return JSON data that can be processed by frontend
    // In production, you would use libraries like pdfkit or exceljs
    
    let eventFilter = '';
    let params = [];

    if (event_id) {
      eventFilter = ' AND e.id = ?';
      params.push(event_id);
    }

    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = ' AND e.event_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // Get comprehensive data for export
    const [exportData] = await query(
      `SELECT e.title as event_title, e.event_date, e.location,
              u.full_name, u.email, u.phone,
              er.status as registration_status, er.created_at as registration_date,
              c.name as category_name,
              CASE WHEN a.status = 'present' THEN 'Hadir' ELSE 'Tidak Hadir' END as attendance_status
       FROM event_registrations er
       JOIN users u ON er.user_id = u.id
       JOIN events e ON er.event_id = e.id
       LEFT JOIN categories c ON e.category_id = c.id
       LEFT JOIN attendance a ON er.id = a.registration_id
       WHERE 1=1 ${eventFilter} ${dateFilter}
       ORDER BY e.event_date DESC, er.created_at DESC`,
      params
    );

    if (format === 'excel') {
      // Return CSV format for Excel
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-event-${start_date}-${end_date}.csv`);
      return res.send(csv);
    } else {
      // For PDF, return JSON that frontend can process
      return ApiResponse.success(res, exportData, 'Export data retrieved');
    }

  } catch (error) {
    console.error('Export report error:', error);
    return ApiResponse.error(res, 'Failed to export report');
  }
});

// Helper function to convert to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = ('' + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Get event statistics for a specific event
router.get('/event/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Event basic info
    const [eventInfo] = await query(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    if (eventInfo.length === 0) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    // Registration stats
    const [registrationStats] = await query(
      `SELECT 
        COUNT(*) as total_registrations,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM event_registrations
       WHERE event_id = ?`,
      [id]
    );

    // Attendance stats
    const [attendanceStats] = await query(
      `SELECT 
        COUNT(DISTINCT er.id) as total_expected,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN er.id END) as present,
        COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN er.id END) as absent
       FROM event_registrations er
       LEFT JOIN attendance a ON er.id = a.registration_id
       WHERE er.event_id = ? AND er.status = 'approved'`,
      [id]
    );

    const stats = {
      event: eventInfo[0],
      registrations: registrationStats[0],
      attendance: attendanceStats[0],
      attendance_rate: attendanceStats[0].total_expected > 0
        ? Math.round((attendanceStats[0].present / attendanceStats[0].total_expected) * 100)
        : 0
    };

    return ApiResponse.success(res, stats, 'Event statistics retrieved');

  } catch (error) {
    console.error('Get event stats error:', error);
    return ApiResponse.error(res, 'Failed to get event statistics');
  }
});

module.exports = router;
