// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const tmdb = require('./tmdb');
const recommender = require('./recommender');
const chatbot = require('./chatbot');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
// AUTH ROUTES 
// Login with email — creates user if not exists
app.post('/api/login', (req, res) => {
const { email } = req.body;
if (!email) return res.status(400).json({ error: 'Email required' });
db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
if (user) return res.json({ success: true, user });
// Create new user
const name = email.split('@')[0];
db.run('INSERT INTO users (email, name) VALUES (?, ?)', [email, name],
function() {
db.get('SELECT * FROM users WHERE id = ?', [this.lastID],
(e, newUser) => res.json({ success: true, user: newUser })
);
}
);
});
});
// MOVIE ROUTES 
// Get recommendations for a user by genre
app.get('/api/recommendations/:userId/:genre', async (req, res) => {

try {
const { userId, genre } = req.params;
const movies = await recommender.getRecommendations(userId, genre);
res.json({ movies });
} catch (e) {
res.status(500).json({ error: e.message });
}
});
// Search TMDB — used by the AI chatbot to resolve movie titles
app.get('/api/search', async (req, res) => {
try {
const { q } = req.query;
const results = await tmdb.searchMovies(q);
res.json({ results });
} catch (e) {
res.status(500).json({ error: e.message });
}
});
// Get full movie details
app.get('/api/movie/:movieId', async (req, res) => {
try {
const movie = await tmdb.getMovieDetails(req.params.movieId);
res.json(movie);
} catch (e) {
res.status(500).json({ error: e.message });
}
});
// USER ACTION ROUTES
// Mark a movie as watched
app.post('/api/watched', (req, res) => {
const { userId, movieId, movieTitle, genres } = req.body;
db.run(
'INSERT INTO watch_history (user_id, movie_id, movie_title, genres) VALUES (?,?,?,?)',
[userId, movieId, movieTitle, genres],
() => res.json({ success: true })
);
});
// Submit a rating (thumbs up = 1, thumbs down = 0)
app.post('/api/rate', (req, res) => {
const { userId, movieId, rating, genres } = req.body;
db.run(
'INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?,?,?)',
[userId, movieId, rating]
);
// Update genre preferences based on the rating
if (genres) {

genres.split(',').forEach(genre => {
const change = rating === 1 ? 1.5 : -1.0; // like boosts genre, dislike lowers it
db.run(
`INSERT INTO preferences (user_id, genre, score) VALUES (?, ?, ?)
ON CONFLICT DO UPDATE SET score = score + ?`,
[userId, genre.trim(), change, change]
);
});
}
res.json({ success: true });
});
// CHATBOT ROUTE
app.post('/api/chatbot', async (req, res) => {
try {
const { userId, prompt } = req.body;
const response = await chatbot.getSuggestions(prompt, userId);
// Save to chatbot history
db.run('INSERT INTO chatbot_history (user_id, prompt, response) VALUES (?,?,?)',
[userId, prompt, JSON.stringify(response)]);
res.json(response);
} catch (e) {
res.status(500).json({ error: e.message });
}
});
app.listen(PORT, () => console.log(`NetClick backend running on port ${PORT}`));