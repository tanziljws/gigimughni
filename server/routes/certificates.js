const express = require('express');
const { query } = require('../db');
const { authenticateToken, requireAdmin, requireUser } = require('../middleware/auth');
const ApiResponse = require('../middleware/response');
const crypto = require('crypto');

const router = express.Router();

const DEFAULT_TEMPLATE = {
  title: 'CERTIFICATE',
  subtitle: 'OF ACHIEVEMENT',
  content:
    'This certificate is proudly presented to [NAMA_PESERTA] for successfully completing [NAMA_EVENT] yang diselenggarakan pada [TANGGAL_EVENT].',
  footer: 'Diterbitkan pada [TANGGAL_TERBIT]',
  backgroundColor: '#fdfbf7',
  primaryColor: '#5a4a3a',
  accentColor: '#d4af37',
  textColor: '#3a2a1a',
  logoPosition: 'top-center',
  signatureText: 'Event Organizer',
  certificateType: 'achievement',
};

const PLACEHOLDERS = {
  NAMA_PESERTA: 'Nama lengkap peserta',
  EMAIL_PESERTA: 'Email peserta',
  NAMA_EVENT: 'Judul event',
  TANGGAL_EVENT: 'Tanggal event (format Indonesia)',
  TANGGAL_TERBIT: 'Tanggal sertifikat diterbitkan',
  KOTA_EVENT: 'Kota / lokasi event',
  NOMOR_SERTIFIKAT: 'Nomor unik sertifikat',
  PENYELENGGARA: 'Nama penyelenggara / organizer',
};

const formatDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const generateTokenCode = (length = 8) =>
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();

const generateCertificateNumber = (eventId, userId) => {
  const randomSegment = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `EVT-${String(eventId).padStart(4, '0')}-${String(userId).padStart(4, '0')}-${randomSegment}`;
};

const mapTemplateRow = (row) => {
  if (!row) return { ...DEFAULT_TEMPLATE };
  return {
    title: row.title || DEFAULT_TEMPLATE.title,
    subtitle: row.subtitle || DEFAULT_TEMPLATE.subtitle,
    content: row.content || DEFAULT_TEMPLATE.content,
    footer: row.footer_text || DEFAULT_TEMPLATE.footer,
    backgroundColor: row.background_color || DEFAULT_TEMPLATE.backgroundColor,
    primaryColor: row.primary_color || DEFAULT_TEMPLATE.primaryColor,
    accentColor: row.accent_color || DEFAULT_TEMPLATE.accentColor,
    textColor: row.text_color || DEFAULT_TEMPLATE.textColor,
    logoPosition: row.logo_position || DEFAULT_TEMPLATE.logoPosition,
    signatureText: row.signature_text || DEFAULT_TEMPLATE.signatureText,
    certificateType: row.template_type || DEFAULT_TEMPLATE.certificateType,
  };
};

const getActiveTemplate = async () => {
  const [templates] = await query(
    'SELECT * FROM certificate_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
  );
  if (!templates.length) {
    return { ...DEFAULT_TEMPLATE };
  }
  return mapTemplateRow(templates[0]);
};

const applyPlaceholders = (text, values) => {
  if (!text) return '';
  return text.replace(/\[([A-Z_]+)\]/g, (_, token) => values[token] ?? '');
};

const applyTemplateValues = (template, values) => ({
  title: applyPlaceholders(template.title, values),
  subtitle: applyPlaceholders(template.subtitle, values),
  content: applyPlaceholders(template.content, values),
  footer: applyPlaceholders(template.footer, values),
  signatureText: applyPlaceholders(template.signatureText, values),
});

const buildPlaceholderData = (participant, event, certificateNumber) => ({
  NAMA_PESERTA: participant.full_name || participant.user_name || 'Peserta',
  EMAIL_PESERTA: participant.email || participant.user_email || '',
  NAMA_EVENT: event.title,
  TANGGAL_EVENT: formatDate(event.event_date),
  TANGGAL_TERBIT: formatDate(new Date()),
  KOTA_EVENT: event.city || event.location || '-',
  NOMOR_SERTIFIKAT: certificateNumber,
  PENYELENGGARA: event.organizer_name || 'Event Organizer',
});

const ensureAttendanceRecord = async (eventId, userId, registrationId) => {
  const [existingRecords] = await query(
    'SELECT id FROM attendance_records WHERE user_id = ? AND event_id = ? ORDER BY attendance_time DESC LIMIT 1',
    [userId, eventId]
  );

  if (existingRecords.length) {
    return existingRecords[0].id;
  }

  const [existingTokens] = await query(
    'SELECT id FROM attendance_tokens WHERE user_id = ? AND event_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId, eventId]
  );

  let tokenId;
  if (existingTokens.length) {
    tokenId = existingTokens[0].id;
  } else {
    const tokenCode = generateTokenCode(10);
    const [tokenInsert] = await query(
      `INSERT INTO attendance_tokens (registration_id, user_id, event_id, token, is_used, used_at) 
       VALUES (?, ?, ?, ?, 1, NOW())`,
      [registrationId, userId, eventId, tokenCode]
    );
    tokenId = tokenInsert.insertId;
  }

  const [recordInsert] = await query(
    `INSERT INTO attendance_records (token_id, user_id, event_id, attendance_time, ip_address, user_agent)
     VALUES (?, ?, ?, NOW(), ?, ?)`,
    [tokenId, userId, eventId, 'system', 'certificate-auto']
  );

  return recordInsert.insertId;
};

const generateCertificatePayload = (template, renderedFields, placeholders) => ({
  template,
  rendered: renderedFields,
  placeholders,
});

const fetchEventWithOrganizer = async (eventId) => {
  const [events] = await query(
    `SELECT e.*, u.full_name as organizer_name 
     FROM events e 
     LEFT JOIN users u ON e.organizer_id = u.id
     WHERE e.id = ?`,
    [eventId]
  );
  return events.length ? events[0] : null;
};

const fetchParticipant = async (eventId, participantId) => {
  const [participants] = await query(
    `SELECT r.*, u.full_name, u.email, u.phone 
     FROM event_registrations r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.id = ? AND r.event_id = ?`,
    [participantId, eventId]
  );
  return participants.length ? participants[0] : null;
};

const upsertCertificateRecord = async ({
  userId,
  eventId,
  attendanceRecordId,
  template,
  rendered,
  placeholders,
}) => {
  const certificateNumber = placeholders.NOMOR_SERTIFIKAT;
  const certificateType = template.certificateType || 'participation';
  const templateData = JSON.stringify(generateCertificatePayload(template, rendered, placeholders));

  const [existing] = await query(
    'SELECT id FROM certificates WHERE user_id = ? AND event_id = ?',
    [userId, eventId]
  );

  if (existing.length) {
    await query(
      `UPDATE certificates 
       SET certificate_number = ?, certificate_type = ?, status = 'issued', generated_at = NOW(), issued_at = NOW(),
           certificate_url = ?, template_data = ?, updated_at = NOW(), attendance_record_id = ?
       WHERE id = ?`,
      [certificateNumber, certificateType, null, templateData, attendanceRecordId, existing[0].id]
    );

    const [updated] = await query('SELECT * FROM certificates WHERE id = ?', [existing[0].id]);
    return updated[0];
  }

  const [insert] = await query(
    `INSERT INTO certificates 
     (user_id, event_id, attendance_record_id, certificate_number, certificate_type, status, generated_at, issued_at, certificate_url, template_data) 
     VALUES (?, ?, ?, ?, ?, 'issued', NOW(), NOW(), ?, ?)`,
    [userId, eventId, attendanceRecordId, certificateNumber, certificateType, null, templateData]
  );

  const [created] = await query('SELECT * FROM certificates WHERE id = ?', [insert.insertId]);
  return created[0];
};

// Get my certificates (authenticated user)
router.get('/my-certificates', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user;

    const [certs] = await query(
      `SELECT c.*, e.title as event_title, e.event_date, e.location
       FROM certificates c
       LEFT JOIN events e ON c.event_id = e.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return ApiResponse.success(res, { certificates: certs }, 'Certificates retrieved');
  } catch (error) {
    console.error('Get my certificates error:', error);
    return ApiResponse.error(res, 'Failed to fetch certificates');
  }
});

// Get certificate by id
router.get('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId || req.user;
    const [rows] = await query(
      `SELECT c.* FROM certificates c WHERE c.id = ? AND c.user_id = ?`,
      [id, userId]
    );
    if (rows.length === 0) return ApiResponse.notFound(res, 'Certificate not found');
    return ApiResponse.success(res, rows[0]);
  } catch (error) {
    console.error('Get certificate error:', error);
    return ApiResponse.error(res, 'Failed to fetch certificate');
  }
});

// Update certificate customization (user can customize their own certificate)
router.put('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId || req.user;
    const { customization } = req.body;

    // Verify certificate belongs to user
    const [certRows] = await query(
      `SELECT * FROM certificates WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (certRows.length === 0) {
      return ApiResponse.forbidden(res, 'Certificate not found or access denied');
    }

    // Update customization
    await query(
      `UPDATE certificates SET customization = ? WHERE id = ? AND user_id = ?`,
      [customization, id, userId]
    );

    return ApiResponse.success(res, { success: true }, 'Certificate customization updated');
  } catch (error) {
    console.error('Update certificate error:', error);
    return ApiResponse.error(res, 'Failed to update certificate');
  }
});

// Get certificate template (admin only)
router.get('/template', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const template = await getActiveTemplate();
    return ApiResponse.success(res, template);
  } catch (error) {
    console.error('Get template error:', error);
    return ApiResponse.error(res, 'Failed to fetch template');
  }
});

// Get template placeholders
router.get('/template/placeholders', authenticateToken, requireAdmin, (req, res) => {
  const placeholders = Object.entries(PLACEHOLDERS).map(([token, description]) => ({
    token: `[${token}]`,
    description,
  }));
  return ApiResponse.success(res, { placeholders });
});

// Update certificate template (admin only)
router.put('/template', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      subtitle,
      content,
      footer,
      backgroundColor,
      primaryColor,
      accentColor,
      textColor,
      logoPosition,
      signatureText,
      certificateType
    } = req.body;

    const [existing] = await query(
      'SELECT * FROM certificate_templates WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );

    if (!existing.length) {
      const [result] = await query(
        `INSERT INTO certificate_templates 
         (template_name, template_type, title, subtitle, content, footer_text, background_color, primary_color, accent_color, text_color, logo_position, signature_text, is_default, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Default Template',
          certificateType || DEFAULT_TEMPLATE.certificateType,
          title || DEFAULT_TEMPLATE.title,
          subtitle || DEFAULT_TEMPLATE.subtitle,
          content || DEFAULT_TEMPLATE.content,
          footer || DEFAULT_TEMPLATE.footer,
          backgroundColor || DEFAULT_TEMPLATE.backgroundColor,
          primaryColor || DEFAULT_TEMPLATE.primaryColor,
          accentColor || DEFAULT_TEMPLATE.accentColor,
          textColor || DEFAULT_TEMPLATE.textColor,
          logoPosition || DEFAULT_TEMPLATE.logoPosition,
          signatureText || DEFAULT_TEMPLATE.signatureText,
          1,
          1,
        ]
      );

      const [newTemplate] = await query('SELECT * FROM certificate_templates WHERE id = ?', [
        result.insertId,
      ]);

      return ApiResponse.success(res, mapTemplateRow(newTemplate[0]), 'Template created successfully');
    }

    await query(
      `UPDATE certificate_templates 
       SET title = ?, subtitle = ?, content = ?, footer_text = ?, background_color = ?, primary_color = ?, accent_color = ?, text_color = ?, logo_position = ?, signature_text = ?, template_type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title || existing[0].title,
        subtitle || existing[0].subtitle,
        content || existing[0].content,
        footer || existing[0].footer_text,
        backgroundColor || existing[0].background_color,
        primaryColor || existing[0].primary_color,
        accentColor || existing[0].accent_color,
        textColor || existing[0].text_color,
        logoPosition || existing[0].logo_position,
        signatureText || existing[0].signature_text,
        certificateType || existing[0].template_type,
        existing[0].id,
      ]
    );

    const [updatedTemplate] = await query('SELECT * FROM certificate_templates WHERE id = ?', [
      existing[0].id,
    ]);

    return ApiResponse.success(res, mapTemplateRow(updatedTemplate[0]), 'Template updated successfully');
  } catch (error) {
    console.error('Update template error:', error);
    return ApiResponse.error(res, 'Failed to update template');
  }
});

const handleCertificateGeneration = async (eventId, participantId) => {
  const event = await fetchEventWithOrganizer(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  if (!event.has_certificate) {
    throw new Error('Event does not have certificate enabled');
  }

  const participant = await fetchParticipant(eventId, participantId);
  if (!participant) {
    throw new Error('Participant not found for this event');
  }

  const userId = participant.user_id;
  const template = await getActiveTemplate();
  const certificateNumber = generateCertificateNumber(eventId, userId);
  const placeholders = buildPlaceholderData(participant, event, certificateNumber);
  const rendered = applyTemplateValues(template, placeholders);
  const attendanceRecordId = await ensureAttendanceRecord(eventId, userId, participant.id);

  const certificateRecord = await upsertCertificateRecord({
    userId,
    eventId,
    attendanceRecordId,
    template,
    rendered,
    placeholders,
  });

  return {
    certificate: certificateRecord,
    rendered,
    placeholders,
  };
};

// Generate certificate for a single participant
router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { event_id: eventId, participant_id: participantId } = req.body;

    if (!eventId || !participantId) {
      return ApiResponse.badRequest(res, 'event_id and participant_id are required');
    }

    const result = await handleCertificateGeneration(eventId, participantId);
    return ApiResponse.success(res, result, 'Certificate generated successfully');
  } catch (error) {
    console.error('Generate certificate error:', error);
    return ApiResponse.error(res, error.message || 'Failed to generate certificate');
  }
});

// Generate certificates for all participants
router.post('/generate-bulk', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { event_id: eventId, status = 'approved' } = req.body;

    if (!eventId) {
      return ApiResponse.badRequest(res, 'event_id is required');
    }

    const event = await fetchEventWithOrganizer(eventId);
    if (!event) {
      return ApiResponse.notFound(res, 'Event not found');
    }

    const [participants] = await query(
      `SELECT id FROM event_registrations 
       WHERE event_id = ? 
         AND (status = ? OR status = 'attended')`,
      [eventId, status]
    );

    if (!participants.length) {
      return ApiResponse.badRequest(res, 'No participants found for this event');
    }

    const results = [];
    for (const participant of participants) {
      try {
        const certificate = await handleCertificateGeneration(eventId, participant.id);
        results.push({ participant_id: participant.id, status: 'success', certificate });
      } catch (err) {
        console.error(`Failed to generate certificate for participant ${participant.id}:`, err);
        results.push({ participant_id: participant.id, status: 'failed', message: err.message });
      }
    }

    return ApiResponse.success(res, { total: results.length, details: results }, 'Bulk generation finished');
  } catch (error) {
    console.error('Bulk generate certificate error:', error);
    return ApiResponse.error(res, error.message || 'Failed to generate certificates');
  }
});

// Download certificate as PDF
router.get('/:id/download', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId || req.user;

    // Verify certificate belongs to user
    const [certRows] = await query(
      `SELECT c.*, e.title as event_title 
       FROM certificates c
       LEFT JOIN events e ON c.event_id = e.id
       WHERE c.id = ? AND c.user_id = ?`,
      [id, userId]
    );

    if (certRows.length === 0) {
      return ApiResponse.forbidden(res, 'Certificate not found or access denied');
    }

    const certificate = certRows[0];
    
    // For now, return certificate data as JSON
    // In production, you would generate a PDF here using a library like pdfkit or puppeteer
    // This is a placeholder that returns the certificate data
    return ApiResponse.success(res, {
      certificate: {
        id: certificate.id,
        certificate_number: certificate.certificate_number,
        event_title: certificate.event_title,
        template_data: certificate.template_data ? JSON.parse(certificate.template_data) : null,
        issued_at: certificate.issued_at
      }
    }, 'Certificate data retrieved. PDF generation can be implemented here.');

  } catch (error) {
    console.error('Download certificate error:', error);
    return ApiResponse.error(res, 'Failed to download certificate');
  }
});

module.exports = router;

