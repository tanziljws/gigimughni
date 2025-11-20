/**
 * Script to manually insert dummy events
 * Run with: node server/scripts/insert-dummy-events.js
 */

require('dotenv').config({ path: './config.env' });
const { query } = require('../db');
const fs = require('fs');
const path = require('path');

async function insertDummyEvents() {
  try {
    console.log('🚀 Starting to insert dummy events...\n');

    // Get admin user ID
    const [adminUsers] = await query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    const adminId = adminUsers[0]?.id || 1;
    console.log(`✅ Admin ID: ${adminId}`);

    // Get category IDs
    const [categories] = await query('SELECT id, name FROM categories LIMIT 10');
    const categoryMap = {};
    categories.forEach(cat => {
      const name = cat.name.toLowerCase();
      if (name.includes('tech') || name.includes('teknologi')) categoryMap.tech = cat.id;
      if (name.includes('business') || name.includes('bisnis')) categoryMap.business = cat.id;
      if (name.includes('education') || name.includes('pendidikan')) categoryMap.education = cat.id;
      if (name.includes('music') || name.includes('musik')) categoryMap.music = cat.id;
      if (name.includes('sport') || name.includes('olahraga')) categoryMap.sports = cat.id;
      if (name.includes('food') || name.includes('kuliner')) categoryMap.food = cat.id;
    });

    // Use first category as fallback
    const defaultCategory = categories[0]?.id || 1;
    const techCategory = categoryMap.tech || defaultCategory;
    const businessCategory = categoryMap.business || defaultCategory;
    const educationCategory = categoryMap.education || defaultCategory;
    const musicCategory = categoryMap.music || defaultCategory;
    const sportsCategory = categoryMap.sports || defaultCategory;
    const foodCategory = categoryMap.food || defaultCategory;

    console.log(`✅ Categories: Tech=${techCategory}, Business=${businessCategory}, Education=${educationCategory}`);

    // Calculate dates (10-37 days from today)
    const today = new Date();
    const dates = {
      day10: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day12: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day15: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day18: new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day20: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day22: new Date(today.getTime() + 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day25: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day28: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day30: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      day35: new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    const events = [
      {
        title: 'Workshop Full Stack Development dengan React & Node.js',
        description: 'Pelajari cara membangun aplikasi web full stack dari nol menggunakan React untuk frontend dan Node.js untuk backend.',
        short_description: 'Workshop lengkap untuk belajar full stack development dengan React dan Node.js dari dasar hingga deployment.',
        category_id: techCategory,
        event_date: dates.day15,
        event_time: '09:00:00',
        end_date: dates.day15,
        end_time: '17:00:00',
        location: 'CoWorking Space Jakarta',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 50,
        price: 0,
        is_free: true,
        status: 'published',
        is_active: true,
        is_featured: true,
        is_highlighted: false,
        has_certificate: true,
        registration_deadline: dates.day12
      },
      {
        title: 'Indonesia Startup Summit 2025',
        description: 'Konferensi terbesar untuk startup dan entrepreneur di Indonesia. Menghadirkan founder dari unicorn Indonesia, investor venture capital, dan mentor bisnis terkemuka.',
        short_description: 'Konferensi startup terbesar dengan founder unicorn, investor VC, dan mentor bisnis terkemuka.',
        category_id: businessCategory,
        event_date: dates.day30,
        event_time: '08:00:00',
        end_date: dates.day30,
        end_time: '18:00:00',
        location: 'Grand Ballroom Hotel Indonesia',
        address: 'Jl. MH Thamrin No. 1, Jakarta Pusat',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 500,
        price: 500000,
        is_free: false,
        status: 'published',
        is_active: true,
        is_featured: true,
        is_highlighted: true,
        has_certificate: true,
        registration_deadline: dates.day25
      },
      {
        title: 'Seminar "Cara Sukses Masuk PTN Favorit"',
        description: 'Seminar khusus untuk siswa SMA/SMK yang ingin masuk PTN favorit. Dibawakan oleh alumni UI, ITB, UGM, dan IPB.',
        short_description: 'Seminar strategi masuk PTN favorit dengan alumni UI, ITB, UGM, dan IPB.',
        category_id: educationCategory,
        event_date: dates.day20,
        event_time: '13:00:00',
        end_date: dates.day20,
        end_time: '17:00:00',
        location: 'Aula SMA Negeri 1 Jakarta',
        address: 'Jl. Budi Utomo No. 7, Jakarta Pusat',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 200,
        price: 0,
        is_free: true,
        status: 'published',
        is_active: true,
        is_featured: false,
        is_highlighted: false,
        has_certificate: false,
        registration_deadline: dates.day18
      },
      {
        title: 'Jazz Night: Live Performance by Indonesian Jazz Legends',
        description: 'Konser jazz malam yang menampilkan legenda jazz Indonesia. Menampilkan: Indra Lesmana, Tohpati, Dewa Budjana, dan musisi jazz terkemuka lainnya.',
        short_description: 'Konser jazz malam dengan legenda jazz Indonesia: Indra Lesmana, Tohpati, Dewa Budjana.',
        category_id: musicCategory,
        event_date: dates.day25,
        event_time: '19:00:00',
        end_date: dates.day25,
        end_time: '23:00:00',
        location: 'Teater Jakarta',
        address: 'Jl. Cikini Raya No. 73, Menteng, Jakarta Pusat',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 300,
        price: 350000,
        is_free: false,
        status: 'published',
        is_active: true,
        is_featured: true,
        is_highlighted: false,
        has_certificate: false,
        registration_deadline: dates.day20
      },
      {
        title: 'Fun Run 5K "Run for Education"',
        description: 'Lari santai 5K untuk mengumpulkan donasi pendidikan. Acara ini terbuka untuk semua usia dan tingkat kebugaran.',
        short_description: 'Lari santai 5K untuk mengumpulkan donasi pendidikan. Terbuka untuk semua usia.',
        category_id: sportsCategory,
        event_date: dates.day18,
        event_time: '06:00:00',
        end_date: dates.day18,
        end_time: '09:00:00',
        location: 'Lapangan Monas',
        address: 'Jl. Medan Merdeka Utara, Jakarta Pusat',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 1000,
        price: 0,
        is_free: true,
        status: 'published',
        is_active: true,
        is_featured: false,
        is_highlighted: false,
        has_certificate: true,
        registration_deadline: dates.day15
      },
      {
        title: 'Jakarta Food Festival 2025',
        description: 'Festival kuliner terbesar di Jakarta yang menampilkan berbagai makanan tradisional dan modern dari seluruh Indonesia.',
        short_description: 'Festival kuliner terbesar dengan 100+ stand makanan tradisional dan modern dari seluruh Indonesia.',
        category_id: foodCategory,
        event_date: dates.day22,
        event_time: '10:00:00',
        end_date: dates.day22,
        end_time: '22:00:00',
        location: 'Lapangan Banteng',
        address: 'Jl. Lapangan Banteng Timur, Jakarta Pusat',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 5000,
        price: 50000,
        is_free: false,
        status: 'published',
        is_active: true,
        is_featured: true,
        is_highlighted: false,
        has_certificate: false,
        registration_deadline: dates.day20
      },
      {
        title: 'Tech Meetup: AI & Machine Learning untuk Pemula',
        description: 'Meetup bulanan untuk developer yang ingin belajar AI dan Machine Learning. Sesi ini akan membahas: pengenalan AI/ML, tools yang digunakan, case study implementasi.',
        short_description: 'Meetup bulanan untuk belajar AI dan Machine Learning dari dasar dengan case study implementasi.',
        category_id: techCategory,
        event_date: dates.day10,
        event_time: '19:00:00',
        end_date: dates.day10,
        end_time: '21:00:00',
        location: 'Google Developer Space Jakarta',
        address: 'Jl. Asia Afrika No. 8, Jakarta Pusat',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 100,
        price: 0,
        is_free: true,
        status: 'published',
        is_active: true,
        is_featured: false,
        is_highlighted: false,
        has_certificate: false,
        registration_deadline: dates.day8
      },
      {
        title: 'Workshop "Digital Marketing untuk UMKM"',
        description: 'Workshop praktis untuk pemilik UMKM yang ingin meningkatkan penjualan melalui digital marketing. Materi: social media marketing, Google Ads, content marketing.',
        short_description: 'Workshop praktis digital marketing untuk UMKM dengan hands-on practice dan konsultasi bisnis.',
        category_id: businessCategory,
        event_date: dates.day28,
        event_time: '09:00:00',
        end_date: dates.day28,
        end_time: '16:00:00',
        location: 'Ruang Seminar Business Center',
        address: 'Jl. HR Rasuna Said, Kuningan, Jakarta Selatan',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 80,
        price: 200000,
        is_free: false,
        status: 'published',
        is_active: true,
        is_featured: false,
        is_highlighted: false,
        has_certificate: true,
        registration_deadline: dates.day25
      },
      {
        title: 'Webinar "Strategi Belajar Efektif di Era Digital"',
        description: 'Webinar online gratis untuk siswa, mahasiswa, dan orang tua. Membahas strategi belajar efektif menggunakan teknologi digital, manajemen waktu, teknik menghafal.',
        short_description: 'Webinar gratis tentang strategi belajar efektif di era digital untuk siswa dan mahasiswa.',
        category_id: educationCategory,
        event_date: dates.day12,
        event_time: '14:00:00',
        end_date: dates.day12,
        end_time: '16:00:00',
        location: 'Online (Zoom)',
        address: 'Link akan dikirim via email setelah registrasi',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 500,
        price: 0,
        is_free: true,
        status: 'published',
        is_active: true,
        is_featured: false,
        is_highlighted: false,
        has_certificate: true,
        registration_deadline: dates.day10
      },
      {
        title: 'Data Science Bootcamp: Python & Machine Learning',
        description: 'Bootcamp intensif 3 hari untuk belajar Data Science dari dasar. Materi: Python programming, data analysis dengan Pandas, visualization dengan Matplotlib, machine learning dengan Scikit-learn.',
        short_description: 'Bootcamp intensif 3 hari untuk belajar Data Science dengan Python dan Machine Learning.',
        category_id: techCategory,
        event_date: dates.day35,
        event_time: '09:00:00',
        end_date: dates.day35,
        end_time: '17:00:00',
        location: 'Tech Academy Jakarta',
        address: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        max_participants: 30,
        price: 2500000,
        is_free: false,
        status: 'published',
        is_active: true,
        is_featured: true,
        is_highlighted: true,
        has_certificate: true,
        registration_deadline: dates.day30
      }
    ];

    console.log(`\n📝 Inserting ${events.length} events...\n`);

    let inserted = 0;
    let skipped = 0;

    for (const event of events) {
      try {
        // Check if event with same title already exists
        const [existing] = await query(
          'SELECT id FROM events WHERE title = ? LIMIT 1',
          [event.title]
        );

        if (existing && existing.length > 0) {
          console.log(`⏭️  Skipped: ${event.title} (already exists)`);
          skipped++;
          continue;
        }

        // Insert event
        await query(`
          INSERT INTO events (
            title, description, short_description, category_id, organizer_id,
            event_date, event_time, end_date, end_time,
            location, address, city, province,
            max_participants, price, currency, is_free,
            is_active, status, is_featured, is_highlighted, has_certificate,
            registration_deadline
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          event.title,
          event.description,
          event.short_description,
          event.category_id,
          adminId,
          event.event_date,
          event.event_time,
          event.end_date,
          event.end_time,
          event.location,
          event.address,
          event.city,
          event.province,
          event.max_participants,
          event.price,
          'IDR',
          event.is_free,
          event.is_active,
          event.status,
          event.is_featured,
          event.is_highlighted,
          event.has_certificate,
          event.registration_deadline
        ]);

        console.log(`✅ Inserted: ${event.title}`);
        inserted++;
      } catch (error) {
        console.error(`❌ Failed to insert "${event.title}":`, error.message);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Summary: ${inserted} inserted, ${skipped} skipped`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Verify
    const [allEvents] = await query(`
      SELECT COUNT(*) as total 
      FROM events 
      WHERE is_active = 1 AND status = 'published'
    `);
    console.log(`📊 Total published active events: ${allEvents[0].total}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

insertDummyEvents();

