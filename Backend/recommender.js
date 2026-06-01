// backend/recommender.js
const db   = require('./database');
const tmdb = require('./tmdb');

async function getRecommendations(userId, genre, filters = {}) {
  const watched    = await getWatchedIds(userId);
  const genreScore = await getGenreScore(userId, genre);
  const genreId    = tmdb.GENRE_MAP[genre];
  if (!genreId) return [];

  const language  = filters.language || 'en';
  const minRating = filters.minRating ? parseFloat(filters.minRating) : 0;
  const minYear   = filters.minYear   ? parseInt(filters.minYear)     : 0;
  const maxRuntime= filters.maxRuntime? parseInt(filters.maxRuntime)  : 9999;

  // Fetch 6 pages to get ~120 candidates
  let movies = [];
  for (let page = 1; page <= 6; page++) {
    try {
      const pageMovies = await tmdb.getMoviesByGenre(genreId, page, language);
      movies = movies.concat(pageMovies);
    } catch(e) { break; }
  }

  // Remove duplicates
  const seen = new Set();
  movies = movies.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  // Filter out already-watched
  movies = movies.filter(m => !watched.includes(m.id));

  // Apply rating filter
  if (minRating > 0) {
    movies = movies.filter(m => m.vote_average >= minRating);
  }

  // Apply year filter
  if (minYear > 0) {
    movies = movies.filter(m => {
      if (!m.release_date) return false;
      return parseInt(m.release_date.split('-')[0]) >= minYear;
    });
  }

  // Score and sort
  movies = movies.map(movie => ({
    ...movie,
    netclick_score: scoreMovie(movie, genreScore)
  })).sort((a, b) => b.netclick_score - a.netclick_score);

  // Return top 20
  return movies.slice(0, 20).map(m => ({
    id:           m.id,
    title:        m.title,
    overview:     m.overview,
    rating:       m.vote_average,
    vote_count:   m.vote_count,
    poster:       m.poster_path
                  ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
                  : null,
    release_year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
    why_youll_like: generateReason(genre, genreScore, m.vote_average, m.release_date),
    netclick_score: m.netclick_score
  }));
}

function scoreMovie(movie, genreScore) {
  const qualityScore  = (movie.vote_average / 10) * 60;
  const personalScore = Math.min(genreScore, 10) * 4;
  return qualityScore + personalScore;
}

function generateReason(genre, genreScore, rating, releaseDate) {
  const year = releaseDate ? releaseDate.split('-')[0] : '';
  const r    = rating.toFixed(1);
  if (genreScore >= 5)
    return `Based on your strong love of ${genre} films and this movie's ${r}/10 rating, NetClick is confident you'll enjoy this.`;
  if (genreScore >= 2)
    return `You enjoy ${genre} content, and this highly rated film (${r}/10${year ? `, ${year}` : ''}) fits well with your viewing history.`;
  return `A top-rated ${genre} film (${r}/10${year ? ` from ${year}` : ''}) that matches your viewing profile.`;
}

function getWatchedIds(userId) {
  return new Promise((resolve) => {
    db.all('SELECT movie_id FROM watch_history WHERE user_id = ?', [userId],
      (err, rows) => resolve(rows ? rows.map(r => r.movie_id) : [])
    );
  });
}

function getGenreScore(userId, genre) {
  return new Promise((resolve) => {
    db.get('SELECT score FROM preferences WHERE user_id = ? AND genre = ?',
      [userId, genre],
      (err, row) => resolve(row ? row.score : 0)
    );
  });
}

module.exports = { getRecommendations };