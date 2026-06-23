/* ==========================================================================
   Tuttoitalia.ch — banner manager (gestione.html).
   CRUD over the ad config (via window.TIAds), live preview, export/import.
   Gated behind login (demo: any account; production: admin role).
   ========================================================================== */
(function () {
  'use strict';
  if (!window.TIAds) return;

  var SLOT_LABELS = {
    'home-top': 'Quotidiano · Leaderboard (alto)',
    'home-mid': 'Quotidiano · Rectangle (sidebar)',
    'home-footer': 'Quotidiano · Leaderboard (fondo)',
    'portale-top': 'Portale · Leaderboard',
    'portale-mid': 'Portale · Rectangle'
  };

  var gate = document.getElementById('gate-locked');
  var mgr = document.getElementById('mgr');
  var list = document.getElementById('ad-list');
  var count = document.getElementById('ad-count');
  var form = document.getElementById('ad-form');
  var seq = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function cfg() {
    var c = window.TIAds.load();
    // always work on a deep copy so edits are explicit
    return { version: c.version || 1, creatives: (c.creatives || []).map(function (x) { return Object.assign({}, x); }) };
  }
  function commit(c) { window.TIAds.save(c); if (window.TIAds.render) window.TIAds.render(); renderList(); }
  function toast(m) { if (window.TIAccount && window.TIAccount.toast) window.TIAccount.toast(m); }

  function field(id) { return document.getElementById(id); }
  function readForm() {
    return {
      id: field('f-id').value || ('c' + (Date.now()) + (seq++)),
      advertiser: field('f-advertiser').value.trim(),
      slot: field('f-slot').value,
      format: field('f-format').value,
      title: field('f-title').value.trim(),
      sub: field('f-sub').value.trim(),
      cta: field('f-cta').value.trim(),
      href: field('f-href').value.trim() || '#',
      bg: field('f-bg').value.trim() || 'linear-gradient(120deg,#0B5132,#073C25)',
      color: field('f-color').value.trim() || '#ffffff',
      start: field('f-start').value || '',
      end: field('f-end').value || '',
      active: field('f-active').checked
    };
  }
  function writeForm(c) {
    field('f-id').value = c.id || '';
    field('f-advertiser').value = c.advertiser || '';
    field('f-slot').value = c.slot || 'home-top';
    field('f-format').value = c.format || 'leaderboard';
    field('f-title').value = c.title || '';
    field('f-sub').value = c.sub || '';
    field('f-cta').value = c.cta || '';
    field('f-href').value = c.href && c.href !== '#' ? c.href : '';
    field('f-bg').value = c.bg || '';
    field('f-color').value = c.color || '#ffffff';
    field('f-start').value = c.start || '';
    field('f-end').value = c.end || '';
    field('f-active').checked = c.active !== false;
    document.getElementById('form-title').textContent = c.id ? 'Modifica banner' : 'Nuovo banner';
    updatePreview();
  }
  function clearForm() { writeForm({ format: 'leaderboard', bg: 'linear-gradient(120deg,#0B5132,#073C25)', color: '#ffffff', active: true }); }

  function bannerHTML(c) {
    return '<a class="adbanner" href="#" style="background:' + esc(c.bg) + ';color:' + esc(c.color) + '" onclick="return false">' +
      '<span class="adbanner__adv">' + esc(c.advertiser || 'Inserzionista') + '</span>' +
      '<span class="adbanner__title">' + esc(c.title || 'Titolo del banner') + '</span>' +
      (c.sub ? '<span class="adbanner__sub">' + esc(c.sub) + '</span>' : '') +
      (c.cta ? '<span class="adbanner__cta">' + esc(c.cta) + ' →</span>' : '') + '</a>';
  }
  function updatePreview() {
    var p = document.getElementById('f-preview');
    var c = readForm();
    p.setAttribute('data-format', c.format);
    p.innerHTML = bannerHTML(c);
  }

  function renderList() {
    var c = cfg();
    count.textContent = '(' + c.creatives.length + ')';
    if (!c.creatives.length) { list.innerHTML = '<p style="color:var(--gray)">Nessun banner. Creane uno nuovo.</p>'; return; }
    list.innerHTML = c.creatives.map(function (x) {
      return '<div class="adrow">' +
        '<div class="adrow__sw" style="background:' + esc(x.bg) + '"></div>' +
        '<div class="adrow__meta"><b>' + esc(x.advertiser || '—') + '</b>' +
          '<span>' + esc(SLOT_LABELS[x.slot] || x.slot) + ' · ' + esc(x.format) +
          (x.start || x.end ? ' · ' + esc(x.start || '…') + '→' + esc(x.end || '…') : '') + '</span></div>' +
        '<div class="adrow__actions">' +
          '<span class="chip ' + (x.active === false ? 'chip--off' : 'chip--on') + '">' + (x.active === false ? 'off' : 'attivo') + '</span>' +
          '<button class="btn btn--ghost btn--sm" data-edit="' + esc(x.id) + '" type="button">Modifica</button>' +
          '<button class="btn btn--ghost btn--sm" data-del="' + esc(x.id) + '" type="button">Elimina</button>' +
        '</div></div>';
    }).join('');
  }

  // ---- Events ----
  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('f-error');
    var data = readForm();
    if (!data.advertiser) { err.textContent = 'Inserisci il nome dell\'inserzionista.'; return; }
    if (!data.title) { err.textContent = 'Inserisci un titolo.'; return; }
    err.textContent = '';
    var c = cfg();
    var i = c.creatives.findIndex(function (x) { return x.id === data.id; });
    if (i >= 0) c.creatives[i] = data; else c.creatives.push(data);
    commit(c);
    clearForm();
    toast('Banner salvato ✦');
  });
  document.getElementById('f-cancel').addEventListener('click', clearForm);
  document.getElementById('btn-new').addEventListener('click', function () { clearForm(); field('f-advertiser').focus(); });

  list.addEventListener('click', function (e) {
    var ed = e.target.closest('[data-edit]'); var del = e.target.closest('[data-del]');
    if (ed) {
      var c = cfg(); var x = c.creatives.find(function (k) { return k.id === ed.getAttribute('data-edit'); });
      if (x) { writeForm(x); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    }
    if (del) {
      var c2 = cfg();
      c2.creatives = c2.creatives.filter(function (k) { return k.id !== del.getAttribute('data-del'); });
      commit(c2); toast('Banner eliminato');
    }
  });

  document.getElementById('btn-export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(cfg(), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'tuttoitalia-ads.json';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Configurazione esportata');
  });
  document.getElementById('file-import').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var c = JSON.parse(r.result);
        if (!c || !Array.isArray(c.creatives)) throw new Error('formato');
        commit(c); toast('Configurazione importata ✦');
      } catch (x) { toast('File non valido'); }
    };
    r.readAsText(f);
    e.target.value = '';
  });
  document.getElementById('btn-reset').addEventListener('click', function () {
    window.TIAds.reset(); if (window.TIAds.render) window.TIAds.render(); renderList(); clearForm();
    toast('Ripristinati i banner predefiniti');
  });

  // ---- Gate (poll login state) ----
  var rendered = false;
  function refresh() {
    var user = window.TIAccount && window.TIAccount.user && window.TIAccount.user();
    if (gate) gate.hidden = !!user;
    if (mgr) mgr.hidden = !user;
    if (user && !rendered) { rendered = true; renderList(); clearForm(); }
    if (!user) rendered = false;
  }
  refresh();
  setInterval(refresh, 600);
})();
