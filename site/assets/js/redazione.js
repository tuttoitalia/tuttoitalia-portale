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
  var listData = [], current = null, OV = {}, newThumb = null, newMain = null;
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
    fetch('https://work.tuttoitalia.ch/webhook/redazione-overrides', { cache: 'no-store' })
      .then(function (r) { return r.json(); }).then(function (j) { OV = (j && j.overrides) || {}; }).catch(function () {});
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
    var _it = null, _k; for (_k = 0; _k < listData.length; _k++) { if (listData[_k].id === id) { _it = listData[_k]; break; } }
    current = { id: id, slug: slug, versions: (_it && _it.versions) || {} };
    $('r-empty').hidden = true; $('r-form').hidden = false;
    [].forEach.call(document.querySelectorAll('.red-item'), function (b) { b.classList.toggle('is-on', b.getAttribute('data-id') === id); });
    if ($('revert-btn')) $('revert-btn').hidden = !OV[slug];
    if (OV[slug]) {
      fill(OV[slug]);
      if ($('f-also-tutto')) $('f-also-tutto').checked = false;
      $('save-msg').style.color = 'var(--gray)'; $('save-msg').textContent = 'Versione SOLO Italians.ch (modifica locale).';
      return;
    }
    if ($('f-also-tutto')) $('f-also-tutto').checked = true;
    $('save-msg').style.color = 'var(--gray)'; $('save-msg').textContent = 'Caricamento articolo…';
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
    autoGrow($('f-sub'));
    newThumb = null; newMain = null;
    setPhoto('ph-thumb', it.thumb || it.image || '');
    setPhoto('ph-main', it.image || it.thumb || '');
    if ($('photo-msg')) { $('photo-msg').style.color = 'var(--gray)'; $('photo-msg').textContent = ''; }
  }
  function autoGrow(el) { if (!el) return; el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
  // tutte le versioni linguistiche dell'articolo (per propagare la foto)
  function versionSlugs() {
    var vs = (current && current.slug) ? [current.slug] : [], v = (current && current.versions) || {}, k;
    for (k in v) { if (v[k] && vs.indexOf(v[k]) < 0) vs.push(v[k]); }
    return vs;
  }
  $('cancel-btn').addEventListener('click', function () {
    $('r-form').hidden = true; $('r-empty').hidden = false; current = null;
    if ($('revert-btn')) $('revert-btn').hidden = true;
    [].forEach.call(document.querySelectorAll('.red-item.is-on'), function (b) { b.classList.remove('is-on'); });
  });
  if ($('revert-btn')) $('revert-btn').addEventListener('click', function () {
    if (!current) return;
    $('save-msg').style.color = 'var(--gray)'; $('save-msg').textContent = 'Ripristino versione condivisa…';
    api('/redazione-save', { user: user, pass: pass, slug: current.slug, local: true, del: true, versions: versionSlugs() }).then(function (res) {
      if (res && res.ok) { delete OV[current.slug]; openItem(current.id, current.slug); }
      else { $('save-msg').style.color = 'var(--red)'; $('save-msg').textContent = (res && res.error) || 'Errore.'; }
    }).catch(function () { $('save-msg').style.color = 'var(--red)'; $('save-msg').textContent = 'Backend non raggiungibile.'; });
  });

  /* ---- salva ---- */
  $('save-btn').addEventListener('click', function () {
    if (!current) return;
    var alsoWebflow = !$('f-also-tutto') || $('f-also-tutto').checked;
    $('save-msg').style.color = 'var(--gray)'; $('save-msg').textContent = 'Salvataggio…'; $('save-btn').disabled = true;
    var payload = {
      user: user, pass: pass, id: current.id, slug: current.slug, local: !alsoWebflow,
      name: $('f-title').value, subtitle: $('f-sub').value, body: $('f-body').innerHTML
    };
    if (newThumb) { payload.thumbId = newThumb.id; payload.thumbUrl = newThumb.url; }
    if (newMain) { payload.mainId = newMain.id; payload.imageUrl = newMain.url; }
    // override solo-Italians.ch + foto cambiata => applica la foto a tutte le lingue
    if (payload.local && (newThumb || newMain)) payload.versions = versionSlugs();
    api('/redazione-save', payload).then(function (res) {
      $('save-btn').disabled = false;
      if (res && res.ok) {
        if (res.scope === 'italians') OV[current.slug] = { name: $('f-title').value, subtitle: $('f-sub').value, body: $('f-body').innerHTML };
        $('save-msg').style.color = 'var(--italy-green)';
        var photoNote = (payload.versions && (newThumb || newMain)) ? ' Foto applicata a tutte le lingue.' : '';
        $('save-msg').textContent = (res.scope === 'italians' ? '✓ Salvato solo su Italians.ch.' : '✓ Salvato (Italians.ch + tuttoitalia.ch).') + photoNote;
      }
      else { $('save-msg').style.color = 'var(--red)'; $('save-msg').textContent = (res && res.error) || 'Errore nel salvataggio.'; }
    }).catch(function () {
      $('save-btn').disabled = false; $('save-msg').style.color = 'var(--red)';
      $('save-msg').textContent = 'Backend non raggiungibile (n8n).';
    });
  });

  /* ---- sottotitolo: cresce in altezza ---- */
  if ($('f-sub')) $('f-sub').addEventListener('input', function () { autoGrow(this); });

  /* ---- barra rich text sul corpo articolo ---- */
  [].forEach.call(document.querySelectorAll('.rte-toolbar button'), function (btn) {
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); }); // non perdere la selezione
    btn.addEventListener('click', function () {
      var cmd = btn.getAttribute('data-cmd');
      if (cmd === 'createLink') {
        var url = prompt('Indirizzo del link (URL):', 'https://');
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.getAttribute('data-val'));
      } else {
        document.execCommand(cmd, false, null);
      }
      $('f-body').focus();
    });
  });

  /* ---- foto: anteprima + upload su Webflow ---- */
  function setPhoto(elId, url) { var el = $(elId); if (el) el.style.backgroundImage = url ? ('url("' + url + '")') : ''; }
  function wirePhoto(inputId, previewId, which) {
    var inp = $(inputId); if (!inp) return;
    inp.addEventListener('change', function () {
      var file = inp.files && inp.files[0]; if (!file) return;
      if (file.size > 11 * 1024 * 1024) { $('photo-msg').style.color = 'var(--red)'; $('photo-msg').textContent = 'Foto troppo grande (max ~11 MB).'; inp.value = ''; return; }
      $('photo-msg').style.color = 'var(--gray)'; $('photo-msg').textContent = 'Caricamento foto…';
      var reader = new FileReader();
      reader.onload = function () {
        var bytes = new Uint8Array(reader.result), bin = '', CH = 0x8000, i;
        for (i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
        var hash = md5(bin), b64 = btoa(bin);
        api('/redazione-upload', { user: user, pass: pass, fileName: file.name, fileHash: hash, data: b64 }).then(function (res) {
          if (res && res.ok && res.url) {
            setPhoto(previewId, res.url);
            if (which === 'thumb') newThumb = { id: res.id, url: res.url }; else newMain = { id: res.id, url: res.url };
            $('photo-msg').style.color = 'var(--italy-green)'; $('photo-msg').textContent = '✓ Foto caricata — salva per applicarla.';
          } else { $('photo-msg').style.color = 'var(--red)'; $('photo-msg').textContent = (res && res.error) || 'Errore upload foto.'; }
        }).catch(function () { $('photo-msg').style.color = 'var(--red)'; $('photo-msg').textContent = 'Backend non raggiungibile (n8n).'; });
      };
      reader.readAsArrayBuffer(file);
    });
  }
  wirePhoto('file-thumb', 'ph-thumb', 'thumb');
  wirePhoto('file-main', 'ph-main', 'main');

  /* ---- start ---- */
  if (user && pass) enter();
})();
