import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, ArrowRight, Home, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import Footer from '../../components/Footer';

const PaymentPendingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (orderId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payments/status/${orderId}`);
      const data = response?.data || response;
      setPaymentData(data);
      
      // If payment is now successful, redirect to success page
      if (data.status === 'success') {
        navigate(`/payment/success?order_id=${orderId}`);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setChecking(true);
    try {
      await api.post(`/payments/verify/${orderId}`);
      // Re-check status
      await checkPaymentStatus();
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Gagal memverifikasi pembayaran. Silakan coba lagi.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Pending Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-12 h-12 text-yellow-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Menunggu Pembayaran ⏳
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Pembayaran Anda sedang diproses. Silakan selesaikan pembayaran sesuai metode yang Anda pilih.
          </p>

          {/* Payment Details */}
          {paymentData && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Detail Pembayaran</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono font-semibold text-gray-900">{paymentData.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Event:</span>
                  <span className="font-semibold text-gray-900">{paymentData.event_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jumlah:</span>
                  <span className="font-semibold text-yellow-600">
                    Rp {parseFloat(paymentData.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    Menunggu
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-8 text-left rounded">
            <p className="text-sm text-yellow-800">
              <strong>Catatan:</strong> Setelah pembayaran berhasil, registrasi Anda akan otomatis dikonfirmasi 
              dan token kehadiran akan dikirim ke email Anda.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleVerify}
              disabled={checking}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memverifikasi...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Verifikasi Pembayaran
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all"
            >
              <ArrowRight className="w-5 h-5" />
              Lihat Registrasi
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all"
            >
              <Home className="w-5 h-5" />
              Kembali ke Home
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentPendingPage;

