// intro.js - Cursor click intro

document.addEventListener('DOMContentLoaded', () => {
  const skipBtn    = document.getElementById('skipBtn');
  const proceedBtn = document.getElementById('proceedBtn');
  const backBtn    = document.getElementById('backBtn');
  const cursor     = document.getElementById('cursorPointer');
  const ripple     = document.getElementById('cursorRipple');
  const wordmark   = document.getElementById('wordmark');
  const clickPart  = document.getElementById('clickPart');

  skipBtn.addEventListener('click', showLoginPanel);
  proceedBtn.addEventListener('click', goToLogin);
  backBtn.addEventListener('click', resetIntro);

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'Escape'].includes(e.key)) {
      const panel = document.getElementById('loginPanel');
      if (panel.classList.contains('hidden')) showLoginPanel();
    }
  });

  // Kick off the cursor animation after letters finish rising (~1s)
  setTimeout(runCursorSequence, 1100);

  function runCursorSequence() {
    // 1. Find where CLICK is on screen
    const clickRect    = clickPart.getBoundingClientRect();
    const clickCenterX = clickRect.left + clickRect.width * 0.55;
    const clickCenterY = clickRect.top  + clickRect.height * 0.45;

    // 2. Start cursor far to the left, vertically aligned with the wordmark
    const startX = -60;
    const startY = clickCenterY - 10;

    cursor.style.left    = startX + 'px';
    cursor.style.top     = startY + 'px';
    cursor.style.opacity = '1';

    // 3. Glide cursor to just above CLICK over 900ms
    const glideMs = 900;
    const startTime = performance.now();

    function glide(now) {
      const t = Math.min((now - startTime) / glideMs, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const x = startX + (clickCenterX - 18 - startX) * ease;
      const y = startY + (clickCenterY - 8  - startY) * ease;
      cursor.style.left = x + 'px';
      cursor.style.top  = y + 'px';

      // Light up CLICK when cursor gets close
      if (t > 0.75) {
        clickPart.classList.add('cursor-hover');
      }

      if (t < 1) {
        requestAnimationFrame(glide);
      } else {
        // 4. Cursor arrived — do the click
        setTimeout(doClick, 180);
      }
    }

    requestAnimationFrame(glide);
  }

  function doClick() {
    // Cursor press animation
    cursor.classList.add('pressing');

    // Logo shrink effect
    wordmark.classList.add('clicked');

    // Red ripple burst from cursor position
    ripple.classList.remove('burst');
    void ripple.offsetWidth; // reflow to restart
    ripple.classList.add('burst');

    // Bounce the logo back after shrink
    setTimeout(() => {
      wordmark.classList.remove('clicked');
    }, 160);

    // Remove cursor press state
    setTimeout(() => {
      cursor.classList.remove('pressing');
    }, 200);

    // Fade out and go to login
    setTimeout(showLoginPanel, 500);
  }

  function showLoginPanel() {
    const container = document.getElementById('introContainer');
    container.style.opacity = '0';

    setTimeout(() => {
      container.style.display = 'none';
      document.getElementById('loginPanel').classList.remove('hidden');
    }, 700);
  }
});

function goToLogin() {
  localStorage.setItem('netclick_intro_seen', 'true');
  window.location.href = 'login.html';
}

function resetIntro() {
  const container  = document.getElementById('introContainer');
  const loginPanel = document.getElementById('loginPanel');
  const cursor     = document.getElementById('cursorPointer');

  loginPanel.classList.add('hidden');
  container.style.display = 'flex';

  // Re-clone scene to restart CSS animations
  const scene = document.getElementById('wipeScene');
  const clone  = scene.cloneNode(true);
  scene.parentNode.replaceChild(clone, scene);

  // Reset cursor
  cursor.style.opacity = '0';

  container.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.5s ease';
      container.style.opacity = '1';
    });
  });

  // Re-run cursor sequence after letters load
  setTimeout(() => {
    // Re-grab refs since scene was cloned
    const newCursor   = document.getElementById('cursorPointer');
    const newRipple   = document.getElementById('cursorRipple');
    const newWordmark = document.getElementById('wordmark');
    const newClick    = document.getElementById('clickPart');

    // re-run sequence inline
    const clickRect    = newClick.getBoundingClientRect();
    const clickCenterX = clickRect.left + clickRect.width * 0.55;
    const clickCenterY = clickRect.top  + clickRect.height * 0.45;

    const startX = -60;
    const startY = clickCenterY - 10;
    newCursor.style.left    = startX + 'px';
    newCursor.style.top     = startY + 'px';
    newCursor.style.opacity = '1';

    const glideMs   = 900;
    const startTime = performance.now();

    function glide(now) {
      const t    = Math.min((now - startTime) / glideMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const x    = startX + (clickCenterX - 18 - startX) * ease;
      const y    = startY + (clickCenterY - 8  - startY) * ease;
      newCursor.style.left = x + 'px';
      newCursor.style.top  = y + 'px';
      if (t > 0.75) newClick.classList.add('cursor-hover');
      if (t < 1) { requestAnimationFrame(glide); }
      else {
        setTimeout(() => {
          newCursor.classList.add('pressing');
          newWordmark.classList.add('clicked');
          newRipple.classList.remove('burst');
          void newRipple.offsetWidth;
          newRipple.classList.add('burst');
          setTimeout(() => newWordmark.classList.remove('clicked'), 160);
          setTimeout(() => newCursor.classList.remove('pressing'), 200);
          setTimeout(() => {
            const container2 = document.getElementById('introContainer');
            container2.style.opacity = '0';
            setTimeout(() => {
              container2.style.display = 'none';
              document.getElementById('loginPanel').classList.remove('hidden');
            }, 700);
          }, 500);
        }, 180);
      }
    }
    requestAnimationFrame(glide);
  }, 1100);
}