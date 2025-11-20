-- Migration: Insert dummy events for testing
-- Date: 2025-11-20
-- Description: Insert various dummy events with different categories, prices, and dates

-- Get admin user ID (assuming admin exists)
SET @admin_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1);
SET @category_tech = (SELECT id FROM categories WHERE name LIKE '%Tech%' OR name LIKE '%Teknologi%' LIMIT 1);
SET @category_business = (SELECT id FROM categories WHERE name LIKE '%Business%' OR name LIKE '%Bisnis%' LIMIT 1);
SET @category_education = (SELECT id FROM categories WHERE name LIKE '%Education%' OR name LIKE '%Pendidikan%' LIMIT 1);
SET @category_music = (SELECT id FROM categories WHERE name LIKE '%Music%' OR name LIKE '%Musik%' LIMIT 1);
SET @category_sports = (SELECT id FROM categories WHERE name LIKE '%Sport%' OR name LIKE '%Olahraga%' LIMIT 1);
SET @category_food = (SELECT id FROM categories WHERE name LIKE '%Food%' OR name LIKE '%Kuliner%' LIMIT 1);

-- If categories don't exist, use first available category
SET @category_tech = IFNULL(@category_tech, (SELECT id FROM categories LIMIT 1));
SET @category_business = IFNULL(@category_business, @category_tech);
SET @category_education = IFNULL(@category_education, @category_tech);
SET @category_music = IFNULL(@category_music, @category_tech);
SET @category_sports = IFNULL(@category_sports, @category_tech);
SET @category_food = IFNULL(@category_food, @category_tech);

-- If admin doesn't exist, use first user
SET @admin_id = IFNULL(@admin_id, (SELECT id FROM users LIMIT 1));

-- Insert dummy events
INSERT INTO events (
    title,
    description,
    short_description,
    category_id,
    organizer_id,
    event_date,
    event_time,
    end_date,
    end_time,
    location,
    address,
    city,
    province,
    max_participants,
    price,
    currency,
    is_free,
    is_active,
    status,
    is_featured,
    is_highlighted,
    has_certificate,
    registration_deadline
) VALUES

-- Event 1: Free Tech Workshop
(
    'Workshop Full Stack Development dengan React & Node.js',
    'Pelajari cara membangun aplikasi web full stack dari nol menggunakan React untuk frontend dan Node.js untuk backend. Workshop ini cocok untuk pemula yang ingin memulai karir sebagai web developer. Materi meliputi: setup development environment, RESTful API, database integration, authentication, dan deployment.',
    'Workshop lengkap untuk belajar full stack development dengan React dan Node.js dari dasar hingga deployment.',
    @category_tech,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 15 DAY),
    '09:00:00',
    DATE_ADD(CURDATE(), INTERVAL 15 DAY),
    '17:00:00',
    'CoWorking Space Jakarta',
    'Jl. Sudirman No. 123, Jakarta Pusat',
    'Jakarta',
    'DKI Jakarta',
    50,
    0.00,
    'IDR',
    TRUE,
    TRUE,
    'published',
    TRUE,
    FALSE,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL 12 DAY)
),

-- Event 2: Paid Business Conference
(
    'Indonesia Startup Summit 2025',
    'Konferensi terbesar untuk startup dan entrepreneur di Indonesia. Menghadirkan founder dari unicorn Indonesia, investor venture capital, dan mentor bisnis terkemuka. Topik pembahasan: fundraising, scaling business, digital transformation, dan market expansion. Termasuk networking session dengan investor dan startup founder.',
    'Konferensi startup terbesar dengan founder unicorn, investor VC, dan mentor bisnis terkemuka.',
    @category_business,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    '08:00:00',
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    '18:00:00',
    'Grand Ballroom Hotel Indonesia',
    'Jl. MH Thamrin No. 1, Jakarta Pusat',
    'Jakarta',
    'DKI Jakarta',
    500,
    500000.00,
    'IDR',
    FALSE,
    TRUE,
    'published',
    TRUE,
    TRUE,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL 25 DAY)
),

-- Event 3: Free Education Seminar
(
    'Seminar "Cara Sukses Masuk PTN Favorit"',
    'Seminar khusus untuk siswa SMA/SMK yang ingin masuk PTN favorit. Dibawakan oleh alumni UI, ITB, UGM, dan IPB. Materi: strategi belajar efektif, tips menghadapi UTBK, memilih jurusan yang tepat, dan persiapan mental. Termasuk sesi tanya jawab dan konsultasi personal.',
    'Seminar strategi masuk PTN favorit dengan alumni UI, ITB, UGM, dan IPB.',
    @category_education,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 20 DAY),
    '13:00:00',
    DATE_ADD(CURDATE(), INTERVAL 20 DAY),
    '17:00:00',
    'Aula SMA Negeri 1 Jakarta',
    'Jl. Budi Utomo No. 7, Jakarta Pusat',
    'Jakarta',
    'DKI Jakarta',
    200,
    0.00,
    'IDR',
    TRUE,
    TRUE,
    'published',
    FALSE,
    FALSE,
    FALSE,
    DATE_ADD(CURDATE(), INTERVAL 18 DAY)
),

-- Event 4: Paid Music Concert
(
    'Jazz Night: Live Performance by Indonesian Jazz Legends',
    'Konser jazz malam yang menampilkan legenda jazz Indonesia. Menampilkan: Indra Lesmana, Tohpati, Dewa Budjana, dan musisi jazz terkemuka lainnya. Acara ini akan menjadi momen spesial untuk para pecinta jazz. Tiket terbatas!',
    'Konser jazz malam dengan legenda jazz Indonesia: Indra Lesmana, Tohpati, Dewa Budjana.',
    @category_music,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 25 DAY),
    '19:00:00',
    DATE_ADD(CURDATE(), INTERVAL 25 DAY),
    '23:00:00',
    'Teater Jakarta',
    'Jl. Cikini Raya No. 73, Menteng, Jakarta Pusat',
    'Jakarta',
    'DKI Jakarta',
    300,
    350000.00,
    'IDR',
    FALSE,
    TRUE,
    'published',
    TRUE,
    FALSE,
    FALSE,
    DATE_ADD(CURDATE(), INTERVAL 20 DAY)
),

-- Event 5: Free Sports Event
(
    'Fun Run 5K "Run for Education"',
    'Lari santai 5K untuk mengumpulkan donasi pendidikan. Acara ini terbuka untuk semua usia dan tingkat kebugaran. Setiap peserta akan mendapatkan goodie bag, medali finisher, dan sertifikat. Hasil donasi akan disumbangkan untuk beasiswa siswa kurang mampu.',
    'Lari santai 5K untuk mengumpulkan donasi pendidikan. Terbuka untuk semua usia.',
    @category_sports,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 18 DAY),
    '06:00:00',
    DATE_ADD(CURDATE(), INTERVAL 18 DAY),
    '09:00:00',
    'Lapangan Monas',
    'Jl. Medan Merdeka Utara, Jakarta Pusat',
    'Jakarta',
    'DKI Jakarta',
    1000,
    0.00,
    'IDR',
    TRUE,
    TRUE,
    'published',
    FALSE,
    FALSE,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL 15 DAY)
),

-- Event 6: Paid Food Festival
(
    'Jakarta Food Festival 2025',
    'Festival kuliner terbesar di Jakarta yang menampilkan berbagai makanan tradisional dan modern dari seluruh Indonesia. Lebih dari 100 stand makanan, cooking demo oleh chef terkenal, food competition, dan live music. Jangan lewatkan!',
    'Festival kuliner terbesar dengan 100+ stand makanan tradisional dan modern dari seluruh Indonesia.',
    @category_food,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 22 DAY),
    '10:00:00',
    DATE_ADD(CURDATE(), INTERVAL 24 DAY),
    '22:00:00',
    'Lapangan Banteng',
    'Jl. Lapangan Banteng Timur, Jakarta Pusat',
    'Jakarta',
    'DKI Jakarta',
    5000,
    50000.00,
    'IDR',
    FALSE,
    TRUE,
    'published',
    TRUE,
    FALSE,
    FALSE,
    DATE_ADD(CURDATE(), INTERVAL 20 DAY)
),

-- Event 7: Free Tech Meetup
(
    'Tech Meetup: AI & Machine Learning untuk Pemula',
    'Meetup bulanan untuk developer yang ingin belajar AI dan Machine Learning. Sesi ini akan membahas: pengenalan AI/ML, tools yang digunakan, case study implementasi, dan Q&A session. Cocok untuk pemula yang baru mulai belajar AI/ML.',
    'Meetup bulanan untuk belajar AI dan Machine Learning dari dasar dengan case study implementasi.',
    @category_tech,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 10 DAY),
    '19:00:00',
    DATE_ADD(CURDATE(), INTERVAL 10 DAY),
    '21:00:00',
    'Google Developer Space Jakarta',
    'Jl. Asia Afrika No. 8, Jakarta Pusat',
    'Jakarta',
    'DKI Jakarta',
    100,
    0.00,
    'IDR',
    TRUE,
    TRUE,
    'published',
    FALSE,
    FALSE,
    FALSE,
    DATE_ADD(CURDATE(), INTERVAL 8 DAY)
),

-- Event 8: Paid Business Workshop
(
    'Workshop "Digital Marketing untuk UMKM"',
    'Workshop praktis untuk pemilik UMKM yang ingin meningkatkan penjualan melalui digital marketing. Materi: social media marketing, Google Ads, content marketing, e-commerce, dan analitik. Termasuk hands-on practice dan konsultasi bisnis gratis.',
    'Workshop praktis digital marketing untuk UMKM dengan hands-on practice dan konsultasi bisnis.',
    @category_business,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 28 DAY),
    '09:00:00',
    DATE_ADD(CURDATE(), INTERVAL 28 DAY),
    '16:00:00',
    'Ruang Seminar Business Center',
    'Jl. HR Rasuna Said, Kuningan, Jakarta Selatan',
    'Jakarta',
    'DKI Jakarta',
    80,
    200000.00,
    'IDR',
    FALSE,
    TRUE,
    'published',
    FALSE,
    FALSE,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL 25 DAY)
),

-- Event 9: Free Education Webinar
(
    'Webinar "Strategi Belajar Efektif di Era Digital"',
    'Webinar online gratis untuk siswa, mahasiswa, dan orang tua. Membahas strategi belajar efektif menggunakan teknologi digital, manajemen waktu, teknik menghafal, dan tips menghadapi ujian. Termasuk sesi tanya jawab interaktif.',
    'Webinar gratis tentang strategi belajar efektif di era digital untuk siswa dan mahasiswa.',
    @category_education,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 12 DAY),
    '14:00:00',
    DATE_ADD(CURDATE(), INTERVAL 12 DAY),
    '16:00:00',
    'Online (Zoom)',
    'Link akan dikirim via email setelah registrasi',
    'Jakarta',
    'DKI Jakarta',
    500,
    0.00,
    'IDR',
    TRUE,
    TRUE,
    'published',
    FALSE,
    FALSE,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL 10 DAY)
),

-- Event 10: Paid Tech Bootcamp
(
    'Data Science Bootcamp: Python & Machine Learning',
    'Bootcamp intensif 3 hari untuk belajar Data Science dari dasar. Materi: Python programming, data analysis dengan Pandas, visualization dengan Matplotlib, machine learning dengan Scikit-learn, dan project akhir. Cocok untuk yang ingin switch career ke Data Science.',
    'Bootcamp intensif 3 hari untuk belajar Data Science dengan Python dan Machine Learning.',
    @category_tech,
    @admin_id,
    DATE_ADD(CURDATE(), INTERVAL 35 DAY),
    '09:00:00',
    DATE_ADD(CURDATE(), INTERVAL 37 DAY),
    '17:00:00',
    'Tech Academy Jakarta',
    'Jl. Kemang Raya No. 45, Jakarta Selatan',
    'Jakarta',
    'DKI Jakarta',
    30,
    2500000.00,
    'IDR',
    FALSE,
    TRUE,
    'published',
    TRUE,
    TRUE,
    TRUE,
    DATE_ADD(CURDATE(), INTERVAL 30 DAY)
);

-- Verify inserted events
SELECT 
    id,
    title,
    event_date,
    price,
    is_free,
    status,
    is_featured
FROM events 
WHERE id > (SELECT MAX(id) - 10 FROM events)
ORDER BY event_date ASC;

