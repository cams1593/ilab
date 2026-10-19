const menuToggle = document.querySelector('.menu-toggle');

if (menuToggle) {
  const header = menuToggle.closest('.site-header');
  const navigation = document.getElementById(menuToggle.getAttribute('aria-controls'));

  if (header && navigation) {
    const setMenuOpen = (isOpen) => {
      header.classList.toggle('menu-open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    };

    menuToggle.addEventListener('click', () => {
      setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        setMenuOpen(false);
      }
    });

    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) {
        setMenuOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        menuToggle.focus();
      }
    });
  }
}