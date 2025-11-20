import React, { useEffect, useMemo, useRef, useState } from 'react';
import { eventsAPI } from '../../services/api';

const SlideSkeleton = () => (
  <div className="w-full h-[70vh] rounded-3xl overflow-hidden bg-gray-200 animate-pulse" />
);

const Dot = ({ active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${active ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'}`}
    aria-label="Go to slide"
  />
);

const Arrow = ({ dir = 'left', onClick }) => (
  <button
    onClick={onClick}
    className="group absolute top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all"
    style={{ [dir === 'left' ? 'left' : 'right']: '1rem' }}
    aria-label={dir === 'left' ? 'Previous slide' : 'Next slide'}
  >
    <svg className="w-5 h-5 md:w-6 md:h-6 transform transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {dir === 'left' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      )}
    </svg>
  </button>
);

const EventDashboard = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const parallaxRef = useRef(null);

  // Fetch featured events
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const params = { sort_by: 'nearest', limit: 6 };
        const { data } = await eventsAPI.get('/', { params });
        const items = (data?.data || data?.events || []).slice(0, 6);
        const mapped = items.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.event_date,
          time: e.event_time,
          location: e.location || e.city || 'Online/Hybrid',
          image: e.image || e.banner || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1600&fit=crop',
        }));
        if (mounted) {
          setSlides(mapped.length ? mapped : []);
        }
      } catch (err) {
        // fallback samples
        const samples = [
          {
            id: 's1',
            title: 'Tech Conference 2025',
            date: '2025-12-05',
            time: '09:00',
            location: 'Jakarta Convention Center',
            image: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600&fit=crop',
          },
          {
            id: 's2',
            title: 'Creative Workshop: UI Design',
            date: '2025-11-20',
            time: '13:00',
            location: 'Bandung',
            image: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=1600&fit=crop',
          },
          {
            id: 's3',
            title: 'Startup Expo & Networking',
            date: '2025-12-01',
            time: '10:00',
            location: 'Surabaya',
            image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&fit=crop',
          },
        ];
        if (mounted) setSlides(samples);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Autoplay every 5s
  useEffect(() => {
    if (paused || loading || slides.length === 0) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [paused, loading, slides.length]);

  // Parallax effect on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!parallaxRef.current) return;
      const y = window.scrollY;
      parallaxRef.current.style.transform = `translateY(${y * 0.2}px)`; // subtle parallax
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goPrev = () => setActive((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActive((prev) => (prev + 1) % slides.length);

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white">
      {/* Hero Slideshow */}
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: '70vh' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0">
          {/* Dark gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b10]/30 via-[#0b0b10]/40 to-[#0b0b10]/80 z-10" />

          {/* Slides */}
          <div className="relative w-full h-full" ref={parallaxRef}>
            {loading ? (
              <SlideSkeleton />
            ) : (
              slides.map((s, idx) => (
                <div
                  key={s.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-out ${idx === active ? 'opacity-100' : 'opacity-0'} `}
                  aria-hidden={idx !== active}
                >
                  {/* Image as main element (not just background) */}
                  <img
                    src={s.image}
                    alt={s.title}
                    className={`w-full h-[70vh] object-cover select-none will-change-transform transition-transform duration-700 ${idx === active ? 'scale-100' : 'scale-105'}`}
                    draggable="false"
                  />

                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                  {/* Slide content */}
                  <div className="absolute inset-0 z-20 flex items-end md:items-center">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8 md:pb-0">
                      <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs md:text-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Featured Event
                        </div>
                        <h1 className="mt-4 text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                          {s.title}
                        </h1>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm md:text-base text-white/90">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{s.date} • {s.time}</span>
                          </div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{s.location}</span>
                          </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <button className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:scale-[1.02] hover:shadow-lg transition-all">
                            Daftar Sekarang
                          </button>
                          <button className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold backdrop-blur-md hover:bg-white/20 transition-all">
                            Lihat Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Arrows */}
        {slides.length > 1 && (
          <>
            <Arrow dir="left" onClick={goPrev} />
            <Arrow dir="right" onClick={goNext} />
          </>
        )}

        {/* Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-5 left-0 right-0 z-30">
            <div className="flex items-center justify-center gap-2">
              {slides.map((_, i) => (
                <Dot key={i} active={i === active} onClick={() => setActive(i)} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Placeholder for more sections later */}
      <section className="py-16 bg-[#0b0b10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-white/90 mb-4">Event Terdekat</h2>
          <p className="text-white/60">Konten lanjutan bisa ditambahkan di sini (grid cards, filter, dsb.).</p>
        </div>
      </section>
    </div>
  );
};

export default EventDashboard;
