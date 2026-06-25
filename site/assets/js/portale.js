/* Italians.ch — Portale page chrome (clock, lang, nav, newsletter). */
(function () {
  'use strict';

  // Live clock
  var dateEl = document.getElementById('js-date');
  var timeEl = document.getElementById('js-time');
  function tick() {
    var now = new Date();
    if (dateEl) dateEl.textContent = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  tick(); setInterval(tick, 1000);

  // Language switch
  var langs = document.querySelectorAll('.lang');
  langs.forEach(function (b) {
    b.addEventListener('click', function () {
      langs.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
    });
  });

  // Scroll-spy nav highlight
  var links = Array.prototype.slice.call(document.querySelectorAll('.sectionnav a[href^="#"]'));
  var map = {};
  links.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    var sec = document.getElementById(id);
    if (sec) map[id] = a;
  });
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.removeAttribute('aria-current'); });
          var a = map[en.target.id];
          if (a) a.setAttribute('aria-current', 'page');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { obs.observe(document.getElementById(id)); });
  }

  // Newsletter
  var form = document.getElementById('js-nl-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if ((document.getElementById('js-nl-email').value || '').indexOf('@') === -1) return;
      form.hidden = true;
      document.getElementById('js-nl-thanks').hidden = false;
    });
  }
})();
