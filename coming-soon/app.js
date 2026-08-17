/* Italians.ch teaser — invio email lista di lancio a signup.php su Hostpoint. */
(function () {
  'use strict';
  var form = document.getElementById('sub');
  if (!form) return;
  var input = document.getElementById('em');
  var err = document.getElementById('err');
  var msg = document.getElementById('msg');
  var btn = form.querySelector('button');
  var ENDPOINT = 'https://media.italians.ch/signup.php';

  function valid(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.style.display = 'none';
    var email = (input.value || '').trim();
    if (!valid(email)) { err.style.display = 'block'; input.focus(); return; }
    btn.disabled = true; btn.textContent = 'Invio…';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) {
          form.style.display = 'none';
          err.style.display = 'none';
          msg.style.display = 'block';
        } else {
          btn.disabled = false; btn.textContent = 'Avvisami';
          err.textContent = 'Qualcosa è andato storto. Riprova tra poco.';
          err.style.display = 'block';
        }
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Avvisami';
        err.textContent = 'Connessione non riuscita. Riprova.';
        err.style.display = 'block';
      });
  });
})();
