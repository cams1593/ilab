// Cherche le bouton du menu ; les pages sans ce composant n'installent aucun gestionnaire.
const menuToggle = document.querySelector('.menu-toggle');

if (menuToggle) {
  const header = menuToggle.closest('.site-header');
  const navigation = document.getElementById(menuToggle.getAttribute('aria-controls'));

  if (header && navigation) {
    // Centralise les classes et attributs ARIA qui reflètent l'état ouvert ou fermé.
    const setMenuOpen = (isOpen) => {
      header.classList.toggle('menu-open', isOpen);
      document.documentElement.classList.toggle('menu-open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    };

    menuToggle.addEventListener('click', () => {
      setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    // Ferme le menu après navigation, clic extérieur, Échap ou passage à la mise en page large.
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

    window.addEventListener('resize', () => {
      if (window.innerWidth > 850 && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
      }
    });
  }
}