const { query } = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');

    // Create migrations table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${files.length} migration files`);

    for (const file of files) {
      // Check if migration already executed
      const [existing] = await query(
        'SELECT * FROM migrations WHERE migration_name = ?',
        [file]
      );

      if (existing.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔨 Running migration: ${file}`);

      // Read SQL file
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

      for (const statement of statements) {
        try {
          await query(statement);
        } catch (err) {
          // Ignore errors for statements that might already exist
          if (!err.message.includes('Duplicate column')) {
            console.warn(`⚠️  Warning in ${file}:`, err.message);
          }
        }
      }

      // Mark migration as executed
      await query(
        'INSERT INTO migrations (migration_name) VALUES (?)',
        [file]
      );

      console.log(`✅ Completed: ${file}`);
    }

    console.log('✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

module.exports = { runMigrations };
