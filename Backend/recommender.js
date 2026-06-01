// backend/recommender.js
const db   = require('./database');
const tmdb = require('./tmdb');

async function getRecommendations(userId, genre, filters = {}) {
  const watched    = await getWatchedIds(userId);
  const genreScore = await getGenreScore(userId, genre);
  const genreId    = tmdb.GENRE_MAP[genre];
  if (!genreId) return [];

  // Fetch from multiple pages to get more movies
  let movies = [];
  const pagesToFetch = 4;
  for (let page = 1; page <= pagesToFetch; page++) {
    const pageMovies = await tmdb.getMoviesByGenre(genreId, page, filters.language || 'en');
    movies = movies.concat(pageMovies);
  }

  // Filter out already-watched
  movies = movies.filter(m => !watched.includes(m.id));

  // Apply rating filter
  if (filters.minRating) {
    movies = movies.filter(m => m.vote_average >= parseFloat(filters.minRating));
  }

  // Apply runtime filter (TMDB doesn't return runtime in discover, so skip for now)

  // Apply year filter
  if (filters.minYear) {
    movies = movies.filter(m => {
      if (!m.release_date) return false;
      return parseInt(m.release_date.split('-')[0]) >= parseInt(filters.minYear);
    });
  }

  // Remove duplicates by id
  const seen = new Set();
  movies = movies.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  // Score and sort
  movies = movies.map(movie => ({
    ...movie,
    netclick_score: scoreMovie(movie, genreScore)
  })).sort((a, b) => b.netclick_score - a.netclick_score);

  // Return top 15
  return movies.slice(0, 15).map(m => ({
    id:           m.id,
    title:        m.title,
    overview:     m.overview,
    rating:       m.vote_average,
    poster:       m.poster_path
                  ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
                  : null,
    release_year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
    why_youll_like: generateReason(genre, genreScore, m.vote_average, m.release_date),
    netclick_score: m.netclick_score
  }));
}

function scoreMovie(movie, genreScore) {
  const qualityScore = (movie.vote_average / 10) * 60;
  const personalScore = Math.min(genreScore, 10) * 4;
  return qualityScore + personalScore;
}

function generateReason(genre, genreScore, rating, releaseDate) {
  const year = releaseDate ? releaseDate.split('-')[0] : '';
  const r = rating.toFixed(1);

  if (genreScore >= 5) {
    return `Based on your strong love of ${genre} films and this movie's rating of ${r}/10, NetClick is confident you'll enjoy this one.`;
  } else if (genreScore >= 2) {
    return `You enjoy ${genre} content, and this highly rated film (${r}/10${year ? `, ${year}` : ''}) fits well with your viewing history.`;
  } else {
    return `This is a top-rated ${genre} film (${r}/10${year ? ` from ${year}` : ''}) that we think is worth exploring based on your history.`;
  }
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