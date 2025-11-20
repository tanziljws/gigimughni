import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowRight, Home, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import Footer from '../../components/Footer';

const PaymentErrorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await api.get(`/payments/status/${orderId}`);
      const data = response?.data || response;
      setPaymentData(data);
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Pembayaran Gagal ❌
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Maaf, pembayaran Anda gagal diproses. Silakan coba lagi atau gunakan metode pembayaran lain.
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
                  <span className="font-semibold text-red-600">
                    Rp {parseFloat(paymentData.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    Gagal
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 text-left rounded">
            <p className="text-sm text-red-800">
              <strong>Tips:</strong> Pastikan saldo atau limit kartu Anda mencukupi. 
              Jika masalah berlanjut, silakan hubungi customer service atau gunakan metode pembayaran lain.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <RefreshCw className="w-5 h-5" />
              Coba Lagi
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

export default PaymentErrorPage;

