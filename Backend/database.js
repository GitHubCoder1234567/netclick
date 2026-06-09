// backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const DB_PATH = path.join(__dirname, 'netclick.db');
const db      = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Users table — add password_hash column if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    email             TEXT    UNIQUE NOT NULL,
    name              TEXT,
    password_hash     TEXT,
    picture           TEXT,
    preferred_language TEXT DEFAULT 'en',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add password_hash to existing databases that don't have it
  db.run(`ALTER TABLE users ADD COLUMN password_hash TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS watch_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    movie_id    INTEGER,
    movie_title TEXT,
    genres      TEXT,
    watched_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ratings (
    user_id  INTEGER,
    movie_id INTEGER,
    rating   INTEGER,
    PRIMARY KEY (user_id, movie_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS preferences (
    user_id INTEGER,
    genre   TEXT,
    score   REAL DEFAULT 0,
    PRIMARY KEY (user_id, genre)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chatbot_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    prompt     TEXT,
    response   TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed demo account with password if it doesn't have one
  const demoHash = 'h_' + Math.abs(
    'demo1234'.split('').reduce((h, c) => { return Math.imul(31, h) + c.charCodeAt(0) | 0; }, 0)
  ).toString(36) + '_8';

  db.get("SELECT id FROM users WHERE email = 'demo@netclick.com'", (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO users (email, name, password_hash) VALUES ('demo@netclick.com', 'Demo User', ?)",
        [demoHash]
      );
    } else {
      db.run("UPDATE users SET password_hash = ? WHERE email = 'demo@netclick.com'", [demoHash]);
    }
  });

  console.log('Database ready!');
});

module.exports = db;