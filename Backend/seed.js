// backend/seed.js
// Run this ONCE to fill the database with demo data
const db = require('./database');
// Create demo user (this is the email you'll give your teacher)
db.run(`INSERT OR IGNORE INTO users (email, name) VALUES (?, ?)`,
['demo@netclick.com', 'Demo User']);
// Wait for user to be created, then add their history
setTimeout(() => {
db.get(`SELECT id FROM users WHERE email = 'demo@netclick.com'`, (err, user) => {
if (!user) return;
// Pre-loaded watch history — mix of genres
const history = [
{ id: 27205, title: 'Inception', genres: 'Action,Sci-Fi,Thriller' },
{ id: 157336, title: 'Interstellar', genres: 'Adventure,Drama,Sci-Fi' },
{ id: 299536, title: 'Avengers: Infinity War', genres: 'Action,Adventure' },
{ id: 396422, title: 'Olympus Has Fallen', genres: 'Action,Thriller' },
{ id: 603, title: 'The Matrix', genres: 'Action,Sci-Fi' },
{ id: 155, title: 'The Dark Knight', genres: 'Action,Crime,Drama' },
{ id: 680, title: 'Pulp Fiction', genres: 'Crime,Drama,Thriller' },
{ id: 13, title: 'Forrest Gump', genres: 'Comedy,Drama,Romance' },
{ id: 78, title: 'Blade Runner', genres: 'Sci-Fi,Thriller' },
{ id: 11, title: 'Star Wars: A New Hope', genres: 'Action,Adventure,Sci-Fi' },
];
history.forEach(movie => {
db.run(
`INSERT INTO watch_history (user_id, movie_id, movie_title, genres, source)
VALUES (?, ?, ?, ?, 'netflix')`,
[user.id, movie.id, movie.title, movie.genres]
);
// Mark them all as liked (rating = 1)
db.run(
`INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, 1)`,
[user.id, movie.id]);
});
// Build genre preference scores from history
const genreScores = { Action: 7, 'Sci-Fi': 6, Thriller: 5, Drama: 4,
Adventure: 3, Crime: 3, Comedy: 1 };
Object.entries(genreScores).forEach(([genre, score]) => {
db.run(
`INSERT INTO preferences (user_id, genre, score) VALUES (?, ?, ?)`,
[user.id, genre, score]
);
});
console.log('Demo data loaded successfully!');
});
}, 500);
