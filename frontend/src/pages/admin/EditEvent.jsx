import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { Save, ArrowLeft, Calendar, MapPin, Users, DollarSign, Image as ImageIcon } from 'lucide-react';
import api, { BACKEND_BASE_URL } from '../../services/api';

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    event_date: '',
    event_time: '',
    end_date: '',
    end_time: '',
    location: '',
    is_online: false,
    address: '',
    city: '',
    province: '',
    category_id: '',
    max_participants: '50',
    price: '0', // FIX: Changed from registration_fee to price
    registration_deadline: '',
    status: 'published',
    tags: '',
    is_free: false,
    is_active: true,
    unlimited_participants: false,
    image: null,
    image_aspect_ratio: '16:9'
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [performers, setPerformers] = useState([]);
  const [performerInputs, setPerformerInputs] = useState([{ id: null, name: '', photo: null, photoPreview: null, existingPhotoUrl: null }]);
  const [deletedPerformerIds, setDeletedPerformerIds] = useState([]);

  useEffect(() => {
    fetchEvent();
    fetchCategories();
    fetchPerformers();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${id}`);
      console.log('Event response:', response.data);
      
      // Handle different response structures
      const event = response.data.event || response.data.data || response.data;
      
      if (!event || !event.id) {
        throw new Error('Event not found');
      }
      
      // Format dates for input fields (date + time combined)
      const formatDateTimeForInput = (dateString, timeString) => {
        if (!dateString) return '';
        try {
          // If timeString is provided, combine date and time
          if (timeString) {
            const date = dateString.split('T')[0]; // Get date part
            return `${date}T${timeString}`;
          }
          // Otherwise use the full datetime
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
        } catch (e) {
          console.error('Date format error:', e);
          return '';
        }
      };

      console.log('Event data from API:', event);

      setFormData({
        title: event.title || '',
        description: event.description || '',
        short_description: event.short_description || '',
        event_date: formatDateTimeForInput(event.event_date, event.event_time),
        event_time: event.event_time || '',
        end_date: formatDateTimeForInput(event.end_date, event.end_time),
        end_time: event.end_time || '',
        location: event.location || '',
        is_online: event.is_online || false,
        address: event.address || '',
        city: event.city || '',
        province: event.province || '',
        category_id: event.category_id || '',
        max_participants: event.max_participants?.toString() || '50',
        price: event.price?.toString() || '0', // FIX: Use 'price' not 'registration_fee'
        registration_deadline: formatDateTimeForInput(event.registration_deadline),
        status: event.status || 'published',
        tags: event.tags || '',
        is_free: event.is_free || event.price === 0 || false,
        unlimited_participants: event.unlimited_participants || false,
        is_active: event.is_active !== undefined ? event.is_active : true,
        image: null,
        image_aspect_ratio: event.image_aspect_ratio || '16:9'
      });

      if (event.image_url) {
        setCurrentImage(`${BACKEND_BASE_URL}${event.image_url}`);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Gagal memuat data event: ${error.response?.data?.message || error.message}`);
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar! Maksimal 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar!');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const fetchPerformers = async () => {
    try {
      const response = await api.get(`/performers/event/${id}`);
      const fetchedPerformers = response.data.performers || [];
      setPerformers(fetchedPerformers);
      
      if (fetchedPerformers.length > 0) {
        setPerformerInputs(fetchedPerformers.map(p => ({
          id: p.id,
          name: p.name,
          photo: null,
          photoPreview: null,
          existingPhotoUrl: p.photo_url
        })));
      }
    } catch (error) {
      console.error('Error fetching performers:', error);
    }
  };

  const addPerformerInput = () => {
    setPerformerInputs([...performerInputs, { id: null, name: '', photo: null, photoPreview: null, existingPhotoUrl: null }]);
  };

  const removePerformerInput = (index) => {
    const performer = performerInputs[index];
    if (performer.id) {
      setDeletedPerformerIds([...deletedPerformerIds, performer.id]);
    }
    const newInputs = performerInputs.filter((_, i) => i !== index);
    setPerformerInputs(newInputs.length > 0 ? newInputs : [{ id: null, name: '', photo: null, photoPreview: null, existingPhotoUrl: null }]);
  };

  const handlePerformerNameChange = (index, name) => {
    const newInputs = [...performerInputs];
    newInputs[index].name = name;
    setPerformerInputs(newInputs);
  };

  const handlePerformerPhotoChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar! Maksimal 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar!');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const newInputs = [...performerInputs];
        newInputs[index].photo = file;
        newInputs[index].photoPreview = reader.result;
        setPerformerInputs(newInputs);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePerformerPhoto = (index) => {
    const newInputs = [...performerInputs];
    newInputs[index].photo = null;
    newInputs[index].photoPreview = null;
    setPerformerInputs(newInputs);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      console.log('=== FRONTEND: Starting update ===');
      console.log('Form data:', formData);

      // Validate H-3 rule: Event must be at least 3 days in the future
      const minAdvanceDays = 3;
      const now = new Date();
      const minDate = new Date(now.getTime() + (minAdvanceDays * 24 * 60 * 60 * 1000));
      minDate.setHours(0, 0, 0, 0);
      
      const eventDate = new Date(formData.event_date);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate < minDate) {
        const minDateFormatted = minDate.toLocaleDateString('id-ID', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
        toast.error(
          `Event hanya dapat dibuat minimal ${minAdvanceDays} hari sebelum tanggal event (H-${minAdvanceDays}). ` +
          `Tanggal event paling awal yang bisa dibuat: ${minDateFormatted}`
        );
        setSaving(false);
        return;
      }

      const submitData = new FormData();
      
      // Split datetime-local into date and time
      const extractDateTime = (datetimeLocal) => {
        if (!datetimeLocal) return { date: '', time: '00:00' };
        const parts = datetimeLocal.split('T');
        return { date: parts[0] || '', time: parts[1] || '00:00' };
      };

      const eventDT = extractDateTime(formData.event_date);
      const endDT = extractDateTime(formData.end_date);

      // Only send fields that have values
      const fieldsToSend = {
        title: formData.title,
        description: formData.description,
        short_description: formData.short_description || '',
        event_date: eventDT.date,
        event_time: eventDT.time,
        end_date: endDT.date || eventDT.date,
        end_time: endDT.time || eventDT.time,
        location: formData.location,
        address: formData.address || '',
        city: formData.city || '',
        province: formData.province || '',
        category_id: formData.category_id,
        max_participants: formData.max_participants || '50',
        price: formData.price || '0',
        is_free: formData.is_free ? '1' : '0',
        is_active: formData.is_active ? '1' : '0',
        status: formData.status || 'published',
        image_aspect_ratio: formData.image_aspect_ratio || '16:9'
      };

      console.log('Fields to send:', fieldsToSend);

      // Add all fields to FormData
      Object.entries(fieldsToSend).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          submitData.append(key, value);
        }
      });

      // Add image if uploaded
      if (formData.image) {
        submitData.append('image', formData.image);
        console.log('Image file added:', formData.image.name);
      }

      console.log('FormData entries:', Array.from(submitData.entries()));

      console.log('Sending PUT request to:', `/events/${id}`);
      const response = await api.put(`/events/${id}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Update response:', response.data);

      // Delete removed performers
      for (const performerId of deletedPerformerIds) {
        try {
          await api.delete(`/performers/${performerId}`);
        } catch (err) {
          console.error('Error deleting performer:', err);
        }
      }

      // Update/Create performers
      const validPerformers = performerInputs.filter(p => p.name.trim() !== '');
      for (let i = 0; i < validPerformers.length; i++) {
        const performer = validPerformers[i];
        const performerData = new FormData();
        performerData.append('name', performer.name);
        performerData.append('display_order', i);
        
        if (performer.photo) {
          performerData.append('photo', performer.photo);
        }
        
        try {
          if (performer.id) {
            await api.put(`/performers/${performer.id}`, performerData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } else {
            performerData.append('event_id', id);
            await api.post('/performers', performerData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          }
        } catch (err) {
          console.error('Error saving performer:', err);
        }
      }

      console.log('=== UPDATE COMPLETE ===');
      toast.success('✅ Event berhasil diupdate!');
      
      // Navigate with refresh state after small delay to show toast
      setTimeout(() => {
        navigate('/admin/events', { state: { refresh: true }, replace: true });
      }, 500);
      
    } catch (error) {
      console.error('❌ Error updating event:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('❌ Gagal update: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/events')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Events
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <p className="text-gray-600 mt-2">Update informasi event</p>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdateEvent} className="bg-white rounded-xl shadow-lg p-8">
          {/* Judul Event */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Judul Event <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Masukkan judul event yang menarik"
              required
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Deskripsi Singkat */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              name="short_description"
              value={formData.short_description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ringkasan 1-2 kalimat untuk kartu event"
              maxLength="200"
            />
            <p className="text-xs text-gray-500 mt-1">Maksimal 200 karakter</p>
          </div>

          {/* Deskripsi Event */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deskripsi Event <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Deskripsikan event Anda secara detail..."
              required
            ></textarea>
          </div>

          {/* Foto Event */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Foto Event
            </label>
            
            {/* Current Image */}
            {currentImage && !imagePreview && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Foto saat ini:</p>
                <img 
                  src={currentImage} 
                  alt="Current event" 
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}

            {/* New Image Preview */}
            {imagePreview && (
              <div className="mb-4 relative">
                <p className="text-sm text-gray-600 mb-2">Foto baru:</p>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-8 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {imagePreview ? 'Foto baru akan mengganti foto lama' : 'Upload foto baru jika ingin mengubah (Maksimal 5MB)'}
            </p>
            
            {/* Aspect Ratio Selector */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Aspect Ratio Foto Card
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image_aspect_ratio: '9:16' }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.image_aspect_ratio === '9:16'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-20 rounded border-2 ${
                      formData.image_aspect_ratio === '9:16' ? 'border-purple-500 bg-purple-100' : 'border-gray-300 bg-gray-100'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      formData.image_aspect_ratio === '9:16' ? 'text-purple-600' : 'text-gray-700'
                    }`}>9:16 Portrait</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image_aspect_ratio: '1:1' }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.image_aspect_ratio === '1:1'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-16 h-16 rounded border-2 ${
                      formData.image_aspect_ratio === '1:1' ? 'border-purple-500 bg-purple-100' : 'border-gray-300 bg-gray-100'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      formData.image_aspect_ratio === '1:1' ? 'text-purple-600' : 'text-gray-700'
                    }`}>1:1 Square</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image_aspect_ratio: '16:9' }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.image_aspect_ratio === '16:9'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-20 h-12 rounded border-2 ${
                      formData.image_aspect_ratio === '16:9' ? 'border-purple-500 bg-purple-100' : 'border-gray-300 bg-gray-100'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      formData.image_aspect_ratio === '16:9' ? 'text-purple-600' : 'text-gray-700'
                    }`}>16:9 Landscape</span>
                  </div>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Pilih aspect ratio yang sesuai dengan desain foto event Anda
              </p>
            </div>
          </div>

          {/* Tanggal & Waktu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tanggal & Waktu Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="event_date"
                value={formData.event_date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tanggal & Waktu Selesai
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Lokasi */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lokasi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Contoh: Gedung Serbaguna, Jakarta"
              required
            />
          </div>

          {/* Online Event */}
          <div className="mb-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_online"
                checked={formData.is_online}
                onChange={handleInputChange}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Event Online</span>
            </label>
          </div>

          {/* Kategori */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Pilih Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Kapasitas */}
          <div className="mb-6">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                name="unlimited_participants"
                checked={formData.unlimited_participants}
                onChange={handleInputChange}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Kapasitas Tidak Terbatas</span>
            </label>
            {!formData.unlimited_participants && (
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Maksimal peserta"
                min="1"
              />
            )}
          </div>

          {/* Biaya */}
          <div className="mb-6">
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                name="is_free"
                checked={formData.is_free}
                onChange={handleInputChange}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Event Gratis</span>
            </label>
            {!formData.is_free && (
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Biaya pendaftaran (Rp)"
                min="0"
              />
            )}
          </div>

          {/* Deadline Pendaftaran */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deadline Pendaftaran
            </label>
            <input
              type="datetime-local"
              name="registration_deadline"
              value={formData.registration_deadline}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Line-ups / Performers Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>🎤</span> Line-ups / Performers
                </h3>
                <p className="text-sm text-gray-600 mt-1">Kelola performer atau pembicara untuk event ini</p>
              </div>
              <button
                type="button"
                onClick={addPerformerInput}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Performer
              </button>
            </div>

            <div className="space-y-4">
              {performerInputs.map((performer, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* Photo Preview/Upload */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 bg-white">
                        {performer.photoPreview ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={performer.photoPreview} 
                              alt="Performer preview" 
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePerformerPhoto(index)}
                              className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : performer.existingPhotoUrl ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={`${BACKEND_BASE_URL}${performer.existingPhotoUrl}`} 
                              alt="Current performer" 
                              className="w-full h-full object-cover"
                            />
                            <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handlePerformerPhotoChange(index, e)}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                            <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-500 text-center px-1">Upload</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handlePerformerPhotoChange(index, e)}
                            />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">Max 5MB</p>
                    </div>

                    {/* Name Input */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nama Performer {index + 1} {performer.id && <span className="text-xs text-blue-600">(Existing)</span>}
                      </label>
                      <input
                        type="text"
                        value={performer.name}
                        onChange={(e) => handlePerformerNameChange(index, e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Nama performer atau pembicara"
                      />
                    </div>

                    {/* Remove Button */}
                    {performerInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePerformerInput(index)}
                        className="flex-shrink-0 mt-7 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        title="Hapus performer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {performerInputs.length === 0 && (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">Belum ada performer. Klik "Tambah Performer" untuk menambahkan.</p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status Event
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Update Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEvent;
