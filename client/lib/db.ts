import { createClient, Client } from '@libsql/client';
import path from 'path';

let db: Client | null = null;

// Initialize and get the database connection
export async function getDb(): Promise<Client> {
  if (db) {
    return db;
  }

  // Open the LibSQL/SQLite database connection
  db = createClient({
    url: `file:${path.join(process.cwd(), 'users.db')}`,
  });

  // Create the users table if it doesn't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}
