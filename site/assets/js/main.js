/* ==========================================================================
   Tuttoitalia.ch — restyle 2026
   Progressive enhancement: the page is fully readable without JS.
   This script only adds interactivity (clock, nav, tabs, reader, newsletter).
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Live clock (utility bar) -------------------------------------- */
  var dateEl = document.getElementById('js-date');
  var timeEl = document.getElementById('js-time');

  function tick() {
    var now = new Date();
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
  }
  tick();
  setInterval(tick, 1000);

  /* ---- Language switcher --------------------------------------------- */
  var langs = document.querySelectorAll('.lang');
  langs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      langs.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  /* ---- Section nav highlight ----------------------------------------- */
  var navItems = document.querySelectorAll('.navitem');
  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      navItems.forEach(function (n) { n.removeAttribute('aria-current'); });
      item.setAttribute('aria-current', 'page');
    });
  });

  /* ---- Smooth-scroll buttons (data-scroll="elementId") --------------- */
  document.querySelectorAll('[data-scroll]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-scroll'));
      if (!el) return;
      var y = el.getBoundingClientRect().top + window.pageYOffset - 60;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  /* ---- Tabbed block (Motori / Turismo) ------------------------------- */
  var tabs = document.querySelectorAll('.tab');
  var panels = document.querySelectorAll('[data-panel]');
  var tabbedTitle = document.getElementById('js-tabbed-title');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.getAttribute('data-tab');
      tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
      if (tabbedTitle) tabbedTitle.textContent = tab.textContent;
    });
  });

  /* ---- Reader modal -------------------------------------------------- */
  var reader = document.getElementById('js-reader');
  var lastFocused = null;

  var R = {
    section: document.getElementById('js-reader-section'),
    title:   document.getElementById('js-reader-title'),
    deck:    document.getElementById('js-reader-deck'),
    author:  document.getElementById('js-reader-author'),
    time:    document.getElementById('js-reader-time'),
    media:   document.getElementById('js-reader-media'),
    label:   document.getElementById('js-reader-label')
  };

  function openReader(el) {
    var d = el.dataset;
    var titleText = (el.querySelector('h1, h2, h3, .mostread__title') || {}).textContent || d.deck || '';
    R.section.textContent = d.section || '';
    R.title.textContent = titleText.trim();
    R.deck.textContent = d.deck || titleText.trim();
    R.author.textContent = 'di ' + (d.author || 'Redazione');
    R.time.textContent = d.time || '';
    R.label.textContent = d.label || '';
    R.media.style.background = d.bg || 'var(--green)';

    lastFocused = document.activeElement;
    reader.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('js-reader-close').focus();
  }

  function closeReader() {
    reader.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  document.querySelectorAll('[data-article]').forEach(function (art) {
    art.setAttribute('tabindex', '0');
    art.setAttribute('role', 'button');
    art.addEventListener('click', function () { openReader(art); });
    art.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openReader(art); }
    });
  });

  document.getElementById('js-reader-close').addEventListener('click', closeReader);
  reader.addEventListener('click', function (e) {
    if (e.target === reader) closeReader();   // click on the dim backdrop
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !reader.hidden) closeReader();
  });

  /* ---- Newsletter form ----------------------------------------------- */
  var nlForm = document.getElementById('js-nl-form');
  if (nlForm) {
    nlForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('js-nl-email').value || '';
      if (email.indexOf('@') === -1) return;
      nlForm.hidden = true;
      document.getElementById('js-nl-thanks').hidden = false;
    });
  }
})();
