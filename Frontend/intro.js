// intro.js - Cinematic Welcome Experience

const letters = ['N', 'E', 'T', 'C', 'L', 'I', 'C', 'K'];

let currentIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  const skipBtn = document.getElementById('skipBtn');
  const proceedBtn = document.getElementById('proceedBtn');
  const backBtn = document.getElementById('backBtn');
  const introContainer = document.querySelector('.intro-container');

  // Button listeners
  skipBtn.addEventListener('click', showLoginPanel);
  proceedBtn.addEventListener('click', goToLogin);
  backBtn.addEventListener('click', resetIntro);

  // Click anywhere on intro to progress
  introContainer.addEventListener('click', nextLetter);

  // Mouse wheel scroll
  window.addEventListener('wheel', handleWheel, { passive: true });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      nextLetter();
    }
  });

  // Touch swipe support
  let touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const touchEndY = e.changedTouches[0].screenY;
    if (touchStartY - touchEndY > 40) {
      nextLetter();
    }
  }, { passive: true });

  // Start with first letter
  updateLetter(0);
});

function handleWheel(e) {
  if (!document.getElementById('loginPanel').classList.contains('hidden')) return;
  if (e.deltaY > 20) {
    nextLetter();
  }
}

function nextLetter() {
  currentIndex = (currentIndex + 1) % letters.length;
  updateLetter(currentIndex);

  if (currentIndex === 0) {
    setTimeout(showLoginPanel, 800);
  }
}

function updateLetter(index) {
  const letterEl = document.getElementById('letterDisplay');
  letterEl.textContent = letters[index];
  
  // Pulse animation
  letterEl.style.animation = 'none';
  void letterEl.offsetWidth;
  letterEl.style.animation = 'letterPulse 0.8s ease';
}

function showLoginPanel() {
  const introContainer = document.querySelector('.intro-container');
  introContainer.style.transition = 'opacity 0.9s ease';
  introContainer.style.opacity = '0';

  setTimeout(() => {
    document.getElementById('loginPanel').classList.remove('hidden');
  }, 800);
}

function goToLogin() {
  localStorage.setItem('netclick_intro_seen', 'true');
  window.location.href = 'login.html';
}

function resetIntro() {
  currentIndex = 0;
  document.querySelector('.intro-container').style.opacity = '1';
  document.getElementById('loginPanel').classList.add('hidden');
  updateLetter(0);
}