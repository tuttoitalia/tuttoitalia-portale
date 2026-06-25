/* ==========================================================================
   italians-news.js — rende le notizie reali (import Webflow) sulla home,
   con switch lingua (IT/EN/DE/FR) e reader articolo.
   Dati: ./data/index.<lang>.json (lista) e ./data/a/<slug>.json (articolo).
   ========================================================================== */
(function () {
  var LANGS = ['it', 'en', 'de', 'fr'];
  var ROOT = document.getElementById('news-root');
  if (!ROOT) return;

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(q) >= 0) return q;
    var s = localStorage.getItem('itlang');
    if (LANGS.indexOf(s) >= 0) return s;
    return 'it';
  }
  var LANG = pickLang();
  document.documentElement.lang = LANG;

  var T = {
    it: { latest: 'Ultime notizie', by: 'di', loading: 'Caricamento notizie…', err: 'Impossibile caricare le notizie.' },
    en: { latest: 'Latest news', by: 'by', loading: 'Loading news…', err: 'Unable to load the news.' },
    de: { latest: 'Neueste Nachrichten', by: 'von', loading: 'Nachrichten werden geladen…', err: 'Nachrichten konnten nicht geladen werden.' },
    fr: { latest: 'Dernières actualités', by: 'par', loading: 'Chargement des actualités…', err: 'Impossible de charger les actualités.' }
  }[LANG];

  var LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[LANG];
  function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = (s == null ? '' : s); return d.innerHTML; }
  function bg(url) { return url ? ' style="background-image:url(' + esc(url) + ');background-size:cover;background-position:center"' : ''; }
  function byline(a) { return (a.author ? T.by + ' ' + esc(a.author) + ' · ' : '') + fmtDate(a.date); }
  function cleanCat(c) { return c ? c.replace(/\s*\([^)]*\)\s*$/, '').trim() : c; }

  /* ---- language buttons ---- */
  document.querySelectorAll('.lang').forEach(function (btn) {
    var code = (btn.textContent || '').trim().toLowerCase();
    btn.setAttribute('aria-pressed', String(code === LANG));
    btn.addEventListener('click', function () {
      if (LANGS.indexOf(code) < 0 || code === LANG) return;
      localStorage.setItem('itlang', code);
      var p = new URLSearchParams(location.search); p.set('lang', code); p.delete('a');
      location.search = p.toString();
    });
  });

  /* ---- chrome i18n: claim ed etichette fisse ---- */
  var CHROME = {
    it: { since: 'Dal 2003', sub: 'Il media italiano<br>in Svizzera.', motto: "L'Italia, ovunque siano gli italiani.", search: 'Cerca', searchAria: 'Cerca sul sito', breaking: "ULTIM'ORA", ads: 'Pubblicità', concorsi: 'Concorsi', register: 'Registrati' },
    en: { since: 'Since 2003', sub: 'The Italian media<br>in Switzerland.', motto: 'Italy, wherever Italians are.', search: 'Search', searchAria: 'Search the site', breaking: 'BREAKING', ads: 'Advertising', concorsi: 'Contests', register: 'Sign up' },
    de: { since: 'Seit 2003', sub: 'Das italienische Medium<br>in der Schweiz.', motto: 'Italien, überall wo Italiener sind.', search: 'Suchen', searchAria: 'Website durchsuchen', breaking: 'AKTUELL', ads: 'Werbung', concorsi: 'Wettbewerbe', register: 'Registrieren' },
    fr: { since: 'Depuis 2003', sub: 'Le média italien<br>en Suisse.', motto: "L'Italie, partout où vivent les Italiens.", search: 'Rechercher', searchAria: 'Rechercher sur le site', breaking: 'DERNIÈRE HEURE', ads: 'Publicité', concorsi: 'Concours', register: "S'inscrire" }
  };
  var NAV = {
    'Portale ✦': { en: 'Portal ✦', de: 'Portal ✦', fr: 'Portail ✦' },
    'Attualità': { en: 'News', de: 'Aktuelles', fr: 'Actualité' },
    'Cinema': { en: 'Cinema', de: 'Kino', fr: 'Cinéma' },
    'Eventi': { en: 'Events', de: 'Veranstaltungen', fr: 'Événements' },
    'Gastronomia': { en: 'Food', de: 'Gastronomie', fr: 'Gastronomie' },
    'Imprese': { en: 'Business', de: 'Unternehmen', fr: 'Entreprises' },
    'Motori': { en: 'Motors', de: 'Motor', fr: 'Moteurs' },
    'Musica': { en: 'Music', de: 'Musik', fr: 'Musique' },
    'Sport': { en: 'Sport', de: 'Sport', fr: 'Sport' },
    'Turismo': { en: 'Tourism', de: 'Tourismus', fr: 'Tourisme' },
    'Wellness & Salute': { en: 'Wellness & Health', de: 'Wellness & Gesundheit', fr: 'Bien-être & Santé' }
  };
  function applyChrome() {
    var c = CHROME[LANG]; if (!c) return;
    var m = document.querySelector('.masthead__motto'); if (m) m.textContent = c.motto;
    var sc = document.querySelector('.masthead__since'); if (sc) sc.textContent = c.since;
    var sub = document.querySelector('.masthead__tagline-left > div:not(.masthead__since)'); if (sub) sub.innerHTML = c.sub;
    var si = document.querySelector('.search input'); if (si) { si.placeholder = c.search; si.setAttribute('aria-label', c.searchAria); }
    var tk = document.querySelector('.ticker__tag'); if (tk) tk.textContent = c.breaking;
    [].forEach.call(document.querySelectorAll('.adwrap__label'), function (n) { n.textContent = c.ads; });
    var conc = document.querySelector('.utility__link[href$="#concorsi"]'); if (conc) conc.textContent = c.concorsi;
    var reg = document.querySelector('.btn-newsletter'); if (reg && LANG !== 'it') reg.textContent = c.register;
    if (LANG !== 'it') [].forEach.call(document.querySelectorAll('.navitem'), function (n) {
      var k = n.textContent.trim(); if (NAV[k] && NAV[k][LANG]) n.textContent = NAV[k][LANG];
    });
  }
  applyChrome();

  function fillTicker(list) {
    var track = document.querySelector('.ticker__marquee'); if (!track) return;
    var spans = list.slice(0, 6).map(function (a) { return '<span>' + esc(a.title) + '</span>'; }).join('');
    track.innerHTML = '<span class="ticker__group">' + spans + '</span><span class="ticker__group" aria-hidden="true">' + spans + '</span>';
  }

  ROOT.innerHTML = '<div class="container" style="padding:48px 0;color:var(--gray)">' + T.loading + '</div>';

  var OV = {};
  Promise.all([
    fetch('./data/index.' + LANG + '.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
    fetch('https://work.tuttoitalia.ch/webhook/redazione-overrides', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { return (j && j.overrides) || {}; }).catch(function () { return {}; })
  ]).then(function (a) { OV = a[1] || {}; render(a[0]); })
    .catch(function () { ROOT.innerHTML = '<div class="container" style="padding:64px 0">' + T.err + '</div>'; });

  function cardHTML(a) {
    return '<article class="card" data-slug="' + esc(a.slug) + '" tabindex="0" role="link">' +
      '<div class="card__media tile"' + bg(a.thumb || a.image) + '></div>' +
      '<div class="card__body">' +
      (a.category ? '<div class="kicker">' + esc(cleanCat(a.category)) + '</div>' : '') +
      '<h3>' + esc((OV[a.slug] && OV[a.slug].name) || a.title) + '</h3>' +
      '<p class="card__byline">' + byline(a) + '</p>' +
      '</div></article>';
  }

  function heroHTML(a) {
    return '<div class="container" style="margin-top:32px">' +
      '<article class="lead" data-slug="' + esc(a.slug) + '" tabindex="0" role="link">' +
      '<div class="lead__media tile"' + bg(a.image || a.thumb) + '>' +
      (a.category ? '<span class="badge-tag">' + esc(cleanCat(a.category)) + '</span>' : '') + '</div>' +
      (a.category ? '<div class="kicker lead__kicker">' + esc(cleanCat(a.category)) + '</div>' : '') +
      '<h2 class="lead__title">' + esc((OV[a.slug] && OV[a.slug].name) || a.title) + '</h2>' +
      (a.subtitle ? '<p class="lead__deck">' + esc(a.subtitle) + '</p>' : '') +
      '<div class="byline">' + byline(a) + '</div>' +
      '</article></div>';
  }

  function strip(title, items, anchor) {
    if (!items.length) return '';
    return '<section class="container" id="' + esc(anchor || '') + '" style="margin-top:52px">' +
      '<div class="block-head"><h2>' + esc(cleanCat(title)) + '</h2></div>' +
      '<div class="cards3">' + items.map(cardHTML).join('') + '</div></section>';
  }

  function render(list) {
    list = (list || []).filter(function (a) { return a && a.slug && a.title; });
    if (!list.length) { ROOT.innerHTML = '<div class="container" style="padding:64px 0">' + T.err + '</div>'; return; }

    var hero = list.find(function (a) { return a.featured; }) || list[0];
    var rest = list.filter(function (a) { return a.slug !== hero.slug; });

    var html = heroHTML(hero);
    html += strip(T.latest, rest.slice(0, 12), 'ultime');

    // strisce per categoria (le principali presenti)
    var byCat = {}, order = [];
    rest.forEach(function (a) {
      if (!a.category) return;
      if (!byCat[a.category]) { byCat[a.category] = []; order.push(a.category); }
      byCat[a.category].push(a);
    });
    order.sort(function (x, y) { return byCat[y].length - byCat[x].length; });
    order.slice(0, 6).forEach(function (cat) {
      html += strip(cat, byCat[cat].slice(0, 6), 'cat-' + cat.toLowerCase().replace(/[^a-z]+/g, '-'));
    });

    ROOT.innerHTML = html;
    fillTicker(list);

    // deep-link ?a=slug
    var direct = new URLSearchParams(location.search).get('a');
    if (direct) openArticle(direct);
  }

  /* ---- reader ---- */
  ROOT.addEventListener('click', function (e) {
    var el = e.target.closest('[data-slug]'); if (el) openArticle(el.getAttribute('data-slug'));
  });
  ROOT.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest('[data-slug]'); if (el) { e.preventDefault(); openArticle(el.getAttribute('data-slug')); }
  });

  var reader = document.getElementById('js-reader');
  function setText(id, v) { var n = document.getElementById(id); if (n) n.textContent = v || ''; }

  function showReader(a) {
    setText('js-reader-section', cleanCat(a.category) || '');
    setText('js-reader-title', a.title || '');
    setText('js-reader-deck', a.subtitle || '');
    setText('js-reader-author', a.author ? (T.by + ' ' + a.author) : '');
    setText('js-reader-time', fmtDate(a.date));
    var media = document.getElementById('js-reader-media');
    if (media) {
      var img = a.image || a.thumb;
      media.style.backgroundImage = img ? 'url(' + img + ')' : '';
      media.style.backgroundSize = 'cover'; media.style.backgroundPosition = 'center';
      var lab = document.getElementById('js-reader-label'); if (lab) lab.textContent = '';
    }
    var body = document.getElementById('js-reader-body');
    if (body) body.innerHTML = a.body || '';
    if (reader) {
      reader.hidden = false;
      document.body.style.overflow = 'hidden';
      var panel = reader.querySelector('.reader__panel'); if (panel) panel.scrollTop = 0;
      var c = document.getElementById('js-reader-close'); if (c) c.focus();
    }
  }
  function closeReader() { if (reader) reader.hidden = true; document.body.style.overflow = ''; }
  var closeBtn = document.getElementById('js-reader-close');
  if (closeBtn) closeBtn.addEventListener('click', closeReader);
  if (reader) reader.addEventListener('click', function (e) { if (e.target === reader) closeReader(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && reader && !reader.hidden) closeReader(); });

  function openArticle(slug) {
    fetch('./data/a/' + encodeURIComponent(slug) + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (a) { var o = OV[a.slug || slug]; if (o) { if (o.name) a.title = o.name; if (o.subtitle != null) a.subtitle = o.subtitle; if (o.body) a.body = o.body; } showReader(a); })
      .catch(function () {});
  }
})();
