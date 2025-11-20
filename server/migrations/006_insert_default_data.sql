-- Migration: Insert default data
-- Date: 2024-01-01

-- Insert default categories
INSERT IGNORE INTO categories (name, description, icon, color) VALUES
('Technology', 'Events related to technology, programming, and innovation', 'fas fa-laptop-code', '#007bff'),
('Business', 'Business conferences, seminars, and networking events', 'fas fa-briefcase', '#28a745'),
('Education', 'Educational workshops, training, and learning events', 'fas fa-graduation-cap', '#ffc107'),
('Entertainment', 'Music, art, culture, and entertainment events', 'fas fa-music', '#dc3545'),
('Sports', 'Sports events, competitions, and fitness activities', 'fas fa-running', '#fd7e14'),
('Health & Wellness', 'Health seminars, wellness workshops, and medical events', 'fas fa-heartbeat', '#e83e8c'),
('Community', 'Community gatherings, social events, and local activities', 'fas fa-users', '#6f42c1'),
('Food & Culinary', 'Food festivals, cooking classes, and culinary events', 'fas fa-utensils', '#fd7e14');

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password, full_name, role, is_active) VALUES
('admin', 'abdul.mughni845@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Abdul Mughni', 'admin', TRUE);
