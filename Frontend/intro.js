// intro.js - NetClick Welcome Experience
const letters = ['N', 'E', 'T', 'C', 'L', 'I', 'C', 'K'];
const gradients = [
  'linear-gradient(135deg, #0A0A0A, #1a0a0a)',           // N: Pure dark
  'linear-gradient(135deg, #1a0a0a, #2a1515)',           // E: Dark with red undertone
  'linear-gradient(135deg, #2a1515, #1a2a3a)',           // T: Red to blue
  'linear-gradient(135deg, #1a2a3a, #0a2a2a)',           // C: Blue to teal
  'linear-gradient(135deg, #0a2a2a, #1a1a2a)',           // L: Teal to purple
  'linear-gradient(135deg, #1a1a2a, #2a0a2a)',           // I: Purple to magenta
  'linear-gradient(135deg, #2a0a2a, #1a0a1a)',           // C: Magenta to dark red
  'linear-gradient(135deg, #1a0a1a, #0A0A0A)',           // K: Back to pure dark
];

let currentLetterIndex = 0;
let scrollProgress = 0;

window.addEventListener('DOMContentLoaded', () => {
  createProgressDots();
  updateLetter(0);
  setupEventListeners();
});

function createProgressDots() {
  const dotsContainer = document.getElementById('progressDots');
  letters.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.className = 'progress-dot' + (index === 0 ? ' active' : '');
    dot.addEventListener('click', () => scrollToLetter(index));
    dotsContainer.appendChild(dot);
  });
}

function setupEventListeners() {
  document.getElementById('skipBtn').addEventListener('click', showLoginPanel);
  document.getElementById('proceedBtn').addEventListener('click', goToLogin);
  document.getElementById('backBtn').addEventListener('click', resetIntro);
  
  document.addEventListener('wheel', handleScroll, { passive: true });
  document.addEventListener('touchmove', handleTouchScroll, { passive: true });
}

function handleScroll(e) {
  if (document.getElementById('loginPanel').classList.contains('hidden')) {
    scrollProgress += e.deltaY;
    updateScrollProgress();
  }
}

function handleTouchScroll(e) {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    if (!lastTouchY) lastTouchY = touch.clientY;
    const diff = lastTouchY - touch.clientY;
    scrollProgress += diff * 0.5;
    lastTouchY = touch.clientY;
    updateScrollProgress();
  }
}

let lastTouchY = null;

function updateScrollProgress() {
  const scrollThreshold = 200;
  const newIndex = Math.floor(scrollProgress / scrollThreshold);
  
  if (newIndex >= 0 && newIndex < letters.length) {
    if (newIndex !== currentLetterIndex) {
      currentLetterIndex = newIndex;
      updateLetter(newIndex);
    }
  } else if (newIndex >= letters.length) {
    showLoginPanel();
  }
}

function updateLetter(index) {
  const letterDisplay = document.getElementById('letterDisplay');
  const body = document.body;
  const dots = document.querySelectorAll('.progress-dot');
  
  // Update letter with animation
  letterDisplay.textContent = letters[index];
  letterDisplay.style.animation = 'none';
  setTimeout(() => {
    letterDisplay.style.animation = 'letterPulse 0.8s ease-out';
  }, 10);
  
  // Smooth gradient transition
  body.style.background = gradients[index];
  
  // Update progress dots
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
  
  // Hide scroll hint on last letter
  const scrollHint = document.getElementById('scrollHint');
  if (index === letters.length - 1) {
    scrollHint.style.opacity = '0.3';
    scrollHint.style.pointerEvents = 'none';
  } else {
    scrollHint.style.opacity = '1';
    scrollHint.style.pointerEvents = 'auto';
  }
}

function scrollToLetter(index) {
  currentLetterIndex = index;
  scrollProgress = index * 200;
  updateLetter(index);
}

function showLoginPanel() {
  document.getElementById('scrollHint').style.display = 'none';
  document.getElementById('skipBtn').style.display = 'none';
  document.getElementById('progressDots').style.display = 'none';
  document.getElementById('loginPanel').classList.remove('hidden');
}

function goToLogin() {
  localStorage.setItem('netclick_intro_seen', 'true');
  window.location.href = 'login.html';
}

function resetIntro() {
  currentLetterIndex = 0;
  scrollProgress = 0;
  document.getElementById('loginPanel').classList.add('hidden');
  document.getElementById('scrollHint').style.display = 'flex';
  document.getElementById('skipBtn').style.display = 'block';
  document.getElementById('progressDots').style.display = 'flex';
  updateLetter(0);
}
