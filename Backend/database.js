// backend/database.js
// This file sets up your database and creates all the tables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Create or open the database file
const db = new sqlite3.Database(path.join(__dirname, 'netclick.db'));
// Create all tables (IF NOT EXISTS means it won't break if you run this twice)
db.serialize(() => {
// USERS TABLE — stores login info
db.run(`CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
email TEXT UNIQUE NOT NULL,
name TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
// WATCH HISTORY TABLE — every movie the user has watched
db.run(`CREATE TABLE IF NOT EXISTS watch_history (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
movie_id INTEGER,
movie_title TEXT,
genres TEXT,
watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
source TEXT DEFAULT 'manual'
)`);
// RATINGS TABLE — thumbs up or thumbs down
db.run(`CREATE TABLE IF NOT EXISTS ratings (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
movie_id INTEGER,
rating INTEGER,
rated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
// PREFERENCES TABLE — genre scores that build up over time
db.run(`CREATE TABLE IF NOT EXISTS preferences (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
genre TEXT,
score REAL DEFAULT 0.0
)`);
// CHATBOT HISTORY — what the user asked the chatbot
db.run(`CREATE TABLE IF NOT EXISTS chatbot_history (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
prompt TEXT,
response TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
console.log('Database ready!');
});
module.exports = db;