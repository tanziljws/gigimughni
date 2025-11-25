import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import { Award, Download, FileText, Eye, Settings, Save, RotateCcw, Palette, Type, Image as ImageIcon, AlignCenter, Bold, Italic, Maximize2, Minus, Plus, Layout, Sparkles } from 'lucide-react';
import { eventsAPI, certificatesAPI, registrationsAPI } from '../../services/api';

const CertificateManagement = () => {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [generateConfirm, setGenerateConfirm] = useState({ show: false, participant: null });
  const [bulkGenerateConfirm, setBulkGenerateConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [certificateTemplate, setCertificateTemplate] = useState({
    title: 'CERTIFICATE',
    subtitle: 'OF ACHIEVEMENT',
    presentedText: 'This certificate is proudly presented to',
    content: 'atas partisipasinya dalam [NAMA_EVENT] yang diselenggarakan pada [TANGGAL_EVENT].',
    footer: 'Diterbitkan pada [TANGGAL_TERBIT]',
    backgroundColor: '#fefefe',
    primaryColor: '#1a1a1a',
    accentColor: '#d4af37',
    textColor: '#4a4a4a',
    logoPosition: 'top-center',
    signatureText: 'Event Organizer',
    certificateType: 'achievement',
    // Typography
    titleFontSize: 64,
    subtitleFontSize: 24,
    nameFontSize: 48,
    contentFontSize: 16,
    titleFontFamily: 'serif',
    bodyFontFamily: 'serif',
    // Border & Decoration
    borderStyle: 'elegant',
    borderWidth: 3,
    showCornerOrnaments: true,
    showTopFlourish: true,
    showBottomFlourish: true,
    // Spacing
    titleSpacing: 8,
    nameSpacing: 12,
    contentSpacing: 8,
    // Layout
    layoutStyle: 'classic',
    nameUnderline: true,
    showSeal: false
  });

  useEffect(() => {
    fetchEvents();
    fetchTemplate();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getAll();
      if (response && response.data) {
        const eventsData = Array.isArray(response.data) ? response.data : response.data.events || [];
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Gagal memuat daftar event', 'error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      setTemplateLoading(true);
      const response = await certificatesAPI.getTemplate();
      if (response && response.data) {
        const data = response.data;
        setCertificateTemplate({
          title: data.title || 'CERTIFICATE',
          subtitle: data.subtitle || 'OF ACHIEVEMENT',
          presentedText: data.presentedText || 'This certificate is proudly presented to',
          content: data.content || '',
          footer: data.footer || data.footer_text || 'Diterbitkan pada [TANGGAL_TERBIT]',
          backgroundColor: data.backgroundColor || data.background_color || '#fefefe',
          primaryColor: data.primaryColor || data.primary_color || '#1a1a1a',
          accentColor: data.accentColor || data.accent_color || '#d4af37',
          textColor: data.textColor || data.text_color || '#4a4a4a',
          logoPosition: data.logoPosition || data.logo_position || 'top-center',
          signatureText: data.signatureText || data.signature_text || 'Event Organizer',
          certificateType: data.certificateType || data.template_type || 'achievement',
          titleFontSize: data.titleFontSize || 64,
          subtitleFontSize: data.subtitleFontSize || 24,
          nameFontSize: data.nameFontSize || 48,
          contentFontSize: data.contentFontSize || 16,
          titleFontFamily: data.titleFontFamily || 'serif',
          bodyFontFamily: data.bodyFontFamily || 'serif',
          borderStyle: data.borderStyle || 'elegant',
          borderWidth: data.borderWidth || 3,
          showCornerOrnaments: data.showCornerOrnaments !== false,
          showTopFlourish: data.showTopFlourish !== false,
          showBottomFlourish: data.showBottomFlourish !== false,
          titleSpacing: data.titleSpacing || 8,
          nameSpacing: data.nameSpacing || 12,
          contentSpacing: data.contentSpacing || 8,
          layoutStyle: data.layoutStyle || 'classic',
          nameUnderline: data.nameUnderline !== false,
          showSeal: data.showSeal || false
        });
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error('Gagal memuat template sertifikat', 'error');
    } finally {
      setTemplateLoading(false);
    }
  };

  const fetchParticipants = async (eventId) => {
    try {
      const response = await registrationsAPI.getAll({ event_id: eventId, status: 'approved' });
      if (response && response.data) {
        const participantsData = Array.isArray(response.data) ? response.data : response.data.registrations || [];
        setParticipants(participantsData);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Gagal memuat data peserta', 'error');
      setParticipants([]);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    fetchParticipants(event.id);
  };

  const generateCertificate = (participant) => {
    setGenerateConfirm({ show: true, participant });
  };

  const confirmGenerate = async () => {
    const participant = generateConfirm.participant;
    try {
      await certificatesAPI.generate(selectedEvent.id, participant.id || participant.user_id);
      toast.error(`Sertifikat berhasil dibuat untuk ${participant.full_name || participant.user_name}`, 'success');
      setGenerateConfirm({ show: false, participant: null });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Gagal membuat sertifikat', 'error');
    }
  };

  const generateAllCertificates = () => {
    setBulkGenerateConfirm(true);
  };

  const confirmBulkGenerate = async () => {
    try {
      await certificatesAPI.generateBulk(selectedEvent.id);
      toast.success(`Sertifikat berhasil dibuat untuk semua ${participants.length} peserta`);
      setBulkGenerateConfirm(false);
    } catch (error) {
      console.error('Error generating bulk certificates:', error);
      toast.error('Gagal membuat sertifikat', 'error');
    }
  };

  const saveTemplate = async () => {
    try {
      setSaving(true);
      const response = await certificatesAPI.updateTemplate(certificateTemplate);
      toast.success('Template sertifikat berhasil disimpan!');
      // Reload template to get updated data
      await fetchTemplate();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Gagal menyimpan template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetTemplate = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan template ke default?')) {
      setCertificateTemplate({
        title: 'CERTIFICATE',
        subtitle: 'OF ACHIEVEMENT',
        presentedText: 'This certificate is proudly presented to',
        content: 'atas partisipasinya dalam [NAMA_EVENT] yang diselenggarakan pada [TANGGAL_EVENT].',
        footer: 'Diterbitkan pada [TANGGAL_TERBIT]',
        backgroundColor: '#fefefe',
        primaryColor: '#1a1a1a',
        accentColor: '#d4af37',
        textColor: '#4a4a4a',
        logoPosition: 'top-center',
        signatureText: 'Event Organizer',
        certificateType: 'achievement',
        titleFontSize: 64,
        subtitleFontSize: 24,
        nameFontSize: 48,
        contentFontSize: 16,
        titleFontFamily: 'serif',
        bodyFontFamily: 'serif',
        borderStyle: 'elegant',
        borderWidth: 3,
        showCornerOrnaments: true,
        showTopFlourish: true,
        showBottomFlourish: true,
        titleSpacing: 8,
        nameSpacing: 12,
        contentSpacing: 8,
        layoutStyle: 'classic',
        nameUnderline: true,
        showSeal: false
      });
    }
  };

  const CertificatePreview = ({ template }) => {
    const getSubtitleText = () => {
      switch(template.certificateType) {
        case 'participation': return template.subtitle || 'OF PARTICIPATION';
        case 'completion': return template.subtitle || 'OF COMPLETION';
        default: return template.subtitle || 'OF ACHIEVEMENT';
      }
    };

    const getFontFamily = (type) => {
      const font = type === 'title' ? template.titleFontFamily : template.bodyFontFamily;
      switch(font) {
        case 'serif': return 'Georgia, "Times New Roman", serif';
        case 'sans-serif': return '"Arial", "Helvetica", sans-serif';
        case 'cursive': return '"Brush Script MT", "Lucida Handwriting", cursive';
        case 'monospace': return '"Courier New", monospace';
        default: return 'Georgia, serif';
      }
    };

    // A4 Landscape: 297mm x 210mm = 11.69" x 8.27" = aspect ratio 1.414:1
    return (
      <div 
        className="w-full relative overflow-hidden rounded-lg shadow-2xl bg-white" 
        style={{ 
          backgroundColor: template.backgroundColor || '#fefefe',
          aspectRatio: '1.414 / 1',
          minHeight: '500px'
        }}
      >
        {/* Border Frame */}
        <div className="absolute inset-0" style={{ padding: `${template.borderWidth || 3}px` }}>
          {template.borderStyle === 'elegant' && (
            <div 
              className="w-full h-full relative" 
              style={{ 
                border: `${template.borderWidth || 3}px solid ${template.accentColor || '#d4af37'}`,
                borderRadius: '4px'
              }}
            >
              <div 
                className="absolute inset-2 border" 
                style={{ 
                  border: `1px solid ${template.accentColor || '#d4af37'}`, 
                  opacity: 0.4,
                  borderRadius: '2px'
                }}
              ></div>
              
              {/* Corner Ornaments */}
              {template.showCornerOrnaments && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                <div 
                  key={pos}
                  className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'}`}
                  style={{ width: '80px', height: '80px', opacity: 0.7 }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full" style={{ fill: 'none', stroke: template.accentColor || '#d4af37', strokeWidth: 1.5 }}>
                    {pos === 'top-left' && <path d="M 0 50 Q 10 10, 50 0 L 50 10 Q 15 15, 10 50 Z" />}
                    {pos === 'top-right' && <path d="M 100 50 Q 90 10, 50 0 L 50 10 Q 85 15, 90 50 Z" />}
                    {pos === 'bottom-left' && <path d="M 0 50 Q 10 90, 50 100 L 50 90 Q 15 85, 10 50 Z" />}
                    {pos === 'bottom-right' && <path d="M 100 50 Q 90 90, 50 100 L 50 90 Q 85 85, 90 50 Z" />}
                    <circle cx={pos.includes('left') ? 20 : 80} cy={pos.includes('top') ? 20 : 80} r="4" fill={template.accentColor || '#d4af37'} />
                  </svg>
                </div>
              ))}
            </div>
          )}
          {template.borderStyle === 'simple' && (
            <div 
              className="w-full h-full" 
              style={{ 
                border: `${template.borderWidth || 3}px solid ${template.primaryColor || '#1a1a1a'}`,
                borderRadius: '2px'
              }}
            ></div>
          )}
          {template.borderStyle === 'double' && (
            <div className="w-full h-full relative">
              <div 
                className="absolute inset-0" 
                style={{ 
                  border: `${template.borderWidth || 3}px solid ${template.primaryColor || '#1a1a1a'}`,
                  borderRadius: '2px'
                }}
              ></div>
              <div 
                className="absolute inset-3" 
                style={{ 
                  border: `1px solid ${template.accentColor || '#d4af37'}`,
                  borderRadius: '1px'
                }}
              ></div>
            </div>
          )}
        </div>

        {/* Top Decorative Flourish */}
        {template.showTopFlourish && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2" style={{ width: '60%', height: '40px', opacity: 0.6 }}>
            <svg viewBox="0 0 400 40" className="w-full h-full" style={{ fill: 'none', stroke: template.accentColor || '#d4af37', strokeWidth: 2 }}>
              <path d="M 0 20 Q 50 5, 100 20 T 200 20 T 300 20 T 400 20" />
              <circle cx="200" cy="20" r="5" fill={template.accentColor || '#d4af37'} />
              <circle cx="100" cy="20" r="3" fill={template.accentColor || '#d4af37'} opacity="0.6" />
              <circle cx="300" cy="20" r="3" fill={template.accentColor || '#d4af37'} opacity="0.6" />
            </svg>
          </div>
        )}

        {/* Bottom Decorative Flourish */}
        {template.showBottomFlourish && (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2" style={{ width: '60%', height: '40px', opacity: 0.6 }}>
            <svg viewBox="0 0 400 40" className="w-full h-full" style={{ fill: 'none', stroke: template.accentColor || '#d4af37', strokeWidth: 2 }}>
              <path d="M 0 20 Q 50 35, 100 20 T 200 20 T 300 20 T 400 20" />
              <circle cx="200" cy="20" r="5" fill={template.accentColor || '#d4af37'} />
              <circle cx="100" cy="20" r="3" fill={template.accentColor || '#d4af37'} opacity="0.6" />
              <circle cx="300" cy="20" r="3" fill={template.accentColor || '#d4af37'} opacity="0.6" />
            </svg>
          </div>
        )}

        {/* Main Content */}
        <div className="relative z-10 h-full flex flex-col justify-center" style={{ padding: '60px 80px' }}>
          {/* Title */}
          <div className="text-center" style={{ marginBottom: `${template.titleSpacing || 8}px` }}>
            <h1 
              className="font-bold tracking-wider" 
              style={{ 
                fontSize: `${template.titleFontSize || 64}px`,
                color: template.primaryColor || '#1a1a1a', 
                fontFamily: getFontFamily('title'),
                letterSpacing: '0.1em',
                marginBottom: '12px',
                lineHeight: '1.1'
              }}
            >
              {template.title || 'CERTIFICATE'}
            </h1>
            <p 
              className="italic" 
              style={{ 
                fontSize: `${template.subtitleFontSize || 24}px`,
                color: template.textColor || '#4a4a4a', 
                fontFamily: getFontFamily('body'),
                letterSpacing: '0.05em'
              }}
            >
              {getSubtitleText()}
            </p>
          </div>

          {/* Presented Text */}
          <div className="text-center" style={{ marginBottom: `${template.nameSpacing || 12}px`, marginTop: '20px' }}>
            <p 
              className="italic" 
              style={{ 
                fontSize: `${template.contentFontSize || 16}px`,
                color: template.textColor || '#4a4a4a',
                fontFamily: getFontFamily('body')
              }}
            >
              {template.presentedText || 'This certificate is proudly presented to'}
            </p>
          </div>

          {/* Recipient Name */}
          <div className="text-center" style={{ marginBottom: `${template.contentSpacing || 8}px` }}>
            <div 
              className="font-bold" 
              style={{ 
                fontSize: `${template.nameFontSize || 48}px`,
                fontFamily: getFontFamily('title'), 
                color: template.primaryColor || '#1a1a1a',
                marginBottom: '16px',
                lineHeight: '1.2'
              }}
            >
              [NAMA_PESERTA]
            </div>
            {template.nameUnderline && (
              <div className="flex justify-center">
                <div 
                  style={{ 
                    width: '400px',
                    borderBottom: `2px solid ${template.accentColor || '#d4af37'}`,
                    marginTop: '8px'
                  }}
                ></div>
              </div>
            )}
          </div>

          {/* Content Text */}
          <div className="text-center max-w-4xl mx-auto" style={{ marginBottom: '40px' }}>
            <p 
              className="leading-relaxed" 
              style={{ 
                fontSize: `${template.contentFontSize || 16}px`,
                color: template.textColor || '#4a4a4a', 
                fontFamily: getFontFamily('body'),
                lineHeight: '1.8'
              }}
            >
              {template.content || 'atas partisipasinya dalam [NAMA_EVENT] yang diselenggarakan pada [TANGGAL_EVENT].'}
            </p>
          </div>

          {/* Footer with Signature */}
          <div className="flex justify-between items-end mt-auto" style={{ paddingTop: '40px' }}>
            <div className="text-left">
              <div 
                className="mb-1" 
                style={{ 
                  fontSize: '12px',
                  color: template.textColor || '#4a4a4a',
                  fontFamily: getFontFamily('body')
                }}
              >
                Tanggal
              </div>
              <div 
                className="font-semibold" 
                style={{ 
                  fontSize: '14px',
                  color: template.primaryColor || '#1a1a1a',
                  fontFamily: getFontFamily('body')
                }}
              >
                {new Date().toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
            
            <div className="text-right">
              <div className="mb-2">
                <div 
                  className="font-bold italic" 
                  style={{ 
                    fontSize: '28px',
                    fontFamily: getFontFamily('cursive'), 
                    color: template.primaryColor || '#1a1a1a' 
                  }}
                >
                  {template.signatureText || 'Event Organizer'}
                </div>
              </div>
              <div 
                style={{ 
                  width: '180px',
                  borderTop: `2px solid ${template.primaryColor || '#1a1a1a'}`,
                  marginLeft: 'auto'
                }}
              ></div>
              <div 
                className="mt-1" 
                style={{ 
                  fontSize: '12px',
                  color: template.textColor || '#4a4a4a',
                  fontFamily: getFontFamily('body')
                }}
              >
                {template.footer || 'Diterbitkan pada [TANGGAL_TERBIT]'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-2">
            <Award className="w-8 h-8 text-yellow-500" />
            Certificate Management
          </h1>
          <p className="text-gray-600">Kelola dan buat sertifikat untuk peserta event</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Events List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Pilih Event
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Memuat event...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada event tersedia</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventSelect(event)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedEvent?.id === event.id
                        ? 'bg-black text-white border-black shadow-lg'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">{event.title}</div>
                    <div className={`text-sm ${selectedEvent?.id === event.id ? 'text-gray-300' : 'text-gray-500'}`}>
                      {new Date(event.event_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template Editor Toggle */}
          <button
            onClick={() => setShowTemplateEditor(!showTemplateEditor)}
            className={`w-full px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              showTemplateEditor
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            {showTemplateEditor ? 'Sembunyikan Editor' : 'Edit Template Sertifikat'}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {showTemplateEditor ? (
            /* Template Editor */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                  <Palette className="w-6 h-6 text-purple-600" />
                  Editor Template Sertifikat
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={saveTemplate}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Template'}
                  </button>
                  <button
                    onClick={resetTemplate}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </div>
              
              {templateLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                  <p className="text-gray-500">Memuat template...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Template Settings Form */}
                  <div className="space-y-5 max-h-[800px] overflow-y-auto pr-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Placeholder yang tersedia:
                      </p>
                      <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                        <li><code className="bg-blue-100 px-1 rounded">[NAMA_PESERTA]</code> — Nama lengkap peserta</li>
                        <li><code className="bg-blue-100 px-1 rounded">[EMAIL_PESERTA]</code> — Email peserta</li>
                        <li><code className="bg-blue-100 px-1 rounded">[NAMA_EVENT]</code> — Judul event</li>
                        <li><code className="bg-blue-100 px-1 rounded">[TANGGAL_EVENT]</code> — Tanggal event</li>
                        <li><code className="bg-blue-100 px-1 rounded">[TANGGAL_TERBIT]</code> — Tanggal sertifikat diterbitkan</li>
                        <li><code className="bg-blue-100 px-1 rounded">[KOTA_EVENT]</code> — Lokasi/kota event</li>
                        <li><code className="bg-blue-100 px-1 rounded">[NOMOR_SERTIFIKAT]</code> — Nomor unik sertifikat</li>
                        <li><code className="bg-blue-100 px-1 rounded">[PENYELENGGARA]</code> — Nama penyelenggara</li>
                      </ul>
                    </div>

                    {/* Basic Text Fields */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        Teks Dasar
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Judul Sertifikat</label>
                        <input
                          type="text"
                          value={certificateTemplate.title}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, title: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black font-semibold"
                          placeholder="CERTIFICATE"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Subtitle</label>
                        <input
                          type="text"
                          value={certificateTemplate.subtitle}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, subtitle: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                          placeholder="OF ACHIEVEMENT"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Teks Presentasi</label>
                        <input
                          type="text"
                          value={certificateTemplate.presentedText}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, presentedText: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                          placeholder="This certificate is proudly presented to"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Teks Konten</label>
                        <textarea
                          rows="3"
                          value={certificateTemplate.content}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, content: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black resize-none"
                          placeholder="atas partisipasinya dalam [NAMA_EVENT]..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Teks Footer</label>
                        <input
                          type="text"
                          value={certificateTemplate.footer}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, footer: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                          placeholder="Diterbitkan pada [TANGGAL_TERBIT]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Teks Tanda Tangan</label>
                        <input
                          type="text"
                          value={certificateTemplate.signatureText}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, signatureText: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                          placeholder="Event Organizer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Tipe Sertifikat</label>
                        <select
                          value={certificateTemplate.certificateType}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, certificateType: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                        >
                          <option value="achievement">Certificate of Achievement</option>
                          <option value="participation">Certificate of Participation</option>
                          <option value="completion">Certificate of Completion</option>
                        </select>
                      </div>
                    </div>

                    {/* Typography Controls */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Bold className="w-4 h-4" />
                        Tipografi
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Ukuran Font Judul: {certificateTemplate.titleFontSize}px
                        </label>
                        <div className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-gray-500" />
                          <input
                            type="range"
                            min="32"
                            max="96"
                            value={certificateTemplate.titleFontSize}
                            onChange={(e) => setCertificateTemplate({...certificateTemplate, titleFontSize: parseInt(e.target.value)})}
                            className="flex-1"
                          />
                          <Plus className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Ukuran Font Subtitle: {certificateTemplate.subtitleFontSize}px
                        </label>
                        <input
                          type="range"
                          min="12"
                          max="36"
                          value={certificateTemplate.subtitleFontSize}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, subtitleFontSize: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Ukuran Font Nama: {certificateTemplate.nameFontSize}px
                        </label>
                        <input
                          type="range"
                          min="32"
                          max="72"
                          value={certificateTemplate.nameFontSize}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, nameFontSize: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Ukuran Font Konten: {certificateTemplate.contentFontSize}px
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="24"
                          value={certificateTemplate.contentFontSize}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, contentFontSize: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Font Family Judul</label>
                        <select
                          value={certificateTemplate.titleFontFamily}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, titleFontFamily: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                        >
                          <option value="serif">Serif (Georgia, Times)</option>
                          <option value="sans-serif">Sans-serif (Arial, Helvetica)</option>
                          <option value="cursive">Cursive (Brush Script)</option>
                          <option value="monospace">Monospace (Courier)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Font Family Body</label>
                        <select
                          value={certificateTemplate.bodyFontFamily}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, bodyFontFamily: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                        >
                          <option value="serif">Serif (Georgia, Times)</option>
                          <option value="sans-serif">Sans-serif (Arial, Helvetica)</option>
                          <option value="cursive">Cursive (Brush Script)</option>
                          <option value="monospace">Monospace (Courier)</option>
                        </select>
                      </div>
                    </div>

                    {/* Border & Decoration */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        Border & Dekorasi
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Gaya Border</label>
                        <select
                          value={certificateTemplate.borderStyle}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, borderStyle: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                        >
                          <option value="elegant">Elegant (Dengan Ornamen)</option>
                          <option value="simple">Simple (Border Sederhana)</option>
                          <option value="double">Double (Border Ganda)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Ketebalan Border: {certificateTemplate.borderWidth}px
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={certificateTemplate.borderWidth}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, borderWidth: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={certificateTemplate.showCornerOrnaments}
                            onChange={(e) => setCertificateTemplate({...certificateTemplate, showCornerOrnaments: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          Tampilkan Ornamen Sudut
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={certificateTemplate.showTopFlourish}
                            onChange={(e) => setCertificateTemplate({...certificateTemplate, showTopFlourish: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          Tampilkan Flourish Atas
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={certificateTemplate.showBottomFlourish}
                            onChange={(e) => setCertificateTemplate({...certificateTemplate, showBottomFlourish: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          Tampilkan Flourish Bawah
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={certificateTemplate.nameUnderline}
                            onChange={(e) => setCertificateTemplate({...certificateTemplate, nameUnderline: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          Garis Bawah Nama
                        </label>
                      </div>
                    </div>

                    {/* Spacing Controls */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <AlignCenter className="w-4 h-4" />
                        Spacing
                      </h3>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Spacing Judul: {certificateTemplate.titleSpacing}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={certificateTemplate.titleSpacing}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, titleSpacing: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Spacing Nama: {certificateTemplate.nameSpacing}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={certificateTemplate.nameSpacing}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, nameSpacing: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Spacing Konten: {certificateTemplate.contentSpacing}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={certificateTemplate.contentSpacing}
                          onChange={(e) => setCertificateTemplate({...certificateTemplate, contentSpacing: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Color Pickers */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Warna
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Warna Utama</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={certificateTemplate.primaryColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, primaryColor: e.target.value})}
                              className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateTemplate.primaryColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, primaryColor: e.target.value})}
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                              placeholder="#1a1a1a"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Warna Aksen</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={certificateTemplate.accentColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, accentColor: e.target.value})}
                              className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateTemplate.accentColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, accentColor: e.target.value})}
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                              placeholder="#d4af37"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Warna Teks</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={certificateTemplate.textColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, textColor: e.target.value})}
                              className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateTemplate.textColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, textColor: e.target.value})}
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                              placeholder="#4a4a4a"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Warna Background</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={certificateTemplate.backgroundColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, backgroundColor: e.target.value})}
                              className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={certificateTemplate.backgroundColor}
                              onChange={(e) => setCertificateTemplate({...certificateTemplate, backgroundColor: e.target.value})}
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                              placeholder="#fefefe"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="sticky top-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview Live
                    </label>
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                      <div className="transform scale-[0.65] origin-top-left" style={{ width: '153.85%' }}>
                        <CertificatePreview template={certificateTemplate} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Preview update real-time saat Anda mengubah pengaturan
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : selectedEvent ? (
            /* Participants List and Certificate Generation */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-black">{selectedEvent.title}</h2>
                  <p className="text-gray-600 mt-1">
                    {participants.length} peserta terdaftar
                  </p>
                </div>
                {participants.length > 0 && (
                  <button
                    onClick={generateAllCertificates}
                    className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Award className="w-5 h-5" />
                    Generate Semua Sertifikat
                  </button>
                )}
              </div>

              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">Belum Ada Peserta</h3>
                  <p className="text-gray-500">Belum ada peserta yang terdaftar untuk event ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Nama Peserta
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Tanggal Daftar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {participants.map((participant) => (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-black">
                              {participant.full_name || participant.user_name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {participant.email || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {participant.created_at 
                                ? new Date(participant.created_at).toLocaleDateString('id-ID')
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => generateCertificate(participant)}
                              className="text-black hover:text-gray-700 font-semibold flex items-center gap-1"
                            >
                              <Award className="w-4 h-4" />
                              Buat Sertifikat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* No Event Selected */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Award className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">Pilih Event</h3>
              <p className="text-gray-500">
                Pilih event dari daftar di sebelah kiri untuk mulai mengelola sertifikat peserta.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Generate Certificate Confirmation Modal */}
      <ConfirmModal
        isOpen={generateConfirm.show}
        onClose={() => setGenerateConfirm({ show: false, participant: null })}
        onConfirm={confirmGenerate}
        title="Buat Sertifikat"
        message={`Buat sertifikat untuk ${generateConfirm.participant?.full_name || generateConfirm.participant?.user_name || 'peserta ini'}?`}
        confirmText="Ya, Buat"
        cancelText="Batal"
        type="info"
      />

      {/* Bulk Generate Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkGenerateConfirm}
        onClose={() => setBulkGenerateConfirm(false)}
        onConfirm={confirmBulkGenerate}
        title="Buat Semua Sertifikat"
        message={`Buat sertifikat untuk semua ${participants.length} peserta dari event "${selectedEvent?.title}"?`}
        confirmText="Ya, Buat Semua"
        cancelText="Batal"
        type="warning"
      />
    </div>
  );
};

export default CertificateManagement;
