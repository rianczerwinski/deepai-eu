/**
 * Demo Login — injects a pulsing "Try Demo" button next to the existing
 * Login button.  Clicking it writes a synthetic user object into
 * localStorage, flips a demo-mode flag, and re-runs checkAuthStatus()
 * so the page immediately switches to the logged-in UI state.
 *
 * The tricky part: the page's own inline auth() fires on load, tries to
 * reach localhost:8000, fails, and clears localStorage.  We override
 * auth() in demo mode and add a brief poll as a safety-net so the demo
 * session survives across page navigations.
 */
(function () {
  'use strict';

  var DEMO_USER = {
    pk: 99999,
    username: 'EU Demo User',
    email: 'demo@deepai.eu',
    userprofile2: {
      user_has_deepai_pro: true,
      locked_out_due_to_no_payment_info: false,
      user_can_use_genius_mode: true
    }
  };

  /* ── helpers ── */

  function restoreDemoUser() {
    localStorage.setItem('user', JSON.stringify(DEMO_USER));
    window.user_object = DEMO_USER;
    if (typeof checkAuthStatus === 'function') checkAuthStatus();
  }

  function isDemoMode() {
    return localStorage.getItem('demo-mode') === 'true';
  }

  /* ── styles (injected once) ── */

  var CSS =
    '@keyframes demo-pulse{' +
      '0%{box-shadow:0 0 4px rgba(199,100,236,.6),0 0 12px rgba(74,54,177,.4)}' +
      '50%{box-shadow:0 0 10px rgba(199,100,236,.9),0 0 24px rgba(74,54,177,.7)}' +
      '100%{box-shadow:0 0 4px rgba(199,100,236,.6),0 0 12px rgba(74,54,177,.4)}' +
    '}' +
    '#demoLoginBtn{' +
      'display:inline-flex;align-items:center;justify-content:center;' +
      'z-index:2;' +
      'background:linear-gradient(94deg,#c764ec,#4a36b1);' +
      'color:#fff;font-weight:600;font-size:14px;' +
      'border:none;border-radius:12px;' +
      'padding:5px 14px;height:32px;' +
      'white-space:nowrap;cursor:pointer;' +
      'margin-right:8px;' +
      'animation:demo-pulse 2s ease-in-out infinite;' +
      'font-family:inherit;letter-spacing:.3px;' +
      'transition:transform .15s ease;' +
    '}' +
    '#demoLoginBtn:hover{transform:scale(1.06)}' +
    '#demoLoginBtn.demo-hidden{display:none}';

  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── button ── */

  function createButton() {
    var btn = document.createElement('button');
    btn.id = 'demoLoginBtn';
    btn.type = 'button';
    btn.textContent = '\u2728 Try Demo';
    btn.title = 'Log in as a demo user to explore the site';
    btn.addEventListener('click', activateDemoLogin);
    return btn;
  }

  function activateDemoLogin() {
    localStorage.setItem('demo-mode', 'true');
    restoreDemoUser();

    var btn = document.getElementById('demoLoginBtn');
    if (btn) btn.classList.add('demo-hidden');

    var modal = document.getElementById('login-modal');
    if (modal && modal.open) modal.close();
  }

  /* ── demo-mode persistence ── */

  function enterDemoMode() {
    /* immediately restore the user */
    restoreDemoUser();

    /* override auth() so future calls don't clear the demo session */
    window.auth = async function () { restoreDemoUser(); };

    /* override logout() to also clear the demo flag */
    var origLogout = window.logout;
    window.logout = async function () {
      localStorage.removeItem('demo-mode');
      if (typeof origLogout === 'function') {
        origLogout();
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('hearts-cache');
        window.user_object = undefined;
        window.location.href = '/deepai-eu/index.html';
      }
    };

    /*
     * Safety-net: the in-flight auth() that started before this script
     * loaded will eventually fail and clear the user.  Poll briefly to
     * detect that and restore.
     */
    var ticks = 0;
    var guard = setInterval(function () {
      if (!isDemoMode()) { clearInterval(guard); return; }
      if (!window.user_object || !window.user_object.pk) restoreDemoUser();
      if (++ticks >= 10) clearInterval(guard);     /* stop after 5 s */
    }, 500);
  }

  /* ── init ── */

  function init() {
    injectStyles();

    if (isDemoMode()) {
      enterDemoMode();
      /* hide button if it was injected on this page */
      var existing = document.getElementById('demoLoginBtn');
      if (existing) existing.classList.add('demo-hidden');
    }

    /* only show button when not logged in (real or demo) */
    if (window.user_object && window.user_object.pk) return;

    var loginBtn = document.getElementById('headerLoginButton');
    if (!loginBtn) return;

    var btn = createButton();
    loginBtn.parentNode.insertBefore(btn, loginBtn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
