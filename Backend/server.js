// backend/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const db      = require('./database');
const tmdb    = require('./tmdb');
const recommender = require('./recommender');
const chatbot     = require('./chatbot');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── AUTH ──────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (user) return res.json({ success: true, user });
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

// ── PROFILE ───────────────────────────────────────────────────
app.post('/api/profile/username', (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'Missing fields' });
  db.run('UPDATE users SET name = ? WHERE id = ?', [name, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM users WHERE id = ?', [userId], (e, user) => {
      res.json({ success: true, user });
    });
  });
});

app.post('/api/profile/email', (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'Missing fields' });
  db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId], function(err) {
    if (err) return res.status(500).json({ error: 'Email already in use' });
    db.get('SELECT * FROM users WHERE id = ?', [userId], (e, user) => {
      res.json({ success: true, user });
    });
  });
});

app.post('/api/profile/picture', (req, res) => {
  const { userId, picture } = req.body;
  if (!userId || !picture) return res.status(400).json({ error: 'Missing fields' });
  db.run('UPDATE users SET picture = ? WHERE id = ?', [picture, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/profile/language', (req, res) => {
  const { userId, language } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  db.run('UPDATE users SET preferred_language = ? WHERE id = ?', [language, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  db.run('DELETE FROM watch_history WHERE user_id = ?', [userId]);
  db.run('DELETE FROM ratings WHERE user_id = ?', [userId]);
  db.run('DELETE FROM preferences WHERE user_id = ?', [userId]);
  db.run('DELETE FROM chatbot_history WHERE user_id = ?', [userId]);
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ── STATS ─────────────────────────────────────────────────────
app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params;

  // Count total movies watched
  db.get(
    'SELECT COUNT(*) as total FROM watch_history WHERE user_id = ?',
    [userId],
    (err, countRow) => {
      if (err) return res.status(500).json({ error: err.message });

      const watchedCount = countRow?.total || 0;

      // Estimate hours: average movie ~1.8hrs, multiply by count
      const totalHours = Math.round(watchedCount * 1.8);

      // Find top genre from preferences table
      db.get(
        'SELECT genre FROM preferences WHERE user_id = ? ORDER BY score DESC LIMIT 1',
        [userId],
        (err2, genreRow) => {
          // Fallback: count genres from watch_history if preferences is empty
          if (!genreRow) {
            db.get(
              `SELECT genres, COUNT(*) as cnt FROM watch_history
               WHERE user_id = ? AND genres IS NOT NULL AND genres != ''
               GROUP BY genres ORDER BY cnt DESC LIMIT 1`,
              [userId],
              (err3, histRow) => {
                res.json({
                  watched_count: watchedCount,
                  total_hours:   totalHours,
                  top_genre:     histRow?.genres || '—'
                });
              }
            );
          } else {
            res.json({
              watched_count: watchedCount,
              total_hours:   totalHours,
              top_genre:     genreRow.genre || '—'
            });
          }
        }
      );
    }
  );
});

// ── MOVIES ────────────────────────────────────────────────────
app.get('/api/recommendations/:userId/:genre', async (req, res) => {
  try {
    const { userId, genre } = req.params;
    const filters = req.query;
    const movies  = await recommender.getRecommendations(userId, genre, filters);
    res.json({ movies });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const results = await tmdb.searchMovies(req.query.q);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/movie/:movieId', async (req, res) => {
  try {
    const movie = await tmdb.getMovieDetails(req.params.movieId);
    res.json(movie);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── USER ACTIONS ──────────────────────────────────────────────
app.post('/api/watched', (req, res) => {
  const { userId, movieId, movieTitle, genres } = req.body;
  db.run(
    'INSERT INTO watch_history (user_id, movie_id, movie_title, genres) VALUES (?,?,?,?)',
    [userId, movieId, movieTitle, genres],
    () => res.json({ success: true })
  );
});

app.post('/api/rate', (req, res) => {
  const { userId, movieId, rating, genres } = req.body;
  db.run(
    'INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?,?,?)',
    [userId, movieId, rating]
  );
  if (genres) {
    genres.split(',').forEach(genre => {
      const change = rating === 1 ? 1.5 : -1.0;
      db.run(
        `INSERT INTO preferences (user_id, genre, score) VALUES (?, ?, ?)
         ON CONFLICT(user_id, genre) DO UPDATE SET score = score + ?`,
        [userId, genre.trim(), change, change]
      );
    });
  }
  res.json({ success: true });
});

// ── CHATBOT ───────────────────────────────────────────────────
app.post('/api/chatbot', async (req, res) => {
  try {
    const { userId, prompt } = req.body;
    const response = await chatbot.getSuggestions(prompt, userId);
    db.run('INSERT INTO chatbot_history (user_id, prompt, response) VALUES (?,?,?)',
      [userId, prompt, JSON.stringify(response)]);
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`NetClick backend running on port ${PORT}`));