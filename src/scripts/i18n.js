// Charge et applique les traductions ainsi que la langue du document.
const DEFAULT_LANG = 'fr';
const PATH = 'assets/data/langues';

// Met à jour les textes, la préférence mémorisée et l'état accessible des boutons de langue.
async function setLang(lang) {
  const res = await fetch(`${PATH}/${lang}.JSON`);
  const texts = await res.json();

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (texts[key] === undefined) {
      console.warn(`Clé manquante : ${key}`);
      return;
    }
    el.textContent = texts[key];
  });

  document.documentElement.lang = lang;
  try {
    localStorage.setItem('site-locale', lang);
  } catch (error) {
    console.warn('Impossible de mémoriser la langue choisie.', error);
  }

  document.querySelectorAll('[data-language-current]').forEach((label) => {
    label.textContent = lang.slice(0, 1).toUpperCase() + lang.slice(1);
  });

  document.querySelectorAll('[data-lang]').forEach((button) => {
    const active = button.dataset.lang === lang;
    const item = button.closest('.lang_li');
    button.setAttribute('aria-pressed', String(active));

    if (active) {
      button.classList.add('lang_button--actif');
      item?.classList.add('lang_li--actif');
    } else {
      button.classList.remove('lang_button--actif');
      item?.classList.remove('lang_li--actif');
    }
  });
}

// Relie les boutons de langue directe et le sélecteur déroulant à la fonction de traduction.
document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => setLang(button.dataset.lang));
});

document.querySelectorAll('[data-language-picker]').forEach((picker) => {
  const toggle = picker.querySelector('.language-picker__toggle');
  const options = picker.querySelector('.language-picker__options');

  toggle.addEventListener('click', () => {
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isExpanded));
    options.hidden = isExpanded;
  });

  picker.querySelectorAll('[data-language-option]').forEach((option) => {
    option.addEventListener('click', async () => {
      await setLang(option.dataset.languageOption);
      toggle.setAttribute('aria-expanded', 'false');
      options.hidden = true;
      toggle.focus();
    });
  });
});

// Ferme le sélecteur lorsqu'on clique hors de celui-ci ou qu'on appuie sur Échap.
document.addEventListener('click', (event) => {
  document.querySelectorAll('[data-language-picker]').forEach((picker) => {
    if (!picker.contains(event.target)) {
      const toggle = picker.querySelector('.language-picker__toggle');
      const options = picker.querySelector('.language-picker__options');
      toggle.setAttribute('aria-expanded', 'false');
      options.hidden = true;
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('[data-language-picker]').forEach((picker) => {
      const toggle = picker.querySelector('.language-picker__toggle');
      const options = picker.querySelector('.language-picker__options');
      if (toggle.getAttribute('aria-expanded') === 'true') {
        toggle.setAttribute('aria-expanded', 'false');
        options.hidden = true;
        toggle.focus();
      }
    });
  }
});

// Applique au chargement la dernière langue mémorisée, ou le français par défaut.
setLang(localStorage.getItem('site-locale') || DEFAULT_LANG);
