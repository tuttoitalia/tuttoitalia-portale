/* ==========================================================================
   redazione.js — Portale redazione Italians.ch (area riservata giornalisti).
   Frontend statico; il backend è n8n (work.tuttoitalia.ch) che tiene il token
   Webflow lato server. Contratto webhook:
     POST {N8N}/redazione-login {user,pass}        -> {ok, token, name} | {ok:false,error}
     POST {N8N}/redazione-get   {token, id}        -> {ok, item:{name,subtitle,body}} (LIVE da Webflow)
     POST {N8N}/redazione-save  {token, id, name, subtitle, body} -> {ok} (PATCH + publish Webflow)
   La lista articoli viene dai dati statici del sito (./data/index.<lang>.json).
   ========================================================================== */
(function () {
  var N8N = 'https://work.tuttoitalia.ch/webhook';   // base webhook n8n (cambia qui se serve)
  var LANG = 'it';

  var user = sessionStorage.getItem('red_user');
  var pass = sessionStorage.getItem('red_pass');
  var uname = sessionStorage.getItem('red_name');
  var listData = [], current = null;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { var d = document.createElement('div'); d.textContent = (s == null ? '' : s); return d.innerHTML; }

  function api(path, body) {
    return fetch(N8N + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Risposta non valida dal backend.' }; }); });
  }

  /* ---- login ---- */
  $('login-btn').addEventListener('click', doLogin);
  $('r-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  function doLogin() {
    var u = $('r-user').value.trim(), p = $('r-pass').value;
    $('login-error').textContent = '';
    if (!u || !p) { $('login-error').textContent = 'Inserisci utente e password.'; return; }
    $('login-btn').disabled = true; $('login-btn').textContent = 'Accesso…';
    api('/redazione-login', { user: u, pass: p }).then(function (res) {
      $('login-btn').disabled = false; $('login-btn').textContent = 'Accedi';
      if (res && res.ok) {
        user = u; pass = p; uname = res.name || u;
        sessionStorage.setItem('red_user', user); sessionStorage.setItem('red_pass', pass); sessionStorage.setItem('red_name', uname);
        enter();
      } else { $('login-error').textContent = (res && res.error) || 'Credenziali non valide.'; }
    }).catch(function () {
      $('login-btn').disabled = false; $('login-btn').textContent = 'Accedi';
      $('login-error').textContent = 'Backend non raggiungibile (n8n non ancora configurato?).';
    });
  }

  $('logout').addEventListener('click', function () {
    sessionStorage.removeItem('red_user'); sessionStorage.removeItem('red_pass'); sessionStorage.removeItem('red_name'); location.reload();
  });

  function enter() {
    $('login-view').hidden = true; $('editor-view').hidden = false;
    $('logout').hidden = false; $('who').textContent = uname ? (uname + ' · ') : '';
    loadList();
  }

  /* ---- lista (dai dati statici) ---- */
  function loadList() {
    fetch('./data/index.' + LANG + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (arr) { listData = (arr || []).filter(function (a) { return a.id; }); renderList(''); })
      .catch(function () { $('r-list').innerHTML = '<p style="color:var(--gray)">Impossibile caricare la lista.</p>'; });
  }
  function renderList(q) {
    q = (q || '').toLowerCase();
    var items = listData.filter(function (a) { return !q || (a.title || '').toLowerCase().indexOf(q) >= 0; }).slice(0, 100);
    $('r-list').innerHTML = items.map(function (a) {
      return '<button class="red-item" type="button" data-id="' + esc(a.id) + '" data-slug="' + esc(a.slug) + '">' +
        '<span class="red-item__t">' + esc(a.title) + '</span>' +
        '<span class="red-item__m">' + esc(a.category || '') + '</span></button>';
    }).join('') || '<p style="color:var(--gray)">Nessun risultato.</p>';
  }
  $('r-search').addEventListener('input', function () { renderList(this.value); });
  $('r-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'); if (b) openItem(b.getAttribute('data-id'), b.getAttribute('data-slug'));
  });

  /* ---- apri + modifica ---- */
  function openItem(id, slug) {
    current = { id: id, slug: slug };
    $('r-empty').hidden = true; $('r-form').hidden = false;
    $('save-msg').style.color = 'var(--gray)'; $('save-msg').textContent = 'Caricamento articolo…';
    [].forEach.call(document.querySelectorAll('.red-item'), function (b) { b.classList.toggle('is-on', b.getAttribute('data-id') === id); });
    api('/redazione-get', { user: user, pass: pass, id: id }).then(function (res) {
      if (res && res.ok && res.item) { fill(res.item); $('save-msg').textContent = ''; }
      else throw 0;
    }).catch(function () {
      // fallback: anteprima dai dati sincronizzati (sola lettura finché n8n non risponde)
      fetch('./data/a/' + encodeURIComponent(slug) + '.json').then(function (r) { return r.json(); }).then(function (a) {
        fill({ name: a.title, subtitle: a.subtitle, body: a.body });
        $('save-msg').textContent = 'Anteprima dai dati sincronizzati. Il salvataggio richiede n8n attivo.';
      }).catch(function () { $('save-msg').textContent = 'Impossibile caricare l’articolo.'; });
    });
  }
  function fill(it) {
    $('f-title').value = it.name || it.title || '';
    $('f-sub').value = it.subtitle || it['brief-summary'] || '';
    $('f-body').innerHTML = it.body || it['article-body'] || '';
  }
  $('cancel-btn').addEventListener('click', function () {
    $('r-form').hidden = true; $('r-empty').hidden = false; current = null;
    [].forEach.call(document.querySelectorAll('.red-item.is-on'), function (b) { b.classList.remove('is-on'); });
  });

  /* ---- salva ---- */
  $('save-btn').addEventListener('click', function () {
    if (!current) return;
    $('save-msg').style.color = 'var(--gray)'; $('save-msg').textContent = 'Salvataggio…'; $('save-btn').disabled = true;
    api('/redazione-save', {
      user: user, pass: pass, id: current.id,
      name: $('f-title').value, subtitle: $('f-sub').value, body: $('f-body').innerHTML
    }).then(function (res) {
      $('save-btn').disabled = false;
      if (res && res.ok) { $('save-msg').style.color = 'var(--italy-green)'; $('save-msg').textContent = '✓ Salvato e pubblicato su Webflow.'; }
      else { $('save-msg').style.color = 'var(--red)'; $('save-msg').textContent = (res && res.error) || 'Errore nel salvataggio.'; }
    }).catch(function () {
      $('save-btn').disabled = false; $('save-msg').style.color = 'var(--red)';
      $('save-msg').textContent = 'Backend non raggiungibile (n8n).';
    });
  });

  /* ---- start ---- */
  if (user && pass) enter();
})();
