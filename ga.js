/* Italians.ch — GA4 + Google Consent Mode v2.
   Caricato in <head> in modo SINCRONO, prima di gtag.js: imposta dataLayer,
   consenso di default NEGATO (CH/UE), config. Il banner (sotto) aggiorna il
   consenso su "Accetta". GA4 in consent mode invia ping senza cookie finché
   negato, dati completi dopo il consenso. */
(function () {
  var GA_ID = 'G-L0ZSY0STP7';
  var KEY = 'ti_consent'; // 'granted' | 'denied'

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  gtag('config', GA_ID, { anonymize_ip: true });

  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) {}
  if (choice === 'granted') { gtag('consent', 'update', { analytics_storage: 'granted' }); }

  function decide(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    if (v === 'granted') { gtag('consent', 'update', { analytics_storage: 'granted' }); }
    var b = document.getElementById('cookie'); if (b) b.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('cookie');
    if (!b) return;
    if (choice) { b.style.display = 'none'; return; }
    b.style.display = 'flex';
    var ok = document.getElementById('c-ok'), no = document.getElementById('c-no');
    if (ok) ok.addEventListener('click', function () { decide('granted'); });
    if (no) no.addEventListener('click', function () { decide('denied'); });
  });
})();
