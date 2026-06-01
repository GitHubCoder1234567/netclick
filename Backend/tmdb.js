// backend/tmdb.js
require('dotenv').config();
const fetch = require('node-fetch');
const KEY = process.env.TMDB_API_KEY;
const BASE = 'https://api.themoviedb.org/3';
// Fetch movies by genre with quality filters
async function getMoviesByGenre(genreId, page = 1) {
const url = `${BASE}/discover/movie?api_key=${KEY}` +
`&with_genres=${genreId}` +
`&sort_by=vote_average.desc` + // highest rated first
`&vote_count.gte=500` + // must have 500+ votes (filters out unknowns)
`&vote_average.gte=6.5` + // must be at least 6.5/10 rated
`&page=${page}`;
const res = await fetch(url);
const data = await res.json();
return data.results || [];
}

// Get full movie details (cast, runtime, etc.)
async function getMovieDetails(movieId) {
const url = `${BASE}/movie/${movieId}?api_key=${KEY}&append_to_response=credits`;
const res = await fetch(url);
return await res.json();
}
// Search by title (used by chatbot)
async function searchMovies(query) {
const url = `${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}`;
const res = await fetch(url);
const data = await res.json();
return data.results || [];
}
// TMDB genre IDs — the ones that match your genre tabs
const GENRE_MAP = {
'Action': 28,
'Comedy': 35,
'Drama': 18,
'Horror': 27,
'Sci-Fi': 878,
'Thriller': 53,
'Romance': 10749,
'Animation': 16,
'Documentary': 99,
'Crime': 80,
};
module.exports = { getMoviesByGenre, getMovieDetails, searchMovies, GENRE_MAP };