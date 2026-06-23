/* ==========================================================================
   Tuttoitalia Stays — Airbnb-style frontend behaviour.
   Renders listings, wishlist hearts, category filter, search, and a listing
   detail overlay with reservation fee calc. Client-side demo only.
   ========================================================================== */
(function () {
  'use strict';

  var LISTINGS = [
    { id: 'puglia', title: 'Trullo storico in Valle d\'Itria', loc: 'Puglia', cat: 'Trulli',
      sub: '4 ospiti · 2 camere · 2 letti · 1 bagno', meta: 'A 8 km da Alberobello', dates: '12–17 lug',
      price: 120, rating: 4.94, reviews: 187, fav: true, host: 'Giuseppe', superhost: true,
      desc: 'Un trullo del 1800 restaurato con cura, tra ulivi secolari e muretti a secco. Colazione pugliese inclusa, a pochi minuti da Alberobello e Locorotondo.',
      amen: ['Wi-Fi', 'Cucina attrezzata', 'Piscina esterna', 'Parcheggio gratuito', 'Aria condizionata', 'Giardino con ulivi'],
      bg: 'linear-gradient(160deg,#d6c5a8,#8a6a3f)' },
    { id: 'tropea', title: 'Bilocale vista mare a Tropea', loc: 'Calabria', cat: 'Vista mare',
      sub: '2 ospiti · 1 camera · 1 letto · 1 bagno', meta: 'A 150 m dalla spiaggia', dates: '3–8 ago',
      price: 95, rating: 4.88, reviews: 142, fav: true, host: 'Maria', superhost: true,
      desc: 'Terrazza affacciata sulla costa degli Dei, tramonti indimenticabili sullo Stromboli. Centro storico di Tropea a piedi.',
      amen: ['Wi-Fi', 'Terrazza vista mare', 'Cucina', 'Aria condizionata', 'Vicino alla spiaggia', 'Self check-in'],
      bg: 'linear-gradient(160deg,#5d9ab0,#1f3a52)' },
    { id: 'valdorcia', title: 'Casale panoramico in Val d\'Orcia', loc: 'Toscana', cat: 'Ville',
      sub: '8 ospiti · 4 camere · 5 letti · 3 bagni', meta: 'A 20 km da Montalcino', dates: '24–31 ago',
      price: 240, rating: 4.97, reviews: 96, fav: true, host: 'Lorenzo', superhost: true,
      desc: 'Casale in pietra tra le colline patrimonio UNESCO, piscina infinity verso i cipressi. Ideale per famiglie e degustazioni di Brunello.',
      amen: ['Piscina infinity', 'Wi-Fi', 'Cucina gourmet', 'Camino', 'Parcheggio', '6 km di vigneti'],
      bg: 'linear-gradient(160deg,#9fae6a,#3a4d2a)' },
    { id: 'ortigia', title: 'Attico nel cuore di Ortigia', loc: 'Siracusa, Sicilia', cat: 'Città d\'arte',
      sub: '3 ospiti · 1 camera · 2 letti · 1 bagno', meta: 'Centro storico', dates: '10–15 set',
      price: 150, rating: 4.85, reviews: 211, fav: false, host: 'Carla', superhost: false,
      desc: 'Attico con vista sui tetti barocchi dell\'isola di Ortigia, a due passi dal Duomo e dal mare.',
      amen: ['Wi-Fi', 'Terrazza', 'Cucina', 'Aria condizionata', 'Vista città', 'Ascensore'],
      bg: 'linear-gradient(160deg,#c98a6a,#7a2a2f)' },
    { id: 'dolomiti', title: 'Chalet con vista sulle Dolomiti', loc: 'Trentino', cat: 'Montagna',
      sub: '6 ospiti · 3 camere · 4 letti · 2 bagni', meta: 'A 1.400 m · piste a 500 m', dates: '20–27 dic',
      price: 180, rating: 4.91, reviews: 128, fav: true, host: 'Hannes', superhost: true,
      desc: 'Baita in legno con sauna e stube tradizionale, vista sulle vette. Perfetta d\'inverno e d\'estate.',
      amen: ['Sauna', 'Camino', 'Wi-Fi', 'Parcheggio', 'Vicino alle piste', 'Cucina'],
      bg: 'linear-gradient(160deg,#9bb6c9,#2a3a48)' },
    { id: 'navigli', title: 'Loft di design ai Navigli', loc: 'Milano', cat: 'Città d\'arte',
      sub: '2 ospiti · 1 camera · 1 letto · 1 bagno', meta: 'Zona Navigli', dates: '5–9 ott',
      price: 130, rating: 4.78, reviews: 304, fav: false, host: 'Elena', superhost: false,
      desc: 'Loft luminoso a un passo dalla movida dei Navigli, arredato da designer italiani.',
      amen: ['Wi-Fi veloce', 'Postazione lavoro', 'Cucina', 'Aria condizionata', 'Metro vicino', 'Self check-in'],
      bg: 'linear-gradient(160deg,#b0a0c0,#3a2f52)' },
    { id: 'pantelleria', title: 'Dammuso tra i vigneti', loc: 'Pantelleria, Sicilia', cat: 'Vista mare',
      sub: '4 ospiti · 2 camere · 2 letti · 1 bagno', meta: 'A 2 km dal mare', dates: '1–8 ago',
      price: 170, rating: 4.96, reviews: 73, fav: true, host: 'Salvo', superhost: true,
      desc: 'Dammuso tradizionale in pietra lavica con giardino arabo e vasca esterna. Pace assoluta tra capperi e zibibbo.',
      amen: ['Vasca esterna', 'Wi-Fi', 'Cucina', 'Giardino', 'Vista mare', 'Parcheggio'],
      bg: 'linear-gradient(160deg,#7a8a6a,#2a3418)' },
    { id: 'trastevere', title: 'Appartamento a Trastevere', loc: 'Roma', cat: 'Città d\'arte',
      sub: '4 ospiti · 2 camere · 3 letti · 1 bagno', meta: 'Trastevere', dates: '14–19 nov',
      price: 140, rating: 4.82, reviews: 256, fav: false, host: 'Francesca', superhost: true,
      desc: 'Nel rione più caratteristico di Roma, tra trattorie e vicoli acciottolati. Travi a vista e tanto fascino.',
      amen: ['Wi-Fi', 'Cucina', 'Aria condizionata', 'Lavatrice', 'Centro storico', 'Self check-in'],
      bg: 'linear-gradient(160deg,#c9a86a,#6a4a18)' }
  ];
  LISTINGS.forEach(function (l, i) { l.lock = (i + 1) * 7; });

  // Real-photo source: LoremFlickr serves real (CC) Flickr photos by keyword,
  // hotlink-friendly, no API key. `lock` pins a stable photo per slot.
  // NOTE: blocked inside this sandbox's network, so they render on the user's
  // browser / once online; a gradient fallback covers any load failure.
  var KW = {
    puglia: 'trullo,puglia', tropea: 'tropea,beach', valdorcia: 'tuscany,villa',
    ortigia: 'syracuse,sicily', dolomiti: 'dolomites,chalet', navigli: 'milano,apartment',
    pantelleria: 'pantelleria,sicily', trastevere: 'rome,trastevere'
  };
  function photo(id, lock, size) {
    return 'https://loremflickr.com/' + (size || 800) + '/' + (size || 800) + '/' +
      encodeURIComponent(KW[id] || 'italy') + '?lock=' + lock;
  }
  // Replace any image that fails to load with its gradient backdrop.
  function wireFallback(root) {
    root.querySelectorAll('img.abnb-photo').forEach(function (img) {
      img.addEventListener('error', function () { img.style.display = 'none'; });
    });
  }

  var WISH_KEY = 'ti_wishlist';
  function wish() { try { return JSON.parse(localStorage.getItem(WISH_KEY)) || {}; } catch (e) { return {}; } }
  function saveWish(w) { try { localStorage.setItem(WISH_KEY, JSON.stringify(w)); } catch (e) {} }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function eur(n) { return '€' + n; }

  /* ---- Toast --------------------------------------------------------- */
  var toastEl;
  function toast(m) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'abnb-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = m; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  /* ---- Heart SVG ----------------------------------------------------- */
  var HEART = '<svg viewBox="0 0 24 24" fill="rgba(0,0,0,.45)" stroke="#fff" stroke-width="2"><path d="M12 21s-7.5-4.8-10-9.2C.6 9 1.5 5.5 4.6 4.6 6.8 4 9 5 12 8c3-3 5.2-4 7.4-3.4 3.1.9 4 4.4 2.6 7.2C19.5 16.2 12 21 12 21z"/></svg>';

  /* ---- Card ---------------------------------------------------------- */
  function cardHTML(l, saved) {
    return '<article class="abnb-card" data-id="' + l.id + '" data-cat="' + esc(l.cat) + '">' +
      '<div class="abnb-card__media" style="background:' + l.bg + '">' +
        '<div class="tile" style="background:' + l.bg + '">' + esc(l.loc) + '</div>' +
        '<img class="abnb-photo" loading="lazy" alt="' + esc(l.title + ' — ' + l.loc) + '" src="' + photo(l.id, l.lock) + '">' +
        (l.fav ? '<span class="abnb-badge">Tra i preferiti degli ospiti</span>' : '') +
        '<button class="abnb-heart" data-heart="' + l.id + '" aria-pressed="' + (saved ? 'true' : 'false') + '" aria-label="Salva">' + HEART + '</button>' +
        '<div class="abnb-dots"><span class="is-on"></span><span></span><span></span><span></span><span></span></div>' +
      '</div>' +
      '<div class="abnb-card__row"><span class="abnb-card__title">' + esc(l.title) + '</span>' +
        '<span class="abnb-card__rating">★ ' + l.rating.toFixed(2) + '</span></div>' +
      '<div class="abnb-card__meta">' + esc(l.meta) + '</div>' +
      '<div class="abnb-card__meta">' + esc(l.dates) + '</div>' +
      '<div class="abnb-card__price"><b>' + eur(l.price) + '</b> a notte</div>' +
    '</article>';
  }

  var grid = document.getElementById('abnb-grid');
  function renderGrid(filterCat) {
    var w = wish();
    var items = LISTINGS.filter(function (l) { return !filterCat || l.cat === filterCat; });
    grid.innerHTML = items.map(function (l) { return cardHTML(l, w[l.id]); }).join('') ||
      '<p style="color:var(--muted);grid-column:1/-1">Nessuna casa in questa categoria.</p>';
    wireFallback(grid);
  }
  renderGrid(null);

  /* ---- Grid interactions --------------------------------------------- */
  grid.addEventListener('click', function (e) {
    var heart = e.target.closest('[data-heart]');
    if (heart) {
      e.stopPropagation();
      var id = heart.getAttribute('data-heart'); var w = wish();
      if (w[id]) { delete w[id]; heart.setAttribute('aria-pressed', 'false'); toast('Rimosso dai preferiti'); }
      else { w[id] = 1; heart.setAttribute('aria-pressed', 'true'); toast('Salvato nei preferiti ♥'); }
      saveWish(w);
      return;
    }
    var card = e.target.closest('[data-id]');
    if (card) openDetail(card.getAttribute('data-id'));
  });

  /* ---- Category strip ------------------------------------------------ */
  var cats = document.getElementById('abnb-cats');
  cats.addEventListener('click', function (e) {
    var b = e.target.closest('.abnb-cat'); if (!b) return;
    cats.querySelectorAll('.abnb-cat').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
    b.setAttribute('aria-selected', 'true');
    renderGrid(b.getAttribute('data-cat'));
  });

  /* ---- Search -------------------------------------------------------- */
  document.getElementById('abnb-search').addEventListener('submit', function (e) {
    e.preventDefault();
    var where = (document.getElementById('s-where').value || '').toLowerCase().trim();
    if (!where) { toast('Mostriamo tutte le case in Italia'); renderGrid(null); return; }
    var w = wish();
    var items = LISTINGS.filter(function (l) { return (l.loc + ' ' + l.title).toLowerCase().indexOf(where) !== -1; });
    grid.innerHTML = items.length ? items.map(function (l) { return cardHTML(l, w[l.id]); }).join('')
      : '<p style="color:var(--muted);grid-column:1/-1">Nessun risultato per “' + esc(where) + '”.</p>';
    wireFallback(grid);
    toast(items.length + ' case trovate');
  });

  /* ---- Detail overlay ------------------------------------------------ */
  var detail = document.getElementById('abnb-detail');
  var NIGHTS = 5;
  function openDetail(id) {
    var l = LISTINGS.find(function (x) { return x.id === id; }); if (!l) return;
    document.getElementById('d-title').textContent = l.title;
    document.getElementById('d-sub').textContent = l.loc + ' · ' + l.sub;
    document.getElementById('d-host').textContent = 'Ospiti da ' + l.host + (l.superhost ? ' · Superhost' : '');
    document.getElementById('d-hostmeta').textContent = l.sub;
    document.getElementById('d-desc').textContent = l.desc;
    document.getElementById('d-rating').textContent = l.rating.toFixed(2);
    document.getElementById('d-reviews').textContent = l.reviews + ' recensioni';
    document.getElementById('d-price').textContent = eur(l.price);

    document.getElementById('d-amenities').innerHTML = l.amen.map(function (a) {
      return '<li><span aria-hidden="true">✓</span> ' + esc(a) + '</li>';
    }).join('');

    var g = document.getElementById('d-gallery');
    g.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var d = document.createElement('div');
      d.className = 'tile';
      d.style.background = l.bg;
      var im = document.createElement('img');
      im.className = 'abnb-photo';
      im.loading = 'lazy';
      im.alt = l.title;
      im.src = photo(l.id, l.lock + i + 1, 800);
      d.appendChild(im);
      g.appendChild(d);
    }
    wireFallback(g);

    var fees = l.price * NIGHTS, clean = 45, service = Math.round(fees * 0.12);
    document.getElementById('d-fees').innerHTML =
      '<div><span>' + eur(l.price) + ' x ' + NIGHTS + ' notti</span><span>' + eur(fees) + '</span></div>' +
      '<div><span>Pulizie</span><span>' + eur(clean) + '</span></div>' +
      '<div><span>Servizio Tuttoitalia Stays</span><span>' + eur(service) + '</span></div>' +
      '<div class="total"><span>Totale</span><span>' + eur(fees + clean + service) + '</span></div>';

    detail.hidden = false; document.body.style.overflow = 'hidden'; window.scrollTo(0, 0);
  }
  function closeDetail() { detail.hidden = true; document.body.style.overflow = ''; }
  document.getElementById('d-back').addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !detail.hidden) closeDetail(); });
  document.getElementById('r-reserve').addEventListener('click', function () {
    toast('Richiesta di prenotazione inviata ✦ (demo)');
  });
  document.getElementById('d-share').addEventListener('click', function () { toast('Link copiato ♥'); });

  /* ---- Account avatar (shares session with the rest of the site) ----- */
  try {
    var u = JSON.parse(localStorage.getItem('ti_session'));
    if (u && u.name) {
      var initials = u.name.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
      document.querySelectorAll('[data-acct-initials]').forEach(function (el) { el.textContent = initials; });
    }
  } catch (e) {}
})();
