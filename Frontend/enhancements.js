// enhancements.js - All new features for NetClick
// This file adds: search, trending, watchlist, stats, animations

const BACKEND = 'https://netclick-production.up.railway.app';
let watchlist = JSON.parse(localStorage.getItem('netclick_watchlist') || '[]');
let userStats = JSON.parse(localStorage.getItem('netclick_stats') || '{"watched": 0, "hours": 0, "topGenre": "—"}');

// Initialize all enhancements
window.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initTrendingCarousel();
  initWatchlistFeature();
  initUserStats();
  initMicroAnimations();
});

// ── SEARCH FEATURE ────────────────────────────────────────
function initSearch() {
  const searchInput = document.getElementById('globalSearch');
  const searchBtn = document.getElementById('searchBtn');
  const searchResults = document.getElementById('searchResults');
  const searchList = document.getElementById('searchResultsList');
  
  if (!searchInput) return;
  
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      searchResults.classList.add('hidden');
      return;
    }
    
    try {
      const res = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.results?.length) {
        searchList.innerHTML = data.results.slice(0, 8).map(movie => `
          <div class="search-result-item" data-id="${movie.id}">
            <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : ''}" alt="">
            <div class="search-result-info">
              <div class="search-result-title">${movie.title}</div>
              <div class="search-result-year">${movie.release_date?.split('-')[0] || ''}</div>
            </div>
          </div>
        `).join('');
        
        document.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            openMoviePopup(item.dataset.id);
            searchResults.classList.add('hidden');
            searchInput.value = '';
          });
        });
        
        searchResults.classList.remove('hidden');
      } else {
        searchList.innerHTML = '<div class="search-no-results">No movies found</div>';
        searchResults.classList.remove('hidden');
      }
    } catch (e) {
      console.error('Search error:', e);
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar-container')) {
      searchResults.classList.add('hidden');
    }
  });
}

// ── TRENDING CAROUSEL ────────────────────────────────────
function initTrendingCarousel() {
  const track = document.getElementById('trendingTrack');
  if (!track) return;
  
  // Load trending movies (using top rated for now)
  loadTrendingMovies();
  
  document.getElementById('trendingPrev')?.addEventListener('click', () => scrollCarousel(-1));
  document.getElementById('trendingNext')?.addEventListener('click', () => scrollCarousel(1));
}

async function loadTrendingMovies() {
  const track = document.getElementById('trendingTrack');
  if (!track) return;
  
  // This would ideally call a trending endpoint - for now use recommendations
  const genres = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller'];
  const randomGenre = genres[Math.floor(Math.random() * genres.length)];
  
  try {
    // We'll use the recommender for top movies
    const movies = await fetch(`${BACKEND}/api/recommendations/${currentUser?.id}/${randomGenre}`)
      .then(r => r.json())
      .then(d => (d.movies || []).slice(0, 6));
    
    track.innerHTML = movies.map(movie => `
      <div class="carousel-item" data-id="${movie.id}">
        <div class="carousel-poster">
          ${movie.poster ? `<img src="${movie.poster}" alt="${movie.title}">` : '<div class="no-poster">' + movie.title.charAt(0) + '</div>'}
          <div class="carousel-overlay">
            <span class="carousel-rating">★ ${movie.rating.toFixed(1)}</span>
          </div>
        </div>
        <div class="carousel-title">${movie.title}</div>
      </div>
    `).join('');
    
    document.querySelectorAll('.carousel-item').forEach(item => {
      item.addEventListener('click', () => openMoviePopup(item.dataset.id));
    });
  } catch (e) {
    console.error('Trending load error:', e);
  }
}

function scrollCarousel(direction) {
  const track = document.getElementById('trendingTrack');
  if (!track) return;
  const scrollAmount = 320 * direction;
  track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

// ── WATCHLIST FEATURE ────────────────────────────────────
function initWatchlistFeature() {
  const watchlistBtn = document.getElementById('watchlistBtn');
  if (!watchlistBtn) return;
  
  watchlistBtn.addEventListener('click', addToWatchlist);
  loadWatchlistDisplay();
}

function addToWatchlist() {
  if (!currentMovie) return;
  
  const exists = watchlist.some(m => m.id === currentMovie.id);
  if (!exists) {
    watchlist.push(currentMovie);
    localStorage.setItem('netclick_watchlist', JSON.stringify(watchlist));
    showToast('Added to watchlist!');
    updateWatchlistBtn();
  } else {
    showToast('Already in watchlist');
  }
}

function removeFromWatchlist(movieId) {
  watchlist = watchlist.filter(m => m.id !== movieId);
  localStorage.setItem('netclick_watchlist', JSON.stringify(watchlist));
  loadWatchlistDisplay();
}

function loadWatchlistDisplay() {
  const grid = document.getElementById('watchlistGrid');
  if (!grid) return;
  
  if (!watchlist.length) {
    grid.innerHTML = '<div class="placeholder-msg">Your watchlist is empty. Add movies to watch later!</div>';
    return;
  }
  
  grid.innerHTML = watchlist.map(movie => `
    <div class="movie-card watchlist-card" data-id="${movie.id}">
      <div class="card-poster">
        ${movie.poster ? `<img src="${movie.poster}" alt="${movie.title}">` : `<div class="no-poster">${movie.title.charAt(0)}</div>`}
        <button class="remove-watchlist" data-id="${movie.id}">✕</button>
      </div>
      <div class="card-info">
        <h3>${movie.title}</h3>
        <p class="card-year">${movie.release_year}</p>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.watchlist-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-watchlist')) {
        openMoviePopup(card.dataset.id);
      }
    });
  });
  
  document.querySelectorAll('.remove-watchlist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromWatchlist(btn.dataset.id);
    });
  });
}

function updateWatchlistBtn() {
  const btn = document.getElementById('watchlistBtn');
  if (!btn || !currentMovie) return;
  const inWatchlist = watchlist.some(m => m.id === currentMovie.id);
  btn.textContent = inWatchlist ? '✓ In Watchlist' : '📚 Add to Watchlist';
  btn.style.opacity = inWatchlist ? '0.7' : '1';
}

// ── USER STATS ────────────────────────────────────────────
function initUserStats() {
  updateStatsDisplay();
}

function updateStatsDisplay() {
  document.getElementById('watchedCount').textContent = userStats.watched;
  document.getElementById('hoursCount').textContent = userStats.hours + 'h';
  document.getElementById('topGenre').textContent = userStats.topGenre;
}

function incrementStats(hours = 2) {
  userStats.watched += 1;
  userStats.hours += hours;
  localStorage.setItem('netclick_stats', JSON.stringify(userStats));
  updateStatsDisplay();
}

// ── MICRO ANIMATIONS ────────────────────────────────────
function initMicroAnimations() {
  // Skeleton loaders on load
  observeLoadingStates();
}

function observeLoadingStates() {
  // Add loading skeleton animation class when movies load
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.loading-movies').forEach(el => {
      el.classList.add('skeleton-animate');
    });
  });
  
  observer.observe(document.getElementById('moviesGrid') || document.body, {
    childList: true
  });
}

// ── RATING DISTRIBUTION ────────────────────────────────
function displayRatingDistribution(detail) {
  const distributionDiv = document.getElementById('ratingDistribution');
  if (!distributionDiv || !detail.vote_average) return;
  
  const rating = detail.vote_average;
  const voteCount = detail.vote_count || 1;
  
  // Simulate distribution
  const distribution = [
    { stars: '5★', percent: 35 },
    { stars: '4★', percent: 25 },
    { stars: '3★', percent: 20 },
    { stars: '2★', percent: 12 },
    { stars: '1★', percent: 8 }
  ];
  
  distributionDiv.innerHTML = `
    <div class="rating-dist-header">
      <h4>Rating Distribution</h4>
      <span class="rating-avg">${rating.toFixed(1)}/10 (${(voteCount / 1000).toFixed(1)}k votes)</span>
    </div>
    <div class="rating-dist-bars">
      ${distribution.map(d => `
        <div class="dist-row">
          <span class="dist-label">${d.stars}</span>
          <div class="dist-bar">
            <div class="dist-fill" style="width: ${d.percent}%"></div>
          </div>
          <span class="dist-percent">${d.percent}%</span>
        </div>
      `).join('')}
    </div>
  `;
}

// Override openMoviePopup to add new features
const originalOpenMoviePopup = window.openMoviePopup;
window.openMoviePopup = async function(movieId) {
  // Call original
  await originalOpenMoviePopup.call(this, movieId);
  
  // Add new features
  updateWatchlistBtn();
  displayRatingDistribution(currentMovie || {});
  
  // Increment stats when they view (rough tracking)
  if (currentMovie) {
    incrementStats(0); // Don't add hours on just view
  }
};
