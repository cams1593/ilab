'use strict';

import './refresh';
import './i18n';

/* ==========================================================
   Passeport numérique – logique de la borne
   - charge passeport-numerique.json
   - calcule les deux camemberts (serveurs / lois) pour les sites choisis
   - calcule le score de droits et affiche le dossier du site touché
   ========================================================== */

// ---------- Réglages faciles à modifier ----------
const CHEMIN_JSON = 'assets/data/passeport-numerique.json';
const CHEMIN_ICONES = 'assets/icones/';    // logos (ex. src/assets/icones/google-logo.svg)
const DELAI_INACTIVITE_MS = 90000;         // retour à zéro après 90 s sans toucher l'écran
const MONTRER_STATUT_VERIFICATION = true;  // mettre false quand toutes les données sont vérifiées
const MOINS = '\u2212';

// ---------- Langues (textes dans assets/i18n/<code>.json) ----------
const CHEMIN_I18N = 'assets/i18n/';
const LANGUE_DEFAUT = 'fr';
const LANGUES = [
  { code: 'fr', locale: 'fr-BE' },
  { code: 'en', locale: 'en-GB' },
  { code: 'nl', locale: 'nl-BE' },
  { code: 'de', locale: 'de-DE' }
];

// Une couleur par pays (le nom est toujours écrit dans la légende : la couleur n'est jamais seule)
const COULEURS_PAYS = {
  BE: '#d9a21b',
  FR: '#3a6ea5',
  DE: '#5b5f6b',
  IE: '#3e8e63',
  SG: '#62b3c0',
  US: '#c0392b',
  CN: '#7b3f8c'
};

// ---------- État ----------
let donnees = null;
let selection = [];          // identifiants des sites choisis, dans l'ordre
let focusId = null;          // site dont on affiche le dossier
let scoreAffiche = 100;
let minuteurInactivite = null;
let animationScore = null;
let slideActif = 0;          // index de la catégorie affichée dans le slider
let slider = null;           // références vers les éléments du slider
let langue = LANGUE_DEFAUT;  // langue affichée
const traductions = {};      // textes déjà chargés, par code de langue

// ---------- Petits outils ----------
const $ = (id) => document.getElementById(id);
const NS_SVG = 'http://www.w3.org/2000/svg';

function el(tag, options = {}, enfants = []) {
  const n = document.createElement(tag);
  if (options.classe) n.className = options.classe;
  if (options.texte !== undefined) n.textContent = options.texte;
  for (const [cle, valeur] of Object.entries(options.attrs || {})) n.setAttribute(cle, valeur);
  for (const enfant of enfants) n.append(enfant);
  return n;
}

const formaterPct = (v) => {
  const l = LANGUES.find((x) => x.code === langue);
  return v.toLocaleString(l ? l.locale : 'fr-BE', { maximumFractionDigits: 1 }) + '\u00a0%';
};

const marqueParId = (id) => donnees.marques.find((m) => m.id === id);

// ---------- Traductions ----------
function chercher(dico, cle) {
  return String(cle).split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dico);
}

// Texte de l'interface : langue choisie, sinon français, sinon la clé elle-même
function t(cle, variables) {
  let txt = chercher(traductions[langue], cle);
  if (txt === undefined) txt = chercher(traductions[LANGUE_DEFAUT], cle);
  if (txt === undefined) return cle;
  for (const [nom, valeur] of Object.entries(variables || {})) {
    txt = txt.split('{' + nom + '}').join(String(valeur));
  }
  return txt;
}

// Donnée traduite (pays, marque, catégorie) ; si absente, on garde le texte du JSON de données
function tr(cle, repli) {
  const txt = chercher(traductions[langue], cle);
  return txt === undefined ? repli : txt;
}

const nomPays = (code) => tr('donnees.pays.' + code + '.nom', donnees.pays[code] ? donnees.pays[code].nom : code);
const loiPays = (code) => tr('donnees.pays.' + code + '.loi', donnees.pays[code].loi_cle);
const explicationPays = (code) => tr('donnees.pays.' + code + '.explication', donnees.pays[code].explication_visiteur);
const nomCategorie = (cat) => tr('donnees.categories.' + cat.id, cat.nom);
const typeMarque = (m) => tr('donnees.marques.' + m.id + '.type', m.type);
const proprietaireMarque = (m) => tr('donnees.marques.' + m.id + '.proprietaire', m.proprietaire.entreprise);
const hebergeurMarque = (m) => tr('donnees.marques.' + m.id + '.hebergeur', m.hebergeur.nom);
const messageMarque = (m) => tr('donnees.marques.' + m.id + '.message', m.message_visiteur);
const nomVille = (ville) => tr('donnees.villes.' + ville, ville);

function chargerTraductions(code) {
  if (traductions[code]) return Promise.resolve(traductions[code]);
  return fetch(CHEMIN_I18N + code + '.json')
    .then((reponse) => {
      if (!reponse.ok) throw new Error('Erreur ' + reponse.status);
      return reponse.json();
    })
    .then((json) => {
      traductions[code] = json;
      return json;
    });
}

// Langue de départ : ?lang=xx dans l'adresse, puis dernier choix, sinon français (la borne est en Belgique)
function langueInitiale() {
  const valide = (c) => (LANGUES.some((l) => l.code === c) ? c : null);
  let choix = null;
  try { choix = valide(new URLSearchParams(window.location.search).get('lang')); } catch (e) { /* ignoré */ }
  if (!choix) { try { choix = valide(localStorage.getItem('langue')); } catch (e) { /* ignoré */ } }
  return choix || LANGUE_DEFAUT;
}

// Textes fixes de la page (data-i18n / data-i18n-aria), <title>, description et boutons de langue
function appliquerTextes() {
  document.documentElement.lang = langue;
  document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((n) => {
    n.setAttribute('aria-label', t(n.dataset.i18nAria));
  });
  document.title = t('meta.passeport.titre');
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', t('meta.passeport.description'));
  document.querySelectorAll('.cellule-langue').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.langue === langue));
  });
}

function changerLangue(code) {
  if (code === langue) return;
  chargerTraductions(code).then(() => {
    langue = code;
    try { localStorage.setItem('langue', code); } catch (e) { /* ignoré */ }
    appliquerTextes();
    construireMarques();       // les libellés de la liste sont recréés dans la nouvelle langue
    allerAuSlide(slideActif, true);
    mettreAJour();
  }, () => { /* fichier de langue introuvable : on reste dans la langue actuelle */ });
}

// ---------- Démarrage ----------
function init() {
  const code = langueInitiale();
  Promise.all([
    fetch(CHEMIN_JSON).then((reponse) => {
      if (!reponse.ok) throw new Error('Erreur ' + reponse.status);
      return reponse.json();
    }),
    chargerTraductions(LANGUE_DEFAUT),   // sert de repli si un texte manque dans une autre langue
    chargerTraductions(code)
  ]).then(([json]) => {
    donnees = json;
    langue = code;
    demarrer();
  }, afficherErreur);
}

function demarrer() {
  scoreAffiche = donnees.meta.score_depart;
  appliquerTextes();
  construireMarques();
  construireDonut($('donut-physique'));
  construireDonut($('donut-juridique'));

  document.querySelectorAll('.cellule-langue').forEach((b) => {
    b.addEventListener('click', () => changerLangue(b.dataset.langue));
  });
  // Clavier : flèches gauche/droite quand le focus est dans le slider (un seul écouteur, même après un changement de langue)
  $('marques').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') allerAuSlide(slideActif - 1);
    if (e.key === 'ArrowRight') allerAuSlide(slideActif + 1);
  });

  $('btn-tout').addEventListener('click', toutChoisir);
  $('btn-reset').addEventListener('click', reinitialiser);
  ['pointerdown', 'keydown'].forEach((evenement) =>
    document.addEventListener(evenement, relancerMinuteur)
  );

  mettreAJour();
}

function afficherErreur() {
  $('marques').replaceChildren(
    el('p', {
      classe: 'erreur',
      attrs: { role: 'alert' },
      texte:
        "Impossible de charger " + CHEMIN_JSON + ". Lance le projet avec « npm start » " +
        "et vérifie que le fichier est dans src/assets/data/."
    })
  );
}

// ---------- Construction de l'interface ----------
function construireMarques() {
  const conteneur = $('marques');
  conteneur.replaceChildren();

  const categories = donnees.categories;
  const total = categories.length;

  // Navigation : flèche précédente | titre de la catégorie | flèche suivante
  const precedent = creerFleche('precedent', t('passeport.slider.precedent'));
  const suivant = creerFleche('suivant', t('passeport.slider.suivant'));
  const titre = el('p', { classe: 'slider-titre', attrs: { 'aria-live': 'polite' } });
  const nav = el('div', { classe: 'slider-nav' }, [precedent, titre, suivant]);

  // Piste : une diapositive par catégorie, on glisse (ou on touche les flèches) pour changer
  const piste = el('div', { classe: 'slider-piste' });
  const slides = categories.map((cat, i) => {
    const grille = el('div', { classe: 'marques-grille' });
    for (const m of donnees.marques.filter((x) => x.categorie === cat.id)) {
      grille.append(creerBoutonMarque(m));
    }
    const slide = el('div', {
      classe: 'slider-slide',
      attrs: {
        role: 'group',
        'aria-roledescription': t('passeport.slider.diapositive'),
        'aria-label': t('passeport.slider.slide_aria', { categorie: nomCategorie(cat), position: i + 1, total })
      }
    }, [grille]);
    piste.append(slide);
    return slide;
  });

  // Points de repère (touchables)
  const points = categories.map((cat, i) => {
    const point = el('button', {
      classe: 'slider-point',
      attrs: { type: 'button', 'aria-label': t('passeport.slider.aller_a', { categorie: nomCategorie(cat) }) }
    }, [el('span', { attrs: { 'aria-hidden': 'true' } })]);
    point.addEventListener('click', () => allerAuSlide(i));
    return point;
  });
  const barrePoints = el('div', { classe: 'slider-points' }, points);

  conteneur.append(nav, piste, barrePoints);
  slider = { piste, slides, points, precedent, suivant, titre };

  precedent.addEventListener('click', () => allerAuSlide(slideActif - 1));
  suivant.addEventListener('click', () => allerAuSlide(slideActif + 1));

  // Le slide actif suit le doigt : on le déduit de la position de défilement
  let attente = null;
  piste.addEventListener('scroll', () => {
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(() => {
      const index = Math.round(piste.scrollLeft / piste.clientWidth);
      if (index !== slideActif) {
        slideActif = index;
        majSlider();
      }
    });
  }, { passive: true });

  majSlider();
}

function creerFleche(sens, libelle) {
  const svg = document.createElementNS(NS_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('aria-hidden', 'true');
  const chemin = document.createElementNS(NS_SVG, 'path');
  chemin.setAttribute('d', sens === 'precedent' ? 'M15 4 7 12l8 8' : 'm9 4 8 8-8 8');
  chemin.setAttribute('fill', 'none');
  chemin.setAttribute('stroke', 'currentColor');
  chemin.setAttribute('stroke-width', '3');
  svg.append(chemin);
  return el('button', {
    classe: 'slider-fleche',
    attrs: { type: 'button', 'aria-label': libelle }
  }, [svg]);
}

function creerBoutonMarque(m) {
  const bouton = el(
    'button',
    { classe: 'marque', attrs: { type: 'button', 'aria-pressed': 'false', 'data-id': m.id } },
    [
      creerIcone(m),
      el('span', { classe: 'marque-texte' }, [
        el('span', { classe: 'marque-nom', texte: m.nom }),
        el('span', { classe: 'marque-type', texte: typeMarque(m) })
      ]),
      el('span', { classe: 'tampon', texte: t('passeport.ajoute'), attrs: { 'aria-hidden': 'true' } })
    ]
  );
  bouton.addEventListener('click', () => basculer(m.id));
  return bouton;
}

// ---------- Slider de catégories ----------
function allerAuSlide(index, instantane) {
  const i = Math.max(0, Math.min(donnees.categories.length - 1, index));
  const sansAnimation = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  slideActif = i;
  slider.piste.scrollTo({ left: i * slider.piste.clientWidth, behavior: sansAnimation || instantane ? 'auto' : 'smooth' });
  majSlider();
}

// Titre, compteur, points, flèches ; les slides cachés ne sont plus atteignables au clavier
function majSlider() {
  if (!slider) return;
  const total = donnees.categories.length;
  const cat = donnees.categories[slideActif];
  const dansCat = donnees.marques.filter((m) => m.categorie === cat.id);
  const choisis = dansCat.filter((m) => selection.includes(m.id)).length;

  slider.titre.replaceChildren(
    el('strong', { texte: nomCategorie(cat) }),
    el('span', {
      classe: 'slider-compte',
      texte: t('passeport.slider.compte', { position: slideActif + 1, total, choisis, nombre: dansCat.length })
    })
  );
  slider.precedent.disabled = slideActif === 0;
  slider.suivant.disabled = slideActif === total - 1;
  slider.points.forEach((point, i) => {
    if (i === slideActif) point.setAttribute('aria-current', 'true');
    else point.removeAttribute('aria-current');
  });
  slider.slides.forEach((slide, i) => {
    slide.inert = i !== slideActif;
  });
}

// Pastille avec la première lettre ; remplacée par le logo si le fichier existe
function creerIcone(m) {
  const pastille = el('span', { classe: 'icone', attrs: { 'aria-hidden': 'true' } }, [m.nom.charAt(0)]);
  const image = new Image();
  image.alt = '';
  image.addEventListener('load', () => pastille.replaceChildren(image));
  image.src = CHEMIN_ICONES + m.icone;
  return pastille;
}

// Un cercle SVG par pays ; on ne fait que changer leur longueur ensuite (ce qui les anime)
function construireDonut(boite) {
  const svg = document.createElementNS(NS_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42');
  svg.setAttribute('class', 'donut');
  svg.setAttribute('role', 'img');

  const rond = (classe) => {
    const c = document.createElementNS(NS_SVG, 'circle');
    c.setAttribute('cx', '21');
    c.setAttribute('cy', '21');
    c.setAttribute('r', '15.9155'); // circonférence = 100 : 1 unité = 1 %
    c.setAttribute('class', classe);
    return c;
  };

  svg.append(rond('donut-fond'));
  for (const code of Object.keys(donnees.pays)) {
    const tranche = rond('tranche');
    tranche.dataset.pays = code;
    tranche.style.stroke = COULEURS_PAYS[code] || '#999';
    tranche.style.strokeDasharray = '0 100';
    tranche.style.strokeDashoffset = '25';
    svg.append(tranche);
  }
  boite.prepend(svg);
}

// ---------- Actions ----------
function basculer(id) {
  const position = selection.indexOf(id);
  if (position === -1) {
    selection.push(id);
    focusId = id;
  } else {
    selection.splice(position, 1);
    if (focusId === id) focusId = selection[selection.length - 1] || null;
  }
  mettreAJour();
}

function toutChoisir() {
  selection = donnees.marques.map((m) => m.id);
  focusId = null;
  mettreAJour();
}

function reinitialiser() {
  selection = [];
  focusId = null;
  mettreAJour();
  allerAuSlide(0);
  window.scrollTo({ top: 0 });
}

// Borne en libre accès : on remet tout à zéro si plus personne ne touche l'écran
function relancerMinuteur() {
  clearTimeout(minuteurInactivite);
  if (selection.length === 0 && langue === LANGUE_DEFAUT) return;
  minuteurInactivite = setTimeout(() => {
    reinitialiser();
    changerLangue(LANGUE_DEFAUT); // la borne repart en français pour le visiteur suivant
  }, DELAI_INACTIVITE_MS);
}

// ---------- Calculs ----------
function calculer() {
  const choisies = selection.map(marqueParId);
  const n = choisies.length;
  const physique = {};
  const juridique = {};
  let malus = 0;
  const pertes = [];

  for (const m of choisies) {
    // Couche serveurs : chaque pays reçoit sa part (en %) des serveurs de la marque
    for (const s of m.serveurs) {
      physique[s.pays] = (physique[s.pays] || 0) + s.part / 100;
    }
    // Couche juridique : 1 voix par marque, partagée entre ses pays distincts (propriétaire + hébergeur)
    const pays = [...new Set(m.juridictions)];
    for (const code of pays) {
      juridique[code] = (juridique[code] || 0) + 1 / pays.length;
    }
    malus += m.score_malus;
    if (m.score_malus < 0) pertes.push(m);
  }

  const versPourcent = (repartition) =>
    Object.fromEntries(
      Object.entries(repartition).map(([code, voix]) => [code, n ? (voix / n) * 100 : 0])
    );

  const score = Math.max(donnees.meta.score_minimum, donnees.meta.score_depart + malus);

  return {
    n,
    choisies,
    pertes,
    score,
    physique: versPourcent(physique),
    juridique: versPourcent(juridique)
  };
}

// ---------- Affichage ----------
function mettreAJour() {
  const c = calculer();

  for (const bouton of document.querySelectorAll('.marque')) {
    bouton.setAttribute('aria-pressed', String(selection.includes(bouton.dataset.id)));
  }

  rendreCamembert($('donut-physique'), $('legende-physique'), c.physique, c.n);
  rendreCamembert($('donut-juridique'), $('legende-juridique'), c.juridique, c.n);
  rendreScore(c);
  rendreDossier();
  rendreMRZ(c);
  majSlider();

  $('btn-reset').disabled = c.n === 0;
  relancerMinuteur();
}

function rendreCamembert(boite, liste, repartition, n) {
  // 1. Les tranches
  let cumul = 0;
  for (const tranche of boite.querySelectorAll('.tranche')) {
    const pct = repartition[tranche.dataset.pays] || 0;
    const ecart = pct > 0 && pct < 100 ? 0.5 : 0; // petit espace entre deux tranches
    const longueur = Math.max(0, pct - ecart);
    tranche.style.strokeDasharray = longueur + ' ' + (100 - longueur);
    tranche.style.strokeDashoffset = String(25 - cumul);
    cumul += pct;
  }

  // 2. Le nombre de sites au centre
  boite.querySelector('.nb').textContent = n;
  boite.querySelector('.unite').textContent = t('passeport.unite_site._' + (n > 1 ? 'other' : 'one'));

  // 3. La légende (triée du plus grand au plus petit)
  const lignes = Object.entries(repartition)
    .filter(([, pct]) => pct > 0.0001)
    .sort((a, b) => b[1] - a[1]);

  liste.replaceChildren();
  if (lignes.length === 0) {
    liste.append(el('li', { classe: 'vide', texte: t('passeport.aucun_site') }));
  }
  for (const [code, pct] of lignes) {
    const pastille = el('span', { classe: 'pastille', attrs: { 'aria-hidden': 'true' } });
    pastille.style.background = COULEURS_PAYS[code] || '#999';
    liste.append(
      el('li', {}, [
        pastille,
        el('span', { texte: nomPays(code) }),
        el('span', { classe: 'legende-pct', texte: formaterPct(pct) })
      ])
    );
  }

  // 4. Description pour les lecteurs d'écran
  const resume = lignes.map(([code, pct]) => nomPays(code) + ' ' + formaterPct(pct)).join(', ');
  boite.querySelector('svg').setAttribute('aria-label', resume || t('passeport.aucun_site'));
}

function phraseScore(score, n) {
  if (n === 0) return t('passeport.score.phrase_aucun');
  if (score >= 90) return t('passeport.score.phrase_90');
  if (score >= 60) return t('passeport.score.phrase_60');
  if (score >= 30) return t('passeport.score.phrase_30');
  return t('passeport.score.phrase_0');
}

function rendreScore(c) {
  animerScore(c.score);

  const depart = donnees.meta.score_depart;
  const barre = $('score-barre');
  barre.style.width = (c.score / depart) * 100 + '%';
  const ratio = c.score / depart;
  barre.dataset.niveau = ratio >= 0.6 ? 'haut' : ratio >= 0.3 ? 'moyen' : 'bas';

  $('score-phrase').textContent = phraseScore(c.score, c.n);

  const liste = $('pertes');
  liste.replaceChildren();
  if (c.n > 0 && c.pertes.length === 0) {
    liste.append(el('li', { classe: 'aucune', texte: t('passeport.score.aucune_perte') }));
  }
  for (const m of c.pertes) {
    const puce = el('button', {
      classe: 'chip',
      attrs: { type: 'button' },
      texte: m.nom + ' ' + MOINS + Math.abs(m.score_malus)
    });
    puce.addEventListener('click', () => {
      focusId = m.id;
      rendreDossier();
    });
    liste.append(el('li', {}, [puce]));
  }
}

function animerScore(cible) {
  cancelAnimationFrame(animationScore);
  const sortie = $('score-nombre');
  const sansAnimation = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sansAnimation) {
    scoreAffiche = cible;
    sortie.textContent = cible;
    return;
  }
  const depart = scoreAffiche;
  const debut = performance.now();
  const duree = 500;
  const pas = (maintenant) => {
    const p = Math.min(1, (maintenant - debut) / duree);
    scoreAffiche = Math.round(depart + (cible - depart) * (1 - Math.pow(1 - p, 3)));
    sortie.textContent = scoreAffiche;
    if (p < 1) animationScore = requestAnimationFrame(pas);
  };
  animationScore = requestAnimationFrame(pas);
}

// La case d'info : le dossier complet d'un site
function rendreDossier() {
  const zone = $('dossier');
  zone.replaceChildren();

  const m = focusId ? marqueParId(focusId) : null;
  if (!m) {
    zone.append(el('p', { classe: 'vide-texte', texte: t('passeport.dossier.vide') }));
    return;
  }

  zone.append(
    el('div', { classe: 'dossier-titre' }, [
      el('strong', { texte: m.nom }),
      el('span', { texte: typeMarque(m) })
    ])
  );

  // Serveurs
  const serveurs = m.serveurs.map((s) => {
    const lieu = s.ville ? nomPays(s.pays) + ' (' + nomVille(s.ville) + ')' : nomPays(s.pays);
    return m.serveurs.length > 1 ? lieu + ' ' + s.part + '\u00a0%' : lieu;
  });

  // Hébergeur
  let hebergeur = hebergeurMarque(m) + ', ' + nomPays(m.hebergeur.pays);
  if (m.hebergeur.statut === 'hypothese') hebergeur += ' (' + t('passeport.dossier.a_confirmer') + ')';

  // Lois qui s'appliquent
  const lois = el('dd');
  for (const code of [...new Set(m.juridictions)]) {
    lois.append(el('p', { texte: nomPays(code) + (langue === 'fr' ? ' : ' : ': ') + loiPays(code) }));
    if (donnees.pays[code].malus < 0) lois.append(el('p', { classe: 'explication', texte: explicationPays(code) }));
  }

  zone.append(
    el('dl', {}, [
      el('dt', { texte: t('passeport.dossier.serveurs') }),
      el('dd', { texte: serveurs.join(', ') }),
      el('dt', { texte: t('passeport.dossier.proprietaire') }),
      el('dd', { texte: proprietaireMarque(m) + ', ' + nomPays(m.proprietaire.pays) }),
      el('dt', { texte: t('passeport.dossier.hebergeur') }),
      el('dd', { texte: hebergeur }),
      el('dt', { texte: t('passeport.dossier.legislation') }),
      lois
    ]),
    el('p', { classe: 'dossier-message', texte: messageMarque(m) }),
    el('p', {
      classe: 'dossier-perte' + (m.score_malus < 0 ? ' perte' : ''),
      texte: m.score_malus < 0
        ? t('passeport.dossier.droits_perdus', { n: Math.abs(m.score_malus) })
        : t('passeport.dossier.aucun_droit_perdu')
    })
  );

  if (MONTRER_STATUT_VERIFICATION && m.statut_verification !== 'verifie') {
    zone.append(el('p', { classe: 'dossier-verif', texte: t('passeport.dossier.en_verification') }));
  }
}

// Bande de lecture optique, comme en bas d'un vrai passeport (décor qui reflète les choix)
function rendreMRZ(c) {
  const remplir = (texte) => (texte + '<'.repeat(44)).slice(0, 44);
  const nettoyer = (s) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const visiteur = t('passeport.mrz_visiteur').split(' ').map(nettoyer).join('<');
  const ligne1 = remplir('P<BEL<<' + visiteur);
  const pays = Object.keys(c.juridique).sort((a, b) => c.juridique[b] - c.juridique[a]);
  const marques = c.choisies.map((m) => nettoyer(m.id).slice(0, 3));
  const ligne2 = remplir(
    'DROITS' + String(c.score).padStart(3, '0') + '<' + pays.join('<') + '<<' + marques.join('<')
  );

  $('mrz').textContent = ligne1 + '\n' + ligne2;
}

init();
