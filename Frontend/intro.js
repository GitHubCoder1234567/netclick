// intro.js - NetClick Wipe Reveal

document.addEventListener('DOMContentLoaded', () => {
  const skipBtn    = document.getElementById('skipBtn');
  const proceedBtn = document.getElementById('proceedBtn');
  const backBtn    = document.getElementById('backBtn');

  // Auto-show login panel after the animation finishes (~2.8s)
  let autoTimer = setTimeout(showLoginPanel, 2800);

  skipBtn.addEventListener('click', () => {
    clearTimeout(autoTimer);
    showLoginPanel();
  });

  proceedBtn.addEventListener('click', goToLogin);
  backBtn.addEventListener('click', resetIntro);

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      clearTimeout(autoTimer);
      const panel = document.getElementById('loginPanel');
      if (panel.classList.contains('hidden')) {
        showLoginPanel();
      }
    }
  });
});

function showLoginPanel() {
  const container = document.getElementById('introContainer');
  container.style.opacity = '0';
  container.style.transition = 'opacity 0.7s ease';

  setTimeout(() => {
    container.style.display = 'none';
    document.getElementById('loginPanel').classList.remove('hidden');
  }, 650);
}

function goToLogin() {
  localStorage.setItem('netclick_intro_seen', 'true');
  window.location.href = 'login.html';
}

function resetIntro() {
  const container = document.getElementById('introContainer');
  document.getElementById('loginPanel').classList.add('hidden');
  container.style.display = 'flex';

  // Force re-trigger animations by replacing the wipe scene
  const scene = document.getElementById('wipeScene');
  const clone = scene.cloneNode(true);
  scene.parentNode.replaceChild(clone, scene);

  container.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.5s ease';
      container.style.opacity = '1';
    });
  });

  setTimeout(showLoginPanel, 2800);
}