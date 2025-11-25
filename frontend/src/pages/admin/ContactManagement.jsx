import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Search, Filter, Eye, Reply, CheckCircle, XCircle, Clock, MessageSquare, User, Phone, Calendar } from 'lucide-react';
import { contactsAPI } from '../../services/api';

const ContactManagement = () => {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchContacts();
  }, [filters, pagination.page]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (filters.status) params.status = filters.status;
      
      const response = await contactsAPI.getAll(params);
      setContacts(response.data.contacts || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.show('Gagal memuat data kontak', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewContact = async (contact) => {
    try {
      const response = await contactsAPI.getById(contact.id);
      setSelectedContact(response.data);
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast.error('Gagal memuat detail kontak');
    }
  };

  const handleStatusChange = async (contactId, newStatus) => {
    try {
      await contactsAPI.updateStatus(contactId, newStatus);
      toast.success('Status berhasil diubah');
      fetchContacts();
      if (selectedContact && selectedContact.id === contactId) {
        setSelectedContact({ ...selectedContact, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal mengubah status');
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Pesan balasan tidak boleh kosong');
      return;
    }

    try {
      setReplying(true);
      const response = await contactsAPI.reply(selectedContact.id, replyMessage);
      
      // Check if email was sent successfully
      if (response.data?.email_sent) {
        toast.success('✅ Balasan berhasil dikirim dan email telah terkirim ke user!');
      } else {
        toast.warning('⚠️ Balasan berhasil disimpan, namun email gagal terkirim. Silakan cek konfigurasi SMTP.');
      }
      
      setShowReplyModal(false);
      setReplyMessage('');
      fetchContacts();
      if (selectedContact) {
        const updated = await contactsAPI.getById(selectedContact.id);
        setSelectedContact(updated.data);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Gagal mengirim balasan';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setReplying(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { icon: Clock, color: 'bg-blue-100 text-blue-800', label: 'Baru' },
      read: { icon: Eye, color: 'bg-yellow-100 text-yellow-800', label: 'Dibaca' },
      replied: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Dibalas' },
      closed: { icon: XCircle, color: 'bg-gray-100 text-gray-800', label: 'Ditutup' }
    };
    const badge = badges[status] || badges.new;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !filters.search || 
      contact.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      contact.subject.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    new: contacts.filter(c => c.status === 'new').length,
    read: contacts.filter(c => c.status === 'read').length,
    replied: contacts.filter(c => c.status === 'replied').length,
    total: contacts.length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pesan Baru</p>
              <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Dibaca</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.read}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Dibalas</p>
              <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, email, atau subjek..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
            >
              <option value="">Semua Status</option>
              <option value="new">Baru</option>
              <option value="read">Dibaca</option>
              <option value="replied">Dibalas</option>
              <option value="closed">Ditutup</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data kontak...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Tidak ada kontak ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pengirim</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subjek</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-500">{contact.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{contact.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(contact.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contact.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewContact(contact)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {contact.status !== 'replied' && (
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowReplyModal(true);
                            }}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Balas"
                          >
                            <Reply className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Contact Modal */}
      {selectedContact && !showReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  Detail Pesan
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedContact.subject}
                </p>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <User className="w-4 h-4" />
                    Nama
                  </div>
                  <div className="font-semibold text-gray-900">{selectedContact.name}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                  <div className="font-semibold text-gray-900">{selectedContact.email}</div>
                </div>
                {selectedContact.phone && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Phone className="w-4 h-4" />
                      Telepon
                    </div>
                    <div className="font-semibold text-gray-900">{selectedContact.phone}</div>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    Tanggal
                  </div>
                  <div className="font-semibold text-gray-900">
                    {new Date(selectedContact.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">Status: </span>
                  {getStatusBadge(selectedContact.status)}
                </div>
                <select
                  value={selectedContact.status}
                  onChange={(e) => handleStatusChange(selectedContact.id, e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="new">Baru</option>
                  <option value="read">Dibaca</option>
                  <option value="replied">Dibalas</option>
                  <option value="closed">Ditutup</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Pesan:</h3>
                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-900">
                  {selectedContact.message}
                </div>
              </div>

              {/* Reply */}
              {selectedContact.reply_message && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Balasan:</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 whitespace-pre-wrap text-gray-900">
                    {selectedContact.reply_message}
                  </div>
                  {selectedContact.replied_by_name && (
                    <p className="text-xs text-gray-500 mt-2">
                      Dibalas oleh {selectedContact.replied_by_name} pada {selectedContact.replied_at ? new Date(selectedContact.replied_at).toLocaleString('id-ID') : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-gray-200 flex items-center justify-end gap-3">
              {selectedContact.status !== 'replied' && (
                <button
                  onClick={() => setShowReplyModal(true)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Reply className="w-4 h-4" />
                  Balas Pesan
                </button>
              )}
              <button
                onClick={() => setSelectedContact(null)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Reply className="w-5 h-5 text-green-600" />
                  Balas Pesan
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Kepada: {selectedContact.name} ({selectedContact.email})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyMessage('');
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjek Asli:
                </label>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-900">
                  {selectedContact.subject}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pesan Asli:
                </label>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm max-h-32 overflow-y-auto">
                  {selectedContact.message}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Balasan Anda: *
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  placeholder="Tulis balasan Anda di sini..."
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyMessage('');
                }}
                disabled={replying}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleReply}
                disabled={replying || !replyMessage.trim()}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {replying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Reply className="w-4 h-4" />
                    Kirim Balasan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManagement;



