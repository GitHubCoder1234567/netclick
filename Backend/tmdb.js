// backend/tmdb.js
require('dotenv').config();
const fetch = require('node-fetch');

const KEY  = process.env.TMDB_API_KEY;
const BASE = 'https://api.themoviedb.org/3';

async function getMoviesByGenre(genreId, page = 1, language = 'en') {
  const langFilter = language ? `&with_original_language=${language}` : '';
  const url = `${BASE}/discover/movie?api_key=${KEY}` +
    `&with_genres=${genreId}` +
    `&sort_by=vote_average.desc` +
    `&vote_count.gte=300` +
    `&vote_average.gte=6.0` +
    `&page=${page}` +
    langFilter;

  const res  = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

async function getMovieDetails(movieId) {
  const url = `${BASE}/movie/${movieId}?api_key=${KEY}&append_to_response=credits`;
  const res  = await fetch(url);
  return await res.json();
}

async function searchMovies(query) {
  const url = `${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}`;
  const res  = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

const GENRE_MAP = {
  'Action':      28,
  'Comedy':      35,
  'Drama':       18,
  'Horror':      27,
  'Sci-Fi':      878,
  'Thriller':    53,
  'Romance':     10749,
  'Animation':   16,
  'Documentary': 99,
  'Crime':       80,
};

module.exports = { getMoviesByGenre, getMovieDetails, searchMovies, GENRE_MAP };