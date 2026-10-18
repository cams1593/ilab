const PAGE_TIMEOUTS_SECONDS = {
  'citizen.html': 10,
  'james.html': 10,
  'courant.html': 10,
  'oeuvres.html': 10,
  'passeport.html': 10
};

const pageName = window.location.pathname.split('/').pop() || 'index.html';
const timeoutSeconds = PAGE_TIMEOUTS_SECONDS[pageName];

if (pageName !== 'index.html' && timeoutSeconds) {
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