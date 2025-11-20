-- Create attendance_tokens table for 10-digit token system
CREATE TABLE IF NOT EXISTS attendance_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id INT NOT NULL,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  token VARCHAR(10) NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  INDEX idx_token (token),
  INDEX idx_registration_id (registration_id),
  INDEX idx_user_id (user_id),
  INDEX idx_event_id (event_id),
  FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create attendance_records table for tracking attendance
CREATE TABLE IF NOT EXISTS attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_id INT NOT NULL,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  attendance_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (token_id) REFERENCES attendance_tokens(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

