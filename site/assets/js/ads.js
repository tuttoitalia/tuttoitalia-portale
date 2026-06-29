/* ==========================================================================
   Italians.ch — advertising engine v2.
   Renders creatives into ad slots. A creative can be:
     - type 'image' : <img>  (jpg / png / gif / webp / svg)
     - type 'video' : <video autoplay muted loop playsinline + poster>  (instant)
     - type 'text'  : legacy gradient banner (advertiser/title/sub/cta)
   Standard inline slots:  <div class="adslot" data-ad-slot="ID" data-format="…">
   Special fixed placements (created/managed here):
     - rail-right   → sticky vertical skyscraper on the right (always visible)
     - wallpaper    → full-page background behind the centred content
     - fullscreen-1 → full-screen ad revealed through a transparent scroll gap
   Config is fetched from n8n (shared, managed in gestione.html) and cached in
   localStorage ('ti_ads'); falls back to DEFAULT_ADS. Unsold standard slots show
   a "space available" house promo linking to the media-kit page.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'ti_ads';
  var ROTATE_MS = 8000;
  var REMOTE = 'https://work.tuttoitalia.ch/webhook/ads-config';

  // Large/immersive slots: when unsold they stay empty (no house promo).
  var IMMERSIVE = { 'wallpaper': 1, 'fullscreen-1': 1 };

  var DEFAULT_ADS = {
    version: 2,
    creatives: [
      { id: 'c1', slot: 'home-top', type: 'text', format: 'leaderboard', advertiser: 'Ticketcorner',
        title: 'I grandi concerti italiani, 2026', sub: 'Eros, Ligabue, Zucchero e altri — biglietti ufficiali',
        cta: 'Scopri le date', href: 'https://www.ticketcorner.ch', bg: 'linear-gradient(120deg,#0B5132,#073C25)', color: '#fff', active: true },
      { id: 'c2', slot: 'home-mid', type: 'text', format: 'mpu', advertiser: 'Fiat',
        title: 'Nuova 500e', sub: 'L\'icona italiana, ora elettrica', cta: 'Configura la tua',
        href: '#', bg: 'linear-gradient(160deg,#7a2a2f,#3d1418)', color: '#fff', active: true }
    ]
  };

  function loadConfig() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var c = JSON.parse(raw); if (c && c.creatives) return c; }
    } catch (e) {}
    return DEFAULT_ADS;
  }
  function saveConfig(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function resetConfig() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function inWindow(c, today) {
    if (c.active === false) return false;
    if (c.start && today < c.start) return false;
    if (c.end && today > c.end) return false;
    return true;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }
  function safeHref(h) {
    h = String(h == null ? '' : h).trim();
    if (/^(https?:|mailto:|#|\.|\/)/i.test(h)) return h;
    return '#';
  }
  function kind(c) {
    if (c.type) return c.type;
    var m = (c.media || '').toLowerCase();
    if (/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/.test(m)) return 'video';
    if (c.media) return 'image';
    return 'text';
  }

  // Inner creative markup (no outer slot box).
  function mediaHTML(c) {
    var href = safeHref(c.href);
    var ext = (href && href.indexOf('http') === 0);
    var open = '<a class="adcreative" href="' + esc(href) + '" rel="noopener nofollow"' + (ext ? ' target="_blank"' : '') +
      ' aria-label="' + esc(c.advertiser || c.title || 'Pubblicità') + '">';
    var k = kind(c);
    if (k === 'video') {
      return open +
        '<video class="adcreative__video" autoplay muted loop playsinline preload="auto"' +
        (c.poster ? ' poster="' + esc(c.poster) + '"' : '') + '>' +
        '<source src="' + esc(c.media) + '"></video>' +
        (c.title ? '<span class="adcreative__cap">' + esc(c.title) + '</span>' : '') +
        '</a>';
    }
    if (k === 'image') {
      return open +
        '<img class="adcreative__img" src="' + esc(c.media) + '" alt="' + esc(c.advertiser || c.title || 'Pubblicità') + '" loading="eager" decoding="async">' +
        '</a>';
    }
    // text / gradient banner
    return '<a class="adbanner" href="' + esc(href) + '" rel="noopener nofollow"' + (ext ? ' target="_blank"' : '') +
      ' style="background:' + esc(c.bg || 'var(--green)') + ';color:' + esc(c.color || '#fff') + '">' +
      '<span class="adbanner__adv">' + esc(c.advertiser || 'Pubblicità') + '</span>' +
      '<span class="adbanner__title">' + esc(c.title || '') + '</span>' +
      (c.sub ? '<span class="adbanner__sub">' + esc(c.sub) + '</span>' : '') +
      (c.cta ? '<span class="adbanner__cta">' + esc(c.cta) + ' →</span>' : '') +
      '</a>';
  }

  function houseHTML() {
    return '<a class="adhouse" href="pubblicita.html">' +
      '<b>Spazio disponibile</b>' +
      '<span>Questo spazio può essere il tuo o della tua agenzia.</span>' +
      '<span class="adhouse__cta">Pubblicizza qui →</span></a>';
  }

  function poolFor(cfg, id, today) {
    return cfg.creatives.filter(function (c) { return c.slot === id && inWindow(c, today); });
  }

  // Rotate a target element through a pool of creatives.
  var timers = [];
  function mount(el, pool) {
    if (!pool.length) return false;
    var i = 0;
    el.innerHTML = mediaHTML(pool[0]);
    if (pool.length > 1) {
      timers.push(setInterval(function () {
        i = (i + 1) % pool.length;
        el.innerHTML = mediaHTML(pool[i]);
      }, ROTATE_MS));
    }
    return true;
  }

  // ---- Special fixed placements ------------------------------------------
  function ensure(id, cls) {
    var el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.className = cls; document.body.appendChild(el); }
    return el;
  }

  function renderRail(cfg, today) {
    var host = document.getElementById('ad-rail');
    if (!host) return;
    var pool = poolFor(cfg, 'rail-right', today);
    host.hidden = false;
    host.innerHTML = '<div class="adslot adslot--rail"></div>';
    var box = host.querySelector('.adslot--rail');
    if (!mount(box, pool)) box.innerHTML = houseHTML();
  }

  function renderWallpaper(cfg, today) {
    var host = ensure('ad-wallpaper', 'ad-wallpaper');
    var pool = poolFor(cfg, 'wallpaper', today);
    if (!pool.length) { host.hidden = true; host.innerHTML = ''; document.body.classList.remove('has-wallpaper'); return; }
    host.hidden = false; document.body.classList.add('has-wallpaper');
    host.innerHTML = '<div class="ad-wallpaper__panel ad-wallpaper__panel--l"></div>' +
      '<div class="ad-wallpaper__panel ad-wallpaper__panel--r"></div>';
    mount(host.querySelector('.ad-wallpaper__panel--l'), pool);
    mount(host.querySelector('.ad-wallpaper__panel--r'), pool);
  }

  // Full-screen reveal: a tall block inserted after the first article whose
  // creative is sticky + full-bleed — it pins to the viewport for ~one screen
  // of scrolling, then releases to the remaining articles. A persistent
  // observer re-inserts it whenever the feed re-renders.
  var revealObserver = null;
  var revealPool = [];
  function renderFullscreen(cfg, today) {
    var pool = poolFor(cfg, 'fullscreen-1', today);
    revealPool = pool;
    if (!pool.length) { stopReveal(); return; }
    startReveal();
  }
  function buildReveal() {
    var wrap = document.createElement('div');
    wrap.className = 'ad-reveal';
    wrap.id = 'ad-reveal-gap';
    wrap.innerHTML = '<div class="ad-reveal__tag">Pubblicità</div><div class="ad-reveal__sticky"></div>';
    mount(wrap.querySelector('.ad-reveal__sticky'), revealPool);
    return wrap;
  }
  function ensureGap() {
    if (!revealPool.length) return;
    if (document.getElementById('ad-reveal-gap')) return;
    var root = document.getElementById('news-root');
    if (!root) return;
    var first = root.querySelector(':scope > *');
    if (!first) return;
    first.parentNode.insertBefore(buildReveal(), first.nextSibling);
  }
  function startReveal() {
    ensureGap();
    if (revealObserver) return;
    var root = document.getElementById('news-root');
    if (!root) return;
    revealObserver = new MutationObserver(function () { ensureGap(); });
    revealObserver.observe(root, { childList: true });
  }
  function stopReveal() {
    if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
    var g = document.getElementById('ad-reveal-gap'); if (g) g.remove();
  }

  function render() {
    timers.forEach(clearInterval); timers = [];
    var cfg = loadConfig();
    var today = new Date().toISOString().slice(0, 10);

    document.querySelectorAll('.adslot[data-ad-slot]').forEach(function (slot) {
      var id = slot.getAttribute('data-ad-slot');
      var pool = poolFor(cfg, id, today);
      if (!mount(slot, pool)) {
        slot.innerHTML = IMMERSIVE[id] ? '' : houseHTML();
      }
    });

    // Immersive placements only on pages with the news feed (the homepage).
    if (document.getElementById('news-root')) {
      renderRail(cfg, today);
      renderWallpaper(cfg, today);
      renderFullscreen(cfg, today);
    }
  }

  // Pull the shared config from n8n, cache it, re-render.
  function fetchRemote() {
    try {
      fetch(REMOTE, { method: 'GET', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.ok && j.config && Array.isArray(j.config.creatives)) {
            saveConfig(j.config);
            render();
          }
        })
        .catch(function () {});
    } catch (e) {}
  }

  function boot() { render(); fetchRemote(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.TIAds = {
    DEFAULT_ADS: DEFAULT_ADS,
    load: loadConfig, save: saveConfig, reset: resetConfig, render: render, fetch: fetchRemote, REMOTE: REMOTE
  };
})();
