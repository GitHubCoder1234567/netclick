// backend/tmdb.js
require('dotenv').config();
const fetch = require('node-fetch');

const KEY  = process.env.TMDB_API_KEY;
const BASE = 'https://api.themoviedb.org/3';

async function getMoviesByGenre(genreId, page = 1, language = 'en', filters = {}) {
  const langFilter = language && language !== 'all'
    ? `&with_original_language=${language}` : '';

  // Runtime filters — TMDB uses with_runtime.gte / with_runtime.lte
  let runtimeFilter = '';
  if (filters.maxRuntime && parseInt(filters.maxRuntime) < 9999) {
    runtimeFilter += `&with_runtime.lte=${filters.maxRuntime}`;
  }
  if (filters.minRuntime) {
    runtimeFilter += `&with_runtime.gte=${filters.minRuntime}`;
  }
  // Runtime range shorthand
  if (filters.runtimeRange) {
    if      (filters.runtimeRange === 'short')  runtimeFilter = '&with_runtime.lte=100';
    else if (filters.runtimeRange === 'medium') runtimeFilter = '&with_runtime.gte=100&with_runtime.lte=130';
    else if (filters.runtimeRange === 'long')   runtimeFilter = '&with_runtime.gte=130';
  }

  // Release date filter
  let yearFilter = '';
  if (filters.minYear && parseInt(filters.minYear) > 0) {
    yearFilter = `&primary_release_date.gte=${filters.minYear}-01-01`;
  }

  // Min rating filter passed to TMDB
  let ratingFilter = '';
  if (filters.minRating && parseFloat(filters.minRating) > 0) {
    ratingFilter = `&vote_average.gte=${filters.minRating}`;
  }

  const url = `${BASE}/discover/movie?api_key=${KEY}` +
    `&with_genres=${genreId}` +
    `&sort_by=popularity.desc` +
    `&vote_count.gte=200` +
    `&page=${page}` +
    langFilter +
    runtimeFilter +
    yearFilter +
    ratingFilter;

  const res  = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

async function getMovieDetails(movieId) {
  const url = `${BASE}/movie/${movieId}?api_key=${KEY}&append_to_response=credits,watch/providers`;
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