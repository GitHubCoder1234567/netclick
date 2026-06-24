// frontend/app.js
const BACKEND = 'https://netclick-production.up.railway.app';
let currentUser       = null;
let currentMovie      = null;
let currentGenre      = null;
let currentMoviesList = [];
let currentChartType  = 'trending';

// ── WATCHLIST HELPERS ─────────────────────────────────────────
function getWatchlist() {
  const key = `netclick_watchlist_${currentUser?.id}`;
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function saveWatchlist(list) {
  localStorage.setItem(`netclick_watchlist_${currentUser?.id}`, JSON.stringify(list));
}

// ── MOOD MAP ──────────────────────────────────────────────────
const MOOD_MAP = {
  happy:     { title: "Happy & Upbeat picks for you", genres: [35, 10751], sort: 'popularity.desc' },
  laugh:     { title: "Films guaranteed to make you laugh", genres: [35], sort: 'vote_average.desc' },
  thrilled:  { title: "Edge-of-your-seat thrillers", genres: [53, 80], sort: 'popularity.desc' },
  scared:    { title: "Horror films to keep you up at night", genres: [27], sort: 'vote_average.desc' },
  emotional: { title: "Emotionally powerful films", genres: [18], sort: 'vote_average.desc' },
  romantic:  { title: "Perfect date night films", genres: [10749], sort: 'popularity.desc' },
  adventure: { title: "Epic adventure picks", genres: [28, 12], sort: 'popularity.desc' },
  mindblown: { title: "Mind-bending films", genres: [878, 9648], sort: 'vote_average.desc' },
  chill:     { title: "Easy-watching films for tonight", genres: [35, 18], sort: 'popularity.desc' },
  inspired:  { title: "Films that will inspire you", genres: [36, 99], sort: 'vote_average.desc' },
  family:    { title: "Great for the whole family", genres: [10751, 16], sort: 'popularity.desc' },
  classic:   { title: "Timeless classics everyone should see", genres: [18, 35], sort: 'vote_average.desc', minYear: null, maxYear: '2000' },
};

window.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('netclick_user');
  if (!stored) return window.location.href = 'login.html';
  currentUser = JSON.parse(stored);

  updateGreeting();
  updateProfileDisplay();
  populateSidebarGenres();
  loadUserStats();

  // Apply UI language
  const savedLang = currentUser.preferred_language || 'en';
  localStorage.setItem('netclick_ui_lang', savedLang);
  if (typeof applyTranslations === 'function') applyTranslations();
  updateGreeting();

  // Show streaming prompt if first login
  const promptKey = `netclick_streaming_set_${currentUser.id}`;
  if (!localStorage.getItem(promptKey)) {
    setTimeout(() => showStreamingPrompt(), 800);
  }

  // Sidebar tab switching
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
      if (btn.dataset.tab === 'watchlist') renderWatchlist();
      if (btn.dataset.tab === 'charts')     loadCharts(currentChartType);
    });
  });

  // Filters
  document.getElementById('applyFilters').addEventListener('click', () => {
    if (currentGenre) loadMovies(currentGenre);
  });
  document.getElementById('resetFilters').addEventListener('click', () => {
    ['filterRating','filterRuntime','filterYear','filterPopularity','filterRuntimeRange'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('filterLanguage').value = 'en';
    if (currentGenre) loadMovies(currentGenre);
  });

  // Popup close
  document.getElementById('popupClose').addEventListener('click', () => {
    document.getElementById('moviePopup').classList.add('hidden');
  });
  document.getElementById('moviePopup').addEventListener('click', e => {
    if (e.target === document.getElementById('moviePopup'))
      document.getElementById('moviePopup').classList.add('hidden');
  });
  document.getElementById('profilePanel').addEventListener('click', e => {
    if (e.target === document.getElementById('profilePanel'))
      document.getElementById('profilePanel').classList.add('hidden');
  });
  document.getElementById('ratingPopup').addEventListener('click', e => {
    if (e.target === document.getElementById('ratingPopup'))
      document.getElementById('ratingPopup').classList.add('hidden');
  });

  document.getElementById('watchedBtn').addEventListener('click', markWatched);
  document.getElementById('watchlistBtn').addEventListener('click', toggleWatchlist);
  document.getElementById('thumbsUp').addEventListener('click',    () => submitRating(1));
  document.getElementById('thumbsDown').addEventListener('click',  () => submitRating(0));

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('netclick_user');
    window.location.href = 'login.html';
  });

  document.getElementById('profileBtn').addEventListener('click', openProfilePanel);
  document.getElementById('profileClose').addEventListener('click', () => {
    document.getElementById('profilePanel').classList.add('hidden');
  });
  document.getElementById('saveUsername').addEventListener('click', saveUsername);
  document.getElementById('saveEmail').addEventListener('click', saveEmail);
  document.getElementById('saveLanguage').addEventListener('click', saveLanguage);
  document.getElementById('pfpUpload').addEventListener('change', handlePfpUpload);
  document.getElementById('deleteAccount').addEventListener('click', deleteAccount);

  // Mood picker
  document.querySelectorAll('.mood-card').forEach(card => {
    card.addEventListener('click', () => loadMoodMovies(card.dataset.mood));
  });
  document.getElementById('moodBackBtn').addEventListener('click', () => {
    document.getElementById('moodResults').classList.add('hidden');
    document.getElementById('moodGrid').style.display = 'grid';
  });

  // Chart tabs
  document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartType = btn.dataset.chart;
      loadCharts(currentChartType);
    });
  });

  // Streaming prompt
  document.getElementById('saveStreamingBtn').addEventListener('click', saveStreamingServices);
  document.getElementById('skipStreamingBtn').addEventListener('click', () => {
    document.getElementById('streamingPrompt').classList.add('hidden');
    const promptKey = `netclick_streaming_set_${currentUser.id}`;
    localStorage.setItem(promptKey, 'skipped');
  });
  document.querySelectorAll('.service-toggle').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('selected'));
  });

  // Restore previously selected streaming services
  const savedServices = JSON.parse(localStorage.getItem(`netclick_services_${currentUser.id}`) || '[]');
  savedServices.forEach(s => {
    const el = document.querySelector(`.service-toggle[data-service="${s}"]`);
    if (el) el.classList.add('selected');
  });
});

// ── STREAMING PROMPT ──────────────────────────────────────────
function showStreamingPrompt() {
  document.getElementById('streamingPrompt').classList.remove('hidden');
}

function saveStreamingServices() {
  const selected = [...document.querySelectorAll('.service-toggle.selected')]
    .map(el => el.dataset.service);
  localStorage.setItem(`netclick_services_${currentUser.id}`, JSON.stringify(selected));
  localStorage.setItem(`netclick_streaming_set_${currentUser.id}`, 'true');
  document.getElementById('streamingPrompt').classList.add('hidden');
  if (selected.length > 0) {
    showToast(`Linked: ${selected.join(', ')}`);
  }
}

// ── USER STATS ────────────────────────────────────────────────
async function loadUserStats() {
  try {
    const res  = await fetch(`${BACKEND}/api/stats/${currentUser.id}`);
    const data = await res.json();
    const count = data.watched_count ?? 0;
    const hours = data.total_hours   ?? 0;
    const genre = data.top_genre     ?? '—';
    document.getElementById('watchedCount').textContent = count;
    document.getElementById('hoursCount').textContent   = hours > 0 ? `${hours}h` : '0h';
    document.getElementById('topGenre').textContent     = genre || '—';
  } catch (e) {}
}

// ── GREETING ──────────────────────────────────────────────────
function updateGreeting() {
  const name = currentUser.name || 'there';
  const prefix = (typeof t === 'function') ? t('greeting_prefix') : 'Hello';
  document.getElementById('greetingText').textContent = `${prefix}, ${name}`;
}

function updateProfileDisplay() {
  document.getElementById('sidebarUserName').textContent = currentUser.name || 'User';
  const avatarEl = document.getElementById('sidebarAvatar');
  if (currentUser.picture) {
    avatarEl.innerHTML = `<img src="${currentUser.picture}" alt="Profile">`;
  } else {
    avatarEl.innerHTML = `<span>${(currentUser.name || 'U').charAt(0).toUpperCase()}</span>`;
  }
}

// ── SIDEBAR GENRES ────────────────────────────────────────────
function populateSidebarGenres() {
  const genres = ['Action','Comedy','Drama','Sci-Fi','Thriller','Horror','Romance','Crime','Animation','Documentary'];
  document.getElementById('sidebarGenresList').innerHTML = genres.map(g =>
    `<button class="sidebar-genre-btn" data-genre="${g}">${g}</button>`
  ).join('');

  document.querySelectorAll('.sidebar-genre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentGenre = btn.dataset.genre;
      updateSidebarGenreHighlight(currentGenre);
      document.getElementById('filtersPanel').classList.remove('hidden');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      document.querySelector('[data-tab="personalised"]').classList.add('active');
      document.getElementById('tab-personalised').classList.remove('hidden');
      loadMovies(currentGenre);
    });
  });
}

function updateSidebarGenreHighlight(genre) {
  document.querySelectorAll('.sidebar-genre-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.genre === genre);
  });
}

// ── LOAD MOVIES ───────────────────────────────────────────────
async function loadMovies(genre) {
  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = '<div class="loading-movies">Finding your movies...</div>';

  const params = new URLSearchParams({
    minRating:       document.getElementById('filterRating').value       || '',
    maxRuntime:      document.getElementById('filterRuntime').value      || '',
    language:        document.getElementById('filterLanguage').value     || 'en',
    minYear:         document.getElementById('filterYear').value         || '',
    runtimeRange:    document.getElementById('filterRuntimeRange').value || '',
  }).toString();

  try {
    const res  = await fetch(`${BACKEND}/api/recommendations/${currentUser.id}/${genre}?${params}`);
    const data = await res.json();
    currentMoviesList = data.movies || [];

    if (!currentMoviesList.length) {
      grid.innerHTML = '<p class="placeholder-msg">No movies found. Try adjusting your filters.</p>';
      return;
    }
    renderMovieCards(grid, currentMoviesList);
  } catch (e) {
    grid.innerHTML = '<p class="placeholder-msg">Error loading movies. Check your connection.</p>';
  }
}

// ── MOOD MOVIES (ROUTED FOR REFRESHING REALTIME PAYLOADS) ─────
async function loadMoodMovies(mood) {
  const config = MOOD_MAP[mood];
  if (!config) return;

  document.getElementById('moodGrid').style.display = 'none';
  const resultsEl = document.getElementById('moodResults');
  const gridEl    = document.getElementById('moodMoviesGrid');
  resultsEl.classList.remove('hidden');
  document.getElementById('moodResultsTitle').textContent = config.title;
  gridEl.innerHTML = '<div class="loading-movies">Finding movies for your mood...</div>';

  try {
    const apiKey = await getTMDBKey();
    const sort = config.sort || 'popularity.desc';
    const yearParam = config.maxYear ? `&primary_release_date.lte=${config.maxYear}-12-31` : '';
    
    // Asynchronously call the live endpoint through your secure backend proxy mapping structures
    const url = `https://api.themoviedb.org/3/discover/movie` +
      `?api_key=${apiKey}` +
      `&with_genres=${config.genres.join('|')}` +
      `&sort_by=${sort}` +
      `&vote_count.gte=500` +
      `&vote_average.gte=6.5` +
      `&with_original_language=en` +
      yearParam +
      `&page=1`;

    const res  = await fetch(url);
    const data = await res.json();
    const movies = (data.results || []).slice(0, 16).map(m => ({
      id:           m.id,
      title:        m.title,
      rating:       m.vote_average,
      poster:       m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
      release_year: m.release_date?.split('-')[0] || '',
      why_youll_like: `Rated ${m.vote_average.toFixed(1)}/10 — a perfect match for your mood tonight.`,
    }));

    currentMoviesList = movies;
    if (!movies.length) {
      gridEl.innerHTML = '<p class="placeholder-msg">No movies found for this mood. Try another!</p>';
      return;
    }
    renderMovieCards(gridEl, movies);
  } catch (e) {
    gridEl.innerHTML = '<p class="placeholder-msg">Error loading movies. Please try again.</p>';
  }
}

// Get TMDB key via backend proxy
async function getTMDBKey() {
  try {
    const res  = await fetch(`${BACKEND}/api/tmdbkey`);
    const data = await res.json();
    return data.key;
  } catch {
    return '';
  }
}

// ── TOP CHARTS ────────────────────────────────────────────────
async function loadCharts(type) {
  const grid = document.getElementById('chartsGrid');
  grid.innerHTML = '<div class="loading-movies">Loading charts...</div>';

  try {
    // Queries the newly patched dynamic rolling timestamp charts route from your backend
    const res  = await fetch(`${BACKEND}/api/charts/${type}`);
    const data = await res.json();
    const movies = (data.movies || []).map((m, i) => ({
      ...m,
      chart_rank: i + 1
    }));
    currentMoviesList = movies;

    if (!movies.length) {
      grid.innerHTML = '<p class="placeholder-msg">Could not load charts right now.</p>';
      return;
    }
    renderMovieCards(grid, movies, true);
  } catch (e) {
    grid.innerHTML = '<p class="placeholder-msg">Error loading charts. Check your connection.</p>';
  }
}

// ── RENDER MOVIE CARDS ────────────────────────────────────────
function renderMovieCards(grid, movies, showRank = false) {
  grid.innerHTML = movies.map(movie => `
    <div class="movie-card" data-id="${movie.id}">
      <div class="card-poster">
        ${movie.poster
          ? `<img src="${movie.poster}" alt="${movie.title}">`
          : `<div class="no-poster">${movie.title.charAt(0)}</div>`}
        <div class="card-overlay">
          ${showRank && movie.chart_rank
            ? `<span class="card-rank">#${movie.chart_rank}</span>`
            : ''}
          <span class="card-rating">&#9733; ${movie.rating?.toFixed(1) ?? 'N/A'}</span>
        </div>
        <button class="remove-watchlist-btn" data-id="${movie.id}" title="Remove" style="display:none">&times;</button>
      </div>
      <div class="card-info">
        <h3>${movie.title}</h3>
        <p class="card-year">${movie.release_year ?? ''}</p>
        <p class="card-why">${movie.why_youll_like ?? ''}</p>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => openMoviePopup(card.dataset.id));
  });
}

// ── MOVIE POPUP ───────────────────────────────────────────────
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
    document.getElementById('popupOverview').textContent = detail.overview || '';

    document.getElementById('popupWhy').innerHTML =
      `<strong>Why NetClick recommends this:</strong> ${generateUniqueReason(detail, currentGenre)}`;

    const cast = detail.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || '';
    document.getElementById('popupCast').textContent = cast ? `Starring: ${cast}` : '';

    if (detail.poster_path) {
      document.getElementById('popupPoster').src =
        `https://image.tmdb.org/t/p/w342${detail.poster_path}`;
    }

    const providers    = detail['watch/providers']?.results?.AU;
    const streamingDiv = document.getElementById('streamingProviders');

    const linkedServices = JSON.parse(localStorage.getItem(`netclick_services_${currentUser.id}`) || '[]');

    if (providers && (providers.flatrate || providers.rent || providers.buy)) {
      const all    = [...(providers.flatrate||[]),...(providers.rent||[]),...(providers.buy||[])];
      const unique = [...new Map(all.map(p => [p.provider_name, p])).values()];
      streamingDiv.innerHTML = unique.map(p => {
        const isLinked = linkedServices.some(s =>
          p.provider_name.toLowerCase().includes(s.toLowerCase())
        );
        return `<span class="badge${isLinked ? ' badge-linked' : ''}">${p.provider_name}${isLinked ? ' ✓' : ''}</span>`;
      }).join('');
    } else {
      streamingDiv.innerHTML = `<span class="badge muted">Not currently streaming in AU</span>`;
    }

    updateWatchlistBtn();
    document.getElementById('moviePopup').classList.remove('hidden');
  } catch (e) {
    console.error('Error loading movie details:', e);
  }
}

// ── WATCHLIST ─────────────────────────────────────────────────
function updateWatchlistBtn() {
  const btn    = document.getElementById('watchlistBtn');
  const inList = getWatchlist().some(m => m.id == currentMovie?.id);
  btn.textContent = inList ? '✓ In Watchlist' : '+ Add to Watchlist';
  btn.classList.toggle('in-watchlist', inList);
}

function toggleWatchlist() {
  if (!currentMovie) return;
  let list = getWatchlist();
  const idx = list.findIndex(m => m.id == currentMovie.id);
  if (idx > -1) { list.splice(idx, 1); showToast('Removed from watchlist'); }
  else          { list.push({ ...currentMovie }); showToast('Added to watchlist!'); }
  saveWatchlist(list);
  updateWatchlistBtn();
}

function renderWatchlist() {
  const grid = document.getElementById('watchlistGrid');
  const list = getWatchlist();
  if (!list.length) {
    grid.innerHTML = '<div class="placeholder-msg">Your watchlist is empty. Add movies to watch later!</div>';
    return;
  }
  grid.innerHTML = list.map(movie => `
    <div class="movie-card" data-id="${movie.id}">
      <div class="card-poster">
        ${movie.poster
          ? `<img src="${movie.poster}" alt="${movie.title}">`
          : `<div class="no-poster">${movie.title.charAt(0)}</div>`}
        <div class="card-overlay">
          <span class="card-rating">&#9733; ${movie.rating?.toFixed(1) ?? 'N/A'}</span>
        </div>
        <button class="remove-watchlist-btn" data-id="${movie.id}" title="Remove">&times;</button>
      </div>
      <div class="card-info">
        <h3>${movie.title}</h3>
        <p class="card-year">${movie.release_year ?? ''}</p>
        <p class="card-why">${movie.why_youll_like ?? ''}</p>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.remove-watchlist-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      saveWatchlist(getWatchlist().filter(m => m.id != btn.dataset.id));
      renderWatchlist();
      showToast('Removed from watchlist');
    });
  });
  grid.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => {
      currentMoviesList = list;
      openMoviePopup(card.dataset.id);
    });
  });
}

// ── UNIQUE REASON ─────────────────────────────────────────────
function generateUniqueReason(detail, genre) {
  const rating    = detail.vote_average?.toFixed(1) || 'N/A';
  const year      = detail.release_date?.split('-')[0] || '';
  const runtime   = detail.runtime || null;
  const voteCount = detail.vote_count?.toLocaleString() || 'many';
  const cast      = detail.credits?.cast?.slice(0,2).map(a=>a.name).join(' and ') || null;
  const g         = genre || 'this';
  const reasons   = [
    `Rated ${rating}/10 by ${voteCount} viewers${year ? ` and released in ${year}` : ''}, this is one of the most appreciated ${g} films based on your taste profile.`,
    `${cast ? `Starring ${cast}, t` : 'T'}his ${year} ${g.toLowerCase()} film scored ${rating}/10 — a strong match for your viewing history.`,
    `With a ${rating}/10 rating${runtime ? ` and a ${runtime}-minute runtime` : ''}, this is a standout ${g} pick aligned with your history.`,
    `${voteCount} people rated this ${rating}/10 — the crowd agrees this ${g.toLowerCase()} film is worth your time${year ? ` (${year})` : ''}.`,
    `Your history shows you enjoy quality ${g} content. This ${year} film (${rating}/10${cast ? `, featuring ${cast}` : ''}) fits perfectly.`,
  ];
  return reasons[detail.id % reasons.length];
}

// ── WATCHED & RATING ──────────────────────────────────────────
async function markWatched() {
  if (!currentMovie) return;
  await fetch(`${BACKEND}/api/watched`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id, movieId: currentMovie.id,
      movieTitle: currentMovie.title, genres: currentGenre,
    })
  });
  document.getElementById('moviePopup').classList.add('hidden');
  document.getElementById('ratingPopup').classList.remove('hidden');
  loadUserStats();
}

async function submitRating(rating) {
  if (!currentMovie) return;
  await fetch(`${BACKEND}/api/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id, movieId: currentMovie.id, rating, genres: currentGenre,
    })
  });
  document.getElementById('ratingPopup').classList.add('hidden');
  if (currentGenre) loadMovies(currentGenre);
}

// ── PROFILE ───────────────────────────────────────────────────
function openProfilePanel() {
  document.getElementById('profileName').value  = currentUser.name  || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profileLang').value  = currentUser.preferred_language || 'en';
  const preview = document.getElementById('pfpPreview');
  preview.innerHTML = currentUser.picture
    ? `<img src="${currentUser.picture}" alt="Profile picture">`
    : `<span class="pfp-initial">${(currentUser.name||'U').charAt(0).toUpperCase()}</span>`;
  document.getElementById('profilePanel').classList.remove('hidden');
}

async function saveUsername() {
  const name = document.getElementById('profileName').value.trim();
  if (!name) return alert('Please enter a name');
  const res  = await fetch(`${BACKEND}/api/profile/username`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: currentUser.id, name })
  });
  const data = await res.json();
  if (data.success) {
    currentUser = { ...currentUser, name };
    localStorage.setItem('netclick_user', JSON.stringify(currentUser));
    updateGreeting(); updateProfileDisplay();
    showToast('Username updated!');
  }
}

async function saveEmail() {
  const email = document.getElementById('profileEmail').value.trim();
  if (!email) return alert('Please enter an email');
  const res  = await fetch(`${BACKEND}/api/profile/email`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: currentUser.id, email })
  });
  const data = await res.json();
  if (data.success) {
    currentUser = { ...currentUser, email };
    localStorage.setItem('netclick_user', JSON.stringify(currentUser));
    showToast('Email updated!');
  } else { alert(data.error || 'Could not update email'); }
}

async function saveLanguage() {
  const language = document.getElementById('profileLang').value;
  const res  = await fetch(`${BACKEND}/api/profile/language`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: currentUser.id, language })
  });
  const data = await res.json();
  if (data.success) {
    currentUser = { ...currentUser, preferred_language: language };
    localStorage.setItem('netclick_user', JSON.stringify(currentUser));
    localStorage.setItem('netclick_ui_lang', language || 'en');
    if (typeof applyTranslations === 'function') applyTranslations();
    updateGreeting();
    showToast('Language updated!');
  }
}

function handlePfpUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) return alert('Image must be under 5MB');
  const reader = new FileReader();
  reader.onload = async ev => {
    const base64 = ev.target.result;
    document.getElementById('pfpPreview').innerHTML = `<img src="${base64}" alt="pfp">`;
    const res  = await fetch(`${BACKEND}/api/profile/picture`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: currentUser.id, picture: base64 })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = { ...currentUser, picture: base64 };
      localStorage.setItem('netclick_user', JSON.stringify(currentUser));
      updateProfileDisplay(); showToast('Profile picture updated!');
    }
  };
  reader.readAsDataURL(file);
}

async function deleteAccount() {
  if (!confirm('Are you sure? This cannot be undone.')) return;
  const res  = await fetch(`${BACKEND}/api/profile/${currentUser.id}`, { method:'DELETE' });
  const data = await res.json();
  if (data.success) {
    localStorage.removeItem('netclick_user');
    window.location.href = 'login.html';
  }
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hidden'); }, 2500);
}

if (typeof applyTranslations === 'function') applyTranslations();