import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'users.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better performance
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    department  TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'officer',
    full_name   TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login  TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
`);

export default db;
