const PAGE_TIMEOUTS_SECONDS = {
  'citizen.html': 90,
  'james.html': 90,
  'courant.html': 120,
  'oeuvres.html': 120,
/*   'passeport.html':  */
};

const pageName = window.location.pathname.split('/').pop() || 'index.html';
const timeoutSeconds = PAGE_TIMEOUTS_SECONDS[pageName];

if (pageName === 'index.html') {
  localStorage.removeItem('site-locale');
} else if (timeoutSeconds) {
  let inactivityTimer;

  const returnToHome = () => {
    window.location.assign('./index.html');
  };

  const restartInactivityTimer = () => {
    window.clearTimeout(inactivityTimer);
    inactivityTimer = window.setTimeout(returnToHome, timeoutSeconds * 1000);
  };

  ['click', 'keydown', 'pointerdown', 'scroll'].forEach((eventName) => {
    document.addEventListener(eventName, restartInactivityTimer, { passive: true });
  });

  restartInactivityTimer();
}