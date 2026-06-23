/* ==========================================================================
   Tuttoitalia.ch — account, auth modal, content gating, toast.
   Shared by index.html and portale.html. Client-side only (localStorage):
   a real backend would replace storeUser()/findUser(). Progressive: the page
   is fully readable without this script; it only adds account features.
   ========================================================================== */
(function () {
  'use strict';

  var KEY_USERS = 'ti_users';
  var KEY_SESSION = 'ti_session';

  function read(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch (e) { return fallback; }
  }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function currentUser() { return read(KEY_SESSION, null); }

  /* ---- Toast --------------------------------------------------------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  /* ---- Auth modal ---------------------------------------------------- */
  var modal = document.getElementById('auth');
  var pendingIntent = null;   // action to run after successful auth

  var els = modal ? {
    title:  modal.querySelector('#auth-title'),
    name:   modal.querySelector('#auth-name'),
    nameRow:modal.querySelector('#auth-name-row'),
    email:  modal.querySelector('#auth-email'),
    pass:   modal.querySelector('#auth-pass'),
    error:  modal.querySelector('#auth-error'),
    submit: modal.querySelector('#auth-submit'),
    switchTxt: modal.querySelector('#auth-switch-text'),
    switchBtn: modal.querySelector('#auth-switch-btn')
  } : {};

  var mode = 'register';

  function setMode(m) {
    mode = m;
    if (!modal) return;
    if (m === 'register') {
      els.title.textContent = 'Crea il tuo account';
      els.nameRow.hidden = false;
      els.submit.textContent = 'Registrati gratis';
      els.switchTxt.textContent = 'Hai già un account?';
      els.switchBtn.textContent = 'Accedi';
    } else {
      els.title.textContent = 'Bentornato';
      els.nameRow.hidden = true;
      els.submit.textContent = 'Accedi';
      els.switchTxt.textContent = 'Non hai un account?';
      els.switchBtn.textContent = 'Registrati';
    }
    els.error.textContent = '';
  }

  function openAuth(m, intentMsg) {
    if (!modal) { location.href = 'portale.html'; return; }
    setMode(m || 'register');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    (els.nameRow.hidden ? els.email : els.name).focus();
  }
  function closeAuth() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    pendingIntent = null;
  }

  function submitAuth(e) {
    if (e) e.preventDefault();
    var name = (els.name.value || '').trim();
    var email = (els.email.value || '').trim().toLowerCase();
    var pass = els.pass.value || '';
    if (email.indexOf('@') === -1) { els.error.textContent = 'Inserisci un indirizzo email valido.'; return; }
    if (pass.length < 6) { els.error.textContent = 'La password deve avere almeno 6 caratteri.'; return; }

    var users = read(KEY_USERS, {});
    if (mode === 'register') {
      if (!name) { els.error.textContent = 'Inserisci il tuo nome.'; return; }
      if (users[email]) { els.error.textContent = 'Esiste già un account con questa email. Accedi.'; return; }
      users[email] = { name: name, email: email, pass: pass };
      write(KEY_USERS, users);
      login({ name: name, email: email }, 'Benvenuto in Tuttoitalia, ' + name.split(' ')[0] + '! ✦');
    } else {
      var u = users[email];
      if (!u || u.pass !== pass) { els.error.textContent = 'Email o password non corretti.'; return; }
      login({ name: u.name, email: u.email }, 'Bentornato, ' + u.name.split(' ')[0] + '!');
    }
  }

  function login(user, msg) {
    write(KEY_SESSION, user);
    closeAuth();
    reflectAuthState();
    toast(msg || 'Accesso effettuato.');
    var intent = pendingIntent; pendingIntent = null;
    if (typeof intent === 'function') intent();
  }

  function logout() {
    localStorage.removeItem(KEY_SESSION);
    reflectAuthState();
    toast('Hai effettuato il logout.');
  }

  /* ---- Reflect login state in the UI --------------------------------- */
  function reflectAuthState() {
    var user = currentUser();
    // utility-bar account slot
    document.querySelectorAll('[data-acct-slot]').forEach(function (slot) {
      if (user) {
        var initials = user.name.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
        slot.innerHTML = '<span class="acct-chip"><span class="acct-chip__avatar">' + initials +
          '</span><button class="utility__link" data-logout type="button">Esci</button></span>';
      } else {
        slot.innerHTML = '<button class="utility__link" data-auth="login" type="button">Accedi</button>';
      }
    });
    // reveal gated/locked content
    document.querySelectorAll('.locked').forEach(function (box) {
      box.classList.toggle('is-unlocked', !!user);
      var veil = box.querySelector('.locked__veil');
      if (veil) veil.style.display = user ? 'none' : '';
    });
    // toggle [data-when-auth] / [data-when-guest]
    document.querySelectorAll('[data-when-auth]').forEach(function (el) { el.hidden = !user; });
    document.querySelectorAll('[data-when-guest]').forEach(function (el) { el.hidden = !!user; });
  }

  /* ---- Wire global click handlers ------------------------------------ */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-auth],[data-logout],[data-gate]');
    if (!t) return;

    if (t.hasAttribute('data-logout')) { logout(); return; }

    if (t.hasAttribute('data-auth')) {
      openAuth(t.getAttribute('data-auth') || 'register');
      return;
    }
    if (t.hasAttribute('data-gate')) {
      var msg = t.getAttribute('data-gate-msg') || 'Accedi o registrati per continuare.';
      if (currentUser()) {
        toast(t.getAttribute('data-done-msg') || 'Fatto! ✦');
      } else {
        e.preventDefault();
        pendingIntent = function () { toast(t.getAttribute('data-done-msg') || 'Fatto! ✦'); };
        openAuth('register');
        toast(msg);
      }
    }
  });

  if (modal) {
    els.submit.closest('form').addEventListener('submit', submitAuth);
    modal.querySelector('#auth-close').addEventListener('click', closeAuth);
    els.switchBtn.addEventListener('click', function () { setMode(mode === 'register' ? 'login' : 'register'); });
    modal.addEventListener('click', function (e) { if (e.target === modal) closeAuth(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeAuth(); });
  }

  reflectAuthState();

  // expose a tiny API for other scripts/pages
  window.TIAccount = { open: openAuth, logout: logout, user: currentUser, toast: toast };
})();
