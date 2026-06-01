// backend/recommender.js
// The personalisation engine — core of NetClick
const db = require('./database');
const tmdb = require('./tmdb');
async function getRecommendations(userId, genre, filters = {}) {
// 1. Get movies already watched (so we don't re-recommend them)
const watched = await getWatchedIds(userId);
// 2. Get the user's genre preference score for personalisation
const genreScore = await getGenreScore(userId, genre);
// 3. Fetch movies from TMDB for this genre
const genreId = tmdb.GENRE_MAP[genre];
if (!genreId) return [];let movies = await tmdb.getMoviesByGenre(genreId);
// 4. Filter out already-watched movies
movies = movies.filter(m => !watched.includes(m.id));
// 5. Apply user filters if provided (duration, rating, etc.)
if (filters.minRating) {
movies = movies.filter(m => m.vote_average >= parseFloat(filters.minRating));
}
if (filters.maxRuntime) {
movies = movies.filter(m => !m.runtime || m.runtime <= parseInt(filters.maxRuntime));
}
// 6. Score each movie and sort by best fit
movies = movies.map(movie => ({
...movie,
netclick_score: scoreMovie(movie, genreScore)
})).sort((a, b) => b.netclick_score - a.netclick_score);
// 7. Return top 5
return movies.slice(0, 5).map(m => ({
id: m.id,
title: m.title,
overview: m.overview,
rating: m.vote_average,
poster: m.poster_path
? `https://image.tmdb.org/t/p/w342${m.poster_path}`
: null,
release_year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
why_youll_like: generateReason(genre, genreScore, m.vote_average),
netclick_score: m.netclick_score
}));
}
// Score a movie based on quality + personalisation
function scoreMovie(movie, genreScore) {
const qualityScore = (movie.vote_average / 10) * 60; // 60% weight on quality
const personalScore = genreScore * 4; // 40% weight on preference
return qualityScore + personalScore;
}
// Generate a personalised 'why you will like this' reason
function generateReason(genre, genreScore, rating) {
const reasons = {
high: `Based on your strong love of ${genre} films and this movie's exceptional rating
of ${rating.toFixed(1)}/10, NetClick is confident you'll enjoy this one.`,
medium: `You enjoy ${genre} content, and this highly rated film
(${rating.toFixed(1)}/10) fits well with your viewing history.`,
low: `This is a top-rated ${genre} film (${rating.toFixed(1)}/10) that we think is worth
exploring based on your history.`,
};
if (genreScore >= 5) return reasons.high;
if (genreScore >= 2) return reasons.medium;
return reasons.low;
}
// Helper: get list of movie IDs the user has watched
function getWatchedIds(userId) {
return new Promise((resolve) => {
db.all('SELECT movie_id FROM watch_history WHERE user_id = ?', [userId],
(err, rows) => resolve(rows ? rows.map(r => r.movie_id) : [])
);
});
}
// Helper: get preference score for a genre
function getGenreScore(userId, genre) {
return new Promise((resolve) => {
db.get('SELECT score FROM preferences WHERE user_id = ? AND genre = ?',
[userId, genre],
(err, row) => resolve(row ? row.score : 0)
);
});
}
module.exports = { getRecommendations };