'use strict';

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

const formaterPct = (v) =>
  v.toLocaleString('fr-BE', { maximumFractionDigits: 1 }) + '\u00a0%';

const marqueParId = (id) => donnees.marques.find((m) => m.id === id);
const nomPays = (code) => (donnees.pays[code] ? donnees.pays[code].nom : code);

// ---------- Démarrage ----------
function init() {
  fetch(CHEMIN_JSON)
    .then((reponse) => {
      if (!reponse.ok) throw new Error('Erreur ' + reponse.status);
      return reponse.json();
    })
    .then((json) => {
      donnees = json;
      demarrer();
    }, afficherErreur);
}

function demarrer() {
  scoreAffiche = donnees.meta.score_depart;
  construireMarques();
  construireDonut($('donut-physique'));
  construireDonut($('donut-juridique'));
  $('avertissement').textContent = donnees.meta.avertissement_borne || '';

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

  for (const m of donnees.marques) {
    const bouton = el(
      'button',
      { classe: 'marque', attrs: { type: 'button', 'aria-pressed': 'false', 'data-id': m.id } },
      [
        creerIcone(m),
        el('span', { classe: 'marque-texte' }, [
          el('span', { classe: 'marque-nom', texte: m.nom }),
          el('span', { classe: 'marque-type', texte: m.type })
        ]),
        el('span', { classe: 'tampon', texte: 'Ajouté', attrs: { 'aria-hidden': 'true' } })
      ]
    );
    bouton.addEventListener('click', () => basculer(m.id));
    conteneur.append(bouton);
  }
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
  window.scrollTo({ top: 0 });
}

// Borne en libre accès : on remet tout à zéro si plus personne ne touche l'écran
function relancerMinuteur() {
  clearTimeout(minuteurInactivite);
  if (selection.length === 0) return;
  minuteurInactivite = setTimeout(reinitialiser, DELAI_INACTIVITE_MS);
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
  boite.querySelector('.unite').textContent = n > 1 ? 'sites' : 'site';

  // 3. La légende (triée du plus grand au plus petit)
  const lignes = Object.entries(repartition)
    .filter(([, pct]) => pct > 0.0001)
    .sort((a, b) => b[1] - a[1]);

  liste.replaceChildren();
  if (lignes.length === 0) {
    liste.append(el('li', { classe: 'vide', texte: 'Aucun site choisi.' }));
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
  boite.querySelector('svg').setAttribute('aria-label', resume || 'Aucun site choisi');
}

function phraseScore(score, n) {
  if (n === 0) return 'Choisis des sites pour voir tes droits évoluer.';
  if (score >= 90) return 'Tes données restent surtout sous droit européen.';
  if (score >= 60) return "Des lois étrangères commencent à s'appliquer à toi.";
  if (score >= 30) return 'Tu dépends beaucoup de lois étrangères.';
  return 'La plupart de tes données relèvent de lois étrangères.';
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
    liste.append(el('li', { classe: 'aucune', texte: 'Aucun droit perdu avec ces sites.' }));
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
    zone.append(el('p', { classe: 'vide-texte', texte: 'Touche un site pour voir son dossier.' }));
    return;
  }

  zone.append(
    el('div', { classe: 'dossier-titre' }, [
      el('strong', { texte: m.nom }),
      el('span', { texte: m.type })
    ])
  );

  // Serveurs
  const serveurs = m.serveurs.map((s) => {
    const lieu = s.ville ? nomPays(s.pays) + ' (' + s.ville + ')' : nomPays(s.pays);
    return m.serveurs.length > 1 ? lieu + ' ' + s.part + '\u00a0%' : lieu;
  });

  // Hébergeur
  let hebergeur = m.hebergeur.nom + ', ' + nomPays(m.hebergeur.pays);
  if (m.hebergeur.statut === 'hypothese') hebergeur += ' (à confirmer)';

  // Lois qui s'appliquent
  const lois = el('dd');
  for (const code of [...new Set(m.juridictions)]) {
    const pays = donnees.pays[code];
    lois.append(el('p', { texte: pays.nom + ' : ' + pays.loi_cle }));
    if (pays.malus < 0) lois.append(el('p', { classe: 'explication', texte: pays.explication_visiteur }));
  }

  zone.append(
    el('dl', {}, [
      el('dt', { texte: 'Serveurs' }),
      el('dd', { texte: serveurs.join(', ') }),
      el('dt', { texte: 'Propriétaire' }),
      el('dd', { texte: m.proprietaire.entreprise + ', ' + nomPays(m.proprietaire.pays) }),
      el('dt', { texte: 'Hébergeur' }),
      el('dd', { texte: hebergeur }),
      el('dt', { texte: 'Législation' }),
      lois
    ]),
    el('p', { classe: 'dossier-message', texte: m.message_visiteur }),
    el('p', {
      classe: 'dossier-perte' + (m.score_malus < 0 ? ' perte' : ''),
      texte: m.score_malus < 0
        ? 'Droits perdus : ' + MOINS + Math.abs(m.score_malus)
        : 'Aucun droit perdu.'
    })
  );

  if (MONTRER_STATUT_VERIFICATION && m.statut_verification !== 'verifie') {
    zone.append(el('p', { classe: 'dossier-verif', texte: 'Données en cours de vérification.' }));
  }
}

// Bande de lecture optique, comme en bas d'un vrai passeport (décor qui reflète les choix)
function rendreMRZ(c) {
  const remplir = (texte) => (texte + '<'.repeat(44)).slice(0, 44);
  const nettoyer = (s) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const ligne1 = remplir('P<BEL<<VISITEUR<NUMERIQUE');
  const pays = Object.keys(c.juridique).sort((a, b) => c.juridique[b] - c.juridique[a]);
  const marques = c.choisies.map((m) => nettoyer(m.id).slice(0, 3));
  const ligne2 = remplir(
    'DROITS' + String(c.score).padStart(3, '0') + '<' + pays.join('<') + '<<' + marques.join('<')
  );

  $('mrz').textContent = ligne1 + '\n' + ligne2;
}

init();
