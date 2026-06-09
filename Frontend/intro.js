// intro.js - NetClick Cursor Click Intro

document.addEventListener('DOMContentLoaded', () => {
  const skipBtn    = document.getElementById('skipBtn');
  const proceedBtn = document.getElementById('proceedBtn');
  const backBtn    = document.getElementById('backBtn');
  const cursor     = document.getElementById('cursorPointer');
  const ripple     = document.getElementById('cursorRipple');
  const wordmark   = document.getElementById('wordmark');
  const clickPart  = document.getElementById('clickPart');

  skipBtn.addEventListener('click', () => {
    showLoginPanel();
  });
  proceedBtn.addEventListener('click', goToLogin);
  backBtn.addEventListener('click', resetIntro);

  document.addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'Escape'].includes(e.key)) {
      const panel = document.getElementById('loginPanel');
      if (panel.classList.contains('hidden')) showLoginPanel();
    }
  });

  setTimeout(runCursorSequence, 1100);

  function runCursorSequence() {
    const clickRect    = clickPart.getBoundingClientRect();
    const clickCenterX = clickRect.left + clickRect.width  * 0.55;
    const clickCenterY = clickRect.top  + clickRect.height * 0.45;

    const startX = -60;
    const startY = clickCenterY - 10;

    cursor.style.left    = startX + 'px';
    cursor.style.top     = startY + 'px';
    cursor.style.opacity = '1';

    const glideMs   = 900;
    const startTime = performance.now();

    function glide(now) {
      const t    = Math.min((now - startTime) / glideMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const x    = startX + (clickCenterX - 18 - startX) * ease;
      const y    = startY + (clickCenterY - 8  - startY) * ease;
      cursor.style.left = x + 'px';
      cursor.style.top  = y + 'px';

      if (t > 0.75) clickPart.classList.add('cursor-hover');

      if (t < 1) {
        requestAnimationFrame(glide);
      } else {
        setTimeout(doClick, 180);
      }
    }
    requestAnimationFrame(glide);
  }

  function doClick() {
    cursor.classList.add('pressing');
    wordmark.classList.add('clicked');
    ripple.classList.remove('burst');
    void ripple.offsetWidth;
    ripple.classList.add('burst');
    setTimeout(() => wordmark.classList.remove('clicked'), 160);
    setTimeout(() => cursor.classList.remove('pressing'), 200);
    setTimeout(showLoginPanel, 500);
  }

  function showLoginPanel() {
    // Restore real cursor
    document.body.style.cursor = 'default';

    const container = document.getElementById('introContainer');
    container.style.opacity    = '0';
    container.style.transition = 'opacity 0.7s ease';

    setTimeout(() => {
      container.style.display = 'none';
      document.getElementById('loginPanel').classList.remove('hidden');
    }, 650);
  }
});

function goToLogin() {
  window.location.href = 'login.html';
}

function resetIntro() {
  document.body.style.cursor = 'none'; // hide cursor again during replay
  const container  = document.getElementById('introContainer');
  const loginPanel = document.getElementById('loginPanel');
  const cursor     = document.getElementById('cursorPointer');

  loginPanel.classList.add('hidden');
  container.style.display = 'flex';

  const scene = document.getElementById('wipeScene');
  const clone  = scene.cloneNode(true);
  scene.parentNode.replaceChild(clone, scene);

  cursor.style.opacity = '0';
  container.style.opacity = '0';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.5s ease';
      container.style.opacity    = '1';
    });
  });

  setTimeout(() => {
    const newCursor   = document.getElementById('cursorPointer');
    const newRipple   = document.getElementById('cursorRipple');
    const newWordmark = document.getElementById('wordmark');
    const newClick    = document.getElementById('clickPart');

    const clickRect    = newClick.getBoundingClientRect();
    const clickCenterX = clickRect.left + newClick.offsetWidth  * 0.55;
    const clickCenterY = clickRect.top  + newClick.offsetHeight * 0.45;

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
      newCursor.style.left = (startX + (clickCenterX - 18 - startX) * ease) + 'px';
      newCursor.style.top  = (startY + (clickCenterY - 8  - startY) * ease) + 'px';
      if (t > 0.75) newClick.classList.add('cursor-hover');
      if (t < 1) {
        requestAnimationFrame(glide);
      } else {
        setTimeout(() => {
          newCursor.classList.add('pressing');
          newWordmark.classList.add('clicked');
          newRipple.classList.remove('burst');
          void newRipple.offsetWidth;
          newRipple.classList.add('burst');
          setTimeout(() => newWordmark.classList.remove('clicked'), 160);
          setTimeout(() => newCursor.classList.remove('pressing'), 200);
          setTimeout(() => {
            document.body.style.cursor = 'default';
            const c2 = document.getElementById('introContainer');
            c2.style.opacity = '0';
            setTimeout(() => {
              c2.style.display = 'none';
              document.getElementById('loginPanel').classList.remove('hidden');
            }, 700);
          }, 500);
        }, 180);
      }
    }
    requestAnimationFrame(glide);
  }, 1100);
}