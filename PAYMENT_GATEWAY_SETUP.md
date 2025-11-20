# 💳 Payment Gateway Setup - Midtrans Sandbox

## Overview
Sistem payment gateway menggunakan **Midtrans Snap** untuk event berbayar. Midtrans adalah payment gateway terkemuka di Indonesia yang mendukung berbagai metode pembayaran.

## 🔧 Setup Configuration

### 1. Daftar Akun Midtrans Sandbox
1. Kunjungi: https://dashboard.midtrans.com/
2. Daftar akun baru atau login
3. Pilih **Sandbox Mode** (untuk testing)
4. Dapatkan **Server Key** dan **Client Key** dari dashboard

### 2. Update Environment Variables
Edit file `server/config.env`:

```env
# Midtrans Payment Gateway
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx
```

**Penting:** 
- Ganti `xxxxxxxxxxxxx` dengan key yang Anda dapatkan dari Midtrans Dashboard
- Server Key digunakan di backend (jangan di-share)
- Client Key digunakan di frontend (aman untuk di-share)

### 3. Restart Server
Setelah update config, restart server:
```bash
cd server
npm start
```

## 🧪 Testing Payment

### Test Cards (Sandbox Mode)
Midtrans menyediakan kartu test untuk berbagai skenario:

#### ✅ Success Cards
- **Visa**: `4811111111111114`
- **Mastercard**: `5211111111111117`
- **BCA Virtual Account**: Pilih BCA saat checkout
- **Mandiri Virtual Account**: Pilih Mandiri saat checkout

#### ⏳ Pending Cards
- **Visa**: `4111111111111111`
- **Mastercard**: `5111111111111118`

#### ❌ Failed Cards
- **Visa**: `4911111111111113`
- **Mastercard**: `5311111111111115`

### Test Data
- **CVV**: `123` (untuk semua kartu)
- **Expiry Date**: `12/25` atau tanggal masa depan
- **3D Secure Password**: `112233` (jika diminta)

## 📋 Flow Pembayaran

### 1. User Register Event Berbayar
- User klik "Daftar" pada event berbayar
- Sistem membuat registrasi dengan status `pending`
- Sistem membuat payment transaction di Midtrans

### 2. Payment Popup
- Midtrans Snap popup muncul
- User pilih metode pembayaran
- User selesaikan pembayaran

### 3. Payment Callback
- **Success**: Redirect ke `/payment/success`
- **Pending**: Redirect ke `/payment/pending`
- **Error**: Redirect ke `/payment/error`

### 4. Webhook Notification
- Midtrans mengirim notification ke backend
- Backend update status payment dan registration
- Token kehadiran dikirim ke email user

## 🔗 API Endpoints

### Create Payment Transaction
```
POST /api/payments/create-transaction
Body: {
  event_id: number,
  registration_id?: number
}
```

### Payment Status
```
GET /api/payments/status/:orderId
```

### Verify Payment
```
POST /api/payments/verify/:orderId
```

### Payment History
```
GET /api/payments/history
```

### Webhook Notification (Midtrans)
```
POST /api/payments/notification
```

## 🛠️ Troubleshooting

### Payment Popup Tidak Muncul
1. Cek console browser untuk error
2. Pastikan Midtrans Snap.js sudah ter-load
3. Cek Client Key di `config.env`
4. Pastikan menggunakan HTTPS atau localhost

### Payment Status Tidak Update
1. Cek webhook URL di Midtrans Dashboard
2. Pastikan webhook URL accessible dari internet (gunakan ngrok untuk local)
3. Cek server logs untuk notification dari Midtrans

### Error "Invalid Server Key"
1. Pastikan Server Key benar di `config.env`
2. Pastikan menggunakan Sandbox key (bukan Production)
3. Restart server setelah update config

## 📝 Notes

- **Sandbox Mode**: Semua transaksi adalah dummy, tidak ada uang real yang terpotong
- **Production Mode**: Ganti `isProduction: false` menjadi `true` di `server/routes/payments.js`
- **Webhook URL**: Untuk production, set webhook URL di Midtrans Dashboard ke: `https://yourdomain.com/api/payments/notification`

## 🔐 Security

- **Server Key**: JANGAN pernah commit ke git atau expose ke frontend
- **Client Key**: Aman untuk digunakan di frontend
- **HTTPS**: Wajib untuk production (Midtrans require HTTPS)

## 📚 Resources

- [Midtrans Documentation](https://docs.midtrans.com/)
- [Midtrans Snap Integration](https://snap-docs.midtrans.com/)
- [Midtrans Sandbox Dashboard](https://dashboard.sandbox.midtrans.com/)

