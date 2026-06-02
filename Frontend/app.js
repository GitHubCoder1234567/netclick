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

  updateGreeting();
  updateProfileDisplay();
  populateSidebarGenres();

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
      document.getElementById('sidebarGenres').classList.remove('hidden');
      updateSidebarGenreHighlight(currentGenre);
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
  document.getElementById('thumbsUp').addEventListener('click',   () => submitRating(1));
  document.getElementById('thumbsDown').addEventListener('click', () => submitRating(0));

  // Profile button
  document.getElementById('profileBtn').addEventListener('click', () => {
    openProfilePanel();
  });

  // Profile panel close
  document.getElementById('profileClose').addEventListener('click', () => {
    document.getElementById('profilePanel').classList.add('hidden');
  });

  // Profile form handlers
  document.getElementById('saveUsername').addEventListener('click', saveUsername);
  document.getElementById('saveEmail').addEventListener('click', saveEmail);
  document.getElementById('saveLanguage').addEventListener('click', saveLanguage);
  document.getElementById('pfpUpload').addEventListener('change', handlePfpUpload);
  document.getElementById('deleteAccount').addEventListener('click', deleteAccount);
});

// ── GREETING & PROFILE DISPLAY ────────────────────────────────
function updateGreeting() {
  const name = currentUser.name || 'there';
  document.getElementById('greetingText').textContent = `Hello, ${name}`;
}

function updateProfileDisplay() {
  document.getElementById('sidebarUserName').textContent = currentUser.name || 'User';
  const pfp = currentUser.picture;
  const avatarEl = document.getElementById('sidebarAvatar');
  if (pfp) {
    avatarEl.innerHTML = `<img src="${pfp}" alt="Profile">`;
  } else {
    avatarEl.innerHTML = `<span>${(currentUser.name || 'U').charAt(0).toUpperCase()}</span>`;
  }
}

// ── SIDEBAR GENRES ────────────────────────────────────────────
function populateSidebarGenres() {
  const genres = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Horror', 'Romance', 'Crime', 'Animation', 'Documentary'];
  const genresList = document.getElementById('sidebarGenresList');
  
  genresList.innerHTML = genres.map(genre => `
    <button class="sidebar-genre-btn" data-genre="${genre}">${genre}</button>
  `).join('');
  
  document.querySelectorAll('.sidebar-genre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.genre-btn').forEach(b => {
        if (b.dataset.genre === btn.dataset.genre) b.click();
      });
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

  const minRating  = document.getElementById('filterRating').value;
  const maxRuntime = document.getElementById('filterRuntime').value;
  const language   = document.getElementById('filterLanguage').value;
  const minYear    = document.getElementById('filterYear').value;

  const params = new URLSearchParams({
    minRating:  minRating  || '',
    maxRuntime: maxRuntime || '',
    language:   language   || 'en',
    minYear:    minYear    || '',
  }).toString();

  try {
    const res  = await fetch(`${BACKEND}/api/recommendations/${currentUser.id}/${genre}?${params}`);
    const data = await res.json();
    currentMoviesList = data.movies || [];

    if (!currentMoviesList.length) {
      grid.innerHTML = '<p class="placeholder-msg">No movies found. Try adjusting your filters.</p>';
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
    grid.innerHTML = '<p class="placeholder-msg">Error loading movies. Check your connection.</p>';
  }
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

    const reason = generateUniqueReason(detail, currentGenre);
    document.getElementById('popupWhy').innerHTML =
      `<strong>Why NetClick recommends this:</strong> ${reason}`;

    const cast = detail.credits?.cast?.slice(0, 5).map(a => a.name).join(', ') || '';
    document.getElementById('popupCast').textContent = cast ? `Starring: ${cast}` : '';

    if (detail.poster_path) {
      document.getElementById('popupPoster').src =
        `https://image.tmdb.org/t/p/w342${detail.poster_path}`;
    }

    // Where to watch — use TMDB watch providers for Australia (AU)
    const providers = detail['watch/providers']?.results?.AU;
    const streamingDiv = document.getElementById('streamingProviders');
    if (providers && (providers.flatrate || providers.rent || providers.buy)) {
      const all = [
        ...(providers.flatrate || []),
        ...(providers.rent     || []),
        ...(providers.buy      || []),
      ];
      // Remove duplicates by provider_name
      const unique = [...new Map(all.map(p => [p.provider_name, p])).values()];
      streamingDiv.innerHTML = unique.map(p =>
        `<span class="badge">${p.provider_name}</span>`
      ).join('');
    } else {
      streamingDiv.innerHTML = `<span class="badge muted">Not currently streaming in AU</span>`;
    }

    document.getElementById('moviePopup').classList.remove('hidden');
  } catch (e) {
    console.error('Error loading movie details:', e);
  }
}

// ── UNIQUE REASON PER MOVIE ───────────────────────────────────
function generateUniqueReason(detail, genre) {
  const rating    = detail.vote_average?.toFixed(1) || 'N/A';
  const year      = detail.release_date?.split('-')[0] || '';
  const runtime   = detail.runtime || null;
  const voteCount = detail.vote_count?.toLocaleString() || 'many';
  const cast      = detail.credits?.cast?.slice(0, 2).map(a => a.name).join(' and ') || null;
  const overview  = detail.overview || '';

  const reasons = [
    `Rated ${rating}/10 by ${voteCount} viewers${year ? ` and released in ${year}` : ''}, this is one of the most appreciated ${genre} films based on your taste profile.`,
    `${cast ? `Starring ${cast}, t` : 'T'}his ${year || ''} ${genre.toLowerCase()} film scored ${rating}/10 — a strong match for the type of content you've been watching.`,
    `With a ${rating}/10 rating${runtime ? ` and a tight ${runtime}-minute runtime` : ''}, this is a standout ${genre} pick that aligns with your viewing history.`,
    `${voteCount} people rated this ${rating}/10 — the crowd agrees this ${genre.toLowerCase()} film is worth your time${year ? ` (${year})` : ''}.`,
    `Your history shows you enjoy quality ${genre} content. This ${year || ''} film (${rating}/10${cast ? `, featuring ${cast}` : ''}) fits that preference well.`,
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
      userId:     currentUser.id,
      movieId:    currentMovie.id,
      movieTitle: currentMovie.title,
      genres:     currentGenre,
    })
  });
  document.getElementById('moviePopup').classList.add('hidden');
  document.getElementById('ratingPopup').classList.remove('hidden');
}

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

// ── CHATBOT ───────────────────────────────────────────────────
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
      suggestionsDiv.innerHTML = '<p>No suggestions found. Try rephrasing your prompt.</p>';
    }
    document.getElementById('chatbotResponse').classList.remove('hidden');

  } catch (e) {
    btn.textContent = 'Find Movies';
    btn.disabled = false;
    alert('Error connecting to chatbot. Please try again.');
  }
}

// ── PROFILE PANEL ─────────────────────────────────────────────
function openProfilePanel() {
  document.getElementById('profileName').value  = currentUser.name  || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profileLang').value  = currentUser.preferred_language || 'en';

  const preview = document.getElementById('pfpPreview');
  if (currentUser.picture) {
    preview.innerHTML = `<img src="${currentUser.picture}" alt="Profile picture">`;
  } else {
    preview.innerHTML = `<span class="pfp-initial">${(currentUser.name || 'U').charAt(0).toUpperCase()}</span>`;
  }

  document.getElementById('profilePanel').classList.remove('hidden');
}

async function saveUsername() {
  const name = document.getElementById('profileName').value.trim();
  if (!name) return alert('Please enter a name');

  const res  = await fetch(`${BACKEND}/api/profile/username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, name })
  });
  const data = await res.json();
  if (data.success) {
    currentUser = { ...currentUser, name };
    localStorage.setItem('netclick_user', JSON.stringify(currentUser));
    updateGreeting();
    updateProfileDisplay();
    showToast('Username updated!');
  }
}

async function saveEmail() {
  const email = document.getElementById('profileEmail').value.trim();
  if (!email) return alert('Please enter an email');

  const res  = await fetch(`${BACKEND}/api/profile/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, email })
  });
  const data = await res.json();
  if (data.success) {
    currentUser = { ...currentUser, email };
    localStorage.setItem('netclick_user', JSON.stringify(currentUser));
    showToast('Email updated!');
  } else {
    alert(data.error || 'Could not update email');
  }
}

async function saveLanguage() {
  const language = document.getElementById('profileLang').value;
  const res = await fetch(`${BACKEND}/api/profile/language`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, language })
  });
  const data = await res.json();
  if (data.success) {
    currentUser = { ...currentUser, preferred_language: language };
    localStorage.setItem('netclick_user', JSON.stringify(currentUser));
    showToast('Language preference saved!');
  }
}

function handlePfpUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return alert('Image must be under 5MB');

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result;

    // Show preview immediately
    document.getElementById('pfpPreview').innerHTML =
      `<img src="${base64}" alt="Profile picture">`;

    // Save to backend
    const res  = await fetch(`${BACKEND}/api/profile/picture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, picture: base64 })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = { ...currentUser, picture: base64 };
      localStorage.setItem('netclick_user', JSON.stringify(currentUser));
      updateProfileDisplay(); // updates sidebar avatar in real time
      showToast('Profile picture updated!');
    }
  };
  reader.readAsDataURL(file);
}

async function deleteAccount() {
  const confirmed = confirm(
    'Are you sure you want to delete your account? This cannot be undone.'
  );
  if (!confirmed) return;

  const res = await fetch(`${BACKEND}/api/profile/${currentUser.id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (data.success) {
    localStorage.removeItem('netclick_user');
    window.location.href = 'login.html';
  }
}

// ── TOAST NOTIFICATION ────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, 2500);
}