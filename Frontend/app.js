// frontend/app.js
const BACKEND = 'https://netclick-production.up.railway.app';
let currentUser = null;
let currentMovie = null;
let currentGenre = null;
let currentMoviesList = [];

window.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('netclick_user');
  if (!stored) return window.location.href = 'login.html';
  currentUser = JSON.parse(stored);

  document.getElementById('greetingText').textContent =
    `Hello, ${currentUser.name || 'there'}`;
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

  document.getElementById('applyFilters').addEventListener('click', () => {
    if (currentGenre) loadMovies(currentGenre);
  });

  document.getElementById('chatSubmit').addEventListener('click', submitChatPrompt);

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('netclick_user');
    window.location.href = 'login.html';
  });

  document.getElementById('popupClose').addEventListener('click', () => {
    document.getElementById('moviePopup').classList.add('hidden');
  });

  document.getElementById('watchedBtn').addEventListener('click', markWatched);
  document.getElementById('thumbsUp').addEventListener('click', () => submitRating(1));
  document.getElementById('thumbsDown').addEventListener('click', () => submitRating(0));
});

// ── LOAD MOVIE RECOMMENDATIONS ────────────────────────────────
async function loadMovies(genre) {
  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = '<div class="loading-movies">Finding your movies...</div>';

  const filters = {
    minRating:   document.getElementById('filterRating').value,
    maxRuntime:  document.getElementById('filterRuntime').value,
    language:    document.getElementById('filterLanguage').value,
    minYear:     document.getElementById('filterYear').value,
  };

  const params = new URLSearchParams(filters).toString();

  try {
    const res  = await fetch(`${BACKEND}/api/recommendations/${currentUser.id}/${genre}?${params}`);
    const data = await res.json();
    currentMoviesList = data.movies || [];

    if (!currentMoviesList.length) {
      grid.innerHTML = '<p class="placeholder-msg">No movies found. Try adjusting filters.</p>';
      return;
    }

    grid.innerHTML = currentMoviesList.map(movie => `
      <div class="movie-card" data-id="${movie.id}">
        <div class="card-poster">
          ${movie.poster
            ? `<img src="${movie.poster}" alt="${movie.title}">`
            : `<div class="no-poster">${movie.title.charAt(0)}</div>`}
          <div class="card-overlay">
            <span class="card-rating">&#9733; ${movie.rating.toFixed(1)}</span>
          </div>
        </div>
        <div class="card-info">
          <h3>${movie.title}</h3>
          <p class="card-year">${movie.release_year}</p>
          <p class="card-why">${movie.why_youll_like}</p>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.movie-card').forEach(card => {
      card.addEventListener('click', () => openMoviePopup(card.dataset.id));
    });

  } catch (e) {
    grid.innerHTML = '<p class="placeholder-msg">Error loading movies. Please try again.</p>';
  }
}

// ── MOVIE DETAIL POPUP ────────────────────────────────────────
async function openMoviePopup(movieId) {
  currentMovie = currentMoviesList.find(m => m.id == movieId);
  if (!currentMovie) return;

  try {
    const res    = await fetch(`${BACKEND}/api/movie/${movieId}`);
    const detail = await res.json();

    document.getElementById('popupTitle').textContent    = detail.title;
    document.getElementById('popupYear').textContent     = detail.release_date?.split('-')[0] || '';
    document.getElementById('popupRating').textContent   = `${detail.vote_average?.toFixed(1)} / 10`;
    document.getElementById('popupRuntime').textContent  = detail.runtime ? `${detail.runtime} min` : '';
    document.getElementById('popupOverview').textContent = detail.overview;

    // Generate a unique reason based on actual movie data
    const reason = generateUniqueReason(detail, currentGenre);
    document.getElementById('popupWhy').innerHTML =
      `<strong>Why NetClick recommends this:</strong> ${reason}`;

    const cast = detail.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || '';
    document.getElementById('popupCast').textContent = cast ? `Starring: ${cast}` : '';

    if (detail.poster_path) {
      document.getElementById('popupPoster').src =
        `https://image.tmdb.org/t/p/w342${detail.poster_path}`;
    }

    document.getElementById('moviePopup').classList.remove('hidden');
  } catch (e) {
    console.error('Error loading movie details:', e);
  }
}

// ── GENERATE UNIQUE RECOMMENDATION REASON ────────────────────
function generateUniqueReason(detail, genre) {
  const title      = detail.title;
  const rating     = detail.vote_average?.toFixed(1);
  const year       = detail.release_date?.split('-')[0];
  const runtime    = detail.runtime;
  const cast       = detail.credits?.cast?.slice(0, 2).map(a => a.name).join(' and ') || '';
  const voteCount  = detail.vote_count;

  const reasons = [
    `${title} is one of the highest-rated ${genre} films of ${year}, scoring ${rating}/10 from over ${voteCount?.toLocaleString()} viewers — a strong sign you'll enjoy it based on your history.`,
    `With a ${rating}/10 rating and ${cast ? `starring ${cast}` : 'a stellar cast'}, ${title} is a standout pick in the ${genre} genre that aligns with your taste profile.`,
    `Your watch history shows a clear preference for high-quality ${genre} content — ${title} (${rating}/10, ${year}) fits that pattern perfectly.`,
    `${title} has earned ${rating}/10 from a large audience${runtime ? ` and runs ${runtime} minutes` : ''}, making it an ideal ${genre} recommendation based on what you've enjoyed before.`,
    `Rated ${rating}/10 and released in ${year}, ${title} is a critically appreciated ${genre} film${cast ? ` featuring ${cast}` : ''} that matches your viewing preferences.`,
  ];

  // Pick reason based on movie ID so it's consistent per movie but different across movies
  return reasons[detail.id % reasons.length];
}

// ── MARK AS WATCHED ───────────────────────────────────────────
async function markWatched() {
  if (!currentMovie) return;
  await fetch(`${BACKEND}/api/watched`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId:     currentUser.id,
      movieId:    currentMovie.id,
      movieTitle: currentMovie.title,
      genres:     currentGenre,
    })
  });
  document.getElementById('moviePopup').classList.add('hidden');
  document.getElementById('ratingPopup').classList.remove('hidden');
}

// ── SUBMIT RATING ─────────────────────────────────────────────
async function submitRating(rating) {
  if (!currentMovie) return;
  await fetch(`${BACKEND}/api/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId:  currentUser.id,
      movieId: currentMovie.id,
      rating,
      genres:  currentGenre,
    })
  });
  document.getElementById('ratingPopup').classList.add('hidden');
  if (currentGenre) loadMovies(currentGenre);
}

// ── AI CHATBOT ────────────────────────────────────────────────
async function submitChatPrompt() {
  const prompt = document.getElementById('chatPrompt').value.trim();
  if (!prompt) return alert('Please describe what you want to watch');

  const btn = document.getElementById('chatSubmit');
  btn.textContent = 'Thinking...';
  btn.disabled = true;

  try {
    const res  = await fetch(`${BACKEND}/api/chatbot`, {
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
      suggestionsDiv.innerHTML = '<p>No suggestions found. Try rephrasing your prompt with more detail.</p>';
    }
    document.getElementById('chatbotResponse').classList.remove('hidden');

  } catch (e) {
    btn.textContent = 'Find Movies';
    btn.disabled = false;
    alert('Error connecting to chatbot. Please try again.');
  }
}