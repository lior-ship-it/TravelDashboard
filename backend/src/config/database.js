const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/bluespine.db');

let db = null;

function initDatabase() {
  if (db) return db;

  db = new Database(DB_PATH, { verbose: console.log });

  // Enable foreign keys and WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_key TEXT UNIQUE NOT NULL,
      tenant TEXT NOT NULL,
      raw_data TEXT NOT NULL,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_claims_tenant ON claims(tenant);
    CREATE INDEX IF NOT EXISTS idx_claims_fetched_at ON claims(fetched_at);

    CREATE TABLE IF NOT EXISTS tenant_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant TEXT UNIQUE NOT NULL,
      access_token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      last_accessed DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tenant_links_token ON tenant_links(access_token);

    CREATE TABLE IF NOT EXISTS refresh_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant TEXT NOT NULL,
      records_fetched INTEGER,
      status TEXT NOT NULL,
      error_message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_log_tenant ON refresh_log(tenant);
    CREATE INDEX IF NOT EXISTS idx_refresh_log_timestamp ON refresh_log(timestamp);
  `);

  console.log('✓ Database initialized at:', DB_PATH);

  return db;
}

function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('✓ Database connection closed');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
