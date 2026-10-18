const BASE_LOCALE = 'fr';
const TRANSLATIONS_PATH = 'assets/data/langues';
const LANGUAGE_KEY_PATTERN = /^[a-z]{2}$/;

const translationsByLocale = new Map();
let currentTranslations = null;
let currentLocale = BASE_LOCALE;

const languageSwitchers = document.querySelectorAll('[data-language-switcher]');
const errorMessage = document.querySelector('[data-i18n-error]');
const menuToggle = document.querySelector('.menu-toggle');

async function fetchTranslations(locale) {
  const response = await fetch(`${TRANSLATIONS_PATH}/${locale}.JSON`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Unable to load ${locale} translations (${response.status})`);
  }
  return response.json();
}

function getTranslation(locale, key) {
  const value = locale[key];
  if (typeof value !== 'string') {
    throw new Error(`Missing translation key "${key}" for locale "${currentLocale}"`);
  }
  return value;
}

function showError(error) {
  console.error(error);
  if (!errorMessage) return;

  errorMessage.textContent =
    currentTranslations?.['common.i18n.error'] || 'Unable to load the requested language.';
  errorMessage.hidden = false;
}

function updateMenuLabel() {
  if (!menuToggle || !currentTranslations) return;

  const key =
    menuToggle.getAttribute('aria-expanded') === 'true'
      ? 'common.menu.close'
      : 'common.menu.open';
  menuToggle.setAttribute('aria-label', getTranslation(currentTranslations, key));
}

function applyTranslations(locale, translations) {
  const title = document.querySelector('title');
  const textElements = document.querySelectorAll('[data-i18n]');
  const contentAttributes = document.querySelectorAll('[data-i18n-content]');
  const ariaAttributes = document.querySelectorAll('[data-i18n-aria]');

  for (const element of textElements) {
    getTranslation(translations, element.dataset.i18n);
  }
  for (const element of contentAttributes) {
    getTranslation(translations, element.dataset.i18nContent);
  }
  for (const element of ariaAttributes) {
    getTranslation(translations, element.dataset.i18nAria);
  }
  if (!title) throw new Error('The page is missing its translated title element');
  getTranslation(translations, title.dataset.i18n);

  for (const element of textElements) {
    element.textContent = getTranslation(translations, element.dataset.i18n);
  }
  for (const element of contentAttributes) {
    element.setAttribute(
      'content',
      getTranslation(translations, element.dataset.i18nContent)
    );
  }
  for (const element of ariaAttributes) {
    element.setAttribute(
      'aria-label',
      getTranslation(translations, element.dataset.i18nAria)
    );
  }
  title.textContent = getTranslation(translations, title.dataset.i18n);

  document.documentElement.lang = locale;
  currentTranslations = translations;
  currentLocale = locale;
  updateMenuLabel();

  for (const switcher of languageSwitchers) {
    switcher.setAttribute('aria-label', getTranslation(translations, 'common.language.choose'));
    for (const button of switcher.querySelectorAll('[data-locale]')) {
      const active = button.dataset.locale === locale;
      button.classList.toggle('lang_button--actif', active);
      button.classList.toggle('language-button--active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  if (errorMessage) errorMessage.hidden = true;
}

function buildLanguageSwitchers(baseTranslations, availableLocales) {
  const languageNames = Object.keys(baseTranslations)
    .filter((key) => LANGUAGE_KEY_PATTERN.test(key) && typeof baseTranslations[key] === 'string')
    .filter((locale) => availableLocales.includes(locale));

  for (const switcher of languageSwitchers) {
    switcher.replaceChildren();
    for (const locale of languageNames) {
      const item = document.createElement('li');
      item.className = 'lang_li';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lang_button language-button';
      button.dataset.locale = locale;
      button.textContent = baseTranslations[locale];
      button.lang = locale;
      button.addEventListener('click', () => {
        const translations = translationsByLocale.get(locale);
        if (!translations) return;

        try {
          applyTranslations(locale, translations);
          localStorage.setItem('site-locale', locale);
        } catch (error) {
          showError(error);
        }
      });

      item.append(button);
      switcher.append(item);
    }
  }
}

async function initializeTranslations() {
  try {
    const baseTranslations = await fetchTranslations(BASE_LOCALE);
    if (!baseTranslations) {
      throw new Error(`Base translations for "${BASE_LOCALE}" were not found`);
    }

    translationsByLocale.set(BASE_LOCALE, baseTranslations);
    applyTranslations(BASE_LOCALE, baseTranslations);

    const localeCodes = Object.keys(baseTranslations).filter(
      (key) => LANGUAGE_KEY_PATTERN.test(key) && typeof baseTranslations[key] === 'string'
    );
    const localeFiles = await Promise.all(
      localeCodes.map(async (locale) => {
        if (locale === BASE_LOCALE) return [locale, baseTranslations];
        const translations = await fetchTranslations(locale);
        return translations ? [locale, translations] : null;
      })
    );

    for (const entry of localeFiles) {
      if (entry) translationsByLocale.set(entry[0], entry[1]);
    }
    buildLanguageSwitchers(baseTranslations, [...translationsByLocale.keys()]);

    const savedLocale = localStorage.getItem('site-locale');
    if (savedLocale && translationsByLocale.has(savedLocale)) {
      applyTranslations(savedLocale, translationsByLocale.get(savedLocale));
    }
  } catch (error) {
    showError(error);
    if (translationsByLocale.has(BASE_LOCALE)) {
      buildLanguageSwitchers(translationsByLocale.get(BASE_LOCALE), [BASE_LOCALE]);
    }
  }
}

menuToggle?.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  menuToggle.closest('.site-header')?.classList.toggle('menu-open', !expanded);
  updateMenuLabel();
});

initializeTranslations();
