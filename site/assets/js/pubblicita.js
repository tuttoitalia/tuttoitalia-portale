/* Italians.ch — Pubblicità page: booking form -> confirmation + mailto. */
(function () {
  'use strict';
  var form = document.getElementById('book-form');
  if (!form) return;

  function val(id) { var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('book-error');
    var name = val('b-name'), email = val('b-email');
    if (!name) { err.textContent = 'Inserisci il nome o l\'azienda.'; return; }
    if (email.indexOf('@') === -1) { err.textContent = 'Inserisci un\'email valida.'; return; }
    err.textContent = '';

    var subject = 'Richiesta spazio pubblicitario — ' + name;
    var body = [
      'Nome / Azienda: ' + name,
      'Email: ' + email,
      'Tipo: ' + val('b-type'),
      'Formato: ' + val('b-format'),
      'Dal: ' + val('b-start'),
      'Budget: ' + val('b-budget'),
      '',
      val('b-msg')
    ].join('\n');
    var mailto = 'mailto:commerciale@italians.ch?subject=' + encodeURIComponent(subject) +
                 '&body=' + encodeURIComponent(body);

    form.hidden = true;
    var done = document.getElementById('book-done');
    done.hidden = false;
    var mail = document.getElementById('book-mail');
    if (mail) mail.href = mailto;
    if (window.TIAccount && window.TIAccount.toast) window.TIAccount.toast('Richiesta inviata ✦');
  });
})();
