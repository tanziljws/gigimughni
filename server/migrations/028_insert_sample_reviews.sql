-- Migration: Insert sample reviews data
-- Date: 2025-11-10
-- Description: Insert approved reviews for testimonials section

-- Get first user ID (usually admin or first registered user)
SET @first_user_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1);

-- Insert sample reviews (using existing user IDs or first user)
INSERT INTO reviews (user_id, full_name, rating, comment, is_approved, is_verified, created_at) VALUES
(@first_user_id, 'Budi Santoso', 5, 'Platform terbaik untuk menemukan event! Saya sudah ikut 10+ event dan semuanya amazing. UI nya juga modern banget, mudah digunakan. Highly recommended!', TRUE, TRUE, '2024-11-05 10:30:00'),
(@first_user_id, 'Siti Nurhaliza', 5, 'Registrasi mudah, payment smooth, dan dapat sertifikat digital langsung. Sangat profesional! Customer service nya juga responsif banget.', TRUE, TRUE, '2024-11-04 14:20:00'),
(@first_user_id, 'Ahmad Rizki', 5, 'Event tech conference yang saya ikuti sangat berkualitas. Worth it banget dengan harga yang ditawarkan! Networking opportunities nya juga bagus.', TRUE, TRUE, '2024-11-03 09:15:00'),
(@first_user_id, 'Dewi Lestari', 5, 'Sistemnya user-friendly dan customer service nya responsif. Highly recommended untuk semua orang yang cari event berkualitas!', TRUE, TRUE, '2024-11-02 16:45:00'),
(@first_user_id, 'Rian Firmansyah', 4, 'Pengalaman yang menyenangkan! Event yang saya ikuti terorganisir dengan baik. Sertifikat digital juga langsung diterima setelah event selesai.', TRUE, TRUE, '2024-11-01 11:00:00'),
(@first_user_id, 'Lina Marlina', 5, 'Sebagai mahasiswa, Event Yukk sangat membantu saya menemukan workshop dan seminar yang relevan. Harganya juga terjangkau untuk pelajar!', TRUE, TRUE, '2024-10-31 13:30:00'),
(@first_user_id, 'Yoga Pratama', 5, 'Fitur pembayaran sangat aman dan mudah. Saya bisa bayar pakai berbagai metode. Prosesnya cepat dan langsung dapat konfirmasi!', TRUE, TRUE, '2024-10-30 08:20:00'),
(@first_user_id, 'Putri Amalia', 4, 'Event-event yang tersedia sangat beragam. Dari musik, teknologi, sampai kesehatan. Pasti ada yang cocok untuk semua orang!', TRUE, TRUE, '2024-10-29 15:10:00'),
(@first_user_id, 'Eko Prasetyo', 5, 'Saya organizer event, dan platform ini sangat memudahkan untuk manage peserta. Dashboard adminnya lengkap dan informatif!', TRUE, TRUE, '2024-10-28 12:00:00'),
(@first_user_id, 'Maya Sari', 5, 'Notifikasi reminder event nya sangat helpful! Tidak akan ketinggalan event yang sudah didaftar. Love it!', TRUE, TRUE, '2024-10-27 10:30:00'),
(@first_user_id, 'Dika Wahyudi', 4, 'Desain website nya modern dan eye-catching. Navigasi nya juga intuitif, mudah dicari event yang sesuai minat.', TRUE, TRUE, '2024-10-26 14:45:00'),
(@first_user_id, 'Nur Azizah', 5, 'Pengalaman terbaik dalam mendaftar event online! Proses cepat, aman, dan profesional. Keep up the good work!', TRUE, TRUE, '2024-10-25 09:30:00');
