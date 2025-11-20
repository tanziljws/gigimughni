// db.js
const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get promise wrapper
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Gagal konek ke database:', err);
    return;
  }
  console.log('✅ Terhubung ke database', process.env.DB_NAME || 'event_db');
  connection.release();
});

// Use promisePool for consistent API
module.exports = {
  pool,
  promisePool,
  query: async (sql, params) => {
    try {
      const [rows] = await promisePool.execute(sql, params);
      return [rows];
    } catch (error) {
      throw error;
    }
  }
};
