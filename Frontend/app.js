// frontend/app.js
const BACKEND = 'netclick-production.up.railway.app';
let currentUser = null;
let currentMovie = null;
let currentGenre = null;
// nn ON PAGE LOAD nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
window.addEventListener('DOMContentLoaded', () => {
const stored = localStorage.getItem('netclick_user');
if (!stored) return window.location.href = 'login.html';
currentUser = JSON.parse(stored);
// Show greeting
document.getElementById('greetingText').textContent =
`Hello, ${currentUser.name || 'there'} n`;
document.getElementById('sidebarUserName').textContent = currentUser.name;
// Sidebar tab switching
document.querySelectorAll('.nav-btn').forEach(btn => {
btn.addEventListener('click', () => {
document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
btn.classList.add('active');
document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
});
});
// Genre buttons
document.querySelectorAll('.genre-btn').forEach(btn => {
btn.addEventListener('click', () => {
document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
btn.classList.add('active');
currentGenre = btn.dataset.genre;
document.getElementById('filtersPanel').classList.remove('hidden');
loadMovies(currentGenre);
});
});
// Filter apply
document.getElementById('applyFilters').addEventListener('click', () => {
if (currentGenre) loadMovies(currentGenre);
});
// Chatbot submit
document.getElementById('chatSubmit').addEventListener('click', submitChatPrompt);
// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {

localStorage.removeItem('netclick_user');
window.location.href = 'login.html';
});
// Close popup
document.getElementById('popupClose').addEventListener('click', () => {
document.getElementById('moviePopup').classList.add('hidden');
});
// Watched button inside popup
document.getElementById('watchedBtn').addEventListener('click', markWatched);
// Rating buttons
document.getElementById('thumbsUp').addEventListener('click', () => submitRating(1));
document.getElementById('thumbsDown').addEventListener('click', () => submitRating(0));
});
// nn LOAD MOVIE RECOMMENDATIONS nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
async function loadMovies(genre) {
const grid = document.getElementById('moviesGrid');
grid.innerHTML = '<div class="loading-movies">Finding your movies...</div>';
const filters = {
minRating: document.getElementById('filterRating').value,
maxRuntime: document.getElementById('filterRuntime').value,
};
const params = new URLSearchParams(filters).toString();
const res = await
fetch(`${BACKEND}/api/recommendations/${currentUser.id}/${genre}?${params}`);
const data = await res.json();
const movies = data.movies;
if (!movies.length) {
grid.innerHTML = '<p class="placeholder-msg">No movies found. Try adjustiing filters.</p>';
return;
}
grid.innerHTML = movies.map(movie => `
<div class="movie-card" data-id="${movie.id}" data-title="${movie.title}"
data-genres="${genre}">
<div class="card-poster">
${movie.poster
? `<img src="${movie.poster}" alt="${movie.title}">`
: `<div class="no-poster">${movie.title.charAt(0)}</div>`}
<div class="card-overlay">
<span class="card-rating">n ${movie.rating.toFixed(1)}</span>
</div>
</div>
<div class="card-info">
<h3>${movie.title}</h3>
<p class="card-year">${movie.release_year}</p>
NetClick Build Guide · Page 27
<p class="card-why">${movie.why_youll_like}</p>
</div>
</div>
`).join('');
// Attach click events to each card
document.querySelectorAll('.movie-card').forEach(card => {
card.addEventListener('click', () => openMoviePopup(card.dataset.id, movies));
});
}
// nn MOVIE DETAIL POPUP nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
async function openMoviePopup(movieId, movies) {
currentMovie = movies.find(m => m.id == movieId);
if (!currentMovie) return;
// Fetch full details (cast, runtime, etc.)
const res = await fetch(`${BACKEND}/api/movie/${movieId}`);
const detail = await res.json();
document.getElementById('popupTitle').textContent = detail.title;
document.getElementById('popupYear').textContent = detail.release_date?.split('-')[0] ||
'';
document.getElementById('popupRating').textContent = `n
${detail.vote_average?.toFixed(1)} / 10`;
document.getElementById('popupRuntime').textContent = detail.runtime ?
`${detail.runtime} min` : '';
document.getElementById('popupOverview').textContent = detail.overview;
document.getElementById('popupWhy').innerHTML =
`<strong>Why NetClick recommends this:</strong> ${currentMovie.why_youll_like}`;
// Top 5 cast members
const cast = detail.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || '';
document.getElementById('popupCast').textContent = cast ? `Starring: ${cast}` : '';
if (detail.poster_path) {
document.getElementById('popupPoster').src =
`https://image.tmdb.org/t/p/w342${detail.poster_path}`;
}
document.getElementById('moviePopup').classList.remove('hidden');
}
// nn MARK AS WATCHED nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
async function markWatched() {
if (!currentMovie) return;
await fetch(`${BACKEND}/api/watched`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
userId: currentUser.id,
movieId: currentMovie.id,
movieTitle: currentMovie.title,

genres: currentGenre,
})
});
document.getElementById('moviePopup').classList.add('hidden');
document.getElementById('ratingPopup').classList.remove('hidden');
}
// nn SUBMIT RATING nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
async function submitRating(rating) {
if (!currentMovie) return;
await fetch(`${BACKEND}/api/rate`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
userId: currentUser.id,
movieId: currentMovie.id,
rating,
genres: currentGenre,
})
});
document.getElementById('ratingPopup').classList.add('hidden');
if (currentGenre) loadMovies(currentGenre); // refresh the list
}
// nn AI CHATBOT nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
async function submitChatPrompt() {
const prompt = document.getElementById('chatPrompt').value.trim();
if (!prompt) return alert('Please describe what you want to watch');
const btn = document.getElementById('chatSubmit');
btn.textContent = 'Thinking...';
btn.disabled = true;
const res = await fetch(`${BACKEND}/api/chatbot`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ userId: currentUser.id, prompt })
});
const data = await res.json();
btn.textContent = 'Find Movies';
btn.disabled = false;
document.getElementById('chatMessage').textContent = data.message || '';
const suggestionsDiv = document.getElementById('chatSuggestions');
if (data.suggestions?.length) {
suggestionsDiv.innerHTML = data.suggestions.map(s => `
<div class="chat-suggestion-card">
<h4>${s.title} (${s.year})</h4>
<p>${s.reason}</p>
</div>
`).join('');
} else {
suggestionsDiv.innerHTML = '<p>No suggestions found. Try rephrasing your prompt.</p>';
}
document.getElementById('chatbotResponse').classList.remove('hidden');
}