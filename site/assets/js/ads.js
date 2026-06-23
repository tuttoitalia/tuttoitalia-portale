/* ==========================================================================
   Tuttoitalia.ch — advertising engine.
   Renders banners into <div class="adslot" data-ad-slot="ID" data-format="...">.
   Config lives in localStorage ('ti_ads'), managed from gestione.html, and
   falls back to DEFAULT_ADS. Unsold slots show a "space available" house promo
   that links to the agency/media-kit page. Client-side only — a real ad server
   would replace loadConfig()/saveConfig().
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'ti_ads';
  var ROTATE_MS = 7000;

  // Default inventory: house + sample agency creatives. 'home-footer' left
  // empty on purpose to demonstrate the "space available" promo.
  var DEFAULT_ADS = {
    version: 1,
    creatives: [
      { id: 'c1', slot: 'home-top', format: 'leaderboard', advertiser: 'Ticketcorner',
        title: 'I grandi concerti italiani, 2026', sub: 'Eros, Ligabue, Zucchero e altri — biglietti ufficiali',
        cta: 'Scopri le date', href: 'https://www.ticketcorner.ch', bg: 'linear-gradient(120deg,#0B5132,#073C25)', color: '#fff', active: true },
      { id: 'c2', slot: 'home-mid', format: 'mpu', advertiser: 'Fiat',
        title: 'Nuova 500e', sub: 'L\'icona italiana, ora elettrica', cta: 'Configura la tua',
        href: '#', bg: 'linear-gradient(160deg,#7a2a2f,#3d1418)', color: '#fff', active: true },
      { id: 'c3', slot: 'portale-top', format: 'leaderboard', advertiser: 'Lavazza',
        title: 'Il caffè italiano, ovunque tu sia', sub: 'Capsule e macchine in offerta per la community',
        cta: 'Vai allo shop', href: '#', bg: 'linear-gradient(120deg,#3a2a18,#7a5a2a)', color: '#fff', active: true },
      { id: 'c4', slot: 'portale-mid', format: 'mpu', advertiser: 'ITA Airways',
        title: 'Voli per l\'Italia', sub: 'Da Zurigo e Ginevra, tariffe community', cta: 'Prenota',
        href: '#', bg: 'linear-gradient(160deg,#21477f,#0e1f3d)', color: '#fff', active: true },
      { id: 'c5', slot: 'portale-top', format: 'leaderboard', advertiser: 'Pathé',
        title: 'Il cinema italiano sul grande schermo', sub: 'Le uscite della settimana in Svizzera',
        cta: 'Orari e sale', href: '#', bg: 'linear-gradient(120deg,#1f3a52,#0a1722)', color: '#fff', active: true }
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

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function bannerHTML(c) {
    return '<a class="adbanner" href="' + escapeHtml(c.href || '#') + '" rel="noopener nofollow"' +
      (c.href && c.href.indexOf('http') === 0 ? ' target="_blank"' : '') +
      ' style="background:' + escapeHtml(c.bg || 'var(--green)') + ';color:' + escapeHtml(c.color || '#fff') + '">' +
      '<span class="adbanner__adv">' + escapeHtml(c.advertiser || 'Pubblicità') + '</span>' +
      '<span class="adbanner__title">' + escapeHtml(c.title || '') + '</span>' +
      (c.sub ? '<span class="adbanner__sub">' + escapeHtml(c.sub) + '</span>' : '') +
      (c.cta ? '<span class="adbanner__cta">' + escapeHtml(c.cta) + ' →</span>' : '') +
      '</a>';
  }

  function houseHTML() {
    return '<a class="adhouse" href="pubblicita.html">' +
      '<b>Spazio disponibile</b>' +
      '<span>Questo spazio può essere il tuo o della tua agenzia.</span>' +
      '<span class="adhouse__cta">Pubblicizza qui →</span></a>';
  }

  var timers = [];
  function render() {
    timers.forEach(clearInterval); timers = [];
    var cfg = loadConfig();
    var today = new Date().toISOString().slice(0, 10);

    document.querySelectorAll('.adslot[data-ad-slot]').forEach(function (slot) {
      var id = slot.getAttribute('data-ad-slot');
      var pool = cfg.creatives.filter(function (c) { return c.slot === id && inWindow(c, today); });

      if (!pool.length) { slot.innerHTML = houseHTML(); return; }

      var i = 0;
      slot.innerHTML = bannerHTML(pool[0]);
      if (pool.length > 1) {
        timers.push(setInterval(function () {
          i = (i + 1) % pool.length;
          slot.innerHTML = bannerHTML(pool[i]);
        }, ROTATE_MS));
      }
    });
  }

  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();

  window.TIAds = {
    DEFAULT_ADS: DEFAULT_ADS,
    load: loadConfig, save: saveConfig, reset: resetConfig, render: render
  };
})();
