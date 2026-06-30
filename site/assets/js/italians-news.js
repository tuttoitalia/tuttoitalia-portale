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
    it: { latest: 'Ultime notizie', by: 'di', loading: 'Caricamento notizie…', err: 'Impossibile caricare le notizie.', home: 'Home', related: 'Continua a leggere' },
    en: { latest: 'Latest news', by: 'by', loading: 'Loading news…', err: 'Unable to load the news.', home: 'Home', related: 'Keep reading' },
    de: { latest: 'Neueste Nachrichten', by: 'von', loading: 'Nachrichten werden geladen…', err: 'Nachrichten konnten nicht geladen werden.', home: 'Home', related: 'Weiterlesen' },
    fr: { latest: 'Dernières actualités', by: 'par', loading: 'Chargement des actualités…', err: 'Impossible de charger les actualités.', home: 'Accueil', related: 'À lire aussi' }
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

  var OV = {}, FULL = [];
  var CAT_MAP = {
    attualita: { it: 'attualita', de: 'aktuell', fr: 'actualite-french', en: 'actuality' },
    cinema: { it: 'cinema', de: 'kino', fr: 'cinema-french', en: 'cinema-english' },
    eventi: { it: 'eventi', de: 'veranstaltungen', fr: 'evenements', en: 'events' },
    gastronomia: { it: 'gastronomia', de: 'gastronomie-german', fr: 'gastronomie-french', en: 'gastronomy' },
    imprese: { it: 'imprese', de: 'unternehmen', fr: 'entreprises', en: 'business' },
    motori: { it: 'motori', de: 'motoren', fr: 'moteurs', en: 'car-motorcycle' },
    musica: { it: 'musica', de: 'musik', fr: 'musique', en: 'music' },
    sport: { it: 'sport', de: 'sport-german', fr: 'sport-french', en: 'sports-english' },
    turismo: { it: 'turismo', de: 'tourismus', fr: 'tourisme', en: 'tourism' },
    wellness: { it: 'wellness-e-salute', de: 'wellness-deutsch', fr: 'wellness-fr', en: 'wellness-english' }
  };
  Promise.all([
    fetch('./data/index.' + LANG + '.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
    fetch('https://work.tuttoitalia.ch/webhook/redazione-overrides', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { return (j && j.overrides) || {}; }).catch(function () { return {}; })
  ]).then(function (a) { OV = a[1] || {}; FULL = a[0] || []; wireNav(); route(); })
    .catch(function () { ROOT.innerHTML = '<div class="container" style="padding:64px 0">' + T.err + '</div>'; });

  function curCat() { var c = new URLSearchParams(location.search).get('cat'); return (c && CAT_MAP[c]) ? c : ''; }
  function setActiveNav(c) {
    [].forEach.call(document.querySelectorAll('.navitem'), function (n) {
      var nc = n.getAttribute('data-cat');
      if (nc !== null) { if (nc === c) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current'); }
    });
  }
  function wireNav() {
    [].forEach.call(document.querySelectorAll('.navitem[data-cat]'), function (n) {
      n.addEventListener('click', function () {
        var c = n.getAttribute('data-cat');
        var p = new URLSearchParams(location.search);
        if (c) p.set('cat', c); else p.delete('cat');
        p.delete('a');
        location.search = p.toString();
      });
    });
  }
  function route() {
    var direct = new URLSearchParams(location.search).get('a');
    if (direct) { openArticle(direct); return; }   // articolo = pagina vera (header resta)
    var c = curCat();
    setActiveNav(c);
    if (c) renderRubric(FULL, c); else render(FULL);
  }
  function renderRubric(list, key) {
    var slug = CAT_MAP[key][LANG];
    var items = list.filter(function (a) { return a.categorySlug === slug; });
    var title = items.length ? cleanCat(items[0].category) : key;
    var html = '<div class="container" style="margin-top:32px">' +
      '<div class="block-head"><h2>' + esc(title) + '</h2>' +
      '<a class="block-head__more" href="?lang=' + LANG + '">← ' + (T.home || 'Home') + '</a></div>';
    html += items.length ? '<div class="cards3">' + items.map(cardHTML).join('') + '</div>'
      : '<p style="padding:40px 0;color:var(--gray)">—</p>';
    ROOT.innerHTML = html + '</div>';
    fillTicker(list);
  }

  function cardHTML(a) {
    return '<article class="card" data-slug="' + esc(a.slug) + '" tabindex="0" role="link">' +
      '<div class="card__media tile"' + bg((OV[a.slug] && OV[a.slug].thumb) || a.thumb || a.image) + '></div>' +
      '<div class="card__body">' +
      (a.category ? '<div class="kicker">' + esc(cleanCat(a.category)) + '</div>' : '') +
      '<h3>' + esc((OV[a.slug] && OV[a.slug].name) || a.title) + '</h3>' +
      '<p class="card__byline">' + byline(a) + '</p>' +
      '</div></article>';
  }

  function heroHTML(a) {
    return '<div class="container" style="margin-top:32px">' +
      '<article class="lead" data-slug="' + esc(a.slug) + '" tabindex="0" role="link">' +
      '<div class="lead__media tile"' + bg((OV[a.slug] && OV[a.slug].image) || a.image || a.thumb) + '>' +
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
  }

  /* ---- apertura articolo: PAGINA VERA in-sito (header/menu/footer restano) ---- */
  function goArticle(slug) {                       // click su una card -> naviga a ?a=slug
    var p = new URLSearchParams(location.search);
    p.set('a', slug);
    location.search = p.toString();
  }
  ROOT.addEventListener('click', function (e) {
    var el = e.target.closest('[data-slug]'); if (el) goArticle(el.getAttribute('data-slug'));
  });
  ROOT.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest('[data-slug]'); if (el) { e.preventDefault(); goArticle(el.getAttribute('data-slug')); }
  });

  function relatedHTML(a) {
    var rel = (FULL || []).filter(function (x) {
      return x && x.slug && x.slug !== a.slug && a.categorySlug && x.categorySlug === a.categorySlug;
    }).slice(0, 3);
    if (!rel.length) return '';
    return '<section class="container related"><div class="block-head"><h2>' +
      esc(T.related || 'Continua a leggere') + '</h2></div>' +
      '<div class="cards3">' + rel.map(cardHTML).join('') + '</div></section>';
  }
  function articleHTML(a) {
    var img = a.image || a.thumb;
    var p = new URLSearchParams(location.search); p.delete('a');
    var back = p.toString() ? ('?' + p.toString()) : './';
    return '<div class="container article-wrap">' +
      '<a class="article-back" href="' + esc(back) + '">← ' + esc(T.home || 'Home') + '</a>' +
      '<article class="article-page">' +
      (a.category ? '<div class="kicker">' + esc(cleanCat(a.category)) + '</div>' : '') +
      '<h1 class="reader__title">' + esc(a.title || '') + '</h1>' +
      (a.subtitle ? '<p class="reader__deck">' + esc(a.subtitle) + '</p>' : '') +
      '<div class="reader__meta"><span>' + (a.author ? esc(T.by + ' ' + a.author) : '') + '</span>' +
        (a.date ? '<span>' + esc(fmtDate(a.date)) + '</span>' : '') + '</div>' +
      (img ? '<div class="reader__media tile" style="background-image:url(' + esc(img) + ');background-size:cover;background-position:center"></div>' : '') +
      '<div class="reader__body">' + (a.body || '') + '</div>' +
      '</article></div>' + relatedHTML(a);
  }

  function openArticle(slug) {
    setActiveNav('');
    ROOT.innerHTML = '<div class="container" style="padding:48px 0;color:var(--gray)">' + T.loading + '</div>';
    fetch('./data/a/' + encodeURIComponent(slug) + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (a) {
        var o = OV[a.slug || slug];
        if (o) { if (o.name) a.title = o.name; if (o.subtitle != null) a.subtitle = o.subtitle; if (o.body) a.body = o.body; if (o.image) a.image = o.image; if (o.thumb) a.thumb = o.thumb; }
        ROOT.innerHTML = articleHTML(a);
        try { document.title = (a.title || 'Italians.ch') + ' — Italians.ch'; } catch (e) {}
        window.scrollTo(0, 0);
      })
      .catch(function () { ROOT.innerHTML = '<div class="container" style="padding:64px 0">' + T.err + '</div>'; });
  }
})();
