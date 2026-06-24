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

// ── SIMPLE PASSWORD HASH (no bcrypt needed for school project) ──
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + password.length;
}

// ── REGISTER ──────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hashed = hashPassword(password);

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, existing) => {
    if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

    db.run(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
      [email, name, hashed],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID],
          (e, user) => {
            const { password_hash, ...safeUser } = user;
            res.json({ success: true, user: safeUser });
          }
        );
      }
    );
  });
});

// ── LOGIN ─────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) return res.status(401).json({ error: 'No account found with this email' });

    if (user.password_hash) {
      const hashed = hashPassword(password || '');
      if (hashed !== user.password_hash) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  });
});

// ── PROFILE ───────────────────────────────────────────────────
app.post('/api/profile/username', (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'Missing fields' });
  db.run('UPDATE users SET name = ? WHERE id = ?', [name, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/profile/email', (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'Missing fields' });
  db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId], function(err) {
    if (err) return res.status(500).json({ error: 'Email already in use' });
    res.json({ success: true });
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
  db.run('DELETE FROM watch_history WHERE user_id = ?',  [userId]);
  db.run('DELETE FROM ratings WHERE user_id = ?',        [userId]);
  db.run('DELETE FROM preferences WHERE user_id = ?',    [userId]);
  db.run('DELETE FROM chatbot_history WHERE user_id = ?',[userId]);
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ── STATS ─────────────────────────────────────────────────────
app.get('/api/stats/:userId', (req, res) => {
  const { userId } = req.params;
  db.get('SELECT COUNT(*) as total FROM watch_history WHERE user_id = ?', [userId],
    (err, countRow) => {
      const watchedCount = countRow?.total || 0;
      const totalHours   = Math.round(watchedCount * 1.8);
      db.get(
        'SELECT genre FROM preferences WHERE user_id = ? ORDER BY score DESC LIMIT 1',
        [userId],
        (err2, genreRow) => {
          if (!genreRow) {
            db.get(
              `SELECT genres, COUNT(*) as cnt FROM watch_history
               WHERE user_id = ? AND genres IS NOT NULL AND genres != ''
               GROUP BY genres ORDER BY cnt DESC LIMIT 1`,
              [userId],
              (err3, histRow) => res.json({
                watched_count: watchedCount,
                total_hours:   totalHours,
                top_genre:     histRow?.genres || '—'
              })
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
    const movies = await recommender.getRecommendations(userId, genre, req.query);
    res.json({ movies });
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
  db.run('INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?,?,?)',
    [userId, movieId, rating]);
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

// ── CHARTS (REFACTORED FOR DYNAMIC AUTO-UPDATING METADATA) ───
app.get('/api/charts/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const KEY  = process.env.TMDB_API_KEY;
    const BASE = 'https://api.themoviedb.org/3';
    let url;

    // Direct configuration parameters ensuring the network stream grabs live, updating payloads
    if (type === 'trending') {
      url = `${BASE}/trending/movie/week?api_key=${KEY}`;
    } else if (type === 'toprated') {
      url = `${BASE}/movie/top_rated?api_key=${KEY}&vote_count.gte=1000`;
    } else if (type === 'newreleases') {
      // Dynamic time boundaries: Captures movies released between today and the last 60 days automatically
      const today = new Date().toISOString().split('T')[0];
      const month = new Date(Date.now() - 60*24*60*60*1000).toISOString().split('T')[0];
      url = `${BASE}/discover/movie?api_key=${KEY}&sort_by=popularity.desc&primary_release_date.gte=${month}&primary_release_date.lte=${today}&vote_count.gte=50`;
    } else {
      return res.status(400).json({ error: 'Invalid chart type' });
    }

    const fetch = require('node-fetch');
    const r    = await fetch(url);
    const data = await r.json();

    // Map dynamic assets into an organized clean JSON structure matching your document's requirements
    const movies = (data.results || []).slice(0, 20).map(m => ({
      id:           m.id,
      title:        m.title,
      rating:       m.vote_average,
      poster:       m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
      release_year: m.release_date?.split('-')[0] || '',
      why_youll_like: `Rated ${m.vote_average?.toFixed(1)}/10 by ${m.vote_count?.toLocaleString()} viewers.`,
    }));

    res.json({ movies });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── TMDB KEY PROXY (for mood picker) ─────────────────────────
app.get('/api/tmdbkey', (req, res) => {
  res.json({ key: process.env.TMDB_API_KEY });
});

app.listen(PORT, () => console.log(`NetClick backend running on port ${PORT}`));