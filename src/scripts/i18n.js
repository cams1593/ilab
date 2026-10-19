const DEFAULT_LANG = 'fr';
const PATH = 'assets/data/langues';

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

  document.querySelectorAll('[data-lang]').forEach((button) => {
    const active = button.dataset.lang === lang;
    const item = button.closest('.lang_li');

    if (active) {
      button.classList.add('lang_button--actif');
      item?.classList.add('lang_li--actif');
    } else {
      button.classList.remove('lang_button--actif');
      item?.classList.remove('lang_li--actif');
    }
  });
}

document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => setLang(button.dataset.lang));
});

setLang(localStorage.getItem('site-locale') || DEFAULT_LANG);
