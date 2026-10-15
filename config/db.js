const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../syndol.db"), {
  timeout: 5000,
})

db.pragma("journal_mode = WAL");

const createTables = db.transaction(() => {
	// 1. Administrators Table
	db.prepare(
		`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
	).run();

  // 2. Standard Client Users Table
	db.prepare(
		`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
	).run();

  // 3. Follows Table
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    followee_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(follower_id, followee_id)
    )
  `,
  ).run();
});

createTables();

module.exports = db;
