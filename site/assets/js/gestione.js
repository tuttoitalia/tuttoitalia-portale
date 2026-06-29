/* ==========================================================================
   Italians.ch — banner manager (gestione.html).
   Admin-gated (n8n login, shared with the redazione editor). Manages the
   shared ad config stored in n8n; creatives can be image, video or text.
   Media (image + video) is uploaded to Webflow assets via the proven
   /redazione-upload pipeline and served from the Webflow CDN (instant).
   ========================================================================== */
(function () {
  'use strict';

  var BASE = 'https://work.tuttoitalia.ch/webhook';
  var SLOT_LABELS = {
    'fullscreen-1': 'Full-screen', 'rail-right': 'Skyscraper destro', 'wallpaper': 'Wallpaper',
    'home-top': 'Home · Leaderboard alto', 'home-mid': 'Home · Rectangle', 'home-footer': 'Home · Leaderboard fondo',
    'portale-top': 'Portale · Leaderboard', 'portale-mid': 'Portale · Rectangle'
  };
  var TYPE_LABELS = { image: 'Immagine', video: 'Video', text: 'Testo' };

  var $ = function (id) { return document.getElementById(id); };
  var state = { cfg: { version: 2, creatives: [] }, media: '', poster: '', seq: 0 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function creds() {
    try { return { user: sessionStorage.getItem('red_user') || '', pass: sessionStorage.getItem('red_pass') || '' }; }
    catch (e) { return { user: '', pass: '' }; }
  }
  function setCreds(u, p, name) {
    try { sessionStorage.setItem('red_user', u); sessionStorage.setItem('red_pass', p); if (name) sessionStorage.setItem('red_name', name); } catch (e) {}
  }
  function clearCreds() { try { ['red_user', 'red_pass', 'red_name'].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {} }

  function apiPost(path, body) {
    return fetch(BASE + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function apiGet(path) {
    return fetch(BASE + '/' + path, { method: 'GET', cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  // ---- File → md5 + base64, upload to Webflow via redazione-upload ----------
  function safeName(n) { return String(n || 'file').replace(/[^\w.\-]+/g, '_').slice(-60); }
  function fileToParts(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onerror = function () { rej(new Error('Lettura file fallita')); };
      r.onload = function () {
        var bytes = new Uint8Array(r.result), bin = '', CH = 0x8000;
        for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
        res({ bin: bin, b64: btoa(bin) });
      };
      r.readAsArrayBuffer(file);
    });
  }
  // Ad creatives are uploaded straight to the Hostpoint media server
  // (media.italians.ch/ads/) via upload.php — no Webflow dependency.
  var UPLOAD = 'https://media.italians.ch/upload.php';
  function uploadFile(file, name) {
    var fd = new FormData();
    fd.append('user', creds().user);
    fd.append('pass', creds().pass);
    fd.append('file', file, name || file.name);
    return fetch(UPLOAD, { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !j.url) throw new Error((j && j.error) || 'Upload fallito');
        return j.url;
      });
  }
  // Grab the first frame of a video as a JPEG blob (instant poster).
  function posterFromVideo(file) {
    return new Promise(function (res) {
      var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
      var url = URL.createObjectURL(file), done = false;
      function fin(b) { if (done) return; done = true; try { URL.revokeObjectURL(url); } catch (e) {} res(b || null); }
      v.onloadeddata = function () { try { v.currentTime = Math.min(0.1, (v.duration || 1) * 0.1); } catch (e) { fin(null); } };
      v.onseeked = function () {
        try {
          var c = document.createElement('canvas'); c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          c.toBlob(function (b) { fin(b); }, 'image/jpeg', 0.82);
        } catch (e) { fin(null); }
      };
      v.onerror = function () { fin(null); };
      setTimeout(function () { fin(null); }, 8000);
      v.src = url;
    });
  }

  // ---- UI helpers ----------------------------------------------------------
  function curType() { return $('f-type').value; }
  function applyType() {
    var t = curType();
    document.querySelectorAll('[data-when]').forEach(function (el) {
      el.style.display = el.getAttribute('data-when').split(' ').indexOf(t) >= 0 ? '' : 'none';
    });
    var lab = $('f-title').previousElementSibling || document.querySelector('label[for="f-title"]');
    lab = document.querySelector('label[for="f-title"]');
    if (lab) { var k = lab.getAttribute('data-label-' + t); if (k) lab.textContent = k; }
  }
  function setThumb(box, url, isVideo) {
    if (!url) { box.innerHTML = '<span>Nessun file</span>'; return; }
    box.innerHTML = isVideo
      ? '<video src="' + esc(url) + '" muted autoplay loop playsinline></video>'
      : '<img src="' + esc(url) + '" alt="">';
  }
  function hint(msg, kind) { var h = $('media-hint'); h.textContent = msg || ''; h.className = 'adm-hint' + (kind ? ' adm-hint--' + kind : ''); }

  // ---- Form read / write ---------------------------------------------------
  function readForm() {
    var t = curType();
    var c = {
      id: $('f-id').value || ('c' + Date.now() + (state.seq++)),
      slot: $('f-slot').value, type: t,
      advertiser: $('f-advertiser').value.trim(),
      title: $('f-title').value.trim(),
      href: $('f-href').value.trim() || '#',
      start: $('f-start').value || '', end: $('f-end').value || '',
      active: $('f-active').checked
    };
    if (t === 'image' || t === 'video') { c.media = state.media || $('f-media').value.trim(); if (t === 'video') c.poster = state.poster || ''; }
    if (t === 'text') {
      c.sub = $('f-sub').value.trim(); c.cta = $('f-cta').value.trim();
      c.bg = $('f-bg').value.trim() || 'linear-gradient(120deg,#0B5132,#073C25)';
      c.color = $('f-color').value.trim() || '#ffffff';
    }
    return c;
  }
  function writeForm(c) {
    c = c || {};
    $('f-id').value = c.id || '';
    $('f-slot').value = c.slot || 'fullscreen-1';
    $('f-type').value = c.type || 'image';
    $('f-advertiser').value = c.advertiser || '';
    $('f-title').value = c.title || '';
    $('f-href').value = c.href && c.href !== '#' ? c.href : '';
    $('f-start').value = c.start || ''; $('f-end').value = c.end || '';
    $('f-active').checked = c.active !== false;
    $('f-sub').value = c.sub || ''; $('f-cta').value = c.cta || '';
    $('f-bg').value = c.bg || ''; $('f-color').value = c.color || '#ffffff';
    $('f-media').value = (c.type === 'video' && c.media) ? c.media : '';
    state.media = c.media || ''; state.poster = c.poster || '';
    setThumb($('media-thumb'), c.media || '', c.type === 'video');
    setThumb($('poster-thumb'), c.poster || '', false);
    hint('');
    $('form-title').textContent = c.id ? 'Modifica banner' : 'Nuovo banner';
    $('f-error').textContent = '';
    applyType();
  }
  function clearForm() { writeForm({ type: 'image', slot: 'fullscreen-1', active: true, color: '#ffffff' }); }

  // ---- List ----------------------------------------------------------------
  function renderList() {
    var list = $('ad-list'), cs = state.cfg.creatives || [];
    $('ad-count').textContent = '(' + cs.length + ')';
    if (!cs.length) { list.innerHTML = '<p class="adm-muted">Nessun banner. Creane uno nuovo.</p>'; return; }
    list.innerHTML = cs.map(function (x) {
      var media = (x.type === 'video' || x.type === 'image') ? (x.poster || x.media) : '';
      var sw = media ? '<div class="adm-row__sw" style="background-image:url(' + esc(media) + ')"></div>'
        : '<div class="adm-row__sw" style="background:' + esc(x.bg || '#ddd') + '"></div>';
      return '<div class="adm-row">' + sw +
        '<div class="adm-row__meta"><b>' + esc(x.advertiser || x.title || '—') + '</b>' +
        '<span>' + esc(SLOT_LABELS[x.slot] || x.slot) + ' · ' + esc(TYPE_LABELS[x.type] || x.type) +
        (x.start || x.end ? ' · ' + esc(x.start || '…') + '→' + esc(x.end || '…') : '') + '</span></div>' +
        '<div class="adm-row__act">' +
        '<span class="adm-chip ' + (x.active === false ? 'is-off' : 'is-on') + '">' + (x.active === false ? 'off' : 'attivo') + '</span>' +
        '<button class="btn btn--ghost btn--sm" data-edit="' + esc(x.id) + '" type="button">Modifica</button>' +
        '<button class="btn btn--ghost btn--sm" data-del="' + esc(x.id) + '" type="button">Elimina</button>' +
        '</div></div>';
    }).join('');
  }

  // ---- Config load / save --------------------------------------------------
  function status(msg) { var s = $('adm-status'); if (s) s.textContent = msg || ''; }
  function loadConfig() {
    status('Carico…');
    return apiGet('ads-config').then(function (j) {
      if (j && j.ok && j.config && Array.isArray(j.config.creatives)) state.cfg = j.config;
      else state.cfg = { version: 2, creatives: [] };
      renderList(); status('');
    }).catch(function () { status('Connessione n8n non riuscita.'); });
  }
  function saveConfig() {
    return apiPost('ads-save', { user: creds().user, pass: creds().pass, config: state.cfg }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'Salvataggio fallito');
      try { if (window.TIAds) { window.TIAds.save(state.cfg); if (window.TIAds.render) window.TIAds.render(); } } catch (e) {}
      status('Salvato ✓ ' + new Date().toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit' }));
      return true;
    });
  }

  // ---- Wiring --------------------------------------------------------------
  function wire() {
    $('f-type').addEventListener('change', applyType);

    // image upload
    $('file-image').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      hint('Carico l\'immagine…'); $('f-save').disabled = true;
      uploadFile(f).then(function (url) {
        state.media = url; setThumb($('media-thumb'), url, false); hint('Immagine caricata ✓', 'ok');
      }).catch(function (err) { hint(err.message || 'Errore upload', 'err'); })
        .then(function () { $('f-save').disabled = false; e.target.value = ''; });
    });

    // video upload (+ auto poster)
    $('file-video').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      if (f.size > 25 * 1024 * 1024) { hint('Video troppo pesante (max 25 MB). Comprimilo per una riproduzione istantanea.', 'err'); e.target.value = ''; return; }
      hint('Carico il video…'); $('f-save').disabled = true;
      var posterBlob = null;
      posterFromVideo(f).then(function (b) { posterBlob = b; })
        .then(function () { return uploadFile(f); })
        .then(function (url) {
          state.media = url; $('f-media').value = url; setThumb($('media-thumb'), url, true); hint('Video caricato ✓', 'ok');
          if (posterBlob && !state.poster) {
            return uploadFile(new File([posterBlob], 'poster.jpg', { type: 'image/jpeg' }), 'poster.jpg')
              .then(function (purl) { state.poster = purl; setThumb($('poster-thumb'), purl, false); })
              .catch(function () {});
          }
        })
        .catch(function (err) { hint(err.message || 'Errore upload', 'err'); })
        .then(function () { $('f-save').disabled = false; e.target.value = ''; });
    });

    // explicit poster upload
    $('file-poster').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      $('f-save').disabled = true;
      uploadFile(f).then(function (url) { state.poster = url; setThumb($('poster-thumb'), url, false); })
        .catch(function (err) { hint(err.message || 'Errore poster', 'err'); })
        .then(function () { $('f-save').disabled = false; e.target.value = ''; });
    });

    // URL pasted for video
    $('f-media').addEventListener('change', function () {
      var u = $('f-media').value.trim(); if (u) { state.media = u; setThumb($('media-thumb'), u, true); }
    });

    // save
    $('ad-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('f-error'); var data = readForm();
      if (!data.advertiser) { err.textContent = 'Inserisci il nome dell\'inserzionista.'; return; }
      if ((data.type === 'image' || data.type === 'video') && !data.media) { err.textContent = 'Carica una creatività (o incolla un URL video).'; return; }
      if (data.type === 'text' && !data.title) { err.textContent = 'Inserisci un titolo.'; return; }
      err.textContent = '';
      var cs = state.cfg.creatives, i = cs.findIndex(function (x) { return x.id === data.id; });
      if (i >= 0) cs[i] = data; else cs.push(data);
      $('f-save').disabled = true;
      saveConfig().then(function () { renderList(); clearForm(); })
        .catch(function (ex) { err.textContent = ex.message || 'Errore di salvataggio'; })
        .then(function () { $('f-save').disabled = false; });
    });

    $('f-cancel').addEventListener('click', clearForm);
    $('btn-new').addEventListener('click', function () { clearForm(); $('f-advertiser').focus(); });
    $('btn-reload').addEventListener('click', loadConfig);

    $('ad-list').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (ed) {
        var x = state.cfg.creatives.find(function (k) { return k.id === ed.getAttribute('data-edit'); });
        if (x) { writeForm(JSON.parse(JSON.stringify(x))); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      }
      if (del) {
        if (!confirm('Eliminare questo banner?')) return;
        state.cfg.creatives = state.cfg.creatives.filter(function (k) { return k.id !== del.getAttribute('data-del'); });
        saveConfig().then(renderList);
      }
    });
  }

  // ---- Auth gate -----------------------------------------------------------
  function showManager() {
    $('gate').hidden = true; $('mgr').hidden = false;
    $('adm-logout').hidden = false;
    $('adm-who').textContent = (sessionStorage.getItem('red_name') || creds().user) + ' · ';
    clearForm(); loadConfig();
  }
  function initAuth() {
    $('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = $('lg-user').value.trim(), p = $('lg-pass').value, err = $('lg-err');
      err.textContent = ''; if (!u || !p) { err.textContent = 'Inserisci utente e password.'; return; }
      apiPost('redazione-login', { user: u, pass: p }).then(function (j) {
        if (j && j.ok) { setCreds(u, p, j.name); showManager(); }
        else { err.textContent = (j && j.error) || 'Credenziali non valide.'; }
      }).catch(function () { err.textContent = 'Connessione non riuscita.'; });
    });
    $('adm-logout').addEventListener('click', function () { clearCreds(); location.reload(); });

    // auto-resume an existing session
    var c = creds();
    if (c.user && c.pass) {
      apiPost('redazione-login', { user: c.user, pass: c.pass }).then(function (j) {
        if (j && j.ok) showManager();
      }).catch(function () {});
    }
  }

  function boot() { wire(); initAuth(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
