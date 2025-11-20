# EventHub Platform - Copilot Instructions

## Project Overview
EventHub adalah platform manajemen event modern berbasis web yang dibangun dengan React (Vite), Express.js, dan MySQL. Platform ini mengelola event, pendaftaran peserta, pembayaran, sertifikat, dan analytics dengan fitur lengkap untuk admin dan user.

### Technology Stack
- **Frontend**: React 19 + Vite, TailwindCSS, React Router, Axios, Framer Motion, Lucide Icons
- **Backend**: Express.js, JWT auth, Multer (uploads), Nodemailer, XLSX/DOCX export
- **Database**: MySQL/MariaDB
- **Architecture**: REST API, multi-tier with middleware & services, middleware pattern for auth & validation

## Key Architecture Patterns

### 1. Authentication & Authorization
- **JWT-based**: `/middleware/auth.js` handles `authenticateToken`, `requireAdmin`, `requireUser`
- **Roles**: `admin`, `user` (registered user with OTP verification)
- **Token**: Stored in localStorage via React Context, sent via `Authorization: Bearer {token}` header
- **Pattern**: All protected routes use `router.use(authenticateToken)` at top level
- **Flow**: Register with OTP → Login → JWT token → API calls with token

### 2. API Response Pattern
- **Wrapper**: `ApiResponse` class in `/middleware/response.js`
- **Methods**: `.success(res, data)`, `.created()`, `.badRequest()`, `.unauthorized()`, `.conflict()`, `.notFound()`
- **Format**: Always returns `{success: bool, message: string, data: object}`
- **Usage**: All route handlers use this for consistency
- **Key Files**: `server/routes/*.js` - all use ApiResponse pattern

### 3. Event Registration Flow (Free Events)
- **Entry Point**: User clicks "Beli Sekarang" button in `EventDetailModern.jsx`
- **Component**: `FreeEventRegistration.jsx` shows registration UI (date, time, location, quota)
- **Button Action**: 
  - Checks if user authenticated (redirects to login if not)
  - Shows confirmation dialog
  - POSTs to `POST /registrations` with user profile data
- **Data Collected**: `event_id`, `full_name`, `email`, `phone` (from logged-in user)
- **Response**: Success message + token sent to email, participant count updated
- **Table**: Data stored in `registrations` table with new fields: `full_name`, `email`, `phone`, `address`, `city`, `province`, `institution`, `notes`
- **Status**: Set to "approved" immediately for free events

### 4. Database Migrations
- **Location**: `server/migrations/` with sequential numbering (001-032+)
- **Pattern**: Run via `runMigration.js` at startup or manual execution
- **Key Tables**:
  - `users`: auth, profiles (full_name, email, phone, username)
  - `events`: event data (date, time, location, price, max_participants, is_free)
  - `registrations`: participant registrations with data fields (full_name, email, phone, address, city, province, institution)
  - `categories`: event categories
  - `certificates`: generated certificates
  - `attendance_tokens`: tokens for event check-in
- **Important Migration**: `032_add_registrant_fields_to_registrations.sql` adds registrant personal data fields

### 5. Frontend Component Structure
- **Pages**: `/frontend/src/pages/` organized by feature
  - `events/`: EventsPage, EventDetailModern (main), CreateEvent, EventDashboard
  - `auth/`: Login, Register
  - `admin/`: Dashboard, EventsManagement, RegistrationsManagement, etc
  - `settings/`: User profile and my events
- **Components**: `/frontend/src/components/`
  - `FreeEventRegistration.jsx`: Registration UI for free events (NEW)
  - `PageTransition.jsx`: Page animation wrapper
  - `Footer.jsx`: Footer component
- **Services**: `/frontend/src/services/api.js` - Axios instance with base URL `http://localhost:3000/api`
- **Contexts**: Auth and Toast notification via React Context
- **Styling**: TailwindCSS utility-first + custom CSS

### 6. Admin Features (Protected Routes)
- **Dashboard**: Stats (total events, users, registrations)
- **Event Management**: CRUD events, export to Excel/Word
- **Registrations Management**: View registrations, approve/reject, generate certificates, export with all registrant data
- **Export Format**: Includes new fields (address, city, province, institution) in Excel/CSV
- **Route Pattern**: `router.use(authenticateToken, requireAdmin)` at top
- **Admin Panel Route**: `/admin/*` with `AdminLayout` wrapper

## Common Workflows

### Adding a New Event Registration Field
1. Create migration: `server/migrations/0XX_add_field.sql` using ALTER TABLE
2. Update `POST /registrations` in `server/routes/registrations.js`: Add field to INSERT query
3. Update admin export query in `server/routes/admin.js`: Add to SELECT clause in `/export/participants/:eventId`
4. No frontend changes needed - form uses user profile data

### Registering User for Free Event (Current Implementation)
1. User logs in and views event detail page (`EventDetailModern.jsx`)
2. `FreeEventRegistration` component shown (displays date, time, location, quota)
3. User clicks "Daftar Sekarang" button → `handleRegister()` triggers
4. Confirmation dialog appears
5. POST `/registrations` with `event_id`, `payment_method: 'free'`, user profile fields
6. Backend validates event exists, not full, user not already registered, registration open
7. Creates registration record with status="approved", generates attendance token
8. Token sent via email (Nodemailer)
9. Success message shown, registration count updates

### Creating a Protected Admin Route
1. Add route in `server/routes/admin.js`: Use `router.use(authenticateToken, requireAdmin)`
2. Add to frontend `App.jsx` inside `<AdminLayout>` wrapper
3. Create page component in `frontend/src/pages/admin/`
4. Use `useAuth()` context to check admin role, redirect if not authorized

### Exporting Registrations Data to Excel
1. Route: `GET /api/admin/export/participants/:eventId?format=xlsx`
2. Queries `registrations` table with all new fields (address, city, province, institution)
3. Uses COALESCE to fallback to user profile if registration fields empty
4. Maps to export format with readable headers (Indonesian)
5. Uses XLSX library to create workbook and buffer
6. Sets response headers for download
7. Returns buffer with filename `peserta_{event_title}_{date}.xlsx`

## Critical Developer Commands

### Setup & Running
```bash
# Backend setup & run
cd server && npm install
npm run migrate  # Run migrations manually
npm run dev      # Start with nodemon

# Frontend setup & run
cd frontend && npm install
npm run dev      # Vite dev server on localhost:5173

# Full setup from scratch
npm run setup  # Runs migrations and dependencies
```

### Database Connection
- Backend: `server/db.js` exports `query()` function using mysql2 pool
- Connection params: `server/config.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- Pool: Max 10 connections, waits indefinitely
- Test: `npm run dev` shows connection status in console

### Key NPM Scripts
- `npm run dev`: Start with nodemon (backend) / Vite HMR (frontend)
- `npm run migrate`: Run pending migrations
- `npm run build`: Build frontend for production
- `npm run setup`: Create DB and run migrations

## File Organization by Feature

### Free Event Registration (Core Feature)
- **Frontend**: 
  - `frontend/src/components/FreeEventRegistration.jsx` - Registration UI/button
  - `frontend/src/pages/events/EventDetailModern.jsx` - Event detail page
- **Route**: `App.jsx` - `/events/:id` renders EventDetailModern
- **Backend**: 
  - `server/routes/registrations.js` - `POST /` handles registration
  - `server/routes/admin.js` - `/export/participants/:eventId` exports data
- **Database**: 
  - `registrations` table with fields: id, event_id, user_id, full_name, email, phone, address, city, province, institution, status, created_at
  - Migration: `032_add_registrant_fields_to_registrations.sql`

### Event Management
- Frontend: `frontend/src/pages/events/EventDetailModern.jsx`, `CreateEvent.jsx`, `EventsPage.jsx`
- Backend: `server/routes/events.js`, image uploads to `server/uploads/events`
- Database: `events` table with all event details

### Admin Panel
- Layout: `frontend/src/pages/admin/AdminLayout.jsx`
- Components: `Dashboard.jsx`, `EventsManagement.jsx`, `RegistrationsManagement.jsx`
- Backend: `server/routes/admin.js` (comprehensive admin functionality)

## Common Pitfalls & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 409 Conflict on register | User already registered for event | Check duplicate registration before POST |
| Registration shows "closed" | Event time passed or <1hr remaining | Backend closes registration 1 hour before event |
| Export missing data | Old migration not run | Run all migrations: `npm run migrate` |
| CORS error from frontend | Frontend URL not in CORS whitelist | Update `server.js` cors() config |
| File upload fails | File too large (>5MB) | Multer limits in `/routes/events.js` |
| JWT expires | Token stored but stale | Re-login triggers new token refresh |

## Performance Considerations

- **Queries**: Use indexes on `event_id`, `user_id`, `status` fields
- **Rate Limiting**: 500 requests per 15min per IP (development-friendly in `server.js`)
- **Image Sizes**: Max 5MB, validated in Multer fileFilter
- **Pagination**: Used in registrations list route
- **Export**: Use streaming for large datasets to avoid memory issues

## Next Priority Tasks

1. **Paid Event Integration**: Add Midtrans payment flow for non-free events
2. **Bulk Operations**: Bulk approve/reject for registrations
3. **Email Templates**: Customize email notifications (currently basic)
4. **Mobile PWA**: Enhance offline support with service worker
5. **Analytics**: Dashboard for event performance metrics
6. **QR Attendance**: Generate QR codes for event check-in instead of token

## Environment Variables (`server/config.env`)
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=event_db
PORT=3000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
```

## API Endpoints Quick Reference
- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/seed-admin`
- Events: `GET /events`, `GET /events/:id`, `POST /events`, `PUT /events/:id`
- Registrations: `POST /registrations`, `GET /registrations/my-registrations`, `PUT /registrations/:id/cancel`
- Admin: `GET /admin/dashboard-stats`, `POST /admin/export/participants/:eventId`
- Categories: `GET /categories`, `POST /categories`, `DELETE /categories/:id`
