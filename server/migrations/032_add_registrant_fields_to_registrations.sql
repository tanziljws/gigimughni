-- Migration: Add registrant data fields to registrations table
-- Purpose: Store participant personal data for registration and reporting

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) AFTER user_id;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone VARCHAR(20) AFTER full_name;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email VARCHAR(255) AFTER phone;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS address TEXT AFTER email;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER address;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS province VARCHAR(100) AFTER city;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS institution VARCHAR(255) AFTER province;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notes TEXT AFTER institution;

-- Add index for better query performance
ALTER TABLE registrations ADD INDEX idx_full_name (full_name);
ALTER TABLE registrations ADD INDEX idx_phone (phone);
ALTER TABLE registrations ADD INDEX idx_institution (institution);
