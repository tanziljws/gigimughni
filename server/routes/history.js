const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
  getUserEventHistory, 
  getArchivedEvents, 
  restoreArchivedEvent,
  archiveEndedEvents 
} = require('../utils/eventCleanup');

// GET /api/history/my-events - Get user's event history
router.get('/my-events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📋 Fetching event history for user:', userId);
    
    const history = await getUserEventHistory(userId);
    console.log('✅ Event history retrieved:', history.length, 'events');
    
    // Log token status for debugging
    history.forEach((event, index) => {
      console.log(`📋 Event ${index + 1}:`, {
        id: event.id,
        title: event.title,
        registration_status: event.registration_status,
        payment_status: event.payment_status,
        payment_amount: event.payment_amount,
        has_token: !!event.attendance_token,
        token: event.attendance_token ? `${event.attendance_token.substring(0, 3)}...` : 'null',
        primary_registration_id: event.primary_registration_id
      });
    });

    res.json({
      success: true,
      data: {
        total: history.length,
        events: history
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user history:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   SQL State:', error.sqlState);
    console.error('   Error code:', error.code);
    
    res.status(500).json({
      success: false,
      message: `Failed to fetch event history: ${error.message || 'Unknown error'}`
    });
  }
});

// GET /api/history/archived - Get all archived events (Admin only)
router.get('/archived', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const archived = await getArchivedEvents();

    res.json({
      success: true,
      data: {
        total: archived.length,
        events: archived
      }
    });
  } catch (error) {
    console.error('Error fetching archived events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch archived events'
    });
  }
});

// POST /api/history/restore/:eventId - Restore archived event (Admin only)
router.post('/restore/:eventId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    await restoreArchivedEvent(eventId);

    res.json({
      success: true,
      message: 'Event restored successfully'
    });
  } catch (error) {
    console.error('Error restoring event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore event'
    });
  }
});

// POST /api/history/archive-now - Manually trigger archival (Admin only)
router.post('/archive-now', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await archiveEndedEvents();

    res.json({
      success: true,
      message: `Successfully archived ${result.archived} events`,
      data: result
    });
  } catch (error) {
    console.error('Error triggering archival:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive events'
    });
  }
});

module.exports = router;
